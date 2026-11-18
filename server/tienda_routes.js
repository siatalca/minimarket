// Rutas de la consulta de precios y del carrito del cliente (M-037).
// - /api/tienda/*: publicas o con sesion de cliente (token opaco). Nunca leen req.user: el
//   middleware de server.js las deja pasar sin revisar el JWT del personal.
// - /api/ventas/carrito-cliente/cargar y /api/consulta-qr.svg: personal (JWT normal).
// Los limites de intentos se cuentan antes de cualquier await. Errores: { message, code }.

const bcrypt = require('bcryptjs');
const core = require('./tienda_core');
const { GoogleAuthError } = require('./tienda_google');
const { TiendaConflictError } = require('./tienda_repo');
const {
  createRateLimiter,
  clientIpKey,
  rejectRateLimited,
  createLoginGuard,
  loginBlockedMessage,
} = require('./rate_limiter');

const TEN_MINUTES_MS = 10 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const BCRYPT_COST = 10;
// Hash ficticio para comparar cuando el telefono no existe: iguala el tiempo de respuesta.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('tienda-clave-inexistente', BCRYPT_COST);

const DEFAULT_LIMITS = {
  consultaIp: 120,
  consultaGlobal: 5000,
  // Generoso por la IP compartida del WiFi del local.
  registroIp: 60,
  registroGlobal: 300,
  claveToken: 5,
  claveIp: 5,
  sesionCuenta: 300,
  sesionIp: 1200,
  canjeUsuario: 30,
  loginIp: 100,
};

function isTiendaPath(path) {
  return typeof path === 'string' && path.startsWith('/api/tienda/');
}

function getBearer(req) {
  const [type, token] = String(req.headers.authorization || '').split(' ');
  return type === 'Bearer' && token ? token : null;
}

function sendError(res, status, code, message, extra = {}) {
  return res.status(status).json({ message, code, ...extra });
}

function defaultLoadQrModule() {
  try {
    return require('qrcode');
  } catch (err) {
    if (err?.code === 'MODULE_NOT_FOUND') return null;
    throw err;
  }
}

function registerTiendaRoutes(app, {
  repo,
  googleClientId = null,
  googleVerifier = null,
  loadQrModule = defaultLoadQrModule,
  logInternalError = (err) => { console.error(err); return 'Error interno del servidor'; },
  limits = {},
  generateCartCode = core.generateCartCode,
} = {}) {
  const L = { ...DEFAULT_LIMITS, ...limits };
  const consultaIpLimiter = createRateLimiter({ max: L.consultaIp, windowMs: TEN_MINUTES_MS });
  const consultaGlobalLimiter = createRateLimiter({ max: L.consultaGlobal, windowMs: TEN_MINUTES_MS });
  const registroIpLimiter = createRateLimiter({ max: L.registroIp, windowMs: ONE_HOUR_MS });
  const registroGlobalLimiter = createRateLimiter({ max: L.registroGlobal, windowMs: ONE_HOUR_MS });
  const sesionLimiter = createRateLimiter({ max: L.sesionCuenta, windowMs: TEN_MINUTES_MS });
  const sesionIpLimiter = createRateLimiter({ max: L.sesionIp, windowMs: TEN_MINUTES_MS });
  const canjeLimiter = createRateLimiter({ max: L.canjeUsuario, windowMs: TEN_MINUTES_MS });
  // Cambio de clave: bcrypt gasta CPU, asi que tiene su propio limite por token y por IP.
  const claveTokenLimiter = createRateLimiter({ max: L.claveToken, windowMs: ONE_HOUR_MS });
  const claveIpLimiter = createRateLimiter({ max: L.claveIp, windowMs: ONE_HOUR_MS });
  // Login de clientes (telefono/clave y Google): guardia propia, separada de la del personal.
  const loginGuard = createLoginGuard({ perIpMax: L.loginIp });
  const googleEnabled = Boolean(googleClientId && googleVerifier);

  function internalError(res, err) {
    return res.status(500).json({ message: logInternalError(err), code: 'INTERNAL_ERROR' });
  }

  function allowConsulta(req, res) {
    const ip = clientIpKey(req);
    const message = 'Demasiadas consultas en poco tiempo. Espera un momento.';
    if (ip && !consultaIpLimiter.hit(ip)) {
      rejectRateLimited(res, consultaIpLimiter.retryAfterMs(ip), message);
      return false;
    }
    if (!consultaGlobalLimiter.hit('global')) {
      rejectRateLimited(res, consultaGlobalLimiter.retryAfterMs('global'), message);
      return false;
    }
    return true;
  }

  // Parte sincronica de una ruta con sesion de cliente: formato del token y limites.
  // Devuelve el hash del token, o null si ya respondio.
  function beginCustomerRequest(req, res) {
    const token = getBearer(req);
    if (!core.isWellFormedSessionToken(token)) {
      sendError(res, 401, 'SESSION_INVALID', 'Inicia sesion para continuar.');
      return null;
    }
    const tokenHash = core.hashToken(token);
    const message = 'Demasiadas acciones en poco tiempo. Espera un momento.';
    const ip = clientIpKey(req);
    if (ip && !sesionIpLimiter.hit(ip)) {
      rejectRateLimited(res, sesionIpLimiter.retryAfterMs(ip), message);
      return null;
    }
    if (!sesionLimiter.hit(tokenHash)) {
      rejectRateLimited(res, sesionLimiter.retryAfterMs(tokenHash), message);
      return null;
    }
    return tokenHash;
  }

  async function loadSession(tokenHash, res) {
    const session = await repo.findSession(tokenHash);
    if (!session) {
      sendError(res, 401, 'SESSION_INVALID', 'Tu sesion vencio. Vuelve a entrar.');
      return null;
    }
    return session;
  }

  async function issueSession(res, status, account) {
    const { token, tokenHash } = core.generateSessionToken();
    await repo.createSession(account.id, tokenHash);
    return res.status(status).json({ token, cuenta: core.toPublicAccount(account) });
  }

  async function cartResponse(res, cuentaId, extra = {}) {
    const { cart, items } = await repo.getCart(cuentaId);
    return res.json({ carrito: core.buildCartResponse(cart, items), ...extra });
  }

  // Resultado correcto de agregar o cambiar cantidad: si quedo limitada al stock, va el aviso.
  function cartChangeResponse(res, cuentaId, result) {
    const extra = result.limited ? { aviso: core.stockLimitedNotice(result.disponible) } : {};
    return cartResponse(res, cuentaId, extra);
  }

  function sendGoogleError(res, err) {
    if (err instanceof GoogleAuthError) return sendError(res, err.status, err.code, err.message);
    throw err;
  }

  // ---------------- Publicas ----------------

  app.get('/api/tienda/info', async (req, res) => {
    if (!allowConsulta(req, res)) return undefined;
    try {
      const nombre = await repo.getBusinessName();
      return res.json({ nombre, google_client_id: googleEnabled ? googleClientId : null });
    } catch (err) {
      return internalError(res, err);
    }
  });

  app.get('/api/tienda/producto', async (req, res) => {
    if (!allowConsulta(req, res)) return undefined;
    const codigo = core.normalizeProductCode(req.query?.codigo);
    if (!codigo) return sendError(res, 400, 'INVALID_CODE', 'Codigo invalido.');
    try {
      const row = await repo.findProductByCode(codigo);
      if (!row) return res.status(404).json({ found: false, message: 'Producto no encontrado.', code: 'PRODUCT_NOT_FOUND' });
      return res.json({ found: true, producto: core.toPublicProduct(row) });
    } catch (err) {
      return internalError(res, err);
    }
  });

  // ---------------- Cuenta ----------------

  app.post('/api/tienda/cuenta/registro', async (req, res) => {
    const body = req.body || {};
    const credential = body.google_credential;
    const hasGoogle = credential !== undefined && credential !== null && credential !== '';
    if (hasGoogle && !googleEnabled) return sendError(res, 503, 'GOOGLE_DISABLED', 'Google no esta disponible.');

    const telefono = core.normalizePhone(body.telefono);
    const nombre = core.normalizeName(body.nombre);
    let correo = core.normalizeEmail(body.correo);
    if (!telefono) return sendError(res, 400, 'INVALID_DATA', 'Ingresa un celular valido (+569 y 8 digitos).');
    if (!nombre) return sendError(res, 400, 'INVALID_DATA', 'Ingresa tu nombre (maximo 60 caracteres).');
    if (!core.isValidPassword(body.clave)) return sendError(res, 400, 'INVALID_DATA', 'La clave debe tener entre 6 y 72 caracteres.');
    if (!hasGoogle && !correo) return sendError(res, 400, 'INVALID_DATA', 'Ingresa un correo valido.');

    // Solo cuentan los pedidos con datos validos; siempre antes del primer await.
    const ip = clientIpKey(req);
    const limitMessage = 'Demasiados registros en poco tiempo. Intenta de nuevo mas tarde.';
    if (ip && !registroIpLimiter.hit(ip)) {
      return rejectRateLimited(res, registroIpLimiter.retryAfterMs(ip), limitMessage);
    }
    if (!registroGlobalLimiter.hit('global')) {
      return rejectRateLimited(res, registroGlobalLimiter.retryAfterMs('global'), limitMessage);
    }

    try {
      let googleSub = null;
      if (hasGoogle) {
        let google;
        try {
          google = await googleVerifier.verify(credential);
        } catch (err) {
          return sendGoogleError(res, err);
        }
        // El correo de la cuenta es el verificado por Google.
        correo = core.normalizeEmail(google.email);
        if (!correo) return sendError(res, 400, 'INVALID_DATA', 'El correo de Google no es valido.');
        googleSub = google.sub;
      }
      const claveHash = await bcrypt.hash(body.clave, BCRYPT_COST);
      const id = await repo.createAccount({ telefono, nombre, correo, claveHash, googleSub });
      return await issueSession(res, 201, { id, nombre, telefono, correo, google_sub: googleSub });
    } catch (err) {
      if (err instanceof TiendaConflictError) return sendError(res, 409, err.code, err.message);
      return internalError(res, err);
    }
  });

  app.post('/api/tienda/cuenta/login', async (req, res) => {
    const ip = clientIpKey(req);
    const attempt = loginGuard.beginAttempt(ip);
    if (!attempt.ok) return rejectRateLimited(res, attempt.retryMs, loginBlockedMessage(attempt.retryMs));

    const telefono = core.normalizePhone(req.body?.telefono);
    const clave = typeof req.body?.clave === 'string' ? req.body.clave : '';
    const invalid = () => sendError(res, 401, 'INVALID_CREDENTIALS', 'Telefono o clave incorrectos.');
    if (!telefono || !clave || Buffer.byteLength(clave, 'utf8') > core.LIMITS.passwordMaxBytes) return invalid();

    try {
      const account = await repo.findAccountByPhone(telefono);
      if (!account || Number(account.activo) !== 1) {
        const unknown = loginGuard.checkUnknownAccount(telefono, ip);
        if (!unknown.ok) return rejectRateLimited(res, unknown.retryMs, loginBlockedMessage(unknown.retryMs));
        // Mismo trabajo que con una cuenta real, para no revelar por el tiempo que telefonos existen.
        await bcrypt.compare(clave, DUMMY_PASSWORD_HASH);
        return invalid();
      }
      const accountAttempt = loginGuard.checkAccount(`tienda:${account.id}`, ip);
      if (!accountAttempt.ok) {
        return rejectRateLimited(res, accountAttempt.retryMs, loginBlockedMessage(accountAttempt.retryMs));
      }
      const ok = await bcrypt.compare(clave, String(account.clave_hash || ''));
      if (!ok) return invalid();
      loginGuard.success(`tienda:${account.id}`, ip);
      return await issueSession(res, 200, account);
    } catch (err) {
      return internalError(res, err);
    }
  });

  app.post('/api/tienda/cuenta/google', async (req, res) => {
    if (!googleEnabled) return sendError(res, 503, 'GOOGLE_DISABLED', 'Google no esta disponible.');
    const ip = clientIpKey(req);
    const attempt = loginGuard.beginAttempt(ip);
    if (!attempt.ok) return rejectRateLimited(res, attempt.retryMs, loginBlockedMessage(attempt.retryMs));

    try {
      let google;
      try {
        google = await googleVerifier.verify(req.body?.credential);
      } catch (err) {
        return sendGoogleError(res, err);
      }
      // Solo por google_sub ya vinculado; nunca se entra por coincidencia de correo.
      const account = await repo.findAccountByGoogleSub(google.sub);
      if (!account || Number(account.activo) !== 1) {
        return sendError(res, 404, 'GOOGLE_NOT_LINKED', 'Esa cuenta de Google no esta registrada. Completa tus datos.', {
          correo: google.email,
          nombre: core.normalizeName(google.name) || '',
        });
      }
      loginGuard.success(`tienda:${account.id}`, ip);
      return await issueSession(res, 200, account);
    } catch (err) {
      return internalError(res, err);
    }
  });

  app.post('/api/tienda/cuenta/google/vincular', async (req, res) => {
    if (!googleEnabled) return sendError(res, 503, 'GOOGLE_DISABLED', 'Google no esta disponible.');
    const tokenHash = beginCustomerRequest(req, res);
    if (!tokenHash) return undefined;
    try {
      const session = await loadSession(tokenHash, res);
      if (!session) return undefined;
      let google;
      try {
        google = await googleVerifier.verify(req.body?.credential);
      } catch (err) {
        return sendGoogleError(res, err);
      }
      const correo = core.normalizeEmail(google.email);
      if (!correo) return sendError(res, 400, 'INVALID_DATA', 'El correo de Google no es valido.');
      await repo.linkGoogle(session.cuenta_id, google.sub, correo);
      const account = await repo.getAccount(session.cuenta_id);
      return res.json({ cuenta: core.toPublicAccount(account) });
    } catch (err) {
      if (err instanceof TiendaConflictError) return sendError(res, 409, err.code, err.message);
      return internalError(res, err);
    }
  });

  app.post('/api/tienda/cuenta/clave', async (req, res) => {
    const tokenHash = beginCustomerRequest(req, res);
    if (!tokenHash) return undefined;
    if (!core.isValidPassword(req.body?.clave_nueva)) {
      return sendError(res, 400, 'INVALID_DATA', 'La clave debe tener entre 6 y 72 caracteres.');
    }
    const claveMessage = 'Demasiados cambios de clave. Intenta de nuevo mas tarde.';
    const claveIp = clientIpKey(req);
    if (claveIp && !claveIpLimiter.hit(claveIp)) {
      return rejectRateLimited(res, claveIpLimiter.retryAfterMs(claveIp), claveMessage);
    }
    if (!claveTokenLimiter.hit(tokenHash)) {
      return rejectRateLimited(res, claveTokenLimiter.retryAfterMs(tokenHash), claveMessage);
    }
    try {
      const session = await loadSession(tokenHash, res);
      if (!session) return undefined;
      const claveHash = await bcrypt.hash(req.body.clave_nueva, BCRYPT_COST);
      await repo.updatePassword(session.cuenta_id, claveHash, session.session_id);
      return res.status(204).end();
    } catch (err) {
      return internalError(res, err);
    }
  });

  app.post('/api/tienda/cuenta/logout', async (req, res) => {
    const token = getBearer(req);
    if (!core.isWellFormedSessionToken(token)) return res.status(204).end();
    const ip = clientIpKey(req);
    if (ip && !sesionIpLimiter.hit(ip)) {
      return rejectRateLimited(res, sesionIpLimiter.retryAfterMs(ip), 'Demasiadas acciones en poco tiempo. Espera un momento.');
    }
    try {
      await repo.revokeSession(core.hashToken(token));
      return res.status(204).end();
    } catch (err) {
      return internalError(res, err);
    }
  });

  app.get('/api/tienda/cuenta', async (req, res) => {
    const tokenHash = beginCustomerRequest(req, res);
    if (!tokenHash) return undefined;
    try {
      const session = await loadSession(tokenHash, res);
      if (!session) return undefined;
      return res.json({ cuenta: core.toPublicAccount(session) });
    } catch (err) {
      return internalError(res, err);
    }
  });

  // ---------------- Carrito ----------------

  const CART_ERRORS = {
    CART_LOCKED: [409, 'El carrito ya fue enviado. Reabrelo para modificarlo.'],
    CART_LIMIT: [422, `El carrito admite hasta ${core.LIMITS.cartMaxLines} productos distintos.`],
    CART_EMPTY: [422, 'Agrega productos antes de finalizar.'],
    ITEM_NOT_FOUND: [404, 'Ese producto ya no esta en tu carrito.'],
    PRODUCT_NOT_FOUND: [404, 'Producto no encontrado.'],
    // Stock (M-038).
    OUT_OF_STOCK: [422, 'Este producto no tiene stock. Puedes consultar su precio, pero no agregarlo al carrito.'],
    STOCK_LIMIT: [422, (disponible) => `Ya tienes en el carrito todo el stock disponible (${disponible}).`],
    CART_STOCK_CHANGED: [422, 'Algunos productos de tu carrito ya no tienen stock suficiente. Quitalos o ajusta la cantidad.'],
  };

  // failure: codigo o resultado del repo ({ error, disponible? }). disponible se responde si viene.
  function sendCartError(res, failure, extra = {}) {
    const { error: code, disponible } = typeof failure === 'string' ? { error: failure } : failure;
    const [status, message] = CART_ERRORS[code] || [500, 'Error interno del servidor'];
    const text = typeof message === 'function' ? message(disponible) : message;
    return sendError(res, status, code, text, { ...(disponible === undefined ? {} : { disponible }), ...extra });
  }

  app.get('/api/tienda/carrito', async (req, res) => {
    const tokenHash = beginCustomerRequest(req, res);
    if (!tokenHash) return undefined;
    try {
      const session = await loadSession(tokenHash, res);
      if (!session) return undefined;
      return await cartResponse(res, session.cuenta_id);
    } catch (err) {
      return internalError(res, err);
    }
  });

  app.post('/api/tienda/carrito/items', async (req, res) => {
    const tokenHash = beginCustomerRequest(req, res);
    if (!tokenHash) return undefined;
    const codigo = core.normalizeProductCode(req.body?.codigo);
    if (!codigo) return sendError(res, 400, 'INVALID_CODE', 'Codigo invalido.');
    const rawQty = req.body?.cantidad;
    const cantidad = rawQty === undefined || rawQty === null ? 1 : core.parseCartQuantity(rawQty);
    if (!cantidad) return sendError(res, 400, 'INVALID_DATA', 'La cantidad debe ser un entero entre 1 y 99.');
    try {
      const session = await loadSession(tokenHash, res);
      if (!session) return undefined;
      const product = await repo.findProductByCode(codigo);
      if (!product) return sendError(res, 404, 'PRODUCT_NOT_FOUND', 'Producto no encontrado.');
      if (core.resolvePublicFormat(product.formato_venta) === 'granel') {
        return sendError(res, 422, 'BULK_NOT_ALLOWED', 'Los productos a granel se agregan en la caja.');
      }
      const result = await repo.addCartItem(session.cuenta_id, product.id_producto, cantidad, {
        maxLines: core.LIMITS.cartMaxLines,
        maxQty: core.LIMITS.itemMaxQty,
      });
      if (result.error) return sendCartError(res, result);
      return await cartChangeResponse(res, session.cuenta_id, result);
    } catch (err) {
      return internalError(res, err);
    }
  });

  async function changeItem(req, res, cantidad) {
    const tokenHash = beginCustomerRequest(req, res);
    if (!tokenHash) return undefined;
    const itemId = core.parseItemId(req.params.itemId);
    if (!itemId) return sendCartError(res, 'ITEM_NOT_FOUND');
    if (cantidad === null) return sendError(res, 400, 'INVALID_DATA', 'La cantidad debe ser un entero entre 0 y 99.');
    try {
      const session = await loadSession(tokenHash, res);
      if (!session) return undefined;
      const result = await repo.setCartItemQuantity(session.cuenta_id, itemId, cantidad);
      if (result.error) return sendCartError(res, result);
      return await cartChangeResponse(res, session.cuenta_id, result);
    } catch (err) {
      return internalError(res, err);
    }
  }

  app.put('/api/tienda/carrito/items/:itemId', (req, res) => (
    changeItem(req, res, core.parseCartQuantity(req.body?.cantidad, { allowZero: true }))
  ));

  app.delete('/api/tienda/carrito/items/:itemId', (req, res) => changeItem(req, res, 0));

  app.post('/api/tienda/carrito/finalizar', async (req, res) => {
    const tokenHash = beginCustomerRequest(req, res);
    if (!tokenHash) return undefined;
    try {
      const session = await loadSession(tokenHash, res);
      if (!session) return undefined;
      const result = await repo.finalizeCart(session.cuenta_id, generateCartCode);
      if (result.error === 'CART_STOCK_CHANGED') {
        // Se responde el carrito con los items marcados para que el cliente los quite o ajuste.
        const { cart, items } = await repo.getCart(session.cuenta_id);
        return sendCartError(res, result, { carrito: core.buildCartResponse(cart, items) });
      }
      if (result.error) return sendCartError(res, result);
      return await cartResponse(res, session.cuenta_id);
    } catch (err) {
      return internalError(res, err);
    }
  });

  app.post('/api/tienda/carrito/reabrir', async (req, res) => {
    const tokenHash = beginCustomerRequest(req, res);
    if (!tokenHash) return undefined;
    try {
      const session = await loadSession(tokenHash, res);
      if (!session) return undefined;
      await repo.reopenCart(session.cuenta_id);
      return await cartResponse(res, session.cuenta_id);
    } catch (err) {
      return internalError(res, err);
    }
  });

  // ---------------- Personal (JWT del personal, revisado por el middleware de server.js) ----------------

  app.post('/api/ventas/carrito-cliente/cargar', async (req, res) => {
    const userId = Number(req.user?.sub || 0);
    if (!userId) return sendError(res, 401, 'TOKEN_INVALID', 'Token invalido');
    if (!canjeLimiter.hit(String(userId))) {
      return rejectRateLimited(res, canjeLimiter.retryAfterMs(String(userId)), 'Demasiados codigos en poco tiempo. Espera un momento.');
    }
    const codigo = core.normalizeCartCode(req.body?.codigo);
    if (!codigo) return sendError(res, 400, 'INVALID_CODE', 'El codigo tiene 6 digitos.');
    try {
      const redeemed = await repo.redeemCartCode(codigo, userId);
      if (!redeemed.ok) {
        const failure = core.classifyRedeemFailure(redeemed);
        return sendError(res, failure.status, failure.code, failure.message);
      }
      const account = await repo.getAccount(redeemed.cuentaId);
      const rows = await repo.getRedeemedCartProducts(redeemed.cartId);
      const items = [];
      const faltantes = [];
      for (const row of rows) {
        const { tienda_cantidad: cantidad, ...product } = row;
        if (!product.id_producto) {
          faltantes.push({ nombre: 'Producto eliminado', motivo: 'El producto ya no existe en el sistema.' });
        } else if (core.resolvePublicFormat(product.formato_venta) === 'granel') {
          faltantes.push({ nombre: String(product.descripcion || ''), motivo: 'Producto a granel: agregalo en caja.' });
        } else {
          items.push({ product, cantidad: Number(cantidad || 0) });
        }
      }
      return res.json({
        cliente: { nombre: String(account?.nombre || ''), telefono: String(account?.telefono || '') },
        items,
        faltantes,
      });
    } catch (err) {
      return internalError(res, err);
    }
  });

  app.get('/api/consulta-qr.svg', async (req, res) => {
    if (!req.user?.sub) return sendError(res, 401, 'TOKEN_INVALID', 'Token invalido');
    const url = core.validateQrTargetUrl(req.query?.url);
    if (!url) return sendError(res, 400, 'INVALID_URL', 'La direccion debe ser https y terminar en /consulta/.');
    let qrcode;
    try {
      qrcode = loadQrModule();
    } catch (err) {
      qrcode = null;
    }
    if (!qrcode) return sendError(res, 503, 'QR_UNAVAILABLE', 'El generador de QR no esta instalado en el servidor.');
    try {
      const svg = await qrcode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 2 });
      res.set('Cache-Control', 'no-store');
      return res.type('image/svg+xml').send(svg);
    } catch (err) {
      return internalError(res, err);
    }
  });
}

module.exports = { registerTiendaRoutes, isTiendaPath, DEFAULT_LIMITS };

// Clientes de la app para administradores (M-039): consulta de solo lectura de las cuentas y
// carritos de la consulta de precios, y vinculo del carrito cargado en caja con su venta.
// - Rutas /api/admin/tienda/*: JWT del personal (middleware de server.js) + administrador activo
//   (requireAdministrator de server.js, inyectado). Nunca responden clave_hash, token_hash ni google_sub.
// Errores: { message, code }.

const core = require('./tienda_core');

const ADMIN_PAGE_SIZE = 50;
const ADMIN_SEARCH_MAX = 60;
// Tope de carritos en el detalle de un cliente (los mas recientes).
const ADMIN_CARTS_MAX = 100;
// Digitos minimos para buscar tambien el telefono sin espacios ni guiones.
const PHONE_SEARCH_MIN_DIGITS = 4;

function sendError(res, status, code, message) {
  return res.status(status).json({ message, code });
}

// Texto de busqueda: sin caracteres de control, espacios simples, maximo 60 caracteres.
function normalizeAdminSearch(value) {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, ADMIN_SEARCH_MAX).trim();
}

// Escapa los comodines de LIKE (\ % _) para que el texto se busque literal.
function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, (char) => `\\${char}`);
}

// Patrones LIKE de la busqueda. Si el texto trae al menos 4 digitos, tambien se busca el telefono
// solo con los digitos ("9 1234-5678" encuentra +56912345678).
function buildAdminSearchTerms(q) {
  const text = normalizeAdminSearch(q);
  if (!text) return { likeTerm: null, telefonoTerm: null };
  const digits = text.replace(/\D/g, '');
  const telefonoTerm = digits.length >= PHONE_SEARCH_MIN_DIGITS && digits !== text ? `%${digits}%` : null;
  return { likeTerm: `%${escapeLike(text)}%`, telefonoTerm };
}

function parsePage(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return 1;
  const raw = String(value).trim();
  if (!/^\d{1,6}$/.test(raw)) return 1;
  return Math.max(1, Number(raw));
}

const { toIsoDate } = core;

function toAmount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

// Cliente para el administrador. Lista blanca campo por campo.
function toAdminCustomer(row) {
  return {
    id: Number(row.id),
    nombre: String(row.nombre || ''),
    telefono: String(row.telefono || ''),
    correo: String(row.correo || ''),
    google_vinculado: Number(row.google_vinculado) === 1 || row.google_vinculado === true,
    activo: Number(row.activo) === 1,
    creado: toIsoDate(row.created_at),
    ultimo_ingreso: toIsoDate(row.last_login_at),
    carritos: Number(row.carritos || 0),
  };
}

// Producto del carrito con su precio de hoy. Producto borrado: sin codigo ni precio.
function toAdminCartItem(row) {
  if (!row.id_producto) {
    return { codigo: '', nombre: 'Producto eliminado', cantidad: Number(row.cantidad || 0), precio_actual: null };
  }
  return {
    codigo: String(row.codigo_barras || '').trim(),
    nombre: String(row.descripcion || '').trim(),
    cantidad: Number(row.cantidad || 0),
    precio_actual: toAmount(row.precio_venta),
  };
}

// Carrito para el administrador. itemRows: filas de listCartItemsForAdmin de este carrito.
// cargado_en_caja solo si se retiro; los retirados antes de M-039 no tienen caja (null).
function toAdminCart(row, itemRows = []) {
  const items = itemRows.map(toAdminCartItem);
  const retirado = row.estado === 'retirado' && row.retirado_at;
  const cajaNumero = Number(row.retirado_caja_id || 0);
  return {
    id: Number(row.id),
    estado: String(row.estado || ''),
    codigo: row.codigo ? String(row.codigo) : null,
    codigo_usado: row.codigo_usado ? String(row.codigo_usado) : null,
    creado: toIsoDate(row.created_at),
    actualizado: toIsoDate(row.updated_at),
    codigo_expira: toIsoDate(row.codigo_expira),
    cargado_en_caja: retirado
      ? {
        fecha: toIsoDate(row.retirado_at),
        caja: cajaNumero ? { numero: cajaNumero, nombre: String(row.caja_nombre || '') } : null,
        cajera: row.retirado_user_id ? { nombre: String(row.cajera_nombre || '') } : null,
      }
      : null,
    venta: row.venta_id && row.venta_fecha
      ? { id: Number(row.venta_id), fecha: toIsoDate(row.venta_fecha), total: toAmount(row.venta_total) }
      : null,
    items,
    total_actual: items.reduce((sum, item) => sum + (item.precio_actual === null ? 0 : item.precio_actual * item.cantidad), 0),
  };
}

// Vincula la venta recien registrada con el carrito del cliente cargado en ese ticket.
// Nunca lanza: la venta ya quedo guardada y no debe fallar por el vinculo. Devuelve true si vinculo.
async function linkCustomerCartToSale(repo, rawCartId, ventaId, userId, { logInternalError = (err) => console.error(err) } = {}) {
  try {
    if (rawCartId === undefined || rawCartId === null || rawCartId === '') return false;
    const cartId = core.parseItemId(rawCartId);
    const safeVentaId = Number(ventaId);
    const safeUserId = Number(userId);
    if (!cartId || !Number.isInteger(safeVentaId) || safeVentaId < 1 || !Number.isInteger(safeUserId) || safeUserId < 1) {
      return false;
    }
    return await repo.linkCartToSale(cartId, safeVentaId, safeUserId);
  } catch (err) {
    try { logInternalError(err); } catch (_) {}
    return false;
  }
}

function registerTiendaAdminRoutes(app, {
  repo,
  requireAdministrator,
  logInternalError = (err) => { console.error(err); return 'Error interno del servidor'; },
} = {}) {
  if (typeof requireAdministrator !== 'function') throw new Error('registerTiendaAdminRoutes necesita requireAdministrator');

  function internalError(res, err) {
    return res.status(500).json({ message: logInternalError(err), code: 'INTERNAL_ERROR' });
  }

  // 401 sin sesion del personal; requireAdministrator responde 403 (o 500) por su cuenta.
  async function allowAdmin(req, res) {
    if (!req.user?.sub) {
      sendError(res, 401, 'TOKEN_INVALID', 'Token invalido');
      return false;
    }
    return requireAdministrator(req, res);
  }

  app.get('/api/admin/tienda/clientes', async (req, res) => {
    if (!(await allowAdmin(req, res))) return undefined;
    const pagina = parsePage(req.query?.pagina);
    const { likeTerm, telefonoTerm } = buildAdminSearchTerms(req.query?.q);
    try {
      const { rows, total } = await repo.listAccountsForAdmin({
        likeTerm,
        telefonoTerm,
        limit: ADMIN_PAGE_SIZE,
        offset: (pagina - 1) * ADMIN_PAGE_SIZE,
      });
      res.set('Cache-Control', 'no-store');
      return res.json({ clientes: rows.map(toAdminCustomer), total, pagina, por_pagina: ADMIN_PAGE_SIZE });
    } catch (err) {
      return internalError(res, err);
    }
  });

  app.get('/api/admin/tienda/clientes/:id', async (req, res) => {
    if (!(await allowAdmin(req, res))) return undefined;
    const cuentaId = core.parseItemId(req.params.id);
    const notFound = () => sendError(res, 404, 'CUSTOMER_NOT_FOUND', 'Cliente no encontrado.');
    if (!cuentaId) return notFound();
    try {
      const account = await repo.getAccountForAdmin(cuentaId);
      if (!account) return notFound();
      const carts = await repo.listCartsForAdmin(cuentaId, ADMIN_CARTS_MAX);
      const itemRows = await repo.listCartItemsForAdmin(carts.map((cart) => Number(cart.id)));
      const itemsByCart = new Map();
      for (const row of itemRows) {
        const key = Number(row.carrito_id);
        if (!itemsByCart.has(key)) itemsByCart.set(key, []);
        itemsByCart.get(key).push(row);
      }
      res.set('Cache-Control', 'no-store');
      return res.json({
        cliente: toAdminCustomer(account),
        carritos: carts.map((cart) => toAdminCart(cart, itemsByCart.get(Number(cart.id)) || [])),
      });
    } catch (err) {
      return internalError(res, err);
    }
  });
}

module.exports = {
  ADMIN_PAGE_SIZE,
  ADMIN_SEARCH_MAX,
  ADMIN_CARTS_MAX,
  normalizeAdminSearch,
  escapeLike,
  buildAdminSearchTerms,
  parsePage,
  toAdminCustomer,
  toAdminCart,
  linkCustomerCartToSale,
  registerTiendaAdminRoutes,
};

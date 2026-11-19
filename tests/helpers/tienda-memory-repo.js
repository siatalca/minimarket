// Base simulada en memoria con la misma interfaz que server/tienda_repo.js, para probar las rutas
// de la consulta de precios y del carrito sin MariaDB. Reproduce las reglas del SQL real:
// telefono/correo/google_sub unicos, un carrito abierto o enviado por cuenta, codigo unico,
// canje condicional (solo 'enviado' y vigente) y vencimiento por reloj inyectable.

const { TiendaConflictError } = require('../../server/tienda_repo');
const { availableForCart, cartItemStockProblem, resolveCartLineQuantity } = require('../../server/tienda_core');

function createMemoryRepo({ now = () => Date.now() } = {}) {
  const state = {
    businessName: 'Minimarket Prueba',
    products: [],
    formats: new Map(),
    accounts: [],
    sessions: [],
    carts: [],
    items: [],
    // Tablas del sistema que lee la consulta de administradores (M-039).
    cajas: [],
    usuarios: [],
    ventas: [],
    turnos: [],
    seq: { account: 0, session: 0, cart: 0, item: 0 },
  };

  // LIKE de MariaDB (sin distinguir mayusculas): % cualquier texto, _ un caracter, \x literal.
  function likeToRegExp(pattern) {
    let source = '';
    for (let i = 0; i < pattern.length; i += 1) {
      const char = pattern[i];
      if (char === '\\' && i + 1 < pattern.length) {
        i += 1;
        source += pattern[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      } else if (char === '%') source += '.*';
      else if (char === '_') source += '.';
      else source += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    return new RegExp(`^${source}$`, 'is');
  }

  // Misma forma de fila que ADMIN_ACCOUNT_SELECT de tienda_repo.js.
  function adminAccountRow(a) {
    return {
      id: a.id,
      nombre: a.nombre,
      telefono: a.telefono,
      correo: a.correo,
      google_vinculado: a.google_sub ? 1 : 0,
      activo: a.activo,
      created_at: a.created_at,
      last_login_at: a.last_login_at,
      carritos: state.carts.filter((c) => c.cuenta_id === a.id).length,
    };
  }

  function addProduct(row) {
    state.products.push({
      id_producto: state.products.length + 1,
      costo: 100,
      ganancia: 50,
      supplier_id: 7,
      id_departamento: 3,
      cantidad_maxima: 500,
      exento_iva: 0,
      ...row,
    });
  }

  function publicProduct(p) {
    return {
      id_producto: p.id_producto,
      codigo_barras: p.codigo_barras,
      descripcion: p.descripcion,
      precio_venta: p.precio_venta,
      cantidad_actual: p.cantidad_actual,
      utiliza_inventario: p.utiliza_inventario,
      cantidad_minima: p.cantidad_minima,
      formato_venta: p.formato_venta,
    };
  }

  function dup(field) {
    const map = {
      telefono: ['PHONE_TAKEN', 'Ese telefono ya tiene una cuenta.'],
      correo: ['EMAIL_TAKEN', 'Ese correo ya tiene una cuenta.'],
      google_sub: ['GOOGLE_TAKEN', 'Esa cuenta de Google ya esta vinculada a otra cuenta.'],
    };
    return new TiendaConflictError(...map[field]);
  }

  function currentCart(cuentaId) {
    const list = state.carts.filter((c) => c.cuenta_id === cuentaId && (c.estado === 'abierto' || c.estado === 'enviado'));
    const cart = list[list.length - 1];
    if (!cart) return null;
    return { ...cart, vigente: cart.codigo_expira && cart.codigo_expira > now() ? 1 : 0 };
  }

  function cartItemsWithProducts(cartId) {
    return state.items
      .filter((i) => i.carrito_id === cartId)
      .map((i) => ({ i, p: state.products.find((p) => p.id_producto === i.producto_id) }));
  }

  const repo = {
    state,
    addProduct,
    async ensureTables() {},
    async getBusinessName() { return state.businessName; },
    async findProductByCode(code) {
      const p = state.products.find((row) => String(row.codigo_barras).trim() === code
        || (/^\d+$/.test(code) && /^\d+$/.test(row.codigo_barras) && Number(row.codigo_barras) === Number(code)));
      return p ? publicProduct(p) : null;
    },
    async findAccountByPhone(telefono) { return state.accounts.find((a) => a.telefono === telefono) || null; },
    async findAccountByGoogleSub(sub) { return state.accounts.find((a) => a.google_sub === sub) || null; },
    async getAccount(id) { return state.accounts.find((a) => a.id === id) || null; },
    async createAccount({ telefono, nombre, correo, claveHash, googleSub = null }) {
      if (state.accounts.some((a) => a.telefono === telefono)) throw dup('telefono');
      if (state.accounts.some((a) => a.correo === correo)) throw dup('correo');
      if (googleSub && state.accounts.some((a) => a.google_sub === googleSub)) throw dup('google_sub');
      state.seq.account += 1;
      state.accounts.push({
        id: state.seq.account, telefono, nombre, correo, google_sub: googleSub, clave_hash: claveHash, activo: 1,
        created_at: new Date(now()), last_login_at: null,
      });
      return state.seq.account;
    },
    async createSession(cuentaId, tokenHash) {
      state.seq.session += 1;
      state.sessions.push({
        id: state.seq.session, cuenta_id: cuentaId, token_hash: tokenHash, expires_at: now() + 60 * 86400000, revoked_at: null,
      });
      state.accounts.find((a) => a.id === cuentaId).last_login_at = new Date(now());
    },
    async findSession(tokenHash) {
      const s = state.sessions.find((row) => row.token_hash === tokenHash && !row.revoked_at && row.expires_at > now());
      if (!s) return null;
      const c = state.accounts.find((a) => a.id === s.cuenta_id && a.activo === 1);
      if (!c) return null;
      return {
        session_id: s.id, cuenta_id: c.id, nombre: c.nombre, telefono: c.telefono, correo: c.correo,
        google_vinculado: c.google_sub ? 1 : 0,
      };
    },
    async revokeSession(tokenHash) {
      for (const s of state.sessions) if (s.token_hash === tokenHash && !s.revoked_at) s.revoked_at = now();
    },
    async updatePassword(cuentaId, claveHash, keepSessionId) {
      state.accounts.find((a) => a.id === cuentaId).clave_hash = claveHash;
      for (const s of state.sessions) {
        if (s.cuenta_id === cuentaId && s.id !== keepSessionId && !s.revoked_at) s.revoked_at = now();
      }
    },
    async linkGoogle(cuentaId, sub, correo) {
      if (state.accounts.some((a) => a.id !== cuentaId && a.google_sub === sub)) throw dup('google_sub');
      if (state.accounts.some((a) => a.id !== cuentaId && a.correo === correo)) throw dup('correo');
      const account = state.accounts.find((a) => a.id === cuentaId);
      account.google_sub = sub;
      account.correo = correo;
    },
    async getCart(cuentaId) {
      const cart = currentCart(cuentaId);
      if (!cart) return { cart: null, items: [] };
      const items = cartItemsWithProducts(cart.id)
        .filter(({ p }) => p)
        .map(({ i, p }) => ({ item_id: i.id, cantidad: i.cantidad, ...publicProduct(p), id_producto: undefined }));
      return { cart, items };
    },
    // Sin await dentro: cada operacion del carrito es atomica, como con el bloqueo de la cuenta.
    // El stock se lee de state.products en cada llamada (igual que la base real).
    async addCartItem(cuentaId, productoId, cantidad, { maxLines, maxQty }) {
      let cart = currentCart(cuentaId);
      if (cart && cart.estado === 'enviado') return { error: 'CART_LOCKED' };
      const product = state.products.find((p) => p.id_producto === productoId);
      if (!product) return { error: 'PRODUCT_NOT_FOUND' };
      const existing = cart ? state.items.find((i) => i.carrito_id === cart.id && i.producto_id === productoId) : null;
      const decision = resolveCartLineQuantity({
        existing: existing ? existing.cantidad : 0, requested: cantidad, disponible: availableForCart(product), maxQty,
      });
      if (decision.error) return decision;
      const result = decision.limited ? { ok: true, limited: true, disponible: decision.disponible } : { ok: true };
      if (existing) {
        existing.cantidad = decision.cantidad;
        return result;
      }
      if (!cart) {
        state.seq.cart += 1;
        cart = { id: state.seq.cart, cuenta_id: cuentaId, estado: 'abierto', codigo: null, codigo_expira: null, codigo_usado: null };
        state.carts.push(cart);
      }
      cart = state.carts.find((c) => c.id === cart.id);
      cart.created_at = cart.created_at || new Date(now());
      cart.updated_at = new Date(now());
      if (state.items.filter((i) => i.carrito_id === cart.id).length >= maxLines) return { error: 'CART_LIMIT' };
      state.seq.item += 1;
      state.items.push({ id: state.seq.item, carrito_id: cart.id, producto_id: productoId, cantidad: decision.cantidad });
      return result;
    },
    async setCartItemQuantity(cuentaId, itemId, cantidad) {
      const cart = currentCart(cuentaId);
      if (!cart) return { error: 'ITEM_NOT_FOUND' };
      if (cart.estado === 'enviado') return { error: 'CART_LOCKED' };
      const index = state.items.findIndex((i) => i.id === itemId && i.carrito_id === cart.id);
      if (index < 0) return { error: 'ITEM_NOT_FOUND' };
      if (cantidad === 0) {
        state.items.splice(index, 1);
        return { ok: true };
      }
      const product = state.products.find((p) => p.id_producto === state.items[index].producto_id);
      if (!product) return { error: 'ITEM_NOT_FOUND' };
      const decision = resolveCartLineQuantity({ requested: cantidad, disponible: availableForCart(product), mode: 'set' });
      if (decision.error) return decision;
      state.items[index].cantidad = decision.cantidad;
      return decision.limited ? { ok: true, limited: true, disponible: decision.disponible } : { ok: true };
    },
    async finalizeCart(cuentaId, generateCode, { attempts = 10 } = {}) {
      const view = currentCart(cuentaId);
      if (!view) return { error: 'CART_EMPTY' };
      const lines = cartItemsWithProducts(view.id).filter(({ p }) => p);
      if (!lines.length) return { error: 'CART_EMPTY' };
      if (view.estado === 'enviado' && view.codigo && view.vigente === 1) return { ok: true };
      if (lines.some(({ i, p }) => cartItemStockProblem(i.cantidad, availableForCart(p)) !== null)) {
        return { error: 'CART_STOCK_CHANGED' };
      }
      const cart = state.carts.find((c) => c.id === view.id);
      for (let i = 0; i < attempts; i += 1) {
        const code = generateCode();
        if (state.carts.some((c) => c.id !== cart.id && c.codigo === code)) continue;
        Object.assign(cart, { estado: 'enviado', codigo: code, codigo_expira: now() + 2 * 3600000 });
        return { ok: true };
      }
      throw new Error('No se pudo generar un codigo de carrito libre');
    },
    async reopenCart(cuentaId) {
      const view = currentCart(cuentaId);
      if (view && view.estado === 'enviado') {
        Object.assign(state.carts.find((c) => c.id === view.id), { estado: 'abierto', codigo: null, codigo_expira: null });
      }
      return { ok: true };
    },
    async redeemCartCode(codigo, userId, cajaId = null) {
      const cart = state.carts.find((c) => c.codigo === codigo);
      if (cart && cart.estado === 'enviado' && cart.codigo_expira > now()) {
        Object.assign(cart, {
          estado: 'retirado', codigo_usado: cart.codigo, codigo: null, retirado_user_id: userId, retirado_at: now(),
          retirado_caja_id: cajaId || null,
        });
        return { ok: true, cartId: cart.id, cuentaId: cart.cuenta_id };
      }
      const retired = state.carts
        .filter((c) => c.codigo_usado === codigo && c.estado === 'retirado')
        .sort((a, b) => b.retirado_at - a.retirado_at);
      const replay = retired.find((c) => userId && c.retirado_user_id === userId && c.retirado_at > now() - 10 * 60000);
      if (replay) return { ok: true, replay: true, cartId: replay.id, cuentaId: replay.cuenta_id };
      const pendingCart = state.carts.find((c) => c.codigo === codigo);
      return {
        ok: false,
        pending: pendingCart ? { estado: pendingCart.estado, vigente: pendingCart.codigo_expira > now() ? 1 : 0 } : null,
        used: retired.length ? { reciente: retired[0].retirado_at > now() - 24 * 3600000 ? 1 : 0 } : null,
      };
    },
    async getRedeemedCartProducts(cartId) {
      return cartItemsWithProducts(cartId).map(({ i, p }) => {
        if (!p) return { tienda_cantidad: i.cantidad, id_producto: null };
        return { tienda_cantidad: i.cantidad, ...p, departamento: 'Abarrotes', supplier_name: 'Proveedor X' };
      });
    },
    // ---- M-039 ----
    // turnos: turnos abiertos de hoy { caja_id, usuario_id }.
    async cajaHasOpenShift(numeroCaja, userId) {
      return state.cajas.some((c) => c.n_caja === numeroCaja)
        && state.turnos.some((t) => t.caja_id === numeroCaja && t.usuario_id === userId);
    },
    async linkCartToSale(cartId, ventaId, userId) {
      const cart = state.carts.find((c) => c.id === cartId && c.estado === 'retirado'
        && c.retirado_user_id === userId && !c.venta_id && c.retirado_at > now() - 86400000);
      if (!cart) return false;
      cart.venta_id = ventaId;
      return true;
    },
    async listAccountsForAdmin({ likeTerm = null, telefonoTerm = null, limit, offset }) {
      const like = likeTerm ? likeToRegExp(likeTerm) : null;
      const phone = telefonoTerm ? likeToRegExp(telefonoTerm) : null;
      const matches = state.accounts.filter((a) => !like
        || like.test(a.nombre) || like.test(a.telefono) || like.test(a.correo) || (phone && phone.test(a.telefono)));
      const sorted = [...matches].sort((a, b) => (b.created_at - a.created_at) || (b.id - a.id));
      return { rows: sorted.slice(offset, offset + limit).map(adminAccountRow), total: matches.length };
    },
    async getAccountForAdmin(cuentaId) {
      const account = state.accounts.find((a) => a.id === cuentaId);
      return account ? adminAccountRow(account) : null;
    },
    async listCartsForAdmin(cuentaId, limit) {
      return state.carts
        .filter((c) => c.cuenta_id === cuentaId)
        .sort((a, b) => b.id - a.id)
        .slice(0, limit)
        .map((c) => {
          const caja = state.cajas.find((row) => row.n_caja === c.retirado_caja_id);
          const user = state.usuarios.find((row) => row.id === c.retirado_user_id);
          const venta = state.ventas.find((row) => row.id_venta === c.venta_id);
          return {
            id: c.id,
            estado: c.estado,
            codigo: c.codigo,
            codigo_usado: c.codigo_usado,
            created_at: c.created_at,
            updated_at: c.updated_at,
            codigo_expira: c.codigo_expira ? new Date(c.codigo_expira) : null,
            retirado_at: c.retirado_at ? new Date(c.retirado_at) : null,
            retirado_caja_id: c.retirado_caja_id || null,
            caja_nombre: caja ? caja.nombre_caja : null,
            retirado_user_id: c.retirado_user_id || null,
            cajera_nombre: user ? user.nombre : null,
            venta_id: c.venta_id || null,
            venta_fecha: venta ? venta.fecha : null,
            venta_total: venta ? venta.total : null,
          };
        });
    },
    async listCartItemsForAdmin(cartIds) {
      return state.items
        .filter((i) => cartIds.includes(i.carrito_id))
        .map((i) => {
          const p = state.products.find((row) => row.id_producto === i.producto_id);
          return {
            carrito_id: i.carrito_id,
            cantidad: i.cantidad,
            id_producto: p ? p.id_producto : null,
            codigo_barras: p ? p.codigo_barras : null,
            descripcion: p ? p.descripcion : null,
            precio_venta: p ? p.precio_venta : null,
          };
        });
    },
  };
  return repo;
}

module.exports = { createMemoryRepo };

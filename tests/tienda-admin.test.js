// Clientes de la app para administradores (M-039): reglas puras de server/tienda_admin.js, rutas
// con un Express de prueba y la base simulada, canje con caja y vinculo carrito-venta.
// requireAdministrator se simula con la misma respuesta que el de server/server.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const express = require('../server/node_modules/express');
const jwt = require('../server/node_modules/jsonwebtoken');

const admin = require('../server/tienda_admin.js');
const { registerTiendaRoutes, isTiendaPath } = require('../server/tienda_routes.js');
const { createMemoryRepo } = require('./helpers/tienda-memory-repo.js');

const JWT_SECRET = 'secreto-de-prueba-para-tests-0123456789';
const ADMIN_ID = 1;
const CASHIER_ID = 5;
const CASHIER_2_ID = 6;
const ADMIN_TOKEN = jwt.sign({ sub: ADMIN_ID, name: 'Admin' }, JWT_SECRET, { expiresIn: '1h' });
const CASHIER_TOKEN = jwt.sign({ sub: CASHIER_ID, name: 'Cajera' }, JWT_SECRET, { expiresIn: '1h' });
const CASHIER_2_TOKEN = jwt.sign({ sub: CASHIER_2_ID, name: 'Otra cajera' }, JWT_SECRET, { expiresIn: '1h' });

// ---------------- Reglas puras ----------------

test('busqueda: sin caracteres de control, maximo 60 y comodines LIKE escapados', () => {
  assert.equal(admin.normalizeAdminSearch('  Ana\u0000  Perez\n '), 'Ana Perez');
  assert.equal(admin.normalizeAdminSearch('x'.repeat(80)).length, admin.ADMIN_SEARCH_MAX);
  assert.equal(admin.normalizeAdminSearch(['ana']), '');
  assert.equal(admin.normalizeAdminSearch(undefined), '');
  assert.equal(admin.escapeLike('50%_a\\b'), '50\\%\\_a\\\\b');
  assert.deepEqual(admin.buildAdminSearchTerms(''), { likeTerm: null, telefonoTerm: null });
  assert.deepEqual(admin.buildAdminSearchTerms('ana%'), { likeTerm: '%ana\\%%', telefonoTerm: null });
  assert.deepEqual(admin.buildAdminSearchTerms('9 1111-2222'), { likeTerm: '%9 1111-2222%', telefonoTerm: '%911112222%' });
  assert.deepEqual(admin.buildAdminSearchTerms('a12'), { likeTerm: '%a12%', telefonoTerm: null }, 'pocos digitos: sin busqueda extra');
  assert.deepEqual(admin.buildAdminSearchTerms('1234'), { likeTerm: '%1234%', telefonoTerm: null }, 'solo digitos: basta el LIKE normal');
});

test('pagina: entero positivo; lo demas es 1', () => {
  assert.equal(admin.parsePage('3'), 3);
  for (const value of [undefined, '', '0', '-2', '1.5', 'abc', '9999999', ['2']]) {
    assert.equal(admin.parsePage(value), 1, String(value));
  }
});

test('cliente y carrito para el administrador: lista blanca, sin clave, token ni google_sub', () => {
  const row = {
    id: 4, nombre: 'Ana', telefono: '+56911112222', correo: 'ana@correo.cl', google_vinculado: 1, activo: 1,
    created_at: new Date('2026-11-01T10:00:00Z'), last_login_at: null, carritos: '2',
    clave_hash: '$2a$10$secreto', google_sub: 'g-ana', token_hash: 'f'.repeat(64),
  };
  assert.deepEqual(admin.toAdminCustomer(row), {
    id: 4, nombre: 'Ana', telefono: '+56911112222', correo: 'ana@correo.cl', google_vinculado: true, activo: true,
    creado: '2026-11-01T10:00:00.000Z', ultimo_ingreso: null, carritos: 2,
  });

  const cart = admin.toAdminCart({
    id: 9, estado: 'retirado', codigo: null, codigo_usado: '123456',
    created_at: new Date('2026-11-01T10:00:00Z'), updated_at: new Date('2026-11-01T11:00:00Z'),
    codigo_expira: new Date('2026-11-01T12:00:00Z'), retirado_at: new Date('2026-11-01T11:00:00Z'),
    retirado_caja_id: 2, caja_nombre: 'Caja 2', retirado_user_id: 5, cajera_nombre: 'Marta',
    venta_id: 77, venta_fecha: new Date('2026-11-01T11:05:00Z'), venta_total: '3180.00',
  }, [
    { carrito_id: 9, cantidad: 2, id_producto: 1, codigo_barras: '780 ', descripcion: 'Leche', precio_venta: '1090.00', costo: 500 },
    { carrito_id: 9, cantidad: 1, id_producto: null, codigo_barras: null, descripcion: null, precio_venta: null },
  ]);
  assert.deepEqual(cart, {
    id: 9, estado: 'retirado', codigo: null, codigo_usado: '123456',
    creado: '2026-11-01T10:00:00.000Z', actualizado: '2026-11-01T11:00:00.000Z', codigo_expira: '2026-11-01T12:00:00.000Z',
    cargado_en_caja: { fecha: '2026-11-01T11:00:00.000Z', caja: { numero: 2, nombre: 'Caja 2' }, cajera: { nombre: 'Marta' } },
    venta: { id: 77, fecha: '2026-11-01T11:05:00.000Z', total: 3180 },
    items: [
      { codigo: '780', nombre: 'Leche', cantidad: 2, precio_actual: 1090 },
      { codigo: '', nombre: 'Producto eliminado', cantidad: 1, precio_actual: null },
    ],
    total_actual: 2180,
  });

  // Retirado antes de M-039: sin caja ni venta. Abierto: sin carga en caja.
  const legacy = admin.toAdminCart({ id: 1, estado: 'retirado', retirado_at: new Date(), retirado_user_id: 5, cajera_nombre: 'Marta' });
  assert.equal(legacy.cargado_en_caja.caja, null);
  assert.deepEqual(legacy.cargado_en_caja.cajera, { nombre: 'Marta' });
  assert.equal(legacy.venta, null);
  assert.equal(admin.toAdminCart({ id: 2, estado: 'abierto' }).cargado_en_caja, null);
  // Venta borrada (LEFT JOIN sin fila): no se informa.
  assert.equal(admin.toAdminCart({ id: 3, estado: 'retirado', retirado_at: new Date(), venta_id: 5, venta_fecha: null }).venta, null);
});

test('vinculo carrito-venta: nunca lanza; sin id o con id invalido no consulta la base', async () => {
  const calls = [];
  const repo = { async linkCartToSale(...args) { calls.push(args); return true; } };
  assert.equal(await admin.linkCustomerCartToSale(repo, undefined, 10, 5), false);
  assert.equal(await admin.linkCustomerCartToSale(repo, null, 10, 5), false);
  assert.equal(await admin.linkCustomerCartToSale(repo, '', 10, 5), false);
  assert.equal(await admin.linkCustomerCartToSale(repo, 'abc', 10, 5), false);
  assert.equal(await admin.linkCustomerCartToSale(repo, -3, 10, 5), false);
  assert.equal(await admin.linkCustomerCartToSale(repo, { id: 1 }, 10, 5), false);
  assert.equal(await admin.linkCustomerCartToSale(repo, 7, 10, null), false, 'sin usuario de la sesion');
  assert.equal(calls.length, 0);
  assert.equal(await admin.linkCustomerCartToSale(repo, '7', 10, 5), true);
  assert.deepEqual(calls, [[7, 10, 5]]);

  const logged = [];
  const failing = { async linkCartToSale() { throw new Error('base caida'); } };
  assert.equal(await admin.linkCustomerCartToSale(failing, 7, 10, 5, { logInternalError: (err) => logged.push(err.message) }), false);
  assert.deepEqual(logged, ['base caida']);
  const throwingLogger = { logInternalError: () => { throw new Error('log roto'); } };
  assert.equal(await admin.linkCustomerCartToSale(failing, 7, 10, 5, throwingLogger), false);
});

// ---------------- Rutas ----------------

async function startApp({ staffCaja = {} } = {}) {
  let t = Date.parse('2026-11-18T12:00:00Z');
  const repo = createMemoryRepo({ now: () => t });
  repo.addProduct({ codigo_barras: '7801000000011', descripcion: 'Leche entera 1L', precio_venta: '1090.00', cantidad_actual: '24.000', utiliza_inventario: 1, cantidad_minima: 5, formato_venta: 'Unidad' });
  repo.addProduct({ codigo_barras: '0042', descripcion: 'Chicle', precio_venta: '200.00', cantidad_actual: 20, utiliza_inventario: 1, cantidad_minima: 0, formato_venta: 'Pack' });
  repo.state.cajas.push({ n_caja: 1, nombre_caja: 'Caja principal' }, { n_caja: 3, nombre_caja: 'Caja 3' });
  repo.state.usuarios.push({ id: ADMIN_ID, nombre: 'Admin' }, { id: CASHIER_ID, nombre: 'Marta' }, { id: CASHIER_2_ID, nombre: 'Rosa' });

  const admins = new Set([ADMIN_ID]);
  const adminChecks = [];
  async function requireAdministrator(req, res) {
    adminChecks.push(Number(req.user?.sub));
    if (admins.has(Number(req.user?.sub))) return true;
    const message = 'Solo un administrador puede realizar esta accion';
    res.status(403).json({ message, error: message });
    return false;
  }

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/')) return next();
    if (isTiendaPath(req.path)) return next();
    const [type, token] = String(req.headers.authorization || '').split(' ');
    if (type !== 'Bearer' || !token) return res.status(401).json({ message: 'Token requerido' });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      return next();
    } catch (_) {
      return res.status(401).json({ message: 'Token invalido', code: 'TOKEN_INVALID' });
    }
  });
  registerTiendaRoutes(app, {
    repo,
    logInternalError: () => 'Error interno del servidor',
    resolveStaffCajaId: async (userId) => {
      const value = staffCaja[userId];
      if (value instanceof Error) throw value;
      return value ?? null;
    },
  });
  admin.registerTiendaAdminRoutes(app, { repo, requireAdministrator, logInternalError: () => 'Error interno del servidor' });

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  async function call(method, urlPath, { body, token } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(base + urlPath, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (_) { json = null; }
    return { status: response.status, json, text, headers: response.headers };
  }

  return {
    repo,
    call,
    adminChecks,
    advance: (ms) => { t += ms; },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

let phoneSeq = 0;
async function registerCustomer(ctx, overrides = {}) {
  phoneSeq += 1;
  const body = {
    telefono: `+5691111${String(phoneSeq).padStart(4, '0')}`,
    nombre: `Cliente ${phoneSeq}`,
    correo: `cliente${phoneSeq}@correo.cl`,
    clave: 'clave123',
    ...overrides,
  };
  const res = await ctx.call('POST', '/api/tienda/cuenta/registro', { body });
  assert.equal(res.status, 201, res.text);
  return res.json.token;
}

async function sendCart(ctx, token, codigo = '7801000000011', cantidad = 2) {
  await ctx.call('POST', '/api/tienda/carrito/items', { token, body: { codigo, cantidad } });
  const sent = await ctx.call('POST', '/api/tienda/carrito/finalizar', { token });
  return sent.json.carrito.codigo;
}

async function redeemWith(ctx, staffToken, body = {}) {
  const token = await registerCustomer(ctx);
  const res = await ctx.call('POST', '/api/ventas/carrito-cliente/cargar', { token: staffToken, body: { codigo: await sendCart(ctx, token), ...body } });
  assert.equal(res.status, 200, res.text);
  return { res, cart: ctx.repo.state.carts.find((c) => c.id === res.json.carrito_id) };
}

test('canje: prefiere caja_id del equipo si existe y el usuario tiene ahi su turno abierto; responde carrito_id', async () => {
  const ctx = await startApp({ staffCaja: { [CASHIER_ID]: 3 } });
  ctx.repo.state.turnos.push({ caja_id: 1, usuario_id: CASHIER_ID });
  try {
    const { res, cart } = await redeemWith(ctx, CASHIER_TOKEN, { caja_id: 1 });
    assert.equal(res.json.carrito_id, cart.id);
    assert.equal(cart.retirado_caja_id, 1, 'gana la caja del equipo sobre la de la sesion');
    assert.equal(cart.retirado_user_id, CASHIER_ID);
    assert.equal(res.json.items.length, 1);
    assert.equal((await redeemWith(ctx, CASHIER_TOKEN, { caja_id: '1' })).cart.retirado_caja_id, 1);
  } finally {
    await ctx.close();
  }
});

test('canje: caja_id sin turno propio, inexistente o invalido usa la de la sesion; si no, null sin fallar', async () => {
  const ctx = await startApp({ staffCaja: { [CASHIER_ID]: 3, [CASHIER_2_ID]: new Error('base caida') } });
  // Caja 1: turno abierto de otra persona. Caja 99: turno pero no existe en cajas.
  ctx.repo.state.turnos.push({ caja_id: 1, usuario_id: CASHIER_2_ID }, { caja_id: 99, usuario_id: CASHIER_ID });
  try {
    assert.equal((await redeemWith(ctx, CASHIER_TOKEN, { caja_id: 1 })).cart.retirado_caja_id, 3, 'turno de otro: sesion');
    assert.equal((await redeemWith(ctx, CASHIER_TOKEN, { caja_id: 99 })).cart.retirado_caja_id, 3, 'caja inexistente: sesion');
    assert.equal((await redeemWith(ctx, CASHIER_TOKEN, { caja_id: '1 OR 1=1' })).cart.retirado_caja_id, 3);
    assert.equal((await redeemWith(ctx, CASHIER_TOKEN)).cart.retirado_caja_id, 3, 'sin caja_id: sesion');
    // Cajera 2: la sesion falla y la caja del cuerpo no tiene su turno: null, igual carga.
    assert.equal((await redeemWith(ctx, CASHIER_2_TOKEN, { caja_id: 3 })).cart.retirado_caja_id, null);
    // Cajera 2 con turno en caja 1: vale el cuerpo aunque la sesion falle.
    assert.equal((await redeemWith(ctx, CASHIER_2_TOKEN, { caja_id: 1 })).cart.retirado_caja_id, 1);

    // Si falla la consulta del turno, se usa la sesion.
    ctx.repo.cajaHasOpenShift = async () => { throw new Error('base caida'); };
    assert.equal((await redeemWith(ctx, CASHIER_TOKEN, { caja_id: 1 })).cart.retirado_caja_id, 3);
  } finally {
    await ctx.close();
  }
});

test('venta: vincula solo el carrito retirado por el mismo usuario y una sola vez', async () => {
  const ctx = await startApp({ staffCaja: { [CASHIER_ID]: 1 } });
  try {
    const token = await registerCustomer(ctx);
    const r = await ctx.call('POST', '/api/ventas/carrito-cliente/cargar', { token: CASHIER_TOKEN, body: { codigo: await sendCart(ctx, token) } });
    const cartId = r.json.carrito_id;
    const cart = ctx.repo.state.carts.find((c) => c.id === cartId);

    assert.equal(await admin.linkCustomerCartToSale(ctx.repo, cartId, 500, CASHIER_2_ID), false, 'otro usuario no vincula');
    assert.equal(cart.venta_id, undefined);
    assert.equal(await admin.linkCustomerCartToSale(ctx.repo, cartId, 500, CASHIER_ID), true);
    assert.equal(cart.venta_id, 500);
    assert.equal(await admin.linkCustomerCartToSale(ctx.repo, cartId, 501, CASHIER_ID), false, 'ya tiene venta');
    assert.equal(cart.venta_id, 500);

    // Un carrito que no esta retirado no se vincula.
    const other = await registerCustomer(ctx);
    await sendCart(ctx, other);
    const pending = ctx.repo.state.carts.find((c) => c.estado === 'enviado');
    assert.equal(await admin.linkCustomerCartToSale(ctx.repo, pending.id, 502, CASHIER_ID), false);

    // Retirado hace mas de un dia: ya no se vincula.
    const late = await ctx.call('POST', '/api/ventas/carrito-cliente/cargar', { token: CASHIER_TOKEN, body: { codigo: await sendCart(ctx, await registerCustomer(ctx)) } });
    ctx.advance(86400000 + 1000);
    assert.equal(await admin.linkCustomerCartToSale(ctx.repo, late.json.carrito_id, 503, CASHIER_ID), false);
  } finally {
    await ctx.close();
  }
});

test('API admin: 401 sin token, 403 a cajeros, 200 al administrador', async () => {
  const ctx = await startApp();
  try {
    for (const url of ['/api/admin/tienda/clientes', '/api/admin/tienda/clientes/1']) {
      assert.equal((await ctx.call('GET', url)).status, 401, url);
      const cashier = await ctx.call('GET', url, { token: CASHIER_TOKEN });
      assert.equal(cashier.status, 403, url);
      assert.equal(cashier.json.clientes, undefined);
    }
    const customerToken = await registerCustomer(ctx);
    assert.equal((await ctx.call('GET', '/api/admin/tienda/clientes', { token: customerToken })).status, 401, 'token de cliente no sirve');
    const ok = await ctx.call('GET', '/api/admin/tienda/clientes', { token: ADMIN_TOKEN });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('cache-control'), 'no-store');
    assert.deepEqual(ctx.adminChecks, [CASHIER_ID, CASHIER_ID, ADMIN_ID]);
  } finally {
    await ctx.close();
  }
});

test('API admin: lista paginada, orden por registro y busqueda por nombre, telefono y correo', async () => {
  const ctx = await startApp();
  try {
    for (let i = 0; i < 55; i += 1) {
      await registerCustomer(ctx);
      ctx.advance(1000);
    }
    await registerCustomer(ctx, { nombre: 'Ana 100% Perez', telefono: '+56987654321', correo: 'ana.perez@correo.cl' });

    const page1 = await ctx.call('GET', '/api/admin/tienda/clientes', { token: ADMIN_TOKEN });
    assert.equal(page1.json.total, 56);
    assert.equal(page1.json.pagina, 1);
    assert.equal(page1.json.por_pagina, 50);
    assert.equal(page1.json.clientes.length, 50);
    assert.equal(page1.json.clientes[0].nombre, 'Ana 100% Perez', 'el mas reciente primero');
    assert.deepEqual(Object.keys(page1.json.clientes[0]).sort(), [
      'activo', 'carritos', 'correo', 'creado', 'google_vinculado', 'id', 'nombre', 'telefono', 'ultimo_ingreso',
    ]);
    assert.equal(page1.json.clientes[0].google_vinculado, false);
    assert.equal(page1.json.clientes[0].activo, true);
    assert.ok(page1.json.clientes[0].ultimo_ingreso, 'el registro abre sesion');

    const page2 = await ctx.call('GET', '/api/admin/tienda/clientes?pagina=2', { token: ADMIN_TOKEN });
    assert.equal(page2.json.clientes.length, 6);
    const empty = await ctx.call('GET', '/api/admin/tienda/clientes?pagina=9', { token: ADMIN_TOKEN });
    assert.deepEqual(empty.json.clientes, []);
    assert.equal(empty.json.total, 56);

    const byName = await ctx.call('GET', `/api/admin/tienda/clientes?q=${encodeURIComponent('ana 100%')}`, { token: ADMIN_TOKEN });
    assert.deepEqual(byName.json.clientes.map((c) => c.nombre), ['Ana 100% Perez']);
    const byPercent = await ctx.call('GET', `/api/admin/tienda/clientes?q=${encodeURIComponent('%')}`, { token: ADMIN_TOKEN });
    assert.equal(byPercent.json.total, 1, '% se busca literal, no como comodin');
    const byUnderscore = await ctx.call('GET', `/api/admin/tienda/clientes?q=${encodeURIComponent('_')}`, { token: ADMIN_TOKEN });
    assert.equal(byUnderscore.json.total, 0);
    const byPhone = await ctx.call('GET', `/api/admin/tienda/clientes?q=${encodeURIComponent('8765 4321')}`, { token: ADMIN_TOKEN });
    assert.deepEqual(byPhone.json.clientes.map((c) => c.telefono), ['+56987654321']);
    const byMail = await ctx.call('GET', '/api/admin/tienda/clientes?q=ANA.PEREZ@', { token: ADMIN_TOKEN });
    assert.equal(byMail.json.total, 1);
    const none = await ctx.call('GET', '/api/admin/tienda/clientes?q=zzz', { token: ADMIN_TOKEN });
    assert.deepEqual(none.json, { clientes: [], total: 0, pagina: 1, por_pagina: 50 });
    const longQuery = await ctx.call('GET', `/api/admin/tienda/clientes?q=${'a'.repeat(200)}`, { token: ADMIN_TOKEN });
    assert.equal(longQuery.status, 200, 'texto largo se recorta a 60');
  } finally {
    await ctx.close();
  }
});

test('API admin: detalle con carritos, carga en caja, venta y sin datos sensibles; 404', async () => {
  const ctx = await startApp({ staffCaja: { [CASHIER_ID]: 3 } });
  try {
    const token = await registerCustomer(ctx, { nombre: 'Ana', telefono: '+56911110000', correo: 'ana@correo.cl' });
    const account = ctx.repo.state.accounts.find((a) => a.nombre === 'Ana');
    account.google_sub = 'g-sub-secreto';

    // Carrito 1: retirado en caja 3 y cobrado.
    const r = await ctx.call('POST', '/api/ventas/carrito-cliente/cargar', { token: CASHIER_TOKEN, body: { codigo: await sendCart(ctx, token) } });
    ctx.repo.state.ventas.push({ id_venta: 900, fecha: new Date('2026-11-18T12:05:00Z'), total: '2180.00' });
    assert.equal(await admin.linkCustomerCartToSale(ctx.repo, r.json.carrito_id, 900, CASHIER_ID), true);
    // Carrito 2: retirado antes de M-039 (sin caja), sin venta.
    const legacyToken = token;
    ctx.advance(60000);
    const code2 = await sendCart(ctx, legacyToken, '0042', 3);
    const legacy = ctx.repo.state.carts.find((c) => c.codigo === code2);
    Object.assign(legacy, { estado: 'retirado', codigo_usado: code2, codigo: null, retirado_at: Date.parse('2026-11-18T12:02:00Z'), retirado_user_id: CASHIER_2_ID });
    // Carrito 3: abierto. El precio de la leche cambia despues.
    await ctx.call('POST', '/api/tienda/carrito/items', { token, body: { codigo: '7801000000011', cantidad: 1 } });
    ctx.repo.state.products[0].precio_venta = '1200.00';

    const res = await ctx.call('GET', `/api/admin/tienda/clientes/${account.id}`, { token: ADMIN_TOKEN });
    assert.equal(res.status, 200);
    assert.equal(res.json.cliente.id, account.id);
    assert.equal(res.json.cliente.google_vinculado, true);
    assert.equal(res.json.cliente.carritos, 3);
    const [open, old, paid] = res.json.carritos;
    assert.equal(open.estado, 'abierto');
    assert.equal(open.cargado_en_caja, null);
    assert.equal(open.venta, null);
    assert.deepEqual(open.items, [{ codigo: '7801000000011', nombre: 'Leche entera 1L', cantidad: 1, precio_actual: 1200 }]);
    assert.equal(open.total_actual, 1200);

    assert.equal(old.cargado_en_caja.caja, null);
    assert.deepEqual(old.cargado_en_caja.cajera, { nombre: 'Rosa' });
    assert.equal(old.venta, null);
    assert.equal(old.codigo_usado, code2);

    assert.equal(paid.estado, 'retirado');
    assert.deepEqual(paid.cargado_en_caja.caja, { numero: 3, nombre: 'Caja 3' });
    assert.deepEqual(paid.cargado_en_caja.cajera, { nombre: 'Marta' });
    assert.deepEqual(paid.venta, { id: 900, fecha: '2026-11-18T12:05:00.000Z', total: 2180 });
    assert.deepEqual(paid.items, [{ codigo: '7801000000011', nombre: 'Leche entera 1L', cantidad: 2, precio_actual: 1200 }]);
    assert.equal(paid.total_actual, 2400, 'precio de hoy, no el cobrado');
    assert.deepEqual(Object.keys(paid).sort(), [
      'actualizado', 'cargado_en_caja', 'codigo', 'codigo_expira', 'codigo_usado', 'creado', 'estado', 'id', 'items', 'total_actual', 'venta',
    ]);

    for (const secret of ['clave_hash', 'token_hash', 'google_sub', 'g-sub-secreto', '$2a$', 'costo', 'id_producto', account.clave_hash]) {
      assert.ok(!res.text.includes(secret), secret);
    }
    const list = await ctx.call('GET', '/api/admin/tienda/clientes', { token: ADMIN_TOKEN });
    for (const secret of ['clave_hash', 'token_hash', 'google_sub', 'g-sub-secreto', account.clave_hash]) {
      assert.ok(!list.text.includes(secret), secret);
    }

    for (const id of ['999', 'abc', '0', '-1', '1.5']) {
      const missing = await ctx.call('GET', `/api/admin/tienda/clientes/${id}`, { token: ADMIN_TOKEN });
      assert.equal(missing.status, 404, id);
      assert.equal(missing.json.code, 'CUSTOMER_NOT_FOUND');
    }
  } finally {
    await ctx.close();
  }
});

test('API admin: error de la base responde 500 sin detalle', async () => {
  const ctx = await startApp();
  try {
    ctx.repo.listAccountsForAdmin = async () => { throw new Error('SELECT secreto fallo'); };
    const res = await ctx.call('GET', '/api/admin/tienda/clientes', { token: ADMIN_TOKEN });
    assert.equal(res.status, 500);
    assert.deepEqual(res.json, { message: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
  } finally {
    await ctx.close();
  }
});

// ---------------- Conexion en server/server.js ----------------

test('server.js: rutas admin con requireAdministrator, caja de la sesion y vinculo tras confirmar la venta', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'server', 'server.js'), 'utf8');
  assert.match(source, /registerTiendaAdminRoutes\(app, \{ repo: tiendaRepo, requireAdministrator, logInternalError \}\);/);
  assert.match(source, /resolveStaffCajaId: \(userId\) => resolveCurrentCajaIdForUser\(userId\),/);

  const start = source.indexOf("app.post('/api/sales', async (req, res) => {");
  const end = source.indexOf('\napp.', start + 10);
  const route = source.slice(start, end);
  const commit = route.indexOf('await connection.commit();');
  const link = route.indexOf('void linkCustomerCartToSale(tiendaRepo, req.body?.carrito_cliente_id, ventaId, toInt(req.user?.sub), { logInternalError });');
  assert.ok(commit > 0 && link > commit, 'el vinculo va despues del commit de la venta');
  assert.doesNotMatch(route, /await linkCustomerCartToSale/, 'sin await: no demora la respuesta');
  assert.equal((route.match(/linkCustomerCartToSale/g) || []).length, 1);
  assert.doesNotMatch(route.slice(0, commit), /carrito_cliente_id/, 'el carrito no participa en la transaccion de la venta');
});

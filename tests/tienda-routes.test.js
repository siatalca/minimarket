// Rutas de la consulta de precios y del carrito (M-037) con un Express de prueba y la base
// simulada de tests/helpers/tienda-memory-repo.js. El middleware de abajo reproduce el de
// server/server.js (deja pasar /api/tienda/* y exige el JWT del personal en lo demas).

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('../server/node_modules/express');
const jwt = require('../server/node_modules/jsonwebtoken');

const bcrypt = require('../server/node_modules/bcryptjs');
const { registerTiendaRoutes, isTiendaPath, DEFAULT_LIMITS } = require('../server/tienda_routes.js');
const { GoogleAuthError } = require('../server/tienda_google.js');
const { createMemoryRepo } = require('./helpers/tienda-memory-repo.js');

const JWT_SECRET = 'secreto-de-prueba-para-tests-0123456789';
const STAFF_TOKEN = jwt.sign({ sub: 5, name: 'Cajera' }, JWT_SECRET, { expiresIn: '1h' });
const STAFF_TOKEN_2 = jwt.sign({ sub: 6, name: 'Otra cajera' }, JWT_SECRET, { expiresIn: '1h' });
const NO_SUB_TOKEN = jwt.sign({ name: 'Sin sub' }, JWT_SECRET, { expiresIn: '1h' });

function fakeGoogle() {
  const tokens = {
    'cred-ana': { sub: 'g-ana', email: 'ana@gmail.com', name: 'Ana Google' },
    'cred-luis': { sub: 'g-luis', email: 'luis@gmail.com', name: 'Luis' },
    'cred-ocupado': { sub: 'g-otro', email: 'pedro@correo.cl', name: 'Pedro' },
  };
  return {
    async verify(credential) {
      if (credential === 'cred-caido') throw new GoogleAuthError('GOOGLE_UNAVAILABLE', 'sin red');
      if (!tokens[credential]) throw new GoogleAuthError('GOOGLE_INVALID', 'Credencial de Google invalida');
      return tokens[credential];
    },
  };
}

async function startApp({ google = true, limits = {}, loadQrModule, clock } = {}) {
  let t = Date.parse('2026-11-18T12:00:00Z');
  const now = clock || (() => t);
  const repo = createMemoryRepo({ now });
  repo.addProduct({ codigo_barras: '7801000000011', descripcion: 'Leche entera 1L', precio_venta: '1090.00', cantidad_actual: '24.000', utiliza_inventario: 1, cantidad_minima: 5, formato_venta: 'Unidad' });
  repo.addProduct({ codigo_barras: '7801000000028', descripcion: 'Pan amasado', precio_venta: '2490.00', cantidad_actual: 0, utiliza_inventario: 0, cantidad_minima: 0, formato_venta: 'granel' });
  repo.addProduct({ codigo_barras: '0042', descripcion: 'Chicle', precio_venta: '200.00', cantidad_actual: 2, utiliza_inventario: 1, cantidad_minima: 0, formato_venta: 'Pack' });

  const app = express();
  app.set('trust proxy', 'loopback');
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
  app.get('/api/productos', (req, res) => res.json([{ costo: 1 }]));
  const options = {
    repo,
    googleClientId: google ? 'cliente.apps.googleusercontent.com' : null,
    googleVerifier: google ? fakeGoogle() : null,
    limits,
    logInternalError: () => 'Error interno del servidor',
  };
  if (loadQrModule) options.loadQrModule = loadQrModule;
  registerTiendaRoutes(app, options);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  async function call(method, path, { body, token, ip, headers = {} } = {}) {
    const h = { ...headers };
    if (body !== undefined) h['Content-Type'] = 'application/json';
    if (token) h.Authorization = `Bearer ${token}`;
    if (ip) h['X-Forwarded-For'] = ip;
    const response = await fetch(base + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (_) { json = null; }
    return { status: response.status, json, text, headers: response.headers };
  }

  return {
    repo,
    call,
    advance: (ms) => { t += ms; },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function register(ctx, overrides = {}) {
  const body = { telefono: '+56911112222', nombre: 'Ana', correo: 'ana@correo.cl', clave: 'clave123', ...overrides };
  return ctx.call('POST', '/api/tienda/cuenta/registro', { body });
}

test('consulta publica sin token: solo campos publicos y stock exacto', async () => {
  const ctx = await startApp();
  try {
    const ok = await ctx.call('GET', '/api/tienda/producto?codigo=7801000000011');
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.json, {
      found: true,
      producto: { codigo: '7801000000011', nombre: 'Leche entera 1L', precio: 1090, formato: 'unidad', stock: { estado: 'disponible', cantidad: 24 } },
    });
    for (const hidden of ['costo', 'ganancia', 'supplier', 'departamento', 'minima', 'maxima', 'id_producto']) {
      assert.ok(!ok.text.includes(hidden), hidden);
    }
    const numeric = await ctx.call('GET', '/api/tienda/producto?codigo=42');
    assert.equal(numeric.json.producto.codigo, '0042');
    assert.deepEqual(numeric.json.producto.stock, { estado: 'pocas', cantidad: 2 });

    const missing = await ctx.call('GET', '/api/tienda/producto?codigo=999');
    assert.equal(missing.status, 404);
    assert.equal(missing.json.found, false);

    const invalid = await ctx.call('GET', '/api/tienda/producto?codigo=%25%27');
    assert.equal(invalid.status, 400);
    assert.equal(invalid.json.code, 'INVALID_CODE');
    const noCode = await ctx.call('GET', '/api/tienda/producto');
    assert.equal(noCode.json.code, 'INVALID_CODE');
  } finally {
    await ctx.close();
  }
});

test('consulta: 429 al superar el limite por IP, antes de tocar la base', async () => {
  const ctx = await startApp({ limits: { consultaIp: 3 } });
  try {
    let dbCalls = 0;
    const original = ctx.repo.findProductByCode;
    ctx.repo.findProductByCode = async (code) => { dbCalls += 1; return original(code); };
    for (let i = 0; i < 3; i += 1) {
      assert.equal((await ctx.call('GET', '/api/tienda/producto?codigo=42', { ip: '10.0.0.7' })).status, 200);
    }
    const blocked = await ctx.call('GET', '/api/tienda/producto?codigo=42', { ip: '10.0.0.7' });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.json.code, 'RATE_LIMITED');
    assert.ok(Number(blocked.headers.get('retry-after')) >= 1);
    assert.equal(dbCalls, 3, 'el pedido bloqueado no consulto la base');
    assert.equal((await ctx.call('GET', '/api/tienda/producto?codigo=42', { ip: '10.0.0.8' })).status, 200, 'otra IP sigue');
  } finally {
    await ctx.close();
  }
});

test('consulta: limite global aunque no se conozca la IP', async () => {
  const ctx = await startApp({ limits: { consultaGlobal: 2 } });
  try {
    await ctx.call('GET', '/api/tienda/producto?codigo=42');
    await ctx.call('GET', '/api/tienda/info');
    assert.equal((await ctx.call('GET', '/api/tienda/producto?codigo=42')).status, 429);
  } finally {
    await ctx.close();
  }
});

test('info: nombre y client id de Google; sin GOOGLE_CLIENT_ID es null y Google da 503', async () => {
  const on = await startApp();
  const off = await startApp({ google: false });
  try {
    assert.deepEqual((await on.call('GET', '/api/tienda/info')).json, { nombre: 'Minimarket Prueba', google_client_id: 'cliente.apps.googleusercontent.com' });
    assert.deepEqual((await off.call('GET', '/api/tienda/info')).json, { nombre: 'Minimarket Prueba', google_client_id: null });

    const login = await off.call('POST', '/api/tienda/cuenta/google', { body: { credential: 'cred-ana' } });
    assert.equal(login.status, 503);
    assert.equal(login.json.code, 'GOOGLE_DISABLED');
    const reg = await register(off, { google_credential: 'cred-ana' });
    assert.equal(reg.status, 503);
    assert.equal(reg.json.code, 'GOOGLE_DISABLED');
    const link = await off.call('POST', '/api/tienda/cuenta/google/vincular', { body: { credential: 'cred-ana' } });
    assert.equal(link.json.code, 'GOOGLE_DISABLED');
    assert.equal((await register(off)).status, 201, 'registro con telefono funciona sin Google');
  } finally {
    await on.close();
    await off.close();
  }
});

test('registro, login, cuenta, logout y datos duplicados', async () => {
  const ctx = await startApp();
  try {
    const reg = await register(ctx, { telefono: '9 1111 2222' });
    assert.equal(reg.status, 201);
    assert.match(reg.json.token, /^[A-Za-z0-9_-]{43}$/);
    assert.deepEqual(reg.json.cuenta, { nombre: 'Ana', telefono: '+56911112222', correo: 'ana@correo.cl', google_vinculado: false });
    assert.match(ctx.repo.state.accounts[0].clave_hash, /^\$2[aby]\$10\$/, 'bcrypt costo 10');
    assert.notEqual(ctx.repo.state.sessions[0].token_hash, reg.json.token, 'se guarda el hash, no el token');

    assert.equal((await register(ctx, { correo: 'otro@correo.cl' })).json.code, 'PHONE_TAKEN');
    assert.equal((await register(ctx, { telefono: '+56933334444' })).json.code, 'EMAIL_TAKEN');
    const bad = await register(ctx, { telefono: '22345678' });
    assert.equal(bad.status, 400);
    assert.equal(bad.json.code, 'INVALID_DATA');
    assert.equal((await register(ctx, { telefono: '+56955556666', correo: 'x@y.cl', clave: '123' })).json.code, 'INVALID_DATA');

    const wrong = await ctx.call('POST', '/api/tienda/cuenta/login', { body: { telefono: '911112222', clave: 'nop12345' } });
    assert.equal(wrong.status, 401);
    assert.equal(wrong.json.code, 'INVALID_CREDENTIALS');
    const unknown = await ctx.call('POST', '/api/tienda/cuenta/login', { body: { telefono: '999999999', clave: 'clave123' } });
    assert.equal(unknown.json.code, 'INVALID_CREDENTIALS');

    const login = await ctx.call('POST', '/api/tienda/cuenta/login', { body: { telefono: '+56 9 1111 2222', clave: 'clave123' } });
    assert.equal(login.status, 200);
    const me = await ctx.call('GET', '/api/tienda/cuenta', { token: login.json.token });
    assert.equal(me.status, 200);
    assert.equal(me.json.cuenta.telefono, '+56911112222');

    assert.equal((await ctx.call('POST', '/api/tienda/cuenta/logout', { token: login.json.token })).status, 204);
    const after = await ctx.call('GET', '/api/tienda/cuenta', { token: login.json.token });
    assert.equal(after.status, 401);
    assert.equal(after.json.code, 'SESSION_INVALID');
    assert.equal((await ctx.call('GET', '/api/tienda/cuenta', { token: reg.json.token })).status, 200, 'la otra sesion sigue');
    assert.equal((await ctx.call('POST', '/api/tienda/cuenta/logout')).status, 204, 'logout sin token tambien 204');
  } finally {
    await ctx.close();
  }
});

test('login: 429 por intentos fallidos desde una IP', async () => {
  const ctx = await startApp({ limits: { loginIp: 3 } });
  try {
    await register(ctx);
    for (let i = 0; i < 3; i += 1) {
      const r = await ctx.call('POST', '/api/tienda/cuenta/login', { body: { telefono: '911112222', clave: 'mala' + i + 'xx' }, ip: '10.1.1.1' });
      assert.equal(r.status, 401);
    }
    const blocked = await ctx.call('POST', '/api/tienda/cuenta/login', { body: { telefono: '911112222', clave: 'clave123' }, ip: '10.1.1.1' });
    assert.equal(blocked.status, 429);
  } finally {
    await ctx.close();
  }
});

test('registro: 429 al superar el limite por IP (60/h por defecto); los datos invalidos no cuentan', async () => {
  assert.equal(DEFAULT_LIMITS.registroIp, 60);
  const ctx = await startApp({ limits: { registroIp: 2 } });
  try {
    // Sin IP conocida (pedido local sin X-Forwarded-For) solo cuenta el limite global.
    assert.equal((await register(ctx, { telefono: '+56900000001', correo: 'a1@c.cl' })).status, 201);
    assert.equal((await register(ctx, { telefono: '+56900000002', correo: 'a2@c.cl' })).status, 201);
    for (let i = 0; i < 5; i += 1) {
      const invalid = await ctx.call('POST', '/api/tienda/cuenta/registro', { ip: '10.2.2.2', body: { telefono: 'malo', nombre: 'A', correo: 'a@c.cl', clave: 'clave123' } });
      assert.equal(invalid.status, 400);
    }
    const r1 = await ctx.call('POST', '/api/tienda/cuenta/registro', { ip: '10.2.2.2', body: { telefono: '+56900000003', nombre: 'A', correo: 'a3@c.cl', clave: 'clave123' } });
    const r2 = await ctx.call('POST', '/api/tienda/cuenta/registro', { ip: '10.2.2.2', body: { telefono: '+56900000004', nombre: 'A', correo: 'a4@c.cl', clave: 'clave123' } });
    const r3 = await ctx.call('POST', '/api/tienda/cuenta/registro', { ip: '10.2.2.2', body: { telefono: '+56900000005', nombre: 'A', correo: 'a5@c.cl', clave: 'clave123' } });
    assert.deepEqual([r1.status, r2.status, r3.status], [201, 201, 429]);
  } finally {
    await ctx.close();
  }
});

test('Google: registro con credencial, login por google_sub, no vinculado, vincular y recuperar clave', async () => {
  const ctx = await startApp();
  try {
    const notLinked = await ctx.call('POST', '/api/tienda/cuenta/google', { body: { credential: 'cred-ana' } });
    assert.equal(notLinked.status, 404);
    assert.equal(notLinked.json.code, 'GOOGLE_NOT_LINKED');
    assert.equal(notLinked.json.correo, 'ana@gmail.com');
    assert.equal(notLinked.json.nombre, 'Ana Google');

    const invalid = await ctx.call('POST', '/api/tienda/cuenta/google', { body: { credential: 'falsa' } });
    assert.equal(invalid.status, 401);
    assert.equal(invalid.json.code, 'GOOGLE_INVALID');
    assert.equal((await ctx.call('POST', '/api/tienda/cuenta/google', { body: { credential: 'cred-caido' } })).status, 503);

    // Registro con Google: el correo es el verificado por Google aunque se envie otro.
    const reg = await register(ctx, { correo: 'otro@correo.cl', google_credential: 'cred-ana' });
    assert.equal(reg.status, 201);
    assert.equal(reg.json.cuenta.correo, 'ana@gmail.com');
    assert.equal(reg.json.cuenta.google_vinculado, true);
    assert.equal((await register(ctx, { telefono: '+56977778888', google_credential: 'falsa' })).json.code, 'GOOGLE_INVALID');
    const takenGoogle = await register(ctx, { telefono: '+56977778888', correo: 'z@z.cl', google_credential: 'cred-ana' });
    assert.equal(takenGoogle.status, 409);

    const login = await ctx.call('POST', '/api/tienda/cuenta/google', { body: { credential: 'cred-ana' } });
    assert.equal(login.status, 200);
    assert.equal(login.json.cuenta.telefono, '+56911112222');

    // Cuenta con telefono que vincula Google; el correo de Google pasa a la cuenta.
    const luis = await register(ctx, { telefono: '+56922223333', correo: 'luis@correo.cl', nombre: 'Luis' });
    const linked = await ctx.call('POST', '/api/tienda/cuenta/google/vincular', { token: luis.json.token, body: { credential: 'cred-luis' } });
    assert.equal(linked.status, 200);
    assert.deepEqual(linked.json.cuenta, { nombre: 'Luis', telefono: '+56922223333', correo: 'luis@gmail.com', google_vinculado: true });
    const linkTaken = await ctx.call('POST', '/api/tienda/cuenta/google/vincular', { token: luis.json.token, body: { credential: 'cred-ana' } });
    assert.equal(linkTaken.status, 409);
    assert.equal(linkTaken.json.code, 'GOOGLE_TAKEN');
    await register(ctx, { telefono: '+56944445555', correo: 'pedro@correo.cl', nombre: 'Pedro' });
    const emailTaken = await ctx.call('POST', '/api/tienda/cuenta/google/vincular', { token: luis.json.token, body: { credential: 'cred-ocupado' } });
    assert.equal(emailTaken.json.code, 'EMAIL_TAKEN');
    assert.equal((await ctx.call('POST', '/api/tienda/cuenta/google/vincular', { body: { credential: 'cred-luis' } })).status, 401, 'vincular exige sesion');

    // Recuperar clave: entra con Google, cambia la clave; las otras sesiones se cierran.
    const viaGoogle = await ctx.call('POST', '/api/tienda/cuenta/google', { body: { credential: 'cred-luis' } });
    assert.equal((await ctx.call('POST', '/api/tienda/cuenta/clave', { token: viaGoogle.json.token, body: { clave_nueva: '12' } })).status, 400);
    assert.equal((await ctx.call('POST', '/api/tienda/cuenta/clave', { token: viaGoogle.json.token, body: { clave_nueva: 'nueva-clave' } })).status, 204);
    assert.equal((await ctx.call('GET', '/api/tienda/cuenta', { token: luis.json.token })).status, 401, 'sesion anterior revocada');
    assert.equal((await ctx.call('GET', '/api/tienda/cuenta', { token: viaGoogle.json.token })).status, 200);
    const newLogin = await ctx.call('POST', '/api/tienda/cuenta/login', { body: { telefono: '922223333', clave: 'nueva-clave' } });
    assert.equal(newLogin.status, 200);
  } finally {
    await ctx.close();
  }
});

test('tokens no se cruzan: cliente 401 en /api/productos y JWT del personal 401 en /api/tienda/carrito', async () => {
  const ctx = await startApp();
  try {
    const reg = await register(ctx);
    const customerOnStaff = await ctx.call('GET', '/api/productos', { token: reg.json.token });
    assert.equal(customerOnStaff.status, 401);
    const customerOnRedeem = await ctx.call('POST', '/api/ventas/carrito-cliente/cargar', { token: reg.json.token, body: { codigo: '123456' } });
    assert.equal(customerOnRedeem.status, 401);

    const staffOnCart = await ctx.call('GET', '/api/tienda/carrito', { token: STAFF_TOKEN });
    assert.equal(staffOnCart.status, 401);
    assert.equal(staffOnCart.json.code, 'SESSION_INVALID');
    assert.equal((await ctx.call('GET', '/api/tienda/cuenta', { token: STAFF_TOKEN })).status, 401);
    assert.equal((await ctx.call('GET', '/api/tienda/carrito')).status, 401);
    assert.equal((await ctx.call('GET', '/api/productos', { token: STAFF_TOKEN })).status, 200);
  } finally {
    await ctx.close();
  }
});

test('carrito: agregar suma, granel 422, inexistente 404, editar, quitar y limite de lineas', async () => {
  const ctx = await startApp();
  try {
    const { token } = (await register(ctx)).json;
    const empty = await ctx.call('GET', '/api/tienda/carrito', { token });
    assert.deepEqual(empty.json, { carrito: { estado: 'abierto', items: [], total: 0 } });

    let r = await ctx.call('POST', '/api/tienda/carrito/items', { token, body: { codigo: '7801000000011', cantidad: 2 } });
    assert.equal(r.status, 200);
    r = await ctx.call('POST', '/api/tienda/carrito/items', { token, body: { codigo: '7801000000011', cantidad: 3 } });
    assert.equal(r.json.carrito.items.length, 1);
    assert.equal(r.json.carrito.items[0].cantidad, 5);
    assert.equal(r.json.carrito.items[0].subtotal, 5450);
    r = await ctx.call('POST', '/api/tienda/carrito/items', { token, body: { codigo: '42' } });
    assert.equal(r.json.carrito.total, 5650, 'cantidad por defecto 1');
    assert.ok(!r.text.includes('id_producto') && !r.text.includes('costo'));

    r = await ctx.call('POST', '/api/tienda/carrito/items', { token, body: { codigo: '7801000000011', cantidad: 99 } });
    assert.equal(r.json.carrito.items[0].cantidad, 99, 'tope 99 al sumar');

    const bulk = await ctx.call('POST', '/api/tienda/carrito/items', { token, body: { codigo: '7801000000028', cantidad: 1 } });
    assert.equal(bulk.status, 422);
    assert.equal(bulk.json.code, 'BULK_NOT_ALLOWED');
    const missing = await ctx.call('POST', '/api/tienda/carrito/items', { token, body: { codigo: '555', cantidad: 1 } });
    assert.equal(missing.status, 404);
    assert.equal(missing.json.code, 'PRODUCT_NOT_FOUND');
    assert.equal((await ctx.call('POST', '/api/tienda/carrito/items', { token, body: { codigo: '42', cantidad: 100 } })).status, 400);
    assert.equal((await ctx.call('POST', '/api/tienda/carrito/items', { token, body: { codigo: '42', cantidad: 1.5 } })).status, 400);

    const itemId = r.json.carrito.items[1].item_id;
    r = await ctx.call('PUT', `/api/tienda/carrito/items/${itemId}`, { token, body: { cantidad: 4 } });
    assert.equal(r.json.carrito.items[1].cantidad, 4);
    r = await ctx.call('PUT', `/api/tienda/carrito/items/${itemId}`, { token, body: { cantidad: 0 } });
    assert.equal(r.json.carrito.items.length, 1);
    assert.equal((await ctx.call('DELETE', `/api/tienda/carrito/items/${itemId}`, { token })).status, 404);
    assert.equal((await ctx.call('PUT', `/api/tienda/carrito/items/${itemId}`, { token, body: { cantidad: 'x' } })).status, 400);

    // Otra cuenta no puede tocar las lineas de esta.
    const other = (await register(ctx, { telefono: '+56966667777', correo: 'o@o.cl' })).json.token;
    const firstId = r.json.carrito.items[0].item_id;
    assert.equal((await ctx.call('DELETE', `/api/tienda/carrito/items/${firstId}`, { token: other })).status, 404);

    const removed = await ctx.call('DELETE', `/api/tienda/carrito/items/${firstId}`, { token });
    assert.equal(removed.json.carrito.items.length, 0);
  } finally {
    await ctx.close();
  }
});

test('carrito: 422 CART_LIMIT al pasar 60 lineas', async () => {
  const ctx = await startApp();
  try {
    for (let i = 1; i <= 61; i += 1) {
      ctx.repo.addProduct({ codigo_barras: `X${i}`, descripcion: `P${i}`, precio_venta: 10, cantidad_actual: 0, utiliza_inventario: 0, formato_venta: 'Unidad' });
    }
    const { token } = (await register(ctx)).json;
    for (let i = 1; i <= 60; i += 1) {
      assert.equal((await ctx.call('POST', '/api/tienda/carrito/items', { token, body: { codigo: `X${i}`, cantidad: 1 } })).status, 200);
    }
    const over = await ctx.call('POST', '/api/tienda/carrito/items', { token, body: { codigo: 'X61', cantidad: 1 } });
    assert.equal(over.status, 422);
    assert.equal(over.json.code, 'CART_LIMIT');
  } finally {
    await ctx.close();
  }
});

test('carrito: 429 por sesion antes de consultar la base', async () => {
  const ctx = await startApp({ limits: { sesionCuenta: 3 } });
  try {
    const { token } = (await register(ctx)).json;
    for (let i = 0; i < 3; i += 1) assert.equal((await ctx.call('GET', '/api/tienda/carrito', { token })).status, 200);
    let lookups = 0;
    const original = ctx.repo.findSession;
    ctx.repo.findSession = async (h) => { lookups += 1; return original(h); };
    assert.equal((await ctx.call('GET', '/api/tienda/carrito', { token })).status, 429);
    assert.equal(lookups, 0);
  } finally {
    await ctx.close();
  }
});

test('finalizar (idempotente), carrito bloqueado, reabrir y codigo nuevo', async () => {
  const ctx = await startApp();
  try {
    const { token } = (await register(ctx)).json;
    const emptyFinal = await ctx.call('POST', '/api/tienda/carrito/finalizar', { token });
    assert.equal(emptyFinal.status, 422);
    assert.equal(emptyFinal.json.code, 'CART_EMPTY');

    await ctx.call('POST', '/api/tienda/carrito/items', { token, body: { codigo: '42', cantidad: 2 } });
    const sent = await ctx.call('POST', '/api/tienda/carrito/finalizar', { token });
    assert.equal(sent.status, 200);
    assert.equal(sent.json.carrito.estado, 'enviado');
    assert.match(sent.json.carrito.codigo, /^\d{6}$/);
    assert.equal(Date.parse(sent.json.carrito.codigo_expira) - Date.parse('2026-11-18T12:00:00Z'), 2 * 3600000);

    const again = await ctx.call('POST', '/api/tienda/carrito/finalizar', { token });
    assert.equal(again.json.carrito.codigo, sent.json.carrito.codigo, 'mismo codigo si sigue vigente');

    const locked = await ctx.call('POST', '/api/tienda/carrito/items', { token, body: { codigo: '42', cantidad: 1 } });
    assert.equal(locked.status, 409);
    assert.equal(locked.json.code, 'CART_LOCKED');

    const reopened = await ctx.call('POST', '/api/tienda/carrito/reabrir', { token });
    assert.equal(reopened.json.carrito.estado, 'abierto');
    assert.equal(reopened.json.carrito.codigo, undefined);
    assert.equal(reopened.json.carrito.items.length, 1, 'conserva los productos');
    const redeemOld = await ctx.call('POST', '/api/ventas/carrito-cliente/cargar', { token: STAFF_TOKEN, body: { codigo: sent.json.carrito.codigo } });
    assert.equal(redeemOld.status, 404, 'el codigo anulado ya no sirve');
  } finally {
    await ctx.close();
  }
});

test('canje en caja: 200 la primera vez, 409 la segunda, 410 vencido y 404 inexistente', async () => {
  const ctx = await startApp({ limits: { canjeUsuario: 50 } });
  try {
    const { token } = (await register(ctx, { nombre: 'Ana' })).json;
    await ctx.call('POST', '/api/tienda/carrito/items', { token, body: { codigo: '7801000000011', cantidad: 3 } });
    await ctx.call('POST', '/api/tienda/carrito/items', { token, body: { codigo: '42', cantidad: 1 } });
    const code = (await ctx.call('POST', '/api/tienda/carrito/finalizar', { token })).json.carrito.codigo;
    // El producto 42 pasa a granel y otro se borra despues de finalizar: van a faltantes.
    ctx.repo.state.products.find((p) => p.codigo_barras === '0042').formato_venta = 'kg';

    const [first, second] = await Promise.all([
      ctx.call('POST', '/api/ventas/carrito-cliente/cargar', { token: STAFF_TOKEN, body: { codigo: code } }),
      ctx.call('POST', '/api/ventas/carrito-cliente/cargar', { token: STAFF_TOKEN_2, body: { codigo: code } }),
    ]);
    const statuses = [first.status, second.status].sort();
    assert.deepEqual(statuses, [200, 409]);
    const ok = first.status === 200 ? first : second;
    assert.deepEqual(ok.json.cliente, { nombre: 'Ana', telefono: '+56911112222' });
    assert.equal(ok.json.items.length, 1);
    assert.equal(ok.json.items[0].cantidad, 3);
    assert.equal(ok.json.items[0].product.codigo_barras, '7801000000011');
    assert.equal(ok.json.items[0].product.formato_venta, 'Unidad');
    assert.ok('costo' in ok.json.items[0].product, 'la caja recibe las mismas columnas que /api/productos/code');
    assert.deepEqual(ok.json.faltantes, [{ nombre: 'Chicle', motivo: 'Producto a granel: agregalo en caja.' }]);
    const used = first.status === 409 ? first : second;
    assert.equal(used.json.code, 'CODE_USED');

    // Despues del retiro, el cliente parte con un carrito nuevo.
    const fresh = await ctx.call('GET', '/api/tienda/carrito', { token });
    assert.deepEqual(fresh.json.carrito, { estado: 'abierto', items: [], total: 0 });

    // Vencido: 410.
    await ctx.call('POST', '/api/tienda/carrito/items', { token, body: { codigo: '7801000000011', cantidad: 1 } });
    const code2 = (await ctx.call('POST', '/api/tienda/carrito/finalizar', { token })).json.carrito.codigo;
    ctx.advance(2 * 3600000 + 1000);
    const expired = await ctx.call('POST', '/api/ventas/carrito-cliente/cargar', { token: STAFF_TOKEN, body: { codigo: code2 } });
    assert.equal(expired.status, 410);
    assert.equal(expired.json.code, 'CODE_EXPIRED');
    // Vencido: finalizar de nuevo genera otro codigo que si sirve.
    const renewed = await ctx.call('POST', '/api/tienda/carrito/finalizar', { token });
    assert.notEqual(Date.parse(renewed.json.carrito.codigo_expira), NaN);
    const redeemRenewed = await ctx.call('POST', '/api/ventas/carrito-cliente/cargar', { token: STAFF_TOKEN, body: { codigo: renewed.json.carrito.codigo } });
    assert.equal(redeemRenewed.status, 200);

    assert.equal((await ctx.call('POST', '/api/ventas/carrito-cliente/cargar', { token: STAFF_TOKEN, body: { codigo: '000000' } })).status, 404);
    assert.equal((await ctx.call('POST', '/api/ventas/carrito-cliente/cargar', { token: STAFF_TOKEN, body: { codigo: 'abc' } })).status, 400);
    assert.equal((await ctx.call('POST', '/api/ventas/carrito-cliente/cargar', { body: { codigo: '000000' } })).status, 401);
  } finally {
    await ctx.close();
  }
});

test('canje: producto eliminado aparece en faltantes', async () => {
  const ctx = await startApp();
  try {
    const { token } = (await register(ctx)).json;
    await ctx.call('POST', '/api/tienda/carrito/items', { token, body: { codigo: '7801000000011', cantidad: 1 } });
    await ctx.call('POST', '/api/tienda/carrito/items', { token, body: { codigo: '42', cantidad: 1 } });
    const code = (await ctx.call('POST', '/api/tienda/carrito/finalizar', { token })).json.carrito.codigo;
    ctx.repo.state.products = ctx.repo.state.products.filter((p) => p.codigo_barras !== '0042');
    const r = await ctx.call('POST', '/api/ventas/carrito-cliente/cargar', { token: STAFF_TOKEN, body: { codigo: code } });
    assert.equal(r.status, 200);
    assert.equal(r.json.items.length, 1);
    assert.deepEqual(r.json.faltantes, [{ nombre: 'Producto eliminado', motivo: 'El producto ya no existe en el sistema.' }]);
  } finally {
    await ctx.close();
  }
});

test('canje: 429 por usuario del personal', async () => {
  const ctx = await startApp({ limits: { canjeUsuario: 2 } });
  try {
    for (let i = 0; i < 2; i += 1) {
      assert.equal((await ctx.call('POST', '/api/ventas/carrito-cliente/cargar', { token: STAFF_TOKEN, body: { codigo: '111111' } })).status, 404);
    }
    const blocked = await ctx.call('POST', '/api/ventas/carrito-cliente/cargar', { token: STAFF_TOKEN, body: { codigo: '111111' } });
    assert.equal(blocked.status, 429);
  } finally {
    await ctx.close();
  }
});

test('QR: svg con qrcode, 400 con URL invalida, 503 sin el modulo y exige personal', async () => {
  const withQr = await startApp();
  const withoutQr = await startApp({ loadQrModule: () => null });
  try {
    const url = encodeURIComponent('https://minimarket.example.cl/consulta/');
    const svg = await withQr.call('GET', `/api/consulta-qr.svg?url=${url}`, { token: STAFF_TOKEN });
    assert.equal(svg.status, 200);
    assert.match(svg.headers.get('content-type'), /^image\/svg\+xml/);
    assert.match(svg.text, /^<svg/);

    const bad = await withQr.call('GET', `/api/consulta-qr.svg?url=${encodeURIComponent('http://evil.example/consulta/')}`, { token: STAFF_TOKEN });
    assert.equal(bad.status, 400);
    assert.equal(bad.json.code, 'INVALID_URL');
    assert.equal((await withQr.call('GET', `/api/consulta-qr.svg?url=${url}`)).status, 401);

    const missing = await withoutQr.call('GET', `/api/consulta-qr.svg?url=${url}`, { token: STAFF_TOKEN });
    assert.equal(missing.status, 503);
    assert.equal(missing.json.code, 'QR_UNAVAILABLE');
  } finally {
    await withQr.close();
    await withoutQr.close();
  }
});

test('canje: el mismo usuario puede repetirlo 10 minutos (reintento); otro usuario 409; >24 h 404', async () => {
  const ctx = await startApp({ limits: { canjeUsuario: 50 } });
  try {
    const { token } = (await register(ctx)).json;
    await ctx.call('POST', '/api/tienda/carrito/items', { token, body: { codigo: '7801000000011', cantidad: 2 } });
    const code = (await ctx.call('POST', '/api/tienda/carrito/finalizar', { token })).json.carrito.codigo;

    const first = await ctx.call('POST', '/api/ventas/carrito-cliente/cargar', { token: STAFF_TOKEN, body: { codigo: code } });
    assert.equal(first.status, 200);
    const retry = await ctx.call('POST', '/api/ventas/carrito-cliente/cargar', { token: STAFF_TOKEN, body: { codigo: code } });
    assert.equal(retry.status, 200, 'reintento del mismo usuario');
    assert.deepEqual(retry.json, first.json, 'recibe los mismos items');
    const other = await ctx.call('POST', '/api/ventas/carrito-cliente/cargar', { token: STAFF_TOKEN_2, body: { codigo: code } });
    assert.equal(other.status, 409);

    ctx.advance(10 * 60000 + 1000);
    const late = await ctx.call('POST', '/api/ventas/carrito-cliente/cargar', { token: STAFF_TOKEN, body: { codigo: code } });
    assert.equal(late.status, 409, 'pasados 10 minutos ya no se repite');

    ctx.advance(24 * 3600000);
    const old = await ctx.call('POST', '/api/ventas/carrito-cliente/cargar', { token: STAFF_TOKEN_2, body: { codigo: code } });
    assert.equal(old.status, 404, 'un retiro de hace mas de 24 h no se informa como usado');
  } finally {
    await ctx.close();
  }
});

test('clave: 429 al sexto cambio en una hora por token, antes de bcrypt', async () => {
  const ctx = await startApp();
  try {
    const { token } = (await register(ctx)).json;
    for (let i = 0; i < 5; i += 1) {
      assert.equal((await ctx.call('POST', '/api/tienda/cuenta/clave', { token, body: { clave_nueva: `nueva-${i}-clave` } })).status, 204);
    }
    let hashes = 0;
    const original = bcrypt.hash;
    bcrypt.hash = (...args) => { hashes += 1; return original(...args); };
    try {
      const blocked = await ctx.call('POST', '/api/tienda/cuenta/clave', { token, body: { clave_nueva: 'otra-clave' } });
      assert.equal(blocked.status, 429);
      assert.equal(hashes, 0);
    } finally {
      bcrypt.hash = original;
    }
  } finally {
    await ctx.close();
  }
});

test('clave: 429 por IP aunque cambie el token', async () => {
  const ctx = await startApp({ limits: { claveIp: 2 } });
  try {
    const a = (await register(ctx)).json.token;
    const b = (await register(ctx, { telefono: '+56966667777', correo: 'b@b.cl' })).json.token;
    assert.equal((await ctx.call('POST', '/api/tienda/cuenta/clave', { token: a, ip: '10.9.9.9', body: { clave_nueva: 'clave-uno' } })).status, 204);
    assert.equal((await ctx.call('POST', '/api/tienda/cuenta/clave', { token: b, ip: '10.9.9.9', body: { clave_nueva: 'clave-dos' } })).status, 204);
    assert.equal((await ctx.call('POST', '/api/tienda/cuenta/clave', { token: b, ip: '10.9.9.9', body: { clave_nueva: 'clave-tres' } })).status, 429);
  } finally {
    await ctx.close();
  }
});

test('login con telefono inexistente tambien compara con bcrypt (mismo tiempo)', async () => {
  const ctx = await startApp();
  let compares = 0;
  const original = bcrypt.compare;
  bcrypt.compare = (...args) => { compares += 1; return original(...args); };
  try {
    const r = await ctx.call('POST', '/api/tienda/cuenta/login', { body: { telefono: '999999999', clave: 'clave123' } });
    assert.equal(r.status, 401);
    assert.equal(compares, 1);
  } finally {
    bcrypt.compare = original;
    await ctx.close();
  }
});

test('logout: 429 por IP antes de tocar la base', async () => {
  const ctx = await startApp({ limits: { sesionIp: 2 } });
  try {
    let revokes = 0;
    const original = ctx.repo.revokeSession;
    ctx.repo.revokeSession = async (h) => { revokes += 1; return original(h); };
    const fake = 'A'.repeat(43);
    assert.equal((await ctx.call('POST', '/api/tienda/cuenta/logout', { token: fake, ip: '10.3.3.3' })).status, 204);
    assert.equal((await ctx.call('POST', '/api/tienda/cuenta/logout', { token: fake, ip: '10.3.3.3' })).status, 204);
    assert.equal((await ctx.call('POST', '/api/tienda/cuenta/logout', { token: fake, ip: '10.3.3.3' })).status, 429);
    assert.equal(revokes, 2);
  } finally {
    await ctx.close();
  }
});

test('QR: 401 si el JWT no trae sub', async () => {
  const ctx = await startApp();
  try {
    const url = encodeURIComponent('https://minimarket.example.cl/consulta/');
    const r = await ctx.call('GET', `/api/consulta-qr.svg?url=${url}`, { token: NO_SUB_TOKEN });
    assert.equal(r.status, 401);
  } finally {
    await ctx.close();
  }
});

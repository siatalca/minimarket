// SQL de server/tienda_repo.js con una conexion falsa que registra las consultas (sin MariaDB).
// Revisa lo que no depende del motor: tablas idempotentes, columnas explicitas en lo publico,
// canje condicional y mapeo de duplicados.

const test = require('node:test');
const assert = require('node:assert/strict');

const { createTiendaRepo, mapAccountDuplicate, TiendaConflictError } = require('../server/tienda_repo.js');

function fakeDb(responder = () => [[]]) {
  const queries = [];
  const db = {
    queries,
    async query(sql, params = []) {
      queries.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      return responder(sql, params, queries.length);
    },
  };
  return db;
}

test('ensureTables solo usa CREATE TABLE IF NOT EXISTS de tablas tienda_*', async () => {
  const db = fakeDb();
  await createTiendaRepo(db).ensureTables();
  assert.equal(db.queries.length, 4);
  for (const q of db.queries) {
    assert.match(q.sql, /^CREATE TABLE IF NOT EXISTS tienda_(cuentas|sesiones|carritos|carrito_items) \(/);
    assert.doesNotMatch(q.sql, /\b(DROP|ALTER|TRUNCATE)\b|DELETE FROM/i);
    assert.doesNotMatch(q.sql, /REFERENCES productos/i, 'sin llave foranea a productos');
  }
});

test('consulta publica de producto: columnas explicitas, sin p.* ni datos internos', async () => {
  const db = fakeDb(() => [[{ id_producto: 1 }]]);
  await createTiendaRepo(db).findProductByCode('780');
  const { sql, params } = db.queries[0];
  assert.doesNotMatch(sql, /p\.\*/);
  assert.doesNotMatch(sql, /costo|ganancia|supplier|departamento|cantidad_maxima/);
  assert.deepEqual(params, ['780', '780', '780']);
});

test('getCart de cliente tampoco lee columnas internas', async () => {
  const db = fakeDb((sql) => (sql.includes('FROM tienda_carritos') ? [[{ id: 3, estado: 'abierto' }]] : [[]]));
  await createTiendaRepo(db).getCart(1);
  const itemsSql = db.queries[1].sql;
  assert.doesNotMatch(itemsSql, /p\.\*|costo|ganancia|supplier|id_departamento/);
});

test('canje: el UPDATE condicional exige enviado y vigente; affectedRows decide', async () => {
  const db = fakeDb((sql) => {
    if (sql.startsWith('SELECT id, cuenta_id')) return [[{ id: 8, cuenta_id: 2 }]];
    if (sql.trim().startsWith('UPDATE')) return [{ affectedRows: 1 }];
    return [[]];
  });
  const result = await createTiendaRepo(db).redeemCartCode('123456', 5);
  assert.deepEqual(result, { ok: true, cartId: 8, cuentaId: 2 });
  const update = db.queries[1].sql;
  assert.match(update, /WHERE id = \? AND codigo = \? AND estado = 'enviado' AND codigo_expira > NOW\(\)/);
  assert.match(update, /codigo_usado = codigo, codigo = NULL/);
  assert.deepEqual(db.queries[1].params, [5, 8, '123456']);
});

test('canje perdido en carrera: devuelve el estado para clasificar (409)', async () => {
  const db = fakeDb((sql) => {
    if (sql.startsWith('SELECT id, cuenta_id FROM tienda_carritos WHERE codigo = ?')) return [[{ id: 8, cuenta_id: 2 }]];
    if (sql.trim().startsWith('UPDATE')) return [{ affectedRows: 0 }];
    if (sql.includes('AS reciente')) return [[{ reciente: 1 }]];
    return [[]];
  });
  const result = await createTiendaRepo(db).redeemCartCode('123456', 5);
  assert.deepEqual(result, { ok: false, pending: null, used: { reciente: 1 } });
  const usedSql = db.queries.find((q) => q.sql.includes('AS reciente')).sql;
  assert.match(usedSql, /retirado_at > NOW\(\) - INTERVAL 24 HOUR/);
});

function withConnection(db) {
  db.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    query: db.query,
  });
  return db;
}

test('reabrir solo actualiza si sigue enviado (no reabre un carrito retirado en paralelo)', async () => {
  const db = withConnection(fakeDb((sql) => {
    if (sql.includes('FROM tienda_carritos') && sql.includes("estado IN ('abierto','enviado')")) {
      return [[{ id: 4, estado: 'enviado', codigo: '123456', vigente: 1 }]];
    }
    if (sql.trim().startsWith('UPDATE')) return [{ affectedRows: 0 }];
    return [[]];
  }));
  assert.deepEqual(await createTiendaRepo(db).reopenCart(1), { ok: true });
  const update = db.queries.find((q) => q.sql.startsWith('UPDATE tienda_carritos'));
  assert.match(update.sql, /WHERE id = \? AND estado = 'enviado'$/);
});

test('finalizar no pisa un carrito retirado: UPDATE exige abierto o enviado', async () => {
  const db = withConnection(fakeDb((sql) => {
    if (sql.includes('codigo_expira > NOW()) AS vigente')) return [[{ id: 4, estado: 'abierto', codigo: null, vigente: null }]];
    if (sql.includes('FROM tienda_carrito_items i')) return [[{ cantidad: 2, utiliza_inventario: 0, cantidad_actual: 0 }]];
    if (sql.trim().startsWith('UPDATE')) return [{ affectedRows: 0 }];
    return [[]];
  }));
  assert.deepEqual(await createTiendaRepo(db).finalizeCart(1, () => '000001'), { ok: true });
  const update = db.queries.find((q) => q.sql.startsWith('UPDATE tienda_carritos'));
  assert.match(update.sql, /WHERE id = \? AND estado IN \('abierto','enviado'\)$/);
});

// ---- M-038: stock leido de la base dentro del bloqueo de la cuenta ----

function cartDb({ cart = { id: 4, estado: 'abierto', codigo: null, vigente: null }, stock, existing = null, items = [] } = {}) {
  return withConnection(fakeDb((sql) => {
    if (sql.includes('FOR UPDATE')) return [[{ id: 1 }]];
    if (sql.includes('codigo_expira > NOW()) AS vigente')) return [cart ? [cart] : []];
    if (sql.startsWith('SELECT utiliza_inventario, cantidad_actual FROM productos')) return [stock ? [stock] : []];
    if (sql.includes('FROM tienda_carrito_items WHERE carrito_id = ? AND producto_id = ?')) return [existing ? [existing] : []];
    if (sql.includes('FROM tienda_carrito_items WHERE id = ?')) return [[{ id: 9, producto_id: 3 }]];
    if (sql.includes('FROM tienda_carrito_items i')) return [items];
    if (sql.includes('COUNT(*)')) return [[{ total: 0 }]];
    if (sql.trim().startsWith('INSERT') || sql.trim().startsWith('UPDATE')) return [{ insertId: 7, affectedRows: 1 }];
    return [[]];
  }));
}

test('M-038 agregar: lee el stock despues del bloqueo, sin bloquear productos, y guarda la cantidad limitada', async () => {
  const db = cartDb({ stock: { utiliza_inventario: 1, cantidad_actual: '3.000' }, existing: { id: 11, cantidad: 2 } });
  const result = await createTiendaRepo(db).addCartItem(1, 3, 5, { maxLines: 60, maxQty: 99 });
  assert.deepEqual(result, { ok: true, limited: true, disponible: 3 });
  const lockIndex = db.queries.findIndex((q) => q.sql.includes('FROM tienda_cuentas WHERE id = ? FOR UPDATE'));
  const stockIndex = db.queries.findIndex((q) => q.sql.startsWith('SELECT utiliza_inventario, cantidad_actual FROM productos'));
  assert.ok(lockIndex >= 0 && stockIndex > lockIndex, 'stock leido dentro del bloqueo');
  assert.deepEqual(db.queries[stockIndex].params, [3]);
  assert.doesNotMatch(db.queries[stockIndex].sql, /FOR UPDATE/);
  const update = db.queries.find((q) => q.sql.startsWith('UPDATE tienda_carrito_items'));
  assert.deepEqual(update.params, [3, 11]);
});

test('M-038 agregar sin stock o con todo lo disponible: no escribe nada', async () => {
  const empty = cartDb({ cart: null, stock: { utiliza_inventario: 1, cantidad_actual: 0 } });
  assert.deepEqual(await createTiendaRepo(empty).addCartItem(1, 3, 1, { maxLines: 60, maxQty: 99 }), { error: 'OUT_OF_STOCK', disponible: 0 });
  assert.equal(empty.queries.some((q) => /^(INSERT|UPDATE)/.test(q.sql)), false, 'no crea carrito');

  const full = cartDb({ stock: { utiliza_inventario: 1, cantidad_actual: 2 }, existing: { id: 11, cantidad: 2 } });
  assert.deepEqual(await createTiendaRepo(full).addCartItem(1, 3, 1, { maxLines: 60, maxQty: 99 }), { error: 'STOCK_LIMIT', disponible: 2 });
  assert.equal(full.queries.some((q) => /^(INSERT|UPDATE)/.test(q.sql)), false);

  const gone = cartDb({ stock: null });
  assert.deepEqual(await createTiendaRepo(gone).addCartItem(1, 3, 1, { maxLines: 60, maxQty: 99 }), { error: 'PRODUCT_NOT_FOUND' });
});

test('M-038 cambiar cantidad: sin stock 422 salvo quitar; el exceso se limita', async () => {
  const out = cartDb({ stock: { utiliza_inventario: 1, cantidad_actual: 0 } });
  assert.deepEqual(await createTiendaRepo(out).setCartItemQuantity(1, 9, 1), { error: 'OUT_OF_STOCK', disponible: 0 });
  assert.equal(out.queries.some((q) => /^(UPDATE|DELETE)/.test(q.sql)), false);
  const remove = cartDb({ stock: { utiliza_inventario: 1, cantidad_actual: 0 } });
  assert.deepEqual(await createTiendaRepo(remove).setCartItemQuantity(1, 9, 0), { ok: true });
  assert.ok(remove.queries.some((q) => q.sql.startsWith('DELETE FROM tienda_carrito_items')));

  const limited = cartDb({ stock: { utiliza_inventario: 1, cantidad_actual: 4 } });
  assert.deepEqual(await createTiendaRepo(limited).setCartItemQuantity(1, 9, 10), { ok: true, limited: true, disponible: 4 });
  assert.deepEqual(limited.queries.find((q) => q.sql.startsWith('UPDATE tienda_carrito_items')).params, [4, 9, 4]);
});

test('M-038 finalizar con un item sin stock suficiente: CART_STOCK_CHANGED y no genera codigo', async () => {
  const db = cartDb({ items: [
    { cantidad: 2, utiliza_inventario: 0, cantidad_actual: 0 },
    { cantidad: 5, utiliza_inventario: 1, cantidad_actual: '3.000' },
  ] });
  assert.deepEqual(await createTiendaRepo(db).finalizeCart(1, () => '000001'), { error: 'CART_STOCK_CHANGED' });
  assert.equal(db.queries.some((q) => q.sql.startsWith('UPDATE tienda_carritos')), false);
  const itemsSql = db.queries.find((q) => q.sql.includes('FROM tienda_carrito_items i')).sql;
  assert.match(itemsSql, /p\.utiliza_inventario, p\.cantidad_actual/);
});

test('canje repetido por el mismo usuario dentro de 10 minutos devuelve el mismo carrito', async () => {
  const db = fakeDb((sql) => {
    if (sql.includes('retirado_user_id = ?')) return [[{ id: 8, cuenta_id: 2 }]];
    return [[]];
  });
  const result = await createTiendaRepo(db).redeemCartCode('123456', 5);
  assert.deepEqual(result, { ok: true, replay: true, cartId: 8, cuentaId: 2 });
  const replay = db.queries.find((q) => q.sql.includes('retirado_user_id = ?'));
  assert.match(replay.sql, /retirado_at > NOW\(\) - INTERVAL 10 MINUTE/);
  assert.deepEqual(replay.params, ['123456', 5]);
});

test('duplicados de tienda_cuentas se traducen a PHONE_TAKEN / EMAIL_TAKEN / GOOGLE_TAKEN', () => {
  const dup = (key) => Object.assign(new Error(`Duplicate entry 'x' for key '${key}'`), { code: 'ER_DUP_ENTRY' });
  assert.equal(mapAccountDuplicate(dup('uq_tienda_cuentas_telefono')).code, 'PHONE_TAKEN');
  assert.equal(mapAccountDuplicate(dup('tienda_cuentas.uq_tienda_cuentas_correo')).code, 'EMAIL_TAKEN');
  assert.equal(mapAccountDuplicate(dup('uq_tienda_cuentas_google')).code, 'GOOGLE_TAKEN');
  assert.ok(mapAccountDuplicate(dup('uq_tienda_cuentas_google')) instanceof TiendaConflictError);
  const other = new Error('otro');
  assert.equal(mapAccountDuplicate(other), other);
});

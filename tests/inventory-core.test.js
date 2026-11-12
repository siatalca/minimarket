const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { applyInventoryDelta, computeCancellationRestock } = require('../server/inventory_core.js');

// Conexion falsa: un solo producto en "base de datos" que aplica los UPDATE de verdad.
function fakeConnection(product) {
  const state = { product: product ? { ...product } : null, queries: [], movements: [] };
  return {
    state,
    async query(sql, params = []) {
      state.queries.push({ sql, params });
      if (/SELECT id_producto, codigo_barras, descripcion, cantidad_actual/.test(sql)) {
        return [state.product && state.product.codigo_barras === params[0] ? [{ ...state.product }] : []];
      }
      if (/^UPDATE productos SET/.test(sql.trim())) {
        assert.match(sql, /cantidad_actual = cantidad_actual \+ \?/, 'debe sumar sobre el valor de la base');
        state.product.cantidad_actual = Number((state.product.cantidad_actual + params[0]).toFixed(3));
        return [{ affectedRows: 1 }];
      }
      if (/INSERT INTO inventory_movements/.test(sql)) {
        state.movements.push(params);
        return [{ insertId: state.movements.length }];
      }
      throw new Error(`Consulta no esperada: ${sql}`);
    },
  };
}

const producto = { id_producto: 7, codigo_barras: '780123', descripcion: 'Arroz 1kg', cantidad_actual: 10 };

test('el ingreso suma sobre la existencia real aunque la pantalla tenga un valor viejo', async () => {
  // La pantalla mostraba 10, pero mientras estaba abierta se vendieron 3 (en la base hay 7).
  const connection = fakeConnection({ ...producto, cantidad_actual: 7 });
  const result = await applyInventoryDelta({ connection, code: '780123', delta: 10, movementType: 'modificacion' });
  assert.equal(result.previousQty, 7);
  assert.equal(result.newQty, 17);
  assert.equal(connection.state.product.cantidad_actual, 17, 'las 3 vendidas no deben volver');
});

test('dos ingresos seguidos del mismo producto se acumulan', async () => {
  const connection = fakeConnection(producto);
  await applyInventoryDelta({ connection, code: '780123', delta: 10 });
  await applyInventoryDelta({ connection, code: '780123', delta: 5 });
  assert.equal(connection.state.product.cantidad_actual, 25);
  assert.equal(connection.state.movements.length, 2);
});

test('registra el movimiento con la existencia anterior y nueva reales', async () => {
  const connection = fakeConnection(producto);
  await applyInventoryDelta({ connection, code: '780123', delta: -4, movementNote: 'merma', cajaId: 2, userId: 9 });
  const [productId, codigo, , tipo, anterior, cambio, nueva, nota, caja, usuario] = connection.state.movements[0];
  assert.deepEqual([productId, codigo, tipo, anterior, cambio, nueva, nota, caja, usuario],
    [7, '780123', 'ajuste', 10, -4, 6, 'merma', 2, 9]);
});

test('rechaza un ajuste que deja el stock negativo y no modifica nada', async () => {
  const connection = fakeConnection({ ...producto, cantidad_actual: 2 });
  await assert.rejects(
    applyInventoryDelta({ connection, code: '780123', delta: -5 }),
    (err) => err.status === 409 && err.code === 'INVENTORY_NEGATIVE' && err.cantidad_actual === 2
  );
  assert.equal(connection.state.product.cantidad_actual, 2);
  assert.ok(!connection.state.queries.some((q) => /^UPDATE/.test(q.sql.trim())));
});

test('sin cambio de cantidad actualiza precios pero no registra movimiento', async () => {
  const connection = fakeConnection(producto);
  const result = await applyInventoryDelta({ connection, code: '780123', delta: 0, fields: { salePrice: 1500 } });
  assert.equal(result.movementLogged, false);
  assert.equal(connection.state.movements.length, 0);
  assert.equal(connection.state.product.cantidad_actual, 10);
});

test('producto inexistente responde 404', async () => {
  const connection = fakeConnection(producto);
  await assert.rejects(applyInventoryDelta({ connection, code: 'NOEXISTE', delta: 1 }), (err) => err.status === 404);
});

test('la anulacion devuelve solo lo que la venta desconto', () => {
  const restock = computeCancellationRestock([
    { producto_id: 1, cantidad: 2, stock_descontado: 1, utiliza_inventario: 0 },
    { producto_id: 1, cantidad: 3, stock_descontado: 1, utiliza_inventario: 0 },
    { producto_id: 2, cantidad: 4, stock_descontado: 0, utiliza_inventario: 1 },
    { producto_id: 3, cantidad: 1, stock_descontado: null, utiliza_inventario: 1 },
    { producto_id: 4, cantidad: 1, stock_descontado: null, utiliza_inventario: 0 },
    { producto_id: null, cantidad: 9, stock_descontado: null, utiliza_inventario: 0 },
  ]);
  assert.equal(restock.get(1).quantity, 5, 'desconto aunque hoy no use inventario');
  assert.equal(restock.has(2), false, 'no desconto en la venta, no se devuelve');
  assert.equal(restock.get(3).quantity, 1, 'venta antigua: usa el estado actual');
  assert.equal(restock.has(4), false);
  assert.equal(restock.size, 2, 'el producto comun no toca stock');
});

test('editar un producto ya no sobrescribe la existencia', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'server', 'server.js'), 'utf8');
  const start = source.indexOf("app.put('/api/productos/:code', async");
  const end = source.indexOf('\napp.', start + 10);
  const handler = source.slice(start, end);
  assert.ok(start > 0, 'no se encontro la ruta de edicion');
  assert.doesNotMatch(handler, /cantidad_actual\s*=/);
  assert.doesNotMatch(handler, /cantidad_minima\s*=|cantidad_maxima\s*=/);
});

test('el ajuste de inventario exige la diferencia y no acepta un total', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'server', 'server.js'), 'utf8');
  const start = source.indexOf("app.put('/api/productos/:code/inventory'");
  const handler = source.slice(start, source.indexOf("app.put('/api/productos/:code', async", start));
  assert.match(handler, /INVENTORY_DELTA_REQUIRED/);
  assert.doesNotMatch(handler, /body\.cantidad_actual/);
});

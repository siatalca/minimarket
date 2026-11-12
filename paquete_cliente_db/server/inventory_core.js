// Reglas de stock compartidas por el ajuste de inventario y la anulacion de ventas.
// Viven aparte de server.js para poder probarlas sin base de datos.

function roundQty(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Number(n.toFixed(3)) : 0;
}

// Cantidad de un ajuste: solo numeros (o texto numerico como "10", "-2.5" o "0,75").
// Rechaza texto, booleanos, vacios y valores no finitos que Number() convertiria en 0 o 1.
function parseStrictQuantity(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const raw = value.trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function inventoryError(message, status, code, extra = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  Object.assign(error, extra);
  return error;
}

// Unico lugar que escribe en inventory_movements (ajustes, ingresos y anulaciones).
async function recordInventoryMovement(connection, {
  productId, code, description, type, previousQty, delta, newQty, note = null, cajaId = null, userId = null,
}) {
  await connection.query(
    `INSERT INTO inventory_movements (
      fecha, producto_id, codigo_barras, producto_descripcion, tipo_movimiento,
      cantidad_anterior, cambio_cantidad, cantidad_nueva, especificacion, caja_id, usuario_id
    ) VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      Number(productId || 0), String(code || ''), String(description || ''), type,
      roundQty(previousQty), roundQty(delta), roundQty(newQty),
      note ? String(note).slice(0, 255) : null, cajaId || null, userId || null,
    ]
  );
}

// Suma `delta` a la existencia REAL del producto (fila bloqueada con FOR UPDATE) y registra el
// movimiento en la misma transaccion. Nunca escribe un total calculado por la pantalla.
async function applyInventoryDelta({
  connection, code, delta, fields = {}, movementType, movementNote = null, cajaId = null, userId = null,
}) {
  const [rows] = await connection.query(
    `SELECT id_producto, codigo_barras, descripcion, cantidad_actual
     FROM productos
     WHERE codigo_barras = ?
     LIMIT 1
     FOR UPDATE`,
    [code]
  );
  if (!rows.length) throw inventoryError('Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
  const product = rows[0];
  const previousQty = roundQty(product.cantidad_actual);
  const qtyDelta = roundQty(delta);
  const newQty = roundQty(previousQty + qtyDelta);
  if (newQty < 0) {
    throw inventoryError(
      `La existencia actual es ${previousQty}; el ajuste dejaria el stock en negativo.`,
      409,
      'INVENTORY_NEGATIVE',
      { cantidad_actual: previousQty }
    );
  }

  const updates = ['cantidad_actual = cantidad_actual + ?'];
  const params = [qtyDelta];
  const optional = [
    ['cantidad_minima', fields.minQty],
    ['cantidad_maxima', fields.maxQty],
    ['utiliza_inventario', fields.useInventory === null || fields.useInventory === undefined ? null : (fields.useInventory ? 1 : 0)],
    ['costo', fields.cost],
    ['precio_venta', fields.salePrice],
    ['ganancia', fields.profit],
  ];
  for (const [column, value] of optional) {
    if (value !== null && value !== undefined) {
      updates.push(`${column} = ?`);
      params.push(value);
    }
  }
  params.push(Number(product.id_producto));
  await connection.query(`UPDATE productos SET ${updates.join(', ')} WHERE id_producto = ?`, params);

  const type = movementType || (qtyDelta < 0 ? 'ajuste' : 'modificacion');
  let movementLogged = false;
  if (qtyDelta !== 0) {
    await recordInventoryMovement(connection, {
      productId: product.id_producto, code: product.codigo_barras || code, description: product.descripcion,
      type, previousQty, delta: qtyDelta, newQty, note: movementNote, cajaId, userId,
    });
    movementLogged = true;
  }
  return { product, previousQty, qtyDelta, newQty, movementType: type, movementLogged };
}

// Cuanto stock devolver por producto al anular una venta. Las lineas nuevas guardan
// stock_descontado; las antiguas (NULL) usan si el producto maneja inventario hoy.
function computeCancellationRestock(detailRows = []) {
  const restock = new Map();
  for (const item of detailRows) {
    const productId = Number(item.producto_id || 0);
    const quantity = Number(item.cantidad || 0);
    const discounted = item.stock_descontado === null || item.stock_descontado === undefined
      ? Number(item.utiliza_inventario || 0) === 1
      : Number(item.stock_descontado) === 1;
    if (productId > 0 && discounted && Number.isFinite(quantity) && quantity > 0) {
      const current = restock.get(productId);
      restock.set(productId, {
        quantity: roundQty(Number(current?.quantity || 0) + quantity),
        code: item.producto_codigo,
        name: item.producto_nombre,
      });
    }
  }
  return restock;
}

// Evita aplicar dos veces el mismo ajuste: la pantalla manda un identificador por formulario y,
// si el mismo llega de nuevo (doble clic, Enter + clic, reintento), se devuelve el resultado del
// primero sin volver a sumar. Solo se recuerdan los exitos: si el primero falla, se puede corregir
// y reenviar con el mismo identificador. Vive en memoria del proceso.
function createIdempotencyCache({ ttlMs = 15 * 60 * 1000, maxKeys = 5000, now = () => Date.now() } = {}) {
  const entries = new Map();

  function prune(t) {
    // Map conserva el orden de insercion, que es tambien el orden por antiguedad.
    for (const [key, entry] of entries) {
      if (t - entry.at < ttlMs) break;
      entries.delete(key);
    }
    while (entries.size >= maxKeys) entries.delete(entries.keys().next().value);
  }

  return {
    async run(key, fn) {
      const t = now();
      prune(t);
      const existing = entries.get(key);
      if (existing) return { value: await existing.promise, duplicate: true };
      const promise = Promise.resolve().then(fn);
      entries.set(key, { promise, at: t });
      try {
        return { value: await promise, duplicate: false };
      } catch (err) {
        entries.delete(key);
        throw err;
      }
    },
  };
}

// Identificador de formulario valido (el navegador usa crypto.randomUUID o similar).
function normalizeRequestId(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  return /^[A-Za-z0-9-]{8,64}$/.test(raw) ? raw : null;
}

module.exports = {
  applyInventoryDelta,
  computeCancellationRestock,
  recordInventoryMovement,
  parseStrictQuantity,
  roundQty,
  createIdempotencyCache,
  normalizeRequestId,
};

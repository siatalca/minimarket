// Acceso a la base de la consulta de precios y del carrito del cliente (M-037).
// Todo el SQL de las tablas tienda_* vive aqui. Las consultas publicas usan columnas explicitas.
// Las fechas de vencimiento se calculan con NOW() de la base, igual que las comparaciones.

const { availableForCart, cartItemStockProblem, resolveCartLineQuantity } = require('./tienda_core');

// Columnas del producto que puede ver el cliente (ver toPublicProduct en tienda_core.js).
// id_producto se lee solo para uso interno (guardar la linea del carrito); nunca se responde.
const PUBLIC_PRODUCT_SELECT = `p.id_producto, p.codigo_barras, p.descripcion, p.precio_venta,
              p.cantidad_actual, p.utiliza_inventario, p.cantidad_minima,
              fv.descripcion AS formato_venta`;

const ACCOUNT_SELECT = 'id, nombre, telefono, correo, google_sub, clave_hash, activo';

class TiendaConflictError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// ER_DUP_ENTRY de tienda_cuentas: indica que dato ya esta usado.
function mapAccountDuplicate(err) {
  if (err?.code !== 'ER_DUP_ENTRY') return err;
  const text = String(err.sqlMessage || err.message || '');
  if (text.includes('uq_tienda_cuentas_telefono')) return new TiendaConflictError('PHONE_TAKEN', 'Ese telefono ya tiene una cuenta.');
  if (text.includes('uq_tienda_cuentas_correo')) return new TiendaConflictError('EMAIL_TAKEN', 'Ese correo ya tiene una cuenta.');
  if (text.includes('uq_tienda_cuentas_google')) return new TiendaConflictError('GOOGLE_TAKEN', 'Esa cuenta de Google ya esta vinculada a otra cuenta.');
  return err;
}

function createTiendaRepo(db) {
  async function ensureTables() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tienda_cuentas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        telefono VARCHAR(16) NOT NULL,
        nombre VARCHAR(60) NOT NULL,
        correo VARCHAR(120) NOT NULL,
        google_sub VARCHAR(64) NULL,
        clave_hash VARCHAR(100) NOT NULL,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_login_at DATETIME NULL,
        UNIQUE KEY uq_tienda_cuentas_telefono (telefono),
        UNIQUE KEY uq_tienda_cuentas_correo (correo),
        UNIQUE KEY uq_tienda_cuentas_google (google_sub)
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS tienda_sesiones (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        cuenta_id INT NOT NULL,
        token_hash CHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        revoked_at DATETIME NULL,
        last_used_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_tienda_sesiones_token (token_hash),
        INDEX idx_tienda_sesiones_cuenta (cuenta_id),
        CONSTRAINT fk_tienda_sesiones_cuenta FOREIGN KEY (cuenta_id) REFERENCES tienda_cuentas(id) ON DELETE CASCADE
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS tienda_carritos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cuenta_id INT NOT NULL,
        estado ENUM('abierto','enviado','retirado') NOT NULL DEFAULT 'abierto',
        codigo VARCHAR(8) NULL,
        codigo_expira DATETIME NULL,
        codigo_usado VARCHAR(8) NULL,
        retirado_at DATETIME NULL,
        retirado_caja_id INT NULL,
        retirado_user_id INT NULL,
        venta_id INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_tienda_carritos_codigo (codigo),
        INDEX idx_tienda_carritos_cuenta_estado (cuenta_id, estado),
        INDEX idx_tienda_carritos_codigo_usado (codigo_usado),
        CONSTRAINT fk_tienda_carritos_cuenta FOREIGN KEY (cuenta_id) REFERENCES tienda_cuentas(id) ON DELETE CASCADE
      )
    `);
    // Sin llave foranea a productos: borrar un producto no debe quedar bloqueado por carritos de clientes.
    await db.query(`
      CREATE TABLE IF NOT EXISTS tienda_carrito_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        carrito_id INT NOT NULL,
        producto_id INT NOT NULL,
        cantidad INT NOT NULL,
        UNIQUE KEY uq_tienda_items_carrito_producto (carrito_id, producto_id),
        CONSTRAINT fk_tienda_items_carrito FOREIGN KEY (carrito_id) REFERENCES tienda_carritos(id) ON DELETE CASCADE
      )
    `);
    // Columnas agregadas despues de crear la tabla (M-039). CREATE TABLE IF NOT EXISTS no las agrega
    // a una tabla que ya existe: se revisa information_schema y se agregan sin tocar los datos.
    const [cartColumnRows] = await db.query(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tienda_carritos'`
    );
    const cartColumns = new Set(cartColumnRows.map((row) => row.COLUMN_NAME));
    if (!cartColumns.has('venta_id')) {
      await db.query('ALTER TABLE tienda_carritos ADD COLUMN venta_id INT NULL AFTER retirado_user_id');
    }
  }

  async function getBusinessName() {
    const [rows] = await db.query('SELECT nombre FROM info ORDER BY (id_info = 1) DESC, id_info ASC LIMIT 1');
    return String(rows[0]?.nombre || '').trim();
  }

  // Misma regla de coincidencia que /api/productos/code/:code (texto exacto o mismo numero).
  async function findProductByCode(code) {
    const [rows] = await db.query(
      `SELECT ${PUBLIC_PRODUCT_SELECT}
       FROM productos p
       LEFT JOIN formato_venta fv ON fv.id_formato = p.id_formato
       WHERE TRIM(p.codigo_barras) = ?
          OR (
            ? REGEXP '^[0-9]+$'
            AND TRIM(p.codigo_barras) REGEXP '^[0-9]+$'
            AND CAST(TRIM(p.codigo_barras) AS UNSIGNED) = CAST(? AS UNSIGNED)
          )
       ORDER BY p.id_producto ASC
       LIMIT 1`,
      [code, code, code]
    );
    return rows[0] || null;
  }

  // ---- Cuentas y sesiones ----

  async function findAccountByPhone(telefono) {
    const [rows] = await db.query(`SELECT ${ACCOUNT_SELECT} FROM tienda_cuentas WHERE telefono = ? LIMIT 1`, [telefono]);
    return rows[0] || null;
  }

  async function findAccountByGoogleSub(sub) {
    const [rows] = await db.query(`SELECT ${ACCOUNT_SELECT} FROM tienda_cuentas WHERE google_sub = ? LIMIT 1`, [sub]);
    return rows[0] || null;
  }

  async function getAccount(cuentaId) {
    const [rows] = await db.query(`SELECT ${ACCOUNT_SELECT} FROM tienda_cuentas WHERE id = ? LIMIT 1`, [cuentaId]);
    return rows[0] || null;
  }

  async function createAccount({ telefono, nombre, correo, claveHash, googleSub = null }) {
    try {
      const [result] = await db.query(
        `INSERT INTO tienda_cuentas (telefono, nombre, correo, google_sub, clave_hash)
         VALUES (?, ?, ?, ?, ?)`,
        [telefono, nombre, correo, googleSub, claveHash]
      );
      return result.insertId;
    } catch (err) {
      throw mapAccountDuplicate(err);
    }
  }

  async function createSession(cuentaId, tokenHash) {
    await db.query(
      `INSERT INTO tienda_sesiones (cuenta_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 60 DAY))`,
      [cuentaId, tokenHash]
    );
    await db.query('UPDATE tienda_cuentas SET last_login_at = NOW() WHERE id = ?', [cuentaId]);
  }

  async function findSession(tokenHash) {
    const [rows] = await db.query(
      `SELECT s.id AS session_id, c.id AS cuenta_id, c.nombre, c.telefono, c.correo,
              (c.google_sub IS NOT NULL) AS google_vinculado
       FROM tienda_sesiones s
       INNER JOIN tienda_cuentas c ON c.id = s.cuenta_id
       WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > NOW() AND c.activo = 1
       LIMIT 1`,
      [tokenHash]
    );
    const session = rows[0] || null;
    if (session) {
      await db.query(
        `UPDATE tienda_sesiones SET last_used_at = NOW()
         WHERE id = ? AND (last_used_at IS NULL OR last_used_at < NOW() - INTERVAL 5 MINUTE)`,
        [session.session_id]
      );
    }
    return session;
  }

  async function revokeSession(tokenHash) {
    await db.query('UPDATE tienda_sesiones SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL', [tokenHash]);
  }

  // Cambio de clave: las demas sesiones de la cuenta quedan cerradas (recuperacion con Google).
  async function updatePassword(cuentaId, claveHash, keepSessionId) {
    await db.query('UPDATE tienda_cuentas SET clave_hash = ? WHERE id = ?', [claveHash, cuentaId]);
    await db.query(
      'UPDATE tienda_sesiones SET revoked_at = NOW() WHERE cuenta_id = ? AND id <> ? AND revoked_at IS NULL',
      [cuentaId, keepSessionId]
    );
  }

  async function linkGoogle(cuentaId, googleSub, correo) {
    try {
      await db.query('UPDATE tienda_cuentas SET google_sub = ?, correo = ? WHERE id = ?', [googleSub, correo, cuentaId]);
    } catch (err) {
      throw mapAccountDuplicate(err);
    }
  }

  // ---- Carrito ----

  // Serializa los cambios del carrito de una cuenta (evita dos carritos abiertos a la vez).
  async function withAccountLock(cuentaId, fn) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query('SELECT id FROM tienda_cuentas WHERE id = ? FOR UPDATE', [cuentaId]);
      const result = await fn(connection);
      await connection.commit();
      return result;
    } catch (err) {
      try { await connection.rollback(); } catch (_) {}
      throw err;
    } finally {
      connection.release();
    }
  }

  async function currentCart(executor, cuentaId) {
    const [rows] = await executor.query(
      `SELECT id, estado, codigo, codigo_expira, (codigo_expira > NOW()) AS vigente
       FROM tienda_carritos
       WHERE cuenta_id = ? AND estado IN ('abierto','enviado')
       ORDER BY id DESC
       LIMIT 1`,
      [cuentaId]
    );
    return rows[0] || null;
  }

  async function getCart(cuentaId) {
    const cart = await currentCart(db, cuentaId);
    if (!cart) return { cart: null, items: [] };
    const [items] = await db.query(
      `SELECT i.id AS item_id, i.cantidad,
              p.codigo_barras, p.descripcion, p.precio_venta,
              p.cantidad_actual, p.utiliza_inventario, p.cantidad_minima,
              fv.descripcion AS formato_venta
       FROM tienda_carrito_items i
       INNER JOIN productos p ON p.id_producto = i.producto_id
       LEFT JOIN formato_venta fv ON fv.id_formato = p.id_formato
       WHERE i.carrito_id = ?
       ORDER BY i.id ASC`,
      [cart.id]
    );
    return { cart, items };
  }

  // Stock actual del producto, leido de la base en cada operacion del carrito (M-038).
  // Sin FOR UPDATE: el carrito no reserva stock, asi que no se bloquea el producto a la caja.
  async function productStock(executor, productoId) {
    const [rows] = await executor.query(
      'SELECT utiliza_inventario, cantidad_actual FROM productos WHERE id_producto = ? LIMIT 1',
      [productoId]
    );
    return rows[0] || null;
  }

  // Suma la cantidad si el producto ya esta (tope maxQty y stock disponible, M-038). El stock se lee
  // dentro del bloqueo de la cuenta: dos agregados seguidos del mismo cliente se ven uno al otro.
  // Devuelve { ok, limited?, disponible? }. Errores: CART_LOCKED, CART_LIMIT, PRODUCT_NOT_FOUND,
  // OUT_OF_STOCK y STOCK_LIMIT (con disponible). Un error de stock no crea carrito ni cambia nada.
  async function addCartItem(cuentaId, productoId, cantidad, { maxLines, maxQty }) {
    return withAccountLock(cuentaId, async (conn) => {
      let cart = await currentCart(conn, cuentaId);
      if (cart && cart.estado === 'enviado') return { error: 'CART_LOCKED' };
      const product = await productStock(conn, productoId);
      if (!product) return { error: 'PRODUCT_NOT_FOUND' };
      let existing = null;
      if (cart) {
        const [rows] = await conn.query(
          'SELECT id, cantidad FROM tienda_carrito_items WHERE carrito_id = ? AND producto_id = ? LIMIT 1',
          [cart.id, productoId]
        );
        existing = rows[0] || null;
      }
      const decision = resolveCartLineQuantity({
        existing: existing ? Number(existing.cantidad) : 0,
        requested: cantidad,
        disponible: availableForCart(product),
        maxQty,
      });
      if (decision.error) return decision;
      const result = decision.limited ? { ok: true, limited: true, disponible: decision.disponible } : { ok: true };
      if (existing) {
        await conn.query('UPDATE tienda_carrito_items SET cantidad = ? WHERE id = ?', [decision.cantidad, existing.id]);
        return result;
      }
      if (!cart) {
        const [created] = await conn.query("INSERT INTO tienda_carritos (cuenta_id, estado) VALUES (?, 'abierto')", [cuentaId]);
        cart = { id: created.insertId };
      }
      const [countRows] = await conn.query('SELECT COUNT(*) AS total FROM tienda_carrito_items WHERE carrito_id = ?', [cart.id]);
      if (Number(countRows[0]?.total || 0) >= maxLines) return { error: 'CART_LIMIT' };
      await conn.query(
        'INSERT INTO tienda_carrito_items (carrito_id, producto_id, cantidad) VALUES (?, ?, ?)',
        [cart.id, productoId, decision.cantidad]
      );
      return result;
    });
  }

  // cantidad 0 = quitar la linea (siempre se permite). Otra cantidad se limita al stock disponible
  // (M-038). Devuelve { ok, limited?, disponible? }. Errores: CART_LOCKED, ITEM_NOT_FOUND, OUT_OF_STOCK.
  async function setCartItemQuantity(cuentaId, itemId, cantidad) {
    return withAccountLock(cuentaId, async (conn) => {
      const cart = await currentCart(conn, cuentaId);
      if (!cart) return { error: 'ITEM_NOT_FOUND' };
      if (cart.estado === 'enviado') return { error: 'CART_LOCKED' };
      const [found] = await conn.query(
        'SELECT id, producto_id FROM tienda_carrito_items WHERE id = ? AND carrito_id = ? LIMIT 1',
        [itemId, cart.id]
      );
      if (!found.length) return { error: 'ITEM_NOT_FOUND' };
      if (cantidad === 0) {
        await conn.query('DELETE FROM tienda_carrito_items WHERE id = ? AND carrito_id = ?', [itemId, cart.id]);
        return { ok: true };
      }
      // Un producto borrado no se muestra en el carrito (getCart usa INNER JOIN): solo se puede quitar.
      const product = await productStock(conn, found[0].producto_id);
      if (!product) return { error: 'ITEM_NOT_FOUND' };
      const decision = resolveCartLineQuantity({ requested: cantidad, disponible: availableForCart(product), mode: 'set' });
      if (decision.error) return decision;
      await conn.query('UPDATE tienda_carrito_items SET cantidad = ? WHERE id = ? AND carrito_id = ?', [decision.cantidad, itemId, cart.id]);
      return decision.limited ? { ok: true, limited: true, disponible: decision.disponible } : { ok: true };
    });
  }

  // Idempotente: si el codigo sigue vigente se mantiene. Vencido o abierto: codigo nuevo por 2 horas,
  // solo si ningun producto quedo sin stock o con menos stock que lo pedido (M-038).
  // Errores: CART_EMPTY, CART_STOCK_CHANGED.
  async function finalizeCart(cuentaId, generateCode, { attempts = 10 } = {}) {
    return withAccountLock(cuentaId, async (conn) => {
      const cart = await currentCart(conn, cuentaId);
      if (!cart) return { error: 'CART_EMPTY' };
      const [itemRows] = await conn.query(
        `SELECT i.cantidad, p.utiliza_inventario, p.cantidad_actual
         FROM tienda_carrito_items i
         INNER JOIN productos p ON p.id_producto = i.producto_id
         WHERE i.carrito_id = ?`,
        [cart.id]
      );
      if (!itemRows.length) return { error: 'CART_EMPTY' };
      if (cart.estado === 'enviado' && cart.codigo && Number(cart.vigente) === 1) return { ok: true };
      if (itemRows.some((row) => cartItemStockProblem(row.cantidad, availableForCart(row)) !== null)) {
        return { error: 'CART_STOCK_CHANGED' };
      }

      for (let i = 0; i < attempts; i += 1) {
        try {
          // El canje en caja no toma el bloqueo de la cuenta: si el carrito ya fue retirado,
          // no se toca (affectedRows = 0) y se responde el estado actual.
          await conn.query(
            `UPDATE tienda_carritos
             SET estado = 'enviado', codigo = ?, codigo_expira = DATE_ADD(NOW(), INTERVAL 2 HOUR)
             WHERE id = ? AND estado IN ('abierto','enviado')`,
            [generateCode(), cart.id]
          );
          return { ok: true };
        } catch (err) {
          if (err?.code !== 'ER_DUP_ENTRY') throw err;
        }
      }
      throw new Error('No se pudo generar un codigo de carrito libre');
    });
  }

  // Anula el codigo (vigente o vencido) y deja el carrito abierto para seguir editandolo.
  async function reopenCart(cuentaId) {
    return withAccountLock(cuentaId, async (conn) => {
      const cart = await currentCart(conn, cuentaId);
      if (cart && cart.estado === 'enviado') {
        // Solo si sigue enviado: un carrito que la caja retiro en paralelo no se reabre.
        await conn.query(
          "UPDATE tienda_carritos SET estado = 'abierto', codigo = NULL, codigo_expira = NULL WHERE id = ? AND estado = 'enviado'",
          [cart.id]
        );
      }
      return { ok: true };
    });
  }

  // Canje en caja. El UPDATE condicional es el que decide: solo un pedido puede pasar el carrito
  // de 'enviado' a 'retirado'. Devuelve { ok, cartId, cuentaId } o { pending, used } para clasificar.
  // cajaId: numero de la caja donde se cargo (M-039), o null si no se pudo saber.
  async function redeemCartCode(codigo, userId, cajaId = null) {
    const [rows] = await db.query('SELECT id, cuenta_id FROM tienda_carritos WHERE codigo = ? LIMIT 1', [codigo]);
    if (rows.length) {
      const [result] = await db.query(
        `UPDATE tienda_carritos
         SET estado = 'retirado', codigo_usado = codigo, codigo = NULL,
             retirado_at = NOW(), retirado_user_id = ?, retirado_caja_id = ?
         WHERE id = ? AND codigo = ? AND estado = 'enviado' AND codigo_expira > NOW()`,
        [userId || null, cajaId || null, rows[0].id, codigo]
      );
      if (Number(result?.affectedRows || 0) === 1) {
        return { ok: true, cartId: rows[0].id, cuentaId: rows[0].cuenta_id };
      }
    }
    // Reintento del mismo usuario del personal (se corto la red o fallo la lectura de los items):
    // durante 10 minutos puede volver a cargar el carrito que ya retiro.
    if (userId) {
      const [replayRows] = await db.query(
        `SELECT id, cuenta_id
         FROM tienda_carritos
         WHERE codigo_usado = ? AND estado = 'retirado' AND retirado_user_id = ?
           AND retirado_at > NOW() - INTERVAL 10 MINUTE
         ORDER BY retirado_at DESC, id DESC
         LIMIT 1`,
        [codigo, userId]
      );
      if (replayRows.length) {
        return { ok: true, replay: true, cartId: replayRows[0].id, cuentaId: replayRows[0].cuenta_id };
      }
    }
    const [pendingRows] = await db.query(
      'SELECT estado, (codigo_expira > NOW()) AS vigente FROM tienda_carritos WHERE codigo = ? LIMIT 1',
      [codigo]
    );
    const [usedRows] = await db.query(
      `SELECT (retirado_at > NOW() - INTERVAL 24 HOUR) AS reciente
       FROM tienda_carritos
       WHERE codigo_usado = ? AND estado = 'retirado'
       ORDER BY retirado_at DESC, id DESC
       LIMIT 1`,
      [codigo]
    );
    return { ok: false, pending: pendingRows[0] || null, used: usedRows[0] || null };
  }

  // Para la caja: mismas columnas que /api/productos/code/:code, mas la cantidad pedida.
  // Si el producto ya no existe, las columnas p.* vienen en NULL.
  async function getRedeemedCartProducts(cartId) {
    const [rows] = await db.query(
      `SELECT i.cantidad AS tienda_cantidad,
              p.*,
              fv.descripcion AS formato_venta,
              d.nombre AS departamento,
              s.name AS supplier_name
       FROM tienda_carrito_items i
       LEFT JOIN productos p ON p.id_producto = i.producto_id
       LEFT JOIN formato_venta fv ON fv.id_formato = p.id_formato
       LEFT JOIN departamento d ON d.id_departamento = p.id_departamento
       LEFT JOIN service_suppliers s ON s.id = p.supplier_id
       WHERE i.carrito_id = ?
       ORDER BY i.id ASC`,
      [cartId]
    );
    return rows;
  }

  // ---- Caja y venta del carrito (M-039) ----

  // La caja existe y el usuario tiene ahi su turno abierto de hoy (misma regla que POST /api/sales).
  async function cajaHasOpenShift(numeroCaja, userId) {
    const [rows] = await db.query(
      `SELECT c.id_corte
       FROM corte_caja c
       WHERE c.fecha = CURDATE() AND c.caja_id = ? AND c.usuario_id = ? AND c.estado = 'abierto'
         AND EXISTS (SELECT 1 FROM cajas cj WHERE cj.n_caja = c.caja_id)
       LIMIT 1`,
      [numeroCaja, userId]
    );
    return rows.length > 0;
  }

  // Vincula la venta solo al carrito que retiro el mismo usuario en el ultimo dia y que aun no tiene venta.
  // Devuelve true si quedo vinculado.
  async function linkCartToSale(cartId, ventaId, userId) {
    const [result] = await db.query(
      `UPDATE tienda_carritos
       SET venta_id = ?
       WHERE id = ? AND estado = 'retirado' AND retirado_user_id = ? AND venta_id IS NULL
         AND retirado_at > NOW() - INTERVAL 1 DAY`,
      [ventaId, cartId, userId]
    );
    return Number(result?.affectedRows || 0) === 1;
  }

  // ---- Consulta de administradores (M-039), solo lectura ----
  // Columnas explicitas: nunca clave_hash ni google_sub (solo si esta vinculado).

  const ADMIN_ACCOUNT_SELECT = `c.id, c.nombre, c.telefono, c.correo,
              (c.google_sub IS NOT NULL) AS google_vinculado, c.activo,
              c.created_at, c.last_login_at,
              (SELECT COUNT(*) FROM tienda_carritos t WHERE t.cuenta_id = c.id) AS carritos`;

  // likeTerm: patron LIKE ya escapado (o null = sin filtro). telefonoTerm: patron extra solo para el telefono.
  function adminSearchWhere(likeTerm, telefonoTerm) {
    if (!likeTerm) return { where: '', params: [] };
    // ESCAPE '\\' explicito (en SQL): el escape de escapeLike en tienda_admin.js.
    const clauses = ["c.nombre LIKE ? ESCAPE '\\\\'", "c.telefono LIKE ? ESCAPE '\\\\'", "c.correo LIKE ? ESCAPE '\\\\'"];
    const params = [likeTerm, likeTerm, likeTerm];
    if (telefonoTerm) {
      clauses.push("c.telefono LIKE ? ESCAPE '\\\\'");
      params.push(telefonoTerm);
    }
    return { where: `WHERE (${clauses.join(' OR ')})`, params };
  }

  async function listAccountsForAdmin({ likeTerm = null, telefonoTerm = null, limit, offset }) {
    const { where, params } = adminSearchWhere(likeTerm, telefonoTerm);
    const [countRows] = await db.query(`SELECT COUNT(*) AS total FROM tienda_cuentas c ${where}`, params);
    const [rows] = await db.query(
      `SELECT ${ADMIN_ACCOUNT_SELECT}
       FROM tienda_cuentas c
       ${where}
       ORDER BY c.created_at DESC, c.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return { rows, total: Number(countRows[0]?.total || 0) };
  }

  async function getAccountForAdmin(cuentaId) {
    const [rows] = await db.query(`SELECT ${ADMIN_ACCOUNT_SELECT} FROM tienda_cuentas c WHERE c.id = ? LIMIT 1`, [cuentaId]);
    return rows[0] || null;
  }

  // Carritos de la cuenta, del mas nuevo al mas antiguo, con la caja, la cajera y la venta.
  // La caja se lee con subconsulta (LIMIT 1) para no duplicar filas si el numero se repite.
  async function listCartsForAdmin(cuentaId, limit) {
    const [rows] = await db.query(
      `SELECT t.id, t.estado, t.codigo, t.codigo_usado, t.created_at, t.updated_at, t.codigo_expira,
              t.retirado_at, t.retirado_caja_id,
              (SELECT cj.nombre_caja FROM cajas cj WHERE cj.n_caja = t.retirado_caja_id ORDER BY cj.id_caja ASC LIMIT 1) AS caja_nombre,
              t.retirado_user_id, u.nombre AS cajera_nombre,
              t.venta_id, v.fecha AS venta_fecha, v.total AS venta_total
       FROM tienda_carritos t
       LEFT JOIN usuarios u ON u.id = t.retirado_user_id
       LEFT JOIN ventas v ON v.id_venta = t.venta_id
       WHERE t.cuenta_id = ?
       ORDER BY t.id DESC
       LIMIT ?`,
      [cuentaId, limit]
    );
    return rows;
  }

  // Productos de los carritos con su precio actual. Producto borrado: columnas p.* en NULL.
  async function listCartItemsForAdmin(cartIds) {
    if (!cartIds.length) return [];
    const [rows] = await db.query(
      `SELECT i.carrito_id, i.cantidad, p.id_producto, p.codigo_barras, p.descripcion, p.precio_venta
       FROM tienda_carrito_items i
       LEFT JOIN productos p ON p.id_producto = i.producto_id
       WHERE i.carrito_id IN (?)
       ORDER BY i.carrito_id DESC, i.id ASC`,
      [cartIds]
    );
    return rows;
  }

  return {
    ensureTables,
    getBusinessName,
    findProductByCode,
    findAccountByPhone,
    findAccountByGoogleSub,
    getAccount,
    createAccount,
    createSession,
    findSession,
    revokeSession,
    updatePassword,
    linkGoogle,
    getCart,
    addCartItem,
    setCartItemQuantity,
    finalizeCart,
    reopenCart,
    redeemCartCode,
    getRedeemedCartProducts,
    cajaHasOpenShift,
    linkCartToSale,
    listAccountsForAdmin,
    getAccountForAdmin,
    listCartsForAdmin,
    listCartItemsForAdmin,
  };
}

module.exports = { createTiendaRepo, TiendaConflictError, mapAccountDuplicate };

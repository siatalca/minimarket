// Cierre administrativo de turnos abandonados (M-052).
// Un turno abandonado es una fila de corte_caja con estado 'abierto' que ya quedo fuera de la
// ventana activa de shift_window.js (no es de hoy y se abrio hace mas de 16 horas): nadie la
// cerro y el sistema ya no la trata como turno en curso.
// Este modulo solo cambia el estado, la hora de cierre y la marca del cierre administrativo.
// No recalcula montos ni toca ventas, movimientos de caja ni sesiones (por eso no usa
// closeShiftCore). Recibe la base por parametro: no hace require de ./db ni de ./server.
const { OPEN_SHIFT_WINDOW_HOURS, openShiftWindowSql } = require('./shift_window');

const ABANDONED_CLOSE_TYPE = 'administrativo_abandonado';
const CLOSE_COLUMNS = ['cierre_tipo', 'cierre_admin_usuario_id', 'cierre_admin_login', 'cierre_admin_en'];

// Turno abierto fuera de la ventana activa.
function abandonedWhereSql(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return `${prefix}estado = 'abierto' AND NOT ${openShiftWindowSql(alias)}`;
}

// Hora en que el turno dejo de estar activo: el fin del dia de "fecha" o 16 horas despues de
// abrir, lo que ocurra despues (la misma regla de la ventana, vista desde el cierre).
const ABANDONED_CLOSE_TIME_SQL = `GREATEST(TIMESTAMP(fecha + INTERVAL 1 DAY), hora_apertura + INTERVAL ${OPEN_SHIFT_WINDOW_HOURS} HOUR)`;

function toTime(value) {
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(String(value || '').replace(' ', 'T'));
  return Number.isNaN(parsed) ? null : parsed;
}

// Resumen por caja: cantidad de turnos, primera y ultima apertura, y cuantos tienen ventas.
function summarizeByBox(rows) {
  const byBox = new Map();
  for (const row of rows) {
    const cajaId = Number(row.caja_id);
    let item = byBox.get(cajaId);
    if (!item) {
      item = { caja_id: cajaId, turnos: 0, desde: row.hora_apertura, hasta: row.hora_apertura, con_ventas: 0 };
      byBox.set(cajaId, item);
    }
    item.turnos += 1;
    const time = toTime(row.hora_apertura);
    if (time !== null && (toTime(item.desde) === null || time < toTime(item.desde))) item.desde = row.hora_apertura;
    if (time !== null && (toTime(item.hasta) === null || time > toTime(item.hasta))) item.hasta = row.hora_apertura;
    if (Number(row.con_ventas || 0) === 1) item.con_ventas += 1;
  }
  return [...byBox.values()].sort((a, b) => a.caja_id - b.caja_id);
}

function mapShift(row) {
  return {
    id_corte: Number(row.id_corte),
    caja_id: Number(row.caja_id),
    usuario_id: Number(row.usuario_id),
    hora_apertura: row.hora_apertura,
  };
}

// Solo lectura: lista los turnos abandonados y su resumen por caja.
// con_ventas es informativo (si el turno tiene alguna venta asociada por ventas.turno_id).
async function previewAbandonedShifts(database) {
  const [rows] = await database.query(
    `SELECT c.id_corte, c.caja_id, c.usuario_id, c.fecha, c.hora_apertura,
            EXISTS(SELECT 1 FROM ventas v WHERE v.turno_id = c.id_corte) AS con_ventas
     FROM corte_caja c
     WHERE ${abandonedWhereSql('c')}
     ORDER BY c.caja_id ASC, c.hora_apertura ASC, c.id_corte ASC`
  );
  const list = Array.isArray(rows) ? rows : [];
  return {
    total: list.length,
    porCaja: summarizeByBox(list),
    turnos: list.map(mapShift),
  };
}

function adminError(message) {
  const err = new Error(message);
  err.code = 'ADMIN_INVALIDO';
  return err;
}

// El cierre lo firma un administrador: debe existir, estar activo y tener es_administrador = 1.
async function validateAdmin(database, login) {
  const cleanLogin = String(login || '').trim();
  if (!cleanLogin) throw adminError('Falta el usuario administrador que firma el cierre (--por <login>).');
  const [rows] = await database.query(
    'SELECT id, user, activo, es_administrador FROM usuarios WHERE user = ? LIMIT 1',
    [cleanLogin]
  );
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) throw adminError(`El usuario "${cleanLogin}" no existe.`);
  if (Number(row.activo ?? 1) !== 1) throw adminError(`El usuario "${cleanLogin}" esta inactivo.`);
  if (Number(row.es_administrador || 0) !== 1) throw adminError(`El usuario "${cleanLogin}" no es administrador.`);
  return { id: Number(row.id), login: String(row.user) };
}

// Falla con un mensaje claro si la base aun no tiene las columnas del cierre administrativo.
async function assertCloseColumns(database) {
  const [rows] = await database.query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'corte_caja' AND COLUMN_NAME IN (?)`,
    [CLOSE_COLUMNS]
  );
  const present = new Set((Array.isArray(rows) ? rows : []).map((row) => row.COLUMN_NAME));
  const missing = CLOSE_COLUMNS.filter((name) => !present.has(name));
  if (missing.length > 0) {
    const err = new Error(
      `Faltan columnas en corte_caja (${missing.join(', ')}). Ejecuta primero: node server/update_db_schema.js`
    );
    err.code = 'COLUMNAS_FALTANTES';
    throw err;
  }
}

// Sin apply: no escribe nada y devuelve lo que se cerraria.
// Con apply: valida al administrador, bloquea los candidatos y los cierra en una sola UPDATE.
// Idempotente: una segunda ejecucion no encuentra candidatos y devuelve affectedRows 0.
async function closeAbandonedShifts(database, { admin, apply = false } = {}) {
  if (!apply) {
    const preview = await previewAbandonedShifts(database);
    return { applied: false, affectedRows: 0, ...preview };
  }

  const signer = await validateAdmin(database, admin);
  await assertCloseColumns(database);

  const connection = await database.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT c.id_corte, c.caja_id, c.usuario_id, c.fecha, c.hora_apertura
       FROM corte_caja c
       WHERE ${abandonedWhereSql('c')}
       ORDER BY c.caja_id ASC, c.hora_apertura ASC, c.id_corte ASC
       FOR UPDATE`
    );
    const candidates = Array.isArray(rows) ? rows : [];
    let affectedRows = 0;
    if (candidates.length > 0) {
      // La condicion de abandono se repite: si un turno volvio a quedar activo entre el
      // SELECT y la UPDATE (por ejemplo, cambio de dia), no se cierra.
      const [result] = await connection.query(
        `UPDATE corte_caja
         SET estado = 'cerrado',
             hora_cierre = ${ABANDONED_CLOSE_TIME_SQL},
             cierre_tipo = ?,
             cierre_admin_usuario_id = ?,
             cierre_admin_login = ?,
             cierre_admin_en = NOW()
         WHERE id_corte IN (?) AND ${abandonedWhereSql()}`,
        [ABANDONED_CLOSE_TYPE, signer.id, signer.login, candidates.map((row) => Number(row.id_corte))]
      );
      affectedRows = Number(result?.affectedRows || 0);
    }
    await connection.commit();
    return {
      applied: true,
      affectedRows,
      admin: signer,
      total: candidates.length,
      porCaja: summarizeByBox(candidates),
      turnos: candidates.map(mapShift),
    };
  } catch (err) {
    try {
      await connection.rollback();
    } catch (_) {
      // la conexion puede haberse cortado; el error original es el que importa
    }
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  ABANDONED_CLOSE_TYPE,
  ABANDONED_CLOSE_TIME_SQL,
  CLOSE_COLUMNS,
  abandonedWhereSql,
  previewAbandonedShifts,
  closeAbandonedShifts,
  validateAdmin,
  assertCloseColumns,
};

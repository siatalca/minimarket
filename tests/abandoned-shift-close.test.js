// M-052: cierre administrativo de turnos abandonados (estado 'abierto' fuera de la ventana activa).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  ABANDONED_CLOSE_TYPE,
  abandonedWhereSql,
  previewAbandonedShifts,
  closeAbandonedShifts,
  validateAdmin,
} = require('../server/abandoned_shift_close');
const { openShiftWindowSql } = require('../server/shift_window');
const { parseArgs } = require('../server/cerrar_turnos_abandonados');

const ALL_CLOSE_COLUMNS = ['cierre_tipo', 'cierre_admin_usuario_id', 'cierre_admin_login', 'cierre_admin_en'];

// Doble de la BD: turnos en memoria; "abandonado" lo decide la prueba (campo abandoned).
function fakeDb({ shifts = [], users = [], columns = ALL_CLOSE_COLUMNS } = {}) {
  const log = [];
  const state = { shifts: shifts.map((s) => ({ estado: 'abierto', ...s })), connections: 0, released: 0, commits: 0, rollbacks: 0 };
  const abandoned = () => state.shifts.filter((s) => s.estado === 'abierto' && s.abandoned);

  async function query(sql, params) {
    log.push({ sql, params });
    if (sql.includes('FROM usuarios')) {
      return [users.filter((u) => u.user === params[0]).slice(0, 1)];
    }
    if (sql.includes('information_schema.COLUMNS')) {
      return [columns.filter((c) => params[0].includes(c)).map((c) => ({ COLUMN_NAME: c }))];
    }
    if (sql.trim().startsWith('SELECT') && sql.includes('FROM corte_caja c')) {
      return [abandoned().map((s) => ({
        id_corte: s.id_corte, caja_id: s.caja_id, usuario_id: s.usuario_id, fecha: s.fecha,
        hora_apertura: s.hora_apertura, con_ventas: s.con_ventas ? 1 : 0,
      }))];
    }
    if (sql.trim().startsWith('UPDATE corte_caja')) {
      const ids = params[3];
      let affectedRows = 0;
      for (const s of abandoned()) {
        if (ids.includes(s.id_corte)) {
          s.estado = 'cerrado';
          s.cierre_tipo = params[0];
          s.cierre_admin_usuario_id = params[1];
          s.cierre_admin_login = params[2];
          affectedRows += 1;
        }
      }
      return [{ affectedRows }];
    }
    throw new Error(`SQL inesperado: ${sql}`);
  }

  return {
    log,
    state,
    query,
    async getConnection() {
      state.connections += 1;
      return {
        query,
        async beginTransaction() { log.push({ sql: 'BEGIN' }); },
        async commit() { state.commits += 1; log.push({ sql: 'COMMIT' }); },
        async rollback() { state.rollbacks += 1; log.push({ sql: 'ROLLBACK' }); },
        release() { state.released += 1; },
      };
    },
  };
}

const ADMIN = { id: 7, user: 'jefa', activo: 1, es_administrador: 1 };
const CASHIER = { id: 8, user: 'cajero', activo: 1, es_administrador: 0 };
const INACTIVE_ADMIN = { id: 9, user: 'exjefe', activo: 0, es_administrador: 1 };

function sampleShifts() {
  return [
    { id_corte: 11, caja_id: 1, usuario_id: 3, fecha: '2026-10-01', hora_apertura: '2026-10-01 08:00:00', abandoned: true, con_ventas: true },
    { id_corte: 12, caja_id: 1, usuario_id: 3, fecha: '2026-10-05', hora_apertura: '2026-10-05 09:30:00', abandoned: true },
    { id_corte: 21, caja_id: 2, usuario_id: 4, fecha: '2026-09-20', hora_apertura: '2026-09-20 07:15:00', abandoned: true },
    { id_corte: 30, caja_id: 3, usuario_id: 5, fecha: '2026-11-24', hora_apertura: '2026-11-24 08:00:00', abandoned: false },
  ];
}

const writes = (db) => db.log.filter((q) => /^\s*(UPDATE|INSERT|DELETE|REPLACE|ALTER)\b/i.test(q.sql));

test('abandonedWhereSql: abierto y fuera de la ventana compartida', () => {
  assert.equal(abandonedWhereSql(), `estado = 'abierto' AND NOT ${openShiftWindowSql()}`);
  assert.equal(abandonedWhereSql('c'), `c.estado = 'abierto' AND NOT ${openShiftWindowSql('c')}`);
});

test('(a) modo mostrar: no escribe ni abre transaccion', async () => {
  const db = fakeDb({ shifts: sampleShifts(), users: [ADMIN] });
  const result = await closeAbandonedShifts(db, { admin: 'jefa', apply: false });
  assert.equal(result.applied, false);
  assert.equal(result.affectedRows, 0);
  assert.equal(result.total, 3);
  assert.deepEqual(writes(db), []);
  assert.equal(db.state.connections, 0);
  assert.ok(db.state.shifts.every((s) => s.estado === 'abierto'));
  const preview = db.log.find((q) => q.sql.includes('FROM corte_caja c'));
  assert.ok(preview.sql.includes(abandonedWhereSql('c')));
  assert.match(preview.sql, /EXISTS\(SELECT 1 FROM ventas v WHERE v\.turno_id = c\.id_corte\)/);
});

test('(b) aplicar: bloquea candidatos y la UPDATE repite estado abierto y NOT ventana', async () => {
  const db = fakeDb({ shifts: sampleShifts(), users: [ADMIN] });
  const result = await closeAbandonedShifts(db, { admin: 'jefa', apply: true });
  assert.equal(result.applied, true);
  assert.equal(result.affectedRows, 3);
  assert.deepEqual(result.admin, { id: 7, login: 'jefa' });

  const select = db.log.find((q) => q.sql.includes('FOR UPDATE'));
  assert.ok(select, 'SELECT ... FOR UPDATE de los candidatos');
  const updates = writes(db);
  assert.equal(updates.length, 1, 'una sola UPDATE');
  const { sql, params } = updates[0];
  assert.match(sql, /^\s*UPDATE corte_caja\b/);
  assert.ok(sql.includes("estado = 'abierto'"));
  assert.ok(sql.includes(`NOT ${openShiftWindowSql()}`));
  assert.match(sql, /WHERE id_corte IN \(\?\)/);
  assert.ok(sql.includes("SET estado = 'cerrado'"));
  assert.ok(sql.includes('hora_cierre = GREATEST(TIMESTAMP(fecha + INTERVAL 1 DAY), hora_apertura + INTERVAL 16 HOUR)'));
  assert.ok(sql.includes('cierre_admin_en = NOW()'));
  assert.deepEqual(params, [ABANDONED_CLOSE_TYPE, 7, 'jefa', [11, 12, 21]]);
  assert.ok(db.log.indexOf(select) < db.log.indexOf(updates[0]));
  assert.equal(db.state.commits, 1);
  assert.equal(db.state.released, 1);
  // El turno activo (caja 3) no se toca.
  assert.equal(db.state.shifts.find((s) => s.id_corte === 30).estado, 'abierto');
});

test('(c) la escritura no toca montos, observaciones, ventas, movimientos ni sesiones', async () => {
  const db = fakeDb({ shifts: sampleShifts(), users: [ADMIN] });
  await closeAbandonedShifts(db, { admin: 'jefa', apply: true });
  const written = writes(db).map((q) => q.sql).join('\n');
  assert.ok(written.length > 0);
  for (const forbidden of [/monto_/, /total_/, /diferencia_/, /transacciones/, /observaciones/,
    /\bventas\b/, /detalle_venta/, /cash_movements/, /user_auth_sessions/]) {
    assert.doesNotMatch(written, forbidden);
  }
  // Ninguna consulta (ni de lectura) en la transaccion apunta a esas tablas, salvo el EXISTS de la vista previa.
  const all = db.log.map((q) => q.sql).join('\n');
  assert.doesNotMatch(all, /cash_movements|user_auth_sessions|detalle_venta/);
});

test('(d) segunda ejecucion: 0 filas y sin UPDATE', async () => {
  const db = fakeDb({ shifts: sampleShifts(), users: [ADMIN] });
  const first = await closeAbandonedShifts(db, { admin: 'jefa', apply: true });
  assert.equal(first.affectedRows, 3);
  db.log.length = 0;
  const second = await closeAbandonedShifts(db, { admin: 'jefa', apply: true });
  assert.equal(second.affectedRows, 0);
  assert.equal(second.total, 0);
  assert.deepEqual(writes(db), []);
  assert.equal(db.state.commits, 2);
  assert.equal(db.state.released, 2);
});

for (const [label, admin, pattern] of [
  ['sin admin', undefined, /Falta el usuario administrador/],
  ['admin vacio', '   ', /Falta el usuario administrador/],
  ['usuario inexistente', 'nadie', /no existe/],
  ['usuario no administrador', 'cajero', /no es administrador/],
  ['administrador inactivo', 'exjefe', /inactivo/],
]) {
  test(`(e) aplicar con ${label}: rechazo sin escribir`, async () => {
    const db = fakeDb({ shifts: sampleShifts(), users: [ADMIN, CASHIER, INACTIVE_ADMIN] });
    await assert.rejects(closeAbandonedShifts(db, { admin, apply: true }), (err) => {
      assert.equal(err.code, 'ADMIN_INVALIDO');
      assert.match(err.message, pattern);
      return true;
    });
    assert.deepEqual(writes(db), []);
    assert.equal(db.state.connections, 0);
  });
}

test('validateAdmin devuelve id y login del administrador activo', async () => {
  const db = fakeDb({ users: [ADMIN] });
  assert.deepEqual(await validateAdmin(db, ' jefa '), { id: 7, login: 'jefa' });
});

test('aplicar sin las columnas nuevas: error claro que pide update_db_schema.js', async () => {
  const db = fakeDb({ shifts: sampleShifts(), users: [ADMIN], columns: ['cierre_tipo'] });
  await assert.rejects(closeAbandonedShifts(db, { admin: 'jefa', apply: true }), (err) => {
    assert.equal(err.code, 'COLUMNAS_FALTANTES');
    assert.match(err.message, /cierre_admin_usuario_id, cierre_admin_login, cierre_admin_en/);
    assert.match(err.message, /node server\/update_db_schema\.js/);
    return true;
  });
  assert.deepEqual(writes(db), []);
});

test('error en la UPDATE: rollback y libera la conexion', async () => {
  const db = fakeDb({ shifts: sampleShifts(), users: [ADMIN] });
  const original = db.getConnection;
  db.getConnection = async () => {
    const conn = await original();
    const baseQuery = conn.query;
    conn.query = async (sql, params) => {
      if (sql.trim().startsWith('UPDATE')) throw new Error('fallo simulado');
      return baseQuery(sql, params);
    };
    return conn;
  };
  await assert.rejects(closeAbandonedShifts(db, { admin: 'jefa', apply: true }), /fallo simulado/);
  assert.equal(db.state.rollbacks, 1);
  assert.equal(db.state.commits, 0);
  assert.equal(db.state.released, 1);
});

test('(f) resumen por caja: turnos, desde, hasta y con_ventas', async () => {
  const db = fakeDb({ shifts: sampleShifts() });
  const preview = await previewAbandonedShifts(db);
  assert.equal(preview.total, 3);
  assert.deepEqual(preview.porCaja, [
    { caja_id: 1, turnos: 2, desde: '2026-10-01 08:00:00', hasta: '2026-10-05 09:30:00', con_ventas: 1 },
    { caja_id: 2, turnos: 1, desde: '2026-09-20 07:15:00', hasta: '2026-09-20 07:15:00', con_ventas: 0 },
  ]);
  assert.deepEqual(preview.turnos.map((t) => t.id_corte), [11, 12, 21]);
  assert.deepEqual(Object.keys(preview.turnos[0]), ['id_corte', 'caja_id', 'usuario_id', 'hora_apertura']);

  const applied = await closeAbandonedShifts(fakeDb({ shifts: sampleShifts(), users: [ADMIN] }), { admin: 'jefa', apply: true });
  assert.deepEqual(applied.porCaja.map((c) => [c.caja_id, c.turnos]), [[1, 2], [2, 1]]);
});

test('server.js agrega las 4 columnas del cierre administrativo a corte_caja (NULL, sin tocar datos)', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'server', 'server.js'), 'utf8');
  const expected = {
    cierre_tipo: 'VARCHAR(30) NULL',
    cierre_admin_usuario_id: 'INT NULL',
    cierre_admin_login: 'VARCHAR(80) NULL',
    cierre_admin_en: 'DATETIME NULL',
  };
  for (const [column, type] of Object.entries(expected)) {
    const guard = `if (!current.has('${column}')) {\n    await db.query('ALTER TABLE corte_caja ADD COLUMN ${column} ${type}');`;
    assert.ok(source.includes(guard), `falta ALTER de ${column}`);
  }
  // Dentro de ensureOperationalTables, despues de crear corte_caja (lo corre update_db_schema.js).
  const fnStart = source.indexOf('async function ensureOperationalTables()');
  const create = source.indexOf('CREATE TABLE IF NOT EXISTS corte_caja', fnStart);
  const alter = source.indexOf("ADD COLUMN cierre_tipo", fnStart);
  const nextFn = source.indexOf('\nasync function ', fnStart + 10);
  assert.ok(fnStart > 0 && create > fnStart && alter > create && alter < nextFn);
  const updater = fs.readFileSync(path.join(__dirname, '..', 'server', 'update_db_schema.js'), 'utf8');
  assert.match(updater, /DB_SCHEMA_SYNC_ONLY = '1'/);
});

test('CLI: sin argumentos solo muestra; --aplicar exige --por', () => {
  assert.deepEqual(parseArgs([]), { apply: false, admin: null, help: false });
  assert.deepEqual(parseArgs(['--aplicar', '--por', 'jefa']), { apply: true, admin: 'jefa', help: false });
  assert.deepEqual(parseArgs(['--por=jefa', '--aplicar']), { apply: true, admin: 'jefa', help: false });
  assert.throws(() => parseArgs(['--aplicar']), /--por/);
  assert.throws(() => parseArgs(['--aplicar', '--por']), /--por/);
  assert.throws(() => parseArgs(['--por', 'jefa']), /junto con --aplicar/);
  assert.throws(() => parseArgs(['--borrar']), /desconocido/);
});

test('CLI: no carga server.js y documenta la reversion', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'server', 'cerrar_turnos_abandonados.js'), 'utf8');
  assert.doesNotMatch(source, /require\('\.\/server'\)/);
  assert.match(source, /require\('\.\/db'\)/);
  assert.ok(source.includes("UPDATE corte_caja SET estado='abierto', hora_cierre=NULL, cierre_tipo=NULL, cierre_admin_usuario_id=NULL, cierre_admin_login=NULL, cierre_admin_en=NULL WHERE cierre_tipo='administrativo_abandonado';"));
  const moduleSource = fs.readFileSync(path.join(__dirname, '..', 'server', 'abandoned_shift_close.js'), 'utf8');
  assert.doesNotMatch(moduleSource, /require\('\.\/(db|server)'\)/);
  assert.doesNotMatch(moduleSource, /require\('\.\/shift_close_core'\)/);
});

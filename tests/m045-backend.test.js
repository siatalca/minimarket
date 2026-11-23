// M-045: endurecimiento de ambos backends (servidor y paquete de cajas).
// verify-admin con limite y "activo", updateUser/getconnect restringidos, rutas sensibles a
// mayusculas, turnos abiertos que cruzan la medianoche, turno/iniciar en transaccion y reportes
// compatibles con ONLY_FULL_GROUP_BY.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('../server/node_modules/express');

const { closeShiftCore } = require('../server/shift_close_core');
const { openShiftWindowSql, OPEN_SHIFT_WINDOW_HOURS } = require('../server/shift_window');

const BACKENDS = [
  path.join(__dirname, '..', 'server', 'server.js'),
  path.join(__dirname, '..', 'paquete_cliente_db', 'server', 'server.js'),
];

function routeBody(source, signature) {
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `no se encontro ${signature}`);
  const next = source.indexOf('\napp.', start + signature.length);
  return source.slice(start, next > 0 ? next : undefined);
}

for (const file of BACKENDS) {
  const label = path.relative(path.join(__dirname, '..'), file);
  const source = fs.readFileSync(file, 'utf8');

  test(`${label}: rutas sensibles a mayusculas y control de token en minusculas`, () => {
    const appLine = source.indexOf('const app = express();');
    const caseLine = source.indexOf("app.set('case sensitive routing', true);");
    assert.ok(caseLine > appLine && caseLine - appLine < 300, 'case sensitive routing justo tras crear la app');
    assert.match(source, /if \(!req\.path\.toLowerCase\(\)\.startsWith\('\/api\/'\)\) \{/);
  });

  test(`${label}: verify-admin limita intentos y rechaza usuarios desactivados sin revelarlo`, () => {
    assert.match(source, /const adminVerifyGuard = createLoginGuard\(\);/);
    const body = routeBody(source, "app.post('/api/auth/verify-admin'");
    const firstAwait = body.indexOf('await ');
    assert.ok(body.indexOf('adminVerifyGuard.beginAttempt(') < firstAwait, 'beginAttempt antes de cualquier await');
    assert.ok(body.indexOf('adminVerifyGuard.checkUnknownAccount(') > 0);
    assert.ok(body.indexOf('adminVerifyGuard.checkAccount(') < body.indexOf('bcrypt.compare('), 'checkAccount antes de comparar la clave');
    assert.equal((body.match(/u\.es_administrador, u\.activo/g) || []).length, 2, 'activo en ambas consultas');
    assert.match(body, /if \(!passwordOk \|\| !isUserActive\(user\)\) \{\s*return res\.status\(401\)\.json\(\{ message: 'Credenciales de administrador inválidas\.' \}\);/);
    assert.ok(body.indexOf('adminVerifyGuard.success(') > body.indexOf('!isUserActive(user)'));
  });

  test(`${label}: updateUser solo cambia el propio estado (o administrador) y getconnect es de administrador`, () => {
    const update = routeBody(source, "app.put('/api/updateUser/'");
    assert.match(update, /if \(toInt\(req\.user\?\.sub\) !== userId && !\(await requireAdministrator\(req, res\)\)\) \{/);
    assert.match(update, /const estadoUsuario = Number\(estado_usuario\) === 1 \? 1 : 0;/);
    assert.match(update, /\[estadoUsuario, userId\]/);
    const connect = routeBody(source, "app.post('/api/getconnect'");
    assert.match(connect, /if \(!\(await requireAdministrator\(req, res\)\)\) return;/);
  });

  test(`${label}: los turnos abiertos no se buscan por la fecha de hoy`, () => {
    assert.doesNotMatch(source, /fecha = CURDATE\(\)[^`]*estado = 'abierto'/);
    assert.doesNotMatch(source, /DATE\((?:v\.|m\.)?fecha\) = \? AND \((?:v|m)\.turno_id = \?/);
  });

  test(`${label}: turno/iniciar abre el turno en una transaccion con la caja bloqueada`, () => {
    const body = routeBody(source, "app.post('/api/turno/iniciar'");
    const lock = body.indexOf('FROM cajas WHERE n_caja = ? LIMIT 1 FOR UPDATE');
    assert.ok(body.indexOf('beginTransaction()') < lock && lock > 0);
    assert.ok(lock < body.indexOf('FROM corte_caja'), 'bloquea antes de buscar el turno');
    assert.ok(body.indexOf('INSERT INTO corte_caja') < body.lastIndexOf('connection.commit()'));
    assert.match(body, /connection\.rollback\(\)/);
    assert.match(body, /connection\.release\(\)/);
    assert.doesNotMatch(body, /await db\.query\(/, 'todas las consultas usan la conexion de la transaccion');
  });

  test(`${label}: reportes agrupan y ordenan por la misma expresion que muestran`, () => {
    assert.doesNotMatch(source, /GROUP BY DATE\(v\.fecha\)/);
    assert.doesNotMatch(source, /GROUP BY YEAR\(v\.fecha\), MONTH\(v\.fecha\)/);
    assert.match(source, /GROUP BY DATE_FORMAT\(v\.fecha, '%Y-%m-%d'\)\s*ORDER BY DATE_FORMAT\(v\.fecha, '%Y-%m-%d'\) ASC/);
  });
}

test('servidor: findOtherOpenShift usa la ventana del turno y la conexion recibida', () => {
  const source = fs.readFileSync(BACKENDS[0], 'utf8');
  const start = source.indexOf('async function findOtherOpenShift(cajaId, userId, connection = db)');
  const body = source.slice(start, source.indexOf('\n}\n', start));
  assert.match(body, /WHERE c\.caja_id = \? AND c\.estado = 'abierto' AND \$\{openShiftWindowSql\('c'\)\} AND c\.usuario_id <> \?/);
  assert.match(source, /findOtherOpenShift\(cajaId, cajeroId, connection\)/);
});

test('ventana del turno abierto: hoy o abierto hace menos de 16 horas', () => {
  assert.equal(OPEN_SHIFT_WINDOW_HOURS, 16);
  assert.equal(openShiftWindowSql(), '(fecha = CURDATE() OR hora_apertura >= NOW() - INTERVAL 16 HOUR)');
  assert.equal(openShiftWindowSql('c'), '(c.fecha = CURDATE() OR c.hora_apertura >= NOW() - INTERVAL 16 HOUR)');
});

// Cada consulta SQL (texto entre comillas invertidas) que busca estado = 'abierto' en corte_caja.
function openShiftQueries(source) {
  const found = [];
  const re = /`([^`]*)`/g;
  let m;
  while ((m = re.exec(source))) {
    const sql = m[1];
    if (!/estado = 'abierto'/.test(sql)) continue;
    // El refresh de sesion busca el turno exacto por id: no lleva ventana (un turno largo no expulsa).
    if (/WHERE id_corte = \? AND usuario_id = \? AND estado = 'abierto'\s*LIMIT 1/.test(sql)) continue;
    const line = source.slice(0, m.index).split('\n').length;
    found.push({ sql, line });
  }
  return found;
}

for (const file of BACKENDS) {
  const label = path.relative(path.join(__dirname, '..'), file);
  const source = fs.readFileSync(file, 'utf8');

  test(`${label}: ninguna busqueda de turno abierto queda sin la ventana compartida`, () => {
    assert.match(source, /const \{ openShiftWindowSql \} = require\('\.\/shift_window'\);/);
    const queries = openShiftQueries(source);
    assert.ok(queries.length >= 12, `se esperaban varias busquedas (hay ${queries.length})`);
    const missing = queries.filter((q) => !/\$\{openShiftWindowSql\((?:'c')?\)\}/.test(q.sql)).map((q) => q.line);
    assert.deepEqual(missing, [], `sin ventana en lineas ${missing.join(', ')}`);
    // Cada uso queda dentro de una consulta entre comillas invertidas (si no, ${...} no se reemplaza).
    const uses = (source.match(/\$\{openShiftWindowSql\(/g) || []).length;
    const inQueries = queries.reduce((n, q) => n + (q.sql.match(/\$\{openShiftWindowSql\(/g) || []).length, 0);
    assert.equal(inQueries, uses);
  });

  test(`${label}: historial de cortes y ultimo turno de hoy no cortan en la medianoche`, () => {
    assert.doesNotMatch(source, /DATE\(v\.fecha\) = c\.fecha/);
    assert.match(source, /WHERE \(fecha = CURDATE\(\) OR DATE\(hora_cierre\) = CURDATE\(\)\) AND caja_id = \? AND usuario_id = \?/);
  });
}

test('shift_close_core usa la misma ventana y el paquete reexporta el modulo', () => {
  const core = fs.readFileSync(path.join(__dirname, '..', 'server', 'shift_close_core.js'), 'utf8');
  assert.match(core, /estado = 'abierto' AND \$\{openShiftWindowSql\(\)\}/);
  assert.equal(require('../paquete_cliente_db/server/shift_window').openShiftWindowSql, openShiftWindowSql);
});

test('el paquete usa el mismo rate_limiter.js que el servidor', () => {
  const a = fs.readFileSync(path.join(__dirname, '..', 'server', 'rate_limiter.js'), 'utf8');
  const b = fs.readFileSync(path.join(__dirname, '..', 'paquete_cliente_db', 'server', 'rate_limiter.js'), 'utf8');
  assert.equal(b.replace(/\r\n/g, '\n'), a.replace(/\r\n/g, '\n'));
});

test('cierre: un turno abierto ayer se encuentra y cuenta desde su hora de apertura', async () => {
  const queries = [];
  const database = {
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.includes('FROM corte_caja') && sql.includes("estado = 'abierto'")) {
        return [[{ id_corte: 77, estado: 'abierto', monto_inicial: 0, hora_apertura: '2026-11-22 22:00:00' }]];
      }
      if (sql.includes('COUNT(*) AS transacciones')) return [[{ transacciones: 3, total: 300 }]];
      if (sql.includes('total_efectivo')) return [[{ total_efectivo: 300, total_tarjeta: 0 }]];
      if (sql.includes('total_mixto')) return [[{ total_mixto: 0 }]];
      if (sql.includes('FROM cash_movements')) return [[]];
      if (sql.includes('FROM personalization_settings')) return [[{ cut_mode: 'sin_ajuste' }]];
      return [{ affectedRows: 1 }];
    },
  };
  const result = await closeShiftCore({
    database, cajaId: 3, cajeroId: 9,
    sql: { cashAmount: () => '0', cardAmount: () => '0', mixedCondition: () => '1=0' },
  });
  assert.equal(result.id_corte, 77);
  assert.equal(result.total_ventas, 300);
  const lookup = queries[0];
  assert.ok(lookup.sql.includes(openShiftWindowSql()), 'busca el turno con la ventana compartida');
  assert.deepEqual(lookup.params, [3, 9]);
  const sales = queries.find((q) => q.sql.includes('COUNT(*) AS transacciones'));
  assert.doesNotMatch(sales.sql, /CURDATE/);
  assert.match(sales.sql, /fecha >= \?/);
  assert.deepEqual(sales.params, [3, 9, '2026-11-22 22:00:00', 77]);
});

// Reproduce la decision del middleware de server/server.js con la app sensible a mayusculas.
function buildApp() {
  const app = express();
  app.set('case sensitive routing', true);
  app.use((req, res, next) => {
    if (!req.path.toLowerCase().startsWith('/api/')) return next();
    if (!String(req.headers.authorization || '').startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token requerido' });
    }
    return next();
  });
  app.get('/api/productos', (req, res) => res.json({ ok: true }));
  return app;
}

function request(server, url, headers = {}) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    http.get({ host: '127.0.0.1', port, path: url, headers }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    }).on('error', reject);
  });
}

test('"/API/productos" no llega a la ruta sin token y con token tampoco coincide', async () => {
  const server = buildApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    assert.equal(await request(server, '/API/productos'), 401);
    assert.equal(await request(server, '/Api/Productos'), 401);
    assert.equal(await request(server, '/API/productos', { authorization: 'Bearer x' }), 404);
    assert.equal(await request(server, '/api/productos', { authorization: 'Bearer x' }), 200);
  } finally {
    server.close();
  }
});

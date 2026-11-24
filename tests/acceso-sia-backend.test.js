// M-052 Parte B: Acceso SIA (admin_sia sin caja), cierre del login sin caja, caja 8 normal y
// script de liberacion de la caja 8. Reglas puras + revision del codigo de server.js.
// Las pruebas HTTP contra un servidor real estan en tests/acceso-sia-http.test.js (opcionales).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const sia = require('../server/acceso_sia');
const { parseArgs, previewSiaBoxRelease, applySiaBoxRelease } = require('../server/liberar_caja_sia');

const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server', 'server.js'), 'utf8');
const tiendaSource = fs.readFileSync(path.join(__dirname, '..', 'server', 'tienda_routes.js'), 'utf8');

function routeBody(source, signature) {
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `no se encontro ${signature}`);
  const next = source.indexOf('\napp.', start + signature.length);
  return source.slice(start, next > 0 ? next : undefined);
}

function fakeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

test('decideLoginMode: sin caja solo con acceso_sia === true', () => {
  assert.equal(sia.decideLoginMode({ acceso_sia: true }, null), 'acceso_sia');
  assert.equal(sia.decideLoginMode({ acceso_sia: true }, 3), 'acceso_sia');
  assert.equal(sia.decideLoginMode({ acceso_sia: 'true' }, null), 'caja_requerida');
  assert.equal(sia.decideLoginMode({ acceso_sia: 1 }, null), 'caja_requerida');
  assert.equal(sia.decideLoginMode({}, null), 'caja_requerida');
  assert.equal(sia.decideLoginMode({}, 0), 'caja_requerida');
  assert.equal(sia.decideLoginMode({}, 2), 'caja');
  assert.equal(sia.CAJA_REQUERIDA.code, 'CAJA_REQUERIDA');
});

test('token SIA en rutas de venta, turno, corte, movimientos y carrito: 403 ACCESO_SIA_SIN_CAJA', () => {
  const blocked = [
    ['POST', '/api/sales'],
    ['POST', '/api/sales/'],
    ['PUT', '/api/sales/15/payment'],
    ['POST', '/api/sales/15/cancel'],
    ['POST', '/api/turno/iniciar'],
    ['POST', '/api/corte/cerrar'],
    ['POST', '/api/restricted-session/close-shift'],
    ['POST', '/api/cash-movements'],
    ['POST', '/api/ventas/carrito-cliente/cargar'],
    ['POST', '/api/connect'],
    ['POST', '/api/disconnect'],
    ['POST', '/API/SALES'],
  ];
  for (const [method, p] of blocked) {
    const res = fakeRes();
    const rejected = sia.rejectAccesoSiaWithoutCaja({ method, path: p, user: { sub: 1, scope: 'sia' } }, res);
    assert.equal(rejected, true, `${method} ${p}`);
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { code: 'ACCESO_SIA_SIN_CAJA', message: 'Esta acción requiere una caja.' });
  }
});

test('token SIA: reportes, historial, configuracion, corte manual y anular siguen permitidos', () => {
  const allowed = [
    ['GET', '/api/sales/session-history'],
    ['GET', '/api/sales/15/detail'],
    ['GET', '/api/corte/actual'],
    ['GET', '/api/corte/historial'],
    ['GET', '/api/corte/rebuild-preview'],
    ['POST', '/api/corte/merge'],
    ['POST', '/api/print/cut-rebuilt-ticket'],
    ['GET', '/api/reportes/resumen'],
    ['PUT', '/api/cajas-limit'],
    ['POST', '/api/cajas/upsert'],
    ['PUT', '/api/updateUser/'],
    ['GET', '/api/sales/15/payment'],
    ['POST', '/api/sales/15/payment/extra'],
  ];
  for (const [method, p] of allowed) {
    const res = fakeRes();
    assert.equal(sia.rejectAccesoSiaWithoutCaja({ method, path: p, user: { sub: 1, scope: 'sia' } }, res), false, `${method} ${p}`);
    assert.equal(res.body, null);
  }
});

test('token normal (sin scope) no se bloquea en rutas de caja', () => {
  for (const route of sia.ACCESO_SIA_BLOCKED_ROUTES) {
    const res = fakeRes();
    const p = route.path.replace(':saleId', '9');
    assert.equal(sia.rejectAccesoSiaWithoutCaja({ method: route.method, path: p, user: { sub: 2 } }, res), false);
    assert.equal(sia.rejectAccesoSiaWithoutCaja({ method: route.method, path: p, user: undefined }, res), false);
  }
});

test('cada ruta bloqueada existe con ese metodo y ruta en server.js o tienda_routes.js', () => {
  for (const route of sia.ACCESO_SIA_BLOCKED_ROUTES) {
    const signature = `app.${route.method.toLowerCase()}('${route.path}'`;
    assert.ok(serverSource.includes(signature) || tiendaSource.includes(signature), `falta ${signature}`);
  }
});

// --- Toda ruta que escriba en tablas de caja debe estar clasificada (bloqueada o permitida) ---
const CAJA_TABLES = ['ventas', 'detalle_venta', 'corte_caja', 'cash_movements', 'conectados'];
const CAJA_WRITE_RE = new RegExp(
  `\\b(?:INSERT\\s+(?:IGNORE\\s+)?INTO|REPLACE\\s+INTO|UPDATE|DELETE\\s+(?:\\w+\\s+)?FROM)\\s+\`?(${CAJA_TABLES.join('|')})\`?(?![\\w])`,
  'gi'
);
// Funciones auxiliares fuera de los manejadores que escriben en esas tablas. Llamar a una de
// ellas desde una ruta cuenta como escritura. La prueba siguiente exige que la lista este completa.
const CAJA_WRITE_HELPERS = {
  closeShiftCore: 'shift_close_core.js: cierra el turno en corte_caja',
  closeAbandonedShifts: 'abandoned_shift_close.js: cierra turnos abandonados (script de consola)',
};
// Funciones que escriben en esas tablas pero nunca desde una ruta (arranque del servidor).
const CAJA_WRITE_NOT_ROUTES = {
  ensureOperationalTables: 'server.js: ajuste de esquema y datos al arrancar',
};
const ROUTE_REG_RE = /^([ \t]*)(?:app|router)\.(post|put|patch|delete)\(\s*(['"`])(\/api\/[^'"`]+)\3/;
const ANY_ROUTE_REG_RE = /^[ \t]*(?:app|router)\.(?:get|post|put|patch|delete|all|use)\(/;

// Quita los comentarios de linea completa (// ...) para no contar SQL de ejemplo.
function codeLines(source) {
  return source.split('\n').map((line) => (/^\s*\/\//.test(line) ? '' : line));
}

// Rutas de escritura con su cuerpo: desde el registro hasta la siguiente sentencia del mismo
// nivel de sangria (o el siguiente registro de ruta, lo que llegue antes).
function writeRoutes(source, file) {
  const lines = codeLines(source);
  const routes = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(ROUTE_REG_RE);
    if (!match) continue;
    const indent = match[1].length;
    let end = i + 1;
    for (; end < lines.length; end += 1) {
      const line = lines[end];
      if (ANY_ROUTE_REG_RE.test(line)) break;
      if (!line.trim()) continue;
      const lineIndent = line.match(/^[ \t]*/)[0].length;
      if (lineIndent <= indent && !/^[ \t]*[})\]]/.test(line)) break;
    }
    routes.push({ file, method: match[2].toUpperCase(), path: match[4], start: i, end, body: lines.slice(i, end).join('\n') });
  }
  return routes;
}

function cajaWritesIn(body) {
  const tables = new Set();
  for (const m of body.matchAll(CAJA_WRITE_RE)) tables.add(m[1].toLowerCase());
  for (const name of Object.keys(CAJA_WRITE_HELPERS)) {
    if (new RegExp(`\\b${name}\\s*\\(`).test(body)) tables.add(`${name}()`);
  }
  return [...tables];
}

function sameRoute(a, b) {
  return a.method === b.method && a.path.toLowerCase() === b.path.toLowerCase();
}

test('el detector de escrituras reconoce SQL con y sin backticks, mayusculas y auxiliares', () => {
  assert.deepEqual(cajaWritesIn('db.query(`insert into `ventas` (x) VALUES (?)`)'), ['ventas']);
  assert.deepEqual(cajaWritesIn("db.query('UPDATE\n  detalle_venta SET x = 1')"), ['detalle_venta']);
  assert.deepEqual(cajaWritesIn("db.query('Delete From corte_caja WHERE id = ?')"), ['corte_caja']);
  assert.deepEqual(cajaWritesIn("db.query('DELETE c FROM cash_movements c')"), ['cash_movements']);
  assert.deepEqual(cajaWritesIn('await closeShiftCore({ db })'), ['closeShiftCore()']);
  assert.deepEqual(cajaWritesIn("db.query('UPDATE ventas_resumen SET x = 1'); db.query('SELECT * FROM ventas')"), []);
  const fake = [
    "app.get('/api/x', (req, res) => {});",
    "app.post('/api/nueva', async (req, res) => {",
    "  await db.query('INSERT INTO conectados (a) VALUES (?)');",
    '});',
    'async function otra() {',
    "  await db.query('UPDATE ventas SET x = 1');",
    '}',
    "  app.delete('/api/t/:id', (req, res) => borrar(req, res));",
  ].join('\n');
  const routes = writeRoutes(fake, 'fake.js');
  assert.deepEqual(routes.map((r) => [r.method, r.path, cajaWritesIn(r.body)]), [
    ['POST', '/api/nueva', ['conectados']],
    ['DELETE', '/api/t/:id', []],
  ]);
});

test('toda ruta que escribe en ventas, detalle_venta, corte_caja, cash_movements o conectados esta clasificada', () => {
  const routes = [...writeRoutes(serverSource, 'server.js'), ...writeRoutes(tiendaSource, 'tienda_routes.js')];
  assert.ok(routes.length > 50, `se esperaban muchas rutas de escritura, hay ${routes.length}`);
  const unclassified = [];
  for (const route of routes) {
    const writes = cajaWritesIn(route.body);
    if (!writes.length) continue;
    const classified = sia.ACCESO_SIA_BLOCKED_ROUTES.some((r) => sameRoute(r, route))
      || sia.ACCESO_SIA_ALLOWED_WRITE_ROUTES.some((r) => sameRoute(r, route));
    if (!classified) {
      unclassified.push(`${route.method} ${route.path} (${route.file}:${route.start + 1}) escribe en ${writes.join(', ')}`);
    }
  }
  assert.deepEqual(
    unclassified,
    [],
    'Ruta sin clasificar para Acceso SIA: agregala a ACCESO_SIA_BLOCKED_ROUTES o a '
      + 'ACCESO_SIA_ALLOWED_WRITE_ROUTES (con su motivo) en server/acceso_sia.js:\n  '
      + unclassified.join('\n  ')
  );
  for (const route of sia.ACCESO_SIA_ALLOWED_WRITE_ROUTES) {
    assert.ok(route.reason && route.reason.length > 10, `${route.method} ${route.path} necesita un motivo`);
    assert.ok(!sia.ACCESO_SIA_BLOCKED_ROUTES.some((r) => sameRoute(r, route)), `${route.method} ${route.path} esta en las dos listas`);
    assert.ok(routes.some((r) => sameRoute(r, route)), `ruta permitida inexistente: ${route.method} ${route.path}`);
  }
});

test('las escrituras en tablas de caja fuera de rutas estan en funciones auxiliares conocidas', () => {
  const serverDir = path.join(__dirname, '..', 'server');
  const files = fs.readdirSync(serverDir).filter((f) => f.endsWith('.js'));
  const known = { ...CAJA_WRITE_HELPERS, ...CAJA_WRITE_NOT_ROUTES };
  const unknown = [];
  const fnRe = /^[ \t]*(?:(?:async\s+)?function\s+(\w+)|(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?(?:function\b|\(|\w+\s*=>))/;
  for (const file of files) {
    const source = fs.readFileSync(path.join(serverDir, file), 'utf8');
    const lines = codeLines(source);
    const routes = file === 'server.js' || file === 'tienda_routes.js' ? writeRoutes(source, file) : [];
    lines.forEach((line, i) => {
      // El SQL puede seguir en la linea siguiente: `UPDATE\n  ventas`.
      const text = `${line}\n${lines[i + 1] || ''}`;
      const first = text.slice(0, line.length + 1);
      const hits = [...text.matchAll(CAJA_WRITE_RE)].filter((m) => m.index < first.length);
      if (!hits.length) return;
      if (routes.some((r) => i >= r.start && i < r.end)) return;
      let owner = null;
      for (let j = i; j >= 0 && !owner; j -= 1) {
        const m = lines[j].match(fnRe);
        if (m) owner = m[1] || m[2];
      }
      if (!owner || !known[owner]) {
        unknown.push(`${file}:${i + 1} en ${owner || '(nivel superior)'} escribe en ${hits.map((h) => h[1]).join(', ')}`);
      }
    });
  }
  assert.deepEqual(
    unknown,
    [],
    'Escritura en tabla de caja fuera de un manejador de ruta: agrega la funcion a CAJA_WRITE_HELPERS '
      + '(si una ruta la llama) o a CAJA_WRITE_NOT_ROUTES en tests/acceso-sia-backend.test.js:\n  '
      + unknown.join('\n  ')
  );
});

test('el control de token aplica el bloqueo SIA en rutas publicas y protegidas', () => {
  const start = serverSource.indexOf("app.use(async (req, res, next) => {\n  // En minusculas");
  assert.ok(start >= 0);
  const block = serverSource.slice(start, serverSource.indexOf('\n});', start));
  assert.equal((block.match(/if \(rejectAccesoSiaWithoutCaja\(req, res\)\) return undefined;/g) || []).length, 2);
  // El bloqueo va despues de verificar el token, no antes.
  assert.ok(block.lastIndexOf('rejectAccesoSiaWithoutCaja') > block.lastIndexOf('jwt.verify(token'));
});

test('sesion SIA: 8 h desde el login y token de acceso de 2 h como maximo', () => {
  assert.equal(sia.ACCESO_SIA_MAX_SESSION_SECONDS, 28800);
  assert.equal(sia.accesoSiaRemainingSeconds(0), 28800);
  assert.equal(sia.accesoSiaRemainingSeconds(28799), 1);
  assert.equal(sia.accesoSiaRemainingSeconds(28800), 0);
  assert.equal(sia.accesoSiaRemainingSeconds(40000), 0);
  assert.equal(sia.accesoSiaRemainingSeconds(null), 0);
  assert.equal(sia.accesoSiaRemainingSeconds('3600'), 25200);
  assert.equal(sia.accesoSiaRemainingSeconds(-5), 0);
  assert.equal(sia.accesoSiaRemainingSeconds('abc'), 0);
  // 24 h de token normal: el de SIA queda en 2 h; cerca del fin, en lo que queda de la sesion.
  assert.equal(sia.accesoSiaAccessTokenSeconds(86400, 28800), 7200);
  assert.equal(sia.accesoSiaAccessTokenSeconds(3600, 28800), 3600);
  assert.equal(sia.accesoSiaAccessTokenSeconds(86400, 900), 900);
  assert.equal(sia.accesoSiaAccessTokenSeconds(86400, 0), 0);
});

test('login: CAJA_REQUERIDA antes de la base; Acceso SIA solo admin_sia verificado, sin caja ni reserva', () => {
  const body = routeBody(serverSource, "app.post('/api/login'");
  const required = body.indexOf("if (loginMode === 'caja_requerida')");
  assert.ok(required > 0 && required < body.indexOf('loginGuard.beginAttempt('), 'sin caja se rechaza antes de contar intentos');
  assert.match(body, /return res\.status\(400\)\.json\(\{ \.\.\.CAJA_REQUERIDA \}\);/);
  const siaStart = body.indexOf("if (loginMode === 'acceso_sia') {");
  assert.ok(siaStart > body.indexOf('loginGuard.success(user.id, loginIp);'), 'Acceso SIA despues de validar la clave (401 igual que hoy)');
  assert.ok(siaStart > body.indexOf('if (!isUserActive(user))'), 'usuario desactivado: mismo 403 USER_DISABLED');
  const siaBlock = body.slice(siaStart, body.indexOf('let reservation = null;', siaStart));
  assert.ok(siaBlock.length > 0, 'el bloque SIA termina antes de leer la reserva local');
  assert.match(siaBlock, /if \(!isVerifiedAdminSia\(user\)\) \{\s*return res\.status\(403\)\.json\(\{ \.\.\.ACCESO_SIA_NO_AUTORIZADO \}\);/);
  assert.match(siaBlock, /acceso_sia: true,\s*numero_caja: null,/);
  assert.match(siaBlock, /createAccesoSiaRefreshSession\(/);
  assert.match(siaBlock, /permisos: buildLoginPermissions\(user\),/);
  for (const forbidden of ['cajas', 'corte_caja', 'createReservationToken', 'createRefreshSession(', 'device_caja_bindings', 'conectados']) {
    assert.ok(!siaBlock.includes(forbidden), `el Acceso SIA no debe usar ${forbidden}`);
  }
  assert.deepEqual(sia.ACCESO_SIA_NO_AUTORIZADO, { code: 'ACCESO_SIA_NO_AUTORIZADO', message: 'Acceso no autorizado.' });
});

test('refresh: conserva el scope, no alarga la sesion SIA y la vence a las 8 h', () => {
  const body = routeBody(serverSource, "app.post('/api/auth/refresh'");
  assert.match(body, /TIMESTAMPDIFF\(SECOND, created_at, NOW\(\)\) AS segundos_desde_login/);
  assert.match(body, /const accesoSia = authSession\.modo === ACCESO_SIA_SESSION_MODE;/);
  assert.match(body, /if \(accesoSia && accesoSiaRemaining <= 0\) \{[\s\S]*?status\(401\)/);
  assert.match(body, /accesoSia && !isVerifiedAdminSia\(userRows\[0\]\)/);
  const siaBlock = body.slice(body.indexOf('if (accesoSia) {'), body.indexOf('const newExpiry'));
  assert.match(siaBlock, /SET token_hash = \?, last_used_at = NOW\(\)/);
  assert.doesNotMatch(siaBlock, /expires_at\s*=/, 'el refresco SIA no cambia expires_at');
  assert.match(siaBlock, /issueAccesoSiaAccessToken\(/);
  assert.match(siaBlock, /acceso_sia: true,\s*numero_caja: null,/);
  assert.match(serverSource, /\{ sub: userId, name: String\(name \|\| ''\)\.trim\(\), scope: ACCESO_SIA_SCOPE \}/);
});

test('user_auth_sessions.modo: columna NULL con el patron de ensureOperationalTables', () => {
  assert.match(serverSource, /CREATE TABLE IF NOT EXISTS user_auth_sessions \([\s\S]*?modo VARCHAR\(20\) NULL,/);
  assert.match(serverSource, /if \(!authSessionColumns\.has\('modo'\)\) \{\s*await db\.query\('ALTER TABLE user_auth_sessions ADD COLUMN modo VARCHAR\(20\) NULL AFTER device_hash'\);/);
  assert.match(serverSource, /INSERT INTO user_auth_sessions \(user_id, token_hash, caja_id, sucursal_id, turno_id, device_hash, modo, expires_at, last_used_at\)\s*VALUES \(\?, \?, NULL, 1, NULL, NULL, \?, NOW\(\) \+ INTERVAL \? SECOND, NOW\(\)\)/);
});

test('caja 8 normal: visible en getCajas y dentro del limite de cajas activas', () => {
  const getCajas = routeBody(serverSource, "app.get('/api/getCajas'");
  assert.doesNotMatch(getCajas, /filter/);
  assert.match(serverSource, /'SELECT COUNT\(\*\) AS total FROM cajas WHERE estado = 1 AND n_caja <> \?',\s*\[cajaId\]/);
  assert.match(routeBody(serverSource, "app.get('/api/cajas-limit'"), /'SELECT COUNT\(\*\) AS total FROM cajas WHERE estado = 1'\)/);
  for (const sig of ["app.post('/api/addCaja'", "app.post('/api/cajas/upsert'", "app.delete('/api/cajas/:numero'", "app.post('/api/device-caja/bind'"]) {
    assert.doesNotMatch(routeBody(serverSource, sig), /Numero de caja no disponible|isAdminSiaBox/, sig);
  }
  assert.doesNotMatch(serverSource, /isAdminSiaBox|ADMIN_SIA_BOX_NUMBER/);
  const popup = fs.readFileSync(path.join(__dirname, '..', 'popup', 'administrar-caja.php'), 'utf8');
  assert.doesNotMatch(popup, /ADMIN_SIA_BOX_NUMBER/);
});

// --- liberar_caja_sia.js con una base falsa ---
function fakeDb({ openShifts = 0 } = {}) {
  const log = [];
  const respond = (sql) => {
    log.push(sql.replace(/\s+/g, ' ').trim());
    if (/^\s*(DELETE|UPDATE)/i.test(sql)) return [{ affectedRows: 2 }];
    if (/FROM cajas WHERE n_caja = \? LIMIT 1/.test(sql)) return [[{ n_caja: 8, nombre_caja: 'Caja 8', sucursal_id: 1, estado: 1 }]];
    if (/FROM device_caja_bindings/.test(sql)) return [[{ equipo: 'abc', nombre_caja: 'Caja 8', source: 'api_bind', last_seen: null }]];
    if (/FROM corte_caja/.test(sql) && /COUNT/.test(sql)) return [[{ total: openShifts }]];
    if (/FROM corte_caja/.test(sql)) return [[]];
    if (/COUNT\(\*\) AS total, COALESCE/.test(sql)) return [[{ total: 5, incluye_8: 1 }]];
    if (/system_business_limits/.test(sql)) return [[{ max_cajas_activas: 4 }]];
    if (/COUNT/.test(sql)) return [[{ total: 1 }]];
    return [[]];
  };
  const connection = {
    query: async (sql) => respond(sql),
    beginTransaction: async () => log.push('BEGIN'),
    commit: async () => log.push('COMMIT'),
    rollback: async () => log.push('ROLLBACK'),
    release: () => log.push('RELEASE'),
  };
  return { log, query: async (sql) => respond(sql), getConnection: async () => connection };
}

test('liberar_caja_sia: sin --aplicar solo lee', async () => {
  assert.deepEqual(parseArgs([]), { apply: false, help: false });
  assert.deepEqual(parseArgs(['--aplicar']), { apply: true, help: false });
  assert.throws(() => parseArgs(['--borrar']), /Argumento desconocido/);
  const db = fakeDb();
  const info = await previewSiaBoxRelease(db);
  assert.ok(db.log.length > 0);
  assert.ok(db.log.every((sql) => /^SELECT/i.test(sql)), db.log.join('\n'));
  assert.equal(info.bindings.length, 1);
  assert.equal(info.activeIncludesSiaBox, true);
  assert.equal(info.alreadyReleased, false);
});

test('liberar_caja_sia --aplicar: desvincula, desactiva la caja 8 y cierra sesiones; no toca turnos ni ventas', async () => {
  const db = fakeDb();
  const result = await applySiaBoxRelease(db);
  assert.deepEqual(result, { unboundDevices: 2, deactivatedBox: 2, revokedSessions: 2 });
  const writes = db.log.filter((sql) => /^(DELETE|UPDATE|INSERT)/i.test(sql));
  assert.deepEqual(writes, [
    'DELETE FROM device_caja_bindings WHERE numero_caja = ?',
    'UPDATE cajas SET estado = 0 WHERE n_caja = ? AND estado <> 0',
    'UPDATE user_auth_sessions SET revoked_at = NOW() WHERE caja_id = ? AND revoked_at IS NULL',
  ]);
  assert.ok(db.log.includes('COMMIT'));
  assert.ok(!db.log.some((sql) => /(UPDATE|DELETE)\s+(FROM\s+)?(corte_caja|ventas)/i.test(sql)));
});

test('liberar_caja_sia --aplicar: con turno abierto en la caja 8 no cambia nada', async () => {
  const db = fakeDb({ openShifts: 1 });
  await assert.rejects(applySiaBoxRelease(db), /turnos abiertos/);
  assert.ok(!db.log.some((sql) => /^(DELETE|UPDATE)/i.test(sql)));
  assert.ok(db.log.includes('ROLLBACK'));
});

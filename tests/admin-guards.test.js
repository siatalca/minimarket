const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Las rutas que cambian usuarios, cajas o los datos del negocio deben validar al administrador
// en su primera instruccion. Se revisan ambos backends (central y paquete de cajas).
const BACKENDS = [
  path.join(__dirname, '..', 'server', 'server.js'),
  path.join(__dirname, '..', 'paquete_cliente_db', 'server', 'server.js'),
];

const GUARDED_ROUTES = [
  "app.post('/api/cajeros', async (req, res) => {",
  "app.put('/api/cajeros/:id', async (req, res) => {",
  "app.delete('/api/cajeros/:id', async (req, res) => {",
  "app.post('/api/cajas/upsert', async (req, res) => {",
  "app.delete('/api/cajas/:numero', async (req, res) => {",
];

function publicRoutesBlock(source) {
  const start = source.indexOf('const publicRoutes = [');
  return source.slice(start, source.indexOf('];', start));
}

for (const file of BACKENDS) {
  const label = path.relative(path.join(__dirname, '..'), file);
  const source = fs.readFileSync(file, 'utf8');

  test(`${label}: rutas de usuarios y cajas exigen administrador`, () => {
    for (const route of GUARDED_ROUTES) {
      const start = source.indexOf(route);
      assert.ok(start >= 0, `no se encontro ${route}`);
      const firstLine = source.slice(start + route.length).trimStart().split(/\r?\n/)[0];
      assert.equal(firstLine, 'if (!(await requireAdministrator(req, res))) return;', route);
    }
  });

  test(`${label}: cajas/upsert ya no es publica`, () => {
    assert.doesNotMatch(publicRoutesBlock(source), /\/api\/cajas\/upsert/);
  });

  test(`${label}: addInfo solo queda abierta sin datos del negocio`, () => {
    const start = source.indexOf("app.post('/api/addInfo', async (req, res) => {");
    const head = source.slice(start, start + 700);
    assert.match(head, /SELECT COUNT\(\*\) AS total FROM info/);
    assert.match(head, /isInitialSetup = Number\(infoRows\[0\]\?\.total \|\| 0\) === 0;/);
    assert.match(head, /if \(!isInitialSetup && !\(await requireAdministrator\(req, res\)\)\) return;/);
  });

  test(`${label}: las rutas publicas reconocen la sesion si viene`, () => {
    assert.match(source, /if \(isPublicRoute\(req\)\) \{[\s\S]{0,400}req\.user = jwt\.verify\(optionalToken/);
  });
}

for (const file of BACKENDS) {
  const label = path.relative(path.join(__dirname, '..'), file);
  const source = fs.readFileSync(file, 'utf8');

  test(`${label}: un administrador desactivado no pasa la validacion`, () => {
    const start = source.indexOf('async function requireAdministrator(');
    const body = source.slice(start, source.indexOf('\n}', start));
    assert.match(body, /SELECT user, es_administrador, activo FROM usuarios/);
    assert.match(body, /if \(isUserActive\(row\) && \(/);
    assert.doesNotMatch(body, /estado_usuario/, 'el "conectado" no decide permisos');
  });

  test(`${label}: addInfo nunca borra la fila del negocio`, () => {
    const start = source.indexOf("app.post('/api/addInfo'");
    const handler = source.slice(start, source.indexOf("app.post('/api/addCaja'", start));
    assert.doesNotMatch(handler, /DELETE FROM info/);
    // Configuracion inicial: crea la fila 1 y rechaza la segunda configuracion simultanea.
    assert.match(handler, /if \(isInitialSetup\) \{\s*await connection\.query\(\s*`INSERT INTO info/);
    assert.match(handler, /isInitialSetup && err\?\.code === 'ER_DUP_ENTRY'/);
  });

  test(`${label}: guardar Opciones habilitadas conserva direccion y datos del dueno`, () => {
    const start = source.indexOf("app.post('/api/addInfo'");
    const handler = source.slice(start, source.indexOf("app.post('/api/addCaja'", start));
    const update = handler.slice(handler.indexOf('UPDATE info'), handler.indexOf('WHERE id_info = ?'));
    assert.ok(update.length > 0, 'debe actualizar la fila existente');
    assert.doesNotMatch(update, /direccion|dueno_/);
  });

  test(`${label}: login y registro publico tienen limite de intentos`, () => {
    assert.match(source, /require\('\.\/rate_limiter'\)/);
    // El orden importa: contar el intento antes de esperar a la base y a bcrypt.
    assert.match(source, /const ipAttempt = loginGuard\.beginAttempt\(loginIp\);/);
    assert.match(source, /const accountAttempt = loginGuard\.checkAccount\(user\.id, loginIp\);[\s\S]{0,400}bcrypt\.compare/);
    assert.match(source, /loginGuard\.success\(user\.id, loginIp\);/);
    for (const route of ["app.post('/api/addCaja', async (req, res) => {", "app.post('/api/device-caja/bind', async (req, res) => {"]) {
      const start = source.indexOf(route);
      const firstLine = source.slice(start + route.length).trimStart().split(/\r?\n/)[0];
      assert.match(firstLine, /^if \(!allowRegistrationRequest\(req, res,/, route);
    }
  });

  test(`${label}: protege admin_sia y la caja 8`, () => {
    assert.match(source, /function isAdminSiaBox\(cajaId\)/);
    assert.ok((source.match(/isAdminSiaBox\(cajaId\) && !\(await isAdminSiaUser\(req\.user\?\.sub\)\)/g) || []).length >= 4,
      'addCaja, upsert, delete y bind deben bloquear la caja 8');
    assert.match(source, /results\.filter\(\(row\) => !isAdminSiaBox\(row\.n_caja\)\)/);
    assert.match(source, /results\.filter\(\(row\) => !isAdminSiaUsername\(row\.user\)\)/);
  });

  test(`${label}: los errores 500 no devuelven el detalle interno`, () => {
    assert.doesNotMatch(source, /status\(500\)\.json\(\{ (error|message): (err|error)\.message/);
  });
}

for (const file of BACKENDS) {
  const label = path.relative(path.join(__dirname, '..'), file);
  const source = fs.readFileSync(file, 'utf8');

  test(`${label}: un usuario desactivado no inicia sesion ni renueva la sesion`, () => {
    assert.match(source, /u\.es_administrador, u\.activo,/);
    assert.match(source, /if \(!isUserActive\(user\)\) \{/);
    assert.match(source, /'SELECT id, nombre, activo FROM usuarios WHERE id = \? LIMIT 1'/);
    assert.match(source, /if \(!isUserActive\(userRows\[0\]\)\) \{/);
    assert.match(source, /async function ensureUserActiveColumn\(\)/);
  });

  test(`${label}: la ventana Cajeros escribe "activo", no el "conectado"`, () => {
    assert.match(source, /const activo = normalizeBool\(req\.body\?\.activo \?\? req\.body\?\.estado_usuario, true\)/);
    assert.match(source, /INSERT INTO usuarios \(user, nombre, contrasena, estado_usuario, activo, es_administrador\) VALUES \(\?, \?, \?, 0, \?, \?\)/);
    assert.doesNotMatch(source, /UPDATE usuarios SET user = \?, nombre = \?(, contrasena = \?)?, estado_usuario = \?/);
  });

  test(`${label}: todas las lecturas de info usan el mismo criterio`, () => {
    assert.doesNotMatch(source, /FROM info\s+ORDER BY id_info DESC/);
    assert.doesNotMatch(source, /SELECT[^`']*FROM info\s+WHERE id_info = 1/);
  });

  test(`${label}: recepcion de compras e importacion registran el movimiento`, () => {
    const receive = source.slice(source.indexOf("app.post('/api/purchase-order/receive'"));
    const receiveHandler = receive.slice(0, receive.indexOf('\napp.', 10));
    assert.match(receiveHandler, /beginTransaction/);
    assert.match(receiveHandler, /received_qty = received_qty \+ \?/);
    assert.match(receiveHandler, /recordInventoryMovement\(connection/);
    const imp = source.slice(source.indexOf("app.post('/api/productos/import'"));
    const importHandler = imp.slice(0, imp.indexOf('\napp.', 10));
    assert.match(importHandler, /FOR UPDATE/);
    assert.match(importHandler, /note: 'Importacion de productos'/);
  });

  test(`${label}: el ajuste valida la cantidad de forma estricta`, () => {
    assert.match(source, /const delta = hasDelta \? parseStrictQuantity\(body\.cantidad_delta\) : null;/);
  });
}

test('server/server.js: la anulacion usa su propio tipo de movimiento', () => {
  const source = fs.readFileSync(BACKENDS[0], 'utf8');
  assert.match(source, /type: 'anulacion'/);
  assert.match(source, /ENUM\('ajuste','modificacion','anulacion'\)/);
  assert.match(source, /async function ensureMovementTypeEnum\(\)/);
});

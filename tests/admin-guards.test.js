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
    assert.match(body, /estado_usuario/);
    assert.match(body, /Number\(row\.estado_usuario \?\? 1\) === 1/);
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

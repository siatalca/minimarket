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
    assert.match(head, /> 0 && !\(await requireAdministrator\(req, res\)\)\) return;/);
  });

  test(`${label}: las rutas publicas reconocen la sesion si viene`, () => {
    assert.match(source, /if \(isPublicRoute\(req\)\) \{[\s\S]{0,400}req\.user = jwt\.verify\(optionalToken/);
  });
}

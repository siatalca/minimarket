// Opciones de Configuración que el servidor solo deja guardar a administradores (M-045).
// Con la autorización temporal el token sigue siendo del cajero: esas opciones se ocultan y no se abren.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const guard = require('../js/config_admin_guard');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function memoryStorage(values = {}) {
  return { getItem: (key) => (Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : null) };
}

test('rol de la sesión: cajero, administrador y admin_sia', () => {
  assert.deepEqual(guard.readSessionRole(memoryStorage({ user: 'caja1', user_is_admin: '0' })), { isAdmin: false, isAdminSia: false });
  assert.deepEqual(guard.readSessionRole(memoryStorage({ user: 'jefa', user_is_admin: '1' })), { isAdmin: true, isAdminSia: false });
  assert.deepEqual(guard.readSessionRole(memoryStorage({ user: 'ADMIN_SIA' })), { isAdmin: true, isAdminSia: true });
  assert.deepEqual(
    guard.readSessionRole(memoryStorage({ user: 'otro', user_profile: JSON.stringify({ username_login: 'admin_sia' }) })),
    { isAdmin: true, isAdminSia: true },
  );
  // Perfil dañado o almacenamiento que falla: no da permisos.
  assert.deepEqual(guard.readSessionRole(memoryStorage({ user_profile: '{roto' })), { isAdmin: false, isAdminSia: false });
  assert.deepEqual(guard.readSessionRole({ getItem: () => { throw new Error('bloqueado'); } }), { isAdmin: false, isAdminSia: false });
});

test('cajero con autorización temporal no abre opciones protegidas; sí las demás', () => {
  const cajero = { isAdmin: false, isAdminSia: false };
  for (const ref of ['cajero', 'administrar-caja', 'opciones-Habilitadas', 'clientes-app']) {
    const result = guard.checkConfigPopupAccess(ref, cajero);
    assert.equal(result.allowed, false, ref);
    assert.equal(result.message, guard.MESSAGE_ADMIN);
  }
  for (const ref of ['datos-negocio', 'notificar-correo', 'respaldo-automatico']) {
    assert.equal(guard.checkConfigPopupAccess(ref, cajero).message, guard.MESSAGE_ADMIN_SIA, ref);
  }
  for (const ref of ['ticket', 'impresora', 'sucursales', 'base-datos', 'forma-pago', 'qr-consulta']) {
    assert.equal(guard.checkConfigPopupAccess(ref, cajero).allowed, true, ref);
  }
});

test('administrador real abre todo menos lo de admin_sia; admin_sia abre todo', () => {
  const admin = { isAdmin: true, isAdminSia: false };
  const sia = { isAdmin: true, isAdminSia: true };
  for (const ref of Object.keys(guard.POPUP_REQUIRED_ROLE)) {
    const expected = guard.POPUP_REQUIRED_ROLE[ref] === 'admin';
    assert.equal(guard.checkConfigPopupAccess(ref, admin).allowed, expected, ref);
    assert.equal(guard.checkConfigPopupAccess(ref, sia).allowed, true, ref);
  }
});

test('un 403 al guardar se muestra como aviso claro, no como error crudo', () => {
  assert.equal(guard.describeSaveError(403, 'Solo un administrador puede realizar esta accion', 'x'), guard.MESSAGE_ADMIN);
  assert.equal(guard.describeSaveError(500, 'Fallo interno', 'x'), 'Fallo interno');
  assert.equal(guard.describeSaveError(400, '', 'No se pudo guardar la politica'), 'No se pudo guardar la politica');
});

test('las opciones ocultas en Configuración coinciden con la guarda', () => {
  const html = read('content/configuracion.php');
  const items = [...html.matchAll(/<li class="panel-item"([^>]*)onclick="open_w\('([^']+)'\)"/g)];
  assert.ok(items.length > 10, 'se esperaban las opciones de Configuración');
  for (const [, attrs, ref] of items) {
    const expected = /data-admin-sia-only="1"/.test(attrs) ? 'admin_sia' : /data-admin-only="1"/.test(attrs) ? 'admin' : null;
    assert.equal(guard.requiredRoleForPopup(ref), expected, `opción ${ref}`);
  }
});

test('cada popup protegido se bloquea también al abrirlo por URL, antes de sus otros scripts', () => {
  for (const ref of Object.keys(guard.POPUP_REQUIRED_ROLE)) {
    const html = read(`popup/${ref}.php`);
    const head = html.slice(0, html.indexOf('</head>'));
    const guardAt = head.indexOf(`MinimarketConfigGuard.guardPopupPage('${ref}')`);
    assert.ok(guardAt > 0, `${ref} debe llamar a guardPopupPage en el <head>`);
    const firstOtherScript = head.search(/<script src="\.\.\/js\/(?!config_admin_guard)/);
    assert.ok(firstOtherScript === -1 || guardAt < firstOtherScript, `${ref}: la guarda va antes que los demás scripts`);
  }
});

test('los endpoints de guardado de esas opciones siguen protegidos en el servidor', () => {
  const server = read('server/server.js');
  const guarded = (method, route, fn) => {
    const start = server.indexOf(`app.${method}('${route}'`);
    assert.ok(start >= 0, `no se encontró ${method.toUpperCase()} ${route}`);
    const body = server.slice(start, start + 1500);
    assert.match(body, new RegExp(`${fn}\\(req, res\\)`), `${method.toUpperCase()} ${route} debe usar ${fn}`);
  };
  guarded('post', '/api/addInfo', 'requireAdministrator');
  guarded('post', '/api/cajeros', 'requireAdministrator');
  guarded('put', '/api/cajeros/:id', 'requireAdministrator');
  guarded('delete', '/api/cajeros/:id', 'requireAdministrator');
  guarded('post', '/api/cajas/upsert', 'requireAdministrator');
  guarded('delete', '/api/cajas/:numero', 'requireAdministrator');
  guarded('put', '/api/sale-receipt-policy', 'requireAdministrator');
  guarded('put', '/api/business-owner-settings', 'requireAdminSia');
  guarded('put', '/api/service-email-settings', 'requireAdminSia');
  guarded('put', '/api/admin/automatic-backup-settings', 'requireAdminSia');
});

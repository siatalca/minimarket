const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const accesoSia = require('../js/acceso_sia');
const { clearLocalAuth } = require('../js/session_reservation');

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    snapshot() { return Object.fromEntries(values.entries()); },
  };
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

const validLogin = {
  id: 1,
  username: 'Soporte SIA',
  token: 'access',
  refresh_token: 'refresh',
  es_administrador: 1,
  permisos: {},
  acceso_sia: true,
  numero_caja: null,
};

test('el cuerpo del login SIA lleva acceso_sia y no lleva caja, reserva ni equipo', async () => {
  let sent = null;
  const result = await accesoSia.requestLogin({
    fetchImpl: async (url, init) => {
      sent = { url, init };
      return jsonResponse(200, validLogin);
    },
    apiUrl: 'http://api/',
    username: '  admin_sia ',
    password: 'clave',
  });
  assert.equal(result.ok, true);
  assert.equal(sent.url, 'http://api/api/login');
  const body = JSON.parse(sent.init.body);
  assert.deepEqual(body, { username: 'admin_sia', password: 'clave', acceso_sia: true });
  for (const key of ['numero_caja', 'device_hash', 'reservation_token']) {
    assert.equal(Object.prototype.hasOwnProperty.call(body, key), false, key);
  }
});

test('mensajes claros para 401 y 403 del contrato', async () => {
  const run = (status, body) => accesoSia.requestLogin({
    fetchImpl: async () => jsonResponse(status, body),
    apiUrl: '/',
    username: 'x',
    password: 'y',
  });
  assert.deepEqual(await run(401, { message: 'Credenciales inválidas' }), {
    ok: false, message: 'Usuario o contraseña incorrecta.',
  });
  const denied = await run(403, { code: 'ACCESO_SIA_NO_AUTORIZADO', message: 'Acceso no autorizado.' });
  assert.equal(denied.ok, false);
  assert.match(denied.message, /^Acceso no autorizado\./);
  assert.match(denied.message, /soporte SIA/);
});

test('sin usuario o clave no se llama al servidor', async () => {
  let called = false;
  const result = await accesoSia.requestLogin({
    fetchImpl: async () => { called = true; return jsonResponse(200, validLogin); },
    apiUrl: '/', username: ' ', password: '',
  });
  assert.equal(called, false);
  assert.equal(result.ok, false);
  assert.equal(result.message, 'Debes ingresar usuario y contraseña.');
});

test('una respuesta 200 sin la forma del contrato es error, no sesión', async () => {
  const cases = [
    { ...validLogin, acceso_sia: undefined },
    { ...validLogin, numero_caja: 8 },
    { ...validLogin, token: '' },
    { ...validLogin, refresh_token: undefined },
    { ...validLogin, id: 0 },
    null,
  ];
  for (const body of cases) {
    const result = await accesoSia.requestLogin({
      fetchImpl: async () => jsonResponse(200, body),
      apiUrl: '/', username: 'admin_sia', password: 'clave',
    });
    assert.equal(result.ok, false, JSON.stringify(body));
    assert.match(result.message, /Respuesta inesperada/);
  }
});

test('fallo de red muestra error de conexión', async () => {
  const result = await accesoSia.requestLogin({
    fetchImpl: async () => { throw new Error('offline'); },
    apiUrl: '/', username: 'admin_sia', password: 'clave',
  });
  assert.deepEqual(result, { ok: false, message: 'No se pudo conectar con el servidor de login.' });
});

test('marcar la sesión quita n_caja y la devuelve al cerrar', () => {
  const local = memoryStorage({ n_caja: '3', nombre_caja: 'Caja 3' });
  accesoSia.markSession(local);
  assert.equal(accesoSia.isAccesoSiaSession(local), true);
  assert.equal(local.getItem('n_caja'), null);
  assert.equal(local.getItem(accesoSia.PREVIOUS_CAJA_KEY), '3');
  accesoSia.clearSession(local);
  assert.equal(accesoSia.isAccesoSiaSession(local), false);
  assert.deepEqual(local.snapshot(), { n_caja: '3', nombre_caja: 'Caja 3' });
});

test('en un equipo sin caja la marca no inventa caja', () => {
  const local = memoryStorage();
  accesoSia.markSession(local);
  assert.deepEqual(local.snapshot(), { acceso_sia: '1' });
  accesoSia.clearSession(local);
  assert.deepEqual(local.snapshot(), {});
});

test('recuperar la caja previa no pisa una caja ya asignada', () => {
  const local = memoryStorage({ n_caja: '5', [accesoSia.PREVIOUS_CAJA_KEY]: '3', acceso_sia: '1' });
  accesoSia.restorePreviousCaja(local);
  assert.deepEqual(local.snapshot(), { n_caja: '5', acceso_sia: '1' });
});

test('limpiar la autenticación local también quita la marca de Acceso SIA', () => {
  const local = memoryStorage({ acceso_sia: '1', token: 't' });
  clearLocalAuth(local, memoryStorage());
  assert.equal(accesoSia.isAccesoSiaSession(local), false);
});

test('reconoce el 403 ACCESO_SIA_SIN_CAJA y nada más', () => {
  assert.equal(accesoSia.isSinCajaError(403, { code: 'ACCESO_SIA_SIN_CAJA' }), true);
  assert.equal(accesoSia.isSinCajaError(403, { code: 'OTRO' }), false);
  assert.equal(accesoSia.isSinCajaError(401, { code: 'ACCESO_SIA_SIN_CAJA' }), false);
});

function fakeDocument() {
  const elements = new Map();
  const make = (tag) => {
    const classes = new Set();
    const el = {
      tagName: tag, id: '', className: '', title: '', textContent: '', children: [], attrs: {},
      classList: {
        add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c),
      },
      setAttribute(name, value) { this.attrs[name] = value; },
      appendChild(child) { this.children.push(child); if (child.id) elements.set(child.id, child); return child; },
      set innerHTML(_) { throw new Error('innerHTML no debe usarse'); },
    };
    return el;
  };
  const body = make('body');
  const brand = make('div');
  return {
    body,
    brand,
    createElement: make,
    getElementById: (id) => elements.get(id) || null,
    querySelector: (sel) => (sel === '.header-brand' ? brand : null),
  };
}

test('el home en Acceso SIA marca el body y muestra el aviso una sola vez', () => {
  const doc = fakeDocument();
  accesoSia.applyHomeMode(doc);
  accesoSia.applyHomeMode(doc);
  assert.equal(doc.body.classList.contains('acceso-sia-mode'), true);
  assert.equal(doc.brand.children.length, 1);
  assert.equal(doc.brand.children[0].textContent, 'Acceso SIA · sin caja');
});

test('el aviso de acción sin caja usa textContent', () => {
  const doc = fakeDocument();
  accesoSia.showSinCajaNotice(doc, '<b>Esta acción requiere una caja.</b>');
  const notice = doc.getElementById('acceso-sia-notice');
  assert.equal(notice.textContent, '<b>Esta acción requiere una caja.</b> El Acceso SIA no tiene caja.');
  assert.equal(notice.attrs.role, 'status');
});

test('el login muestra el enlace Acceso SIA en el formulario y en Agregar Caja Nueva', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.php'), 'utf8');
  const section = (id) => {
    const start = html.indexOf(`<div id="${id}"`);
    assert.ok(start >= 0, id);
    const end = html.indexOf('<!--fin', start);
    return html.slice(start, end);
  };
  assert.match(section('login'), /data-acceso-sia-open[^>]*>Acceso SIA</);
  assert.match(section('add-caja'), /data-acceso-sia-open[^>]*>Acceso SIA</);
  assert.match(html, /<label for="acceso-sia-username"/);
  assert.match(html, /<label for="acceso-sia-password"/);
});

test('el home oculta ventas y acciones de caja en Acceso SIA', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'styleshome.css'), 'utf8');
  for (const selector of ['#nav-sales-btn', '#sales', '#cut-close-shift-btn', '#cut-load-session-btn', '#cut-load-day-btn']) {
    assert.ok(css.includes(`body.acceso-sia-mode ${selector}`), selector);
  }
  const logout = fs.readFileSync(path.join(__dirname, '..', 'js', 'logout.js'), 'utf8');
  const siaBranch = logout.indexOf('isAccesoSiaSession(localStorage)) {');
  const shiftDialog = logout.indexOf('Dejar turno abierto');
  assert.ok(siaBranch > 0 && siaBranch < shiftDialog, 'la salida SIA va antes del diálogo de turno');
});

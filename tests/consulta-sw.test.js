// Service worker de /consulta/ (M-037): se ejecuta en un entorno simulado porque la vista previa no permite
// registrar service workers. Revisa que la estructura se guarde y que /api/ nunca pase por el SW.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadSw() {
  const listeners = {};
  const store = new Map();
  const cache = {
    addAll: async (urls) => urls.forEach((u) => store.set(new URL(u, 'https://tienda.cl/consulta/sw.js').href, 'cached')),
    put: async (req, res) => store.set(req.url, res),
  };
  const ctx = {
    URL,
    Response: { error: () => 'error' },
    self: {
      location: new URL('https://tienda.cl/consulta/sw.js'),
      addEventListener: (type, fn) => { listeners[type] = fn; },
      skipWaiting: async () => {},
      clients: { claim: async () => {} },
    },
    caches: {
      open: async () => cache,
      keys: async () => ['consulta-viejo', 'otra-app'],
      delete: async (key) => { ctx.deleted.push(key); return true; },
      match: async (req) => store.get(typeof req === 'string' ? new URL(req, 'https://tienda.cl/consulta/sw.js').href : req.url),
    },
    fetch: async () => { throw new Error('sin red'); },
    deleted: [],
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'consulta', 'sw.js'), 'utf8'), ctx);
  return { listeners, store, ctx };
}

function fetchEvent(url, mode = 'cors', method = 'GET') {
  const ev = { request: { url, method, mode }, responded: null, respondWith(p) { this.responded = p; } };
  return ev;
}

test('install guarda la estructura y activate borra solo cachés viejas de la consulta', async () => {
  const { listeners, store, ctx } = loadSw();
  let p;
  listeners.install({ waitUntil: (x) => { p = x; } });
  await p;
  assert.ok(store.has('https://tienda.cl/consulta/'));
  assert.ok(store.has('https://tienda.cl/js/camera_barcode_scanner.js?v=20261116b'));
  assert.ok(![...store.keys()].some((k) => k.includes('/api/')));
  listeners.activate({ waitUntil: (x) => { p = x; } });
  await p;
  assert.deepEqual(ctx.deleted, ['consulta-viejo']);
});

test('fetch nunca intercepta /api/, otros dominios ni POST', () => {
  const { listeners } = loadSw();
  for (const ev of [
    fetchEvent('https://tienda.cl/api/tienda/producto?codigo=1'),
    fetchEvent('https://accounts.google.com/gsi/client'),
    fetchEvent('https://tienda.cl/consulta/', 'navigate', 'POST'),
    fetchEvent('https://tienda.cl/home.php'),
  ]) {
    listeners.fetch(ev);
    assert.equal(ev.responded, null, ev.request.url);
  }
});

test('sin red la navegación usa la página guardada', async () => {
  const { listeners } = loadSw();
  let p;
  listeners.install({ waitUntil: (x) => { p = x; } });
  await p;
  const nav = fetchEvent('https://tienda.cl/consulta/?utm=qr', 'navigate');
  listeners.fetch(nav);
  assert.equal(await nav.responded, 'cached');
  const missing = fetchEvent('https://tienda.cl/consulta/otro.js');
  listeners.fetch(missing);
  assert.equal(await missing.responded, 'error', 'un archivo no guardado no recibe la página HTML');
});

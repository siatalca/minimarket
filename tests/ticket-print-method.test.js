const test = require('node:test');
const assert = require('node:assert/strict');

const store = new Map();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
  },
});

const print = require('../js/ticket_print_method.js');

test('por defecto usa el puente local', () => {
  store.clear();
  assert.equal(print.getMethod(), 'bridge');
  assert.equal(print.isBrowserMethod(), false);
});

test('guarda el metodo navegador y descarta valores desconocidos', () => {
  store.clear();
  assert.equal(print.setMethod('browser'), 'browser');
  assert.equal(print.isBrowserMethod(), true);
  assert.equal(print.setMethod('impresora-magica'), 'bridge');
  assert.equal(print.getMethod(), 'bridge');
});

test('el parametro ?impresion= del acceso directo fija el metodo', () => {
  store.clear();
  assert.equal(print.applyMethodFromUrl(new URL('https://minimarket.siacore.cl/?impresion=navegador')), 'browser');
  assert.equal(print.getMethod(), 'browser');
  assert.equal(print.applyMethodFromUrl(new URL('https://minimarket.siacore.cl/?impresion=puente')), 'bridge');
  assert.equal(print.getMethod(), 'bridge');
});

test('sin parametro o con valor invalido no cambia el metodo guardado', () => {
  store.clear();
  print.setMethod('browser');
  assert.equal(print.applyMethodFromUrl(new URL('https://minimarket.siacore.cl/home.php')), null);
  assert.equal(print.applyMethodFromUrl(new URL('https://minimarket.siacore.cl/?impresion=otra')), null);
  assert.equal(print.getMethod(), 'browser');
});

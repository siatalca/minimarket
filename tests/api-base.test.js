const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveApiBase, resolveLocalApiFallback } = require('../js/api_base.js');

function locationOf(url) {
  return new URL(url);
}

test('usa el mismo origen para un dominio publico', () => {
  assert.equal(
    resolveApiBase({ location: locationOf('https://minimarket.siacore.cl/panel') }),
    'https://minimarket.siacore.cl/',
  );
});

test('conserva el backend local en puerto 3002 para localhost e IP loopback', () => {
  assert.equal(resolveApiBase({ location: locationOf('http://localhost/app') }), 'http://localhost:3002/');
  assert.equal(resolveApiBase({ location: locationOf('http://127.0.0.1/app') }), 'http://127.0.0.1:3002/');
  assert.equal(resolveApiBase({ location: locationOf('http://[::1]/app') }), 'http://[::1]:3002/');
});

test('respeta el origen cuando la pagina local ya corre en 3002', () => {
  assert.equal(resolveApiBase({ location: locationOf('http://localhost:3002/app') }), 'http://localhost:3002/');
});

test('normaliza overrides HTTP validos', () => {
  assert.equal(
    resolveApiBase({ location: locationOf('https://minimarket.siacore.cl/'), override: 'https://api.example.com/base' }),
    'https://api.example.com/base/',
  );
  assert.equal(
    resolveApiBase({ location: locationOf('http://localhost/'), override: '/backend' }),
    'http://localhost/backend/',
  );
});

test('rechaza protocolos inseguros y loopback remoto desde un dominio publico', () => {
  assert.equal(
    resolveApiBase({ location: locationOf('https://minimarket.siacore.cl/'), override: 'javascript:alert(1)' }),
    'https://minimarket.siacore.cl/',
  );
  assert.equal(
    resolveApiBase({ location: locationOf('https://minimarket.siacore.cl/'), override: 'http://127.0.0.1:3002' }),
    'https://minimarket.siacore.cl/',
  );
});

test('solo ofrece fallback local en hosts loopback', () => {
  assert.equal(resolveLocalApiFallback(locationOf('https://minimarket.siacore.cl/')), null);
  assert.equal(resolveLocalApiFallback(locationOf('http://localhost/app')), 'http://localhost:3002/');
  assert.equal(resolveLocalApiFallback(locationOf('http://[::1]/app')), 'http://[::1]:3002/');
});

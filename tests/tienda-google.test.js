const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const jwt = require('../server/node_modules/jsonwebtoken');

const { createGoogleVerifier, GoogleAuthError, parseMaxAgeMs } = require('../server/tienda_google.js');

const CLIENT_ID = 'cliente-prueba.apps.googleusercontent.com';
const T0 = Date.parse('2026-11-18T12:00:00Z');

function makeKey(kid) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid, alg: 'RS256', use: 'sig' };
  return { privateKey, jwk, kid };
}

const keyA = makeKey('kid-a');
const keyB = makeKey('kid-b');
const keyOther = makeKey('kid-a');

function sign(payloadOverrides = {}, { key = keyA, kid = key.kid, algorithm = 'RS256', secret } = {}) {
  const payload = {
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    sub: '1234567890',
    email: 'Ana@Correo.CL',
    email_verified: true,
    name: 'Ana Perez',
    iat: Math.floor(T0 / 1000) - 10,
    exp: Math.floor(T0 / 1000) + 3600,
    ...payloadOverrides,
  };
  return jwt.sign(payload, secret || key.privateKey, { algorithm, keyid: kid, noTimestamp: true });
}

function setup({ keys = [keyA.jwk], now = () => T0, fetchFails = false } = {}) {
  const calls = { count: 0 };
  let current = keys;
  const verifier = createGoogleVerifier({
    clientId: CLIENT_ID,
    now,
    fetchJwks: async () => {
      calls.count += 1;
      if (fetchFails) throw new Error('sin red');
      return { keys: current, maxAgeMs: 60 * 60 * 1000 };
    },
  });
  return { verifier, calls, setKeys: (k) => { current = k; } };
}

async function rejectsWith(promise, code) {
  await assert.rejects(promise, (err) => err instanceof GoogleAuthError && err.code === code);
}

test('acepta un ID token valido y devuelve sub, correo en minusculas y nombre', async () => {
  const { verifier } = setup();
  const result = await verifier.verify(sign());
  assert.deepEqual(result, { sub: '1234567890', email: 'ana@correo.cl', name: 'Ana Perez' });
});

test('acepta iss sin https', async () => {
  const { verifier } = setup();
  assert.equal((await verifier.verify(sign({ iss: 'accounts.google.com' }))).sub, '1234567890');
});

test('rechaza aud distinto, iss ajeno, vencido y correo no verificado', async () => {
  const { verifier } = setup();
  await rejectsWith(verifier.verify(sign({ aud: 'otro-cliente' })), 'GOOGLE_INVALID');
  await rejectsWith(verifier.verify(sign({ iss: 'https://evil.example' })), 'GOOGLE_INVALID');
  await rejectsWith(verifier.verify(sign({ exp: Math.floor(T0 / 1000) - 120 })), 'GOOGLE_INVALID');
  await rejectsWith(verifier.verify(sign({ email_verified: false })), 'GOOGLE_INVALID');
  await rejectsWith(verifier.verify(sign({ email: undefined })), 'GOOGLE_INVALID');
});

test('rechaza firma con otra llave del mismo kid y HS256', async () => {
  const { verifier } = setup();
  await rejectsWith(verifier.verify(sign({}, { key: keyOther })), 'GOOGLE_INVALID');
  await rejectsWith(verifier.verify(sign({}, { kid: 'kid-a', algorithm: 'HS256', secret: 'secreto' })), 'GOOGLE_INVALID');
  // alg none
  const unsigned = jwt.sign({ sub: 'x', aud: CLIENT_ID }, null, { algorithm: 'none', keyid: 'kid-a' });
  await rejectsWith(verifier.verify(unsigned), 'GOOGLE_INVALID');
});

test('rechaza credenciales mal formadas sin consultar a Google', async () => {
  const { verifier, calls } = setup();
  for (const bad of [undefined, '', 'abc', 'a.b.c', 'x'.repeat(5000), 42]) {
    await rejectsWith(verifier.verify(bad), 'GOOGLE_INVALID');
  }
  assert.equal(calls.count, 0);
});

test('las llaves quedan en cache; un kid nuevo recarga como maximo una vez por minuto', async () => {
  let t = T0;
  const { verifier, calls, setKeys } = setup({ now: () => t });
  await verifier.verify(sign());
  await verifier.verify(sign());
  assert.equal(calls.count, 1, 'segunda verificacion usa la cache');

  // Google rota: aparece kid-b. El primer pedido con kid-b recarga.
  setKeys([keyA.jwk, keyB.jwk]);
  t += 2 * 60 * 1000;
  assert.equal((await verifier.verify(sign({}, { key: keyB }))).sub, '1234567890');
  assert.equal(calls.count, 2);

  // Un kid desconocido no fuerza otra recarga dentro del mismo minuto.
  await rejectsWith(verifier.verify(sign({}, { key: makeKey('kid-z') })), 'GOOGLE_INVALID');
  assert.equal(calls.count, 2);
});

test('si Google no responde: GOOGLE_UNAVAILABLE (503)', async () => {
  const { verifier } = setup({ fetchFails: true });
  await assert.rejects(verifier.verify(sign()), (err) => err.code === 'GOOGLE_UNAVAILABLE' && err.status === 503);
});

test('sin client id configurado no acepta nada', async () => {
  const verifier = createGoogleVerifier({ clientId: null, fetchJwks: async () => ({ keys: [keyA.jwk] }) });
  await rejectsWith(verifier.verify(sign()), 'GOOGLE_INVALID');
});

test('parseMaxAgeMs lee Cache-Control', () => {
  assert.equal(parseMaxAgeMs('public, max-age=19302, must-revalidate'), 19302000);
  assert.equal(parseMaxAgeMs(''), null);
});

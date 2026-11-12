const test = require('node:test');
const assert = require('node:assert/strict');

const { createRateLimiter, retryAfterSeconds } = require('../server/rate_limiter.js');

function clock(start = 1000) {
  let t = start;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

test('permite hasta el maximo y bloquea el siguiente', () => {
  const c = clock();
  const limiter = createRateLimiter({ max: 3, windowMs: 60000, now: c.now });
  assert.equal(limiter.hit('admin_sia'), true);
  assert.equal(limiter.hit('admin_sia'), true);
  assert.equal(limiter.retryAfterMs('admin_sia'), 0);
  assert.equal(limiter.hit('admin_sia'), true);
  assert.ok(limiter.retryAfterMs('admin_sia') > 0, 'al llegar al maximo queda bloqueado');
  assert.equal(limiter.hit('admin_sia'), false);
});

test('las claves son independientes', () => {
  const c = clock();
  const limiter = createRateLimiter({ max: 1, windowMs: 60000, now: c.now });
  limiter.hit('a');
  assert.ok(limiter.retryAfterMs('a') > 0);
  assert.equal(limiter.retryAfterMs('b'), 0);
});

test('el bloqueo vence al terminar la ventana', () => {
  const c = clock();
  const limiter = createRateLimiter({ max: 2, windowMs: 60000, now: c.now });
  limiter.hit('x');
  limiter.hit('x');
  c.advance(30000);
  assert.equal(limiter.retryAfterMs('x'), 30000);
  c.advance(30000);
  assert.equal(limiter.retryAfterMs('x'), 0);
  assert.equal(limiter.hit('x'), true, 'parte de cero');
});

test('reset limpia la clave (login exitoso)', () => {
  const c = clock();
  const limiter = createRateLimiter({ max: 2, windowMs: 60000, now: c.now });
  limiter.hit('u');
  limiter.hit('u');
  limiter.reset('u');
  assert.equal(limiter.retryAfterMs('u'), 0);
});

test('acota la memoria cuando hay demasiadas claves', () => {
  const c = clock();
  const limiter = createRateLimiter({ max: 5, windowMs: 60000, now: c.now, maxKeys: 3 });
  ['a', 'b', 'c', 'd', 'e'].forEach((k) => limiter.hit(k));
  assert.equal(limiter.retryAfterMs('a'), 0, 'la clave mas antigua se descarta');
});

test('retryAfterSeconds redondea hacia arriba y nunca es 0', () => {
  assert.equal(retryAfterSeconds(1), 1);
  assert.equal(retryAfterSeconds(61000), 61);
  assert.equal(retryAfterSeconds(0), 1);
});

test('rechaza configuraciones invalidas', () => {
  assert.throws(() => createRateLimiter({ max: 0, windowMs: 1000 }));
  assert.throws(() => createRateLimiter({ max: 3, windowMs: 0 }));
});

const { createLoginGuard, clientIpKey, loginBlockedMessage } = require('../server/rate_limiter.js');

test('login: 500 intentos simultaneos contra una cuenta solo prueban 8 claves', () => {
  const c = clock();
  const guard = createLoginGuard({ now: c.now });
  let comparadas = 0;
  // Simula el orden real: todos pasan beginAttempt y la consulta antes de que alguno termine.
  const ips = Array.from({ length: 500 }, (_, i) => `200.1.${Math.floor(i / 250)}.${i % 250}`);
  for (const ip of ips) {
    if (!guard.beginAttempt(ip).ok) continue;
    if (guard.checkAccount(7, ip).ok) comparadas += 1;
  }
  assert.ok(comparadas <= 50, `limite por cuenta repartido en muchas IP (comparadas: ${comparadas})`);
  const unaIp = createLoginGuard({ now: c.now });
  let desdeUnaIp = 0;
  for (let i = 0; i < 500; i += 1) {
    if (unaIp.beginAttempt('200.9.9.9').ok && unaIp.checkAccount(7, '200.9.9.9').ok) desdeUnaIp += 1;
  }
  assert.equal(desdeUnaIp, 8, 'desde una sola IP solo 8 intentos llegan a comparar la clave');
});

test('login: un tercero no puede bloquear la cuenta de otro desde su IP', () => {
  const c = clock();
  const guard = createLoginGuard({ now: c.now });
  for (let i = 0; i < 20; i += 1) {
    guard.beginAttempt('5.5.5.5');
    guard.checkAccount(1, '5.5.5.5');
  }
  assert.equal(guard.checkAccount(1, '5.5.5.5').ok, false, 'el atacante queda bloqueado');
  assert.equal(guard.beginAttempt('181.2.3.4').ok, true);
  assert.equal(guard.checkAccount(1, '181.2.3.4').ok, true, 'el dueno entra desde su local');
});

test('login: el limite es por cuenta (id), no por el texto escrito', () => {
  const c = clock();
  const guard = createLoginGuard({ now: c.now });
  // "admin_sia", "ADMIN_SIA" o su nombre visible resuelven al mismo id: un solo contador.
  for (let i = 0; i < 8; i += 1) guard.checkAccount(42, '9.9.9.9');
  assert.equal(guard.checkAccount(42, '9.9.9.9').ok, false);
});

test('login: sin IP conocida limita solo por cuenta', () => {
  const c = clock();
  const guard = createLoginGuard({ now: c.now });
  assert.equal(guard.beginAttempt(null).ok, true, 'sin IP no hay limite por IP');
  for (let i = 0; i < 8; i += 1) assert.equal(guard.checkAccount(3, null).ok, true);
  assert.equal(guard.checkAccount(3, null).ok, false);
});

test('login: un ingreso correcto limpia la cuenta y no castiga la IP compartida del local', () => {
  const c = clock();
  const guard = createLoginGuard({ now: c.now, perIpMax: 3 });
  for (let i = 0; i < 10; i += 1) {
    assert.equal(guard.beginAttempt('190.5.5.5').ok, true, `login ${i} del local`);
    guard.checkAccount(i, '190.5.5.5');
    guard.success(i, '190.5.5.5');
  }
  guard.beginAttempt('190.5.5.5');
  guard.checkAccount(1, '190.5.5.5');
  guard.checkAccount(1, '190.5.5.5');
  guard.success(1, '190.5.5.5');
  assert.equal(guard.checkAccount(1, '190.5.5.5').ok, true);
});

test('login: el bloqueo vence a los 15 minutos', () => {
  const c = clock();
  const guard = createLoginGuard({ now: c.now });
  for (let i = 0; i < 9; i += 1) guard.checkAccount(5, '8.8.4.4');
  const blocked = guard.checkAccount(5, '8.8.4.4');
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryMs > 0 && blocked.retryMs <= 15 * 60 * 1000);
  c.advance(15 * 60 * 1000);
  assert.equal(guard.checkAccount(5, '8.8.4.4').ok, true);
});

test('clientIpKey ignora loopback y quita el prefijo IPv4 mapeado', () => {
  assert.equal(clientIpKey({ ip: '127.0.0.1' }), null);
  assert.equal(clientIpKey({ ip: '::1' }), null);
  assert.equal(clientIpKey({ ip: '::ffff:181.43.2.10' }), '181.43.2.10');
  assert.equal(clientIpKey({}), null);
});

test('loginBlockedMessage indica los minutos restantes', () => {
  assert.equal(loginBlockedMessage(30000), 'Demasiados intentos fallidos. Intenta de nuevo en 1 minuto.');
  assert.equal(loginBlockedMessage(14 * 60000 + 1), 'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.');
});

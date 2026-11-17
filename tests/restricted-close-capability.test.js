const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createRestrictedCloseCapability,
  verifyRestrictedCloseCapability,
  RestrictedCloseReplayGuard,
  isCapabilityAdminStillValid,
  shouldIssueRestrictedCloseCapability,
} = require('../server/session_reservation_policy');
const jwt = require('../server/node_modules/jsonwebtoken');

const secret = 'capability-test-secret';

function input(cajaId) {
  return {
    adminId: 1,
    adminLogin: 'admin_sia',
    adminRole: 1,
    cajaId,
    shiftId: cajaId * 100,
    ownerId: cajaId + 20,
    deviceHash: `device-${cajaId}`,
    reservationToken: `reservation-${cajaId}`,
  };
}

test('capacidad restringida queda ligada a admin, caja, turno, dueño, equipo y reserva', () => {
  for (const cajaId of [2, 8]) {
    const token = createRestrictedCloseCapability(input(cajaId), { secret, expiresIn: '5m', jwtId: `jti-${cajaId}` });
    const claims = verifyRestrictedCloseCapability(token, {
      secret,
      expectedAdminId: 1,
      expectedCajaId: cajaId,
      expectedShiftId: cajaId * 100,
      expectedOwnerId: cajaId + 20,
      expectedDeviceHash: `device-${cajaId}`,
      expectedReservationToken: `reservation-${cajaId}`,
    });
    assert.equal(claims.cajaId, cajaId);
    assert.equal(claims.jti, `jti-${cajaId}`);
  }
});

test('rechaza uso cruzado entre cajas o reservas', () => {
  const token = createRestrictedCloseCapability(input(2), { secret, expiresIn: '5m', jwtId: 'jti-scope' });
  assert.throws(() => verifyRestrictedCloseCapability(token, {
    secret,
    expectedAdminId: 1,
    expectedCajaId: 8,
    expectedShiftId: 200,
    expectedOwnerId: 22,
    expectedDeviceHash: 'device-2',
    expectedReservationToken: 'reservation-2',
  }));
  assert.throws(() => verifyRestrictedCloseCapability(token, {
    secret,
    expectedAdminId: 1,
    expectedCajaId: 2,
    expectedShiftId: 200,
    expectedOwnerId: 22,
    expectedDeviceHash: 'device-2',
    expectedReservationToken: 'otra-reserva',
  }));
});

test('cualquier administrador (no solo admin_sia) obtiene una capacidad con su login real', () => {
  const token = createRestrictedCloseCapability(
    { ...input(3), adminId: 7, adminLogin: 'jefa_local' },
    { secret, expiresIn: '5m', jwtId: 'jti-otro-admin' }
  );
  const claims = verifyRestrictedCloseCapability(token, {
    secret,
    expectedAdminId: 7,
    expectedCajaId: 3,
    expectedShiftId: 300,
    expectedOwnerId: 23,
    expectedDeviceHash: 'device-3',
    expectedReservationToken: 'reservation-3',
  });
  assert.equal(claims.adminId, 7);
  assert.equal(claims.adminLogin, 'jefa_local');
  // Ligada al equipo de la reserva: desde otro PC no sirve.
  assert.throws(() => verifyRestrictedCloseCapability(token, {
    secret,
    expectedAdminId: 7,
    expectedCajaId: 3,
    expectedShiftId: 300,
    expectedOwnerId: 23,
    expectedDeviceHash: 'otro-pc',
    expectedReservationToken: 'reservation-3',
  }));
});

test('no se crea capacidad sin rol administrador o sin login', () => {
  assert.throws(() => createRestrictedCloseCapability({ ...input(2), adminRole: 0 }, { secret }));
  assert.throws(() => createRestrictedCloseCapability({ ...input(2), adminLogin: '' }, { secret }));
});

test('rechaza una capacidad firmada con rol o login que no cuadran', () => {
  const expected = {
    secret,
    expectedAdminId: 1,
    expectedCajaId: 2,
    expectedShiftId: 200,
    expectedOwnerId: 22,
    expectedDeviceHash: 'device-2',
    expectedReservationToken: 'reservation-2',
  };
  const base = createRestrictedCloseCapability(input(2), { secret, expiresIn: '5m', jwtId: 'jti-base' });
  const payload = jwt.decode(base);
  const resign = (changes) => jwt.sign({ ...payload, ...changes }, `${secret}:restricted-shift-close:v1`);
  assert.throws(() => verifyRestrictedCloseCapability(resign({ admin_role: 0 }), expected));
  assert.throws(() => verifyRestrictedCloseCapability(resign({ admin_login: '' }), expected));
});

test('al usarla, la base debe confirmar mismo admin, mismo login, activo y administrador', () => {
  const claims = { adminId: 7, adminLogin: 'jefa_local' };
  assert.equal(isCapabilityAdminStillValid({ id: 7, user: 'jefa_local', es_administrador: 1, activo: 1 }, claims), true);
  assert.equal(isCapabilityAdminStillValid({ id: 7, user: 'Jefa_Local', es_administrador: 1, activo: null }, claims), true);
  assert.equal(isCapabilityAdminStillValid({ id: 7, user: 'jefa_local', es_administrador: 0, activo: 1 }, claims), false);
  assert.equal(isCapabilityAdminStillValid({ id: 7, user: 'jefa_local', es_administrador: 1, activo: 0 }, claims), false);
  assert.equal(isCapabilityAdminStillValid({ id: 7, user: 'otro_login', es_administrador: 1, activo: 1 }, claims), false);
  assert.equal(isCapabilityAdminStillValid({ id: 8, user: 'jefa_local', es_administrador: 1, activo: 1 }, claims), false);
  assert.equal(isCapabilityAdminStillValid(undefined, claims), false);
});

test('la capacidad se emite solo con reserva válida del mismo usuario del turno abierto', () => {
  const validReservation = { ownerId: 17, ownerLogin: 'cajera_ana', caja: 2, deviceHash: 'device-2' };
  const base = { reservationToken: 'reservation-2', deviceHash: 'device-2' };
  // Reserva inválida (token basura): nunca hay capacidad.
  assert.equal(shouldIssueRestrictedCloseCapability({
    ...base, reservation: null, reservationInvalid: true, openShiftOwner: { shiftId: 200, id: 17 },
  }), false);
  // Reserva válida de X con turno de Y: sin capacidad.
  assert.equal(shouldIssueRestrictedCloseCapability({
    ...base, reservation: validReservation, openShiftOwner: { shiftId: 200, id: 99 },
  }), false);
  // Reserva válida de X con turno de X: capacidad.
  assert.equal(shouldIssueRestrictedCloseCapability({
    ...base, reservation: validReservation, openShiftOwner: { shiftId: 200, id: 17 },
  }), true);
  // Sin turno abierto, sin token o sin huella: sin capacidad.
  assert.equal(shouldIssueRestrictedCloseCapability({ ...base, reservation: validReservation, openShiftOwner: null }), false);
  assert.equal(shouldIssueRestrictedCloseCapability({
    ...base, reservationToken: '', reservation: validReservation, openShiftOwner: { shiftId: 200, id: 17 },
  }), false);
  assert.equal(shouldIssueRestrictedCloseCapability({
    ...base, deviceHash: '', reservation: validReservation, openShiftOwner: { shiftId: 200, id: 17 },
  }), false);
});

test('replay guard consume una capacidad una sola vez', () => {
  const guard = new RestrictedCloseReplayGuard();
  guard.assertUnused('jti-once');
  guard.consume('jti-once');
  assert.throws(() => guard.assertUnused('jti-once'));
});

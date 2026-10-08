const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createRestrictedCloseCapability,
  verifyRestrictedCloseCapability,
  RestrictedCloseReplayGuard,
} = require('../server/session_reservation_policy');

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

test('replay guard consume una capacidad una sola vez', () => {
  const guard = new RestrictedCloseReplayGuard();
  guard.assertUnused('jti-once');
  guard.consume('jti-once');
  assert.throws(() => guard.assertUnused('jti-once'));
});

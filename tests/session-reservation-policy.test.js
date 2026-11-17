const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('../server/node_modules/jsonwebtoken');

const {
  createReservationToken,
  verifyReservationToken,
  decideReservationAccess,
  buildRestrictedLoginResponse,
} = require('../server/session_reservation_policy');

const secret = 'test-jwt-secret';
const reservation = {
  ownerId: 17,
  ownerLogin: 'cajera_ana',
  ownerName: 'Ana Caja',
  caja: 2,
  deviceHash: 'device-abc',
};

test('firma una reserva limitada que no funciona como access token', () => {
  const token = createReservationToken(reservation, { secret, expiresIn: '1h' });
  const verified = verifyReservationToken(token, {
    secret,
    expectedDeviceHash: 'device-abc',
    expectedCaja: 2,
  });

  assert.deepEqual(verified, reservation);
  assert.throws(() => jwt.verify(token, secret));
  assert.equal(token.includes('password'), false);
});

test('rechaza reserva alterada o usada desde otro equipo', () => {
  const token = createReservationToken(reservation, { secret, expiresIn: '1h' });
  const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;

  assert.throws(() => verifyReservationToken(tampered, { secret }));
  assert.throws(() => verifyReservationToken(token, {
    secret,
    expectedDeviceHash: 'otro-equipo',
    expectedCaja: 2,
  }));
  assert.throws(() => verifyReservationToken(token, {
    secret,
    expectedCaja: 2,
  }));
  assert.throws(() => verifyReservationToken(token, {
    secret,
    expectedDeviceHash: 'device-abc',
  }));
});

test('permite al dueño y rechaza cualquier otra cuenta normal', () => {
  assert.equal(decideReservationAccess({
    reservation,
    user: { id: 17, user: 'cajera_ana', es_administrador: 0 },
  }), 'owner');

  assert.equal(decideReservationAccess({
    reservation,
    user: { id: 22, user: 'otro_cajero', es_administrador: 0 },
  }), 'deny');
});

test('cualquier administrador activo obtiene acceso restringido sobre la reserva de otro', () => {
  assert.equal(decideReservationAccess({
    reservation,
    user: { id: 1, user: 'admin_sia', es_administrador: 1 },
  }), 'admin_restricted');

  assert.equal(decideReservationAccess({
    reservation,
    user: { id: 1, user: 'admin_sia', es_administrador: 0 },
  }), 'deny');

  assert.equal(decideReservationAccess({
    reservation,
    user: { id: 2, user: 'otro_admin', es_administrador: 1 },
  }), 'admin_restricted');

  assert.equal(decideReservationAccess({
    reservation,
    user: { id: 2, user: 'otro_admin', es_administrador: 1, activo: 0 },
  }), 'deny');
});

test('un turno de otro usuario sin reserva local: cajero rechazado, administrador en modo revisión', () => {
  assert.equal(decideReservationAccess({
    reservation: null,
    openShiftOwnerId: 17,
    user: { id: 22, user: 'otro_cajero', es_administrador: 0 },
  }), 'deny');

  // M-035: sin reserva de otro en este equipo no se ofrece el cierre restringido; el admin entra a revisar.
  assert.equal(decideReservationAccess({
    reservation: null,
    openShiftOwnerId: 17,
    user: { id: 1, user: 'admin_sia', es_administrador: 1 },
  }), 'admin_review');

  assert.equal(decideReservationAccess({
    reservation: null,
    openShiftOwnerId: 17,
    user: { id: 2, user: 'otro_admin', es_administrador: 1 },
  }), 'admin_review');
});

test('el administrador con su propia reserva y turno ajeno entra en modo revisión', () => {
  assert.equal(decideReservationAccess({
    reservation: { ...reservation, ownerId: 2, ownerLogin: 'otro_admin' },
    openShiftOwnerId: 17,
    user: { id: 2, user: 'otro_admin', es_administrador: 1 },
  }), 'admin_review');
});

test('la caja tomada por otro usuario (reserva local) mantiene el cierre restringido aunque haya turno', () => {
  assert.equal(decideReservationAccess({
    reservation,
    openShiftOwnerId: 17,
    user: { id: 1, user: 'admin_sia', es_administrador: 1 },
  }), 'admin_restricted');

  assert.equal(decideReservationAccess({
    reservation,
    openShiftOwnerId: 17,
    user: { id: 2, user: 'otro_admin', es_administrador: 1 },
  }), 'admin_restricted');

  assert.equal(decideReservationAccess({
    reservation,
    openShiftOwnerId: 17,
    user: { id: 22, user: 'otro_cajero', es_administrador: 0 },
  }), 'deny');
});

test('una reserva local inválida: cualquier administrador activo obtiene acceso restringido, cajero no', () => {
  assert.equal(decideReservationAccess({
    reservationInvalid: true,
    openShiftOwnerId: 17,
    user: { id: 1, user: 'admin_sia', es_administrador: 1 },
  }), 'admin_restricted');

  assert.equal(decideReservationAccess({
    reservationInvalid: true,
    user: { id: 2, user: 'otro_admin', es_administrador: 1 },
  }), 'admin_restricted');

  assert.equal(decideReservationAccess({
    reservationInvalid: true,
    user: { id: 17, user: 'cajera_ana', es_administrador: 0 },
  }), 'deny');
});

test('dueño del turno es owner y sin reserva ni turno es unreserved', () => {
  assert.equal(decideReservationAccess({
    reservation: null,
    openShiftOwnerId: 17,
    user: { id: 17, user: 'cajera_ana', es_administrador: 0 },
  }), 'owner');

  assert.equal(decideReservationAccess({
    reservation: null,
    openShiftOwnerId: 0,
    user: { id: 1, user: 'admin_sia', es_administrador: 1 },
  }), 'unreserved');

  assert.equal(decideReservationAccess({
    reservation: null,
    openShiftOwnerId: 0,
    user: { id: 22, user: 'otro_cajero', es_administrador: 0 },
  }), 'unreserved');
});

test('la respuesta restringida no entrega credenciales ni permisos de API', () => {
  const response = buildRestrictedLoginResponse({
    reservedOwner: { id: 17, login: 'cajera_ana', name: 'Ana Caja', caja: 2 },
    cajaId: 2,
  });
  assert.deepEqual(response, {
    message: 'Acceso restringido para administrar la reserva local.',
    restricted_session: true,
    reserved_owner: { id: 17, login: 'cajera_ana', name: 'Ana Caja', caja: 2 },
    caja_id: 2,
  });
  assert.equal(Object.hasOwn(response, 'token'), false);
  assert.equal(Object.hasOwn(response, 'refresh_token'), false);
  assert.equal(Object.hasOwn(response, 'permisos'), false);
});

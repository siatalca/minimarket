const jwt = require('jsonwebtoken');

const RESERVATION_SCOPE = 'session_reservation';
const RESERVATION_ISSUER = 'minimarket';

function reservationSecret(secret) {
  const raw = String(secret || '').trim();
  if (!raw) throw new Error('JWT_SECRET requerido para firmar la reserva');
  return `${raw}:session-reservation:v1`;
}

function normalizeReservation(input = {}) {
  const ownerId = Number(input.ownerId || 0);
  const ownerLogin = String(input.ownerLogin || '').trim();
  const ownerName = String(input.ownerName || '').trim();
  const caja = Number(input.caja || 0);
  const deviceHash = String(input.deviceHash || '').trim();
  if (!ownerId || !ownerLogin || !caja || !deviceHash) {
    throw new Error('Datos incompletos para reserva de sesion');
  }
  return { ownerId, ownerLogin, ownerName, caja, deviceHash };
}

function createReservationToken(input, { secret, expiresIn = '365d' } = {}) {
  const reservation = normalizeReservation(input);
  return jwt.sign(
    {
      scope: RESERVATION_SCOPE,
      sub: reservation.ownerId,
      owner_login: reservation.ownerLogin,
      owner_name: reservation.ownerName,
      caja: reservation.caja,
      device_hash: reservation.deviceHash,
    },
    reservationSecret(secret),
    {
      expiresIn,
      issuer: RESERVATION_ISSUER,
      audience: RESERVATION_SCOPE,
    }
  );
}

function verifyReservationToken(token, { secret, expectedDeviceHash, expectedCaja } = {}) {
  const deviceHash = String(expectedDeviceHash || '').trim();
  const caja = Number(expectedCaja || 0);
  if (!deviceHash || !caja) {
    throw new Error('Equipo y caja requeridos para validar la reserva');
  }
  const payload = jwt.verify(String(token || ''), reservationSecret(secret), {
    issuer: RESERVATION_ISSUER,
    audience: RESERVATION_SCOPE,
  });
  if (payload?.scope !== RESERVATION_SCOPE) throw new Error('Alcance de reserva invalido');
  const reservation = normalizeReservation({
    ownerId: payload.sub,
    ownerLogin: payload.owner_login,
    ownerName: payload.owner_name,
    caja: payload.caja,
    deviceHash: payload.device_hash,
  });
  if (reservation.deviceHash !== deviceHash) {
    throw new Error('La reserva pertenece a otro equipo');
  }
  if (reservation.caja !== caja) {
    throw new Error('La reserva pertenece a otra caja');
  }
  return reservation;
}

function isVerifiedAdminSia(user = {}) {
  return String(user.user || '').trim().toLowerCase() === 'admin_sia'
    && Number(user.es_administrador || 0) === 1;
}

function decideReservationAccess({ reservation = null, openShiftOwnerId = 0, user = {} } = {}) {
  const userId = Number(user.id || 0);
  const reservationOwnerId = Number(reservation?.ownerId || 0);
  const shiftOwnerId = Number(openShiftOwnerId || 0);
  const conflictsWithReservation = reservationOwnerId > 0 && reservationOwnerId !== userId;
  const conflictsWithShift = shiftOwnerId > 0 && shiftOwnerId !== userId;
  if (!conflictsWithReservation && !conflictsWithShift) {
    return reservationOwnerId || shiftOwnerId ? 'owner' : 'unreserved';
  }
  return isVerifiedAdminSia(user) ? 'admin_restricted' : 'deny';
}

function buildRestrictedLoginResponse({ reservedOwner = null, cajaId = null } = {}) {
  return {
    message: 'Acceso restringido para administrar la reserva local.',
    restricted_session: true,
    reserved_owner: reservedOwner,
    caja_id: cajaId || null,
  };
}

module.exports = {
  createReservationToken,
  verifyReservationToken,
  decideReservationAccess,
  isVerifiedAdminSia,
  buildRestrictedLoginResponse,
};

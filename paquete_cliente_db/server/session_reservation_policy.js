const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const RESERVATION_SCOPE = 'session_reservation';
const RESERVATION_ISSUER = 'minimarket';
const RESTRICTED_CLOSE_SCOPE = 'restricted_shift_close';

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

function restrictedCloseSecret(secret) {
  const raw = String(secret || '').trim();
  if (!raw) throw new Error('JWT_SECRET requerido para capacidad de cierre');
  return `${raw}:restricted-shift-close:v1`;
}

function reservationFingerprint(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function createRestrictedCloseCapability(input = {}, { secret, expiresIn = '5m', jwtId } = {}) {
  const adminId = Number(input.adminId || 0);
  const cajaId = Number(input.cajaId || 0);
  const shiftId = Number(input.shiftId || 0);
  const ownerId = Number(input.ownerId || 0);
  const deviceHash = String(input.deviceHash || '').trim();
  const reservationToken = String(input.reservationToken || '').trim();
  if (!adminId || String(input.adminLogin || '').trim().toLowerCase() !== 'admin_sia'
      || Number(input.adminRole || 0) !== 1 || !cajaId || !shiftId || !ownerId
      || !deviceHash || !reservationToken) {
    throw new Error('Datos incompletos para capacidad de cierre restringido');
  }
  return jwt.sign({
    scope: RESTRICTED_CLOSE_SCOPE,
    admin_id: adminId,
    admin_login: 'admin_sia',
    admin_role: 1,
    caja_id: cajaId,
    shift_id: shiftId,
    owner_id: ownerId,
    device_hash: deviceHash,
    reservation_hash: reservationFingerprint(reservationToken),
  }, restrictedCloseSecret(secret), {
    expiresIn,
    issuer: RESERVATION_ISSUER,
    audience: RESTRICTED_CLOSE_SCOPE,
    jwtid: jwtId || crypto.randomUUID(),
  });
}

function verifyRestrictedCloseCapability(token, expected = {}) {
  const payload = jwt.verify(String(token || ''), restrictedCloseSecret(expected.secret), {
    issuer: RESERVATION_ISSUER,
    audience: RESTRICTED_CLOSE_SCOPE,
  });
  const claims = {
    adminId: Number(payload.admin_id || 0),
    cajaId: Number(payload.caja_id || 0),
    shiftId: Number(payload.shift_id || 0),
    ownerId: Number(payload.owner_id || 0),
    deviceHash: String(payload.device_hash || ''),
    reservationHash: String(payload.reservation_hash || ''),
    jti: String(payload.jti || ''),
    exp: Number(payload.exp || 0),
  };
  if (payload.scope !== RESTRICTED_CLOSE_SCOPE || payload.admin_login !== 'admin_sia'
      || Number(payload.admin_role || 0) !== 1 || !claims.jti) throw new Error('Capacidad de cierre invalida');
  const checks = [
    [claims.adminId, Number(expected.expectedAdminId || 0)],
    [claims.cajaId, Number(expected.expectedCajaId || 0)],
    [claims.shiftId, Number(expected.expectedShiftId || 0)],
    [claims.ownerId, Number(expected.expectedOwnerId || 0)],
    [claims.deviceHash, String(expected.expectedDeviceHash || '').trim()],
    [claims.reservationHash, reservationFingerprint(expected.expectedReservationToken)],
  ];
  if (checks.some(([actual, wanted]) => !wanted || actual !== wanted)) throw new Error('Capacidad fuera de alcance');
  return claims;
}

class RestrictedCloseReplayGuard {
  constructor() { this.used = new Map(); }
  prune(now = Math.floor(Date.now() / 1000)) { for (const [jti, exp] of this.used.entries()) if (exp && exp < now) this.used.delete(jti); }
  assertUnused(jti) { this.prune(); if (this.used.has(String(jti || ''))) throw new Error('Capacidad ya utilizada'); }
  consume(jti, exp = Math.floor(Date.now() / 1000) + 300) { this.assertUnused(jti); this.used.set(String(jti || ''), Number(exp || 0)); }
}

module.exports = {
  createReservationToken,
  verifyReservationToken,
  decideReservationAccess,
  isVerifiedAdminSia,
  buildRestrictedLoginResponse,
  createRestrictedCloseCapability,
  verifyRestrictedCloseCapability,
  RestrictedCloseReplayGuard,
};

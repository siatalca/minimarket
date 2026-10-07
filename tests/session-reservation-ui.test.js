const test = require('node:test');
const assert = require('node:assert/strict');

const {
  RESERVATION_STORAGE_KEY,
  createReservationRecord,
  buildReservationLoginFields,
  renderReservationOwner,
  clearLocalAuth,
  clearLocalAuthAndReservation,
  clearCompletedShiftLocalState,
} = require('../js/session_reservation');

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    snapshot() { return Object.fromEntries(values.entries()); },
  };
}

test('la reserva local excluye contraseñas y tokens de autenticación', () => {
  const record = createReservationRecord({
    ownerId: 17,
    ownerLogin: 'cajera_ana',
    ownerName: 'Ana Caja',
    caja: 2,
    reservationToken: 'signed-reservation',
    password: 'no-guardar',
    token: 'access-no-guardar',
    refreshToken: 'refresh-no-guardar',
  });

  assert.deepEqual(record, {
    ownerId: 17,
    ownerLogin: 'cajera_ana',
    ownerName: 'Ana Caja',
    caja: '2',
    reservationToken: 'signed-reservation',
  });
});

test('muestra el dueño con textContent y no interpreta HTML', () => {
  const element = {
    textContent: '',
    set innerHTML(_) { throw new Error('innerHTML no debe usarse'); },
  };
  renderReservationOwner(element, {
    ownerName: '<img src=x onerror=alert(1)>',
    ownerLogin: 'ana',
  });
  assert.equal(element.textContent, 'Sesión reservada para <img src=x onerror=alert(1)> (ana).');
});

test('el login envía solo el token firmado y no confía en identidad de localStorage', () => {
  const fields = buildReservationLoginFields({
    ownerId: 17,
    ownerLogin: 'cajera_ana',
    ownerName: 'Ana Caja',
    caja: '2',
    reservationToken: 'signed-reservation',
  });
  assert.deepEqual(fields, { reservation_token: 'signed-reservation' });
});

test('liberar localmente borra solo autenticación y reserva, no turno ni caja', () => {
  const local = memoryStorage({
    token: 'access',
    refresh_token: 'refresh',
    id_user: '17',
    user: 'cajera_ana',
    username: 'Ana Caja',
    estado_login: '1',
    user_permissions: '{}',
    user_is_admin: '0',
    [RESERVATION_STORAGE_KEY]: '{"ownerId":17}',
    turno_id_actual: '88',
    turno_owner_user: '17',
    turno_owner_caja: '2',
    turno_monto_inicial: '25000',
    n_caja: '2',
    nombre_caja: 'Caja 2',
    ticket_counter: '41',
  });
  const session = memoryStorage({ token: 'session-access', refresh_token: 'session-refresh' });

  clearLocalAuthAndReservation(local, session);

  assert.deepEqual(local.snapshot(), {
    turno_id_actual: '88',
    turno_owner_user: '17',
    turno_owner_caja: '2',
    turno_monto_inicial: '25000',
    n_caja: '2',
    nombre_caja: 'Caja 2',
    ticket_counter: '41',
  });
  assert.deepEqual(session.snapshot(), {});
});

test('el acceso restringido descarta tokens ajenos sin perder la reserva', () => {
  const local = memoryStorage({
    token: 'access-ajeno',
    refresh_token: 'refresh-ajeno',
    user: 'cajera_ana',
    [RESERVATION_STORAGE_KEY]: '{"ownerId":17,"reservationToken":"firmada"}',
    turno_id_actual: '88',
    n_caja: '2',
  });
  const session = memoryStorage({ token: 'session-ajeno', refresh_token: 'session-refresh-ajeno' });

  clearLocalAuth(local, session);

  assert.deepEqual(local.snapshot(), {
    [RESERVATION_STORAGE_KEY]: '{"ownerId":17,"reservationToken":"firmada"}',
    turno_id_actual: '88',
    n_caja: '2',
  });
  assert.deepEqual(session.snapshot(), {});
});

test('un corte completo elimina reserva, autenticación y datos locales del turno', () => {
  const local = memoryStorage({
    token: 'access',
    refresh_token: 'refresh',
    id_user: '1',
    user: 'admin_sia',
    username: 'Administrador SIA',
    estado_login: '1',
    user_permissions: '{}',
    user_is_admin: '1',
    [RESERVATION_STORAGE_KEY]: '{"ownerId":1,"ownerLogin":"admin_sia","reservationToken":"firmada"}',
    turno_id_actual: '88',
    turno_monto_inicial: '25000',
    ticket_seed_shift_id: '88',
    turno_owner_user: '1',
    turno_owner_caja: '8',
    n_caja: '8',
    nombre_caja: 'Caja Administración',
  });
  const session = memoryStorage({ token: 'session-access', refresh_token: 'session-refresh' });

  clearCompletedShiftLocalState(local, session);

  assert.deepEqual(local.snapshot(), {
    n_caja: '8',
    nombre_caja: 'Caja Administración',
  });
  assert.deepEqual(session.snapshot(), {});
});

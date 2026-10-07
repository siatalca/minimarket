(function registerSessionReservation(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.MinimarketSessionReservation = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function createSessionReservationApi() {
  const RESERVATION_STORAGE_KEY = 'minimarket_session_reservation_v1';
  const LOCAL_AUTH_KEYS = [
    'token',
    'refresh_token',
    'id_user',
    'username',
    'user',
    'estado_login',
    'user_permissions',
    'user_is_admin',
    'user_profile',
    'user_sync_pending',
    'password',
  ];
  const SESSION_AUTH_KEYS = ['token', 'refresh_token'];

  function createReservationRecord(input = {}) {
    return {
      ownerId: Number(input.ownerId || 0),
      ownerLogin: String(input.ownerLogin || '').trim(),
      ownerName: String(input.ownerName || '').trim(),
      caja: String(input.caja || '').trim(),
      reservationToken: String(input.reservationToken || '').trim(),
    };
  }

  function isCompleteReservation(record) {
    return Number(record?.ownerId || 0) > 0
      && Boolean(String(record?.ownerLogin || '').trim())
      && Boolean(String(record?.caja || '').trim())
      && Boolean(String(record?.reservationToken || '').trim());
  }

  function readReservation(storage) {
    try {
      const parsed = JSON.parse(storage?.getItem(RESERVATION_STORAGE_KEY) || 'null');
      const record = createReservationRecord(parsed || {});
      return isCompleteReservation(record) ? record : null;
    } catch (_) {
      return null;
    }
  }

  function writeReservation(storage, input) {
    const record = createReservationRecord(input);
    if (!isCompleteReservation(record)) return null;
    storage?.setItem(RESERVATION_STORAGE_KEY, JSON.stringify(record));
    return record;
  }

  function clearReservation(storage) {
    storage?.removeItem(RESERVATION_STORAGE_KEY);
  }

  function buildReservationLoginFields(reservation) {
    const token = String(reservation?.reservationToken || '').trim();
    return token ? { reservation_token: token } : {};
  }

  function ownerLabel(reservation) {
    const name = String(reservation?.ownerName || '').trim();
    const login = String(reservation?.ownerLogin || '').trim();
    if (name && login && name.toLowerCase() !== login.toLowerCase()) return `${name} (${login})`;
    return name || login || 'el usuario reservado';
  }

  function renderReservationOwner(element, reservation) {
    if (!element) return;
    element.textContent = `Sesión reservada para ${ownerLabel(reservation)}.`;
  }

  function clearLocalAuth(local, session) {
    LOCAL_AUTH_KEYS.forEach((key) => local?.removeItem(key));
    SESSION_AUTH_KEYS.forEach((key) => session?.removeItem(key));
  }

  function clearLocalAuthAndReservation(local, session) {
    clearLocalAuth(local, session);
    clearReservation(local);
  }

  return {
    RESERVATION_STORAGE_KEY,
    createReservationRecord,
    readReservation,
    writeReservation,
    clearReservation,
    buildReservationLoginFields,
    ownerLabel,
    renderReservationOwner,
    clearLocalAuth,
    clearLocalAuthAndReservation,
  };
});

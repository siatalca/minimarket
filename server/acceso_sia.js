// Acceso SIA (M-052): ingreso de soporte de admin_sia sin caja ni turno, desde cualquier equipo.
// Reglas puras (sin base de datos ni Express) que usan /api/login, /api/auth/refresh y el
// control de token de server.js:
// - El token de acceso lleva scope 'sia' y la sesion de refresco queda con modo 'acceso_sia'.
// - La sesion dura como maximo 8 horas desde el login; renovar el token no la alarga.
// - Con scope 'sia' las rutas que exigen caja o turno responden 403 ACCESO_SIA_SIN_CAJA.

const ACCESO_SIA_SCOPE = 'sia';
const ACCESO_SIA_SESSION_MODE = 'acceso_sia';
const ACCESO_SIA_MAX_SESSION_SECONDS = 8 * 3600;
// El token de acceso normal dura 24 h por defecto; el de Acceso SIA dura como maximo 2 h
// y nunca pasa del fin de la sesion de 8 h.
const ACCESO_SIA_MAX_ACCESS_TOKEN_SECONDS = 2 * 3600;

const ACCESO_SIA_SIN_CAJA = Object.freeze({
  code: 'ACCESO_SIA_SIN_CAJA',
  message: 'Esta acción requiere una caja.',
});
const ACCESO_SIA_NO_AUTORIZADO = Object.freeze({
  code: 'ACCESO_SIA_NO_AUTORIZADO',
  message: 'Acceso no autorizado.',
});
const CAJA_REQUERIDA = Object.freeze({
  code: 'CAJA_REQUERIDA',
  message: 'Este equipo no tiene una caja asignada. Asigna una caja para iniciar sesión.',
});

// Rutas que exigen caja o turno (server.js y tienda_routes.js). tests/acceso-sia-backend.test.js
// comprueba que cada una exista con ese metodo y ruta exactos.
const ACCESO_SIA_BLOCKED_ROUTES = Object.freeze([
  { method: 'POST', path: '/api/sales' }, // crear venta
  { method: 'PUT', path: '/api/sales/:saleId/payment' }, // modificar el pago de una venta
  { method: 'POST', path: '/api/sales/:saleId/cancel' }, // anular venta (devuelve stock): se hace desde una caja
  { method: 'POST', path: '/api/turno/iniciar' }, // abrir turno
  { method: 'POST', path: '/api/corte/cerrar' }, // cerrar turno / corte
  { method: 'POST', path: '/api/restricted-session/close-shift' }, // cierre restringido
  { method: 'POST', path: '/api/cash-movements' }, // entradas y salidas de caja
  { method: 'POST', path: '/api/ventas/carrito-cliente/cargar' }, // cargar carrito del cliente en caja
  { method: 'POST', path: '/api/connect' }, // "conectados": uso de una caja
  { method: 'POST', path: '/api/disconnect' },
].map((route) => Object.freeze(route)));

// Rutas que escriben en ventas, detalle_venta, corte_caja, cash_movements o conectados y que el
// Acceso SIA puede usar a proposito. tests/acceso-sia-backend.test.js exige que toda ruta de
// escritura sobre esas tablas este en una de las dos listas.
const ACCESO_SIA_ALLOWED_WRITE_ROUTES = Object.freeze([
  {
    method: 'POST',
    path: '/api/corte/merge',
    reason: 'solo admin_sia; reconstruye y unifica cortes desde ventas ya registradas, sin crear ventas ni usar caja',
  },
  {
    method: 'DELETE',
    path: '/api/productos/:code',
    reason: 'configuracion de inventario (solo con stock 0); solo desliga el producto del historial de ventas, sin crear ventas ni usar caja',
  },
].map((route) => Object.freeze(route)));

function normalizePath(rawPath) {
  const value = String(rawPath || '').trim().toLowerCase();
  return value.length > 1 ? value.replace(/\/+$/, '') : value;
}

function routeMatches(route, method, rawPath) {
  if (String(method || '').toUpperCase() !== route.method) return false;
  const expected = normalizePath(route.path).split('/');
  const actual = normalizePath(rawPath).split('/');
  if (expected.length !== actual.length) return false;
  return expected.every((segment, i) => (segment.startsWith(':') ? actual[i] !== '' : segment === actual[i]));
}

function isAccesoSiaBlockedRoute(method, rawPath) {
  return ACCESO_SIA_BLOCKED_ROUTES.some((route) => routeMatches(route, method, rawPath));
}

function isAccesoSiaToken(payload) {
  return Boolean(payload) && payload.scope === ACCESO_SIA_SCOPE;
}

// true si respondio 403: la ruta exige caja y el token es de Acceso SIA.
function rejectAccesoSiaWithoutCaja(req, res) {
  if (!isAccesoSiaToken(req.user)) return false;
  if (!isAccesoSiaBlockedRoute(req.method, req.path)) return false;
  res.status(403).json({ ...ACCESO_SIA_SIN_CAJA });
  return true;
}

// Que pide el cuerpo de /api/login: 'acceso_sia' (solo con acceso_sia === true), 'caja' o
// 'caja_requerida' (login normal sin numero de caja).
function decideLoginMode(body = {}, cajaId = null) {
  if (body && body.acceso_sia === true) return 'acceso_sia';
  return cajaId ? 'caja' : 'caja_requerida';
}

// Segundos que le quedan a una sesion SIA que lleva `elapsedSeconds` desde el login (0 = vencida).
function accesoSiaRemainingSeconds(elapsedSeconds) {
  if (elapsedSeconds === null || typeof elapsedSeconds === 'undefined' || elapsedSeconds === '') return 0;
  const elapsed = Number(elapsedSeconds);
  if (!Number.isFinite(elapsed) || elapsed < 0) return 0;
  return Math.max(0, Math.floor(ACCESO_SIA_MAX_SESSION_SECONDS - elapsed));
}

// Duracion del token de acceso SIA: la menor entre la normal, 2 h y lo que queda de la sesion.
function accesoSiaAccessTokenSeconds(baseTtlSeconds, remainingSeconds) {
  const base = Number(baseTtlSeconds) > 0 ? Math.floor(Number(baseTtlSeconds)) : ACCESO_SIA_MAX_ACCESS_TOKEN_SECONDS;
  const remaining = Math.max(0, Math.floor(Number(remainingSeconds) || 0));
  return Math.min(base, ACCESO_SIA_MAX_ACCESS_TOKEN_SECONDS, remaining);
}

module.exports = {
  ACCESO_SIA_SCOPE,
  ACCESO_SIA_SESSION_MODE,
  ACCESO_SIA_MAX_SESSION_SECONDS,
  ACCESO_SIA_MAX_ACCESS_TOKEN_SECONDS,
  ACCESO_SIA_SIN_CAJA,
  ACCESO_SIA_NO_AUTORIZADO,
  CAJA_REQUERIDA,
  ACCESO_SIA_BLOCKED_ROUTES,
  ACCESO_SIA_ALLOWED_WRITE_ROUTES,
  isAccesoSiaBlockedRoute,
  isAccesoSiaToken,
  rejectAccesoSiaWithoutCaja,
  decideLoginMode,
  accesoSiaRemainingSeconds,
  accesoSiaAccessTokenSeconds,
};

// Reglas de la consulta de precios y del carrito del cliente (M-037).
// Viven aparte de server.js para poder probarlas sin base de datos.
// Lo publico expone solo codigo, nombre, precio, formato y stock: nunca costo, ganancia,
// proveedor, departamento, minimos/maximos ni el id interno del producto.

const crypto = require('crypto');

const PRODUCT_CODE_RE = /^[0-9A-Za-z.\-]{1,64}$/;
const CART_CODE_RE = /^\d{6}$/;
const SESSION_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LIMITS = {
  nameMax: 60,
  emailMax: 120,
  passwordMinBytes: 6,
  passwordMaxBytes: 72,
  cartMaxLines: 60,
  itemMinQty: 1,
  itemMaxQty: 99,
  qrUrlMax: 200,
};

const SESSION_TTL_MS = 60 * 24 * 60 * 60 * 1000;
const CART_CODE_TTL_MS = 2 * 60 * 60 * 1000;
// Sin cantidad minima configurada, "pocas" es este numero o menos.
const LOW_STOCK_DEFAULT = 3;

// Telefono movil de Chile en formato +569XXXXXXXX. Acepta espacios, guiones y puntos,
// y los prefijos 56 / +56 / 9.
function normalizePhone(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const digits = String(value).trim().replace(/[\s\-.()]/g, '').replace(/^\+/, '');
  if (!/^\d+$/.test(digits)) return null;
  let local = digits;
  if (local.length === 11 && local.startsWith('56')) local = local.slice(2);
  if (!/^9\d{8}$/.test(local)) return null;
  return `+56${local}`;
}

function normalizeName(value) {
  if (typeof value !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean || clean.length > LIMITS.nameMax) return null;
  return clean;
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const clean = value.trim().toLowerCase();
  if (!clean || clean.length > LIMITS.emailMax || !EMAIL_RE.test(clean)) return null;
  return clean;
}

// bcrypt solo usa los primeros 72 bytes: una clave mas larga se rechaza en vez de recortarla.
function isValidPassword(value) {
  if (typeof value !== 'string') return false;
  const bytes = Buffer.byteLength(value, 'utf8');
  return bytes >= LIMITS.passwordMinBytes && bytes <= LIMITS.passwordMaxBytes;
}

// Solo codigo exacto (sin busqueda por nombre ni comodines).
function normalizeProductCode(value) {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return PRODUCT_CODE_RE.test(clean) ? clean : null;
}

// Cantidad entera del carrito: 1-99, o 0 cuando se permite (0 = quitar la linea).
function parseCartQuantity(value, { allowZero = false } = {}) {
  let n = null;
  if (typeof value === 'number') n = value;
  else if (typeof value === 'string' && /^\s*\d+\s*$/.test(value)) n = Number(value);
  if (!Number.isInteger(n)) return null;
  if (n === 0) return allowZero ? 0 : null;
  if (n < LIMITS.itemMinQty || n > LIMITS.itemMaxQty) return null;
  return n;
}

// Id de linea del carrito en la URL (/items/:itemId).
function parseItemId(value) {
  const raw = String(value ?? '');
  if (!/^\d{1,12}$/.test(raw)) return null;
  const n = Number(raw);
  return n > 0 ? n : null;
}

// Mismos nombres de formato que normalizeSaleFormatName (server.js) y resolveProductSaleFormat
// (js/scripts.js). Al cliente solo se le muestra unidad o granel (un pack se vende por unidad).
function resolvePublicFormat(formatoVenta) {
  const normalized = String(formatoVenta || '').trim().toLowerCase();
  if (['granel', 'kilo', 'kilos', 'kg', 'kilogramo', 'kilogramos'].includes(normalized)) return 'granel';
  return 'unidad';
}

function roundAmount(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

// Stock visible: estado y cantidad exacta. Un producto que no usa inventario no informa cantidad.
function buildPublicStock(row) {
  const controlled = Number(row?.utiliza_inventario || 0) === 1;
  if (!controlled) return { estado: 'no_controlado' };
  const cantidad = Math.max(0, Number(Number(row?.cantidad_actual || 0).toFixed(3)) || 0);
  if (cantidad <= 0) return { estado: 'sin_stock', cantidad: 0 };
  const minimo = Number(row?.cantidad_minima || 0);
  const threshold = Number.isFinite(minimo) && minimo > 0 ? minimo : LOW_STOCK_DEFAULT;
  return { estado: cantidad <= threshold ? 'pocas' : 'disponible', cantidad };
}

// Unidades que el cliente puede tener en el carrito (M-038). null = no usa inventario (sin limite
// de stock). Con inventario: la cantidad actual entera (un saldo fraccionario no completa una unidad).
function availableForCart(row) {
  if (Number(row?.utiliza_inventario || 0) !== 1) return null;
  const cantidad = Number(Number(row?.cantidad_actual || 0).toFixed(3));
  return Number.isFinite(cantidad) && cantidad > 0 ? Math.floor(cantidad) : 0;
}

// Problema de stock de una linea del carrito: null, 'sin_stock' o 'excede_stock'.
function cartItemStockProblem(cantidad, disponible) {
  if (disponible === null || disponible === undefined) return null;
  if (disponible <= 0) return 'sin_stock';
  return Number(cantidad) > disponible ? 'excede_stock' : null;
}

// Cantidad final de una linea al agregar (mode 'add': existente + pedida) o al cambiarla
// (mode 'set': la pedida). Tope maxQty y, si usa inventario, lo disponible.
// Devuelve { cantidad, limited?, disponible? } o { error: 'OUT_OF_STOCK' | 'STOCK_LIMIT', disponible }.
// STOCK_LIMIT: al agregar, el carrito ya tenia todo lo disponible (no se cambia nada).
// Misma regla para la base real (server/tienda_repo.js) y la simulada de las pruebas.
function resolveCartLineQuantity({ existing = 0, requested, disponible, maxQty = LIMITS.itemMaxQty, mode = 'add' }) {
  if (disponible !== null && disponible <= 0) return { error: 'OUT_OF_STOCK', disponible: 0 };
  const current = Number(existing) || 0;
  const wanted = Math.min(mode === 'add' ? current + requested : requested, maxQty);
  if (disponible === null || wanted <= disponible) return { cantidad: wanted };
  if (mode === 'add' && current >= disponible) return { error: 'STOCK_LIMIT', disponible };
  return { cantidad: disponible, limited: true, disponible };
}

// Aviso cuando la cantidad quedo limitada al stock disponible.
function stockLimitedNotice(disponible) {
  const message = Number(disponible) === 1 ? 'Solo queda 1' : `Solo quedan ${disponible}`;
  return { code: 'STOCK_LIMITED', disponible, message };
}

// Producto para la consulta publica. Arma el objeto campo por campo (lista blanca).
function toPublicProduct(row) {
  return {
    codigo: String(row?.codigo_barras || '').trim(),
    nombre: String(row?.descripcion || '').trim(),
    precio: roundAmount(row?.precio_venta),
    formato: resolvePublicFormat(row?.formato_venta),
    stock: buildPublicStock(row),
  };
}

function toPublicAccount(row) {
  return {
    nombre: String(row?.nombre || ''),
    telefono: String(row?.telefono || ''),
    correo: String(row?.correo || ''),
    google_vinculado: Boolean(row?.google_sub || row?.google_vinculado),
  };
}

function toIsoDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Respuesta {carrito}. Sin carrito guardado se responde uno abierto y vacio.
// itemRows: item_id, cantidad y las columnas publicas del producto.
// Cada item informa disponible (null si no usa inventario) y problema de stock (M-038).
function buildCartResponse(cart, itemRows = []) {
  const items = (itemRows || []).map((row) => {
    const product = toPublicProduct(row);
    const cantidad = Number(row.cantidad || 0);
    const disponible = availableForCart(row);
    return {
      item_id: Number(row.item_id),
      codigo: product.codigo,
      nombre: product.nombre,
      precio: product.precio,
      cantidad,
      subtotal: roundAmount(product.precio * cantidad),
      stock: product.stock,
      disponible,
      problema: cartItemStockProblem(cantidad, disponible),
    };
  });
  const response = {
    estado: cart?.estado === 'enviado' ? 'enviado' : 'abierto',
    items,
    total: roundAmount(items.reduce((sum, item) => sum + item.subtotal, 0)),
    bloqueado_por_stock: items.some((item) => item.problema !== null),
  };
  if (response.estado === 'enviado' && cart?.codigo) {
    response.codigo = String(cart.codigo);
    response.codigo_expira = toIsoDate(cart.codigo_expira);
  }
  return response;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

// Token opaco de 32 bytes (no es JWT). En la base se guarda solo su sha256.
function generateSessionToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token) };
}

function isWellFormedSessionToken(token) {
  return typeof token === 'string' && SESSION_TOKEN_RE.test(token);
}

function generateCartCode(randomInt = crypto.randomInt) {
  return String(randomInt(0, 1000000)).padStart(6, '0');
}

function normalizeCartCode(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const clean = String(value).replace(/\s+/g, '');
  return CART_CODE_RE.test(clean) ? clean : null;
}

// Un codigo enviado sigue vigente mientras no pase codigo_expira.
function isCartCodeActive(cart, nowMs = Date.now()) {
  if (!cart || cart.estado !== 'enviado' || !cart.codigo || !cart.codigo_expira) return false;
  const expires = new Date(cart.codigo_expira).getTime();
  return Number.isFinite(expires) && expires > nowMs;
}

// Resultado de un canje que no actualizo ninguna fila: por que no se pudo.
// pending: fila con ese codigo (o null); used: ultimo carrito retirado con ese codigo, con
// reciente = 1 si se retiro en las ultimas 24 horas (o null). Un retiro mas antiguo es 404:
// los codigos se reutilizan y no tiene sentido decir "ya usado" de una compra de otro dia.
function classifyRedeemFailure({ pending, used } = {}) {
  if (pending && pending.estado === 'enviado') {
    return Number(pending.vigente) === 1
      ? { status: 409, code: 'CODE_USED', message: 'El codigo ya fue usado.' }
      : { status: 410, code: 'CODE_EXPIRED', message: 'El codigo vencio. Pide al cliente que genere otro.' };
  }
  if (used && Number(used.reciente) === 1) return { status: 409, code: 'CODE_USED', message: 'El codigo ya fue usado.' };
  return { status: 404, code: 'CODE_NOT_FOUND', message: 'No existe un carrito con ese codigo.' };
}

// URL del QR de la consulta: https y ruta /consulta/ (http solo en localhost), maximo 200.
function validateQrTargetUrl(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw || raw.length > LIMITS.qrUrlMax) return null;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch (_) {
    return null;
  }
  if (parsed.username || parsed.password) return null;
  const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && localHost)) return null;
  if (!parsed.pathname.startsWith('/consulta/')) return null;
  return parsed.toString();
}

module.exports = {
  LIMITS,
  SESSION_TTL_MS,
  CART_CODE_TTL_MS,
  LOW_STOCK_DEFAULT,
  normalizePhone,
  normalizeName,
  normalizeEmail,
  isValidPassword,
  normalizeProductCode,
  parseCartQuantity,
  parseItemId,
  resolvePublicFormat,
  buildPublicStock,
  availableForCart,
  cartItemStockProblem,
  resolveCartLineQuantity,
  stockLimitedNotice,
  toPublicProduct,
  toPublicAccount,
  toIsoDate,
  buildCartResponse,
  hashToken,
  generateSessionToken,
  isWellFormedSessionToken,
  generateCartCode,
  normalizeCartCode,
  isCartCodeActive,
  classifyRedeemFailure,
  validateQrTargetUrl,
};

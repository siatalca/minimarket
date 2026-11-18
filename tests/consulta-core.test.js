const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const core = require('../consulta/consulta_core.js');
const qr = require('../js/qr_consulta.js');

test('normalizePhone deja el celular chileno como +569XXXXXXXX', () => {
  assert.equal(core.normalizePhone('9 1234 5678'), '+56912345678');
  assert.equal(core.normalizePhone('+56 9 1234-5678'), '+56912345678');
  assert.equal(core.normalizePhone('56912345678'), '+56912345678');
  assert.equal(core.normalizePhone('912345678'), '+56912345678');
  assert.equal(core.normalizePhone('12345678'), '+56912345678');
  assert.equal(core.normalizePhone('+54912345678'), '');
  assert.equal(core.normalizePhone('22345678x'), '');
  assert.equal(core.normalizePhone('812345678'), '');
  assert.equal(core.normalizePhone(''), '');
});

test('isValidProductCode usa la misma regla que el servidor', () => {
  assert.equal(core.isValidProductCode('7802800716345'), true);
  assert.equal(core.isValidProductCode('AB-12.3'), true);
  assert.equal(core.isValidProductCode('a'.repeat(64)), true);
  assert.equal(core.isValidProductCode('a'.repeat(65)), false);
  assert.equal(core.isValidProductCode('78 02'), false);
  assert.equal(core.isValidProductCode("1' OR 1=1"), false);
  assert.equal(core.isValidProductCode(''), false);
});

test('validatePassword cuenta bytes (6 a 72)', () => {
  assert.notEqual(core.validatePassword('12345'), '');
  assert.equal(core.validatePassword('123456'), '');
  assert.equal(core.validatePassword('a'.repeat(72)), '');
  assert.notEqual(core.validatePassword('a'.repeat(73)), '');
  assert.notEqual(core.validatePassword('ñ'.repeat(37)), '', '37 ñ son 74 bytes');
});

test('validateRegistration marca cada campo con su mensaje', () => {
  const bad = core.validateRegistration({ nombre: ' ', telefono: '123', correo: 'x@', clave: '1' });
  assert.equal(bad.ok, false);
  assert.deepEqual(Object.keys(bad.errors).sort(), ['clave', 'correo', 'nombre', 'telefono']);
  const good = core.validateRegistration({ nombre: '  Ana   Pérez ', telefono: '9 8765 4321', correo: 'ana@correo.cl', clave: 'secreta1' });
  assert.equal(good.ok, true);
  assert.deepEqual(good.data, { nombre: 'Ana Pérez', telefono: '+56987654321', correo: 'ana@correo.cl', clave: 'secreta1' });
  assert.equal(core.validateRegistration({ nombre: 'x'.repeat(61), telefono: '912345678', correo: 'a@b.cl', clave: '123456' }).ok, false);
});

test('formatPrice y formatQuantity', () => {
  assert.equal(core.formatPrice(1990), '$1.990');
  assert.equal(core.formatPrice(1234567.4), '$1.234.567');
  assert.equal(core.formatPrice(0), '$0');
  assert.equal(core.formatQuantity(1, 'unidad'), '1 unidad');
  assert.equal(core.formatQuantity(12, 'unidad'), '12 unidades');
  assert.equal(core.formatQuantity(3.5, 'granel'), '3,5 kg');
});

test('describeStock muestra estado y cantidad exacta', () => {
  assert.deepEqual(core.describeStock({ estado: 'disponible', cantidad: 12 }, 'unidad'), { tone: 'ok', label: 'Disponible', detail: '12 unidades en la tienda' });
  assert.equal(core.describeStock({ estado: 'pocas', cantidad: 2 }, 'unidad').label, 'Quedan pocas');
  assert.equal(core.describeStock({ estado: 'sin_stock', cantidad: 0 }, 'unidad').tone, 'out');
  assert.equal(core.describeStock({ estado: 'no_controlado' }, 'unidad').detail, '');
  assert.equal(core.describeStock({ estado: 'raro' }, 'unidad').tone, 'unknown');
});

test('parseProductResponse acepta el contrato y rechaza formas distintas', () => {
  const ok = core.parseProductResponse({ found: true, producto: { codigo: '78', nombre: 'Leche', precio: 1090, formato: 'unidad', stock: { estado: 'disponible', cantidad: 5 } } });
  assert.equal(ok.nombre, 'Leche');
  assert.equal(ok.stock.cantidad, 5);
  assert.throws(() => core.parseProductResponse({ found: true, producto: { codigo: '78', nombre: 'Leche', precio: '1090', formato: 'unidad', stock: { estado: 'disponible' } } }));
  assert.throws(() => core.parseProductResponse({ found: true, producto: { codigo: '78', nombre: 'Leche', precio: 1, formato: 'caja', stock: { estado: 'disponible' } } }));
  assert.throws(() => core.parseProductResponse({ found: false }));
  assert.throws(() => core.parseProductResponse([]));
});

test('parseCartResponse revisa estado, items y código del carrito enviado', () => {
  const item = { item_id: 3, codigo: '78', nombre: 'Leche', precio: 1090, cantidad: 2, subtotal: 2180, stock: { estado: 'disponible' } };
  const open = core.parseCartResponse({ carrito: { estado: 'abierto', items: [item], total: 2180 } });
  assert.equal(open.items.length, 1);
  assert.equal(open.codigo, null);
  const sent = core.parseCartResponse({ carrito: { estado: 'enviado', items: [item], total: 2180, codigo: '482913', codigo_expira: '2026-11-18T18:00:00Z' } });
  assert.equal(sent.codigo, '482913');
  assert.throws(() => core.parseCartResponse({ carrito: { estado: 'enviado', items: [item], total: 2180 } }));
  assert.throws(() => core.parseCartResponse({ carrito: { estado: 'abierto', items: [{ ...item, precio: null }], total: 2180 } }));
  assert.throws(() => core.parseCartResponse({ carrito: { estado: 'otro', items: [], total: 0 } }));
  assert.throws(() => core.parseCartResponse({}));
});

test('describeCodeExpiry calcula vencimiento', () => {
  const now = Date.parse('2026-11-18T16:00:00Z');
  const live = core.describeCodeExpiry('2026-11-18T17:58:00Z', now);
  assert.equal(live.expired, false);
  assert.equal(live.minutesLeft, 118);
  assert.equal(live.remainingLabel, '1 h 58 min');
  assert.match(live.timeLabel, /^\d{2}:\d{2}$/);
  assert.equal(core.describeCodeExpiry('2026-11-18T15:59:00Z', now).expired, true);
  assert.equal(core.describeCodeExpiry('no-es-fecha', now).expired, true);
});

test('formatCartCode, clampQuantity y apiErrorMessage', () => {
  assert.equal(core.formatCartCode('482913'), '482 913');
  assert.equal(core.clampQuantity(0), 1);
  assert.equal(core.clampQuantity(150), 99);
  assert.equal(core.clampQuantity('3'), 3);
  assert.equal(core.apiErrorMessage(409, { code: 'CART_LOCKED', message: 'x' }), core.ERROR_MESSAGES.CART_LOCKED);
  assert.equal(core.apiErrorMessage(429, {}), core.ERROR_MESSAGES.RATE_LIMITED);
  assert.equal(core.apiErrorMessage(400, { message: 'Dato malo' }), 'Dato malo');
  assert.match(core.apiErrorMessage(500, null), /servidor/);
});

test('QR: dirección de la consulta y avisos de host', () => {
  assert.equal(qr.buildConsultaUrl('https://minimarket.siacore.cl'), 'https://minimarket.siacore.cl/consulta/');
  assert.equal(qr.buildConsultaUrl('https://minimarket.siacore.cl/'), 'https://minimarket.siacore.cl/consulta/');
  assert.equal(qr.describeQrAddressProblem({ hostname: 'minimarket.siacore.cl', protocol: 'https:' }), '');
  assert.match(qr.describeQrAddressProblem({ hostname: 'localhost', protocol: 'http:' }), /localhost/);
  assert.match(qr.describeQrAddressProblem({ hostname: '192.168.1.20', protocol: 'http:' }), /IP/);
  assert.match(qr.describeQrAddressProblem({ hostname: 'tienda.cl', protocol: 'http:' }), /http:/);
  assert.match(qr.qrErrorMessage(503, { code: 'QR_UNAVAILABLE' }), /generador/);
  assert.match(qr.qrErrorMessage(400, { code: 'INVALID_URL' }), /https/);
  assert.match(qr.qrErrorMessage(404, null), /todavía no tiene/);
});

test('la consulta pública no usa el token del personal y escribe texto sin innerHTML', () => {
  const js = ['consulta.js', 'consulta_ui.js']
    .map((f) => fs.readFileSync(path.join(__dirname, '..', 'consulta', f), 'utf8')).join('\n');
  assert.doesNotMatch(js, /getItem\('token'\)/);
  assert.doesNotMatch(js, /innerHTML|insertAdjacentHTML|outerHTML/);
  assert.match(js, /tienda_cliente_token/);
  const html = fs.readFileSync(path.join(__dirname, '..', 'consulta', 'index.php'), 'utf8');
  assert.doesNotMatch(html, /\sstyle=|<style|onclick=/, 'la CSP no permite estilos ni eventos en línea');
  assert.match(html, /Content-Security-Policy/);
  const sw = fs.readFileSync(path.join(__dirname, '..', 'consulta', 'sw.js'), 'utf8');
  assert.match(sw, /startsWith\('\/api\/'\)\) return false/);
});

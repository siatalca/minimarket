const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../server/tienda_core.js');

test('normalizePhone acepta formatos chilenos y devuelve +569XXXXXXXX', () => {
  assert.equal(core.normalizePhone('912345678'), '+56912345678');
  assert.equal(core.normalizePhone('+56 9 1234 5678'), '+56912345678');
  assert.equal(core.normalizePhone('56-9-1234-5678'), '+56912345678');
  assert.equal(core.normalizePhone(912345678), '+56912345678');
});

test('normalizePhone rechaza fijos, largos incorrectos y texto', () => {
  for (const bad of ['', '22345678', '812345678', '+5491123456789', '9123456', 'abc', null, {}, '9123456789']) {
    assert.equal(core.normalizePhone(bad), null, String(bad));
  }
});

test('nombre, correo y clave respetan los limites', () => {
  assert.equal(core.normalizeName('  Ana   Perez \n'), 'Ana Perez');
  assert.equal(core.normalizeName('x'.repeat(61)), null);
  assert.equal(core.normalizeName('   '), null);
  assert.equal(core.normalizeEmail(' Ana@Correo.CL '), 'ana@correo.cl');
  assert.equal(core.normalizeEmail('sin-arroba'), null);
  assert.equal(core.normalizeEmail(`${'a'.repeat(115)}@b.cl`), `${'a'.repeat(115)}@b.cl`, '120 caracteres');
  assert.equal(core.normalizeEmail(`${'a'.repeat(116)}@b.cl`), null, '121 caracteres');
  assert.equal(core.isValidPassword('12345'), false);
  assert.equal(core.isValidPassword('123456'), true);
  assert.equal(core.isValidPassword('a'.repeat(72)), true);
  assert.equal(core.isValidPassword('a'.repeat(73)), false);
  assert.equal(core.isValidPassword('ñ'.repeat(37)), false, '74 bytes en UTF-8');
  assert.equal(core.isValidPassword(123456), false);
});

test('normalizeProductCode solo acepta codigo exacto permitido', () => {
  assert.equal(core.normalizeProductCode(' 7801234567890 '), '7801234567890');
  assert.equal(core.normalizeProductCode('AB-12.3'), 'AB-12.3');
  for (const bad of ['', '%', 'a b', "1' OR 1=1", 'x'.repeat(65), null, ['1']]) {
    assert.equal(core.normalizeProductCode(bad), null, String(bad));
  }
});

test('parseCartQuantity: enteros 1-99 y 0 solo si se permite', () => {
  assert.equal(core.parseCartQuantity(1), 1);
  assert.equal(core.parseCartQuantity('99'), 99);
  assert.equal(core.parseCartQuantity(100), null);
  assert.equal(core.parseCartQuantity(1.5), null);
  assert.equal(core.parseCartQuantity('2.0'), null);
  assert.equal(core.parseCartQuantity(-1), null);
  assert.equal(core.parseCartQuantity(true), null);
  assert.equal(core.parseCartQuantity(0), null);
  assert.equal(core.parseCartQuantity(0, { allowZero: true }), 0);
});

test('toPublicProduct expone solo la lista blanca de campos', () => {
  const row = {
    id_producto: 9, codigo_barras: ' 780 ', descripcion: 'Leche', precio_venta: '990.00', costo: 500, ganancia: 50,
    supplier_id: 2, supplier_name: 'Prov', departamento: 'Lacteos', cantidad_minima: 5, cantidad_maxima: 50,
    cantidad_actual: '12.000', utiliza_inventario: 1, formato_venta: 'Unidad',
  };
  const product = core.toPublicProduct(row);
  assert.deepEqual(Object.keys(product).sort(), ['codigo', 'formato', 'nombre', 'precio', 'stock']);
  assert.deepEqual(product, {
    codigo: '780', nombre: 'Leche', precio: 990, formato: 'unidad', stock: { estado: 'disponible', cantidad: 12 },
  });
  const text = JSON.stringify(product);
  for (const hidden of ['costo', 'ganancia', 'supplier', 'departamento', 'minima', 'maxima', 'id_producto']) {
    assert.ok(!text.includes(hidden), hidden);
  }
});

test('buildPublicStock: no controlado, sin stock, pocas y disponible', () => {
  assert.deepEqual(core.buildPublicStock({ utiliza_inventario: 0, cantidad_actual: 40 }), { estado: 'no_controlado' });
  assert.deepEqual(core.buildPublicStock({ utiliza_inventario: 1, cantidad_actual: -2 }), { estado: 'sin_stock', cantidad: 0 });
  assert.deepEqual(core.buildPublicStock({ utiliza_inventario: 1, cantidad_actual: 5, cantidad_minima: 5 }), { estado: 'pocas', cantidad: 5 });
  assert.deepEqual(core.buildPublicStock({ utiliza_inventario: 1, cantidad_actual: 6, cantidad_minima: 5 }), { estado: 'disponible', cantidad: 6 });
  assert.deepEqual(core.buildPublicStock({ utiliza_inventario: 1, cantidad_actual: 3, cantidad_minima: 0 }), { estado: 'pocas', cantidad: 3 });
  assert.deepEqual(core.buildPublicStock({ utiliza_inventario: 1, cantidad_actual: 2.5 }), { estado: 'pocas', cantidad: 2.5 });
});

test('resolvePublicFormat usa los mismos nombres de granel que la caja', () => {
  for (const name of ['granel', 'Kilo', 'KG', 'kilogramos']) assert.equal(core.resolvePublicFormat(name), 'granel');
  for (const name of ['unidad', 'pack', 'botella', '', null]) assert.equal(core.resolvePublicFormat(name), 'unidad');
});

test('buildCartResponse calcula subtotales y total, y muestra codigo solo si fue enviado', () => {
  const items = [
    { item_id: 1, cantidad: 2, codigo_barras: 'A', descripcion: 'Pan', precio_venta: 1500, utiliza_inventario: 0 },
    { item_id: 2, cantidad: 3, codigo_barras: 'B', descripcion: 'Bebida', precio_venta: '1290.5', utiliza_inventario: 1, cantidad_actual: 10 },
  ];
  const open = core.buildCartResponse({ estado: 'abierto', codigo: null }, items);
  assert.equal(open.estado, 'abierto');
  assert.equal(open.total, 6871.5);
  assert.equal(open.items[1].subtotal, 3871.5);
  assert.equal('codigo' in open, false);
  assert.deepEqual(Object.keys(open.items[0]).sort(), ['cantidad', 'codigo', 'disponible', 'item_id', 'nombre', 'precio', 'problema', 'stock', 'subtotal']);
  assert.equal(open.items[0].disponible, null);
  assert.equal(open.items[1].disponible, 10);
  assert.equal(open.bloqueado_por_stock, false);

  const expires = new Date('2026-11-18T15:00:00Z');
  const sent = core.buildCartResponse({ estado: 'enviado', codigo: '012345', codigo_expira: expires }, items);
  assert.equal(sent.codigo, '012345');
  assert.equal(sent.codigo_expira, '2026-11-18T15:00:00.000Z');

  assert.deepEqual(core.buildCartResponse(null, []), { estado: 'abierto', items: [], total: 0, bloqueado_por_stock: false });
});

test('M-038 availableForCart: null sin inventario; con inventario la parte entera y 0 si no hay', () => {
  assert.equal(core.availableForCart({ utiliza_inventario: 0, cantidad_actual: 40 }), null);
  assert.equal(core.availableForCart({ utiliza_inventario: '1', cantidad_actual: '12.000' }), 12);
  assert.equal(core.availableForCart({ utiliza_inventario: 1, cantidad_actual: 2.5 }), 2);
  assert.equal(core.availableForCart({ utiliza_inventario: 1, cantidad_actual: 0.5 }), 0);
  assert.equal(core.availableForCart({ utiliza_inventario: 1, cantidad_actual: -3 }), 0);
  assert.equal(core.availableForCart({ utiliza_inventario: 1, cantidad_actual: null }), 0);
});

test('M-038 cartItemStockProblem', () => {
  assert.equal(core.cartItemStockProblem(50, null), null);
  assert.equal(core.cartItemStockProblem(1, 0), 'sin_stock');
  assert.equal(core.cartItemStockProblem(3, 2), 'excede_stock');
  assert.equal(core.cartItemStockProblem(2, 2), null);
});

test('M-038 resolveCartLineQuantity: agregar y cambiar con stock', () => {
  const r = core.resolveCartLineQuantity;
  // Sin inventario: solo el tope 99.
  assert.deepEqual(r({ existing: 98, requested: 5, disponible: null }), { cantidad: 99 });
  // Sin stock: no se agrega ni se sube.
  assert.deepEqual(r({ requested: 1, disponible: 0 }), { error: 'OUT_OF_STOCK', disponible: 0 });
  assert.deepEqual(r({ requested: 1, disponible: 0, mode: 'set' }), { error: 'OUT_OF_STOCK', disponible: 0 });
  // Dentro del stock.
  assert.deepEqual(r({ existing: 1, requested: 1, disponible: 2 }), { cantidad: 2 });
  // Pide mas: se limita y avisa.
  assert.deepEqual(r({ existing: 1, requested: 5, disponible: 3 }), { cantidad: 3, limited: true, disponible: 3 });
  // Ya tenia todo (o mas, porque bajo el stock): STOCK_LIMIT sin cambios.
  assert.deepEqual(r({ existing: 3, requested: 1, disponible: 3 }), { error: 'STOCK_LIMIT', disponible: 3 });
  assert.deepEqual(r({ existing: 5, requested: 1, disponible: 3 }), { error: 'STOCK_LIMIT', disponible: 3 });
  // Stock sobre 99: manda el tope 99 sin aviso.
  assert.deepEqual(r({ existing: 99, requested: 1, disponible: 150 }), { cantidad: 99 });
  // Cambiar cantidad: reemplaza (no suma) y se limita.
  assert.deepEqual(r({ existing: 5, requested: 4, disponible: 2, mode: 'set' }), { cantidad: 2, limited: true, disponible: 2 });
  assert.deepEqual(r({ existing: 5, requested: 2, disponible: 2, mode: 'set' }), { cantidad: 2 });
  assert.deepEqual(core.stockLimitedNotice(3), { code: 'STOCK_LIMITED', disponible: 3, message: 'Solo quedan 3' });
});

test('M-038 buildCartResponse marca problemas de stock y bloqueado_por_stock', () => {
  const cart = core.buildCartResponse({ estado: 'abierto' }, [
    { item_id: 1, cantidad: 2, codigo_barras: 'A', descripcion: 'A', precio_venta: 10, utiliza_inventario: 1, cantidad_actual: 0 },
    { item_id: 2, cantidad: 5, codigo_barras: 'B', descripcion: 'B', precio_venta: 10, utiliza_inventario: 1, cantidad_actual: 3 },
    { item_id: 3, cantidad: 9, codigo_barras: 'C', descripcion: 'C', precio_venta: 10, utiliza_inventario: 0, cantidad_actual: 0 },
  ]);
  assert.deepEqual(cart.items.map((i) => [i.disponible, i.problema]), [[0, 'sin_stock'], [3, 'excede_stock'], [null, null]]);
  assert.equal(cart.bloqueado_por_stock, true);
});

test('token de sesion: 32 bytes, guardado como sha256 y no es JWT', () => {
  const { token, tokenHash } = core.generateSessionToken();
  assert.equal(core.isWellFormedSessionToken(token), true);
  assert.equal(Buffer.from(token, 'base64url').length, 32);
  assert.match(tokenHash, /^[0-9a-f]{64}$/);
  assert.equal(core.hashToken(token), tokenHash);
  assert.equal(core.isWellFormedSessionToken('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjF9.abc'), false);
  assert.equal(core.isWellFormedSessionToken(undefined), false);
});

test('codigo del carrito: 6 digitos con ceros a la izquierda', () => {
  assert.equal(core.generateCartCode(() => 42), '000042');
  assert.match(core.generateCartCode(), /^\d{6}$/);
  assert.equal(core.normalizeCartCode(' 012 345 '), '012345');
  assert.equal(core.normalizeCartCode('12345'), null);
  assert.equal(core.normalizeCartCode('abcdef'), null);
});

test('isCartCodeActive compara con el vencimiento', () => {
  const nowMs = Date.parse('2026-11-18T12:00:00Z');
  const cart = { estado: 'enviado', codigo: '111111', codigo_expira: new Date(nowMs + 1000) };
  assert.equal(core.isCartCodeActive(cart, nowMs), true);
  assert.equal(core.isCartCodeActive({ ...cart, codigo_expira: new Date(nowMs - 1) }, nowMs), false);
  assert.equal(core.isCartCodeActive({ ...cart, estado: 'abierto' }, nowMs), false);
});

test('classifyRedeemFailure: vencido 410, usado 409, inexistente 404', () => {
  assert.equal(core.classifyRedeemFailure({ pending: { estado: 'enviado', vigente: 0 }, used: false }).status, 410);
  assert.equal(core.classifyRedeemFailure({ pending: { estado: 'enviado', vigente: 0 } }).code, 'CODE_EXPIRED');
  assert.equal(core.classifyRedeemFailure({ pending: null, used: { reciente: 1 } }).code, 'CODE_USED');
  assert.equal(core.classifyRedeemFailure({ pending: null, used: { reciente: 1 } }).status, 409);
  assert.equal(core.classifyRedeemFailure({ pending: null, used: { reciente: 0 } }).status, 404, 'retiro de hace mas de 24 h');
  assert.equal(core.classifyRedeemFailure({ pending: null, used: true }).status, 404, 'sin dato de fecha no se afirma usado');
  assert.equal(core.classifyRedeemFailure({ pending: null, used: false }).status, 404);
  assert.equal(core.classifyRedeemFailure({}).code, 'CODE_NOT_FOUND');
});

test('validateQrTargetUrl: https y /consulta/, http solo en localhost, maximo 200', () => {
  assert.equal(core.validateQrTargetUrl('https://minimarket.example.cl/consulta/'), 'https://minimarket.example.cl/consulta/');
  assert.equal(core.validateQrTargetUrl('http://localhost:8080/consulta/'), 'http://localhost:8080/consulta/');
  assert.equal(core.validateQrTargetUrl('http://127.0.0.1/consulta/'), 'http://127.0.0.1/consulta/');
  for (const bad of [
    'http://minimarket.example.cl/consulta/',
    'http://192.168.1.10/consulta/',
    'https://minimarket.example.cl/otra/',
    'https://minimarket.example.cl/consultas',
    'javascript:alert(1)',
    'https://user:pass@minimarket.example.cl/consulta/',
    `https://minimarket.example.cl/consulta/?x=${'a'.repeat(200)}`,
    '',
    null,
  ]) {
    assert.equal(core.validateQrTargetUrl(bad), null, String(bad));
  }
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const core = require('../js/carrito_cliente.js');

const helpers = {
  isBulk: (p) => p.formato_venta === 'granel',
  saleFormat: (p) => (p.formato_venta === 'granel' ? 'granel' : 'unidad'),
};

function product(id, extra = {}) {
  return { id_producto: id, descripcion: `Producto ${id}`, codigo_barras: `78${id}`, precio_venta: '1000', utiliza_inventario: 1, cantidad_actual: 10, formato_venta: 'unidad', ...extra };
}

test('normalizeCustomerCartCode acepta 6 dígitos con espacios', () => {
  assert.equal(core.normalizeCustomerCartCode('482 913'), '482913');
  assert.equal(core.normalizeCustomerCartCode(' 482-913 '), '482913');
  assert.equal(core.normalizeCustomerCartCode('48291'), '');
  assert.equal(core.normalizeCustomerCartCode('48291a'), '');
  assert.equal(core.normalizeCustomerCartCode(''), '');
});

test('planCustomerCartLoad carga productos con precio numérico y formato', () => {
  const plan = core.planCustomerCartLoad([{ product: product(1), cantidad: 2 }, { product: product(2, { utiliza_inventario: 0, cantidad_actual: 0 }), cantidad: 5 }], [], helpers);
  assert.equal(plan.cart.length, 2);
  assert.equal(plan.cart[0].quantity, 2);
  assert.equal(plan.cart[0].precio_venta, 1000);
  assert.equal(plan.cart[0].formato_venta, 'unidad');
  assert.equal(plan.cart[1].quantity, 5, 'sin control de inventario no se recorta');
  assert.equal(plan.loadedLines, 2);
  assert.equal(plan.loadedUnits, 7);
  assert.deepEqual(plan.notes, []);
});

test('planCustomerCartLoad aplica la regla de stock de addToCart', () => {
  const plan = core.planCustomerCartLoad([
    { product: product(1, { cantidad_actual: 3 }), cantidad: 5 },
    { product: product(2, { cantidad_actual: 0 }), cantidad: 1 },
    { product: product(3, { cantidad_actual: 2.7 }), cantidad: 4 },
  ], [], helpers);
  assert.deepEqual(plan.cart.map((i) => [i.id_producto, i.quantity]), [[1, 3], [3, 2]]);
  assert.equal(plan.notes.length, 3);
  assert.match(plan.notes[0], /3 de 5/);
  assert.match(plan.notes[1], /sin stock/);
});

test('planCustomerCartLoad suma a lo que ya está en el ticket sin pasar el stock', () => {
  const current = [{ ...product(1, { cantidad_actual: 4 }), quantity: 3, line_subtotal: 3000 }];
  const plan = core.planCustomerCartLoad([{ product: product(1, { cantidad_actual: 4 }), cantidad: 2 }], current, helpers);
  assert.equal(plan.cart.length, 1);
  assert.equal(plan.cart[0].quantity, 4);
  assert.equal(plan.cart[0].line_subtotal, 0);
  assert.equal(current[0].quantity, 3, 'no modifica el carrito original');
});

test('planCustomerCartLoad no carga granel ni filas mal formadas', () => {
  const plan = core.planCustomerCartLoad([
    { product: product(1, { formato_venta: 'granel' }), cantidad: 1 },
    { product: null, cantidad: 1 },
    { product: product(2), cantidad: 0 },
  ], [], helpers);
  assert.equal(plan.cart.length, 0);
  assert.equal(plan.notes.length, 3);
  assert.match(plan.notes[0], /granel/);
});

test('parseCustomerCartResponse exige cliente, items y faltantes', () => {
  const ok = core.parseCustomerCartResponse({ cliente: { nombre: 'Ana', telefono: '+56912345678' }, items: [], faltantes: [{ nombre: 'Pan', motivo: 'ya no existe' }] });
  assert.equal(ok.cliente.nombre, 'Ana');
  assert.equal(ok.faltantes[0].motivo, 'ya no existe');
  assert.throws(() => core.parseCustomerCartResponse({ items: [], faltantes: [] }));
  assert.throws(() => core.parseCustomerCartResponse({ cliente: {}, items: {}, faltantes: [] }));
  assert.throws(() => core.parseCustomerCartResponse(null));
});

test('customerCartErrorMessage explica cada caso del canje', () => {
  assert.match(core.customerCartErrorMessage(404, { code: 'CODE_NOT_FOUND' }), /No existe/);
  assert.match(core.customerCartErrorMessage(410, { code: 'CODE_EXPIRED' }), /venció/);
  assert.match(core.customerCartErrorMessage(409, { code: 'CODE_USED' }), /ya se cargó/);
  assert.match(core.customerCartErrorMessage(429, {}), /Espera/);
});

test('Ventas no llama al canje si el ticket ya tiene productos', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'js', 'carrito_cliente.js'), 'utf8');
  const guard = js.indexOf('cart.length > 0');
  const call = js.indexOf('`${API_URL}api/ventas/carrito-cliente/cargar`');
  assert.ok(guard > 0 && call > guard, 'la revisión del ticket va antes del POST');
  const footer = fs.readFileSync(path.join(__dirname, '..', 'layout', 'footer.php'), 'utf8');
  assert.ok(footer.indexOf('carrito_cliente.js') > footer.indexOf('scripts.js'));
});

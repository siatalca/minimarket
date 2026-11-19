// Pantalla «Clientes de la app» (M-039): lógica pura de js/clientes_app.js y el vínculo carrito-venta de
// js/carrito_cliente.js.
const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../js/clientes_app.js');
const cartCore = require('../js/carrito_cliente.js');

function client(extra = {}) {
  return {
    id: 7, nombre: 'María Pérez', telefono: '+56911112222', correo: 'maria@example.com', google_vinculado: false,
    activo: 1, creado: '2026-11-01T12:00:00.000Z', ultimo_ingreso: '2026-11-17T15:30:00.000Z', carritos: 3, ...extra,
  };
}

function cart(extra = {}) {
  return {
    id: 11, estado: 'abierto', codigo: null, codigo_usado: null, creado: '2026-11-17T10:00:00.000Z',
    actualizado: '2026-11-17T10:05:00.000Z', codigo_expira: null, cargado_en_caja: null, venta: null,
    items: [{ codigo: '7801', nombre: 'Leche', cantidad: 2, precio_actual: 1290 }], total_actual: 2580, ...extra,
  };
}

test('buildListPath recorta la búsqueda a 60 caracteres y codifica', () => {
  assert.equal(core.buildListPath('', 1), 'api/admin/tienda/clientes?pagina=1');
  assert.equal(core.buildListPath('  ana & co ', 2), 'api/admin/tienda/clientes?q=ana+%26+co&pagina=2');
  const long = 'x'.repeat(80);
  const q = new URLSearchParams(core.buildListPath(long, 1).split('?')[1]).get('q');
  assert.equal(q.length, 60);
  assert.equal(core.buildListPath('a', 0), 'api/admin/tienda/clientes?q=a&pagina=1');
});

test('buildDetailPath solo acepta ids enteros positivos', () => {
  assert.equal(core.buildDetailPath(7), 'api/admin/tienda/clientes/7');
  assert.throws(() => core.buildDetailPath('7/../x'));
  assert.throws(() => core.buildDetailPath(0));
});

test('parseClientList acepta el contrato y calcula páginas', () => {
  const list = core.parseClientList({ clientes: [client()], total: 120, pagina: 2, por_pagina: 50 });
  assert.equal(list.paginas, 3);
  assert.equal(list.clientes[0].nombre, 'María Pérez');
  assert.equal(list.clientes[0].activo, true);
  const empty = core.parseClientList({ clientes: [], total: 0, pagina: 1, por_pagina: 50 });
  assert.equal(empty.paginas, 1);
});

test('parseClientList rechaza respuestas fuera de contrato (no se muestran como vacías)', () => {
  assert.throws(() => core.parseClientList(null));
  assert.throws(() => core.parseClientList({ clientes: [] }));
  assert.throws(() => core.parseClientList({ clientes: {}, total: 0, pagina: 1, por_pagina: 50 }));
  assert.throws(() => core.parseClientList({ clientes: [{ nombre: 'sin id' }], total: 1, pagina: 1, por_pagina: 50 }));
  assert.throws(() => core.parseClientList({ clientes: [client({ creado: 'ayer' })], total: 1, pagina: 1, por_pagina: 50 }));
});

test('parseClientDetail valida carritos, caja, venta e ítems', () => {
  const detail = core.parseClientDetail({
    cliente: client(),
    carritos: [cart(), cart({
      id: 12, estado: 'retirado', codigo_usado: '482913',
      cargado_en_caja: { fecha: '2026-11-18T13:00:00.000Z', caja: { numero: 2, nombre: 'Caja 2' }, cajera: { nombre: 'Ana' } },
      venta: { id: 900, fecha: '2026-11-18T13:04:00.000Z', total: '4500' },
    })],
  });
  assert.equal(detail.carritos.length, 2);
  assert.equal(detail.carritos[1].venta.total, 4500);
  assert.equal(detail.carritos[1].cargado_en_caja.caja.numero, '2');
  assert.throws(() => core.parseClientDetail({ cliente: client(), carritos: [cart({ estado: 'otro' })] }));
  assert.throws(() => core.parseClientDetail({ cliente: client(), carritos: [cart({ items: null })] }));
  assert.throws(() => core.parseClientDetail({ cliente: client(), carritos: [cart({ venta: { total: 1 } })] }));
  assert.throws(() => core.parseClientDetail({ cliente: client() }));
});

test('describeCart: enviado vigente y vencido', () => {
  const now = Date.parse('2026-11-18T12:00:00.000Z');
  const vigente = core.describeCart(cart({ estado: 'enviado', codigo: '123456', codigo_expira: '2026-11-18T13:00:00.000Z' }), now);
  assert.equal(vigente.estado, 'Esperando caja');
  assert.match(vigente.lineas[0], /Código 123456: vence/);
  const vencido = core.describeCart(cart({ estado: 'enviado', codigo: '123456', codigo_expira: '2026-11-18T11:00:00.000Z' }), now);
  assert.equal(vencido.estado, 'Código vencido');
});

test('describeCart: retirado con caja y venta, con caja sin venta, y antiguo sin caja', () => {
  const base = { estado: 'retirado', codigo_usado: '482913' };
  const conVenta = core.describeCart(cart({
    ...base,
    cargado_en_caja: { fecha: '2026-11-18T13:00:00.000Z', caja: { numero: '2', nombre: 'Mesón' }, cajera: { nombre: 'Ana' } },
    venta: { id: 900, fecha: '2026-11-18T13:04:00.000Z', total: 4500 },
  }));
  assert.equal(conVenta.estado, 'Retirado en caja');
  assert.ok(conVenta.lineas.some((l) => l.includes('por Ana') && l.includes('482913')));
  assert.ok(conVenta.lineas.includes('Caja 2 (Mesón).'));
  assert.ok(conVenta.lineas.some((l) => l.startsWith('Venta N° 900') && l.includes('$4.500')));

  const sinVenta = core.describeCart(cart({
    ...base, cargado_en_caja: { fecha: '2026-11-18T13:00:00.000Z', caja: { numero: '1', nombre: '' }, cajera: null },
  }));
  assert.ok(sinVenta.lineas.includes('Caja 1.'));
  assert.ok(sinVenta.lineas.some((l) => l.startsWith('Sin venta vinculada: el ticket no se cobró')));

  const antiguo = core.describeCart(cart({ ...base, cargado_en_caja: { fecha: '2026-11-10T13:00:00.000Z', caja: null, cajera: { nombre: 'Ana' } } }));
  assert.ok(antiguo.lineas.some((l) => l.startsWith('Caja: sin registro')));
  assert.ok(antiguo.lineas.includes('Sin venta vinculada (carrito anterior a este registro).'));
});

test('clientsErrorMessage: 401, 403 y 404 según la vista', () => {
  assert.match(core.clientsErrorMessage(401, null, 'list'), /sesión expiró/);
  assert.match(core.clientsErrorMessage(403, null, 'list'), /Solo los administradores/);
  assert.match(core.clientsErrorMessage(404, null, 'detail'), /ya no existe/);
  assert.match(core.clientsErrorMessage(404, null, 'list'), /Actualiza el sistema/);
  assert.equal(core.clientsErrorMessage(500, { message: ' Falla X ' }, 'list'), 'Falla X');
});

test('cartsTitle avisa cuando el detalle trae solo los últimos 100', () => {
  assert.equal(core.cartsTitle(0, 0), 'Carritos');
  assert.equal(core.cartsTitle(6, 6), 'Carritos (6)');
  assert.equal(core.cartsTitle(100, 100), 'Carritos (100)');
  assert.equal(core.cartsTitle(100, 140), 'Carritos (últimos 100 de 140)');
  assert.equal(core.cartsTitle(100, null), 'Carritos (100)');
});

test('carrito_cliente: el cuerpo de cargar lleva caja_id solo si es entero positivo', () => {
  assert.deepEqual(cartCore.buildCustomerCartLoadBody('123456', '2'), { codigo: '123456', caja_id: 2 });
  assert.deepEqual(cartCore.buildCustomerCartLoadBody('123456', 3), { codigo: '123456', caja_id: 3 });
  assert.deepEqual(cartCore.buildCustomerCartLoadBody('123456', ''), { codigo: '123456' });
  assert.deepEqual(cartCore.buildCustomerCartLoadBody('123456', 'caja 1'), { codigo: '123456' });
  assert.deepEqual(cartCore.buildCustomerCartLoadBody('123456', '0'), { codigo: '123456' });
  assert.deepEqual(cartCore.buildCustomerCartLoadBody('123456', null), { codigo: '123456' });
});

test('formatMoney y formatQuantity', () => {
  assert.equal(core.formatMoney(4500), '$4.500');
  assert.equal(core.formatMoney(null), '—');
  assert.equal(core.formatQuantity(2), '2');
});

test('carrito_cliente: normalizeCartLinkId y carrito_id en la respuesta de carga', () => {
  assert.equal(cartCore.normalizeCartLinkId(15), 15);
  assert.equal(cartCore.normalizeCartLinkId('15'), 15);
  assert.equal(cartCore.normalizeCartLinkId('15a'), null);
  assert.equal(cartCore.normalizeCartLinkId(0), null);
  assert.equal(cartCore.normalizeCartLinkId(-3), null);
  assert.equal(cartCore.normalizeCartLinkId(1.5), null);
  assert.equal(cartCore.normalizeCartLinkId(null), null);
  const base = { cliente: { nombre: 'Ana' }, items: [], faltantes: [] };
  assert.equal(cartCore.parseCustomerCartResponse({ ...base, carrito_id: 42 }).carrito_id, 42);
  assert.equal(cartCore.parseCustomerCartResponse(base).carrito_id, null);
});

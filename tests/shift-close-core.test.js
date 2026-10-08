const test = require('node:test');
const assert = require('node:assert/strict');

const { closeShiftCore } = require('../server/shift_close_core');

function fakeDb({ cajaId, shiftId, ownerId, salesTotal, transactions, cash, card, movements }) {
  const updates = [];
  return {
    updates,
    async query(sql, params) {
      if (sql.includes('FROM corte_caja') && sql.includes("estado = 'abierto'")) {
        assert.equal(params[0], cajaId);
        assert.equal(params[1], ownerId);
        return [[{ id_corte: shiftId, estado: 'abierto', monto_inicial: 100, hora_apertura: '2026-10-07 08:00:00' }]];
      }
      if (sql.includes('COUNT(*) AS transacciones')) return [[{ transacciones: transactions, total: salesTotal }]];
      if (sql.startsWith('SELECT') && sql.includes('total_efectivo')) return [[{ total_efectivo: cash, total_tarjeta: card }]];
      if (sql.startsWith('SELECT') && sql.includes('total_mixto')) return [[{ total_mixto: 0 }]];
      if (sql.includes('FROM cash_movements')) return [movements];
      if (sql.includes('FROM personalization_settings')) return [[{ cut_mode: 'sin_ajuste' }]];
      if (sql.startsWith('UPDATE corte_caja') || sql.startsWith('UPDATE user_auth_sessions')) {
        updates.push({ sql, params });
        return [{ affectedRows: 1 }];
      }
      throw new Error(`SQL inesperado: ${sql}`);
    },
  };
}

for (const fixture of [
  { cajaId: 2, shiftId: 202, ownerId: 22, salesTotal: 100, transactions: 2, cash: 60, card: 40,
    movements: [{ tipo: 'entrada', metodo: 'efectivo', total: 20 }, { tipo: 'salida', metodo: 'efectivo', total: 10 }] },
  { cajaId: 8, shiftId: 808, ownerId: 28, salesTotal: 0, transactions: 0, cash: 0, card: 0,
    movements: [{ tipo: 'entrada', metodo: 'efectivo', total: 20 }, { tipo: 'salida', metodo: 'efectivo', total: 10 }] },
]) {
  test(`cierre compartido calcula caja ${fixture.cajaId} con ventas=${fixture.transactions}`, async () => {
    const database = fakeDb(fixture);
    const result = await closeShiftCore({
      database,
      cajaId: fixture.cajaId,
      cajeroId: fixture.ownerId,
      expectedShiftId: fixture.shiftId,
      montoDeclaradoInput: 0,
      montoDeclaradoTarjetaInput: 0,
      observaciones: null,
      auditNote: 'Cierre administrativo por admin_sia',
      sql: {
        cashAmount: () => '0', cardAmount: () => '0', mixedCondition: () => '1=0',
      },
    });
    assert.equal(result.id_corte, fixture.shiftId);
    assert.equal(result.total_ventas, fixture.salesTotal);
    assert.equal(result.transacciones, fixture.transactions);
    assert.equal(result.efectivo_esperado, 100 + fixture.cash + 20 - 10);
    assert.equal(database.updates.length, 2);
  });
}

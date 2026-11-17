const test = require('node:test');
const assert = require('node:assert/strict');

const { decideShiftOperation, buildReviewModeMessage } = require('../server/shift_operation_guard');

const cajeraShift = { id: 17, name: 'Ana Caja', login: 'cajera_ana' };

test('modo revisión: el administrador no puede abrir, vender ni cerrar en la caja con turno ajeno', () => {
  const decision = decideShiftOperation({
    authUserId: 1, cajeroId: 1, cajaId: 2, ownShiftId: 0, otherShift: cajeraShift,
  });
  assert.equal(decision.ok, false);
  assert.equal(decision.status, 409);
  assert.equal(decision.code, 'CAJA_EN_REVISION');
  assert.equal(
    decision.message,
    'Modo revisión: la caja 2 tiene el turno abierto de Ana Caja. No puedes vender, abrir ni cerrar caja desde aquí.'
  );
});

test('nadie puede operar el turno de otro usuario enviando su id como cajero', () => {
  const decision = decideShiftOperation({
    authUserId: 1, cajeroId: 17, cajaId: 2, ownShiftId: 55, otherShift: null,
  });
  assert.equal(decision.ok, false);
  assert.equal(decision.status, 403);
  assert.equal(decision.code, 'TURNO_DE_OTRO_USUARIO');
});

test('el dueño del turno opera normal', () => {
  assert.deepEqual(decideShiftOperation({
    authUserId: 17, cajeroId: 17, cajaId: 2, ownShiftId: 55, otherShift: null,
  }), { ok: true });
});

test('al cerrarse el turno ajeno el administrador vuelve a operar normal en esa caja', () => {
  assert.deepEqual(decideShiftOperation({
    authUserId: 1, cajeroId: 1, cajaId: 2, ownShiftId: 0, otherShift: null,
  }), { ok: true });
});

test('si el usuario ya tiene su propio turno abierto no se bloquea por otro turno heredado', () => {
  assert.deepEqual(decideShiftOperation({
    authUserId: 1, cajeroId: 1, cajaId: 2, ownShiftId: 60, otherShift: cajeraShift,
  }), { ok: true });
});

test('el mensaje de modo revisión usa el login si no hay nombre', () => {
  assert.equal(
    buildReviewModeMessage({ cajaId: 3, owner: { login: 'cajera_ana' } }),
    'Modo revisión: la caja 3 tiene el turno abierto de cajera_ana. No puedes vender, abrir ni cerrar caja desde aquí.'
  );
});

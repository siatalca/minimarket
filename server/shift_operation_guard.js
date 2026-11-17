// Reglas para operar el turno de una caja (vender, abrir y cerrar turno).
// Un administrador puede entrar en "modo revision" a una caja con el turno abierto de otra persona:
// ve todo, pero no puede vender, abrir un segundo turno ni cerrar el turno ajeno.

function shiftOwnerLabel(owner = {}) {
  const name = String(owner?.name || '').trim();
  const login = String(owner?.login || '').trim();
  return name || login || 'otro usuario';
}

function buildReviewModeMessage({ cajaId, owner } = {}) {
  const caja = Number(cajaId || 0) || '';
  return `Modo revisión: la caja ${caja} tiene el turno abierto de ${shiftOwnerLabel(owner)}. `
    + 'No puedes vender, abrir ni cerrar caja desde aquí.';
}

// otherShift: turno abierto hoy en la caja que pertenece a otro usuario ({ id, name, login }) o null.
// ownShiftId: turno abierto hoy del propio cajero en esa caja (0 si no tiene).
function decideShiftOperation({ authUserId = 0, cajeroId = 0, cajaId = 0, ownShiftId = 0, otherShift = null } = {}) {
  const authId = Number(authUserId || 0);
  const cashierId = Number(cajeroId || 0);
  if (authId && cashierId && authId !== cashierId) {
    return {
      ok: false,
      status: 403,
      code: 'TURNO_DE_OTRO_USUARIO',
      message: 'No autorizado para operar el turno de otro usuario',
    };
  }
  if (Number(ownShiftId || 0) > 0) return { ok: true };
  const otherOwnerId = Number(otherShift?.id || 0);
  if (otherOwnerId > 0 && otherOwnerId !== cashierId) {
    return {
      ok: false,
      status: 409,
      code: 'CAJA_EN_REVISION',
      message: buildReviewModeMessage({ cajaId, owner: otherShift }),
    };
  }
  return { ok: true };
}

module.exports = {
  buildReviewModeMessage,
  decideShiftOperation,
};

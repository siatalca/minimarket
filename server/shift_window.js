// Ventana de un turno abierto (lo usan ambos backends y shift_close_core.js).
// Un turno con estado 'abierto' solo cuenta como activo si es de hoy o se abrio hace menos de
// 16 horas: asi un turno que cruza la medianoche sigue activo, pero uno viejo que nadie cerro
// no bloquea la caja ni suma de nuevo ventas antiguas al cerrarlo.
const OPEN_SHIFT_WINDOW_HOURS = 16;

function openShiftWindowSql(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return `(${prefix}fecha = CURDATE() OR ${prefix}hora_apertura >= NOW() - INTERVAL ${OPEN_SHIFT_WINDOW_HOURS} HOUR)`;
}

module.exports = { OPEN_SHIFT_WINDOW_HOURS, openShiftWindowSql };

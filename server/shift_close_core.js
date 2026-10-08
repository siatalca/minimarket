function amount(value) { const n = Number(value || 0); return Number.isFinite(n) ? n : 0; }
function norm(value) { return String(value || '').trim().toLowerCase(); }
function sum(rows, type, method) {
  return (rows || []).filter((row) => norm(row.tipo) === type && (!method || norm(row.metodo) === method))
    .reduce((total, row) => total + amount(row.total), 0);
}
function formatReceipt(result) {
  return [
    'CIERRE DE CAJA', `Caja: ${result.caja_id}`, `Turno: ${result.id_corte}`, `Cajero: ${result.cajero_id}`,
    `Fondo inicial: ${result.monto_inicial.toFixed(0)}`, `Ventas: ${result.total_ventas.toFixed(0)}`,
    `Transacciones: ${result.transacciones}`, `Efectivo ventas: ${result.total_efectivo.toFixed(0)}`,
    `Tarjeta: ${result.total_tarjeta.toFixed(0)}`, `Mixto: ${result.total_mixto.toFixed(0)}`,
    `Entradas efectivo: ${result.entradas_dinero.toFixed(0)}`, `Abonos efectivo: ${result.abonos_efectivo.toFixed(0)}`,
    `Salidas efectivo: ${result.salidas_dinero.toFixed(0)}`, `Salidas transferencia: ${result.salidas_transferencia.toFixed(0)}`,
    `Efectivo esperado: ${result.efectivo_esperado.toFixed(0)}`, `Efectivo declarado: ${result.monto_declarado.toFixed(0)}`,
    `Diferencia efectivo: ${result.diferencia_efectivo.toFixed(0)}`, `Tarjeta declarada: ${result.monto_declarado_tarjeta.toFixed(0)}`,
    `Diferencia tarjeta: ${result.diferencia_tarjeta.toFixed(0)}`,
  ].join('\n');
}

async function closeShiftCore({ database, cajaId, cajeroId, expectedShiftId = 0,
  montoDeclaradoInput = 0, montoDeclaradoTarjetaInput = 0, observaciones = null,
  auditNote = '', sql, lock = false }) {
  const [existing] = await database.query(
    `SELECT id_corte, estado, monto_inicial, hora_apertura FROM corte_caja
     WHERE fecha = CURDATE() AND caja_id = ? AND usuario_id = ? AND estado = 'abierto'
     ORDER BY id_corte DESC LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [cajaId, cajeroId]
  );
  if (!existing.length) { const error = new Error('Debe iniciar turno antes de cerrarlo'); error.status = 409; throw error; }
  const shiftId = Number(existing[0].id_corte || 0);
  if (expectedShiftId && shiftId !== Number(expectedShiftId)) { const error = new Error('El turno reservado ya no esta activo'); error.status = 409; throw error; }
  const start = existing[0].hora_apertura;
  const params = [cajaId, cajeroId, start, shiftId];
  const [totals] = await database.query(`SELECT COUNT(*) AS transacciones, COALESCE(SUM(total), 0) AS total FROM ventas WHERE COALESCE(folio_ticket, '') NOT LIKE 'ANULADA-%' AND caja_id = ? AND usuario_id = ? AND fecha >= ? AND (turno_id = ? OR turno_id IS NULL)`, params);
  const [cashCard] = await database.query(`SELECT COALESCE(SUM(${sql.cashAmount('v')}), 0) AS total_efectivo, COALESCE(SUM(${sql.cardAmount('v')}), 0) AS total_tarjeta FROM ventas v WHERE COALESCE(v.folio_ticket, '') NOT LIKE 'ANULADA-%' AND v.caja_id = ? AND v.usuario_id = ? AND v.fecha >= ? AND (v.turno_id = ? OR v.turno_id IS NULL)`, params);
  const [mixed] = await database.query(`SELECT COALESCE(SUM(v.total), 0) AS total_mixto FROM ventas v WHERE COALESCE(v.folio_ticket, '') NOT LIKE 'ANULADA-%' AND v.caja_id = ? AND v.usuario_id = ? AND v.fecha >= ? AND (v.turno_id = ? OR v.turno_id IS NULL) AND ${sql.mixedCondition('v')}`, params);
  const [movements] = await database.query(`SELECT tipo, metodo, COALESCE(SUM(monto), 0) AS total FROM cash_movements WHERE caja_id = ? AND usuario_id = ? AND fecha >= ? AND (turno_id = ? OR turno_id IS NULL) AND fecha <= NOW() GROUP BY tipo, metodo`, params);
  const [settings] = await database.query('SELECT cut_mode FROM personalization_settings WHERE id = 1 LIMIT 1');
  const mode = settings[0]?.cut_mode === 'sin_ajuste' ? 'sin_ajuste' : 'ajuste_auto';
  const totalEfectivo = amount(cashCard[0]?.total_efectivo); const totalTarjeta = amount(cashCard[0]?.total_tarjeta);
  const movementSum = sql.sumMovementAmounts || ((rows, options) => sum(rows, options.type, options.method));
  const entradas = movementSum(movements, { type: 'entrada', method: 'efectivo', field: 'total' });
  const abonos = movementSum(movements, { type: 'abono', method: 'efectivo', field: 'total' });
  const salidas = sql.sumCashExits ? sql.sumCashExits(movements, 'total') : sum(movements, 'salida', 'efectivo');
  const salidasTransferencia = sql.sumTransferExits ? sql.sumTransferExits(movements, 'total') : sum(movements, 'salida', 'transferencia');
  const inicial = amount(existing[0].monto_inicial); const esperado = inicial + totalEfectivo + abonos + entradas - salidas;
  const tarjetaEsperada = totalTarjeta;
  if (mode === 'ajuste_auto' && (montoDeclaradoInput === null || montoDeclaradoTarjetaInput === null
      || Number(montoDeclaradoInput) < 0 || Number(montoDeclaradoTarjetaInput) < 0)) {
    const error = new Error('Monto declarado invalido'); error.status = 400; throw error;
  }
  const declarado = mode === 'sin_ajuste' ? esperado : amount(montoDeclaradoInput);
  const declaradoTarjeta = mode === 'sin_ajuste' ? tarjetaEsperada : amount(montoDeclaradoTarjetaInput);
  const note = [String(observaciones || '').trim(), String(auditNote || '').trim()].filter(Boolean).join(' | ').slice(0, 255) || null;
  await database.query(`UPDATE corte_caja SET hora_cierre = NOW(), monto_declarado = ?, monto_declarado_tarjeta = ?, diferencia_efectivo = ?, diferencia_tarjeta = ?, total_efectivo = ?, total_tarjeta = ?, total_mixto = ?, total_ventas = ?, transacciones = ?, estado = 'cerrado', observaciones = ? WHERE id_corte = ?`, [declarado, declaradoTarjeta, declarado - esperado, declaradoTarjeta - tarjetaEsperada, totalEfectivo, totalTarjeta, amount(mixed[0]?.total_mixto), amount(totals[0]?.total), Number(totals[0]?.transacciones || 0), note, shiftId]);
  await database.query(`UPDATE user_auth_sessions SET revoked_at = NOW() WHERE user_id = ? AND caja_id = ? AND revoked_at IS NULL`, [cajeroId, cajaId]);
  const result = { success: true, id_corte: shiftId, caja_id: cajaId, cajero_id: cajeroId,
    fecha: new Date().toISOString().slice(0, 10), total_ventas: amount(totals[0]?.total), transacciones: Number(totals[0]?.transacciones || 0),
    total_efectivo: totalEfectivo, total_tarjeta: totalTarjeta, total_mixto: amount(mixed[0]?.total_mixto),
    entradas_dinero: entradas, abonos_efectivo: abonos, salidas_dinero: salidas, salidas_transferencia: salidasTransferencia,
    efectivo_esperado: esperado, monto_inicial: inicial, monto_declarado: declarado, monto_declarado_tarjeta: declaradoTarjeta,
    diferencia_efectivo: declarado - esperado, diferencia_tarjeta: declaradoTarjeta - tarjetaEsperada, mode };
  result.receipt_text = formatReceipt(result);
  return result;
}
module.exports = { closeShiftCore, formatReceipt };

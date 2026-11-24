// Cierre administrativo de turnos abandonados (M-052). Uso desde la carpeta del proyecto:
//
//   node server/cerrar_turnos_abandonados.js
//       Solo muestra: turnos con estado 'abierto' fuera de la ventana activa (no son de hoy y se
//       abrieron hace mas de 16 horas), resumen por caja y total. No escribe nada.
//
//   node server/cerrar_turnos_abandonados.js --aplicar --por <login>
//       Valida que <login> sea un administrador activo y cierra esos turnos: estado 'cerrado',
//       hora_cierre = hora en que dejaron de estar activos, y la marca del cierre administrativo
//       (cierre_tipo, cierre_admin_usuario_id, cierre_admin_login, cierre_admin_en).
//       No cambia montos, observaciones, ventas, movimientos de caja ni sesiones.
//
// Requiere las columnas nuevas de corte_caja: si faltan, ejecutar antes
//   node server/update_db_schema.js
//
// Reversion (deja abiertos otra vez los turnos cerrados por este script):
//   UPDATE corte_caja SET estado='abierto', hora_cierre=NULL, cierre_tipo=NULL, cierre_admin_usuario_id=NULL, cierre_admin_login=NULL, cierre_admin_en=NULL WHERE cierre_tipo='administrativo_abandonado';
const { previewAbandonedShifts, closeAbandonedShifts } = require('./abandoned_shift_close');

const USAGE = [
  'Uso:',
  '  node server/cerrar_turnos_abandonados.js                       (solo mostrar)',
  '  node server/cerrar_turnos_abandonados.js --aplicar --por <login>',
].join('\n');

function usageError(message) {
  const err = new Error(message);
  err.code = 'USO';
  return err;
}

function parseArgs(argv) {
  const options = { apply: false, admin: null, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--aplicar') options.apply = true;
    else if (arg === '--ayuda' || arg === '-h' || arg === '--help') options.help = true;
    else if (arg === '--por') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw usageError('--por necesita el login del administrador.');
      options.admin = value;
      i += 1;
    } else if (arg.startsWith('--por=')) options.admin = arg.slice('--por='.length);
    else throw usageError(`Argumento desconocido: ${arg}`);
  }
  if (options.apply && !String(options.admin || '').trim()) {
    throw usageError('--aplicar necesita --por <login> del administrador que firma el cierre.');
  }
  if (!options.apply && options.admin) {
    throw usageError('--por solo se usa junto con --aplicar.');
  }
  return options;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function printSummary(title, summary) {
  console.log(title);
  if (!summary.total) {
    console.log('  (ninguno)');
    return;
  }
  const rows = summary.porCaja.map((item) => ({
    caja: String(item.caja_id),
    turnos: String(item.turnos),
    desde: formatDateTime(item.desde),
    hasta: formatDateTime(item.hasta),
    con_ventas: String(item.con_ventas),
  }));
  const headers = ['caja', 'turnos', 'desde', 'hasta', 'con_ventas'];
  const widths = headers.map((h) => Math.max(h.length, ...rows.map((r) => r[h].length)));
  const line = (r) => '  ' + headers.map((h, i) => r[h].padEnd(widths[i])).join('  ');
  console.log(line(Object.fromEntries(headers.map((h) => [h, h]))));
  rows.forEach((r) => console.log(line(r)));
  console.log(`  Total: ${summary.total} turno(s) en ${summary.porCaja.length} caja(s).`);
}

async function main(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(USAGE);
    return 0;
  }
  const db = require('./db');
  try {
    const before = await previewAbandonedShifts(db);
    printSummary('Turnos abandonados (abiertos fuera de la ventana activa):', before);
    if (!options.apply) {
      console.log('\nModo solo mostrar: no se cambio nada. Para cerrarlos: --aplicar --por <login>');
      return 0;
    }
    const result = await closeAbandonedShifts(db, { admin: options.admin, apply: true });
    console.log(`\nCerrados por ${result.admin.login} (id ${result.admin.id}): ${result.affectedRows} turno(s).`);
    const after = await previewAbandonedShifts(db);
    printSummary('\nDespues del cierre, turnos abandonados restantes:', after);
    return 0;
  } finally {
    await db.end();
  }
}

if (require.main === module) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      console.error(`Error: ${err.message}`);
      if (err.code === 'USO') console.error(USAGE);
      process.exitCode = 1;
    });
}

module.exports = { parseArgs, formatDateTime };

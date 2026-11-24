// Libera la caja 8, que era exclusiva de admin_sia (M-052). Uso desde la carpeta del proyecto:
//
//   node server/liberar_caja_sia.js
//       Solo muestra: la fila de la caja 8, los equipos vinculados a ella (device_caja_bindings),
//       las sesiones abiertas en ella, sus turnos abiertos y cuantas cajas activas hay frente al
//       limite. No escribe nada.
//
//   node server/liberar_caja_sia.js --aplicar
//       En una transaccion:
//         1. desvincula de la caja 8 todos los equipos (DELETE en device_caja_bindings, numero_caja = 8);
//         2. deja la caja 8 inactiva (cajas.estado = 0): queda libre como caja normal y no ocupa
//            cupo del limite de cajas activas; un administrador puede activarla despues;
//         3. cierra las sesiones de refresco que seguian en la caja 8 (user_auth_sessions.revoked_at).
//       No toca turnos ni ventas: si la caja 8 tiene un turno abierto, se detiene sin cambiar nada
//       (cerrarlo antes con server/cerrar_turnos_abandonados.js o desde la caja).
//       Se puede repetir: si ya esta liberada no cambia nada.
//
// Orden de despliegue recomendado:
//   1. Parte A: node server/cerrar_turnos_abandonados.js (mirar) y luego --aplicar --por <login>,
//      para cerrar los turnos abandonados, incluidos los de la caja 8.
//   2. Desplegar el codigo nuevo (Acceso SIA, caja 8 normal) y reiniciar el servicio; al iniciar se
//      agrega la columna user_auth_sessions.modo.
//   3. Enseguida: node server/liberar_caja_sia.js (mirar) y luego --aplicar. Mientras no se aplique,
//      la caja 8 activa ya se ve como caja normal y cuenta en el limite de cajas activas.
//   4. admin_sia entra con "Acceso SIA". El PC que era la caja 8 conserva n_caja=8 en su navegador:
//      al intentar el login normal vera "caja desactivada"; para usarlo como caja hay que activar una
//      caja (la 8 u otra) desde Administrar cajas, o entrar con Acceso SIA.
//
// Reversion (si hiciera falta volver a activar la caja 8; los vinculos borrados no se recuperan,
// el equipo se vuelve a vincular solo al registrar su caja):
//   UPDATE cajas SET estado = 1 WHERE n_caja = 8;

const SIA_BOX_NUMBER = 8;

const USAGE = [
  'Uso:',
  '  node server/liberar_caja_sia.js            (solo mostrar)',
  '  node server/liberar_caja_sia.js --aplicar',
].join('\n');

function usageError(message) {
  const err = new Error(message);
  err.code = 'USO';
  return err;
}

function parseArgs(argv) {
  const options = { apply: false, help: false };
  for (const arg of argv) {
    if (arg === '--aplicar') options.apply = true;
    else if (arg === '--ayuda' || arg === '-h' || arg === '--help') options.help = true;
    else throw usageError(`Argumento desconocido: ${arg}`);
  }
  return options;
}

async function previewSiaBoxRelease(db) {
  const [boxRows] = await db.query(
    'SELECT n_caja, nombre_caja, sucursal_id, estado FROM cajas WHERE n_caja = ? LIMIT 1',
    [SIA_BOX_NUMBER]
  );
  const [bindingRows] = await db.query(
    `SELECT LEFT(device_hash, 12) AS equipo, nombre_caja, source, last_seen
     FROM device_caja_bindings
     WHERE numero_caja = ?
     ORDER BY id ASC`,
    [SIA_BOX_NUMBER]
  );
  const [sessionRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM user_auth_sessions
     WHERE caja_id = ? AND revoked_at IS NULL AND expires_at > NOW()`,
    [SIA_BOX_NUMBER]
  );
  const [shiftRows] = await db.query(
    `SELECT id_corte, usuario_id, fecha, hora_apertura
     FROM corte_caja
     WHERE caja_id = ? AND estado = 'abierto'
     ORDER BY id_corte ASC`,
    [SIA_BOX_NUMBER]
  );
  const [activeRows] = await db.query(
    'SELECT COUNT(*) AS total, COALESCE(SUM(n_caja = ?), 0) AS incluye_8 FROM cajas WHERE estado = 1',
    [SIA_BOX_NUMBER]
  );
  const [limitRows] = await db.query('SELECT max_cajas_activas FROM system_business_limits WHERE id = 1 LIMIT 1');
  const box = boxRows[0] || null;
  return {
    box,
    bindings: bindingRows,
    activeSessions: Number(sessionRows[0]?.total || 0),
    openShifts: shiftRows,
    activeBoxes: Number(activeRows[0]?.total || 0),
    activeIncludesSiaBox: Number(activeRows[0]?.incluye_8 || 0) > 0,
    maxActiveBoxes: limitRows[0] ? Number(limitRows[0].max_cajas_activas || 0) : null,
    alreadyReleased: (!box || Number(box.estado) !== 1) && bindingRows.length === 0
      && Number(sessionRows[0]?.total || 0) === 0,
  };
}

async function applySiaBoxRelease(db) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    // Bloquea la fila de la caja 8 para que nadie abra un turno en ella mientras se libera.
    await connection.query('SELECT id_caja FROM cajas WHERE n_caja = ? FOR UPDATE', [SIA_BOX_NUMBER]);
    const [openShiftRows] = await connection.query(
      "SELECT COUNT(*) AS total FROM corte_caja WHERE caja_id = ? AND estado = 'abierto'",
      [SIA_BOX_NUMBER]
    );
    if (Number(openShiftRows[0]?.total || 0) > 0) {
      const err = new Error('La caja 8 tiene turnos abiertos. Cierralos antes (server/cerrar_turnos_abandonados.js o desde la caja); no se cambio nada.');
      err.code = 'TURNO_ABIERTO';
      throw err;
    }
    const [bindings] = await connection.query('DELETE FROM device_caja_bindings WHERE numero_caja = ?', [SIA_BOX_NUMBER]);
    const [box] = await connection.query('UPDATE cajas SET estado = 0 WHERE n_caja = ? AND estado <> 0', [SIA_BOX_NUMBER]);
    const [sessions] = await connection.query(
      'UPDATE user_auth_sessions SET revoked_at = NOW() WHERE caja_id = ? AND revoked_at IS NULL',
      [SIA_BOX_NUMBER]
    );
    await connection.commit();
    return {
      unboundDevices: Number(bindings.affectedRows || 0),
      deactivatedBox: Number(box.affectedRows || 0),
      revokedSessions: Number(sessions.affectedRows || 0),
    };
  } catch (err) {
    try { await connection.rollback(); } catch (_) {}
    throw err;
  } finally {
    connection.release();
  }
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function printPreview(info) {
  if (!info.box) {
    console.log('Caja 8: no existe en la tabla cajas.');
  } else {
    console.log(`Caja 8: "${info.box.nombre_caja}", sucursal ${info.box.sucursal_id}, ${Number(info.box.estado) === 1 ? 'ACTIVA' : 'inactiva'}.`);
  }
  console.log(`Equipos vinculados a la caja 8: ${info.bindings.length}`);
  info.bindings.forEach((row) => {
    console.log(`  equipo ${row.equipo}...  nombre "${row.nombre_caja || ''}"  origen ${row.source}  visto ${formatDateTime(row.last_seen)}`);
  });
  console.log(`Sesiones abiertas en la caja 8: ${info.activeSessions}`);
  console.log(`Turnos abiertos en la caja 8: ${info.openShifts.length}`);
  info.openShifts.forEach((row) => {
    console.log(`  turno ${row.id_corte} (usuario ${row.usuario_id}) abierto ${formatDateTime(row.hora_apertura || row.fecha)}`);
  });
  const limit = info.maxActiveBoxes === null ? 'sin fila de limite (se usa 4)' : String(info.maxActiveBoxes);
  console.log(`Cajas activas: ${info.activeBoxes}${info.activeIncludesSiaBox ? ' (incluye la 8)' : ''}; limite: ${limit}.`);
  if (info.activeIncludesSiaBox && info.maxActiveBoxes !== null && info.activeBoxes > info.maxActiveBoxes) {
    console.log('  Aviso: con la caja 8 contando como normal se supera el limite hasta que se aplique este script.');
  }
}

async function main(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(USAGE);
    return 0;
  }
  const db = require('./db');
  try {
    const before = await previewSiaBoxRelease(db);
    printPreview(before);
    if (!options.apply) {
      console.log(before.alreadyReleased
        ? '\nLa caja 8 ya esta liberada. Modo solo mostrar: no se cambio nada.'
        : '\nModo solo mostrar: no se cambio nada. Para liberar la caja 8: --aplicar');
      return 0;
    }
    const result = await applySiaBoxRelease(db);
    console.log(`\nAplicado: ${result.unboundDevices} equipo(s) desvinculado(s), caja 8 ${result.deactivatedBox ? 'desactivada' : 'ya estaba inactiva o no existe'}, ${result.revokedSessions} sesion(es) cerrada(s).`);
    console.log('\nDespues:');
    printPreview(await previewSiaBoxRelease(db));
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

module.exports = { SIA_BOX_NUMBER, parseArgs, previewSiaBoxRelease, applySiaBoxRelease, main };

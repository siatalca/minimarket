const fs = require('fs');
const path = require('path');

// You may pass the CSV path as the first command-line argument; otherwise
// the script defaults to a local file named plantilla_productos_actualizado.csv
// in the same directory.
let inputPath = process.argv[2];
if (!inputPath) {
  inputPath = path.join(__dirname, 'plantilla_productos_actualizado.csv');
}
const outputPath = path.join(__dirname, 'productos_import.sql');

// helper functions
function cleanNumber(str) {
  if (!str) return '0';
  let num = String(str)
    .replace(/\$/g, '')        // remove dollar sign
    .replace(/,/g, '')          // remove thousands comma
    .replace(/\(/g, '')        // remove parentheses
    .replace(/\)/g, '')
    .trim();
  // if the result isn't a finite number, default to 0
  if (num === '' || isNaN(Number(num))) return '0';
  return num;
}

function cleanInteger(str) {
  // Keep only digits and drop anything else (e.g. comma, dot, plus, exponent markers)
  if (!str) return '0';
  const digits = String(str).replace(/\D+/g, '');
  return digits === '' ? '0' : digits;
}

function escapeSql(str) {
  if (str == null || str === '') return "''";
  return `'${String(str).replace(/'/g, "''")}'`;
}

function toQuoted(str) {
  if (str == null || str === '') return "''";
  return `'${String(str).replace(/'/g, "''")}'`;
}

function parseLine(line) {
  // split by semicolon, accounts for simple CSV
  return line.split(';').map((c) => c.trim());
}

fs.readFile(inputPath, 'utf8', (err, data) => {
  if (err) return console.error('error reading csv', err);
  const lines = data.split(/\r?\n/).filter((l) => l.trim());
  const header = parseLine(lines[0]);
  const records = lines.slice(1).map(parseLine);

  const inserts = [];
  for (const cols of records) {
    // the file uses columns in this order:
    // codigo_barras;descripcion;formato_venta;costo;ganancia;precio_venta;utiliza_inventario;cantidad_actual;cantidad_minima;cantidad_maxima;exento_iva;departamento;proveedor
    const [codigo, descripcion, formato, costo, ganancia, precio, utiliza_inv, cantidad, min_qty, max_qty, exento, departamento, proveedor] = cols;
    if (!codigo || !descripcion) continue;
    // format id and department id are both forced to 1 as requested
    const sql = `INSERT INTO productos (codigo_barras, descripcion, id_formato, costo, ganancia, precio_venta, utiliza_inventario, cantidad_actual, cantidad_minima, cantidad_maxima, id_departamento, supplier_id, exento_iva) VALUES (` +
      `${cleanInteger(codigo)}, ` +
      `${toQuoted(descripcion)}, ` +
      `1 , ` +  // id_formato fijo a 1
      `${cleanNumber(costo)}, ` +
      `${cleanNumber(ganancia)}, ` +
      `${cleanNumber(precio)}, ` +
      `${cleanNumber(utiliza_inv)}, ` +
      `${cleanNumber(cantidad)}, ` +
      `${cleanNumber(min_qty)}, ` +
      `${cleanNumber(max_qty)}, ` +
      `1, ` +  // id_departamento fijo a 1
      `NULL, ` +
      `${cleanNumber(exento)}) ` +
      `ON DUPLICATE KEY UPDATE ` +
      `descripcion=VALUES(descripcion), ` +
      `costo=VALUES(costo), ` +
      `ganancia=VALUES(ganancia), ` +
      `precio_venta=VALUES(precio_venta), ` +
      `cantidad_actual=VALUES(cantidad_actual), ` +
      `cantidad_minima=VALUES(cantidad_minima), ` +
      `cantidad_maxima=VALUES(cantidad_maxima);
`;
    inserts.push(sql);
  }

  // Split into multiple output files to reduce processing time when importing
  const chunks = 4;
  const chunkSize = Math.ceil(inserts.length / chunks);

  for (let i = 0; i < chunks; i += 1) {
    const partInserts = inserts.slice(i * chunkSize, (i + 1) * chunkSize);
    if (partInserts.length === 0) continue;

    const partPath = path.join(
      __dirname,
      `productos_import_part${i + 1}.sql`
    );

    let content = partInserts.join('\n');
    if (i === 0) {
      // Only the first file deletes all products before inserting
      content = 'DELETE FROM productos;\n' + content;
    }

    fs.writeFileSync(partPath, content);
    console.log('SQL file written to', partPath);
  }
});

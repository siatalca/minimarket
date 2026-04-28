const crypto = require('crypto');
const forge = require('node-forge');

function cleanText(value, maxLength = 255) {
  if (value === null || typeof value === 'undefined') return '';
  return String(value).trim().slice(0, maxLength);
}

function normalizeRut(rut) {
  const raw = String(rut || '').trim().toUpperCase();
  if (!raw) return '';
  const compact = raw.replace(/\./g, '').replace(/-/g, '');
  if (compact.length < 2) return '';
  const body = compact.slice(0, -1).replace(/\D/g, '');
  const dv = compact.slice(-1);
  if (!body || !/[0-9K]/.test(dv)) return '';
  return `${body}-${dv}`;
}

function formatRutForDisplay(normalizedRut) {
  const raw = normalizeRut(normalizedRut);
  if (!raw) return '';
  const [body, dv] = raw.split('-');
  const chunks = [];
  let i = body.length;
  while (i > 0) {
    const start = Math.max(0, i - 3);
    chunks.unshift(body.slice(start, i));
    i = start;
  }
  return `${chunks.join('.')}-${dv}`;
}

function isValidRut(rut) {
  const normalized = normalizeRut(rut);
  if (!normalized) return false;
  const [body, dvRaw] = normalized.split('-');
  const digits = body.split('').reverse().map((ch) => Number(ch));
  let factor = 2;
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    sum += digits[i] * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const mod = 11 - (sum % 11);
  let expected = '0';
  if (mod === 11) expected = '0';
  else if (mod === 10) expected = 'K';
  else expected = String(mod);
  return expected === String(dvRaw || '').toUpperCase();
}

function safeParseInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function normalizeTipoDte(value) {
  const parsed = safeParseInt(value, 0);
  const allowed = new Set([33, 39, 61]);
  return allowed.has(parsed) ? parsed : null;
}

function splitTax(totalAmount) {
  const total = Number(totalAmount || 0);
  if (!Number.isFinite(total) || total < 0) {
    return { neto: 0, iva: 0, total: 0 };
  }
  const neto = Math.round(total / 1.19);
  const iva = Math.round(total - neto);
  return { neto, iva, total: Math.round(total) };
}

function normalizeCompareText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const CIGARETTE_HINTS = [
  'cigarro',
  'cigarrillo',
  'cigar',
  'tabaco',
  'tabacos',
  'cajetilla',
  'cigarrobox',
  'tabaquera',
];

function hasCigaretteHint(text) {
  const normalized = normalizeCompareText(text);
  if (!normalized) return false;
  return CIGARETTE_HINTS.some((hint) => normalized.includes(hint));
}

function isCigaretteExemptItem(item = {}) {
  return hasCigaretteHint(item.descripcion) || hasCigaretteHint(item.supplier_name);
}

function buildDteTotalsFromItems(items = [], taxSettings = {}) {
  const taxEnabled = Number(taxSettings.tax_enabled ?? 1) === 1;
  const taxPercent = Number(taxSettings.tax_percent ?? 19);
  const pricesIncludeTax = Number(taxSettings.prices_include_tax ?? 1) === 1;
  const safePercent = Number.isFinite(taxPercent) && taxPercent >= 0 ? taxPercent : 19;
  const factor = 1 + (safePercent / 100);

  let taxableGross = 0;
  let exemptTotal = 0;
  for (const item of items) {
    const subtotal = Number(item.subtotal || 0);
    if (!Number.isFinite(subtotal) || subtotal <= 0) continue;
    if (item.tax_exempt) {
      exemptTotal += subtotal;
    } else {
      taxableGross += subtotal;
    }
  }

  let neto = 0;
  let iva = 0;
  if (!taxEnabled || safePercent === 0) {
    neto = taxableGross;
    iva = 0;
  } else if (pricesIncludeTax) {
    neto = taxableGross / factor;
    iva = taxableGross - neto;
  } else {
    neto = taxableGross;
    iva = taxableGross * (safePercent / 100);
  }

  const total = neto + iva + exemptTotal;
  return {
    neto: Math.round(neto),
    iva: Math.round(iva),
    exento: Math.round(exemptTotal),
    total: Math.round(total),
    tax_enabled: taxEnabled ? 1 : 0,
    tax_percent: safePercent,
    prices_include_tax: pricesIncludeTax ? 1 : 0,
  };
}

function toBase64(value) {
  return Buffer.from(value).toString('base64');
}

function fromBase64(value) {
  return Buffer.from(String(value || ''), 'base64');
}

function parsePkcs12Certificate({ pfxBuffer, password }) {
  const pass = String(password || '');
  if (!Buffer.isBuffer(pfxBuffer) || pfxBuffer.length === 0) {
    const err = new Error('Archivo de certificado vacio');
    err.code = 'INVALID_CERT_FILE';
    throw err;
  }

  try {
    const derBinary = pfxBuffer.toString('binary');
    const p12Asn1 = forge.asn1.fromDer(derBinary);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, pass);
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
    if (!certBags.length || !certBags[0].cert) {
      const err = new Error('No se encontro certificado en el archivo');
      err.code = 'INVALID_CERT_FILE';
      throw err;
    }

    const cert = certBags[0].cert;
    const certDer = Buffer.from(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes(), 'binary');
    const fingerprintSha1 = certDer.toString('hex').toUpperCase().match(/.{1,2}/g).join(':');
    const subject = cert.subject.attributes
      .map((attr) => `${attr.shortName || attr.name}=${attr.value}`)
      .join(', ');
    const issuer = cert.issuer.attributes
      .map((attr) => `${attr.shortName || attr.name}=${attr.value}`)
      .join(', ');

    return {
      subject,
      issuer,
      serial_number: String(cert.serialNumber || '').toUpperCase(),
      valid_from: cert.validity?.notBefore || null,
      valid_to: cert.validity?.notAfter || null,
      fingerprint_sha1: fingerprintSha1,
    };
  } catch (error) {
    const msg = String(error?.message || '').toLowerCase();
    if (msg.includes('invalid password') || msg.includes('mac could not be verified') || msg.includes('pkcs12')) {
      const err = new Error('Clave del certificado invalida o archivo corrupto');
      err.code = 'INVALID_CERT_PASSWORD';
      throw err;
    }
    const err = new Error('No se pudo leer el certificado .pfx/.p12');
    err.code = 'INVALID_CERT_FILE';
    throw err;
  }
}

function encryptCertificateBlob(plainBuffer, masterSecret) {
  const secret = String(masterSecret || '').trim();
  if (secret.length < 16) {
    const err = new Error('DTE_CERT_SECRET debe tener al menos 16 caracteres');
    err.code = 'CONFIG_ERROR';
    throw err;
  }

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const iterations = 210000;
  const key = crypto.pbkdf2Sync(secret, salt, iterations, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted_b64: toBase64(encrypted),
    salt_b64: toBase64(salt),
    iv_b64: toBase64(iv),
    tag_b64: toBase64(tag),
    iterations,
  };
}

function decryptCertificateBlob(envelope, masterSecret) {
  const secret = String(masterSecret || '').trim();
  if (secret.length < 16) {
    const err = new Error('DTE_CERT_SECRET debe tener al menos 16 caracteres');
    err.code = 'CONFIG_ERROR';
    throw err;
  }
  const iterations = Number.parseInt(envelope?.enc_iterations, 10) || 210000;
  const salt = fromBase64(envelope?.enc_salt || '');
  const iv = fromBase64(envelope?.enc_iv || '');
  const tag = fromBase64(envelope?.enc_tag || '');
  const encrypted = fromBase64(envelope?.pfx_encrypted || '');
  const key = crypto.pbkdf2Sync(secret, salt, iterations, 32, 'sha256');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

async function ensureDteTables(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS dte_config (
      id INT PRIMARY KEY,
      ambiente ENUM('certificacion','produccion') NOT NULL DEFAULT 'certificacion',
      emisor_rut VARCHAR(12) NOT NULL DEFAULT '',
      emisor_razon_social VARCHAR(120) NOT NULL DEFAULT '',
      emisor_giro VARCHAR(120) NOT NULL DEFAULT '',
      emisor_direccion VARCHAR(180) NOT NULL DEFAULT '',
      emisor_comuna VARCHAR(80) NOT NULL DEFAULT '',
      emisor_ciudad VARCHAR(80) NOT NULL DEFAULT '',
      certificado_alias VARCHAR(120) NULL,
      punto_venta VARCHAR(30) NOT NULL DEFAULT 'POS-01',
      activo TINYINT(1) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.query(
    `INSERT INTO dte_config (
      id, ambiente, emisor_rut, emisor_razon_social, emisor_giro,
      emisor_direccion, emisor_comuna, emisor_ciudad, certificado_alias, punto_venta, activo
    )
    VALUES (1, 'certificacion', '', '', '', '', '', '', NULL, 'POS-01', 0)
    ON DUPLICATE KEY UPDATE id = id`
  );

  await db.query(`
    CREATE TABLE IF NOT EXISTS dte_receptor_cache (
      id INT AUTO_INCREMENT PRIMARY KEY,
      rut VARCHAR(12) NOT NULL,
      razon_social VARCHAR(120) NOT NULL DEFAULT '',
      giro VARCHAR(120) NOT NULL DEFAULT '',
      direccion VARCHAR(180) NOT NULL DEFAULT '',
      comuna VARCHAR(80) NOT NULL DEFAULT '',
      ciudad VARCHAR(80) NOT NULL DEFAULT '',
      email VARCHAR(180) NOT NULL DEFAULT '',
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_dte_receptor_rut (rut)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS dte_documentos (
      id_dte INT AUTO_INCREMENT PRIMARY KEY,
      venta_id INT NOT NULL,
      tipo_dte INT NOT NULL,
      estado ENUM('borrador','pendiente_envio','enviado','aceptado','rechazado','anulado') NOT NULL DEFAULT 'borrador',
      folio_referencia VARCHAR(30) NULL,
      receptor_rut VARCHAR(12) NOT NULL DEFAULT '',
      receptor_razon_social VARCHAR(120) NOT NULL DEFAULT '',
      total_neto INT NOT NULL DEFAULT 0,
      total_iva INT NOT NULL DEFAULT 0,
      total INT NOT NULL DEFAULT 0,
      payload_json LONGTEXT NULL,
      xml_firmado LONGTEXT NULL,
      sii_track_id VARCHAR(80) NULL,
      sii_estado VARCHAR(40) NULL,
      error_detalle TEXT NULL,
      created_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_dte_venta (venta_id),
      INDEX idx_dte_estado (estado),
      INDEX idx_dte_tipo (tipo_dte)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS dte_eventos (
      id_evento INT AUTO_INCREMENT PRIMARY KEY,
      dte_id INT NOT NULL,
      tipo_evento VARCHAR(40) NOT NULL,
      detalle_json LONGTEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_dte_evento_doc (dte_id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS dte_certificados (
      id INT PRIMARY KEY,
      alias VARCHAR(120) NOT NULL DEFAULT '',
      file_name VARCHAR(180) NOT NULL DEFAULT '',
      subject_dn VARCHAR(255) NOT NULL DEFAULT '',
      issuer_dn VARCHAR(255) NOT NULL DEFAULT '',
      serial_number VARCHAR(120) NOT NULL DEFAULT '',
      fingerprint_sha1 VARCHAR(80) NOT NULL DEFAULT '',
      valid_from DATETIME NULL,
      valid_to DATETIME NULL,
      pfx_encrypted LONGTEXT NULL,
      enc_salt VARCHAR(64) NULL,
      enc_iv VARCHAR(64) NULL,
      enc_tag VARCHAR(64) NULL,
      enc_iterations INT NOT NULL DEFAULT 210000,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.query(
    `INSERT INTO dte_certificados (
      id, alias, file_name, subject_dn, issuer_dn, serial_number, fingerprint_sha1
    )
    VALUES (1, '', '', '', '', '', '')
    ON DUPLICATE KEY UPDATE id = id`
  );
}

async function getDteConfig(db) {
  const [rows] = await db.query('SELECT * FROM dte_config WHERE id = 1 LIMIT 1');
  if (!rows.length) return null;
  const row = rows[0];
  return {
    ...row,
    emisor_rut: formatRutForDisplay(row.emisor_rut),
  };
}

async function upsertDteConfig(db, payload) {
  const ambiente = String(payload?.ambiente || 'certificacion').toLowerCase() === 'produccion'
    ? 'produccion'
    : 'certificacion';
  const emisorRut = normalizeRut(payload?.emisor_rut);
  const razonSocial = cleanText(payload?.emisor_razon_social, 120);
  const giro = cleanText(payload?.emisor_giro, 120);
  const direccion = cleanText(payload?.emisor_direccion, 180);
  const comuna = cleanText(payload?.emisor_comuna, 80);
  const ciudad = cleanText(payload?.emisor_ciudad, 80);
  const certificadoAlias = cleanText(payload?.certificado_alias, 120);
  const puntoVenta = cleanText(payload?.punto_venta || 'POS-01', 30) || 'POS-01';
  const activo = payload?.activo === 1 || payload?.activo === true || payload?.activo === '1' ? 1 : 0;

  if (emisorRut && !isValidRut(emisorRut)) {
    const err = new Error('RUT emisor invalido');
    err.code = 'INVALID_RUT';
    throw err;
  }

  await db.query(
    `UPDATE dte_config
     SET ambiente = ?, emisor_rut = ?, emisor_razon_social = ?, emisor_giro = ?,
         emisor_direccion = ?, emisor_comuna = ?, emisor_ciudad = ?,
         certificado_alias = ?, punto_venta = ?, activo = ?
     WHERE id = 1`,
    [
      ambiente,
      emisorRut,
      razonSocial,
      giro,
      direccion,
      comuna,
      ciudad,
      certificadoAlias || null,
      puntoVenta,
      activo,
    ]
  );

  return getDteConfig(db);
}

function normalizeReceptorInput(receptor = {}) {
  const rut = normalizeRut(receptor.rut);
  return {
    rut,
    razon_social: cleanText(receptor.razon_social, 120),
    giro: cleanText(receptor.giro, 120),
    direccion: cleanText(receptor.direccion, 180),
    comuna: cleanText(receptor.comuna, 80),
    ciudad: cleanText(receptor.ciudad, 80),
    email: cleanText(receptor.email, 180),
  };
}

function validateReceptorByTipo(tipoDte, receptor) {
  if (!tipoDte) {
    return 'Tipo DTE invalido';
  }
  if (tipoDte === 33 || tipoDte === 61) {
    if (!receptor.rut || !isValidRut(receptor.rut)) {
      return 'RUT receptor invalido';
    }
    if (!receptor.razon_social) {
      return 'Razon social receptor obligatoria';
    }
  }
  if (receptor.rut && !isValidRut(receptor.rut)) {
    return 'RUT receptor invalido';
  }
  return null;
}

async function createDteDraftFromSale(db, payload = {}) {
  const ventaId = safeParseInt(payload.venta_id, 0);
  const tipoDte = normalizeTipoDte(payload.tipo_dte);
  const createdBy = safeParseInt(payload.created_by, 0) || null;
  const receptor = normalizeReceptorInput(payload.receptor || {});

  if (!ventaId) {
    const err = new Error('venta_id invalido');
    err.code = 'INVALID_INPUT';
    throw err;
  }
  if (!tipoDte) {
    const err = new Error('tipo_dte invalido');
    err.code = 'INVALID_INPUT';
    throw err;
  }

  const receptorError = validateReceptorByTipo(tipoDte, receptor);
  if (receptorError) {
    const err = new Error(receptorError);
    err.code = 'INVALID_INPUT';
    throw err;
  }

  const [ventaRows] = await db.query(
    `SELECT id_venta, DATE_FORMAT(fecha, '%Y-%m-%d %H:%i:%s') AS fecha,
            numero_ticket, COALESCE(NULLIF(folio_ticket, ''), CAST(numero_ticket AS CHAR)) AS folio_ticket,
            usuario_id, caja_id, metodo_pago, total
     FROM ventas
     WHERE id_venta = ?
     LIMIT 1`,
    [ventaId]
  );

  if (!ventaRows.length) {
    const err = new Error('Venta no encontrada');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const venta = ventaRows[0];
  const [itemsRows] = await db.query(
    `SELECT d.id_detalle, d.producto_id, d.cantidad, d.precio_unitario, d.subtotal,
            COALESCE(NULLIF(d.descripcion, ''), p.descripcion, '') AS descripcion,
            COALESCE(p.exento_iva, 0) AS exento_iva,
            p.supplier_id,
            COALESCE(s.name, '') AS supplier_name
     FROM detalle_venta d
     LEFT JOIN productos p ON p.id_producto = d.producto_id
     LEFT JOIN service_suppliers s ON s.id = p.supplier_id
     WHERE d.venta_id = ?
     ORDER BY d.id_detalle ASC`,
    [ventaId]
  );

  const [taxRows] = await db.query(
    `SELECT tax_enabled, tax_percent, prices_include_tax
     FROM tax_settings
     WHERE id = 1
     LIMIT 1`
  );
  const taxSettings = taxRows[0] || { tax_enabled: 1, tax_percent: 19, prices_include_tax: 1 };
  const normalizedItems = itemsRows.map((row) => {
    const item = {
      detalle_id: Number(row.id_detalle || 0),
      producto_id: row.producto_id === null ? null : Number(row.producto_id || 0),
      exento_iva: Number(row.exento_iva || 0) === 1 ? 1 : 0,
      supplier_id: row.supplier_id === null ? null : Number(row.supplier_id || 0),
      supplier_name: cleanText(row.supplier_name || '', 120),
      descripcion: cleanText(row.descripcion, 255),
      cantidad: Number(row.cantidad || 0),
      precio_unitario: Number(row.precio_unitario || 0),
      subtotal: Number(row.subtotal || 0),
    };
    const exempt = item.exento_iva === 1 || isCigaretteExemptItem(item);
    return {
      ...item,
      tax_exempt: exempt ? 1 : 0,
      tax_exempt_reason: item.exento_iva === 1 ? 'producto_exento' : (exempt ? 'cigarrillos' : ''),
    };
  });
  const taxes = buildDteTotalsFromItems(normalizedItems, taxSettings);

  const draftPayload = {
    tipo_dte: tipoDte,
    referencia_venta: {
      id_venta: Number(venta.id_venta),
      fecha: venta.fecha,
      numero_ticket: Number(venta.numero_ticket || 0),
      folio_ticket: venta.folio_ticket,
      usuario_id: Number(venta.usuario_id || 0),
      caja_id: Number(venta.caja_id || 0),
      metodo_pago: venta.metodo_pago,
    },
    emisor: {
      fuente: 'dte_config',
    },
    receptor,
    items: normalizedItems,
    totales: taxes,
  };

  const [result] = await db.query(
    `INSERT INTO dte_documentos (
      venta_id, tipo_dte, estado, folio_referencia,
      receptor_rut, receptor_razon_social,
      total_neto, total_iva, total,
      payload_json, created_by
    ) VALUES (?, ?, 'borrador', ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ventaId,
      tipoDte,
      venta.folio_ticket || String(venta.numero_ticket || ''),
      receptor.rut || '',
      receptor.razon_social || '',
      taxes.neto,
      taxes.iva,
      taxes.total,
      JSON.stringify(draftPayload),
      createdBy,
    ]
  );

  const dteId = Number(result.insertId || 0);

  await db.query(
    `INSERT INTO dte_eventos (dte_id, tipo_evento, detalle_json)
     VALUES (?, 'draft_created', ?)`,
    [dteId, JSON.stringify({ venta_id: ventaId, tipo_dte: tipoDte, created_by: createdBy || null })]
  );

  if (receptor.rut) {
    await db.query(
      `INSERT INTO dte_receptor_cache (rut, razon_social, giro, direccion, comuna, ciudad, email)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         razon_social = VALUES(razon_social),
         giro = VALUES(giro),
         direccion = VALUES(direccion),
         comuna = VALUES(comuna),
         ciudad = VALUES(ciudad),
         email = VALUES(email)`,
      [
        receptor.rut,
        receptor.razon_social,
        receptor.giro,
        receptor.direccion,
        receptor.comuna,
        receptor.ciudad,
        receptor.email,
      ]
    );
  }

  return {
    id_dte: dteId,
    venta_id: ventaId,
    tipo_dte: tipoDte,
    estado: 'borrador',
    folio_referencia: venta.folio_ticket || String(venta.numero_ticket || ''),
    total: taxes.total,
  };
}

async function listDteDrafts(db, options = {}) {
  const estado = cleanText(options.estado, 20);
  const limit = Math.max(1, Math.min(200, safeParseInt(options.limit, 50)));

  const filters = [];
  const params = [];
  if (estado) {
    filters.push('d.estado = ?');
    params.push(estado);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const [rows] = await db.query(
    `SELECT d.id_dte, d.venta_id, d.tipo_dte, d.estado, d.folio_referencia,
            d.receptor_rut, d.receptor_razon_social, d.total, d.sii_track_id,
            DATE_FORMAT(d.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
            DATE_FORMAT(d.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
     FROM dte_documentos d
     ${where}
     ORDER BY d.id_dte DESC
     LIMIT ${limit}`,
    params
  );
  return rows;
}

async function getCertificateMetadata(db) {
  const [rows] = await db.query(
    `SELECT id, alias, file_name, subject_dn, issuer_dn, serial_number,
            fingerprint_sha1, valid_from, valid_to, updated_at,
            CASE WHEN pfx_encrypted IS NULL OR pfx_encrypted = '' THEN 0 ELSE 1 END AS has_certificate
     FROM dte_certificados
     WHERE id = 1
     LIMIT 1`
  );
  if (!rows.length) return null;
  const row = rows[0];
  return {
    ...row,
    has_certificate: Number(row.has_certificate || 0) === 1,
  };
}

async function saveCertificate(db, payload = {}, options = {}) {
  const alias = cleanText(payload.alias || '', 120);
  const fileName = cleanText(payload.file_name || '', 180);
  const password = String(payload.password || '');
  const pfxBase64 = String(payload.pfx_base64 || '');
  const masterSecret = String(options.masterSecret || '');

  if (!alias) {
    const err = new Error('Alias obligatorio');
    err.code = 'INVALID_INPUT';
    throw err;
  }
  if (!password) {
    const err = new Error('Clave del certificado obligatoria');
    err.code = 'INVALID_INPUT';
    throw err;
  }
  if (!pfxBase64) {
    const err = new Error('Archivo de certificado obligatorio');
    err.code = 'INVALID_INPUT';
    throw err;
  }

  let pfxBuffer;
  try {
    pfxBuffer = Buffer.from(pfxBase64, 'base64');
  } catch {
    const err = new Error('Archivo de certificado invalido');
    err.code = 'INVALID_INPUT';
    throw err;
  }

  if (!pfxBuffer.length || pfxBuffer.length > 1024 * 1024 * 5) {
    const err = new Error('El certificado debe tener entre 1 byte y 5MB');
    err.code = 'INVALID_INPUT';
    throw err;
  }

  const certData = parsePkcs12Certificate({ pfxBuffer, password });
  const encrypted = encryptCertificateBlob(pfxBuffer, masterSecret);

  await db.query(
    `UPDATE dte_certificados
     SET alias = ?, file_name = ?, subject_dn = ?, issuer_dn = ?, serial_number = ?,
         fingerprint_sha1 = ?, valid_from = ?, valid_to = ?,
         pfx_encrypted = ?, enc_salt = ?, enc_iv = ?, enc_tag = ?, enc_iterations = ?
     WHERE id = 1`,
    [
      alias,
      fileName,
      cleanText(certData.subject, 255),
      cleanText(certData.issuer, 255),
      cleanText(certData.serial_number, 120),
      cleanText(certData.fingerprint_sha1, 80),
      certData.valid_from,
      certData.valid_to,
      encrypted.encrypted_b64,
      encrypted.salt_b64,
      encrypted.iv_b64,
      encrypted.tag_b64,
      encrypted.iterations,
    ]
  );

  return getCertificateMetadata(db);
}

async function removeCertificate(db) {
  await db.query(
    `UPDATE dte_certificados
     SET alias = '', file_name = '', subject_dn = '', issuer_dn = '', serial_number = '',
         fingerprint_sha1 = '', valid_from = NULL, valid_to = NULL,
         pfx_encrypted = NULL, enc_salt = NULL, enc_iv = NULL, enc_tag = NULL, enc_iterations = 210000
     WHERE id = 1`
  );
  return getCertificateMetadata(db);
}

async function verifyStoredCertificatePassword(db, payload = {}, options = {}) {
  const password = String(payload.password || '');
  const masterSecret = String(options.masterSecret || '');
  if (!password) {
    const err = new Error('Clave obligatoria');
    err.code = 'INVALID_INPUT';
    throw err;
  }
  const [rows] = await db.query(
    `SELECT pfx_encrypted, enc_salt, enc_iv, enc_tag, enc_iterations
     FROM dte_certificados
     WHERE id = 1
     LIMIT 1`
  );
  if (!rows.length || !rows[0].pfx_encrypted) {
    const err = new Error('No hay certificado cargado');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const pfxBuffer = decryptCertificateBlob(rows[0], masterSecret);
  parsePkcs12Certificate({ pfxBuffer, password });
  return { valid: true };
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toYmd(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function toHms(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '00:00:00';
  return date.toTimeString().slice(0, 8);
}

function buildDteXmlPayload(documentRow, configRow) {
  const payload = (() => {
    try {
      return JSON.parse(documentRow.payload_json || '{}');
    } catch {
      return {};
    }
  })();
  const items = Array.isArray(payload.items) ? payload.items : [];
  const issueDate = toYmd(payload?.referencia_venta?.fecha || documentRow.created_at);
  const issueTime = toHms(payload?.referencia_venta?.fecha || documentRow.created_at);
  const folio = String(documentRow.folio_referencia || payload?.referencia_venta?.folio_ticket || documentRow.id_dte || '');
  const tipo = Number(documentRow.tipo_dte || 39);
  const payloadTotals = payload?.totales || {};
  const neto = Number((payloadTotals.neto ?? documentRow.total_neto) || 0);
  const iva = Number((payloadTotals.iva ?? documentRow.total_iva) || 0);
  const mntExe = Number(payloadTotals.exento ?? 0);
  const total = Number((payloadTotals.total ?? documentRow.total) || 0);

  const detailXml = items.map((item, index) => {
    const qty = Number(item.cantidad || 0);
    const unit = Number(item.precio_unitario || 0);
    const sub = Number(item.subtotal || 0);
    const isExempt = Number(item.tax_exempt || 0) === 1;
    return [
      '<Detalle>',
      `<NroLinDet>${index + 1}</NroLinDet>`,
      `<NmbItem>${xmlEscape(item.descripcion || 'ITEM SIN DESCRIPCION')}</NmbItem>`,
      isExempt ? '<IndExe>1</IndExe>' : '',
      `<QtyItem>${qty}</QtyItem>`,
      `<PrcItem>${unit}</PrcItem>`,
      `<MontoItem>${Math.round(sub)}</MontoItem>`,
      '</Detalle>',
    ].join('');
  }).join('');

  const receptorRut = String(documentRow.receptor_rut || '66666666-6');
  const receptorRazon = String(documentRow.receptor_razon_social || 'CLIENTE NO IDENTIFICADO');

  return [
    '<?xml version="1.0" encoding="ISO-8859-1"?>',
    '<DTE version="1.0">',
    `<Documento ID="DTE-${xmlEscape(String(documentRow.id_dte || '0'))}">`,
    '<Encabezado>',
    '<IdDoc>',
    `<TipoDTE>${tipo}</TipoDTE>`,
    `<Folio>${xmlEscape(folio)}</Folio>`,
    `<FchEmis>${issueDate}</FchEmis>`,
    '</IdDoc>',
    '<Emisor>',
    `<RUTEmisor>${xmlEscape(configRow.emisor_rut || '')}</RUTEmisor>`,
    `<RznSoc>${xmlEscape(configRow.emisor_razon_social || '')}</RznSoc>`,
    `<GiroEmis>${xmlEscape(configRow.emisor_giro || '')}</GiroEmis>`,
    `<DirOrigen>${xmlEscape(configRow.emisor_direccion || '')}</DirOrigen>`,
    `<CmnaOrigen>${xmlEscape(configRow.emisor_comuna || '')}</CmnaOrigen>`,
    `<CiudadOrigen>${xmlEscape(configRow.emisor_ciudad || '')}</CiudadOrigen>`,
    '</Emisor>',
    '<Receptor>',
    `<RUTRecep>${xmlEscape(receptorRut)}</RUTRecep>`,
    `<RznSocRecep>${xmlEscape(receptorRazon)}</RznSocRecep>`,
    '</Receptor>',
    '<Totales>',
    neto > 0 ? `<MntNeto>${Math.round(neto)}</MntNeto>` : '',
    iva > 0 ? `<IVA>${Math.round(iva)}</IVA>` : '',
    mntExe > 0 ? `<MntExe>${Math.round(mntExe)}</MntExe>` : '',
    `<MntTotal>${total}</MntTotal>`,
    '</Totales>',
    '</Encabezado>',
    detailXml,
    `<TmstFirma>${issueDate}T${issueTime}</TmstFirma>`,
    '</Documento>',
    '</DTE>',
  ].join('');
}

async function getDraftById(db, dteId) {
  const [rows] = await db.query(
    `SELECT id_dte, venta_id, tipo_dte, estado, folio_referencia, receptor_rut, receptor_razon_social,
            total_neto, total_iva, total, payload_json, xml_firmado, sii_track_id, sii_estado, error_detalle,
            DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
            DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
     FROM dte_documentos
     WHERE id_dte = ?
     LIMIT 1`,
    [dteId]
  );
  if (!rows.length) {
    const err = new Error('Borrador DTE no encontrado');
    err.code = 'NOT_FOUND';
    throw err;
  }
  return rows[0];
}

async function getDraftDetail(db, dteId) {
  const draft = await getDraftById(db, dteId);
  let payload = {};
  try {
    payload = JSON.parse(draft.payload_json || '{}');
  } catch {
    payload = {};
  }
  const [events] = await db.query(
    `SELECT id_evento, tipo_evento, detalle_json, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
     FROM dte_eventos
     WHERE dte_id = ?
     ORDER BY id_evento DESC
     LIMIT 40`,
    [dteId]
  );
  return {
    ...draft,
    payload,
    events,
  };
}

async function prepareDraftXml(db, payload = {}) {
  const dteId = safeParseInt(payload.dte_id, 0);
  const createdBy = safeParseInt(payload.created_by, 0) || null;
  if (!dteId) {
    const err = new Error('dte_id invalido');
    err.code = 'INVALID_INPUT';
    throw err;
  }

  const draft = await getDraftById(db, dteId);
  if (draft.estado === 'anulado') {
    const err = new Error('No se puede preparar un DTE anulado');
    err.code = 'INVALID_STATE';
    throw err;
  }

  const [cfgRows] = await db.query('SELECT * FROM dte_config WHERE id = 1 LIMIT 1');
  if (!cfgRows.length) {
    const err = new Error('Configuracion DTE no disponible');
    err.code = 'INVALID_STATE';
    throw err;
  }
  const cfg = cfgRows[0];
  if (!cfg.emisor_rut || !cfg.emisor_razon_social || !cfg.emisor_giro || !cfg.emisor_direccion) {
    const err = new Error('Completa la configuracion del emisor antes de preparar XML');
    err.code = 'INVALID_STATE';
    throw err;
  }

  const xml = buildDteXmlPayload(draft, cfg);
  await db.query(
    `UPDATE dte_documentos
     SET xml_firmado = ?, estado = 'pendiente_envio', sii_track_id = NULL, sii_estado = NULL, error_detalle = NULL
     WHERE id_dte = ?`,
    [xml, dteId]
  );
  await db.query(
    `INSERT INTO dte_eventos (dte_id, tipo_evento, detalle_json)
     VALUES (?, 'xml_prepared', ?)`,
    [dteId, JSON.stringify({ created_by: createdBy, size: xml.length })]
  );

  return getDraftDetail(db, dteId);
}

async function submitDraftToSii(db, payload = {}) {
  const dteId = safeParseInt(payload.dte_id, 0);
  const simulate = payload.simulate === false ? false : true;
  const createdBy = safeParseInt(payload.created_by, 0) || null;
  if (!dteId) {
    const err = new Error('dte_id invalido');
    err.code = 'INVALID_INPUT';
    throw err;
  }

  const draft = await getDraftById(db, dteId);
  if (draft.estado === 'anulado') {
    const err = new Error('No se puede enviar un DTE anulado');
    err.code = 'INVALID_STATE';
    throw err;
  }
  if (!draft.xml_firmado) {
    const err = new Error('Debes preparar XML antes de enviar');
    err.code = 'INVALID_STATE';
    throw err;
  }

  if (!simulate) {
    const err = new Error('Envio real pendiente de firma criptografica con certificado');
    err.code = 'CERT_REQUIRED';
    throw err;
  }

  const now = new Date();
  const trackId = `SIM-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(dteId).padStart(6, '0')}`;
  await db.query(
    `UPDATE dte_documentos
     SET estado = 'enviado', sii_track_id = ?, sii_estado = ?, error_detalle = NULL
     WHERE id_dte = ?`,
    [trackId, 'RECIBIDO_SII_SIMULADO', dteId]
  );
  await db.query(
    `INSERT INTO dte_eventos (dte_id, tipo_evento, detalle_json)
     VALUES (?, 'submitted_simulated', ?)`,
    [dteId, JSON.stringify({ created_by: createdBy, track_id: trackId })]
  );
  return getDraftDetail(db, dteId);
}

async function refreshDraftTrack(db, payload = {}) {
  const dteId = safeParseInt(payload.dte_id, 0);
  const simulate = payload.simulate === false ? false : true;
  const forceStatus = cleanText(payload.force_status, 20).toLowerCase();
  const createdBy = safeParseInt(payload.created_by, 0) || null;
  if (!dteId) {
    const err = new Error('dte_id invalido');
    err.code = 'INVALID_INPUT';
    throw err;
  }

  const draft = await getDraftById(db, dteId);
  if (!draft.sii_track_id) {
    const err = new Error('Este DTE no tiene track de envio');
    err.code = 'INVALID_STATE';
    throw err;
  }

  if (!simulate) {
    const err = new Error('Consulta real de track pendiente de integracion SII');
    err.code = 'NOT_IMPLEMENTED';
    throw err;
  }

  const accepted = forceStatus !== 'rechazado';
  const nextEstado = accepted ? 'aceptado' : 'rechazado';
  const nextSii = accepted ? 'ACEPTADO_SII_SIMULADO' : 'RECHAZADO_SII_SIMULADO';
  const errorDetalle = accepted ? null : 'Simulacion de rechazo para pruebas';
  await db.query(
    `UPDATE dte_documentos
     SET estado = ?, sii_estado = ?, error_detalle = ?
     WHERE id_dte = ?`,
    [nextEstado, nextSii, errorDetalle, dteId]
  );
  await db.query(
    `INSERT INTO dte_eventos (dte_id, tipo_evento, detalle_json)
     VALUES (?, 'track_polled_simulated', ?)`,
    [dteId, JSON.stringify({ created_by: createdBy, estado: nextEstado })]
  );
  return getDraftDetail(db, dteId);
}

async function retryDraftSubmission(db, payload = {}) {
  const dteId = safeParseInt(payload.dte_id, 0);
  if (!dteId) {
    const err = new Error('dte_id invalido');
    err.code = 'INVALID_INPUT';
    throw err;
  }
  await db.query(
    `UPDATE dte_documentos
     SET estado = 'pendiente_envio', sii_track_id = NULL, sii_estado = NULL, error_detalle = NULL
     WHERE id_dte = ? AND estado IN ('rechazado','enviado','pendiente_envio')`,
    [dteId]
  );
  return submitDraftToSii(db, payload);
}

module.exports = {
  ensureDteTables,
  getDteConfig,
  upsertDteConfig,
  createDteDraftFromSale,
  listDteDrafts,
  getCertificateMetadata,
  saveCertificate,
  removeCertificate,
  verifyStoredCertificatePassword,
  getDraftDetail,
  prepareDraftXml,
  submitDraftToSii,
  refreshDraftTrack,
  retryDraftSubmission,
  normalizeRut,
  formatRutForDisplay,
  isValidRut,
};

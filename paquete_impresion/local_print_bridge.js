const express = require('express');
const cors = require('cors');
const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const { execFile, spawn } = require('child_process');

const app = express();
// Chrome (Private Network Access): una pagina publica HTTPS que llama a 127.0.0.1
// envia un preflight con Access-Control-Request-Private-Network y espera este permiso.
app.use((req, res, next) => {
  if (req.headers['access-control-request-private-network']) {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

const PORT = Number(process.env.LOCAL_PRINT_BRIDGE_PORT || 7357);
// Sin valor escucha en todas las interfaces (compatibilidad); el paquete de impresion usa 127.0.0.1.
const HOST = String(process.env.LOCAL_PRINT_BRIDGE_HOST || '').trim() || undefined;
const IS_WINDOWS = process.platform === 'win32';

function runExecFile(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        windowsHide: IS_WINDOWS,
        timeout: 15000,
        maxBuffer: 1024 * 1024 * 5,
        ...options,
      },
      (error, stdout, stderr) => {
        if (error) {
          const detail = (stderr || error.message || '').trim();
          reject(new Error(detail || `Error ejecutando ${command}`));
          return;
        }
        resolve((stdout || '').trim());
      }
    );
  });
}

function runPowerShell(command) {
  if (!IS_WINDOWS) {
    throw new Error('PowerShell no disponible en este sistema operativo');
  }
  return runExecFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command]);
}

// PowerShell persistente para imprimir: abrir powershell.exe por ticket cuesta 0.5-2.5 s
// (mas en un Windows recien instalado). El proceso queda abierto y recibe un trabajo por
// linea: JSON en base64 (evita problemas de codificacion de consola) con el script a ejecutar.
const PS_WORKER_SCRIPT = [
  "$ErrorActionPreference = 'Stop'",
  'Add-Type -AssemblyName System.Drawing',
  'while ($true) {',
  '  $line = [Console]::In.ReadLine()',
  '  if ($null -eq $line) { break }',
  '  $id = 0',
  '  try {',
  '    $job = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($line)) | ConvertFrom-Json',
  '    $id = $job.id',
  '    & ([ScriptBlock]::Create($job.script)) | Out-Null',
  "    $reply = @{ id = $id; ok = $true }",
  '  } catch {',
  "    $reply = @{ id = $id; ok = $false; error = $_.Exception.Message }",
  '  }',
  '  [Console]::Out.WriteLine(($reply | ConvertTo-Json -Compress))',
  '  [Console]::Out.Flush()',
  '}',
].join('\n');
const PS_WORKER_JOB_TIMEOUT_MS = 20000;

let psWorker = null;
let psWorkerQueue = Promise.resolve();

function startPsWorker() {
  const encoded = Buffer.from(PS_WORKER_SCRIPT, 'utf16le').toString('base64');
  const child = spawn('powershell.exe', ['-NoProfile', '-NoLogo', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], {
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const worker = { child, nextId: 1, pending: new Map(), buffer: '' };
  const failAll = (error) => {
    worker.pending.forEach(({ reject, timer }) => {
      clearTimeout(timer);
      reject(error);
    });
    worker.pending.clear();
    if (psWorker === worker) psWorker = null;
  };
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    worker.buffer += chunk;
    let index;
    while ((index = worker.buffer.indexOf('\n')) >= 0) {
      const line = worker.buffer.slice(0, index).trim();
      worker.buffer = worker.buffer.slice(index + 1);
      if (!line) continue;
      let reply;
      try {
        reply = JSON.parse(line);
      } catch (_) {
        continue;
      }
      const entry = worker.pending.get(Number(reply.id));
      if (!entry) continue;
      worker.pending.delete(Number(reply.id));
      clearTimeout(entry.timer);
      if (reply.ok) entry.resolve();
      else entry.reject(new Error(reply.error || 'Error de impresion'));
    }
  });
  child.stderr.on('data', () => {});
  child.on('error', (err) => failAll(err));
  child.on('exit', () => failAll(new Error('El proceso de impresion se cerro')));
  return worker;
}

function runPrintScriptInWorker(script) {
  if (!psWorker) psWorker = startPsWorker();
  const worker = psWorker;
  return new Promise((resolve, reject) => {
    const id = worker.nextId++;
    const timer = setTimeout(() => {
      worker.pending.delete(id);
      reject(new Error('Tiempo de impresion agotado'));
      // Un trabajo colgado bloquearia la cola: se descarta el proceso y se crea otro despues.
      try { worker.child.kill(); } catch (_) {}
    }, PS_WORKER_JOB_TIMEOUT_MS);
    worker.pending.set(id, { resolve, reject, timer });
    const payload = Buffer.from(JSON.stringify({ id, script }), 'utf8').toString('base64');
    worker.child.stdin.write(`${payload}\n`);
  });
}

// Los trabajos se ejecutan de a uno; si el proceso persistente falla, se usa uno de un solo uso.
function runPrintScript(script) {
  const run = psWorkerQueue.then(
    () => runPrintScriptInWorker(script).catch((err) => {
      if (/Tiempo de impresion agotado|se cerro/.test(err.message)) {
        return runPowerShell(script);
      }
      throw err;
    })
  );
  psWorkerQueue = run.catch(() => {});
  return run;
}

function escapePsSingleQuoted(value) {
  return String(value ?? '').replace(/'/g, "''");
}

function normalizeWindowsPrinterList(raw) {
  if (!raw) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return rows
    .map((row) => ({
      name: String(row?.Name || '').trim(),
      isDefault: Boolean(row?.Default),
    }))
    .filter((row) => row.name);
}

function dedupePrinterRows(printers = []) {
  const unique = [];
  const seen = new Set();
  (Array.isArray(printers) ? printers : []).forEach((row) => {
    const name = String(row?.name || '').trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    unique.push({
      name,
      isDefault: Boolean(row?.isDefault),
    });
  });
  return unique;
}

function parseDefaultPrinterFromLpstat(raw) {
  const text = String(raw || '');
  const match = text.match(/system default destination:\s*(.+)\s*$/im);
  if (!match) return '';
  return String(match[1] || '').trim();
}

function parsePrinterNameFromLpstatLine(line) {
  const text = String(line || '').trim();
  if (!text) return '';
  if (/^lpstat:/i.test(text)) return '';
  if (/^no\s+destinations/i.test(text)) return '';
  if (/^scheduler\s+is\s+not\s+running/i.test(text)) return '';

  if (/^printer\s+/i.test(text)) {
    const rest = text.replace(/^printer\s+/i, '').trim();
    const match = rest.match(/^(.+?)(?:\s+(?:is|disabled|now|accepting|rejecting)\b|$)/i);
    return String(match?.[1] || '').trim();
  }

  const match = text.match(/^(\S+)\s+(?:accepting|is|disabled|now)\b/i);
  if (match?.[1]) return String(match[1]).trim();

  return '';
}

function normalizePosixPrinterList(printersRaw, defaultRaw) {
  const defaultPrinter = parseDefaultPrinterFromLpstat(defaultRaw);
  const names = new Set();
  const lines = String(printersRaw || '').split(/\r?\n/);
  lines.forEach((line) => {
    const name = parsePrinterNameFromLpstatLine(line);
    if (name) names.add(name);
  });

  return Array.from(names).map((name) => ({
    name,
    isDefault: Boolean(defaultPrinter && name === defaultPrinter),
  }));
}

async function listLocalPrinters() {
  if (IS_WINDOWS) {
    const attempts = [
      'Get-Printer | Select-Object Name, Default | ConvertTo-Json -Compress',
      'Get-CimInstance Win32_Printer | Select-Object Name, Default | ConvertTo-Json -Compress',
      'Get-WmiObject Win32_Printer | Select-Object Name, Default | ConvertTo-Json -Compress',
    ];
    let lastError = null;
    for (const command of attempts) {
      try {
        const output = await runPowerShell(command);
        const printers = dedupePrinterRows(normalizeWindowsPrinterList(output));
        if (printers.length > 0) {
          return printers;
        }
      } catch (err) {
        lastError = err;
      }
    }
    if (lastError) {
      throw lastError;
    }
    return [];
  }

  let printersRaw = '';
  try {
    printersRaw = await runExecFile('lpstat', ['-p']);
  } catch (_) {
    printersRaw = await runExecFile('lpstat', ['-a']);
  }

  const defaultRaw = await runExecFile('lpstat', ['-d']).catch(() => '');
  return normalizePosixPrinterList(printersRaw, defaultRaw);
}

function normalizePrintEngine(value) {
  const engine = String(value || '').trim().toLowerCase();
  if (engine === 'gdi' || engine === 'out_printer') return engine;
  return 'auto';
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function appendUniquePrinterCandidate(candidates, name, source) {
  const normalized = String(name || '').trim();
  if (!normalized) return;
  if (candidates.some((item) => item.name.toLowerCase() === normalized.toLowerCase())) {
    return;
  }
  candidates.push({ name: normalized, source });
}

function buildPrinterCandidates(requestedName, availablePrinters) {
  const printers = Array.isArray(availablePrinters) ? availablePrinters : [];
  const defaultPrinter = printers.find((row) => row?.isDefault && String(row?.name || '').trim());
  const firstPrinter = printers.find((row) => String(row?.name || '').trim());
  const candidates = [];

  appendUniquePrinterCandidate(candidates, requestedName, 'requested');
  appendUniquePrinterCandidate(candidates, defaultPrinter?.name || '', 'default');
  appendUniquePrinterCandidate(candidates, firstPrinter?.name || '', 'first_available');
  return candidates;
}

function buildGdiTicketPrintCommand(tempFile, printerName, fontSize = 6.5) {
  const safeTempFile = escapePsSingleQuoted(tempFile);
  const safePrinter = escapePsSingleQuoted(printerName);
  const safeFontSize = Number.isFinite(Number(fontSize)) ? Number(fontSize) : 6.5;
  return (
    `Add-Type -AssemblyName System.Drawing; ` +
    `$lines = @(Get-Content -Encoding UTF8 -Path '${safeTempFile}'); ` +
    `$pd = New-Object System.Drawing.Printing.PrintDocument; ` +
    `$pd.PrinterSettings.PrinterName = '${safePrinter}'; ` +
    `if (-not $pd.PrinterSettings.IsValid) { throw 'Impresora no valida o no disponible'; } ` +
    // Sin ventana de estado de .NET: cargarla tarda segundos en un Windows recien instalado.
    `$pd.PrintController = New-Object System.Drawing.Printing.StandardPrintController; ` +
    `$pd.OriginAtMargins = $false; ` +
    `$pd.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0); ` +
    `$handler = [System.Drawing.Printing.PrintPageEventHandler]{ ` +
    `param($sender,$e) ` +
    `$baseFontSize = [double]${safeFontSize}; ` +
    `$maxLine = ' '; ` +
    `for ($i = 0; $i -lt $lines.Count; $i++) { ` +
    `$candidate = [string]$lines[$i]; ` +
    `if ($candidate.Length -gt $maxLine.Length) { $maxLine = $candidate } ` +
    `} ` +
    `$measureFormat = New-Object System.Drawing.StringFormat([System.Drawing.StringFormat]::GenericTypographic); ` +
    `$measureFormat.FormatFlags = $measureFormat.FormatFlags -bor [System.Drawing.StringFormatFlags]::MeasureTrailingSpaces; ` +
    `$pageWidth = [double]$e.PageBounds.Width; ` +
    `$usableWidth = [Math]::Max(40.0, $pageWidth - 1.0); ` +
    `$targetMaxWidth = $usableWidth * 0.965; ` +
    `$measureWidth = { param([double]$sizeToMeasure) ` +
    `$probe = New-Object System.Drawing.Font('Consolas', [float]$sizeToMeasure); ` +
    `try { [double]$e.Graphics.MeasureString($maxLine, $probe, 32767, $measureFormat).Width } ` +
    `finally { $probe.Dispose() } ` +
    `}; ` +
    `$regularSize = [Math]::Round([Math]::Max(4.8, [Math]::Min(14.5, $baseFontSize)), 2); ` +
    `$regularWidth = & $measureWidth $regularSize; ` +
    `if ($regularWidth -gt $targetMaxWidth) { ` +
    `for ($shrink = $regularSize - 0.1; $shrink -ge 4.6; $shrink -= 0.1) { ` +
    `$shrinkWidth = & $measureWidth $shrink; ` +
    `$regularSize = [Math]::Round($shrink, 2); ` +
    `$regularWidth = $shrinkWidth; ` +
    `if ($shrinkWidth -le $targetMaxWidth) { break } ` +
    `} ` +
    `} ` +
    `$fontRegular = New-Object System.Drawing.Font('Consolas', [float]$regularSize); ` +
    `$titleSize = [Math]::Max(5.4, [Math]::Min(16.0, $regularSize + 1.15)); ` +
    `$fontBold = New-Object System.Drawing.Font('Consolas', [float]$titleSize, [System.Drawing.FontStyle]::Bold); ` +
    `$brush = [System.Drawing.Brushes]::Black; ` +
    `$hardX = $e.PageSettings.HardMarginX; ` +
    `$hardY = $e.PageSettings.HardMarginY; ` +
    `$x = -$hardX; ` +
    `$y = -$hardY; ` +
    `for ($i = 0; $i -lt $lines.Count; $i++) { ` +
    `$line = [string]$lines[$i]; ` +
    `$trim = $line.Trim(); ` +
    `$isDivider = $trim -match '^[\\-\\=]{6,}$'; ` +
    `$isTitle = $false; ` +
    `if ($trim.Length -gt 0 -and -not $isDivider) { ` +
    `if ($i -eq 0) { $isTitle = $true } ` +
    `elseif ($trim -match '^(DETALLE|TOTAL|ORIGINAL CLIENTE|CORTE DE TURNO|DINERO EN CAJA|ENTRADAS EFECTIVO|SALIDAS EFECTIVO|VENTAS POR DEPTO|VENTAS|RESUMEN|COMPROBANTE DE VENTA|COMPROBANTE|TICKET|TURNO\\s*#\\d+)$') { $isTitle = $true } ` +
    `} ` +
    `$font = if ($isTitle) { $fontBold } else { $fontRegular }; ` +
    `$e.Graphics.DrawString($line, $font, $brush, $x, $y); ` +
    `$y += $font.GetHeight($e.Graphics); ` +
    `} ` +
    `$measureFormat.Dispose(); ` +
    `$fontRegular.Dispose(); ` +
    `$fontBold.Dispose(); ` +
    `$e.HasMorePages = $false ` +
    `}; ` +
    `$pd.add_PrintPage($handler); ` +
    `$pd.Print();`
  );
}

async function printTextFileToPrinter({ tempFile, printerName, printEngine, fontSize }) {
  let usedMode = printEngine;

  if (IS_WINDOWS) {
    const gdiPrintCommand = buildGdiTicketPrintCommand(tempFile, printerName, fontSize);

    if (printEngine === 'out_printer') {
      await runPowerShell(
        `$content = Get-Content -Raw -Encoding UTF8 -Path '${escapePsSingleQuoted(tempFile)}'; ` +
        `$content | Out-Printer -Name '${escapePsSingleQuoted(printerName)}'`
      );
      return usedMode;
    }
    if (printEngine === 'gdi') {
      await runPrintScript(gdiPrintCommand);
      return usedMode;
    }

    try {
      // Auto mode: prefer GDI first to avoid margin/crop issues on thermal printers.
      await runPrintScript(gdiPrintCommand);
      usedMode = 'gdi';
    } catch (_) {
      await runPowerShell(
        `$content = Get-Content -Raw -Encoding UTF8 -Path '${escapePsSingleQuoted(tempFile)}'; ` +
        `$content | Out-Printer -Name '${escapePsSingleQuoted(printerName)}'`
      );
      usedMode = 'out_printer';
    }
    return usedMode;
  }

  try {
    await runExecFile('lp', ['-d', printerName, '-o', 'raw', tempFile], { timeout: 20000 });
    return 'lp_raw';
  } catch (_) {
    await runExecFile('lp', ['-d', printerName, tempFile], { timeout: 20000 });
    return 'lp';
  }
}

app.get('/health', (_req, res) => {
  return res.json({ ok: true, service: 'local_print_bridge', platform: process.platform });
});

const PRINTER_LIST_CACHE_MS = 60000;
let printerListCache = { printers: null, at: 0 };

async function listLocalPrintersCached() {
  if (printerListCache.printers && (Date.now() - printerListCache.at) < PRINTER_LIST_CACHE_MS) {
    return printerListCache.printers;
  }
  const printers = await listLocalPrinters();
  printerListCache = { printers, at: Date.now() };
  return printers;
}

app.get('/api/printers', async (_req, res) => {
  try {
    // Configuracion > Impresora siempre pide la lista actual y de paso renueva la cache.
    const printers = await listLocalPrinters();
    printerListCache = { printers, at: Date.now() };
    return res.json(printers);
  } catch (err) {
    return res.status(500).json({ message: `No se pudieron listar impresoras locales: ${err.message}` });
  }
});

app.post('/api/print/ticket', async (req, res) => {
  const requestedPrinterName = String(req.body?.printer_name || '').trim();
  const text = String(req.body?.text || '');
  const printEngine = normalizePrintEngine(req.body?.print_engine);
  const fontSize = clampNumber(req.body?.font_size, 4.5, 12, 6.5);
  const feedLines = clampNumber(req.body?.feed_lines_after_print, 0, 8, 0);

  if (!text.trim()) {
    return res.status(400).json({ message: 'Debe indicar el texto del ticket' });
  }

  const outputText = `${text}${'\r\n'.repeat(feedLines)}`;
  const tempFile = path.join(os.tmpdir(), `ticket-local-${Date.now()}.txt`);

  try {
    await fs.writeFile(tempFile, outputText, 'utf8');
    let usedPrinter = '';
    let usedMode = printEngine;
    let usedSource = '';
    let lastError = null;
    const triedNames = new Set();

    const tryCandidates = async (candidates) => {
      for (const candidate of candidates) {
        const key = candidate.name.toLowerCase();
        if (triedNames.has(key)) continue;
        triedNames.add(key);
        try {
          usedMode = await printTextFileToPrinter({
            tempFile,
            printerName: candidate.name,
            printEngine,
            fontSize,
          });
          usedPrinter = candidate.name;
          usedSource = candidate.source;
          return true;
        } catch (err) {
          lastError = err;
        }
      }
      return false;
    };

    // Camino rapido: imprimir directo en la impresora configurada. Listar las impresoras
    // de Windows cuesta ~2 s de PowerShell, asi que solo se hace si no hay nombre o si falla.
    const printed = requestedPrinterName
      ? await tryCandidates([{ name: requestedPrinterName, source: 'requested' }])
      : false;
    if (!printed) {
      const availablePrinters = await listLocalPrintersCached().catch(() => []);
      const fallbackCandidates = buildPrinterCandidates(requestedPrinterName, availablePrinters);
      if (!fallbackCandidates.length && !lastError) {
        return res.status(400).json({ message: 'No hay impresoras locales disponibles en este equipo' });
      }
      await tryCandidates(fallbackCandidates);
    }

    if (!usedPrinter) {
      throw lastError || new Error('No fue posible imprimir en ninguna impresora local');
    }

    return res.json({
      success: true,
      printer: usedPrinter,
      requested_printer: requestedPrinterName || null,
      mode: usedMode,
      source: usedSource,
    });
  } catch (err) {
    return res.status(500).json({ message: `No se pudo imprimir ticket local: ${err.message}` });
  } finally {
    await fs.unlink(tempFile).catch(() => {});
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Local Print Bridge escuchando en http://${HOST || '0.0.0.0'}:${PORT} (${process.platform})`);
  if (IS_WINDOWS) {
    // Precalienta PowerShell y System.Drawing para que el primer ticket no espere el arranque.
    runPrintScript('$null = New-Object System.Drawing.Printing.PrintDocument').catch(() => {});
  }
});

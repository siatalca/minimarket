const express = require('express');
const cors = require('cors');
const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const { execFile } = require('child_process');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

const PORT = Number(process.env.LOCAL_PRINT_BRIDGE_PORT || 7357);
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
    const output = await runPowerShell('Get-Printer | Select-Object Name, Default | ConvertTo-Json -Compress');
    return normalizeWindowsPrinterList(output);
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
      await runPowerShell(gdiPrintCommand);
      return usedMode;
    }

    try {
      // Auto mode: prefer GDI first to avoid margin/crop issues on thermal printers.
      await runPowerShell(gdiPrintCommand);
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

app.get('/api/printers', async (_req, res) => {
  try {
    const printers = await listLocalPrinters();
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
  const availablePrinters = await listLocalPrinters().catch(() => []);
  const printerCandidates = buildPrinterCandidates(requestedPrinterName, availablePrinters);

  if (!printerCandidates.length) {
    return res.status(400).json({ message: 'No hay impresoras locales disponibles en este equipo' });
  }
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

    for (const candidate of printerCandidates) {
      try {
        usedMode = await printTextFileToPrinter({
          tempFile,
          printerName: candidate.name,
          printEngine,
          fontSize,
        });
        usedPrinter = candidate.name;
        usedSource = candidate.source;
        break;
      } catch (err) {
        lastError = err;
      }
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

app.listen(PORT, () => {
  console.log(`Local Print Bridge escuchando en http://127.0.0.1:${PORT} (${process.platform})`);
});

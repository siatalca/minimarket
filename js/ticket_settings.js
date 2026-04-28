const API_URL = (() => {
    const override = window.localStorage.getItem('api_url');
    if (override) {
        return override.endsWith('/') ? override : `${override}/`;
    }
    if (window.location.port === '3002') {
        return `${window.location.origin}/`;
    }
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    const protocol = isLocalHost ? 'http:' : window.location.protocol;
    return `${protocol}//${window.location.hostname}:3002/`;
})();

const LOCAL_PRINT_BRIDGE_BASES = ['http://127.0.0.1:7357/'];
let localPrintBridgeCache = { base: null, checkedAt: 0 };
let lastPrintersSource = 'server';
const LOCAL_PRINT_BRIDGE_CACHE_MS = 180000;

function shouldForceLocalTicketPrinting() {
    const raw = String(localStorage.getItem('force_local_ticket_print') || '').trim().toLowerCase();
    if (raw === '0' || raw === 'false' || raw === 'no') {
        return false;
    }
    return true;
}

function getLocalPrintBridgeRequiredMessage() {
    return 'No se detecto la impresion local de esta caja. Abre iniciar_servicios_ocultos.bat en este equipo y vuelve a intentar.';
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeTicketPaperWidthMm(value, fallback = 58) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed)) {
        return Number(fallback || 58) >= 80 ? 80 : 58;
    }
    return parsed >= 80 ? 80 : 58;
}

function clampTicketFontSizePt(value, fallback = 6.5) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(4.5, Math.min(12, parsed));
}

function normalizeTicketFontAdjustPx(value, fallback = 0) {
    const parsed = Number(value);
    const normalizedFallback = Number.isFinite(Number(fallback)) ? Number(fallback) : 0;
    if (!Number.isFinite(parsed)) return Math.max(-8, Math.min(8, normalizedFallback));
    return Math.max(-8, Math.min(8, Number(parsed.toFixed(2))));
}

function isTicketTitleLineForPrint(line = '', index = 0) {
    const trimmed = String(line || '').trim();
    if (!trimmed) return false;
    if (/^[-=]{6,}$/.test(trimmed)) return false;
    if (index === 0) return true;
    return /^(DETALLE|TOTAL|ORIGINAL CLIENTE|CORTE DE TURNO|DINERO EN CAJA|ENTRADAS EFECTIVO|SALIDAS EFECTIVO|VENTAS POR DEPTO|VENTAS|RESUMEN|COMPROBANTE DE VENTA|COMPROBANTE|TICKET|TURNO\s*#\d+)$/i.test(trimmed);
}

function renderTicketLinesHtml(ticketText = '', _options = {}) {
    const lines = String(ticketText || '').replace(/\r\n/g, '\n').split('\n');
    return lines.map((line, index) => {
        const isTitle = isTicketTitleLineForPrint(line, index);
        const safeLine = escapeHtml(line || ' ');
        return `<div class="ticket-line${isTitle ? ' ticket-line-title' : ''}">${safeLine}</div>`;
    }).join('');
}

function buildBrowserTicketPrintHtml(ticketText = '', documentTitle = 'Ticket', options = {}) {
    const paperWidthMm = normalizeTicketPaperWidthMm(options.paperWidthMm, 58);
    const fontSizePt = clampTicketFontSizePt(options.fontSizePt, 6.5);
    const fontBoostPx = normalizeTicketFontAdjustPx(options.fontBoostPx, 0);
    const ticketHtml = renderTicketLinesHtml(ticketText, options);
    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(documentTitle)}</title>
  <style>
    @page { size: ${paperWidthMm}mm auto; margin: 1mm; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { width: ${paperWidthMm}mm; font-family: Consolas, "Courier New", monospace; font-size: ${fontSizePt}pt; line-height: 1.2; color: #000; --ticket-font-boost-px: ${fontBoostPx.toFixed(2)}px; }
    .ticket-content { margin: 0; padding: 0; }
    .ticket-line { white-space: pre; font-weight: 400; font-size: calc(1em + var(--ticket-font-boost-px, 0px)); }
    .ticket-line-title { font-weight: 800; font-size: calc(1.26em + var(--ticket-font-boost-px, 0px)); letter-spacing: 0.2px; }
  </style>
</head>
<body>
  <div class="ticket-content">${ticketHtml}</div>
</body>
</html>`;
}

async function printTicketTextInBrowser(ticketText = '', documentTitle = 'Ticket', options = {}) {
    if (!String(ticketText || '').trim()) {
        throw new Error('No hay contenido para imprimir');
    }
    const printWindow = window.open('', '_blank', 'width=460,height=720');
    if (!printWindow) {
        throw new Error('El navegador bloqueo la ventana de impresion local. Habilita popups para este sitio.');
    }
    const html = buildBrowserTicketPrintHtml(ticketText, documentTitle, options);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        try {
            printWindow.print();
        } catch (_) {
        }
    }, 180);
    return { success: true, mode: 'browser_local', printer: 'default_browser_printer' };
}

function getCurrentCajaId() {
    const raw = String(localStorage.getItem('n_caja') || localStorage.getItem('caja') || '').trim();
    return /^\d+$/.test(raw) ? raw : '';
}

function buildTicketSettingsUrl() {
    const caja = getCurrentCajaId();
    if (!caja) return `${API_URL}api/ticket-settings`;
    return `${API_URL}api/ticket-settings?caja=${encodeURIComponent(caja)}`;
}

function getLocalPrintBridgeCandidates() {
    const custom = String(localStorage.getItem('local_print_bridge_url') || '').trim();
    const customUrl = custom ? (custom.endsWith('/') ? custom : `${custom}/`) : '';
    return customUrl ? [customUrl, ...LOCAL_PRINT_BRIDGE_BASES] : [...LOCAL_PRINT_BRIDGE_BASES];
}

async function resolveLocalPrintBridgeBase(force = false) {
    const now = Date.now();
    const cacheIsFresh = (now - localPrintBridgeCache.checkedAt) < LOCAL_PRINT_BRIDGE_CACHE_MS;
    if (!force && cacheIsFresh) {
        return localPrintBridgeCache.base || null;
    }
    const candidates = getLocalPrintBridgeCandidates();
    for (const base of candidates) {
        try {
            const response = await fetch(`${base}health`, { cache: 'no-store' });
            if (!response.ok) continue;
            localPrintBridgeCache = { base, checkedAt: now };
            return base;
        } catch (_) {
            // try next candidate
        }
    }
    localPrintBridgeCache = { base: null, checkedAt: now };
    return null;
}

async function sendTicketToLocalBridge({ bridgeBase = '', printerName = '', text = '', printEngine = 'auto', fontSize = 6.5 }) {
    const base = bridgeBase || await resolveLocalPrintBridgeBase();
    if (!base) throw new Error('Bridge local no disponible');
    const response = await fetch(`${base}api/print/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            printer_name: String(printerName || '').trim(),
            text: String(text || ''),
            print_engine: String(printEngine || 'auto'),
            font_size: Number(fontSize || 6.5),
        }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'No se pudo imprimir en la estacion local');
    }
    return data;
}

function withAuthHeaders(headers = {}) {
    const token = localStorage.getItem('token');
    if (token) {
        return { ...headers, Authorization: `Bearer ${token}` };
    }
    return headers;
}

function closePopupWindow() {
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'close-app-popup' }, '*');
        return;
    }
    window.close();
}

async function fetchTicketSettings() {
    const response = await fetch(buildTicketSettingsUrl(), {
        headers: withAuthHeaders(),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'No se pudo cargar configuracion de ticket');
    }
    return data;
}

async function saveTicketSettings(payload) {
    const caja = getCurrentCajaId();
    const bodyPayload = { ...payload };
    if (caja) {
        bodyPayload.caja_id = Number(caja);
    }
    const response = await fetch(buildTicketSettingsUrl(), {
        method: 'PUT',
        headers: withAuthHeaders({
            'Content-Type': 'application/json',
        }),
        body: JSON.stringify(bodyPayload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'No se pudo guardar configuracion');
    }
    return data;
}

async function fetchPrinters() {
    const localBridge = await resolveLocalPrintBridgeBase(true);
    if (!localBridge) {
        lastPrintersSource = 'browser_local';
        return [];
    }
    const response = await fetch(`${localBridge}api/printers`, { cache: 'no-store' });
    const data = await response.json().catch(() => []);
    if (!response.ok) {
        lastPrintersSource = 'browser_local';
        return [];
    }
    if (!Array.isArray(data)) {
        lastPrintersSource = 'browser_local';
        return [];
    }
    lastPrintersSource = 'local';
    return data;
}

async function fetchBusinessInfo() {
    const response = await fetch(API_URL + 'api/getInfo', {
        headers: withAuthHeaders(),
    });
    const data = await response.json().catch(() => []);
    if (!response.ok) {
        throw new Error('No se pudo obtener la informacion del negocio');
    }
    if (!Array.isArray(data) || data.length === 0) {
        return null;
    }
    return data[data.length - 1];
}

function formatCLP(value) {
    const amount = Number(value || 0);
    return Math.round(amount).toLocaleString('es-CL');
}

function padRight(value, width) {
    const str = String(value ?? '');
    if (str.length >= width) return str.slice(0, width);
    return str + ' '.repeat(width - str.length);
}

function padLeft(value, width) {
    const str = String(value ?? '');
    if (str.length >= width) return str.slice(0, width);
    return ' '.repeat(width - str.length) + str;
}

function truncateTicketLine(value = '', maxWidth = 42) {
    const width = Math.max(1, Number(maxWidth || 1));
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= width) return text;
    if (width <= 3) return text.slice(0, width);
    return `${text.slice(0, width - 3)}...`;
}

function clampColumnsByPaper(value, paperWidthMm, fallback = 30) {
    const paper = normalizeTicketPaperWidthMm(paperWidthMm, 58);
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed)) return fallback;
    if (paper === 58) {
        return Math.max(28, Math.min(56, parsed));
    }
    return Math.max(32, Math.min(64, parsed));
}

function clampColumns(value, fallback = 30, paperWidthMm = 58) {
    return clampColumnsByPaper(value, paperWidthMm, fallback);
}

function clampFeedLines(value, fallback = 2) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed)) return fallback;
    return Math.max(0, Math.min(8, parsed));
}

function getRecommendedColumnsForPaper(paperWidthMm) {
    const paper = normalizeTicketPaperWidthMm(paperWidthMm, 58);
    return paper === 58 ? 39 : 48;
}

function getPreviewPrintProfile(printerName, requestedColumns, paperWidthMm = 58) {
    const printer = String(printerName || '').trim();
    const isXp58 = /xp-58/i.test(printer);
    const paper = normalizeTicketPaperWidthMm(paperWidthMm, 58);
    return { columns: clampColumnsByPaper(requestedColumns, paper, paper === 58 ? 30 : 42), isXp58 };
}

function getPreviewFontPt(columns, paperWidthMm) {
    const paper = normalizeTicketPaperWidthMm(paperWidthMm, 58);
    const cols = clampColumns(columns, paper === 58 ? 30 : 42, paper);
    if (paper === 58) {
        if (cols <= 30) return 7.2;
        if (cols <= 36) return 6.8;
        if (cols <= 42) return 6.4;
        if (cols <= 48) return 6.0;
        return 5.6;
    }
    if (cols <= 36) return 8.4;
    return 8.8;
}

function fitTicketPreviewToPrintable(previewEl, baseFontMm = 2.2) {
    if (!previewEl) return Number(baseFontMm || 2.2);
    let fontMm = Number(baseFontMm);
    if (!Number.isFinite(fontMm) || fontMm <= 0) fontMm = 2.2;

    previewEl.style.whiteSpace = 'pre';
    previewEl.style.overflowX = 'hidden';
    previewEl.style.overflowY = 'auto';
    previewEl.style.width = '100%';
    previewEl.style.boxSizing = 'border-box';
    previewEl.style.lineHeight = '1.2';
    previewEl.style.fontSize = `${fontMm.toFixed(2)}mm`;

    const minFontMm = 1.45;
    let guard = 0;
    while (previewEl.scrollWidth > previewEl.clientWidth + 1 && fontMm > minFontMm && guard < 28) {
        fontMm = Number((fontMm - 0.06).toFixed(2));
        previewEl.style.fontSize = `${fontMm.toFixed(2)}mm`;
        guard += 1;
    }
    return fontMm;
}

function buildPreviewText(settings, business) {
    const profile = getPreviewPrintProfile(settings.printer_name, settings.columns_width, settings.paper_width_mm);
    const columns = profile.columns;
    const divider = '-'.repeat(columns);
    const lines = [];
    const title = String(settings.ticket_header || 'COMPROBANTE DE VENTA').trim();
    const footer = String(settings.ticket_footer || 'Gracias por su compra').trim();
    const centerLine = (value = '') => {
        const text = String(value).trim();
        if (!text) return '';
        if (text.length >= columns) return text.slice(0, columns);
        const left = Math.floor((columns - text.length) / 2);
        const right = columns - text.length - left;
        return `${' '.repeat(left)}${text}${' '.repeat(right)}`;
    };
    const wrapText = (value = '') => {
        const raw = String(value || '').trim();
        if (!raw) return [];
        const words = raw.split(/\s+/);
        const out = [];
        let current = '';
        words.forEach((word) => {
            const candidate = current ? `${current} ${word}` : word;
            if (candidate.length <= columns) {
                current = candidate;
                return;
            }
            if (current) out.push(current);
            if (word.length > columns) {
                for (let i = 0; i < word.length; i += columns) {
                    out.push(word.slice(i, i + columns));
                }
                current = '';
            } else {
                current = word;
            }
        });
        if (current) out.push(current);
        return out;
    };

    lines.push(centerLine(title));
    lines.push(divider);

    if (settings.show_business_info && business) {
        if (business.nombre) lines.push(centerLine(String(business.nombre)));
        if (business.tipo_local) wrapText(`Rubro: ${business.tipo_local}`).forEach((line) => lines.push(line));
        if (business.telefono) lines.push(`Tel: ${business.telefono}`);
        if (business.mail) wrapText(`Mail: ${business.mail}`).forEach((line) => lines.push(line));
        lines.push(divider);
    }

    lines.push(`Fecha: ${new Date().toLocaleDateString('es-CL')}`);
    lines.push(`Hora: ${new Date().toLocaleTimeString('es-CL', { hour12: false })}`);
    if (settings.show_ticket_number) lines.push('Ticket: 1001');
    if (settings.show_cashier) lines.push('Cajero: CAJERO');
    if (settings.show_box) lines.push('Caja: 1');
    if (settings.show_payment_method) lines.push('Pago: efectivo');
    lines.push(divider);

    const sampleItems = [
        { descripcion: 'Producto 1', cantidad: 1, precio_unitario: 1290, subtotal: 1290 },
        { descripcion: 'Producto 2', cantidad: 2, precio_unitario: 850, subtotal: 1700 },
        { descripcion: 'Producto 3', cantidad: 1, precio_unitario: 3990, subtotal: 3990 },
    ];

    if (settings.include_details_by_default) {
        lines.push('DETALLE');
        lines.push(divider);

        sampleItems.forEach((item) => {
            const amountText = `$${formatCLP(item.subtotal)}`;
            const leftWidth = Math.max(8, columns - amountText.length - 1);
            const detailDescWidth = Math.max(12, columns - 8);
            lines.push(truncateTicketLine(item.descripcion, detailDescWidth));
            lines.push(padRight(`${formatCLP(item.cantidad)} x $${formatCLP(item.precio_unitario)}`, leftWidth) + ' ' + padLeft(amountText, amountText.length));
        });
        lines.push(divider);
    }

    const total = sampleItems.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
    const totalText = `$${formatCLP(total)}`;
    if (columns <= 34 || (`TOTAL ${totalText}`).length > columns) {
        lines.push('TOTAL');
        lines.push(totalText);
    } else {
        lines.push(padRight('TOTAL', Math.max(1, columns - totalText.length - 1)) + ` ${totalText}`);
    }
    lines.push(divider);
    wrapText(footer).forEach((line) => lines.push(line));
    lines.push(centerLine('ORIGINAL CLIENTE'));
    lines.push('');
    return lines.join('\r\n');
}

function getPreviewSettingsFromForm(base = {}) {
    const paperWidthMm = normalizeTicketPaperWidthMm(base.paper_width_mm, 58);
    return {
        ...base,
        ticket_header: document.getElementById('ticket-header')?.value || 'COMPROBANTE DE VENTA',
        ticket_footer: document.getElementById('ticket-footer')?.value || 'Gracias por su compra',
        columns_width: clampColumns(document.getElementById('ticket-columns')?.value, paperWidthMm === 58 ? 30 : 42, paperWidthMm),
        font_size_adjust_px: normalizeTicketFontAdjustPx(document.getElementById('ticket-font-global-input')?.value, Number(base.font_size_adjust_px || 0)),
        show_business_info: document.getElementById('ticket-show-business')?.checked ?? true,
        show_ticket_number: document.getElementById('ticket-show-ticket-number')?.checked ?? true,
        show_cashier: document.getElementById('ticket-show-cashier')?.checked ?? true,
        show_box: document.getElementById('ticket-show-box')?.checked ?? true,
        show_payment_method: document.getElementById('ticket-show-payment')?.checked ?? true,
        include_details_by_default: document.getElementById('ticket-include-details')?.checked ?? true,
    };
}

function setSelectOptions(selectEl, printers, selectedName) {
    selectEl.innerHTML = '';
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = 'Selecciona impresora...';
    selectEl.appendChild(empty);

    printers.forEach((printer) => {
        const option = document.createElement('option');
        option.value = printer.name;
        option.textContent = printer.isDefault ? `${printer.name} (Predeterminada del SO)` : printer.name;
        selectEl.appendChild(option);
    });
    if (selectedName) {
        selectEl.value = selectedName;
    } else {
        const defaultPrinter = printers.find((p) => p.isDefault);
        if (defaultPrinter) {
            selectEl.value = defaultPrinter.name;
        }
    }
}

function setBrowserDefaultOption(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Predeterminada del equipo cliente (navegador)';
    selectEl.appendChild(option);
    selectEl.value = '';
}

function getTicketFormPayload(base = {}) {
    const paperWidthMm = normalizeTicketPaperWidthMm(base.paper_width_mm, 58);
    return {
        ...base,
        ticket_header: document.getElementById('ticket-header')?.value || 'COMPROBANTE DE VENTA',
        ticket_footer: document.getElementById('ticket-footer')?.value || 'Gracias por su compra',
        columns_width: clampColumns(document.getElementById('ticket-columns')?.value, paperWidthMm === 58 ? 30 : 42, paperWidthMm),
        font_size_adjust_px: normalizeTicketFontAdjustPx(document.getElementById('ticket-font-global-input')?.value, Number(base.font_size_adjust_px || 0)),
        show_business_info: document.getElementById('ticket-show-business')?.checked ?? true,
        show_ticket_number: document.getElementById('ticket-show-ticket-number')?.checked ?? true,
        show_cashier: document.getElementById('ticket-show-cashier')?.checked ?? true,
        show_box: document.getElementById('ticket-show-box')?.checked ?? true,
        show_payment_method: document.getElementById('ticket-show-payment')?.checked ?? true,
        include_details_by_default: document.getElementById('ticket-include-details')?.checked ?? true,
    };
}

function fillTicketForm(settings) {
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val ?? '';
    };
    const check = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.checked = Boolean(val);
    };
    set('ticket-header', settings.ticket_header || 'COMPROBANTE DE VENTA');
    set('ticket-footer', settings.ticket_footer || 'Gracias por su compra');
    set('ticket-columns', clampColumns(settings.columns_width, 30, settings.paper_width_mm));
    set('ticket-font-global-input', normalizeTicketFontAdjustPx(settings.font_size_adjust_px, 0));
    check('ticket-show-business', settings.show_business_info);
    check('ticket-show-ticket-number', settings.show_ticket_number);
    check('ticket-show-cashier', settings.show_cashier);
    check('ticket-show-box', settings.show_box);
    check('ticket-show-payment', settings.show_payment_method);
    check('ticket-include-details', settings.include_details_by_default);
}

async function initTicketForm() {
    const form = document.getElementById('ticket-settings-form');
    if (!form) return;
    const previewEl = document.getElementById('ticket-preview');
    const paperEl = document.getElementById('ticket-paper');
    const printableEl = document.getElementById('ticket-printable-area');
    const previewMetaEl = document.getElementById('ticket-preview-meta');
    const columnsInput = document.getElementById('ticket-columns');
    const fontGlobalInput = document.getElementById('ticket-font-global-input');
    const fontPlusBtn = document.getElementById('ticket-font-plus-btn');
    const fontMinusBtn = document.getElementById('ticket-font-minus-btn');
    const applyDefaultBtn = document.getElementById('apply-ticket-default-btn');
    let businessInfo = null;
    let currentSettings = null;

    function updatePreview() {
        if (!previewEl || !currentSettings) return;
        const settings = getPreviewSettingsFromForm(currentSettings);
        const paperWidthMm = normalizeTicketPaperWidthMm(currentSettings?.paper_width_mm, 58);
        const profile = getPreviewPrintProfile(settings.printer_name, settings.columns_width, paperWidthMm);
        const printableWidthMm = paperWidthMm === 58 ? 58 : 80;
        if (columnsInput) {
            columnsInput.value = String(profile.columns);
            columnsInput.min = paperWidthMm === 58 ? '28' : '32';
            columnsInput.max = paperWidthMm === 58 ? '56' : '64';
            columnsInput.disabled = false;
            columnsInput.title = '';
        }
        if (paperEl) {
            paperEl.style.width = `${Math.round(paperWidthMm * 4.2)}px`;
        }
        if (printableEl) {
            printableEl.style.width = `${Math.round(printableWidthMm * 4.2)}px`;
        }
        const fontAdjustPx = normalizeTicketFontAdjustPx(settings.font_size_adjust_px, 0);
        const fontPt = clampTicketFontSizePt(getPreviewFontPt(profile.columns, paperWidthMm) + (fontAdjustPx * 0.75), 6.5);
        if (previewMetaEl) {
            previewMetaEl.textContent = `Papel: ${paperWidthMm}mm | Area util aprox: ${printableWidthMm}mm | Columnas configuradas: ${profile.columns}`;
        }
        const effectiveSettings = { ...settings, columns_width: profile.columns };
        previewEl.textContent = buildPreviewText(effectiveSettings, businessInfo);
        const baseFontMm = fontPt * 0.3528;
        const adjustedFontMm = fitTicketPreviewToPrintable(previewEl, baseFontMm);
        if (previewMetaEl) {
            previewMetaEl.textContent = `Papel: ${paperWidthMm}mm | Area util aprox: ${printableWidthMm}mm | Columnas: ${profile.columns} | Ajuste global: ${fontAdjustPx >= 0 ? '+' : ''}${fontAdjustPx.toFixed(1)}px | Vista: ${adjustedFontMm.toFixed(2)}mm`;
        }
    }

    try {
        const [settings, business] = await Promise.all([
            fetchTicketSettings(),
            fetchBusinessInfo().catch(() => null),
        ]);
        currentSettings = settings;
        businessInfo = business;
        fillTicketForm(settings);
        updatePreview();
    } catch (error) {
        alert(error.message);
    }

    const reactiveInputs = [
        'ticket-header',
        'ticket-footer',
        'ticket-columns',
        'ticket-font-global-input',
        'ticket-show-business',
        'ticket-show-ticket-number',
        'ticket-show-cashier',
        'ticket-show-box',
        'ticket-show-payment',
        'ticket-include-details',
    ];
    reactiveInputs.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', updatePreview);
        el.addEventListener('change', updatePreview);
    });

    const nudgeGlobalFont = (deltaPx) => {
        const current = normalizeTicketFontAdjustPx(fontGlobalInput?.value, 0);
        const next = normalizeTicketFontAdjustPx(current + Number(deltaPx || 0), current);
        if (fontGlobalInput) fontGlobalInput.value = String(next);
        updatePreview();
    };
    fontPlusBtn?.addEventListener('click', () => nudgeGlobalFont(2));
    fontMinusBtn?.addEventListener('click', () => nudgeGlobalFont(-2));

    applyDefaultBtn?.addEventListener('click', () => {
        const paperWidthMm = Number(currentSettings?.paper_width_mm || 58) >= 80 ? 80 : 58;
        const recommended = getRecommendedColumnsForPaper(paperWidthMm);
        if (columnsInput) {
            columnsInput.value = String(recommended);
        }
        updatePreview();
    });

    const testPrintBtn = document.getElementById('print-ticket-test-btn');
    testPrintBtn?.addEventListener('click', async () => {
        if (!currentSettings) return;
        try {
            testPrintBtn.disabled = true;
            const latest = await fetchTicketSettings();
            const payload = getTicketFormPayload(latest);
            payload.printer_name = latest.printer_name || null;
            payload.paper_width_mm = Number(latest.paper_width_mm || 58) >= 80 ? 80 : 58;
            payload.print_engine = String(latest.print_engine || 'auto');
            payload.feed_lines_after_print = clampFeedLines(latest.feed_lines_after_print, 2);
            const profile = getPreviewPrintProfile(payload.printer_name, payload.columns_width, payload.paper_width_mm);
            payload.columns_width = profile.columns;
            await saveTicketSettings(payload);
            currentSettings = payload;
            updatePreview();

            const caja = getCurrentCajaId();
            const requestPayload = { return_payload: true };
            if (caja) requestPayload.numero_caja = Number(caja);
            const response = await fetch(API_URL + 'api/print/sale-ticket-test', {
                method: 'POST',
                headers: withAuthHeaders({
                    'Content-Type': 'application/json',
                }),
                body: JSON.stringify(requestPayload),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.message || 'No se pudo imprimir prueba');
            }
            if (!data?.ticket_text) {
                throw new Error('No se pudo preparar el ticket de prueba');
            }

            const localBridge = await resolveLocalPrintBridgeBase(true);
            const forceLocal = shouldForceLocalTicketPrinting();
            if (forceLocal) {
                if (!localBridge) {
                    throw new Error(getLocalPrintBridgeRequiredMessage());
                }
                await sendTicketToLocalBridge({
                    bridgeBase: localBridge,
                    printerName: data.printer || payload.printer_name || '',
                    text: data.ticket_text,
                    printEngine: data.print_engine || payload.print_engine || 'auto',
                    fontSize: data.font_size || 6.5,
                });
                alert(`Prueba enviada a impresora local: ${data.printer || payload.printer_name || 'predeterminada del equipo'}`);
                return;
            }
            if (localBridge) {
                await sendTicketToLocalBridge({
                    bridgeBase: localBridge,
                    printerName: data.printer || payload.printer_name || '',
                    text: data.ticket_text,
                    printEngine: data.print_engine || payload.print_engine || 'auto',
                    fontSize: data.font_size || 6.5,
                });
                alert(`Prueba enviada a impresora local: ${data.printer || payload.printer_name || 'predeterminada del equipo'}`);
                return;
            }

            await printTicketTextInBrowser(data.ticket_text, 'Prueba de ticket', {
                paperWidthMm: data.paper_width_mm,
                fontSizePt: data.font_size,
                fontBoostPx: data.font_size_adjust_px ?? payload.font_size_adjust_px ?? 0,
            });
            alert('Prueba enviada por navegador local.');
        } catch (error) {
            alert(error.message || 'No se pudo imprimir la prueba');
        } finally {
            testPrintBtn.disabled = false;
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
            const saveBtn = document.getElementById('save-ticket-and-close-btn');
            if (saveBtn) saveBtn.disabled = true;
            const current = await fetchTicketSettings();
            const payload = getTicketFormPayload(current);
            payload.printer_name = current.printer_name || null;
            const profile = getPreviewPrintProfile(payload.printer_name, payload.columns_width, payload.paper_width_mm);
            payload.columns_width = profile.columns;
            await saveTicketSettings(payload);
            currentSettings = payload;
            updatePreview();
            alert('Configuracion guardada correctamente.');
            if (saveBtn) saveBtn.disabled = false;
        } catch (error) {
            const saveBtn = document.getElementById('save-ticket-and-close-btn');
            if (saveBtn) saveBtn.disabled = false;
            alert(error.message);
        }
    });
}

async function initPrinterForm() {
    const form = document.getElementById('printer-settings-form');
    if (!form) return;

    const select = document.getElementById('ticket-printer-select');
    const reloadBtn = document.getElementById('reload-printers-btn');
    const columnsInput = document.getElementById('printer-columns');
    const saveBtn = document.getElementById('save-printer-btn');
    const hint = document.getElementById('printer-columns-hint');
    const paperWidthSelect = document.getElementById('printer-paper-width');
    const printEngineSelect = document.getElementById('printer-engine');
    const feedLinesInput = document.getElementById('printer-feed-lines');
    const applyDefaultBtn = document.getElementById('apply-printer-default-btn');
    let currentSettings = null;
    let localPrinterList = [];

    function applyNoLocalPrinterState(message = '') {
        setBrowserDefaultOption(select);
        if (hint) {
            hint.textContent = message || 'No hay bridge local. Se usara impresion por navegador en la impresora predeterminada del equipo cliente.';
        }
    }

    async function refreshPrinters() {
        const printers = await fetchPrinters();
        localPrinterList = Array.isArray(printers) ? printers : [];
        if (localPrinterList.length > 0) {
            setSelectOptions(select, printers, currentSettings?.printer_name || '');
        } else {
            setBrowserDefaultOption(select);
        }
        const selectedName = String(select?.value || '').trim() || currentSettings?.printer_name || '';
        const selectedPaperWidth = normalizeTicketPaperWidthMm(paperWidthSelect?.value || currentSettings?.paper_width_mm || 58, 58);
        const baseColumns = clampColumns(
            columnsInput?.value || currentSettings?.columns_width || (selectedPaperWidth >= 80 ? 42 : 30),
            selectedPaperWidth >= 80 ? 42 : 30,
            selectedPaperWidth
        );
        const profile = getPreviewPrintProfile(selectedName, baseColumns, selectedPaperWidth);
        const effectiveColumns = clampColumns(profile.columns, selectedPaperWidth >= 80 ? 42 : 30, selectedPaperWidth);
        if (columnsInput) {
            columnsInput.value = String(effectiveColumns);
            columnsInput.min = selectedPaperWidth === 58 ? '28' : '32';
            columnsInput.max = selectedPaperWidth === 58 ? '56' : '64';
            columnsInput.disabled = false;
            columnsInput.title = '';
        }
        if (hint) {
            const sourceHint = localPrinterList.length
                ? 'Lista de impresoras del equipo actual (bridge local activo).'
                : 'Sin bridge local: impresion por navegador usando impresora predeterminada del equipo cliente.';
            const profileHint = selectedPaperWidth === 58
                ? (profile.isXp58
                    ? 'XP-58 detectada: ajusta entre 28 y 56 columnas segun legibilidad.'
                    : 'Papel 58mm: ajusta entre 28 y 56 columnas.')
                : 'Papel 80mm: ajusta entre 32 y 64 columnas.';
            hint.textContent = `${sourceHint} ${profileHint}`;
        }
    }

    try {
        currentSettings = await fetchTicketSettings();
        columnsInput.value = clampColumns(currentSettings.columns_width, 30, currentSettings.paper_width_mm);
        if (paperWidthSelect) paperWidthSelect.value = String(currentSettings.paper_width_mm || 58);
        if (printEngineSelect) printEngineSelect.value = String(currentSettings.print_engine || 'auto');
        if (feedLinesInput) feedLinesInput.value = String(clampFeedLines(currentSettings.feed_lines_after_print, 2));
        await refreshPrinters();
    } catch (error) {
        applyNoLocalPrinterState(error.message || '');
        alert(error.message);
    }

    reloadBtn?.addEventListener('click', async () => {
        try {
            await refreshPrinters();
        } catch (error) {
            applyNoLocalPrinterState(error.message || '');
            alert(error.message);
        }
    });

    select?.addEventListener('change', async () => {
        try {
            await refreshPrinters();
        } catch (error) {
            applyNoLocalPrinterState(error.message || '');
            alert(error.message);
        }
    });

    paperWidthSelect?.addEventListener('change', async () => {
        try {
            await refreshPrinters();
        } catch (error) {
            applyNoLocalPrinterState(error.message || '');
            alert(error.message);
        }
    });

    applyDefaultBtn?.addEventListener('click', async () => {
        try {
            const paperWidth = Number(paperWidthSelect?.value || currentSettings?.paper_width_mm || 58) >= 80 ? 80 : 58;
            const recommended = getRecommendedColumnsForPaper(paperWidth);
            if (columnsInput) columnsInput.value = String(recommended);
            await refreshPrinters();
        } catch (error) {
            applyNoLocalPrinterState(error.message || '');
            alert(error.message);
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const selectedPrinter = (select.value || '').trim();
        if (localPrinterList.length > 0 && !selectedPrinter) {
            alert('Selecciona una impresora antes de guardar.');
            return;
        }

        if (saveBtn) saveBtn.disabled = true;
        try {
            const latest = await fetchTicketSettings();
            const payload = {
                ...latest,
                printer_name: selectedPrinter || null,
                columns_width: clampColumns(
                    columnsInput.value || latest.columns_width || 30,
                    normalizeTicketPaperWidthMm(paperWidthSelect?.value || latest.paper_width_mm || 58, 58) === 58 ? 30 : 42,
                    paperWidthSelect?.value || latest.paper_width_mm || 58
                ),
                paper_width_mm: normalizeTicketPaperWidthMm(paperWidthSelect?.value || latest.paper_width_mm || 58, 58),
                print_engine: String(printEngineSelect?.value || latest.print_engine || 'auto'),
                feed_lines_after_print: clampFeedLines(feedLinesInput?.value || latest.feed_lines_after_print || 2, 2),
            };
            const profile = getPreviewPrintProfile(payload.printer_name, payload.columns_width, payload.paper_width_mm);
            payload.columns_width = profile.columns;
            await saveTicketSettings(payload);
            closePopupWindow();
        } catch (error) {
            if (saveBtn) saveBtn.disabled = false;
            alert(error.message);
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await initTicketForm();
    await initPrinterForm();
});

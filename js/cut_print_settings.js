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

const CUT_PRINT_LABEL_DEFAULTS = Object.freeze({
    title_cut: 'CORTE DE TURNO',
    title_cash_box: 'DINERO EN CAJA',
    title_entries: 'ENTRADAS EFECTIVO',
    title_exits: 'SALIDAS EFECTIVO',
    title_sales: 'VENTAS',
    title_departments: 'VENTAS POR DEPTO',
    title_report_footer: 'REPORTE DE CORTE',
    label_shift_prefix: 'TURNO #',
    label_generated_at: 'Realizado',
    label_cashier: 'Cajero',
    label_box: 'Caja',
    label_schedule: 'Horario',
    label_sales_total: 'Ventas totales',
    label_sales_count_suffix: 'venta(s) en el turno',
    label_base_fund: 'Fondo de caja',
    label_cash_sales: 'Ventas en efectivo',
    label_cash_payments: 'Abonos en efectivo',
    label_cash_entries: 'Entradas',
    label_cash_exits: 'Salidas',
    label_cash_in_box: 'Efectivo en caja',
    label_total_entries: 'Total entradas',
    label_total_exits: 'Total salidas',
    label_detail_title: 'Detalle y suma por item',
    label_no_entries: 'SIN ENTRADAS DETALLADAS',
    label_no_exits: 'SIN SALIDAS DETALLADAS',
    label_hidden_detail: 'DETALLE OCULTO POR CONFIGURACION',
    label_items_summary_suffix: 'item(s) resumidos',
    label_returns: 'Devoluciones',
    label_total_sales_line: 'Total ventas',
    label_no_departments: 'SIN VENTAS POR DEPARTAMENTO',
    label_no_department_name: 'SIN DEPARTAMENTO',
    label_report_no_items: 'REPORTE CONFIGURADO SIN ITEMS',
});

const CUT_STYLE_SIZE_MIN = 0.8;
const CUT_STYLE_SIZE_MAX = 1.8;
const CUT_PREVIEW_BASE_FONT_PX_FALLBACK = 12;

function clampCutStyleSize(value, fallback = 1) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(CUT_STYLE_SIZE_MIN, Math.min(CUT_STYLE_SIZE_MAX, Number(parsed.toFixed(2))));
}

function getDefaultStyleMap() {
    const map = {};
    Object.keys(CUT_PRINT_LABEL_DEFAULTS).forEach((key) => {
        map[key] = { mode: 'normal', size: 1 };
    });
    return map;
}

function withAuthHeaders(headers = {}) {
    const token = localStorage.getItem('token');
    if (token) {
        return { ...headers, Authorization: `Bearer ${token}` };
    }
    return headers;
}

function getCurrentCajaId() {
    const raw = String(localStorage.getItem('n_caja') || localStorage.getItem('caja') || '').trim();
    return /^\d+$/.test(raw) ? raw : '';
}

function closePopupWindow() {
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'close-app-popup' }, '*');
        return;
    }
    window.close();
}

function asApiError(error, fallbackMessage) {
    const message = String(error?.message || '').trim();
    if (!message || message.toLowerCase() === 'failed to fetch') {
        return new Error('No se pudo conectar con la API local (puerto 3002).');
    }
    return new Error(message || fallbackMessage);
}

async function printCutFormatTest(payload) {
    try {
        const response = await fetch(API_URL + 'api/print/cut-format-test', {
            method: 'POST',
            headers: withAuthHeaders({
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify(payload || {}),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.message || 'No se pudo imprimir formato de corte de prueba');
        }
        return data;
    } catch (error) {
        throw asApiError(error, 'No se pudo imprimir formato de corte de prueba');
    }
}

async function fetchCutSettings() {
    try {
        const response = await fetch(API_URL + 'api/cut-settings', {
            headers: withAuthHeaders(),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.message || 'No se pudo cargar configuracion de corte');
        }
        return data;
    } catch (error) {
        throw asApiError(error, 'No se pudo cargar configuracion de corte');
    }
}

async function saveCutSettings(payload) {
    try {
        const response = await fetch(API_URL + 'api/cut-settings', {
            method: 'PUT',
            headers: withAuthHeaders({
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify(payload || {}),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.message || 'No se pudo guardar configuracion de corte');
        }
        return data;
    } catch (error) {
        throw asApiError(error, 'No se pudo guardar configuracion de corte');
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeCutPrintLabels(raw = {}) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    Object.keys(CUT_PRINT_LABEL_DEFAULTS).forEach((key) => {
        const fallback = CUT_PRINT_LABEL_DEFAULTS[key];
        const value = String(source[key] ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
        out[key] = value || fallback;
    });
    return out;
}

function normalizeCutPrintStyles(raw = {}) {
    const defaults = getDefaultStyleMap();
    const source = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    Object.keys(defaults).forEach((key) => {
        const current = source[key] && typeof source[key] === 'object' ? source[key] : {};
        const modeRaw = String(current.mode || '').trim().toLowerCase();
        const mode = modeRaw === 'bold' || modeRaw === 'italic' ? modeRaw : 'normal';
        const size = clampCutStyleSize(current.size, 1);
        out[key] = { mode, size };
    });
    return out;
}

function normalizeCutSettings(raw = {}) {
    const toFlag = (value, fallback = true) => {
        if (value === 0 || value === '0' || value === false) return 0;
        if (value === 1 || value === '1' || value === true) return 1;
        return fallback ? 1 : 0;
    };
    return {
        mode: String(raw.mode || '').trim().toLowerCase() === 'sin_ajuste' ? 'sin_ajuste' : 'ajuste_auto',
        show_business_info: toFlag(raw.show_business_info, true),
        show_shift_info: toFlag(raw.show_shift_info, true),
        show_sales_overview: toFlag(raw.show_sales_overview, true),
        show_cash_summary: toFlag(raw.show_cash_summary, true),
        show_entries_section: toFlag(raw.show_entries_section, true),
        show_entries_detail: toFlag(raw.show_entries_detail, true),
        show_exits_section: toFlag(raw.show_exits_section, true),
        show_exits_detail: toFlag(raw.show_exits_detail, true),
        show_sales_methods: toFlag(raw.show_sales_methods, true),
        show_department_totals: toFlag(raw.show_department_totals, true),
        show_footer: toFlag(raw.show_footer, true),
        print_labels: normalizeCutPrintLabels(raw.print_labels || {}),
        print_styles: normalizeCutPrintStyles(raw.print_styles || {}),
    };
}

function setChecked(id, value) {
    const el = document.getElementById(id);
    if (el) el.checked = Boolean(value);
}

function getChecked(id, fallback = false) {
    const el = document.getElementById(id);
    if (!el) return Boolean(fallback);
    return Boolean(el.checked);
}

function applyDetailDependencies() {
    const showEntries = getChecked('cut-format-show-entries', true);
    const showEntriesDetail = document.getElementById('cut-format-show-entries-detail');
    if (showEntriesDetail) {
        showEntriesDetail.disabled = !showEntries;
        if (!showEntries) showEntriesDetail.checked = false;
    }

    const showExits = getChecked('cut-format-show-exits', true);
    const showExitsDetail = document.getElementById('cut-format-show-exits-detail');
    if (showExitsDetail) {
        showExitsDetail.disabled = !showExits;
        if (!showExits) showExitsDetail.checked = false;
    }
}

function fillForm(settings) {
    setChecked('cut-format-show-business', settings.show_business_info);
    setChecked('cut-format-show-shift', settings.show_shift_info);
    setChecked('cut-format-show-sales-overview', settings.show_sales_overview);
    setChecked('cut-format-show-cash-summary', settings.show_cash_summary);
    setChecked('cut-format-show-entries', settings.show_entries_section);
    setChecked('cut-format-show-entries-detail', settings.show_entries_detail);
    setChecked('cut-format-show-exits', settings.show_exits_section);
    setChecked('cut-format-show-exits-detail', settings.show_exits_detail);
    setChecked('cut-format-show-sales-methods', settings.show_sales_methods);
    setChecked('cut-format-show-departments', settings.show_department_totals);
    setChecked('cut-format-show-footer', settings.show_footer);
    applyDetailDependencies();
}

function getFormSettings(base = {}) {
    const normalizedBase = normalizeCutSettings(base);
    const showEntriesSection = getChecked('cut-format-show-entries', normalizedBase.show_entries_section === 1);
    const showExitsSection = getChecked('cut-format-show-exits', normalizedBase.show_exits_section === 1);
    return {
        mode: normalizedBase.mode,
        show_business_info: getChecked('cut-format-show-business', normalizedBase.show_business_info === 1) ? 1 : 0,
        show_shift_info: getChecked('cut-format-show-shift', normalizedBase.show_shift_info === 1) ? 1 : 0,
        show_sales_overview: getChecked('cut-format-show-sales-overview', normalizedBase.show_sales_overview === 1) ? 1 : 0,
        show_cash_summary: getChecked('cut-format-show-cash-summary', normalizedBase.show_cash_summary === 1) ? 1 : 0,
        show_entries_section: showEntriesSection ? 1 : 0,
        show_entries_detail: showEntriesSection && getChecked('cut-format-show-entries-detail', normalizedBase.show_entries_detail === 1) ? 1 : 0,
        show_exits_section: showExitsSection ? 1 : 0,
        show_exits_detail: showExitsSection && getChecked('cut-format-show-exits-detail', normalizedBase.show_exits_detail === 1) ? 1 : 0,
        show_sales_methods: getChecked('cut-format-show-sales-methods', normalizedBase.show_sales_methods === 1) ? 1 : 0,
        show_department_totals: getChecked('cut-format-show-departments', normalizedBase.show_department_totals === 1) ? 1 : 0,
        show_footer: getChecked('cut-format-show-footer', normalizedBase.show_footer === 1) ? 1 : 0,
        print_labels: normalizeCutPrintLabels(normalizedBase.print_labels),
        print_styles: normalizeCutPrintStyles(normalizedBase.print_styles),
    };
}

function formatCLP(value) {
    const amount = Number(value || 0);
    return Math.round(amount).toLocaleString('es-CL');
}

function truncateLine(value = '', maxWidth = 42) {
    const width = Math.max(1, Number(maxWidth || 1));
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= width) return text;
    if (width <= 3) return text.slice(0, width);
    return `${text.slice(0, width - 3)}...`;
}

function styleToInlineCss(style) {
    const resolved = style && typeof style === 'object' ? style : { mode: 'normal', size: 1 };
    const mode = String(resolved.mode || 'normal').trim().toLowerCase();
    const size = clampCutStyleSize(resolved.size, 1);
    const weight = mode === 'bold' ? '700' : '400';
    const fontStyle = mode === 'italic' ? 'italic' : 'normal';
    return `font-weight:${weight};font-style:${fontStyle};font-size:${size.toFixed(2)}em;`;
}

function getPreviewBaseFontPx(previewEl) {
    if (!previewEl) return CUT_PREVIEW_BASE_FONT_PX_FALLBACK;
    const computed = window.getComputedStyle(previewEl);
    const parsed = Number.parseFloat(String(computed?.fontSize || ''));
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return CUT_PREVIEW_BASE_FONT_PX_FALLBACK;
    }
    return parsed;
}

function previewHasHorizontalOverflow(previewEl) {
    if (!previewEl) return false;
    if (previewEl.scrollWidth > (previewEl.clientWidth + 1)) return true;
    const lines = previewEl.querySelectorAll('.cut-preview-line');
    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (line.scrollWidth > (line.clientWidth + 1)) {
            return true;
        }
    }
    return false;
}

function applyGlobalSizeDeltaPxToAllStyles(currentSettings, previewEl, deltaPx) {
    const parsedDelta = Number(deltaPx);
    if (!Number.isFinite(parsedDelta) || Math.abs(parsedDelta) < 0.01) return false;
    const styles = normalizeCutPrintStyles(currentSettings?.print_styles || {});
    const baseFontPx = getPreviewBaseFontPx(previewEl);
    let changed = false;

    Object.keys(styles).forEach((key) => {
        const current = styles[key] || { mode: 'normal', size: 1 };
        const currentPx = clampCutStyleSize(current.size, 1) * baseFontPx;
        const nextPx = Math.max(baseFontPx * CUT_STYLE_SIZE_MIN, Math.min(baseFontPx * CUT_STYLE_SIZE_MAX, currentPx + parsedDelta));
        const nextSize = clampCutStyleSize(nextPx / baseFontPx, current.size);
        if (Math.abs(nextSize - Number(current.size || 1)) > 0.0001) {
            styles[key] = { mode: current.mode, size: nextSize };
            changed = true;
        }
    });

    if (changed) {
        currentSettings.print_styles = styles;
    }
    return changed;
}

function buildPreviewHtml(rawSettings = {}) {
    const settings = normalizeCutSettings(rawSettings);
    const labels = normalizeCutPrintLabels(settings.print_labels);
    const styles = normalizeCutPrintStyles(settings.print_styles);
    const columns = 42;
    const divider = '-'.repeat(columns);
    const money = (value) => `$${formatCLP(value)}`;

    const editable = (key, value) => {
        const styleAttr = styleToInlineCss(styles[key]);
        return `<span class="cut-preview-edit" contenteditable="plaintext-only" spellcheck="false" data-cut-label-key="${escapeHtml(key)}" style="${styleAttr}">${escapeHtml(value)}</span>`;
    };

    const leftLine = (leftHtml, rightHtml = '') => {
        const right = rightHtml ? `<span class="cut-preview-right">${rightHtml}</span>` : '';
        return `<div class="cut-preview-line"><span class="cut-preview-left">${leftHtml}</span>${right}</div>`;
    };

    const centerLine = (centerHtml) => `<div class="cut-preview-line center"><span class="cut-preview-left" style="text-align:center;">${centerHtml}</span></div>`;

    const shiftJoin = /[#:\-\s]$/.test(labels.label_shift_prefix) ? '' : ' ';
    const lines = [];

    if (settings.show_business_info) {
        lines.push(centerLine('MINIMARKET'));
        lines.push(centerLine('ALIMENTOS Y BEBIDAS'));
    }

    lines.push(centerLine(editable('title_cut', labels.title_cut)));
    if (settings.show_shift_info) {
        lines.push(centerLine(`${editable('label_shift_prefix', labels.label_shift_prefix)}${shiftJoin}125`));
    }
    lines.push(leftLine(escapeHtml(divider)));

    if (settings.show_shift_info) {
        lines.push(leftLine(`${editable('label_generated_at', labels.label_generated_at)}: 25/03/2026 21:40`));
        lines.push(leftLine(`${editable('label_cashier', labels.label_cashier)}: CAJERO`));
        lines.push(leftLine(`${editable('label_box', labels.label_box)}: 1`));
        lines.push(leftLine(`${editable('label_schedule', labels.label_schedule)}: 08:00 - 21:40`));
        lines.push(leftLine(escapeHtml(divider)));
    }

    if (settings.show_sales_overview) {
        lines.push(leftLine(editable('label_sales_total', labels.label_sales_total), escapeHtml(money(41400))));
        lines.push(leftLine(`24 ${editable('label_sales_count_suffix', labels.label_sales_count_suffix)}`));
        lines.push(leftLine(escapeHtml(divider)));
    }

    if (settings.show_cash_summary) {
        lines.push(centerLine(editable('title_cash_box', labels.title_cash_box)));
        lines.push(leftLine(editable('label_base_fund', labels.label_base_fund), escapeHtml(money(10000))));
        lines.push(leftLine(editable('label_cash_sales', labels.label_cash_sales), escapeHtml(money(28500))));
        lines.push(leftLine(editable('label_cash_payments', labels.label_cash_payments), `+ ${escapeHtml(money(1200))}`));
        lines.push(leftLine(editable('label_cash_entries', labels.label_cash_entries), `+ ${escapeHtml(money(3700))}`));
        lines.push(leftLine(editable('label_cash_exits', labels.label_cash_exits), `- ${escapeHtml(money(2500))}`));
        lines.push(leftLine(escapeHtml(divider)));
        lines.push(leftLine(editable('label_cash_in_box', labels.label_cash_in_box), escapeHtml(money(40900))));
        lines.push(leftLine(escapeHtml(divider)));
    }

    if (settings.show_entries_section) {
        lines.push(centerLine(editable('title_entries', labels.title_entries)));
        lines.push(leftLine(editable('label_total_entries', labels.label_total_entries), escapeHtml(money(3700))));
        if (!settings.show_entries_detail) {
            lines.push(leftLine(editable('label_hidden_detail', labels.label_hidden_detail)));
            lines.push(leftLine(`2 ${editable('label_items_summary_suffix', labels.label_items_summary_suffix)}`));
        } else {
            lines.push(leftLine(editable('label_detail_title', labels.label_detail_title)));
            lines.push(leftLine(escapeHtml(truncateLine('FONDO EXTRA CAJA', columns - 10)), escapeHtml(money(2500))));
            lines.push(leftLine(escapeHtml(truncateLine('ABONO CLIENTE RUTA', columns - 10)), escapeHtml(money(1200))));
        }
        lines.push(leftLine(escapeHtml(divider)));
    }

    if (settings.show_exits_section) {
        lines.push(centerLine(editable('title_exits', labels.title_exits)));
        lines.push(leftLine(editable('label_total_exits', labels.label_total_exits), escapeHtml(money(2500))));
        if (!settings.show_exits_detail) {
            lines.push(leftLine(editable('label_hidden_detail', labels.label_hidden_detail)));
            lines.push(leftLine(`2 ${editable('label_items_summary_suffix', labels.label_items_summary_suffix)}`));
        } else {
            lines.push(leftLine(editable('label_detail_title', labels.label_detail_title)));
            lines.push(leftLine(escapeHtml(truncateLine('COMPRA RAPIDA INSUMOS', columns - 10)), escapeHtml(money(1600))));
            lines.push(leftLine(escapeHtml(truncateLine('PAGO MENSAJERIA', columns - 10)), escapeHtml(money(900))));
        }
        lines.push(leftLine(escapeHtml(divider)));
    }

    if (settings.show_sales_methods || settings.show_sales_overview) {
        lines.push(centerLine(editable('title_sales', labels.title_sales)));
        if (settings.show_sales_methods) {
            lines.push(leftLine('EN EFECTIVO', escapeHtml(money(28500))));
            lines.push(leftLine('CON TARJETA', escapeHtml(money(12900))));
        }
        if (settings.show_sales_overview) {
            if (settings.show_sales_methods) lines.push(leftLine(escapeHtml(divider)));
            lines.push(leftLine(editable('label_returns', labels.label_returns), `- ${escapeHtml(money(600))}`));
            lines.push(leftLine(editable('label_total_sales_line', labels.label_total_sales_line), escapeHtml(money(41400))));
        }
        lines.push(leftLine(escapeHtml(divider)));
    }

    if (settings.show_department_totals) {
        lines.push(centerLine(editable('title_departments', labels.title_departments)));
        lines.push(leftLine('ABARROTES', escapeHtml(money(18600))));
        lines.push(leftLine('BEBIDAS', escapeHtml(money(9100))));
        lines.push(leftLine('LACTEOS', escapeHtml(money(13700))));
        lines.push(leftLine(escapeHtml(divider)));
    }

    if (settings.show_footer) {
        lines.push(leftLine('Gracias por usar minimarket'));
        lines.push(leftLine(escapeHtml(divider)));
    }

    if (!settings.show_footer && !settings.show_business_info && !settings.show_shift_info && !settings.show_sales_overview && !settings.show_cash_summary && !settings.show_entries_section && !settings.show_exits_section && !settings.show_sales_methods && !settings.show_department_totals) {
        lines.push(leftLine(editable('label_report_no_items', labels.label_report_no_items)));
        lines.push(leftLine(escapeHtml(divider)));
    }

    lines.push(centerLine(editable('title_report_footer', labels.title_report_footer)));
    return lines.join('');
}

function sanitizeEditableLabelText(value, key) {
    const fallback = CUT_PRINT_LABEL_DEFAULTS[key] || '';
    const cleaned = String(value || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    return cleaned || fallback;
}

function syncLabelsFromPreview(previewEl, settings) {
    if (!previewEl || !settings) return;
    const base = normalizeCutPrintLabels(settings.print_labels || {});
    previewEl.querySelectorAll('[data-cut-label-key]').forEach((node) => {
        const key = String(node.getAttribute('data-cut-label-key') || '').trim();
        if (!key || !(key in base)) return;
        base[key] = sanitizeEditableLabelText(node.textContent || '', key);
    });
    settings.print_labels = normalizeCutPrintLabels(base);
}

function clearActiveEditableSelection(previewEl) {
    if (!previewEl) return;
    previewEl.querySelectorAll('.cut-preview-edit.active-target').forEach((node) => {
        node.classList.remove('active-target');
    });
}

function resolveEditableFromSelection(previewEl) {
    const selection = window.getSelection ? window.getSelection() : null;
    if (!selection || !selection.anchorNode) return null;
    let node = selection.anchorNode;
    if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentElement;
    }
    if (!(node instanceof Element)) return null;
    const editable = node.closest('.cut-preview-edit[data-cut-label-key]');
    if (!editable) return null;
    if (!previewEl.contains(editable)) return null;
    return editable;
}

function applyToolbarState(currentSettings, activeKey) {
    const normalBtn = document.getElementById('cut-style-normal-btn');
    const boldBtn = document.getElementById('cut-style-bold-btn');
    const italicBtn = document.getElementById('cut-style-italic-btn');
    const sizeInput = document.getElementById('cut-style-size-input');
    if (!normalBtn || !boldBtn || !italicBtn || !sizeInput) return;

    const styles = normalizeCutPrintStyles(currentSettings.print_styles || {});
    const style = styles[activeKey] || { mode: 'normal', size: 1 };

    normalBtn.classList.toggle('active', style.mode === 'normal');
    boldBtn.classList.toggle('active', style.mode === 'bold');
    italicBtn.classList.toggle('active', style.mode === 'italic');
    sizeInput.value = Number(style.size || 1).toFixed(1);
}

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('cut-format-settings-form');
    const previewEl = document.getElementById('cut-format-preview');
    const previewMeta = document.getElementById('cut-format-preview-meta');
    const enableAllBtn = document.getElementById('cut-format-enable-all-btn');
    const summaryBtn = document.getElementById('cut-format-summary-btn');
    const printBtn = document.getElementById('print-cut-format-btn');
    const saveBtn = document.getElementById('save-cut-format-btn');
    const normalBtn = document.getElementById('cut-style-normal-btn');
    const boldBtn = document.getElementById('cut-style-bold-btn');
    const italicBtn = document.getElementById('cut-style-italic-btn');
    const sizeInput = document.getElementById('cut-style-size-input');
    const globalMinusBtn = document.getElementById('cut-style-global-minus-btn');
    const globalPlusBtn = document.getElementById('cut-style-global-plus-btn');
    const globalStepInput = document.getElementById('cut-style-global-step-input');
    const globalApplyBtn = document.getElementById('cut-style-global-apply-btn');
    if (!form || !previewEl) return;

    let currentSettings = normalizeCutSettings({ print_styles: getDefaultStyleMap() });
    let activeEditableKey = '';

    const selectEditableByKey = (key) => {
        activeEditableKey = String(key || '').trim();
        clearActiveEditableSelection(previewEl);
        if (!activeEditableKey) {
            applyToolbarState(currentSettings, 'title_cut');
            return;
        }
        const escapedKey = (typeof CSS !== 'undefined' && typeof CSS.escape === 'function')
            ? CSS.escape(activeEditableKey)
            : activeEditableKey.replace(/([\"\\])/g, '\\$1');
        const node = previewEl.querySelector(`.cut-preview-edit[data-cut-label-key="${escapedKey}"]`);
        if (node) {
            node.classList.add('active-target');
            try {
                node.focus({ preventScroll: true });
            } catch (_) {
                // noop
            }
        }
        applyToolbarState(currentSettings, activeEditableKey);
    };

    const ensureActiveEditableFromSelection = () => {
        const selectedNode = resolveEditableFromSelection(previewEl);
        if (!selectedNode) return false;
        const key = String(selectedNode.getAttribute('data-cut-label-key') || '').trim();
        if (!key) return false;
        selectEditableByKey(key);
        return true;
    };

    const refreshPreview = () => {
        applyDetailDependencies();
        syncLabelsFromPreview(previewEl, currentSettings);
        const previewSettings = getFormSettings(currentSettings);
        previewSettings.print_labels = normalizeCutPrintLabels(currentSettings.print_labels);
        previewSettings.print_styles = normalizeCutPrintStyles(currentSettings.print_styles);
        previewEl.innerHTML = buildPreviewHtml(previewSettings);
        if (previewMeta) {
            previewMeta.textContent = 'Vista previa referencial. Selecciona un texto para aplicar negrita/normal/cursiva y tamano. Usa el ajuste global para subir o bajar todo sin salir del area imprimible.';
        }
        if (activeEditableKey) {
            selectEditableByKey(activeEditableKey);
        } else {
            applyToolbarState(currentSettings, 'title_cut');
        }
    };

    const setStyleModeForActive = (mode) => {
        if (!ensureActiveEditableFromSelection() && !activeEditableKey) {
            alert('Selecciona un texto editable del ticket para aplicar estilo.');
            return;
        }
        const targetKey = activeEditableKey;
        if (!targetKey) return;
        const previousStyles = normalizeCutPrintStyles(currentSettings?.print_styles || {});
        const styles = normalizeCutPrintStyles(currentSettings.print_styles || {});
        const current = styles[targetKey] || { mode: 'normal', size: 1 };
        const normalizedMode = mode === 'bold' || mode === 'italic' ? mode : 'normal';
        styles[targetKey] = { mode: normalizedMode, size: current.size };
        currentSettings.print_styles = styles;
        refreshPreview();
        if (previewHasHorizontalOverflow(previewEl)) {
            currentSettings.print_styles = previousStyles;
            refreshPreview();
            if (previewMeta) {
                previewMeta.textContent = 'Cambio cancelado para evitar que el texto se salga del area imprimible.';
            }
        }
    };

    const setStyleSizeForActive = (sizeValue) => {
        if (!ensureActiveEditableFromSelection() && !activeEditableKey) {
            alert('Selecciona un texto editable del ticket para cambiar tamaño.');
            return;
        }
        const size = clampCutStyleSize(sizeValue, 1);
        const targetKey = activeEditableKey;
        if (!targetKey) return;
        const previousStyles = normalizeCutPrintStyles(currentSettings?.print_styles || {});
        const styles = normalizeCutPrintStyles(currentSettings.print_styles || {});
        const current = styles[targetKey] || { mode: 'normal', size: 1 };
        styles[targetKey] = { mode: current.mode, size };
        currentSettings.print_styles = styles;
        refreshPreview();
        if (previewHasHorizontalOverflow(previewEl)) {
            currentSettings.print_styles = previousStyles;
            refreshPreview();
            if (previewMeta) {
                previewMeta.textContent = 'Cambio cancelado para evitar que el texto se salga del area imprimible.';
            }
        }
    };

    const parseGlobalStep = () => {
        const raw = Number(globalStepInput?.value);
        if (!Number.isFinite(raw)) return 2;
        const normalized = Math.max(-8, Math.min(8, Number(raw.toFixed(2))));
        if (Math.abs(normalized) < 0.01) return 0;
        return normalized;
    };

    const applyGlobalSizeDelta = (deltaPx) => {
        const previousStyles = normalizeCutPrintStyles(currentSettings?.print_styles || {});
        const changed = applyGlobalSizeDeltaPxToAllStyles(currentSettings, previewEl, deltaPx);
        if (!changed) {
            if (previewMeta) {
                previewMeta.textContent = 'No se aplicaron cambios: se alcanzo el limite para mantener texto dentro del area imprimible.';
            }
            return;
        }
        refreshPreview();
        if (previewHasHorizontalOverflow(previewEl)) {
            currentSettings.print_styles = previousStyles;
            refreshPreview();
            if (previewMeta) {
                previewMeta.textContent = 'El ajuste se cancelo porque el texto se salia del area imprimible.';
            }
        }
    };

    refreshPreview();

    try {
        currentSettings = normalizeCutSettings(await fetchCutSettings());
        fillForm(currentSettings);
    } catch (error) {
        if (previewMeta) {
            previewMeta.textContent = `${error.message || 'No se pudo cargar la configuracion.'} Mostrando una vista local de referencia.`;
        }
    } finally {
        refreshPreview();
    }

    previewEl.addEventListener('keydown', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (!target.classList.contains('cut-preview-edit')) return;
        if (event.key === 'Enter') {
            event.preventDefault();
            target.blur();
        }
    });

    previewEl.addEventListener('paste', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (!target.classList.contains('cut-preview-edit')) return;
        event.preventDefault();
        const text = (event.clipboardData || window.clipboardData)?.getData('text') || '';
        const clean = text.replace(/\s+/g, ' ').trim();
        document.execCommand('insertText', false, clean);
    });

    previewEl.addEventListener('focusin', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (!target.classList.contains('cut-preview-edit')) return;
        const key = String(target.getAttribute('data-cut-label-key') || '').trim();
        if (!key) return;
        selectEditableByKey(key);
    });

    previewEl.addEventListener('click', () => {
        ensureActiveEditableFromSelection();
    });

    previewEl.addEventListener('input', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (!target.classList.contains('cut-preview-edit')) return;
        const key = String(target.getAttribute('data-cut-label-key') || '').trim();
        if (!key) return;
        const sanitized = sanitizeEditableLabelText(target.textContent || '', key);
        if (target.textContent !== sanitized) {
            target.textContent = sanitized;
        }
        currentSettings.print_labels[key] = sanitized;
        activeEditableKey = key;
    });

    previewEl.addEventListener('blur', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (!target.classList.contains('cut-preview-edit')) return;
        const key = String(target.getAttribute('data-cut-label-key') || '').trim();
        if (!key) return;
        const sanitized = sanitizeEditableLabelText(target.textContent || '', key);
        target.textContent = sanitized;
        currentSettings.print_labels[key] = sanitized;
        activeEditableKey = key;
    }, true);

    [
        'cut-format-show-business',
        'cut-format-show-shift',
        'cut-format-show-sales-overview',
        'cut-format-show-cash-summary',
        'cut-format-show-entries',
        'cut-format-show-entries-detail',
        'cut-format-show-exits',
        'cut-format-show-exits-detail',
        'cut-format-show-sales-methods',
        'cut-format-show-departments',
        'cut-format-show-footer',
    ].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', refreshPreview);
        el.addEventListener('input', refreshPreview);
    });

    normalBtn?.addEventListener('click', () => setStyleModeForActive('normal'));
    boldBtn?.addEventListener('click', () => setStyleModeForActive('bold'));
    italicBtn?.addEventListener('click', () => setStyleModeForActive('italic'));

    sizeInput?.addEventListener('change', () => {
        setStyleSizeForActive(sizeInput.value);
    });

    globalPlusBtn?.addEventListener('click', () => {
        const step = parseGlobalStep();
        if (!Number.isFinite(step) || step <= 0) {
            if (globalStepInput) globalStepInput.value = '2';
            applyGlobalSizeDelta(2);
            return;
        }
        applyGlobalSizeDelta(step);
    });

    globalMinusBtn?.addEventListener('click', () => {
        const step = parseGlobalStep();
        if (!Number.isFinite(step) || step <= 0) {
            if (globalStepInput) globalStepInput.value = '2';
            applyGlobalSizeDelta(-2);
            return;
        }
        applyGlobalSizeDelta(-step);
    });

    globalApplyBtn?.addEventListener('click', () => {
        let delta = parseGlobalStep();
        if (!Number.isFinite(delta) || Math.abs(delta) < 0.01) {
            delta = 2;
            if (globalStepInput) globalStepInput.value = '2';
        }
        applyGlobalSizeDelta(delta);
    });

    enableAllBtn?.addEventListener('click', () => {
        fillForm(normalizeCutSettings({
            ...currentSettings,
            show_business_info: 1,
            show_shift_info: 1,
            show_sales_overview: 1,
            show_cash_summary: 1,
            show_entries_section: 1,
            show_entries_detail: 1,
            show_exits_section: 1,
            show_exits_detail: 1,
            show_sales_methods: 1,
            show_department_totals: 1,
            show_footer: 1,
        }));
        refreshPreview();
    });

    summaryBtn?.addEventListener('click', () => {
        fillForm(normalizeCutSettings({
            ...currentSettings,
            show_business_info: 1,
            show_shift_info: 1,
            show_sales_overview: 1,
            show_cash_summary: 1,
            show_entries_section: 0,
            show_entries_detail: 0,
            show_exits_section: 0,
            show_exits_detail: 0,
            show_sales_methods: 1,
            show_department_totals: 0,
            show_footer: 1,
        }));
        refreshPreview();
    });

    printBtn?.addEventListener('click', async () => {
        try {
            printBtn.disabled = true;
            syncLabelsFromPreview(previewEl, currentSettings);
            const payloadSettings = getFormSettings(currentSettings);
            payloadSettings.mode = currentSettings.mode;
            payloadSettings.print_labels = normalizeCutPrintLabels(currentSettings.print_labels);
            payloadSettings.print_styles = normalizeCutPrintStyles(currentSettings.print_styles);
            const requestPayload = {
                cut_settings: payloadSettings,
            };
            const caja = getCurrentCajaId();
            if (caja) {
                requestPayload.numero_caja = Number(caja);
            }
            const data = await printCutFormatTest(requestPayload);
            alert(data.message || 'Formato de corte de prueba enviado a impresion.');
        } catch (error) {
            alert(error.message || 'No se pudo imprimir formato de corte de prueba.');
        } finally {
            printBtn.disabled = false;
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!saveBtn) return;
        saveBtn.disabled = true;
        try {
            syncLabelsFromPreview(previewEl, currentSettings);
            const payload = getFormSettings(currentSettings);
            payload.mode = currentSettings.mode;
            payload.print_labels = normalizeCutPrintLabels(currentSettings.print_labels);
            payload.print_styles = normalizeCutPrintStyles(currentSettings.print_styles);
            const saved = await saveCutSettings(payload);
            currentSettings = normalizeCutSettings(saved);
            fillForm(currentSettings);
            refreshPreview();
            closePopupWindow();
        } catch (error) {
            alert(error.message || 'No se pudo guardar la configuracion.');
        } finally {
            saveBtn.disabled = false;
        }
    });
});

const API_URL = (() => {
    const override = window.localStorage.getItem('api_url');
    if (override) return override.endsWith('/') ? override : `${override}/`;
    if (window.location.port === '3002') return `${window.location.origin}/`;
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    const protocol = isLocalHost ? 'http:' : window.location.protocol;
    return `${protocol}//${window.location.hostname}:3002/`;
})();

function withAuthHeaders(headers = {}) {
    const token = localStorage.getItem('token');
    return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

async function fetchTaxSettings() {
    const response = await fetch(API_URL + 'api/tax-settings', { headers: withAuthHeaders() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudo cargar configuracion de impuestos');
    return data;
}

async function saveTaxSettings(payload) {
    const response = await fetch(API_URL + 'api/tax-settings', {
        method: 'PUT',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudo guardar configuracion de impuestos');
    return data;
}

function getFormPayload() {
    return {
        tax_enabled: Boolean(document.getElementById('tax-enabled')?.checked),
        tax_name: String(document.getElementById('tax-name')?.value || 'IVA').trim(),
        tax_percent: Number(document.getElementById('tax-percent')?.value || 19),
        prices_include_tax: String(document.getElementById('prices-include-tax')?.value || '1') === '1',
    };
}

function normalizePayload(payload) {
    return {
        tax_enabled: Boolean(payload.tax_enabled),
        tax_name: String(payload.tax_name || 'IVA').trim().slice(0, 32) || 'IVA',
        tax_percent: Number.isFinite(Number(payload.tax_percent)) ? Math.max(0, Math.min(100, Number(payload.tax_percent))) : 19,
        prices_include_tax: Boolean(payload.prices_include_tax),
    };
}

function fillForm(settings) {
    const enabledEl = document.getElementById('tax-enabled');
    const nameEl = document.getElementById('tax-name');
    const percentEl = document.getElementById('tax-percent');
    const includeEl = document.getElementById('prices-include-tax');
    if (enabledEl) enabledEl.checked = Boolean(Number(settings.tax_enabled)) || settings.tax_enabled === true;
    if (nameEl) nameEl.value = settings.tax_name || 'IVA';
    if (percentEl) percentEl.value = Number(settings.tax_percent ?? 19);
    if (includeEl) includeEl.value = (Boolean(Number(settings.prices_include_tax)) || settings.prices_include_tax === true) ? '1' : '0';
}

let initialSnapshot = '';

function updateSaveState() {
    const btn = document.getElementById('save-tax-settings-btn');
    if (!btn) return;
    const current = JSON.stringify(normalizePayload(getFormPayload()));
    btn.disabled = !initialSnapshot || current === initialSnapshot;
}

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('tax-settings-form');
    if (!form) return;

    try {
        const settings = await fetchTaxSettings();
        fillForm(settings);
        initialSnapshot = JSON.stringify(normalizePayload(getFormPayload()));
        updateSaveState();
    } catch (error) {
        alert(error.message || 'No se pudo cargar la configuracion de impuestos.');
    }

    form.addEventListener('input', updateSaveState);
    form.addEventListener('change', updateSaveState);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const btn = document.getElementById('save-tax-settings-btn');
        if (btn) btn.disabled = true;
        try {
            const payload = normalizePayload(getFormPayload());
            await saveTaxSettings(payload);
            initialSnapshot = JSON.stringify(payload);
            updateSaveState();
            alert('Configuracion de impuestos guardada.');
        } catch (error) {
            alert(error.message || 'No se pudo guardar la configuracion de impuestos.');
        } finally {
            updateSaveState();
        }
    });
});

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

async function fetchCurrencySettings() {
    const response = await fetch(API_URL + 'api/currency-settings', { headers: withAuthHeaders() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudo cargar configuracion de moneda');
    return data;
}

async function saveCurrencySettings(payload) {
    const response = await fetch(API_URL + 'api/currency-settings', {
        method: 'PUT',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudo guardar configuracion de moneda');
    return data;
}

function getFormPayload() {
    return {
        currency_symbol: (document.getElementById('currency-symbol')?.value || '$').trim(),
        currency_code: (document.getElementById('currency-code')?.value || 'CLP').trim().toUpperCase(),
        thousands_separator: (document.getElementById('thousands-separator')?.value || '.').trim(),
        decimal_separator: (document.getElementById('decimal-separator')?.value || ',').trim(),
        decimals: Number.parseInt(document.getElementById('currency-decimals')?.value || '0', 10),
    };
}

function fillForm(settings) {
    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value ?? '';
    };
    setValue('currency-symbol', settings.currency_symbol || '$');
    setValue('currency-code', settings.currency_code || 'CLP');
    setValue('thousands-separator', settings.thousands_separator || '.');
    setValue('decimal-separator', settings.decimal_separator || ',');
    setValue('currency-decimals', String(Number(settings.decimals ?? 0)));
}

function normalizePayload(payload) {
    return {
        currency_symbol: String(payload.currency_symbol || '$').slice(0, 4),
        currency_code: String(payload.currency_code || 'CLP').slice(0, 8),
        thousands_separator: String(payload.thousands_separator || '.').slice(0, 1),
        decimal_separator: String(payload.decimal_separator || ',').slice(0, 1),
        decimals: Number.isInteger(payload.decimals) ? payload.decimals : 0,
    };
}

let initialSnapshot = '';

function updateSaveState() {
    const btn = document.getElementById('save-currency-settings-btn');
    if (!btn) return;
    const current = JSON.stringify(normalizePayload(getFormPayload()));
    btn.disabled = !initialSnapshot || current === initialSnapshot;
}

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('currency-settings-form');
    if (!form) return;

    try {
        const settings = await fetchCurrencySettings();
        fillForm(settings);
        initialSnapshot = JSON.stringify(normalizePayload(getFormPayload()));
        updateSaveState();
    } catch (error) {
        alert(error.message || 'No se pudo cargar la configuracion de moneda.');
    }

    form.addEventListener('input', updateSaveState);
    form.addEventListener('change', updateSaveState);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const btn = document.getElementById('save-currency-settings-btn');
        if (btn) btn.disabled = true;
        try {
            const payload = normalizePayload(getFormPayload());
            await saveCurrencySettings(payload);
            initialSnapshot = JSON.stringify(payload);
            updateSaveState();
            alert('Configuracion de moneda guardada.');
        } catch (error) {
            alert(error.message || 'No se pudo guardar la configuracion de moneda.');
        } finally {
            updateSaveState();
        }
    });
});

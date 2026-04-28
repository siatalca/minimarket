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

async function fetchUnitSettings() {
    const response = await fetch(API_URL + 'api/unit-settings', { headers: withAuthHeaders() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudo cargar configuracion de unidades');
    return data;
}

async function saveUnitSettings(payload) {
    const response = await fetch(API_URL + 'api/unit-settings', {
        method: 'PUT',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudo guardar configuracion de unidades');
    return data;
}

function getBool(id) {
    return Boolean(document.getElementById(id)?.checked);
}

function getFormPayload() {
    return {
        enable_time: getBool('unit-time'),
        enable_weight: getBool('unit-weight'),
        enable_volume: getBool('unit-volume'),
        enable_length: getBool('unit-length'),
        enable_not_applicable: getBool('unit-na'),
        enable_piece: getBool('unit-piece'),
        default_unit: String(document.getElementById('unit-default')?.value || 'PZA'),
    };
}

function fillForm(settings) {
    const setChecked = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.checked = Boolean(Number(value)) || value === true;
    };
    setChecked('unit-time', settings.enable_time);
    setChecked('unit-weight', settings.enable_weight);
    setChecked('unit-volume', settings.enable_volume);
    setChecked('unit-length', settings.enable_length);
    setChecked('unit-na', settings.enable_not_applicable);
    setChecked('unit-piece', settings.enable_piece);
    const defaultEl = document.getElementById('unit-default');
    if (defaultEl) defaultEl.value = String(settings.default_unit || 'PZA');
}

function normalizePayload(payload) {
    const allowedDefault = new Set(['H_MIN', 'KG_G', 'L_ML', 'M_CM', 'NO_APLICA', 'PZA']);
    const defaultUnit = allowedDefault.has(payload.default_unit) ? payload.default_unit : 'PZA';
    return {
        enable_time: Boolean(payload.enable_time),
        enable_weight: Boolean(payload.enable_weight),
        enable_volume: Boolean(payload.enable_volume),
        enable_length: Boolean(payload.enable_length),
        enable_not_applicable: Boolean(payload.enable_not_applicable),
        enable_piece: Boolean(payload.enable_piece),
        default_unit: defaultUnit,
    };
}

let initialSnapshot = '';

function updateSaveState() {
    const btn = document.getElementById('save-unit-settings-btn');
    if (!btn) return;
    const current = JSON.stringify(normalizePayload(getFormPayload()));
    btn.disabled = !initialSnapshot || current === initialSnapshot;
}

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('unit-settings-form');
    if (!form) return;

    try {
        const settings = await fetchUnitSettings();
        fillForm(settings);
        initialSnapshot = JSON.stringify(normalizePayload(getFormPayload()));
        updateSaveState();
    } catch (error) {
        alert(error.message || 'No se pudo cargar la configuracion de unidades.');
    }

    form.addEventListener('input', updateSaveState);
    form.addEventListener('change', updateSaveState);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const btn = document.getElementById('save-unit-settings-btn');
        if (btn) btn.disabled = true;
        try {
            const payload = normalizePayload(getFormPayload());
            await saveUnitSettings(payload);
            initialSnapshot = JSON.stringify(payload);
            updateSaveState();
            alert('Configuracion de unidades guardada.');
        } catch (error) {
            alert(error.message || 'No se pudo guardar la configuracion de unidades.');
        } finally {
            updateSaveState();
        }
    });
});

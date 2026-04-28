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

function withAuthHeaders(headers = {}) {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (token) {
        return { ...headers, Authorization: `Bearer ${token}` };
    }
    return headers;
}

function setPopupTheme() {
    const saved = localStorage.getItem('theme');
    document.body.classList.toggle('dark', saved === 'dark');
}

function clampDigits(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed)) return 1;
    return Math.max(1, Math.min(8, parsed));
}

function normalizePrefix(value) {
    return String(value || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
}

function buildPreview(prefix, digits, number = 1) {
    const safePrefix = normalizePrefix(prefix);
    const safeDigits = clampDigits(digits);
    return `${safePrefix}${String(number).padStart(safeDigits, '0')}`;
}

async function fetchFolioSettings() {
    const response = await fetch(API_URL + 'api/folio-settings', {
        headers: withAuthHeaders(),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'No se pudo cargar configuracion de folio');
    }
    return data;
}

async function saveFolioSettings(payload) {
    const response = await fetch(API_URL + 'api/folio-settings', {
        method: 'PUT',
        headers: withAuthHeaders({
            'Content-Type': 'application/json',
        }),
        body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'No se pudo guardar configuracion de folio');
    }
    return data;
}

function setMessage(message, type = '') {
    const el = document.getElementById('folio-msg');
    if (!el) return;
    el.textContent = message || '';
    el.className = `folio-msg ${type}`.trim();
}

function refreshPreview() {
    const prefixInput = document.getElementById('folio-prefix');
    const digitsInput = document.getElementById('folio-digits');
    const preview = document.getElementById('folio-preview');
    if (!prefixInput || !digitsInput || !preview) return;

    const prefix = normalizePrefix(prefixInput.value);
    const digits = clampDigits(digitsInput.value);
    prefixInput.value = prefix;
    digitsInput.value = String(digits);
    preview.textContent = buildPreview(prefix, digits, 1);
}

document.addEventListener('DOMContentLoaded', async () => {
    setPopupTheme();

    const form = document.getElementById('folio-form');
    const prefixInput = document.getElementById('folio-prefix');
    const digitsInput = document.getElementById('folio-digits');

    if (!form || !prefixInput || !digitsInput) return;

    prefixInput.addEventListener('input', refreshPreview);
    digitsInput.addEventListener('input', refreshPreview);

    try {
        const settings = await fetchFolioSettings();
        prefixInput.value = normalizePrefix(settings.prefix || '');
        digitsInput.value = String(clampDigits(settings.digits || 1));
        refreshPreview();
    } catch (error) {
        setMessage(error.message || 'No se pudo cargar configuracion.', 'err');
        refreshPreview();
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const prefix = normalizePrefix(prefixInput.value);
        const digits = clampDigits(digitsInput.value);
        prefixInput.value = prefix;
        digitsInput.value = String(digits);

        if (!/^[A-Z]{0,2}$/.test(prefix)) {
            setMessage('Prefijo invalido. Maximo 2 letras.', 'err');
            return;
        }

        try {
            await saveFolioSettings({ prefix, digits });
            refreshPreview();
            setMessage('Formato de folio guardado correctamente.', 'ok');
        } catch (error) {
            setMessage(error.message || 'No se pudo guardar configuracion.', 'err');
        }
    });
});

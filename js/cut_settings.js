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

async function fetchCutSettings() {
    const response = await fetch(API_URL + 'api/cut-settings', {
        headers: withAuthHeaders(),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'No se pudo cargar configuracion de corte');
    }
    return data;
}

async function saveCutSettings(mode) {
    const response = await fetch(API_URL + 'api/cut-settings', {
        method: 'PUT',
        headers: withAuthHeaders({
            'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ mode }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'No se pudo guardar configuracion de corte');
    }
    return data;
}

function getSelectedMode() {
    const checked = document.querySelector('input[name="corte"]:checked');
    return checked?.value || 'ajuste_auto';
}

function setSelectedMode(mode) {
    const normalized = mode === 'sin_ajuste' ? 'sin_ajuste' : 'ajuste_auto';
    const target = document.querySelector(`input[name="corte"][value="${normalized}"]`);
    if (target) {
        target.checked = true;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const saveBtn = document.getElementById('save-cut-settings-btn');

    try {
        const settings = await fetchCutSettings();
        setSelectedMode(settings.mode);
    } catch (error) {
        alert(error.message || 'No se pudo cargar la configuracion.');
    }

    saveBtn?.addEventListener('click', async () => {
        saveBtn.disabled = true;
        try {
            const mode = getSelectedMode();
            await saveCutSettings(mode);
            closePopupWindow();
        } catch (error) {
            alert(error.message || 'No se pudo guardar la configuracion.');
        } finally {
            saveBtn.disabled = false;
        }
    });
});

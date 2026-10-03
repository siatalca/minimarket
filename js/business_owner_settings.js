const API_URL = window.MinimarketApi.resolveApiBase();

const BUSINESS_OWNER_FIELDS = {
    nombre: 'biz-nombre',
    tipo_local: 'biz-tipo',
    telefono: 'biz-telefono',
    mail: 'biz-mail',
    direccion: 'biz-direccion',
    dueno_nombre: 'owner-nombre',
    dueno_rut: 'owner-rut',
    dueno_telefono: 'owner-telefono',
    dueno_mail: 'owner-mail',
};
const REQUIRED_BUSINESS_FIELDS = ['nombre', 'tipo_local', 'telefono', 'mail'];

function withAuthHeaders(headers = {}) {
    const token = localStorage.getItem('token');
    return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

async function fetchBusinessOwnerSettings() {
    const response = await fetch(API_URL + 'api/business-owner-settings', { headers: withAuthHeaders() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudieron cargar los datos del negocio');
    return data;
}

async function saveBusinessOwnerSettings(payload) {
    const response = await fetch(API_URL + 'api/business-owner-settings', {
        method: 'PUT',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudieron guardar los datos del negocio');
    return data;
}

function getFormPayload() {
    const payload = {};
    Object.entries(BUSINESS_OWNER_FIELDS).forEach(([key, id]) => {
        payload[key] = String(document.getElementById(id)?.value || '').trim();
    });
    return payload;
}

function fillForm(data) {
    Object.entries(BUSINESS_OWNER_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (el) el.value = data[key] ?? '';
    });
}

let initialSnapshot = '';
let statusTimer = null;

function showStatus(text) {
    const status = document.getElementById('business-owner-status');
    if (!status) return;
    status.textContent = text;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { status.textContent = ''; }, 4000);
}

function updateSaveState() {
    const btn = document.getElementById('save-business-owner-btn');
    if (!btn) return;
    btn.disabled = !initialSnapshot || JSON.stringify(getFormPayload()) === initialSnapshot;
}

function setFormEnabled(enabled) {
    document.querySelectorAll('#business-owner-form input, #business-owner-form button').forEach((el) => {
        el.disabled = !enabled;
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('business-owner-form');
    if (!form) return;

    setFormEnabled(false);
    try {
        fillForm(await fetchBusinessOwnerSettings());
        setFormEnabled(true);
        initialSnapshot = JSON.stringify(getFormPayload());
        updateSaveState();
    } catch (error) {
        alert(error.message || 'No se pudieron cargar los datos del negocio.');
        return;
    }

    form.addEventListener('input', updateSaveState);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = getFormPayload();
        const missing = REQUIRED_BUSINESS_FIELDS.find((key) => !payload[key]);
        if (missing) {
            alert('Nombre, rubro, telefono y correo del negocio son obligatorios.');
            document.getElementById(BUSINESS_OWNER_FIELDS[missing])?.focus();
            return;
        }
        const btn = document.getElementById('save-business-owner-btn');
        if (btn) btn.disabled = true;
        try {
            await saveBusinessOwnerSettings(payload);
            // Recarga para mostrar el RUT con el formato normalizado del servidor.
            fillForm(await fetchBusinessOwnerSettings());
            initialSnapshot = JSON.stringify(getFormPayload());
            showStatus('Datos guardados.');
        } catch (error) {
            alert(error.message || 'No se pudieron guardar los datos del negocio.');
        } finally {
            updateSaveState();
        }
    });
});

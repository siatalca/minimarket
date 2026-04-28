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

async function fetchDrawerSettings() {
    const response = await fetch(API_URL + 'api/cash-drawer-settings', { headers: withAuthHeaders() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudo cargar configuracion de cajon');
    return data;
}

async function saveDrawerSettings(payload) {
    const response = await fetch(API_URL + 'api/cash-drawer-settings', {
        method: 'PUT',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudo guardar configuracion de cajon');
    return data;
}

async function testOpenDrawer() {
    const response = await fetch(API_URL + 'api/cash-drawer/open-test', {
        method: 'POST',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ test: true }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudo abrir cajon de prueba');
    return data;
}

async function fetchSerialPorts() {
    const response = await fetch(API_URL + 'api/serial-ports', { headers: withAuthHeaders() });
    const data = await response.json().catch(() => []);
    if (!response.ok) throw new Error('No se pudieron listar puertos seriales');
    return Array.isArray(data) ? data : [];
}

async function fetchPrinters() {
    const response = await fetch(API_URL + 'api/printers', { headers: withAuthHeaders() });
    const data = await response.json().catch(() => []);
    if (!response.ok) throw new Error(data.message || 'No se pudieron listar impresoras');
    return Array.isArray(data) ? data : [];
}

function setSelectOptions(selectEl, items, selectedValue = '', mapToLabel = (x) => x, mapToValue = (x) => x) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    if (!items.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Sin opciones disponibles';
        selectEl.appendChild(option);
        return;
    }
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = 'Selecciona opcion...';
    selectEl.appendChild(empty);
    items.forEach((item) => {
        const option = document.createElement('option');
        option.value = mapToValue(item);
        option.textContent = mapToLabel(item);
        selectEl.appendChild(option);
    });
    if (selectedValue) selectEl.value = selectedValue;
}

function getPayload() {
    return {
        drawer_enabled: document.getElementById('drawer-enabled')?.checked ?? false,
        drawer_connection: document.getElementById('drawer-connection')?.value || 'printer_usb',
        drawer_printer_name: document.getElementById('drawer-printer-name')?.value || '',
        drawer_serial_port: document.getElementById('drawer-serial-port')?.value || '',
        drawer_lpt_port: document.getElementById('drawer-lpt-port')?.value || 'LPT1',
        drawer_pulse_ms: Number.parseInt(document.getElementById('drawer-pulse-ms')?.value || '120', 10),
        drawer_open_on_cash: document.getElementById('drawer-open-on-cash')?.checked ?? true,
        drawer_open_on_mixed_cash: document.getElementById('drawer-open-on-mixed')?.checked ?? true,
    };
}

function normalizePayload(payload) {
    return {
        drawer_enabled: Boolean(payload.drawer_enabled),
        drawer_connection: ['printer_usb', 'serial', 'lpt'].includes(payload.drawer_connection) ? payload.drawer_connection : 'printer_usb',
        drawer_printer_name: String(payload.drawer_printer_name || ''),
        drawer_serial_port: String(payload.drawer_serial_port || ''),
        drawer_lpt_port: String(payload.drawer_lpt_port || 'LPT1').toUpperCase(),
        drawer_pulse_ms: Number(payload.drawer_pulse_ms || 120),
        drawer_open_on_cash: Boolean(payload.drawer_open_on_cash),
        drawer_open_on_mixed_cash: Boolean(payload.drawer_open_on_mixed_cash),
    };
}

function fillForm(settings) {
    const setValue = (id, value) => { const el = document.getElementById(id); if (el) el.value = value ?? ''; };
    const setChecked = (id, value) => { const el = document.getElementById(id); if (el) el.checked = Boolean(Number(value)) || value === true; };

    setChecked('drawer-enabled', settings.drawer_enabled);
    setValue('drawer-connection', settings.drawer_connection || 'printer_usb');
    setValue('drawer-printer-name', settings.drawer_printer_name || '');
    setValue('drawer-serial-port', settings.drawer_serial_port || '');
    setValue('drawer-lpt-port', settings.drawer_lpt_port || 'LPT1');
    setValue('drawer-pulse-ms', String(settings.drawer_pulse_ms ?? 120));
    setChecked('drawer-open-on-cash', settings.drawer_open_on_cash);
    setChecked('drawer-open-on-mixed', settings.drawer_open_on_mixed_cash);
}

function refreshConnectionGroups() {
    const connection = document.getElementById('drawer-connection')?.value || 'printer_usb';
    document.getElementById('drawer-printer-group')?.classList.toggle('hidden', connection !== 'printer_usb');
    document.getElementById('drawer-serial-group')?.classList.toggle('hidden', connection !== 'serial');
    document.getElementById('drawer-lpt-group')?.classList.toggle('hidden', connection !== 'lpt');
}

function showResult(text, ok = true) {
    const el = document.getElementById('drawer-test-result');
    if (!el) return;
    el.textContent = text;
    el.style.color = ok ? '#166534' : '#b91c1c';
}

let initialSnapshot = '';

function updateSaveState() {
    const btn = document.getElementById('save-drawer-settings-btn');
    if (!btn) return;
    const current = JSON.stringify(normalizePayload(getPayload()));
    btn.disabled = !initialSnapshot || current === initialSnapshot;
}

async function reloadDeviceLists(settings = {}) {
    try {
        const [printers, serialPorts] = await Promise.all([fetchPrinters(), fetchSerialPorts()]);
        setSelectOptions(
            document.getElementById('drawer-printer-name'),
            printers,
            String(settings.drawer_printer_name || ''),
            (item) => item.isDefault ? `${item.name} (Predeterminada)` : item.name,
            (item) => item.name
        );
        setSelectOptions(
            document.getElementById('drawer-serial-port'),
            serialPorts,
            String(settings.drawer_serial_port || '')
        );
    } catch (error) {
        showResult(error.message || 'No se pudieron cargar dispositivos.', false);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    let settings = {};
    try {
        settings = await fetchDrawerSettings();
        fillForm(settings);
    } catch (error) {
        alert(error.message || 'No se pudo cargar configuracion de cajon.');
    }

    await reloadDeviceLists(settings);
    refreshConnectionGroups();
    initialSnapshot = JSON.stringify(normalizePayload(getPayload()));
    updateSaveState();

    [
        'drawer-enabled', 'drawer-connection', 'drawer-printer-name', 'drawer-serial-port', 'drawer-lpt-port',
        'drawer-pulse-ms', 'drawer-open-on-cash', 'drawer-open-on-mixed'
    ].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => {
            if (id === 'drawer-connection') refreshConnectionGroups();
            updateSaveState();
        });
        el.addEventListener('change', () => {
            if (id === 'drawer-connection') refreshConnectionGroups();
            updateSaveState();
        });
    });

    document.getElementById('drawer-refresh-devices-btn')?.addEventListener('click', async () => {
        await reloadDeviceLists(getPayload());
        showResult('Dispositivos recargados.', true);
    });

    document.getElementById('save-drawer-settings-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('save-drawer-settings-btn');
        if (btn) btn.disabled = true;
        try {
            const payload = normalizePayload(getPayload());
            await saveDrawerSettings(payload);
            initialSnapshot = JSON.stringify(payload);
            updateSaveState();
            showResult('Configuracion de cajon guardada.', true);
        } catch (error) {
            alert(error.message || 'No se pudo guardar configuracion de cajon.');
        } finally {
            updateSaveState();
        }
    });

    document.getElementById('drawer-open-test-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('drawer-open-test-btn');
        if (btn) btn.disabled = true;
        try {
            const current = normalizePayload(getPayload());
            await saveDrawerSettings(current);
            initialSnapshot = JSON.stringify(current);
            updateSaveState();
            const result = await testOpenDrawer();
            showResult(result.message || 'Pulso de apertura enviado.', true);
        } catch (error) {
            showResult(error.message || 'No se pudo abrir cajon de prueba.', false);
        } finally {
            if (btn) btn.disabled = false;
        }
    });
});

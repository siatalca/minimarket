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

async function fetchScannerSettings() {
    const response = await fetch(API_URL + 'api/scanner-settings', { headers: withAuthHeaders() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudo cargar configuracion de lector');
    return data;
}

async function saveScannerSettings(payload) {
    const response = await fetch(API_URL + 'api/scanner-settings', {
        method: 'PUT',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudo guardar configuracion de lector');
    return data;
}

async function fetchSerialPorts() {
    const response = await fetch(API_URL + 'api/serial-ports', { headers: withAuthHeaders() });
    const data = await response.json().catch(() => []);
    if (!response.ok) throw new Error('No se pudieron listar puertos seriales');
    return Array.isArray(data) ? data : [];
}

function setSelectOptions(selectEl, items, selectedValue = '') {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    if (!items.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Sin puerto disponible';
        selectEl.appendChild(option);
        return;
    }
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = 'Selecciona puerto...';
    selectEl.appendChild(empty);

    items.forEach((item) => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        selectEl.appendChild(option);
    });
    if (selectedValue && items.includes(selectedValue)) {
        selectEl.value = selectedValue;
    }
}

function getPayload() {
    return {
        scanner_mode: document.getElementById('scanner-mode')?.value || 'keyboard',
        serial_port: document.getElementById('scanner-serial-port')?.value || '',
        baud_rate: Number.parseInt(document.getElementById('scanner-baud-rate')?.value || '9600', 10),
        data_bits: Number.parseInt(document.getElementById('scanner-data-bits')?.value || '8', 10),
        parity: document.getElementById('scanner-parity')?.value || 'none',
        stop_bits: document.getElementById('scanner-stop-bits')?.value || '1',
        flow_control: document.getElementById('scanner-flow-control')?.value || 'none',
        scanner_suffix: document.getElementById('scanner-suffix')?.value || 'enter',
        scanner_prefix_to_strip: (document.getElementById('scanner-prefix-strip')?.value || '').trim(),
        scanner_prefix_trim: document.getElementById('scanner-prefix-trim')?.checked ?? true,
        scanner_only_numeric: document.getElementById('scanner-only-numeric')?.checked ?? true,
        scanner_auto_focus: document.getElementById('scanner-auto-focus')?.checked ?? true,
        scanner_beep_on_scan: document.getElementById('scanner-beep-on-scan')?.checked ?? false,
    };
}

function normalizePayload(payload) {
    return {
        scanner_mode: payload.scanner_mode === 'serial' ? 'serial' : 'keyboard',
        serial_port: String(payload.serial_port || ''),
        baud_rate: Number(payload.baud_rate || 9600),
        data_bits: Number(payload.data_bits || 8),
        parity: String(payload.parity || 'none'),
        stop_bits: String(payload.stop_bits || '1'),
        flow_control: String(payload.flow_control || 'none'),
        scanner_suffix: String(payload.scanner_suffix || 'enter'),
        scanner_prefix_to_strip: String(payload.scanner_prefix_to_strip || '').slice(0, 16),
        scanner_prefix_trim: Boolean(payload.scanner_prefix_trim),
        scanner_only_numeric: Boolean(payload.scanner_only_numeric),
        scanner_auto_focus: Boolean(payload.scanner_auto_focus),
        scanner_beep_on_scan: Boolean(payload.scanner_beep_on_scan),
    };
}

function fillForm(settings) {
    const setValue = (id, value) => { const el = document.getElementById(id); if (el) el.value = value ?? ''; };
    const setChecked = (id, value) => { const el = document.getElementById(id); if (el) el.checked = Boolean(Number(value)) || value === true; };

    setValue('scanner-mode', settings.scanner_mode || 'keyboard');
    setValue('scanner-baud-rate', String(settings.baud_rate ?? 9600));
    setValue('scanner-data-bits', String(settings.data_bits ?? 8));
    setValue('scanner-parity', settings.parity || 'none');
    setValue('scanner-stop-bits', settings.stop_bits || '1');
    setValue('scanner-flow-control', settings.flow_control || 'none');
    setValue('scanner-suffix', settings.scanner_suffix || 'enter');
    setValue('scanner-prefix-strip', settings.scanner_prefix_to_strip || '');
    setChecked('scanner-prefix-trim', settings.scanner_prefix_trim);
    setChecked('scanner-only-numeric', settings.scanner_only_numeric);
    setChecked('scanner-auto-focus', settings.scanner_auto_focus);
    setChecked('scanner-beep-on-scan', settings.scanner_beep_on_scan);
}

function toggleSerialVisibility() {
    const mode = document.getElementById('scanner-mode')?.value || 'keyboard';
    const block = document.getElementById('scanner-serial-settings');
    if (!block) return;
    block.classList.toggle('hidden', mode !== 'serial');
}

let initialSnapshot = '';

function updateSaveState() {
    const btn = document.getElementById('save-scanner-settings-btn');
    if (!btn) return;
    const current = JSON.stringify(normalizePayload(getPayload()));
    btn.disabled = !initialSnapshot || current === initialSnapshot;
}

function showTestResult(text, ok = true) {
    const result = document.getElementById('scanner-test-result');
    if (!result) return;
    result.textContent = text;
    result.style.color = ok ? '#166534' : '#b91c1c';
}

async function loadSerialPorts(selectedPort = '') {
    try {
        const ports = await fetchSerialPorts();
        setSelectOptions(document.getElementById('scanner-serial-port'), ports, selectedPort);
    } catch {
        setSelectOptions(document.getElementById('scanner-serial-port'), [], '');
    }
}

const CAMERA_PLAN_STORAGE_KEY = 'scanner_camera_plan_v1';

function isLikelyMobileDevice() {
    const ua = String(navigator.userAgent || '').toLowerCase();
    return /android|iphone|ipad|ipod|mobile/i.test(ua);
}

function loadCameraPlan() {
    try {
        const raw = localStorage.getItem(CAMERA_PLAN_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return {
            camera_mobile_enabled: Boolean(parsed.camera_mobile_enabled),
            camera_preferred_facing: ['environment', 'user', 'auto'].includes(parsed.camera_preferred_facing) ? parsed.camera_preferred_facing : 'environment',
            camera_scan_trigger: ['auto', 'manual'].includes(parsed.camera_scan_trigger) ? parsed.camera_scan_trigger : 'auto',
        };
    } catch (_) {
        return null;
    }
}

function saveCameraPlan(plan) {
    localStorage.setItem(CAMERA_PLAN_STORAGE_KEY, JSON.stringify(plan));
}

function getCameraPlanPayload() {
    return {
        camera_mobile_enabled: document.getElementById('camera-mobile-enabled')?.checked ?? false,
        camera_preferred_facing: document.getElementById('camera-preferred-facing')?.value || 'environment',
        camera_scan_trigger: document.getElementById('camera-scan-trigger')?.value || 'auto',
    };
}

function fillCameraPlan(plan) {
    if (!plan) return;
    const enabledEl = document.getElementById('camera-mobile-enabled');
    const facingEl = document.getElementById('camera-preferred-facing');
    const triggerEl = document.getElementById('camera-scan-trigger');
    if (enabledEl) enabledEl.checked = Boolean(plan.camera_mobile_enabled);
    if (facingEl) facingEl.value = plan.camera_preferred_facing || 'environment';
    if (triggerEl) triggerEl.value = plan.camera_scan_trigger || 'auto';
}

function setCameraCapabilityStatus(text, ok = true) {
    const el = document.getElementById('camera-capability-status');
    if (!el) return;
    el.textContent = text;
    el.style.color = ok ? '#166534' : '#b91c1c';
}

function setCameraPermissionStatus(text, ok = true) {
    const el = document.getElementById('camera-permission-status');
    if (!el) return;
    el.textContent = text;
    el.style.color = ok ? '#166534' : '#b91c1c';
}

async function checkCameraPermissionStatus() {
    const hasMedia = Boolean(navigator.mediaDevices?.getUserMedia);
    const secure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const mobile = isLikelyMobileDevice();

    if (!hasMedia || !secure) {
        setCameraCapabilityStatus('Camara no disponible en este contexto (requiere HTTPS o localhost).', false);
        setCameraPermissionStatus('Permiso de camara: no aplicable.', false);
        return { supported: false, state: 'unsupported' };
    }

    setCameraCapabilityStatus(
        mobile
            ? 'Dispositivo movil detectado. Soporte de camara disponible para preparacion.'
            : 'Dispositivo no movil detectado. Se mantiene preparacion de camara para futuro.',
        true
    );

    if (!navigator.permissions?.query) {
        setCameraPermissionStatus('Permiso de camara: estado no disponible en este navegador.');
        return { supported: true, state: 'unknown' };
    }

    try {
        const status = await navigator.permissions.query({ name: 'camera' });
        const state = String(status.state || 'unknown');
        if (state === 'granted') {
            setCameraPermissionStatus('Permiso de camara: concedido.', true);
        } else if (state === 'denied') {
            setCameraPermissionStatus('Permiso de camara: denegado (revisar ajustes del navegador).', false);
        } else {
            setCameraPermissionStatus('Permiso de camara: pendiente de solicitud.');
        }
        return { supported: true, state };
    } catch (_) {
        setCameraPermissionStatus('Permiso de camara: no se pudo consultar estado.');
        return { supported: true, state: 'unknown' };
    }
}

async function requestCameraPermissionPreview() {
    const hasMedia = Boolean(navigator.mediaDevices?.getUserMedia);
    if (!hasMedia) {
        setCameraPermissionStatus('Este navegador no soporta solicitud de camara.', false);
        return;
    }
    const facing = document.getElementById('camera-preferred-facing')?.value || 'environment';
    const facingMode = facing === 'auto' ? undefined : facing;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: facingMode ? { facingMode } : true,
            audio: false,
        });
        (stream.getTracks() || []).forEach((track) => track.stop());
        setCameraPermissionStatus('Permiso de camara concedido correctamente.', true);
    } catch (error) {
        setCameraPermissionStatus(`Permiso de camara no concedido (${error?.name || 'error'}).`, false);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const formControls = [
        'scanner-mode', 'scanner-serial-port', 'scanner-baud-rate', 'scanner-data-bits', 'scanner-parity',
        'scanner-stop-bits', 'scanner-flow-control', 'scanner-suffix', 'scanner-prefix-strip', 'scanner-prefix-trim',
        'scanner-only-numeric', 'scanner-auto-focus', 'scanner-beep-on-scan'
    ];

    let settings = {};
    try {
        settings = await fetchScannerSettings();
        fillForm(settings);
    } catch (error) {
        alert(error.message || 'No se pudo cargar configuracion de lector.');
    }

    await loadSerialPorts(String(settings.serial_port || ''));
    toggleSerialVisibility();
    initialSnapshot = JSON.stringify(normalizePayload(getPayload()));
    updateSaveState();

    fillCameraPlan(loadCameraPlan());
    await checkCameraPermissionStatus();

    formControls.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => {
            if (id === 'scanner-mode') toggleSerialVisibility();
            updateSaveState();
        });
        el.addEventListener('change', () => {
            if (id === 'scanner-mode') toggleSerialVisibility();
            updateSaveState();
        });
    });

    document.getElementById('scanner-refresh-ports-btn')?.addEventListener('click', async () => {
        const currentPort = document.getElementById('scanner-serial-port')?.value || '';
        await loadSerialPorts(currentPort);
        showTestResult('Puertos recargados.', true);
    });

    document.getElementById('save-scanner-settings-btn')?.addEventListener('click', async () => {
        const saveBtn = document.getElementById('save-scanner-settings-btn');
        if (saveBtn) saveBtn.disabled = true;
        try {
            const payload = normalizePayload(getPayload());
            await saveScannerSettings(payload);
            initialSnapshot = JSON.stringify(payload);
            updateSaveState();
            showTestResult('Configuracion de lector guardada.', true);
        } catch (error) {
            alert(error.message || 'No se pudo guardar configuracion de lector.');
        } finally {
            updateSaveState();
        }
    });

    const testInput = document.getElementById('scanner-test-input');
    testInput?.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const raw = String(testInput.value || '');
        const payload = getPayload();
        const fixedPrefix = String(payload.scanner_prefix_to_strip || '').trim();
        let withoutPrefix = raw;
        if (fixedPrefix) {
            if (withoutPrefix.startsWith(fixedPrefix)) {
                withoutPrefix = withoutPrefix.slice(fixedPrefix.length);
            } else if (withoutPrefix.toUpperCase().startsWith(fixedPrefix.toUpperCase())) {
                withoutPrefix = withoutPrefix.slice(fixedPrefix.length);
            }
        }
        const trimmed = payload.scanner_prefix_trim ? withoutPrefix.trim() : withoutPrefix;
        const parsed = payload.scanner_only_numeric ? trimmed.replace(/[^0-9]/g, '') : trimmed;
        if (!parsed) {
            showTestResult('Lectura vacia o invalida para la configuracion actual.', false);
            return;
        }
        if (payload.scanner_beep_on_scan) {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = ctx.createOscillator();
                oscillator.frequency.value = 1040;
                oscillator.connect(ctx.destination);
                oscillator.start();
                oscillator.stop(ctx.currentTime + 0.06);
            } catch (_) {}
        }
        showTestResult(`Lectura detectada: ${parsed}`, true);
        testInput.value = '';
    });

    document.getElementById('camera-check-permission-btn')?.addEventListener('click', async () => {
        await checkCameraPermissionStatus();
    });

    document.getElementById('camera-request-permission-btn')?.addEventListener('click', async () => {
        await requestCameraPermissionPreview();
        await checkCameraPermissionStatus();
    });

    document.getElementById('camera-save-plan-btn')?.addEventListener('click', () => {
        saveCameraPlan(getCameraPlanPayload());
        setCameraPermissionStatus('Preparacion de camara guardada localmente (modo Proximamente).', true);
    });
});

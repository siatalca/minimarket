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

async function fetchPaymentSettings() {
    const response = await fetch(API_URL + 'api/payment-settings', {
        headers: withAuthHeaders(),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'No se pudo cargar configuracion de formas de pago');
    }
    return data;
}

async function savePaymentSettings(payload) {
    const response = await fetch(API_URL + 'api/payment-settings', {
        method: 'PUT',
        headers: withAuthHeaders({
            'Content-Type': 'application/json',
        }),
        body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'No se pudo guardar configuracion de formas de pago');
    }
    return data;
}

function toBool(value) {
    return Boolean(Number(value)) || value === true;
}

function setChecked(id, value) {
    const el = document.getElementById(id);
    if (el) el.checked = toBool(value);
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value ?? '';
}

function getNumberValue(id, fallback = 0) {
    const value = Number(document.getElementById(id)?.value ?? fallback);
    return Number.isFinite(value) ? value : fallback;
}

function getFormPayload() {
    return {
        cash_strict_amount: document.getElementById('pay-cash-strict')?.checked ?? false,
        usd_enabled: document.getElementById('pay-usd-enabled')?.checked ?? false,
        usd_exchange_rate: getNumberValue('pay-usd-rate', 950),
        card_enabled: document.getElementById('pay-card-enabled')?.checked ?? true,
        card_fee_enabled: document.getElementById('pay-card-fee-enabled')?.checked ?? false,
        card_fee_percent: getNumberValue('pay-card-fee-percent', 0),
        transfer_enabled: document.getElementById('pay-transfer-enabled')?.checked ?? false,
        check_enabled: document.getElementById('pay-check-enabled')?.checked ?? false,
        voucher_enabled: document.getElementById('pay-voucher-enabled')?.checked ?? false,
        mixed_enabled: document.getElementById('pay-mixed-enabled')?.checked ?? true,
    };
}

function fillForm(settings) {
    setChecked('pay-cash-strict', settings.cash_strict_amount);
    setChecked('pay-usd-enabled', settings.usd_enabled);
    setValue('pay-usd-rate', Number(settings.usd_exchange_rate ?? 950));
    setChecked('pay-card-enabled', settings.card_enabled);
    setChecked('pay-card-fee-enabled', settings.card_fee_enabled);
    setValue('pay-card-fee-percent', Number(settings.card_fee_percent ?? 0));
    setChecked('pay-transfer-enabled', settings.transfer_enabled);
    setChecked('pay-check-enabled', settings.check_enabled);
    setChecked('pay-voucher-enabled', settings.voucher_enabled);
    setChecked('pay-mixed-enabled', settings.mixed_enabled);
}

let initialSnapshot = '';

function normalizePayload(payload) {
    return {
        cash_strict_amount: Boolean(payload.cash_strict_amount),
        usd_enabled: Boolean(payload.usd_enabled),
        usd_exchange_rate: Number(payload.usd_exchange_rate || 0),
        card_enabled: Boolean(payload.card_enabled),
        card_fee_enabled: Boolean(payload.card_fee_enabled),
        card_fee_percent: Number(payload.card_fee_percent || 0),
        transfer_enabled: Boolean(payload.transfer_enabled),
        check_enabled: Boolean(payload.check_enabled),
        voucher_enabled: Boolean(payload.voucher_enabled),
        mixed_enabled: Boolean(payload.mixed_enabled),
    };
}

function updateSaveState() {
    const saveBtn = document.getElementById('save-payment-settings-btn');
    if (!saveBtn) return;
    const current = JSON.stringify(normalizePayload(getFormPayload()));
    saveBtn.disabled = !initialSnapshot || current === initialSnapshot;
}

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('payment-settings-form');
    if (!form) return;

    try {
        const settings = await fetchPaymentSettings();
        fillForm(settings);
        initialSnapshot = JSON.stringify(normalizePayload(getFormPayload()));
        updateSaveState();
    } catch (error) {
        alert(error.message || 'No se pudo cargar la configuracion.');
    }

    form.addEventListener('input', updateSaveState);
    form.addEventListener('change', updateSaveState);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const saveBtn = document.getElementById('save-payment-settings-btn');
        if (saveBtn) saveBtn.disabled = true;
        try {
            const payload = getFormPayload();
            await savePaymentSettings(payload);
            initialSnapshot = JSON.stringify(normalizePayload(payload));
            updateSaveState();
            alert('Configuracion de formas de pago guardada.');
        } catch (error) {
            alert(error.message || 'No se pudo guardar la configuracion.');
        } finally {
            updateSaveState();
        }
    });
});

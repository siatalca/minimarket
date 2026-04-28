const MAIL_API_URL = (() => {
    const override = window.localStorage.getItem('api_url');
    if (override) return override.endsWith('/') ? override : `${override}/`;
    if (window.location.port === '3002') return `${window.location.origin}/`;
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    const protocol = isLocalHost ? 'http:' : window.location.protocol;
    return `${protocol}//${window.location.hostname}:3002/`;
})();

const MAIL_PROVIDER_PRESETS = {
    gmail: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        note: 'Para Gmail usa una contrasena de aplicacion de 16 caracteres.',
    },
    outlook: {
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        note: 'Para Outlook/Hotmail usa tu cuenta SMTP habilitada en Microsoft.',
    },
    yahoo: {
        host: 'smtp.mail.yahoo.com',
        port: 465,
        secure: true,
        note: 'Yahoo requiere clave de aplicacion para SMTP.',
    },
    zoho: {
        host: 'smtp.zoho.com',
        port: 465,
        secure: true,
        note: 'Zoho puede requerir activar SMTP en la cuenta.',
    },
    custom: {
        host: '',
        port: 587,
        secure: false,
        note: 'Usa los datos SMTP entregados por tu proveedor.',
    },
};

let businessInfoEmail = '';
let sessionDisplayName = '';
let isMailEditMode = false;
let lastSavedMailSettings = null;

function mailWithAuthHeaders(headers = {}) {
    const token = localStorage.getItem('token');
    return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

async function loadBusinessInfoEmail() {
    try {
        const response = await fetch(MAIL_API_URL + 'api/getInfo', { headers: mailWithAuthHeaders() });
        const data = await response.json().catch(() => []);
        const first = Array.isArray(data) && data.length ? data[0] : null;
        const localMail = String(first?.mail || '').trim();
        if (localMail) {
            businessInfoEmail = localMail;
        }
    } catch (_) {
        businessInfoEmail = businessInfoEmail || '';
    }
}

function loadSessionDisplayName() {
    const byFullName = String(localStorage.getItem('username') || '').trim();
    const byLogin = String(localStorage.getItem('user') || '').trim();
    const byProfile = (() => {
        try {
            const raw = localStorage.getItem('user_profile');
            if (!raw) return '';
            const parsed = JSON.parse(raw);
            return String(parsed?.nombre || '').trim();
        } catch (_) {
            return '';
        }
    })();
    sessionDisplayName = byFullName || byProfile || byLogin || '';
}

async function mailGet(path) {
    const response = await fetch(MAIL_API_URL + path, { headers: mailWithAuthHeaders() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudo cargar informacion');
    return data;
}

async function mailSend(path, payload) {
    const response = await fetch(MAIL_API_URL + path, {
        method: 'POST',
        headers: mailWithAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload || {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudo ejecutar accion');
    return data;
}

async function mailPut(path, payload) {
    const response = await fetch(MAIL_API_URL + path, {
        method: 'PUT',
        headers: mailWithAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload || {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudo guardar configuracion');
    return data;
}

function value(id) {
    return String(document.getElementById(id)?.value || '').trim();
}

function checked(id) {
    return Boolean(document.getElementById(id)?.checked);
}

function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val ?? '';
}

function setChecked(id, val) {
    const el = document.getElementById(id);
    if (el) el.checked = Boolean(Number(val)) || val === true;
}

function deepClone(value) {
    return JSON.parse(JSON.stringify(value || {}));
}

function writeResult(text) {
    const box = document.getElementById('mail-result');
    if (!box) return;
    box.textContent = text;
}

function setProviderUI(provider) {
    const valid = MAIL_PROVIDER_PRESETS[provider] ? provider : 'custom';
    setValue('mail-provider', valid);
    document.querySelectorAll('.mail-provider-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-provider') === valid);
    });
    const note = MAIL_PROVIDER_PRESETS[valid]?.note || '';
    const noteBox = document.getElementById('mail-provider-note');
    if (noteBox) noteBox.textContent = note;
}

function applyProviderPreset(provider, keepHostIfCustom = false) {
    const preset = MAIL_PROVIDER_PRESETS[provider] || MAIL_PROVIDER_PRESETS.custom;
    setProviderUI(provider);

    if (provider !== 'custom' || !keepHostIfCustom) {
        setValue('mail-host', preset.host);
    }
    setValue('mail-port', preset.port);
    setValue('mail-secure', preset.secure ? '1' : '0');

    const fromEmail = value('mail-from-email');
    if (fromEmail) {
        setValue('mail-user', fromEmail);
    }
}

function inferProviderFromHost(host) {
    const h = String(host || '').toLowerCase();
    if (h.includes('gmail')) return 'gmail';
    if (h.includes('office365') || h.includes('outlook') || h.includes('hotmail')) return 'outlook';
    if (h.includes('yahoo')) return 'yahoo';
    if (h.includes('zoho')) return 'zoho';
    return 'custom';
}

function inferProviderFromEmail(email) {
    const e = String(email || '').toLowerCase();
    if (e.endsWith('@gmail.com') || e.endsWith('@googlemail.com')) return 'gmail';
    if (e.endsWith('@outlook.com') || e.endsWith('@hotmail.com') || e.endsWith('@live.com') || e.endsWith('@office365.com')) return 'outlook';
    if (e.endsWith('@yahoo.com')) return 'yahoo';
    if (e.endsWith('@zoho.com')) return 'zoho';
    return 'custom';
}

function ensureSmtpAutofillIfEmpty() {
    const host = value('mail-host');
    if (host) return;
    const fromEmail = value('mail-from-email');
    const provider = inferProviderFromEmail(fromEmail);
    applyProviderPreset(provider, provider === 'custom');
}

function syncQuickEmailToUser() {
    const fromEmail = value('mail-from-email');
    const user = value('mail-user');
    if (!user || user === fromEmail || user.includes('@')) {
        setValue('mail-user', fromEmail);
    }
}

function syncFromNameWithBusinessEmail() {
    const fromEmailInput = document.getElementById('mail-from-email');
    const fromNameInput = document.getElementById('mail-from-name');
    if (fromEmailInput) {
        const current = String(fromEmailInput.value || '').trim();
        const suggested = businessInfoEmail || String(localStorage.getItem('mail_local') || '').trim() || '';
        if (!current && suggested) {
            fromEmailInput.value = suggested;
        }
        fromEmailInput.title = suggested ? `Sugerido desde datos del local: ${suggested}` : 'Correo remitente editable';
    }
    if (!fromNameInput) return;
    const currentName = String(fromNameInput.value || '').trim();
    const suggestedName = sessionDisplayName || '';
    if (!currentName && suggestedName) {
        fromNameInput.value = suggestedName;
    }
    fromNameInput.title = suggestedName ? `Sugerido por sesion activa: ${suggestedName}` : 'Nombre remitente editable';
}

function getPayload() {
    const fromEmailValue = value('mail-from-email').slice(0, 180);
    const fromNameValue = (value('mail-from-name') || sessionDisplayName).slice(0, 120);
    return {
        enabled: checked('mail-enabled'),
        smtp_host: value('mail-host').slice(0, 120),
        smtp_port: Math.max(1, Math.min(65535, Number(value('mail-port') || 587))),
        smtp_secure: value('mail-secure') === '1',
        smtp_user: value('mail-user').slice(0, 180),
        smtp_pass: value('mail-pass').slice(0, 220),
        from_email: fromEmailValue,
        from_name: fromNameValue,
        owner_email: value('mail-owner-email').slice(0, 180),
        cc_emails: value('mail-cc-emails').slice(0, 500),
    };
}

function fillForm(data) {
    setChecked('mail-enabled', data.enabled);
    setValue('mail-host', data.smtp_host || '');
    setValue('mail-port', Number(data.smtp_port || 587));
    setValue('mail-secure', (Boolean(Number(data.smtp_secure)) || data.smtp_secure === true) ? '1' : '0');
    setValue('mail-user', data.smtp_user || '');
    setValue('mail-pass', data.smtp_pass || '');
    setValue('mail-from-email', data.from_email || '');
    setValue('mail-from-name', data.from_name || '');
    setValue('mail-owner-email', data.owner_email || '');
    setValue('mail-cc-emails', data.cc_emails || '');
    const inferred = inferProviderFromHost(data.smtp_host || '');
    setProviderUI(inferred);
    syncFromNameWithBusinessEmail();
}

function normalizeSettingsSnapshot(data = {}) {
    return {
        enabled: Boolean(Number(data.enabled)) || data.enabled === true,
        smtp_host: String(data.smtp_host || ''),
        smtp_port: Number(data.smtp_port || 587),
        smtp_secure: Boolean(Number(data.smtp_secure)) || data.smtp_secure === true,
        smtp_user: String(data.smtp_user || ''),
        smtp_pass: String(data.smtp_pass || ''),
        from_email: String(data.from_email || ''),
        from_name: String(data.from_name || ''),
        owner_email: String(data.owner_email || ''),
        cc_emails: String(data.cc_emails || ''),
    };
}

function isNotificationsEnabledCurrentOrSnapshot(snapshot = null) {
    const checkbox = document.getElementById('mail-enabled');
    if (checkbox) {
        return Boolean(checkbox.checked);
    }
    const source = snapshot || lastSavedMailSettings || {};
    return Boolean(source.enabled);
}

function hasPendingEnableToggle() {
    const checkbox = document.getElementById('mail-enabled');
    if (!checkbox || !lastSavedMailSettings) return false;
    return Boolean(checkbox.checked) !== Boolean(lastSavedMailSettings.enabled);
}

function toggleProviderButtons(disabled) {
    document.querySelectorAll('.mail-provider-btn').forEach((btn) => {
        btn.disabled = disabled;
    });
}

function setMailEditMode(enabled) {
    isMailEditMode = Boolean(enabled);
    const editableIds = [
        'mail-from-email',
        'mail-pass',
        'mail-from-name',
        'mail-host',
        'mail-port',
        'mail-secure',
        'mail-user',
        'mail-owner-email',
        'mail-cc-emails',
        'mail-test-subject',
        'mail-test-message',
    ];
    editableIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (id === 'mail-from-email' || id === 'mail-from-name') {
            el.readOnly = !isMailEditMode;
        } else {
            el.disabled = !isMailEditMode;
        }
    });
    toggleProviderButtons(!isMailEditMode);
    const mailEnabledEl = document.getElementById('mail-enabled');
    if (mailEnabledEl) {
        mailEnabledEl.disabled = false;
    }

    const saveBtn = document.getElementById('mail-save-btn');
    const editBtn = document.getElementById('mail-edit-btn');
    const cancelBtn = document.getElementById('mail-cancel-edit-btn');
    if (saveBtn) saveBtn.disabled = !(isMailEditMode || hasPendingEnableToggle());
    if (editBtn) editBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
    refreshEditButtonsVisibility();
}

function refreshEditButtonsVisibility() {
    const editBtn = document.getElementById('mail-edit-btn');
    const cancelBtn = document.getElementById('mail-cancel-edit-btn');
    const notificationsEnabled = isNotificationsEnabledCurrentOrSnapshot();
    if (editBtn) {
        editBtn.style.display = (!notificationsEnabled && !isMailEditMode) ? '' : 'none';
    }
    if (cancelBtn) {
        cancelBtn.style.display = isMailEditMode ? '' : 'none';
    }
}

async function loadMailSettings() {
    const data = await mailGet('api/service-email-settings');
    fillForm(data || {});
    lastSavedMailSettings = normalizeSettingsSnapshot(data || {});
}

function bindQuickProviderButtons() {
    document.querySelectorAll('.mail-provider-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const provider = btn.getAttribute('data-provider') || 'custom';
            applyProviderPreset(provider, provider === 'custom');
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    loadSessionDisplayName();
    bindQuickProviderButtons();
    applyProviderPreset('gmail');
    await loadBusinessInfoEmail();
    syncFromNameWithBusinessEmail();

    document.getElementById('mail-from-email')?.addEventListener('input', () => {
        syncQuickEmailToUser();
    });

    try {
        await loadMailSettings();
        setMailEditMode(false);
        writeResult('Configuracion cargada.');
    } catch (error) {
        setMailEditMode(false);
        writeResult(error.message || 'No se pudo cargar configuracion.');
    }

    document.getElementById('mail-edit-btn')?.addEventListener('click', () => {
        setMailEditMode(true);
        writeResult('Edicion habilitada.');
    });

    document.getElementById('mail-enabled')?.addEventListener('change', () => {
        refreshEditButtonsVisibility();
        const saveBtn = document.getElementById('mail-save-btn');
        if (saveBtn) {
            saveBtn.disabled = !(isMailEditMode || hasPendingEnableToggle());
        }
    });

    document.getElementById('mail-cancel-edit-btn')?.addEventListener('click', () => {
        if (lastSavedMailSettings) {
            fillForm(lastSavedMailSettings);
        }
        setMailEditMode(false);
        writeResult('Edicion cancelada. Se restauraron los datos guardados.');
    });

    document.getElementById('mail-save-btn')?.addEventListener('click', async () => {
        try {
            syncQuickEmailToUser();
            ensureSmtpAutofillIfEmpty();
            const payload = getPayload();
            if (!payload.smtp_host) {
                writeResult('Falta SMTP host. Selecciona proveedor (Gmail/Outlook/...) o completa configuracion avanzada.');
                return;
            }
            await mailPut('api/service-email-settings', payload);
            lastSavedMailSettings = normalizeSettingsSnapshot(payload);
            setMailEditMode(false);
            writeResult(`Configuracion guardada correctamente.\n${new Date().toLocaleString('es-CL')}`);
        } catch (error) {
            writeResult(error.message || 'No se pudo guardar configuracion.');
        }
    });

    document.getElementById('mail-test-btn')?.addEventListener('click', async () => {
        try {
            ensureSmtpAutofillIfEmpty();
            if (!value('mail-host')) {
                writeResult('Falta SMTP host. Guarda primero la configuracion con proveedor seleccionado.');
                return;
            }
            const payload = {
                subject: value('mail-test-subject').slice(0, 180) || 'Prueba de correo Minimarket',
                message: value('mail-test-message').slice(0, 1200) || 'Mensaje de prueba.',
                to: value('mail-owner-email').slice(0, 180),
            };
            const data = await mailSend('api/service-email-settings/test', payload);
            writeResult(data.message || 'Correo de prueba enviado.');
        } catch (error) {
            writeResult(error.message || 'No se pudo enviar prueba.');
        }
    });

});

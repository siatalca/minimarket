const API_URL = (() => {
    const overrideRaw = String(window.localStorage.getItem('api_url') || '').trim();
    if (overrideRaw) {
        try {
            const parsed = new URL(overrideRaw, window.location.origin);
            const overrideHost = String(parsed.hostname || '').toLowerCase();
            const currentHost = String(window.location.hostname || '').toLowerCase();
            const isOverrideLocalhost = ['localhost', '127.0.0.1', '::1'].includes(overrideHost);
            const isCurrentLocalhost = ['localhost', '127.0.0.1', '::1'].includes(currentHost);
            if (!(isOverrideLocalhost && !isCurrentLocalhost)) {
                return parsed.href.endsWith('/') ? parsed.href : `${parsed.href}/`;
            }
        } catch (_) {}
    }
    if (window.location.port === '3002') {
        return `${window.location.origin}/`;
    }
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    const protocol = isLocalHost ? 'http:' : window.location.protocol;
    return `${protocol}//${window.location.hostname}:3002/`;
})();
const FRONTEND_BUILD_VERSION = '20260328c';
try {
    window.__MINIMARKET_BUILD = FRONTEND_BUILD_VERSION;
} catch (_) {
}

let frontendErrorReportingBootstrapped = false;
let frontendLastErrorReportAt = 0;

function reportClientErrorToServer(payload = {}) {
    const now = Date.now();
    if ((now - frontendLastErrorReportAt) < 2500) return;
    frontendLastErrorReportAt = now;
    try {
        fetch(API_URL + 'api/error-report', {
            method: 'POST',
            headers: {
                ...withAuthHeaders({
                    'Content-Type': 'application/json',
                }),
            },
            body: JSON.stringify({
                source: String(payload.source || 'frontend.unknown').slice(0, 120),
                message: String(payload.message || '').slice(0, 2000),
                stack: String(payload.stack || '').slice(0, 9000),
                url: window.location.href,
                method: payload.method || '',
                user_agent: navigator.userAgent || '',
                caja: String(localStorage.getItem('n_caja') || localStorage.getItem('caja') || ''),
                user: String(localStorage.getItem('id_user') || ''),
            }),
        }).catch(() => {});
    } catch (_) {
        // noop
    }
}

function setupFrontendErrorReporting() {
    if (frontendErrorReportingBootstrapped) return;
    frontendErrorReportingBootstrapped = true;

    window.addEventListener('error', (event) => {
        try {
            reportClientErrorToServer({
                source: 'frontend.window.error',
                message: event?.message || 'Error de frontend',
                stack: event?.error?.stack || '',
            });
        } catch (_) {}
    });

    window.addEventListener('unhandledrejection', (event) => {
        try {
            const reason = event?.reason;
            reportClientErrorToServer({
                source: 'frontend.unhandledrejection',
                message: reason?.message || String(reason || 'Promise rejected'),
                stack: reason?.stack || '',
            });
        } catch (_) {}
    });
}

(function setupCustomAlertUI() {
    if (window.__minimarketAlertUiInit) return;
    window.__minimarketAlertUiInit = true;

    const style = document.createElement('style');
    style.textContent = `
      #mm-alert-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.45); display: none; align-items: center; justify-content: center; z-index: 2147483000; padding: 16px; }
      #mm-alert-overlay.show { display: flex; }
      #mm-alert-box { width: min(520px, 94vw); background: #ffffff; border: 1px solid #cbd5e1; border-radius: 14px; box-shadow: 0 20px 50px rgba(2,6,23,.25); overflow: hidden; }
      #mm-alert-head { padding: 12px 16px; color: #fff; font-weight: 700; letter-spacing: .2px; display: flex; align-items: center; gap: 8px; }
      #mm-alert-icon { width: 20px; text-align: center; font-size: 16px; }
      #mm-alert-title { font-size: 14px; }
      #mm-alert-message { padding: 16px; color: #0f172a; white-space: pre-wrap; line-height: 1.45; font-size: 14px; }
      #mm-alert-input-wrap { padding: 0 16px 14px; }
      #mm-alert-input { width: 100%; min-height: 38px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; font-size: 14px; color: #0f172a; background: #fff; }
      #mm-alert-input.mm-alert-input-invalid { border-color: #dc2626; box-shadow: 0 0 0 2px rgba(220,38,38,.16); }
      #mm-alert-inline-error { margin-top: 6px; color: #b91c1c; font-size: 12px; font-weight: 600; min-height: 16px; }
      #mm-alert-inline-help { margin-top: 4px; color: #475569; font-size: 12px; min-height: 16px; }
      #mm-alert-inline-help.mm-alert-inline-help-warning { color: #b91c1c; font-weight: 600; }
      #mm-alert-actions { padding: 0 16px 16px; display: flex; justify-content: flex-end; gap: 10px; }
      #mm-alert-cancel { border: 1px solid #94a3b8; background: #f8fafc; color: #0f172a; border-radius: 8px; padding: 8px 14px; font-weight: 600; cursor: pointer; }
      #mm-alert-cancel:hover { background: #eef2f7; }
      #mm-alert-close { border: 1px solid #1d4ed8; background: #2563eb; color: #fff; border-radius: 8px; padding: 8px 14px; font-weight: 600; cursor: pointer; }
      #mm-alert-close:hover { background: #1d4ed8; }
      #mm-alert-box.mm-alert-success #mm-alert-head { background: linear-gradient(135deg, #15803d, #16a34a); }
      #mm-alert-box.mm-alert-success #mm-alert-close { border-color: #15803d; background: #16a34a; }
      #mm-alert-box.mm-alert-success #mm-alert-close:hover { background: #15803d; }
      #mm-alert-box.mm-alert-error #mm-alert-head { background: linear-gradient(135deg, #b91c1c, #dc2626); }
      #mm-alert-box.mm-alert-error #mm-alert-close { border-color: #b91c1c; background: #dc2626; }
      #mm-alert-box.mm-alert-error #mm-alert-close:hover { background: #b91c1c; }
      #mm-alert-box.mm-alert-warning #mm-alert-head { background: linear-gradient(135deg, #b45309, #d97706); }
      #mm-alert-box.mm-alert-warning #mm-alert-close { border-color: #b45309; background: #d97706; }
      #mm-alert-box.mm-alert-warning #mm-alert-close:hover { background: #b45309; }
      #mm-alert-box.mm-alert-input #mm-alert-head { background: linear-gradient(135deg, #0f766e, #0d9488); }
      #mm-alert-box.mm-alert-input #mm-alert-close { border-color: #0f766e; background: #0d9488; }
      #mm-alert-box.mm-alert-input #mm-alert-close:hover { background: #0f766e; }
      #mm-alert-box.mm-alert-info #mm-alert-head { background: linear-gradient(135deg, #1d4ed8, #2563eb); }
      body.dark #mm-alert-box { background: #111827; border-color: #334155; }
      body.dark #mm-alert-message { color: #e5e7eb; }
      body.dark #mm-alert-input { background: #0b1220; border-color: #334155; color: #e5e7eb; }
      body.dark #mm-alert-cancel { background: #1f2937; color: #e5e7eb; border-color: #334155; }
      body.dark #mm-alert-cancel:hover { background: #273449; }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'mm-alert-overlay';
    overlay.innerHTML = `
      <div id="mm-alert-box" class="mm-alert-info" role="alertdialog" aria-modal="true" aria-labelledby="mm-alert-title">
        <div id="mm-alert-head">
          <span id="mm-alert-icon">i</span>
          <span id="mm-alert-title">Informacion</span>
        </div>
        <div id="mm-alert-message"></div>
        <div id="mm-alert-input-wrap" style="display:none;">
          <input id="mm-alert-input" type="text" />
          <div id="mm-alert-inline-help"></div>
          <div id="mm-alert-inline-error"></div>
        </div>
        <div id="mm-alert-actions">
          <button id="mm-alert-cancel" type="button" style="display:none;">Cancelar</button>
          <button id="mm-alert-close" type="button">Entendido</button>
        </div>
      </div>
    `;
    const mountOverlayOnBody = () => {
        if (!document.body) return false;
        if (!document.getElementById('mm-alert-overlay')) {
            document.body.appendChild(overlay);
        }
        return true;
    };
    if (!mountOverlayOnBody()) {
        document.addEventListener('DOMContentLoaded', mountOverlayOnBody, { once: true });
    }

    const boxEl = overlay.querySelector('#mm-alert-box');
    const iconEl = overlay.querySelector('#mm-alert-icon');
    const titleEl = overlay.querySelector('#mm-alert-title');
    const messageEl = overlay.querySelector('#mm-alert-message');
    const inputWrapEl = overlay.querySelector('#mm-alert-input-wrap');
    const inputEl = overlay.querySelector('#mm-alert-input');
    const inlineHelpEl = overlay.querySelector('#mm-alert-inline-help');
    const inlineErrorEl = overlay.querySelector('#mm-alert-inline-error');
    const closeBtn = overlay.querySelector('#mm-alert-close');
    const cancelBtn = overlay.querySelector('#mm-alert-cancel');

    let activeResolver = null;
    let activeMode = 'alert';
    let activeDialogOptions = {};

    function setInlineError(message = '') {
        if (!inlineErrorEl) return;
        inlineErrorEl.textContent = String(message || '');
    }

    function setInlineHelp(message = '') {
        if (!inlineHelpEl) return;
        inlineHelpEl.textContent = String(message || '');
    }

    function applyPromptValidationState() {
        if (activeMode !== 'prompt') return true;
        const validate = typeof activeDialogOptions?.validate === 'function' ? activeDialogOptions.validate : null;
        const shouldDisableOkWhenInvalid = Boolean(activeDialogOptions?.disableOkWhenInvalid);
        if (!validate) {
            inputEl.classList.remove('mm-alert-input-invalid');
            if (shouldDisableOkWhenInvalid) closeBtn.disabled = false;
            setInlineError('');
            return true;
        }
        const value = String(inputEl.value || '');
        const validationMessage = validate(value);
        const isValid = !validationMessage;
        inputEl.classList.toggle('mm-alert-input-invalid', !isValid);
        const hideValidationMessage = Boolean(activeDialogOptions?.hideValidationMessage);
        setInlineError(isValid || hideValidationMessage ? '' : validationMessage);
        if (shouldDisableOkWhenInvalid) {
            closeBtn.disabled = !isValid;
        }
        return isValid;
    }

    function resolveDialog(value) {
        if (!activeResolver) return;
        const resolver = activeResolver;
        activeResolver = null;
        overlay.classList.remove('show');
        setTimeout(() => {
            if (typeof focusBarcodeInputForNextScan === 'function') {
                focusBarcodeInputForNextScan();
            }
        }, 0);
        resolver(value);
    }

    function closeByDismiss() {
        if (activeDialogOptions?.disableCancel) {
            return;
        }
        if (activeMode === 'prompt') {
            resolveDialog(null);
            return;
        }
        if (activeMode === 'confirm') {
            resolveDialog(false);
            return;
        }
        resolveDialog(true);
    }

    overlay.addEventListener('click', (ev) => {
        if (ev.target === overlay) closeByDismiss();
    });

    document.addEventListener('keydown', (ev) => {
        if (!overlay.classList.contains('show')) return;
        if (ev.key === 'Escape') {
            ev.preventDefault();
            if (activeDialogOptions?.disableCancel) return;
            closeByDismiss();
        }
        if (ev.key === 'Enter') {
            ev.preventDefault();
            if (activeMode === 'prompt') {
                const value = String(inputEl.value || '');
                const validate = typeof activeDialogOptions?.validate === 'function' ? activeDialogOptions.validate : null;
                const validationMessage = validate ? validate(value) : '';
                if (validationMessage) {
                    setInlineError(validationMessage);
                    return;
                }
                setInlineError('');
                resolveDialog(value);
            } else {
                resolveDialog(true);
            }
        }
    });

    function detectType(rawMessage, forcedType = '') {
        const normalizedForced = String(forcedType || '').trim().toLowerCase();
        if (normalizedForced) return normalizedForced;

        const message = String(rawMessage || '').toLowerCase();
        if (/\[(error|err|danger)\]/.test(message)) return 'error';
        if (/\[(ok|success|exito|exitoso|exitosamente)\]/.test(message)) return 'success';
        if (/\[(warn|warning|aviso|advertencia)\]/.test(message)) return 'warning';
        if (/\[(input|ingresar|dato|formulario)\]/.test(message)) return 'input';

        if (/\berror\b|inval|invalid|no se pudo|fall|bloque|deneg|expirad|forbidden|token/.test(message)) return 'error';
        if (/guardad|actualiz|eliminad|cread|completad|enviad|correct|exito|exitosa|exitosa/.test(message)) return 'success';
        if (/debes|atencion|atenci[oó]n|selecciona|revisa|rango|faltan|obligatorio/.test(message)) return 'warning';
        if (/ingresa|escribe|completa|datos|formulario|captura/.test(message)) return 'input';

        return 'info';
    }

    function getTypeConfig(type) {
        switch (type) {
        case 'error':
            return { cls: 'mm-alert-error', icon: 'X', title: 'Error' };
        case 'success':
            return { cls: 'mm-alert-success', icon: 'OK', title: 'Correcto' };
        case 'warning':
            return { cls: 'mm-alert-warning', icon: '!', title: 'Atencion' };
        case 'input':
            return { cls: 'mm-alert-input', icon: '>', title: 'Ingreso de informacion' };
        default:
            return { cls: 'mm-alert-info', icon: 'i', title: 'Informacion' };
        }
    }

    function openDialog(options) {
        if (!messageEl || !boxEl || !titleEl || !iconEl || !closeBtn || !cancelBtn || !inputWrapEl || !inputEl) {
            return Promise.resolve(null);
        }

        const opts = options || {};
        const mode = String(opts.mode || 'alert');
        activeMode = mode;
        activeDialogOptions = opts;

        const detectedType = detectType(opts.message, opts.type || '');
        const cfg = getTypeConfig(detectedType);
        boxEl.classList.remove('mm-alert-info', 'mm-alert-success', 'mm-alert-error', 'mm-alert-warning', 'mm-alert-input');
        boxEl.classList.add(cfg.cls);

        iconEl.textContent = cfg.icon;
        titleEl.textContent = String(opts.title || cfg.title);
        messageEl.textContent = String(opts.message ?? '');

        closeBtn.textContent = String(opts.okText || (mode === 'alert' ? 'Entendido' : 'Aceptar'));
        cancelBtn.textContent = String(opts.cancelText || 'Cancelar');

        const disableCancel = Boolean(opts.disableCancel);
        const needsCancel = (mode === 'confirm' || mode === 'prompt') && !disableCancel;
        const needsInput = mode === 'prompt';

        cancelBtn.style.display = needsCancel ? '' : 'none';
        inputWrapEl.style.display = needsInput ? '' : 'none';

        inputEl.value = needsInput ? String(opts.defaultValue ?? '') : '';
        inputEl.placeholder = needsInput ? String(opts.placeholder || '') : '';
        inputEl.type = needsInput ? String(opts.inputType || 'text') : 'text';
        inputEl.inputMode = needsInput ? String(opts.inputMode || '') : '';
        inputEl.min = (needsInput && typeof opts.min !== 'undefined') ? String(opts.min) : '';
        inputEl.max = (needsInput && typeof opts.max !== 'undefined') ? String(opts.max) : '';
        inputEl.step = (needsInput && typeof opts.step !== 'undefined') ? String(opts.step) : '';
        setInlineHelp(needsInput ? String(opts.helpText || '') : '');
        if (inlineHelpEl) {
            inlineHelpEl.classList.toggle('mm-alert-inline-help-warning', Boolean(opts.helpStyle === 'warning'));
        }
        setInlineError('');
        inputEl.classList.remove('mm-alert-input-invalid');
        closeBtn.disabled = false;

        overlay.classList.add('show');

        return new Promise((resolve) => {
            activeResolver = resolve;
            setTimeout(() => {
                if (needsInput) {
                    inputEl.focus();
                    inputEl.select();
                    applyPromptValidationState();
                } else {
                    closeBtn.focus();
                }
            }, 0);
        });
    }

    closeBtn.addEventListener('click', () => {
        if (activeMode === 'prompt') {
            if (!applyPromptValidationState()) {
                return;
            }
            const value = String(inputEl.value || '');
            resolveDialog(value);
            return;
        }
        resolveDialog(true);
    });

    cancelBtn.addEventListener('click', () => {
        if (activeMode === 'prompt') {
            resolveDialog(null);
            return;
        }
        resolveDialog(false);
    });

    inputEl.addEventListener('input', () => {
        if (activeMode !== 'prompt') return;
        applyPromptValidationState();
    });

    window.__nativeAlert = window.alert.bind(window);
    window.__nativeConfirm = window.confirm.bind(window);
    window.__nativePrompt = window.prompt.bind(window);

    window.appNotify = function appNotify(message, type = '') {
        openDialog({ mode: 'alert', message, type });
    };

    window.appConfirm = function appConfirm(message, type = 'warning', options = {}) {
        return openDialog({ mode: 'confirm', message, type, ...options }).then((value) => Boolean(value));
    };

    window.appPrompt = function appPrompt(message, defaultValue = '', options = {}) {
        return openDialog({ mode: 'prompt', message, type: 'input', defaultValue, ...options }).then((value) => {
            if (value === null) return null;
            return String(value);
        });
    };

    window.alert = function customAlert(message) {
        openDialog({ mode: 'alert', message });
    };
})();

let isFinalizingSale = false;
let shiftStarted = false;
let shiftValidationRetryTimer = null;
let ensureShiftStartedInFlight = null;
let searchProductsDebounceTimer = null;
let searchProductsLastResults = [];
let searchSelectedProductId = null;
let bulkProductPopupContext = null;
let bulkProductLastEditedField = null;
let salesBarcodeSuggestDebounceTimer = null;
let salesBarcodeSuggestCodes = new Set();
const SALES_CAMERA_PERMISSION_KEY = 'sales_camera_permission_prompt_v1';
let salesCameraPermissionInFlight = false;
let salesCameraScanStream = null;
let salesCameraScanRaf = null;
let salesCameraScanActive = false;
let salesBarcodeDetector = null;
let selectedCartIndex = -1;
let salesPromotionRulesByProduct = new Map();
let salesComboPromotionRules = [];
let salesPromotionRulesLoadPromise = null;
let salesPromotionRulesLastSyncAt = 0;
const SALES_PROMOTION_RULES_TTL_MS = 60 * 1000;
let salesAddToCartInFlight = false;
let salesHistoryRowsCache = [];
let salesHistorySelectedSaleId = 0;
let salesHistorySelectedSaleDetail = null;
let salesHistoryKeyboardNavigationInFlight = false;
let salesHistoryEditMode = false;
let salesHistoryOriginalPaymentState = null;
let isClosingShift = false;
let cashExitProvidersCache = [];
let cashExitProvidersLastLoadedAt = 0;
let cashExitProvidersRequestPromise = null;
const CASH_EXIT_PROVIDER_CACHE_TTL_MS = 60 * 1000;
let scannerRuntimeSettings = {
    scanner_mode: 'keyboard',
    scanner_suffix: 'enter',
    scanner_prefix_to_strip: '',
    scanner_prefix_trim: true,
    scanner_only_numeric: true,
    scanner_auto_focus: true,
    scanner_beep_on_scan: false,
};
let cutCloseContext = {
    scope: null,
    esperadoEfectivo: 0,
    esperadoTarjeta: 0,
    resumenLoaded: false,
    sessionResumenLoaded: false,
    turnStatusLabel: '',
    currentDate: new Date().toISOString().slice(0, 10),
    sessionReportSnapshot: null,
    historicalCutId: null,
};
let cutHistoryContext = {
    mode: 'cashier',
    rows: [],
};
let cutRebuildContext = {
    cuts: [],
    sales: [],
    selectedSaleIds: new Set(),
    selectedCutIds: new Set(),
    keeperCutId: null,
    persistedCutId: null,
    persistedSignature: '',
    filtersLoaded: false,
};
const CUT_CALCULATOR_HISTORY_KEY = 'cut_calculator_history_v1';
const CUT_CALCULATOR_HISTORY_LIMIT = 5;
let cutCalculatorState = {
    expression: '',
    justEvaluated: false,
    history: [],
    manualPositioned: false,
    dragPointerId: null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    errorTimer: null,
};
const TICKET_COUNTER_API_MODE_KEY = 'ticket_counter_api_mode';
const SHIFT_OWNER_USER_KEY = 'turno_owner_user';
const SHIFT_OWNER_CAJA_KEY = 'turno_owner_caja';
const REFRESH_TOKEN_STORAGE_KEY = 'refresh_token';
const SESSION_KEEPALIVE_INTERVAL_MS = 5 * 60 * 1000;
let refreshInFlightPromise = null;
let fetchAuthInterceptorInitialized = false;
let sessionKeepAliveInitialized = false;

function getSessionToken() {
    const localToken = String(localStorage.getItem('token') || '').trim();
    const sessionToken = String(sessionStorage.getItem('token') || '').trim();
    if (localToken) {
        if (localToken !== sessionToken) {
            sessionStorage.setItem('token', localToken);
        }
        return localToken;
    }
    if (sessionToken) {
        localStorage.setItem('token', sessionToken);
        return sessionToken;
    }
    return null;
}

function getRefreshToken() {
    const localRefresh = String(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || '').trim();
    const sessionRefresh = String(sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || '').trim();
    if (localRefresh) {
        if (localRefresh !== sessionRefresh) {
            sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, localRefresh);
        }
        return localRefresh;
    }
    if (sessionRefresh) {
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, sessionRefresh);
        return sessionRefresh;
    }
    return null;
}

function setSessionTokens(accessToken, refreshToken) {
    if (accessToken) {
        sessionStorage.setItem('token', accessToken);
        localStorage.setItem('token', accessToken);
    }
    if (refreshToken) {
        sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    }
}

async function revokeRefreshTokenSilently() {
    try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) return;
        await fetch(API_URL + 'api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });
    } catch (_) {
    }
}

function clearSessionTokens() {
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

async function requestAccessTokenRefreshWith(refreshToken) {
    const safeToken = String(refreshToken || '').trim();
    if (!safeToken) return null;
    try {
        const response = await fetch(API_URL + 'api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: safeToken }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.token || !data?.refresh_token) {
            return null;
        }
        return data;
    } catch (_) {
        return null;
    }
}

async function refreshAccessTokenIfNeeded() {
    if (refreshInFlightPromise) {
        return refreshInFlightPromise;
    }
    refreshInFlightPromise = (async () => {
        let refreshToken = getRefreshToken();
        if (!refreshToken) return null;

        let data = await requestAccessTokenRefreshWith(refreshToken);
        if (!data) {
            const latestStoredRefresh = String(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || '').trim();
            if (latestStoredRefresh && latestStoredRefresh !== refreshToken) {
                sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, latestStoredRefresh);
                refreshToken = latestStoredRefresh;
                data = await requestAccessTokenRefreshWith(refreshToken);
            }
        }
        if (!data?.token || !data?.refresh_token) {
            return null;
        }
        setSessionTokens(data.token, data.refresh_token);
        return data.token;
    })();
    try {
        return await refreshInFlightPromise;
    } finally {
        refreshInFlightPromise = null;
    }
}

function isApiUrlRequest(url) {
    try {
        const absolute = new URL(url, window.location.origin);
        const apiBase = new URL(API_URL, window.location.origin);
        return absolute.origin === apiBase.origin && absolute.pathname.startsWith(apiBase.pathname + 'api/');
    } catch (_) {
        return false;
    }
}

function setupSessionTokenStorageSync() {
    if (window.__sessionTokenStorageSyncInit) return;
    window.__sessionTokenStorageSyncInit = true;
    window.addEventListener('storage', (event) => {
        if (event.key !== 'token' && event.key !== REFRESH_TOKEN_STORAGE_KEY) return;
        const access = String(localStorage.getItem('token') || '').trim();
        const refresh = String(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || '').trim();
        if (access) {
            sessionStorage.setItem('token', access);
        } else {
            sessionStorage.removeItem('token');
        }
        if (refresh) {
            sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refresh);
        } else {
            sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
        }
    });
}

function setupAuthFetchInterceptor() {
    if (fetchAuthInterceptorInitialized || typeof window.fetch !== 'function') return;
    fetchAuthInterceptorInitialized = true;
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init = {}) => {
        const url = typeof input === 'string' ? input : (input?.url || '');
        const isApiRequest = isApiUrlRequest(url);
        const isRefreshRoute = typeof url === 'string' && url.includes('/api/auth/refresh');
        const isLoginRoute = typeof url === 'string' && url.includes('/api/login');
        const alreadyRetried = Boolean(init && init.__authRetried);

        const response = await originalFetch(input, init);
        if (!isApiRequest || isRefreshRoute || isLoginRoute || response.status !== 401 || alreadyRetried) {
            return response;
        }

        const newAccessToken = await refreshAccessTokenIfNeeded();
        if (!newAccessToken) {
            return response;
        }

        const retryInit = { ...(init || {}) };
        const retryHeaders = new Headers(retryInit.headers || {});
        retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);
        retryInit.headers = retryHeaders;
        retryInit.__authRetried = true;
        return originalFetch(input, retryInit);
    };
}

async function runSessionKeepAliveTick() {
    const hasUserSession = Boolean(String(localStorage.getItem('id_user') || '').trim());
    if (!hasUserSession) return;
    const token = getSessionToken();
    const refreshToken = getRefreshToken();
    if (!token || !refreshToken) return;
    await refreshAccessTokenIfNeeded();
}

function setupSessionKeepAlive() {
    if (sessionKeepAliveInitialized) return;
    sessionKeepAliveInitialized = true;
    window.setInterval(() => {
        runSessionKeepAliveTick().catch(() => {});
    }, SESSION_KEEPALIVE_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            runSessionKeepAliveTick().catch(() => {});
        }
    });
}

setupSessionTokenStorageSync();
setupAuthFetchInterceptor();

function buildTicketCounterStorageKey() {
    const caja = localStorage.getItem('n_caja') || localStorage.getItem('caja');
    const cajero = localStorage.getItem('id_user');
    const turnoId = localStorage.getItem('turno_id_actual');
    if (!caja || !cajero || !turnoId) return null;
    return `ticket_counter_${caja}_${cajero}_${turnoId}`;
}

function getStoredTicketCounter() {
    const key = buildTicketCounterStorageKey();
    if (!key) return null;
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : null;
}

function setStoredTicketCounter(nextTicketNumber) {
    const key = buildTicketCounterStorageKey();
    if (!key) return;
    const parsed = Number(nextTicketNumber);
    if (!Number.isFinite(parsed) || parsed < 1) return;
    localStorage.setItem(key, String(Math.floor(parsed)));
}

function clearTicketCounterForCurrentShift() {
    const key = buildTicketCounterStorageKey();
    if (key) {
        localStorage.removeItem(key);
    }
}

function buildTicketPendingSyncStorageKey() {
    const key = buildTicketCounterStorageKey();
    return key ? `${key}_pending_sync` : null;
}

function getPendingTicketCounterSync() {
    const key = buildTicketPendingSyncStorageKey();
    if (!key) return null;
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
}

function setPendingTicketCounterSync(nextTicketNumber) {
    const key = buildTicketPendingSyncStorageKey();
    if (!key) return;
    const parsed = Number(nextTicketNumber);
    if (!Number.isFinite(parsed) || parsed < 1) return;
    localStorage.setItem(key, String(Math.floor(parsed)));
}

function clearPendingTicketCounterSync() {
    const key = buildTicketPendingSyncStorageKey();
    if (!key) return;
    localStorage.removeItem(key);
}

function getCurrentCajaId() {
    return String(localStorage.getItem('n_caja') || localStorage.getItem('caja') || '').trim();
}

function getCurrentUserId() {
    return String(localStorage.getItem('id_user') || '').trim();
}

function setLocalShiftOwnership() {
    const caja = getCurrentCajaId();
    const cajero = getCurrentUserId();
    if (!caja || !cajero) return;
    localStorage.setItem(SHIFT_OWNER_CAJA_KEY, caja);
    localStorage.setItem(SHIFT_OWNER_USER_KEY, cajero);
}

function hasLocalShiftContextForCurrentUser() {
    const turnoId = String(localStorage.getItem('turno_id_actual') || '').trim();
    const ownerCaja = String(localStorage.getItem(SHIFT_OWNER_CAJA_KEY) || '').trim();
    const ownerUser = String(localStorage.getItem(SHIFT_OWNER_USER_KEY) || '').trim();
    const caja = getCurrentCajaId();
    const cajero = getCurrentUserId();
    return Boolean(turnoId && ownerCaja && ownerUser && ownerCaja === caja && ownerUser === cajero);
}

function buildShiftSalesStorageKey() {
    const caja = getCurrentCajaId();
    const cajero = getCurrentUserId();
    const turnoId = String(localStorage.getItem('turno_id_actual') || '').trim();
    if (!caja || !cajero || !turnoId) return null;
    return `turno_has_sales_${caja}_${cajero}_${turnoId}`;
}

function setLocalShiftHasSales(hasSales) {
    const key = buildShiftSalesStorageKey();
    if (!key) return;
    localStorage.setItem(key, hasSales ? '1' : '0');
}

function localShiftHasSales() {
    const key = buildShiftSalesStorageKey();
    if (!key) return false;
    return localStorage.getItem(key) === '1';
}

function ensureLocalShiftSalesFlagInitialized() {
    const key = buildShiftSalesStorageKey();
    if (!key) return;
    if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, '0');
    }
}

function clearLocalShiftContext() {
    localStorage.removeItem('turno_monto_inicial');
    clearCartState();
    clearPendingTicketsStateForCurrentShift();
    clearTicketCounterForCurrentShift();
    clearPendingTicketCounterSync();
    localStorage.removeItem('turno_id_actual');
    localStorage.removeItem('ticket_seed_shift_id');
    localStorage.removeItem(SHIFT_OWNER_CAJA_KEY);
    localStorage.removeItem(SHIFT_OWNER_USER_KEY);
}

async function fetchServerTicketCounter() {
    const caja = String(localStorage.getItem('n_caja') || localStorage.getItem('caja') || '').trim();
    const cajero = String(localStorage.getItem('id_user') || '').trim();
    if (!caja || !cajero) return null;
    const query = new URLSearchParams({ caja, cajero });
    const preferredMode = localStorage.getItem(TICKET_COUNTER_API_MODE_KEY) || 'legacy';
    if (preferredMode === 'v2') {
        try {
            const response = await fetch(API_URL + `api/ticket-counter?${query.toString()}`, {
                headers: withAuthHeaders(),
            });
            const data = await response.json().catch(() => ({}));
            if (response.ok) {
                localStorage.setItem(TICKET_COUNTER_API_MODE_KEY, 'v2');
                const numeroActual = Number(data?.numero_actual);
                return Number.isFinite(numeroActual) && numeroActual > 0 ? Math.floor(numeroActual) : null;
            }
        } catch (_) {
            return null;
        }
    }
    return null;
}

async function persistServerTicketCounter(nextTicketNumber) {
    const caja = String(localStorage.getItem('n_caja') || localStorage.getItem('caja') || '').trim();
    const cajero = String(localStorage.getItem('id_user') || '').trim();
    const turnoId = String(localStorage.getItem('turno_id_actual') || '').trim();
    const parsed = Number(nextTicketNumber);
    if (!caja || !cajero || !turnoId || !Number.isFinite(parsed) || parsed < 1) {
        return null;
    }

    const preferredMode = localStorage.getItem(TICKET_COUNTER_API_MODE_KEY) || 'legacy';
    if (preferredMode !== 'v2') {
        return Math.floor(parsed);
    }
    const response = await fetch(API_URL + 'api/ticket-counter', {
        method: 'PUT',
        headers: withAuthHeaders({
            'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
            caja,
            cajero,
            turno_id: turnoId,
            numero_actual: Math.floor(parsed),
        }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 404) {
        localStorage.setItem(TICKET_COUNTER_API_MODE_KEY, 'legacy');
        return Math.floor(parsed);
    }
    if (!response.ok) {
        return null;
    }
    localStorage.setItem(TICKET_COUNTER_API_MODE_KEY, 'v2');
    const numeroActual = Number(data?.numero_actual);
    return Number.isFinite(numeroActual) && numeroActual > 0 ? Math.floor(numeroActual) : null;
}

function scheduleShiftStatusRetry() {
    if (shiftValidationRetryTimer) return;
    shiftValidationRetryTimer = setTimeout(async () => {
        shiftValidationRetryTimer = null;
        await ensureShiftStartedOnLoad();
    }, 2500);
}

function buildCartStorageKey() {
    const caja = localStorage.getItem('n_caja') || localStorage.getItem('caja');
    const cajero = localStorage.getItem('id_user');
    const turnoId = localStorage.getItem('turno_id_actual') || 'sin_turno';
    if (!caja || !cajero) return null;
    return `cart_state_${caja}_${cajero}_${turnoId}`;
}

function persistCartState() {
    const key = buildCartStorageKey();
    if (!key) return;
    try {
        localStorage.setItem(key, JSON.stringify(cart || []));
    } catch (error) {
        console.error('No se pudo persistir carrito:', error);
    }
}

function normalizeCartStateItems(items) {
    return (Array.isArray(items) ? items : []).map((item) => ({
        ...item,
        quantity: Number(item.quantity || 0),
        precio_venta: Number(item.precio_venta || 0),
        line_subtotal: Number(item.line_subtotal || 0),
        is_common: Boolean(item.is_common),
    })).filter((item) => (item.id_producto || item.is_common) && item.quantity > 0);
}

function restoreCartState() {
    const key = buildCartStorageKey();
    if (!key) return;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        cart = normalizeCartStateItems(parsed);
    } catch (error) {
        console.error('No se pudo restaurar carrito:', error);
    }
}

function clearCartState() {
    const key = buildCartStorageKey();
    if (!key) return;
    localStorage.removeItem(key);
}

function buildPendingTicketsStorageKey() {
    const caja = localStorage.getItem('n_caja') || localStorage.getItem('caja');
    const cajero = localStorage.getItem('id_user');
    const turnoId = localStorage.getItem('turno_id_actual') || 'sin_turno';
    if (!caja || !cajero) return null;
    return `pending_tickets_${caja}_${cajero}_${turnoId}`;
}

function readPendingTicketsState() {
    const key = buildPendingTicketsStorageKey();
    if (!key) return [];
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map((row) => ({
            id: String(row?.id || ''),
            numero_ticket: Number(row?.numero_ticket || 0),
            created_at: String(row?.created_at || ''),
            cart: normalizeCartStateItems(row?.cart),
        })).filter((row) => row.id && row.numero_ticket > 0 && Array.isArray(row.cart) && row.cart.length > 0);
    } catch (_) {
        return [];
    }
}

function writePendingTicketsState(list) {
    const key = buildPendingTicketsStorageKey();
    if (!key) return;
    const normalized = (Array.isArray(list) ? list : []).map((row) => ({
        id: String(row?.id || ''),
        numero_ticket: Number(row?.numero_ticket || 0),
        created_at: String(row?.created_at || ''),
        cart: normalizeCartStateItems(row?.cart),
    })).filter((row) => row.id && row.numero_ticket > 0 && row.cart.length > 0);
    localStorage.setItem(key, JSON.stringify(normalized));
    renderPendingTicketsInlineStrip();
}

function clearPendingTicketsStateForCurrentShift() {
    const key = buildPendingTicketsStorageKey();
    if (!key) return;
    localStorage.removeItem(key);
    renderPendingTicketsInlineStrip();
}

function getDisplayedTicketNumber() {
    const ticketEl = document.getElementById('nticket');
    const parsed = Number(ticketEl?.textContent || 0);
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
    return getStoredTicketCounter() || 1;
}

function setDisplayedTicketNumber(ticketNumber) {
    const ticketEl = document.getElementById('nticket');
    const parsed = Number(ticketNumber);
    const normalized = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
    if (ticketEl) ticketEl.textContent = String(normalized);
    return normalized;
}

function calculateTicketTotalFromCartSnapshot(items) {
    return (Array.isArray(items) ? items : []).reduce((sum, item) => {
        return sum + getCartItemSubtotalAmount(item);
    }, 0);
}

function formatPendingTicketDate(value) {
    const dt = new Date(String(value || ''));
    if (!Number.isFinite(dt.getTime())) return '-';
    return dt.toLocaleString('es-CL');
}

function createPendingTicketId() {
    return `pt_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function getNextAvailableSalesTicketNumber(pendingTickets = []) {
    const maxPending = (Array.isArray(pendingTickets) ? pendingTickets : []).reduce((acc, row) => {
        const value = Number(row?.numero_ticket || 0);
        if (!Number.isFinite(value) || value <= 0) return acc;
        return Math.max(acc, Math.floor(value));
    }, 0);
    const currentTicket = getDisplayedTicketNumber();
    const storedTicket = Number(getStoredTicketCounter() || 0);
    return Math.max(1, currentTicket, storedTicket, maxPending) + 1;
}

function renderPendingTicketsInlineStrip() {
    const strip = document.querySelector('#sales .sales-pending-inline-strip');
    const track = document.getElementById('sales-pending-ticket-strip');
    if (!track) return;

    const pendingTickets = readPendingTicketsState();
    const ordered = pendingTickets
        .slice()
        .sort((a, b) => Number(a.numero_ticket || 0) - Number(b.numero_ticket || 0));

    track.innerHTML = '';
    if (!ordered.length) {
        if (strip) strip.classList.add('hidden');
        return;
    }
    if (strip) strip.classList.remove('hidden');

    ordered.forEach((row) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sales-pending-tab';
        btn.textContent = `Ticket N° ${Number(row.numero_ticket || 0)}`;
        btn.title = `Ticket ${Number(row.numero_ticket || 0)} | ${formatPendingTicketDate(row.created_at)}`;
        btn.addEventListener('click', () => {
            resumePendingTicketById(row.id);
        });
        track.appendChild(btn);
    });
}

function renderPendingTicketsPopupList() {
    const body = document.getElementById('pending-tickets-body');
    if (!body) return;
    const pendingTickets = readPendingTicketsState();
    renderPendingTicketsInlineStrip();
    body.innerHTML = '';

    if (!pendingTickets.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.style.textAlign = 'center';
        cell.textContent = 'No hay tickets pendientes.';
        row.appendChild(cell);
        body.appendChild(row);
        return;
    }

    pendingTickets
        .slice()
        .sort((a, b) => Number(a.numero_ticket || 0) - Number(b.numero_ticket || 0))
        .forEach((row) => {
            const tr = document.createElement('tr');

            const ticketCell = document.createElement('td');
            ticketCell.textContent = String(Number(row.numero_ticket || 0));
            tr.appendChild(ticketCell);

            const productsCell = document.createElement('td');
            productsCell.textContent = String(Array.isArray(row.cart) ? row.cart.length : 0);
            tr.appendChild(productsCell);

            const totalCell = document.createElement('td');
            totalCell.textContent = `$${calculateTicketTotalFromCartSnapshot(row.cart).toFixed(0)}`;
            tr.appendChild(totalCell);

            const dateCell = document.createElement('td');
            dateCell.textContent = formatPendingTicketDate(row.created_at);
            tr.appendChild(dateCell);

            const actionCell = document.createElement('td');
            actionCell.style.textAlign = 'center';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn2 quick-action-btn';
            btn.textContent = 'Retomar';
            btn.addEventListener('click', () => {
                resumePendingTicketById(row.id);
            });
            actionCell.appendChild(btn);
            tr.appendChild(actionCell);

            body.appendChild(tr);
        });
}

function openPendingTicketsPopup() {
    renderPendingTicketsPopupList();
    const popupId = 'pendingTicketsPopUp';
    if (typeof mostrarPopUp === 'function') {
        mostrarPopUp(popupId);
    } else {
        document.getElementById(popupId)?.classList.remove('hidden');
    }
}

function closePendingTicketsPopup() {
    const popupId = 'pendingTicketsPopUp';
    if (typeof cerrarPopUp === 'function') {
        cerrarPopUp(popupId);
    } else {
        document.getElementById(popupId)?.classList.add('hidden');
    }
    focusBarcodeInputForNextScan();
}

async function leaveCurrentTicketAsPending() {
    if (!shiftStarted) {
        await ensureShiftStartedOnLoad();
        if (!shiftStarted) {
            alert('Debes iniciar turno antes de dejar tickets pendientes.');
            return;
        }
    }
    if (!Array.isArray(cart) || cart.length === 0) {
        alert('El carrito está vacío. Agrega productos antes de dejar un ticket pendiente.');
        return;
    }

    const currentTicket = getDisplayedTicketNumber();
    const pendingTickets = readPendingTicketsState();
    const newPendingRow = {
        id: createPendingTicketId(),
        numero_ticket: currentTicket,
        created_at: new Date().toISOString(),
        cart: normalizeCartStateItems(cart),
    };

    const updatedPending = [newPendingRow, ...pendingTickets.filter((row) => Number(row.numero_ticket || 0) !== currentTicket)];
    writePendingTicketsState(updatedPending);

    const nextTicket = getNextAvailableSalesTicketNumber(updatedPending);
    setDisplayedTicketNumber(nextTicket);
    setStoredTicketCounter(nextTicket);
    setPendingTicketCounterSync(nextTicket);

    cart = [];
    selectedCartIndex = -1;
    clearPaymentWarning();
    updateCartUI();
    resetPaymentInputs();
    focusBarcodeInputForNextScan();

    if (typeof window.appAlert === 'function') {
        await window.appAlert(`Ticket ${currentTicket} guardado como pendiente. Nuevo ticket activo: ${nextTicket}.`, 'success', {
            title: 'Ticket pendiente',
            okText: 'Entendido',
        });
    } else {
        alert(`Ticket ${currentTicket} guardado como pendiente. Nuevo ticket activo: ${nextTicket}.`);
    }
}

async function resumePendingTicketById(pendingId) {
    const pendingTickets = readPendingTicketsState();
    const index = pendingTickets.findIndex((row) => String(row.id) === String(pendingId || ''));
    if (index < 0) {
        alert('No se encontró el ticket pendiente seleccionado.');
        renderPendingTicketsPopupList();
        return;
    }

    const pending = pendingTickets[index];
    let remaining = pendingTickets.filter((_, idx) => idx !== index);

    const currentCartSnapshot = normalizeCartStateItems(cart);
    if (currentCartSnapshot.length > 0) {
        const currentTicket = getDisplayedTicketNumber();
        const autoPendingRow = {
            id: createPendingTicketId(),
            numero_ticket: currentTicket,
            created_at: new Date().toISOString(),
            cart: currentCartSnapshot,
        };
        remaining = [
            autoPendingRow,
            ...remaining.filter((row) => Number(row.numero_ticket || 0) !== currentTicket),
        ];
    }
    writePendingTicketsState(remaining);

    cart = normalizeCartStateItems(pending.cart);
    selectedCartIndex = -1;
    setDisplayedTicketNumber(pending.numero_ticket);
    clearPaymentWarning();
    updateCartUI();
    resetPaymentInputs();
    closePendingTicketsPopup();
    focusBarcodeInputForNextScan();
}

function parseStoredBoolean(key) {
    return localStorage.getItem(key) === 'true';
}

const USER_PERMISSION_DEFAULTS = {
    ventas_producto_comun: 1,
    ventas_aplicar_mayoreo: 0,
    ventas_aplicar_descuento: 0,
    ventas_historial: 1,
    ventas_entrada_efectivo: 1,
    ventas_salida_efectivo: 1,
    ventas_cobrar_ticket: 1,
    ventas_cobrar_credito: 0,
    ventas_cancelar_ticket: 0,
    ventas_eliminar_articulo: 0,
    ventas_facturar: 0,
    ventas_pago_servicio: 0,
    ventas_recarga_electronica: 0,
    ventas_buscar_producto: 1,
    clientes_admin: 0,
    clientes_asignar_venta: 0,
    clientes_credito_admin: 0,
    clientes_ver_cuentas: 0,
    productos_crear: 0,
    productos_modificar: 0,
    productos_eliminar: 0,
    productos_reporte_ventas: 0,
    productos_crear_promociones: 0,
    productos_modificar_varios: 0,
    inventario_agregar_mercancia: 0,
    inventario_reportes_existencia: 0,
    inventario_movimientos: 0,
    inventario_ajustar: 0,
    corte_turno: 1,
    corte_todos_turnos: 0,
    corte_dia: 0,
    corte_ver_ganancia_dia: 0,
    configuracion_acceso: 0,
    reportes_ver: 0,
    compras_crear_orden: 0,
    compras_recibir_orden: 0,
};

function readUserPermissions() {
    const raw = localStorage.getItem('user_permissions');
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        const merged = { ...USER_PERMISSION_DEFAULTS };
        Object.keys(merged).forEach((key) => {
            merged[key] = Number(parsed?.[key] || 0) === 1 ? 1 : 0;
        });
        return merged;
    } catch (_) {
        return null;
    }
}

function hasUserPermission(permissionKey) {
    if (!permissionKey) return true;
    const permissions = readUserPermissions();
    if (!permissions) return true;
    return Number(permissions[permissionKey] || 0) === 1;
}

function setVisibilityByPermission(element, allowed, mode = 'disable') {
    if (!element) return;
    if (mode === 'hide') {
        element.style.display = allowed ? '' : 'none';
        return;
    }
    if ('disabled' in element) {
        element.disabled = !allowed;
    }
    element.style.opacity = allowed ? '' : '0.65';
    element.style.pointerEvents = allowed ? '' : '';
}

function setSectionNavAccessState(element, allowed) {
    if (!element) return;
    // Debe quedar clickeable para permitir elevacion puntual con credenciales admin.
    if ('disabled' in element) {
        element.disabled = false;
    }
    element.style.display = '';
    element.style.opacity = allowed ? '' : '0.65';
    element.style.pointerEvents = '';
    element.dataset.sectionLocked = allowed ? '0' : '1';
    if (!allowed) {
        element.title = 'Requiere autorización de administrador';
    } else if (element.title === 'Requiere autorización de administrador') {
        element.title = '';
    }
}

function applyUserPermissionsToUI() {
    const permissions = readUserPermissions();
    if (!permissions) return;

    document.querySelectorAll('[data-permission-key]').forEach((element) => {
        const permissionKey = element.dataset.permissionKey || '';
        const mode = element.dataset.permissionMode || 'disable';
        const allowed = Number(permissions[permissionKey] || 0) === 1;
        setVisibilityByPermission(element, allowed, mode);
    });

    const hasAnyProductPermission =
        permissions.productos_crear ||
        permissions.productos_modificar ||
        permissions.productos_eliminar ||
        permissions.productos_reporte_ventas ||
        permissions.productos_crear_promociones ||
        permissions.productos_modificar_varios;
    setSectionNavAccessState(document.getElementById('nav-product-btn'), Boolean(hasAnyProductPermission));

    const hasAnyInventoryPermission =
        permissions.inventario_agregar_mercancia ||
        permissions.inventario_reportes_existencia ||
        permissions.inventario_movimientos ||
        permissions.inventario_ajustar;
    setSectionNavAccessState(document.getElementById('nav-inventory-btn'), Boolean(hasAnyInventoryPermission));

    const hasAnyShoppingPermission = permissions.compras_crear_orden || permissions.compras_recibir_orden;
    setSectionNavAccessState(document.getElementById('nav-shopping-btn'), Boolean(hasAnyShoppingPermission));

    setSectionNavAccessState(document.getElementById('nav-configuration-btn'), Boolean(permissions.configuracion_acceso));
    setSectionNavAccessState(document.getElementById('nav-reports-btn'), Boolean(permissions.reportes_ver));
    setSectionNavAccessState(document.getElementById('nav-cut-btn'), Boolean(permissions.corte_turno || permissions.corte_dia || permissions.corte_todos_turnos));
}

function applyShiftInitialAmountUI(amount) {
    const cutInitialInput = document.getElementById('cut-initial-amount');
    if (!cutInitialInput) return;
    const normalized = Number(amount || 0);
    cutInitialInput.value = Number.isFinite(normalized) ? normalized.toFixed(2) : '0.00';
    cutInitialInput.readOnly = true;
}

function refreshCutCloseButtonState() {
    const closeBtn = document.getElementById('cut-close-shift-btn');
    const printBtn = document.getElementById('cut-print-session-btn');
    if (!closeBtn && !printBtn) return;
    const canCloseTurn = hasUserPermission('corte_turno');
    const shouldShowClose = Boolean(cutCloseContext.sessionResumenLoaded);
    const shouldShowPrint = shouldShowClose || Number(cutCloseContext.historicalCutId || 0) > 0;

    if (closeBtn) {
        closeBtn.classList.toggle('hidden', !shouldShowClose);
        closeBtn.disabled = !canCloseTurn || !shouldShowClose;
    }
    if (printBtn) {
        const isHistorical = Number(cutCloseContext.historicalCutId || 0) > 0 && !shouldShowClose;
        printBtn.innerHTML = `<i class="fas fa-print" aria-hidden="true"></i> ${isHistorical ? 'Reimprimir corte' : 'Imprimir reporte'}`;
        printBtn.classList.toggle('hidden', !shouldShowPrint);
        printBtn.disabled = !canCloseTurn || !shouldShowPrint;
    }
}

function getCurrentCutCashierLabel() {
    const profileRaw = localStorage.getItem('user_profile');
    let profile = {};
    try {
        profile = profileRaw ? JSON.parse(profileRaw) : {};
    } catch (_) {
        profile = {};
    }
    const cajeroId = String(localStorage.getItem('id_user') || '').trim();
    const name = String(profile?.nombre || profile?.username_login || '').trim();
    if (name) return name;
    if (cajeroId) return `Cajero ${cajeroId}`;
    return 'Cajero';
}

function formatCutDateForHeader(dateValue) {
    const raw = String(dateValue || '').trim().slice(0, 10);
    const matched = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!matched) return '--/--/----';
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const year = matched[1];
    const monthIndex = Number(matched[2]) - 1;
    const day = matched[3];
    const monthLabel = months[monthIndex] || matched[2];
    return `${day}/${monthLabel}/${year}`;
}

function parseCutDateTimeForHeader(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value;
    }
    const raw = String(value || '').trim();
    if (!raw) return null;
    const normalized = raw.includes(' ') && !raw.includes('T')
        ? raw.replace(' ', 'T')
        : raw;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed;
}

function formatCutTimeForHeader(timeValue) {
    const parsedDate = parseCutDateTimeForHeader(timeValue);
    if (parsedDate) {
        const hour24 = parsedDate.getHours();
        const minute = String(parsedDate.getMinutes()).padStart(2, '0');
        const suffix = hour24 >= 12 ? 'pm' : 'am';
        const hour12 = ((hour24 + 11) % 12) + 1;
        return `${hour12}:${minute} ${suffix}`;
    }

    const raw = String(timeValue || '').trim();
    if (!raw) return '--:--';
    const match = raw.match(/(\d{2}):(\d{2})/);
    if (!match) return '--:--';
    const hour24 = Number(match[1]);
    const minute = match[2];
    if (!Number.isFinite(hour24)) return '--:--';
    const suffix = hour24 >= 12 ? 'pm' : 'am';
    const hour12 = ((hour24 + 11) % 12) + 1;
    return `${hour12}:${minute} ${suffix}`;
}

function buildCutHistoryTimeRange(startValue, endValue) {
    const start = formatCutTimeForHeader(startValue);
    const end = formatCutTimeForHeader(endValue);
    if (start !== '--:--' || end !== '--:--') {
        return `${start} - ${end}`;
    }
    return '--:-- - --:--';
}

function updateCutHeadline(context = {}) {
    const cashierBtn = document.getElementById('cut-header-cashier-btn');
    const dateBtn = document.getElementById('cut-header-date-btn');
    const timeEl = document.getElementById('cut-header-time');
    if (!cashierBtn || !dateBtn || !timeEl) return;

    const cashierName = String(context.cashierName || getCurrentCutCashierLabel()).trim() || 'Cajero';
    const dateIso = String(context.dateIso || cutCloseContext.currentDate || new Date().toISOString().slice(0, 10)).trim();
    const startTime = String(context.startTime || '').trim();
    const endTime = String(context.endTime || '').trim();
    const statusText = String(context.statusText || '').trim();

    cashierBtn.textContent = cashierName;
    dateBtn.textContent = formatCutDateForHeader(dateIso);

    let timeText = `De ${formatCutTimeForHeader(startTime)} a ${formatCutTimeForHeader(endTime)}`;
    if (statusText) {
        timeText += ` | ${statusText}`;
    }
    timeEl.textContent = timeText;
}

function updateCutSessionContext(context = {}) {
    const contextEl = document.getElementById('cut-session-context');
    if (!contextEl) return;

    const shouldShow = Boolean(context.visible);
    if (!shouldShow) {
        contextEl.classList.add('hidden');
        return;
    }

    contextEl.classList.remove('hidden');
}

function parseCutHistoryIsoDate(value) {
    const normalized = String(value || '').trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        return normalized;
    }
    return '';
}

function canViewAllCutHistory() {
    return hasUserPermission('corte_todos_turnos') || isSessionAdminSiaUser();
}

function getCutHistoryDateFilterValue() {
    const input = document.getElementById('cut-history-date-filter');
    const value = parseCutHistoryIsoDate(input?.value);
    if (value) return value;
    return cutCloseContext.currentDate || new Date().toISOString().slice(0, 10);
}

function getCutHistoryRangeEnabledValue() {
    return Boolean(document.getElementById('cut-history-range-enabled')?.checked);
}

function getCutHistoryPeriodFilters() {
    const singleInput = document.getElementById('cut-history-date-filter');
    const fromInput = document.getElementById('cut-history-date-from-filter');
    const toInput = document.getElementById('cut-history-date-to-filter');
    const fallbackDate = cutCloseContext.currentDate || new Date().toISOString().slice(0, 10);
    const singleDate = parseCutHistoryIsoDate(singleInput?.value) || fallbackDate;
    const rangeEnabled = getCutHistoryRangeEnabledValue();

    if (!rangeEnabled) {
        return {
            desde: singleDate,
            hasta: singleDate,
            rangeEnabled: false,
        };
    }

    let desde = parseCutHistoryIsoDate(fromInput?.value) || singleDate;
    let hasta = parseCutHistoryIsoDate(toInput?.value) || desde;
    if (desde > hasta) {
        const temp = desde;
        desde = hasta;
        hasta = temp;
        if (fromInput) fromInput.value = desde;
        if (toInput) toInput.value = hasta;
    }

    return {
        desde,
        hasta,
        rangeEnabled: true,
    };
}

function buildCutHistoryPeriodLabel(period = {}) {
    const desde = parseCutHistoryIsoDate(period.desde);
    const hasta = parseCutHistoryIsoDate(period.hasta);
    if (!desde || !hasta) return '--/--/----';
    if (desde === hasta) return formatCutDateForHeader(desde);
    return `${formatCutDateForHeader(desde)} al ${formatCutDateForHeader(hasta)}`;
}

function syncCutHistoryDateModeUI() {
    const singleRow = document.getElementById('cut-history-single-date-row');
    const fromRow = document.getElementById('cut-history-range-from-row');
    const toRow = document.getElementById('cut-history-range-to-row');
    const singleInput = document.getElementById('cut-history-date-filter');
    const fromInput = document.getElementById('cut-history-date-from-filter');
    const toInput = document.getElementById('cut-history-date-to-filter');
    const rangeEnabled = getCutHistoryRangeEnabledValue();
    const defaultDate = getCutHistoryDateFilterValue();

    if (rangeEnabled) {
        if (singleRow) singleRow.classList.add('hidden');
        if (fromRow) fromRow.classList.remove('hidden');
        if (toRow) toRow.classList.remove('hidden');
        if (fromInput && !parseCutHistoryIsoDate(fromInput.value)) {
            fromInput.value = defaultDate;
        }
        if (toInput && !parseCutHistoryIsoDate(toInput.value)) {
            toInput.value = parseCutHistoryIsoDate(fromInput?.value) || defaultDate;
        }
    } else {
        if (singleRow) singleRow.classList.remove('hidden');
        if (fromRow) fromRow.classList.add('hidden');
        if (toRow) toRow.classList.add('hidden');
        const fromDate = parseCutHistoryIsoDate(fromInput?.value);
        if (singleInput && fromDate) {
            singleInput.value = fromDate;
        }
    }
}

function getCutHistoryBoxFilterValue() {
    const select = document.getElementById('cut-history-box-filter');
    return String(select?.value || '').trim();
}

function getCutHistoryCashierFilterValue() {
    const select = document.getElementById('cut-history-cashier-filter');
    return String(select?.value || '').trim();
}

async function fetchCutHistoryRowsForPopup(desdeIso, hastaIso, requestedBox = '', requestedCashier = '') {
    const query = new URLSearchParams({ desde: desdeIso, hasta: hastaIso });
    const boxId = String(requestedBox || '').trim();
    const cashierId = String(requestedCashier || '').trim();
    if (boxId) {
        query.set('caja', boxId);
    }
    if (cashierId) {
        query.set('cajero', cashierId);
    }

    const response = await fetch(API_URL + `api/corte/historial?${query.toString()}`, {
        headers: withAuthHeaders(),
    });
    const data = await response.json().catch(() => []);
    if (!response.ok || !Array.isArray(data)) {
        throw new Error(data?.message || 'No se pudo cargar historial de cortes');
    }
    return data;
}

async function loadCutHistoryBoxFilterOptions() {
    const boxFilter = document.getElementById('cut-history-box-filter');
    if (!boxFilter) return;

    const previous = String(boxFilter.value || '').trim();
    boxFilter.innerHTML = '<option value="">Todas</option>';
    const availableBoxes = new Set();

    try {
        const response = await fetch(API_URL + 'api/getCajas', {
            headers: withAuthHeaders(),
        });
        const payload = await response.json().catch(() => []);
        const rows = Array.isArray(payload) ? payload : [];
        rows.forEach((row) => {
            const id = String(row?.n_caja || row?.caja_id || '').trim();
            if (!id || availableBoxes.has(id)) return;
            availableBoxes.add(id);
            const option = document.createElement('option');
            option.value = id;
            option.textContent = row?.nombre_caja ? `${row.nombre_caja} (${id})` : `Caja ${id}`;
            boxFilter.appendChild(option);
        });
    } catch (_) {
        // Conserva al menos la opcion "Todas" y la caja local en fallback.
    }

    const localBox = String(localStorage.getItem('n_caja') || localStorage.getItem('caja') || '').trim();
    if (localBox && !availableBoxes.has(localBox)) {
        const option = document.createElement('option');
        option.value = localBox;
        option.textContent = `Caja ${localBox}`;
        boxFilter.appendChild(option);
        availableBoxes.add(localBox);
    }

    if (previous && availableBoxes.has(previous)) {
        boxFilter.value = previous;
    }
}

async function loadCutHistoryCashierFilterOptions(period = null, requestedBox = '') {
    const cashierRow = document.getElementById('cut-history-cashier-row');
    const cashierFilter = document.getElementById('cut-history-cashier-filter');
    if (!cashierFilter) return;

    const allowAllCashiers = canViewAllCutHistory();
    if (!allowAllCashiers) {
        if (cashierRow) cashierRow.classList.add('hidden');
        cashierFilter.innerHTML = '<option value="">Todos</option>';
        return;
    }

    if (cashierRow) cashierRow.classList.remove('hidden');
    const currentPeriod = period && period.desde && period.hasta ? period : getCutHistoryPeriodFilters();
    const currentBox = String(requestedBox || getCutHistoryBoxFilterValue()).trim();
    const previous = String(cashierFilter.value || '').trim();
    cashierFilter.innerHTML = '<option value="">Todos</option>';

    const cashierMap = new Map();
    try {
        const rows = await fetchCutHistoryRowsForPopup(currentPeriod.desde, currentPeriod.hasta, currentBox, '');
        rows.forEach((row) => {
            const id = String(row?.usuario_id || '').trim();
            if (!id || cashierMap.has(id)) return;
            const name = String(row?.cajero_nombre || '').trim() || `Usuario ${id}`;
            cashierMap.set(id, name);
        });
    } catch (_) {
        // Si falla esta carga, mantenemos al menos "Todos" para no bloquear busqueda.
    }

    Array.from(cashierMap.entries())
        .sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'es'))
        .forEach(([id, name]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `${name} (${id})`;
            cashierFilter.appendChild(option);
        });

    if (previous && cashierMap.has(previous)) {
        cashierFilter.value = previous;
    } else {
        cashierFilter.value = '';
    }
}

function writeCutListValues(listId, values, emptyText) {
    const list = document.getElementById(listId);
    if (!list) return;
    list.innerHTML = '';
    const rows = Array.isArray(values) ? values : [];
    if (!rows.length) {
        const li = document.createElement('li');
        li.textContent = emptyText;
        list.appendChild(li);
        return;
    }
    rows.forEach((value) => {
        const li = document.createElement('li');
        li.textContent = value;
        list.appendChild(li);
    });
}

function formatCutReferenceCurrency(value) {
    return `$${Number(value || 0).toFixed(0)}`;
}

function formatCutReferenceCount(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return '';
    }
    const rounded = Math.round(parsed);
    return rounded === 1 ? '1 venta' : `${rounded} ventas`;
}

function formatCutReferenceCountSuffix(value) {
    const countText = formatCutReferenceCount(value);
    return countText ? ` (${countText})` : '';
}

function writeCutReferenceText(id, text) {
    const node = document.getElementById(id);
    if (!node) return;
    node.textContent = String(text || '');
}

function renderCutReferenceSummaryValues(values = {}) {
    const cashMain = Number(values.cashMain || 0);
    const cardMain = Number(values.cardMain || 0);
    const transferMain = Number(values.transferMain || 0);
    const mixedTotal = Number(values.mixedTotal || 0);
    const mixedCash = Number(values.mixedCash || 0);
    const mixedCard = Number(values.mixedCard || 0);
    const entryTotal = Number(values.entryTotal || 0);
    const exitTotal = Number(values.exitTotal || 0);
    const cashTotal = Number(values.cashTotal || 0);
    const cardTotal = Number(values.cardTotal || 0);
    const transferTotal = Number(values.transferTotal || 0);

    writeCutReferenceText(
        'cut-ref-cash-main',
        `Efectivo: ${formatCutReferenceCurrency(cashMain)}${formatCutReferenceCountSuffix(values.cashMainTx)}`
    );
    writeCutReferenceText(
        'cut-ref-card-main',
        `Tarjeta: ${formatCutReferenceCurrency(cardMain)}${formatCutReferenceCountSuffix(values.cardMainTx)}`
    );
    writeCutReferenceText(
        'cut-ref-transfer-main',
        `Transferencia: ${formatCutReferenceCurrency(transferMain)}${formatCutReferenceCountSuffix(values.transferMainTx)}`
    );
    writeCutReferenceText(
        'cut-ref-mixed-main',
        `Mixto: ${formatCutReferenceCurrency(mixedTotal)}${formatCutReferenceCountSuffix(values.mixedTx)}`
    );
    writeCutReferenceText(
        'cut-ref-mixed-cash',
        `Efectivo: ${formatCutReferenceCurrency(mixedCash)}`
    );
    writeCutReferenceText(
        'cut-ref-mixed-card',
        `Tarjeta: ${formatCutReferenceCurrency(mixedCard)}`
    );
    writeCutReferenceText(
        'cut-ref-entry-total',
        `Entradas efectivo: +${formatCutReferenceCurrency(entryTotal)}`
    );
    writeCutReferenceText(
        'cut-ref-exit-total',
        `Salidas efectivo: -${formatCutReferenceCurrency(exitTotal)}`
    );
    writeCutReferenceText(
        'cut-ref-cash-total',
        formatCutReferenceCurrency(cashTotal)
    );
    writeCutReferenceText(
        'cut-ref-card-total',
        formatCutReferenceCurrency(cardTotal)
    );
    writeCutReferenceText(
        'cut-ref-transfer-total',
        formatCutReferenceCurrency(transferTotal)
    );
}

function applyHistoricalCutToView(row) {
    const selected = row || {};
    const totalVentas = Number(selected.total_ventas || 0);
    const transacciones = Number(selected.transacciones || 0);
    const montoInicial = Number(selected.monto_inicial || 0);
    const montoDeclarado = Number(selected.monto_declarado || 0);
    const diferencia = Number(selected.diferencia_efectivo || 0);
    const totalEfectivo = Number(selected.total_efectivo || 0);
    const totalTarjetaRaw = Number(selected.total_tarjeta || 0);
    const totalTransferencia = Number(selected.total_transferencia || 0);
    const totalTarjeta = totalTransferencia > 0 && totalTarjetaRaw >= totalTransferencia
        ? (totalTarjetaRaw - totalTransferencia)
        : totalTarjetaRaw;
    const totalMixto = Number(selected.total_mixto || 0);
    const estado = String(selected.estado || 'cerrado').trim() || 'cerrado';
    const dateIso = String(selected.fecha || cutCloseContext.currentDate || new Date().toISOString().slice(0, 10)).trim();
    const cutId = Number(selected.id_corte || 0);

    updateCutHeadline({
        cashierName: String(selected.cajero_nombre || getCurrentCutCashierLabel()).trim(),
        dateIso,
        startTime: selected.hora_apertura || '',
        endTime: selected.hora_cierre || '',
        statusText: estado === 'cerrado' ? 'Turno cerrado' : 'Turno abierto',
    });
    updateCutSessionContext({ visible: false });

    const cutSummary = document.getElementById('cut-summary');
    const cutBreakdown = document.getElementById('cut-breakdown');
    const salesKpi = document.getElementById('cut-kpi-sales-total');
    const profitKpi = document.getElementById('cut-kpi-profit-total');
    const departmentTotal = document.getElementById('cut-department-total');
    if (cutSummary) {
        cutSummary.textContent = `Corte historico #${cutId || '-'} | ${transacciones.toFixed(0)} ventas | Total $${totalVentas.toFixed(0)}`;
    }
    renderCutReferenceSummaryValues({
        cashMain: totalEfectivo,
        cashMainTx: null,
        cardMain: totalTarjeta,
        cardMainTx: null,
        transferMain: totalTransferencia,
        transferMainTx: null,
        mixedTotal: totalMixto,
        mixedTx: null,
        mixedCash: 0,
        mixedCard: 0,
        cashTotal: totalEfectivo,
        cashTotalTx: null,
        cardTotal: totalTarjeta,
        cardTotalTx: null,
        transferTotal: totalTransferencia,
        transferTotalTx: null,
    });
    if (cutBreakdown) {
        cutBreakdown.innerHTML = '';
    }
    if (salesKpi) {
        salesKpi.textContent = `$${totalVentas.toFixed(0)}`;
    }
    if (profitKpi) {
        profitKpi.textContent = '$0';
    }

    writeCutListValues(
        'cut-cash-detail-list',
        [
            `Fondo de caja: $${montoInicial.toFixed(0)}`,
            `Ventas en efectivo: $${totalEfectivo.toFixed(0)}`,
            `Ventas mixtas: $${totalMixto.toFixed(0)}`,
            `Monto declarado: $${montoDeclarado.toFixed(0)}`,
            `Diferencia: ${diferencia >= 0 ? '+' : ''}$${diferencia.toFixed(0)}`,
        ],
        'Sin datos de caja para este corte.'
    );

    const cashTotal = document.getElementById('cut-cash-total');
    if (cashTotal) {
        cashTotal.textContent = `Total en corte: $${totalVentas.toFixed(0)}`;
    }

    writeCutListValues(
        'cut-profit-detail-list',
        [
            `En efectivo: $${totalEfectivo.toFixed(0)}`,
            `Con tarjeta credito/debito: $${totalTarjeta.toFixed(0)}`,
            `Ventas mixtas: $${totalMixto.toFixed(0)}`,
            `Devoluciones: -$0`,
        ],
        'Sin datos de ventas para este corte.'
    );
    const profitTotal = document.getElementById('cut-profit-total');
    if (profitTotal) {
        profitTotal.textContent = `Total ventas: $${totalVentas.toFixed(0)}`;
    }

    writeCutListValues('cut-session-income-list', [], 'Detalle de ingresos no disponible en corte historico.');
    writeCutListValues('cut-session-expense-list', [], 'Detalle de salidas no disponible en corte historico.');
    writeCutListValues('cut-mixed-summary-list', [], 'Desglose mixto no disponible en corte historico.');
    const mixedSummaryTotal = document.getElementById('cut-mixed-summary-total');
    if (mixedSummaryTotal) {
        mixedSummaryTotal.textContent = '';
    }
    writeCutListValues('cut-department-list', [], 'Desglose por departamento no disponible en corte historico.');
    if (departmentTotal) {
        departmentTotal.textContent = '';
    }
    writeCutListValues('cut-mixed-ticket-list', [], 'Detalle mixto por ticket no disponible en corte historico.');
    const mixedTicketTotal = document.getElementById('cut-mixed-ticket-total');
    if (mixedTicketTotal) {
        mixedTicketTotal.textContent = '';
    }
    writeCutListValues('cut-top-products-by-department', [], 'Top de productos no disponible en corte historico.');

    const scopeInfo = document.getElementById('cut-close-scope-info');
    const breakdownList = document.getElementById('cut-close-breakdown');
    const detailBody = document.getElementById('cut-close-detail-body');
    if (scopeInfo) {
        scopeInfo.textContent = `Mostrando corte historico #${cutId || '-'} del ${formatCutDateForHeader(dateIso)}.`;
    }
    if (breakdownList) {
        breakdownList.innerHTML = '';
        const li = document.createElement('li');
        li.textContent = `Cajero: ${String(selected.cajero_nombre || '').trim() || '-'} | Caja: ${selected.caja_id || '-'}`;
        breakdownList.appendChild(li);
    }
    if (detailBody) {
        detailBody.innerHTML = '';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dateIso}</td>
            <td>${cutId ? `Corte #${cutId}` : 'Corte'}</td>
            <td>${estado}</td>
            <td style="text-align:right;">${totalVentas.toFixed(0)}</td>
        `;
        detailBody.appendChild(tr);
    }

    cutCloseContext.scope = null;
    cutCloseContext.resumenLoaded = false;
    cutCloseContext.sessionResumenLoaded = false;
    cutCloseContext.esperadoEfectivo = 0;
    cutCloseContext.esperadoTarjeta = 0;
    cutCloseContext.currentDate = dateIso;
    cutCloseContext.sessionReportSnapshot = null;
    cutCloseContext.historicalCutId = cutId > 0 ? cutId : null;
    refreshCutCloseButtonState();
}

function renderCutHistoryPopupRows(rows) {
    const body = document.getElementById('cut-history-body');
    if (!body) return;
    body.innerHTML = '';

    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="7" style="text-align:center;">No hay cortes para los filtros seleccionados.</td>';
        body.appendChild(tr);
        return;
    }

    list.forEach((row, index) => {
        const tr = document.createElement('tr');
        const actionId = `cut-history-open-${index}`;
        tr.innerHTML = `
            <td>${row.caja_id || '-'}</td>
            <td>${row.cajero_nombre || '-'}</td>
            <td>${formatCutDateForHeader(row.fecha || '')}</td>
            <td>${buildCutHistoryTimeRange(row.hora_apertura, row.hora_cierre)}</td>
            <td style="text-align:right;">$${Number(row.total_ventas || 0).toFixed(0)}</td>
            <td>${row.estado || '-'}</td>
            <td style="text-align:center;"><button id="${actionId}" type="button" class="btn cut-btn-ghost">Ver</button></td>
        `;
        body.appendChild(tr);
        const btn = document.getElementById(actionId);
        if (btn) {
            btn.addEventListener('click', () => {
                applyHistoricalCutToView(cutHistoryContext.rows[index] || row);
                closeCutHistoryPopup();
            });
        }
    });
}

async function reloadCutHistoryPopupData() {
    const msg = document.getElementById('cut-history-msg');
    const boxFilter = document.getElementById('cut-history-box-filter');
    const cashierFilter = document.getElementById('cut-history-cashier-filter');
    const period = getCutHistoryPeriodFilters();
    const boxId = String(boxFilter?.value || '').trim();
    const cashierId = canViewAllCutHistory() ? String(cashierFilter?.value || '').trim() : '';
    const periodLabel = buildCutHistoryPeriodLabel(period);

    if (msg) msg.textContent = 'Cargando cortes...';
    try {
        const rows = await fetchCutHistoryRowsForPopup(period.desde, period.hasta, boxId, cashierId);
        cutHistoryContext.rows = rows;
        renderCutHistoryPopupRows(rows);
        if (msg) {
            msg.textContent = rows.length
                ? `Se encontraron ${rows.length} corte(s) para ${periodLabel}.`
                : `Sin resultados para ${periodLabel}.`;
        }
    } catch (error) {
        cutHistoryContext.rows = [];
        renderCutHistoryPopupRows([]);
        if (msg) msg.textContent = error.message || 'No se pudo cargar historial de cortes.';
    }
}

function closeCutHistoryPopup() {
    const overlay = document.getElementById('cut-history-popup');
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.style.display = '';
}

function ensureCutHistoryPopupBindings() {
    if (window.__cutHistoryPopupInit) return;
    window.__cutHistoryPopupInit = true;

    const dateFilter = document.getElementById('cut-history-date-filter');
    const dateFromFilter = document.getElementById('cut-history-date-from-filter');
    const dateToFilter = document.getElementById('cut-history-date-to-filter');
    const rangeToggle = document.getElementById('cut-history-range-enabled');
    const boxFilter = document.getElementById('cut-history-box-filter');
    const cashierFilter = document.getElementById('cut-history-cashier-filter');
    const refreshPopupByFilters = async () => {
        const period = getCutHistoryPeriodFilters();
        const boxId = getCutHistoryBoxFilterValue();
        await loadCutHistoryCashierFilterOptions(period, boxId);
        await reloadCutHistoryPopupData();
    };
    if (dateFilter) {
        dateFilter.addEventListener('change', async () => {
            if (getCutHistoryRangeEnabledValue()) return;
            await refreshPopupByFilters();
        });
    }
    if (dateFromFilter) {
        dateFromFilter.addEventListener('change', async () => {
            if (!getCutHistoryRangeEnabledValue()) return;
            await refreshPopupByFilters();
        });
    }
    if (dateToFilter) {
        dateToFilter.addEventListener('change', async () => {
            if (!getCutHistoryRangeEnabledValue()) return;
            await refreshPopupByFilters();
        });
    }
    if (rangeToggle) {
        rangeToggle.addEventListener('change', async () => {
            syncCutHistoryDateModeUI();
            await refreshPopupByFilters();
        });
    }
    if (boxFilter) {
        boxFilter.addEventListener('change', async () => {
            await loadCutHistoryCashierFilterOptions(getCutHistoryPeriodFilters(), getCutHistoryBoxFilterValue());
            await reloadCutHistoryPopupData();
        });
    }
    if (cashierFilter) {
        cashierFilter.addEventListener('change', async () => {
            await reloadCutHistoryPopupData();
        });
    }
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        const overlay = document.getElementById('cut-history-popup');
        if (!overlay || overlay.classList.contains('hidden')) return;
        closeCutHistoryPopup();
    });
}

async function openCutHistoryPopup(mode = 'cashier') {
    const overlay = document.getElementById('cut-history-popup');
    const dateFilter = document.getElementById('cut-history-date-filter');
    const dateFromFilter = document.getElementById('cut-history-date-from-filter');
    const dateToFilter = document.getElementById('cut-history-date-to-filter');
    const rangeToggle = document.getElementById('cut-history-range-enabled');
    const msg = document.getElementById('cut-history-msg');
    if (!overlay || !dateFilter) return;

    cutHistoryContext.mode = String(mode || 'cashier');
    ensureCutHistoryPopupBindings();

    const defaultDate = cutCloseContext.currentDate || new Date().toISOString().slice(0, 10);
    dateFilter.value = defaultDate;
    if (dateFromFilter) dateFromFilter.value = defaultDate;
    if (dateToFilter) dateToFilter.value = defaultDate;
    if (rangeToggle) rangeToggle.checked = false;
    syncCutHistoryDateModeUI();

    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    if (msg) msg.textContent = 'Cargando cortes...';

    try {
        await loadCutHistoryBoxFilterOptions();
        const currentBox = getCutHistoryBoxFilterValue();
        if (!currentBox) {
            const localBox = String(localStorage.getItem('n_caja') || localStorage.getItem('caja') || '').trim();
            const boxFilter = document.getElementById('cut-history-box-filter');
            if (boxFilter && localBox && boxFilter.querySelector(`option[value="${localBox}"]`)) {
                boxFilter.value = localBox;
            }
        }
        await loadCutHistoryCashierFilterOptions(getCutHistoryPeriodFilters(), getCutHistoryBoxFilterValue());
        await reloadCutHistoryPopupData();
    } catch (error) {
        cutHistoryContext.rows = [];
        renderCutHistoryPopupRows([]);
        if (msg) msg.textContent = error.message || 'No se pudo cargar historial de cortes.';
    }
}

function getCutRebuildFiltersFromUI() {
    const today = new Date().toISOString().slice(0, 10);
    const fromDateInput = document.getElementById('cut-rebuild-from-date');
    const toDateInput = document.getElementById('cut-rebuild-to-date');
    const fromTimeInput = document.getElementById('cut-rebuild-from-time');
    const toTimeInput = document.getElementById('cut-rebuild-to-time');
    const boxFilter = document.getElementById('cut-rebuild-box-filter');
    const cashierFilter = document.getElementById('cut-rebuild-cashier-filter');
    const turnFilter = document.getElementById('cut-rebuild-turn-filter');

    const fromDate = String(fromDateInput?.value || cutCloseContext.currentDate || today).trim();
    const toDate = String(toDateInput?.value || fromDate || today).trim();
    const fromTime = String(fromTimeInput?.value || '00:00').trim() || '00:00';
    const toTime = String(toTimeInput?.value || '23:59').trim() || '23:59';
    const caja = String(boxFilter?.value || '').trim();
    const cajero = String(cashierFilter?.value || '').trim();
    const turno = String(turnFilter?.value || '').trim();

    return {
        desde: fromDate,
        hasta: toDate,
        hora_desde: fromTime,
        hora_hasta: toTime,
        caja,
        cajero,
        turno,
    };
}

function getCutRebuildSelectedSaleIds() {
    return Array.from(cutRebuildContext.selectedSaleIds)
        .map((value) => Number(value || 0))
        .filter((value) => Number.isFinite(value) && value > 0);
}

function getCutRebuildSelectedCutIds() {
    return Array.from(cutRebuildContext.selectedCutIds)
        .map((value) => Number(value || 0))
        .filter((value) => Number.isFinite(value) && value > 0);
}

function invalidateCutRebuildPersistState() {
    cutRebuildContext.persistedCutId = null;
    cutRebuildContext.persistedSignature = '';
}

function buildCutRebuildPersistSignature() {
    const saleIds = getCutRebuildSelectedSaleIds().sort((a, b) => a - b);
    const cutIds = getCutRebuildSelectedCutIds().sort((a, b) => a - b);
    const keeperCutId = Number(cutRebuildContext.keeperCutId || 0) || 0;
    return `${saleIds.join(',')}|${cutIds.join(',')}|${keeperCutId}`;
}

function setCutRebuildMessage(message, warning = false) {
    const msg = document.getElementById('cut-rebuild-msg');
    if (!msg) return;
    msg.textContent = String(message || '');
    msg.classList.toggle('cut-rebuild-warning', Boolean(warning));
}

function setCutRebuildCutsMessage(message, warning = false) {
    const msg = document.getElementById('cut-rebuild-cuts-msg');
    if (!msg) return;
    msg.textContent = String(message || '');
    msg.classList.toggle('cut-rebuild-warning', Boolean(warning));
}

function formatCutRebuildSaleDateTime(value) {
    const raw = String(value || '').trim();
    if (!raw) return '-';
    const parsed = new Date(raw.replace(' ', 'T'));
    if (!Number.isNaN(parsed.getTime())) {
        const day = String(parsed.getDate()).padStart(2, '0');
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const year = parsed.getFullYear();
        const hour = String(parsed.getHours()).padStart(2, '0');
        const minute = String(parsed.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hour}:${minute}`;
    }
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    if (match) {
        return `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}`;
    }
    return raw;
}

function announceCutRebuildSelectionStatus() {
    const salesCount = cutRebuildContext.selectedSaleIds.size;
    const cutsCount = cutRebuildContext.selectedCutIds.size;
    const hasPersistedCut = Number(cutRebuildContext.persistedCutId || 0) > 0;
    if (!salesCount) {
        setCutRebuildMessage('Selecciona una o mas ventas para continuar.', false);
        return;
    }
    if (!hasPersistedCut) {
        setCutRebuildMessage(
            `Ventas seleccionadas: ${salesCount}. Pulsa "Generar corte" y completa la configuracion final.`,
            false
        );
        return;
    }
    if (!cutsCount) {
        setCutRebuildMessage(
            `Ventas seleccionadas: ${salesCount}. Corte final #${cutRebuildContext.persistedCutId} listo para imprimir.`,
            false
        );
        return;
    }
    setCutRebuildMessage(
        `Ventas seleccionadas: ${salesCount} | Cortes elegidos: ${cutsCount} | Conservar: #${cutRebuildContext.keeperCutId || '-'}.`,
        false
    );
}

function updateCutRebuildActionButtons() {
    const mergeBtn = document.getElementById('cut-rebuild-merge-btn');
    const printBtn = document.getElementById('cut-rebuild-print-btn');
    const cutsGenerateBtn = document.getElementById('cut-rebuild-cuts-generate-btn');
    const cutsGeneratePrintBtn = document.getElementById('cut-rebuild-cuts-generate-print-btn');
    const cutsPreviewPrintBtn = document.getElementById('cut-rebuild-cuts-preview-print-btn');
    const selectedCount = cutRebuildContext.selectedSaleIds.size;
    const hasPersistedCut = Number(cutRebuildContext.persistedCutId || 0) > 0;
    if (mergeBtn) {
        mergeBtn.disabled = selectedCount < 1;
    }
    if (printBtn) {
        printBtn.disabled = selectedCount < 1 || !hasPersistedCut;
    }
    if (cutsGenerateBtn) {
        cutsGenerateBtn.disabled = selectedCount < 1;
    }
    if (cutsGeneratePrintBtn) {
        cutsGeneratePrintBtn.disabled = selectedCount < 1;
    }
    if (cutsPreviewPrintBtn) {
        cutsPreviewPrintBtn.disabled = selectedCount < 1;
    }
}

function renderCutRebuildRows(rows = []) {
    const body = document.getElementById('cut-rebuild-body');
    const selectAll = document.getElementById('cut-rebuild-sale-select-all');
    if (!body) return;
    body.innerHTML = '';

    const list = Array.isArray(rows) ? rows : [];
    const validSaleIds = new Set(
        list
            .map((row) => Number(row?.id_venta || 0))
            .filter((id) => Number.isFinite(id) && id > 0)
    );
    cutRebuildContext.selectedSaleIds = new Set(
        Array.from(cutRebuildContext.selectedSaleIds).filter((id) => validSaleIds.has(Number(id || 0)))
    );
    if (!list.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="9" style="text-align:center;">No hay ventas para los filtros seleccionados.</td>';
        body.appendChild(tr);
        if (selectAll) {
            selectAll.checked = false;
            selectAll.indeterminate = false;
            selectAll.disabled = true;
        }
        updateCutRebuildActionButtons();
        return;
    }

    list.forEach((row) => {
        const saleId = Number(row?.id_venta || 0);
        const checked = cutRebuildContext.selectedSaleIds.has(saleId);
        const hasAssociatedCut = Boolean(row?.tiene_corte_asociado || Number(row?.turno_id || 0) > 0);
        const associatedCutId = Number(row?.turno_id || 0) || null;
        const associatedCutLabel = hasAssociatedCut
            ? `Con corte${associatedCutId ? ` #${associatedCutId}` : ''}`
            : 'Sin corte asociado';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align:center;">
                <input type="checkbox" data-cut-rebuild-sale-select="${saleId}" ${checked ? 'checked' : ''}>
            </td>
            <td>${formatCutRebuildSaleDateTime(row?.fecha)}</td>
            <td>${row?.numero_ticket || '-'}</td>
            <td>${row?.caja_id || '-'}</td>
            <td>${row?.cajero_nombre || '-'}</td>
            <td style="text-align:right;">#${Number(row?.turno_id || 0) || '-'}</td>
            <td style="text-align:center;">
                <input class="cut-rebuild-linked-check" type="checkbox" disabled ${hasAssociatedCut ? 'checked' : ''} title="${associatedCutLabel}">
            </td>
            <td>${row?.metodo_pago || '-'}</td>
            <td style="text-align:right;">$${formatMoney(row?.total || 0)}</td>
        `;
        body.appendChild(tr);
    });

    body.querySelectorAll('input[data-cut-rebuild-sale-select]').forEach((input) => {
        input.addEventListener('change', (event) => {
            const saleId = Number(event.target?.getAttribute('data-cut-rebuild-sale-select') || 0);
            if (!saleId) return;
            if (event.target.checked) {
                cutRebuildContext.selectedSaleIds.add(saleId);
            } else {
                cutRebuildContext.selectedSaleIds.delete(saleId);
            }
            invalidateCutRebuildPersistState();
            renderCutRebuildRows(cutRebuildContext.sales);
            announceCutRebuildSelectionStatus();
        });
    });

    if (selectAll) {
        const selectedCount = list.filter((row) => cutRebuildContext.selectedSaleIds.has(Number(row?.id_venta || 0))).length;
        selectAll.disabled = list.length < 1;
        selectAll.checked = list.length > 0 && selectedCount === list.length;
        selectAll.indeterminate = selectedCount > 0 && selectedCount < list.length;
        selectAll.onchange = (event) => {
            if (event.target.checked) {
                list.forEach((row) => {
                    const saleId = Number(row?.id_venta || 0);
                    if (saleId > 0) {
                        cutRebuildContext.selectedSaleIds.add(saleId);
                    }
                });
            } else {
                list.forEach((row) => {
                    const saleId = Number(row?.id_venta || 0);
                    if (saleId > 0) {
                        cutRebuildContext.selectedSaleIds.delete(saleId);
                    }
                });
            }
            invalidateCutRebuildPersistState();
            renderCutRebuildRows(cutRebuildContext.sales);
            announceCutRebuildSelectionStatus();
        };
    }

    updateCutRebuildActionButtons();
}

function selectAllCutRebuildSales() {
    const list = Array.isArray(cutRebuildContext.sales) ? cutRebuildContext.sales : [];
    if (!list.length) {
        setCutRebuildMessage('No hay ventas disponibles para seleccionar.', false);
        return;
    }
    list.forEach((row) => {
        const saleId = Number(row?.id_venta || 0);
        if (saleId > 0) {
            cutRebuildContext.selectedSaleIds.add(saleId);
        }
    });
    invalidateCutRebuildPersistState();
    renderCutRebuildRows(cutRebuildContext.sales);
    announceCutRebuildSelectionStatus();
}

function clearCutRebuildSalesSelection() {
    if (!cutRebuildContext.selectedSaleIds.size) {
        setCutRebuildMessage('No hay ventas seleccionadas para limpiar.', false);
        return;
    }
    cutRebuildContext.selectedSaleIds = new Set();
    invalidateCutRebuildPersistState();
    renderCutRebuildRows(cutRebuildContext.sales);
    announceCutRebuildSelectionStatus();
}

function renderCutRebuildCutPickerRows(rows = []) {
    const body = document.getElementById('cut-rebuild-cuts-body');
    if (!body) return;
    body.innerHTML = '';

    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="10" style="text-align:center;">No hay cortes previos para este cajero/caja en el periodo. Si continuas se creara un corte nuevo.</td>';
        body.appendChild(tr);
        return;
    }

    list.forEach((row) => {
        const cutId = Number(row?.id_corte || 0);
        const checked = cutRebuildContext.selectedCutIds.has(cutId);
        const keeper = checked && Number(cutRebuildContext.keeperCutId || 0) === cutId;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align:center;">
                <input type="checkbox" data-cut-rebuild-select="${cutId}" ${checked ? 'checked' : ''}>
            </td>
            <td style="text-align:center;">
                <input type="radio" name="cut-rebuild-keeper" data-cut-rebuild-keeper="${cutId}" ${keeper ? 'checked' : ''} ${checked ? '' : 'disabled'}>
            </td>
            <td style="text-align:right;">#${cutId || '-'}</td>
            <td>${formatCutDateForHeader(row?.fecha || '')}</td>
            <td>${buildCutHistoryTimeRange(row?.hora_apertura, row?.hora_cierre)}</td>
            <td>${row?.caja_id || '-'}</td>
            <td>${row?.cajero_nombre || '-'}</td>
            <td>${row?.estado || '-'}</td>
            <td style="text-align:right;">${Number(row?.transacciones || 0)}</td>
            <td style="text-align:right;">$${formatMoney(row?.total_ventas || 0)}</td>
        `;
        body.appendChild(tr);
    });

    body.querySelectorAll('input[data-cut-rebuild-select]').forEach((input) => {
        input.addEventListener('change', (event) => {
            const cutId = Number(event.target?.getAttribute('data-cut-rebuild-select') || 0);
            if (!cutId) return;
            if (event.target.checked) {
                cutRebuildContext.selectedCutIds.add(cutId);
                if (!cutRebuildContext.keeperCutId || !cutRebuildContext.selectedCutIds.has(Number(cutRebuildContext.keeperCutId))) {
                    cutRebuildContext.keeperCutId = cutId;
                }
            } else {
                cutRebuildContext.selectedCutIds.delete(cutId);
                if (Number(cutRebuildContext.keeperCutId || 0) === cutId) {
                    cutRebuildContext.keeperCutId = cutRebuildContext.selectedCutIds.size
                        ? Number(Array.from(cutRebuildContext.selectedCutIds)[0] || 0)
                        : null;
                }
            }
            invalidateCutRebuildPersistState();
            renderCutRebuildCutPickerRows(rows);
            const selectedCount = cutRebuildContext.selectedCutIds.size;
            if (!selectedCount) {
                setCutRebuildCutsMessage('No seleccionaste cortes previos. Se creara un corte nuevo al aplicar.', false);
            } else {
                setCutRebuildCutsMessage(`Cortes seleccionados: ${selectedCount}. Conservando #${cutRebuildContext.keeperCutId || '-'}.`, false);
            }
        });
    });

    body.querySelectorAll('input[data-cut-rebuild-keeper]').forEach((input) => {
        input.addEventListener('change', (event) => {
            const cutId = Number(event.target?.getAttribute('data-cut-rebuild-keeper') || 0);
            if (!cutId || !cutRebuildContext.selectedCutIds.has(cutId)) return;
            cutRebuildContext.keeperCutId = cutId;
            invalidateCutRebuildPersistState();
            renderCutRebuildCutPickerRows(rows);
            setCutRebuildCutsMessage(`Conservaras el corte #${cutId}.`, false);
        });
    });
}

function getCutRebuildCandidateCutsForContext(context) {
    const selectedDateSet = new Set(
        (Array.isArray(context?.dateSet) ? context.dateSet : [])
            .map((value) => String(value || '').trim())
            .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    );
    return (Array.isArray(cutRebuildContext.cuts) ? cutRebuildContext.cuts : [])
        .filter((row) => (
            Number(row?.usuario_id || 0) === Number(context?.userId || 0)
            && Number(row?.caja_id || 0) === Number(context?.boxId || 0)
            && (
                selectedDateSet.size < 1
                || selectedDateSet.has(String(row?.fecha || '').trim().slice(0, 10))
            )
        ));
}

function syncCutRebuildSelectedCutsForCandidateCuts(candidateCuts = []) {
    const validCutIds = new Set(
        candidateCuts.map((row) => Number(row?.id_corte || 0)).filter((id) => id > 0)
    );
    cutRebuildContext.selectedCutIds = new Set(
        Array.from(cutRebuildContext.selectedCutIds).filter((id) => validCutIds.has(Number(id || 0)))
    );
    if (!cutRebuildContext.selectedCutIds.has(Number(cutRebuildContext.keeperCutId || 0))) {
        cutRebuildContext.keeperCutId = cutRebuildContext.selectedCutIds.size
            ? Number(Array.from(cutRebuildContext.selectedCutIds)[0] || 0)
            : null;
    }
}

function renderCutRebuildCutsPopupForContext(context) {
    const candidateCuts = getCutRebuildCandidateCutsForContext(context);
    syncCutRebuildSelectedCutsForCandidateCuts(candidateCuts);
    renderCutRebuildCutPickerRows(candidateCuts);
    if (!candidateCuts.length) {
        setCutRebuildCutsMessage('No hay cortes previos en la seleccion. Si aplicas, se creara un corte nuevo.', false);
    } else if (!cutRebuildContext.selectedCutIds.size) {
        setCutRebuildCutsMessage(
            `Cortes disponibles: ${candidateCuts.length}. Selecciona los que quieras unificar o deja vacio para crear uno nuevo.`,
            false
        );
    } else {
        setCutRebuildCutsMessage(
            `Cortes seleccionados: ${cutRebuildContext.selectedCutIds.size}. Conservando #${cutRebuildContext.keeperCutId || '-'}.`,
            false
        );
    }
    return candidateCuts;
}

async function loadCutRebuildFilterOptions() {
    const boxFilter = document.getElementById('cut-rebuild-box-filter');
    const cashierFilter = document.getElementById('cut-rebuild-cashier-filter');
    if (!boxFilter || !cashierFilter) return;

    const previousBox = String(boxFilter.value || '').trim();
    const previousCashier = String(cashierFilter.value || '').trim();

    const [boxesResult, usersResult] = await Promise.allSettled([
        fetch(API_URL + 'api/getCajas', {
            headers: withAuthHeaders(),
        }),
        fetch(API_URL + 'api/usuarios', {
            headers: withAuthHeaders(),
        }),
    ]);

    boxFilter.innerHTML = '<option value="">Todas</option>';
    if (boxesResult.status === 'fulfilled') {
        const rows = await boxesResult.value.json().catch(() => []);
        const list = Array.isArray(rows) ? rows : [];
        list.forEach((row) => {
            const id = String(row?.n_caja || row?.caja_id || '').trim();
            if (!id) return;
            const option = document.createElement('option');
            option.value = id;
            option.textContent = row?.nombre_caja ? `${row.nombre_caja} (${id})` : `Caja ${id}`;
            boxFilter.appendChild(option);
        });
    }
    if (previousBox) boxFilter.value = previousBox;

    cashierFilter.innerHTML = '<option value="">Todos</option>';
    if (usersResult.status === 'fulfilled') {
        const rows = await usersResult.value.json().catch(() => []);
        const list = Array.isArray(rows) ? rows : [];
        list.forEach((row) => {
            const id = String(row?.id || '').trim();
            if (!id) return;
            const option = document.createElement('option');
            option.value = id;
            const login = String(row?.user || '').trim();
            const name = String(row?.nombre || '').trim() || `Usuario ${id}`;
            option.textContent = login ? `${name} (${login})` : `${name} (${id})`;
            cashierFilter.appendChild(option);
        });
    }
    if (previousCashier) cashierFilter.value = previousCashier;
}

function ensureCutRebuildPopupBindings() {
    if (window.__cutRebuildPopupInit) return;
    window.__cutRebuildPopupInit = true;

    const overlay = document.getElementById('cut-rebuild-popup');
    if (overlay) {
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                closeCutRebuildPopup();
            }
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        const cutsPopup = document.getElementById('cut-rebuild-cuts-popup');
        if (cutsPopup && !cutsPopup.classList.contains('hidden')) {
            closeCutRebuildCutsPopup();
            return;
        }
        const popup = document.getElementById('cut-rebuild-popup');
        if (!popup || popup.classList.contains('hidden')) return;
        closeCutRebuildPopup();
    });
}

function ensureCutRebuildCutsPopupBindings() {
    if (window.__cutRebuildCutsPopupInit) return;
    window.__cutRebuildCutsPopupInit = true;

    const overlay = document.getElementById('cut-rebuild-cuts-popup');
    if (overlay) {
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                closeCutRebuildCutsPopup();
            }
        });
    }

    ['cut-rebuild-output-from-date', 'cut-rebuild-output-from-time', 'cut-rebuild-output-to-date', 'cut-rebuild-output-to-time', 'cut-rebuild-output-caja', 'cut-rebuild-output-cajero'].forEach((id) => {
        const input = document.getElementById(id);
        if (!input) return;
        const handler = () => {
            invalidateCutRebuildPersistState();
            updateCutRebuildActionButtons();
            setCutRebuildCutsMessage('Se detectaron cambios. Presiona "Generar corte" para guardar la configuracion.', false);
        };
        input.addEventListener('change', handler);
        input.addEventListener('input', handler);
    });
}

function getSelectedCutRebuildSalesContext() {
    const selectedRows = cutRebuildContext.sales.filter((row) => {
        const id = Number(row?.id_venta || 0);
        return cutRebuildContext.selectedSaleIds.has(id);
    });
    if (!selectedRows.length) {
        return { ok: false, message: 'Selecciona al menos una venta.' };
    }
    const userIds = Array.from(new Set(
        selectedRows.map((row) => Number(row?.usuario_id || 0)).filter((id) => id > 0)
    ));
    const boxIds = Array.from(new Set(
        selectedRows.map((row) => Number(row?.caja_id || 0)).filter((id) => id > 0)
    ));
    const dateSet = Array.from(new Set(
        selectedRows
            .map((row) => String(row?.fecha || '').trim().slice(0, 10))
            .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    )).sort();
    if (userIds.length !== 1 || boxIds.length !== 1) {
        return {
            ok: false,
            message: 'Las ventas seleccionadas deben ser del mismo cajero y misma caja.',
        };
    }
    return {
        ok: true,
        userId: userIds[0],
        boxId: boxIds[0],
        dateIso: dateSet[0] || new Date().toISOString().slice(0, 10),
        dateSet,
        rows: selectedRows,
    };
}

function applyCutRebuildOutputDefaults(context) {
    const fromDateInput = document.getElementById('cut-rebuild-output-from-date');
    const fromTimeInput = document.getElementById('cut-rebuild-output-from-time');
    const toDateInput = document.getElementById('cut-rebuild-output-to-date');
    const toTimeInput = document.getElementById('cut-rebuild-output-to-time');
    const cajaInput = document.getElementById('cut-rebuild-output-caja');
    const cajeroInput = document.getElementById('cut-rebuild-output-cajero');
    if (!fromDateInput || !fromTimeInput || !toDateInput || !toTimeInput || !cajaInput || !cajeroInput) return;

    const rows = Array.isArray(context?.rows) ? context.rows : [];
    const parsedTimes = rows
        .map((row) => new Date(String(row?.fecha || '').replace(' ', 'T')))
        .filter((dt) => !Number.isNaN(dt.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

    const first = parsedTimes[0] || null;
    const last = parsedTimes[parsedTimes.length - 1] || first || null;
    const fallbackDate = String(context?.dateIso || '').trim() || new Date().toISOString().slice(0, 10);

    const fromDate = first ? first.toISOString().slice(0, 10) : fallbackDate;
    const fromHour = first ? String(first.getHours()).padStart(2, '0') : '00';
    const fromMinute = first ? String(first.getMinutes()).padStart(2, '0') : '00';
    const toDate = last ? last.toISOString().slice(0, 10) : fromDate;
    const toHour = last ? String(last.getHours()).padStart(2, '0') : '23';
    const toMinute = last ? String(last.getMinutes()).padStart(2, '0') : '59';

    fromDateInput.value = fromDate;
    fromTimeInput.value = `${fromHour}:${fromMinute}`;
    toDateInput.value = toDate;
    toTimeInput.value = `${toHour}:${toMinute}`;

    const boxFilter = document.getElementById('cut-rebuild-box-filter');
    const cashierFilter = document.getElementById('cut-rebuild-cashier-filter');
    const sourceBoxOptions = boxFilter ? Array.from(boxFilter.options) : [];
    const sourceCashierOptions = cashierFilter ? Array.from(cashierFilter.options) : [];

    cajaInput.innerHTML = '<option value="">Seleccionar caja</option>';
    sourceBoxOptions.forEach((opt) => {
        const value = String(opt?.value || '').trim();
        if (!value) return;
        const option = document.createElement('option');
        option.value = value;
        option.textContent = String(opt?.textContent || `Caja ${value}`).trim();
        cajaInput.appendChild(option);
    });
    const preferredBox = String(context?.boxId || boxFilter?.value || '').trim();
    if (preferredBox && cajaInput.querySelector(`option[value="${preferredBox}"]`)) {
        cajaInput.value = preferredBox;
    }

    cajeroInput.innerHTML = '<option value="">Seleccionar cajero</option>';
    sourceCashierOptions.forEach((opt) => {
        const value = String(opt?.value || '').trim();
        if (!value) return;
        const option = document.createElement('option');
        option.value = value;
        option.textContent = String(opt?.textContent || `Usuario ${value}`).trim();
        cajeroInput.appendChild(option);
    });
    const preferredCashier = String(context?.userId || cashierFilter?.value || '').trim();
    if (preferredCashier && cajeroInput.querySelector(`option[value="${preferredCashier}"]`)) {
        cajeroInput.value = preferredCashier;
    }
}

function getCutRebuildOutputConfigFromUI() {
    const fromDateInput = document.getElementById('cut-rebuild-output-from-date');
    const fromTimeInput = document.getElementById('cut-rebuild-output-from-time');
    const toDateInput = document.getElementById('cut-rebuild-output-to-date');
    const toTimeInput = document.getElementById('cut-rebuild-output-to-time');
    const cajaInput = document.getElementById('cut-rebuild-output-caja');
    const cajeroInput = document.getElementById('cut-rebuild-output-cajero');

    const cutFromDate = String(fromDateInput?.value || '').trim();
    const cutFromTime = String(fromTimeInput?.value || '').trim();
    const cutToDate = String(toDateInput?.value || '').trim();
    const cutToTime = String(toTimeInput?.value || '').trim();
    const cutCajaId = Number(cajaInput?.value || 0);
    const cutCajeroId = Number(cajeroInput?.value || 0);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(cutFromDate)) {
        return { ok: false, message: 'Debes indicar la fecha de inicio del corte.' };
    }
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(cutFromTime)) {
        return { ok: false, message: 'Debes indicar la hora de inicio del corte.' };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cutToDate)) {
        return { ok: false, message: 'Debes indicar la fecha de fin del corte.' };
    }
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(cutToTime)) {
        return { ok: false, message: 'Debes indicar la hora de fin del corte.' };
    }
    if (!Number.isFinite(cutCajaId) || cutCajaId < 1) {
        return { ok: false, message: 'Debes seleccionar la caja a asignar.' };
    }
    if (!Number.isFinite(cutCajeroId) || cutCajeroId < 1) {
        return { ok: false, message: 'Debes seleccionar el cajero a asignar.' };
    }

    const fromDateTime = `${cutFromDate} ${cutFromTime}:00`;
    const toDateTime = `${cutToDate} ${cutToTime}:59`;
    if (fromDateTime > toDateTime) {
        return { ok: false, message: 'La fecha/hora de inicio no puede ser mayor a la fecha/hora de fin.' };
    }

    return {
        ok: true,
        cut_from_date: cutFromDate,
        cut_from_time: cutFromTime,
        cut_to_date: cutToDate,
        cut_to_time: cutToTime,
        cut_caja_id: cutCajaId,
        cut_cajero_id: cutCajeroId,
    };
}

async function openCutRebuildPopup() {
    if (!isSessionAdminSiaUser()) {
        alert('Solo admin_sia puede acceder a reconstruccion de corte.');
        return;
    }
    const overlay = document.getElementById('cut-rebuild-popup');
    const fromDateInput = document.getElementById('cut-rebuild-from-date');
    const toDateInput = document.getElementById('cut-rebuild-to-date');
    const fromTimeInput = document.getElementById('cut-rebuild-from-time');
    const toTimeInput = document.getElementById('cut-rebuild-to-time');
    if (!overlay || !fromDateInput || !toDateInput || !fromTimeInput || !toTimeInput) return;

    ensureCutRebuildPopupBindings();
    ensureCutRebuildCutsPopupBindings();
    const now = new Date();
    const defaultToDate = now.toISOString().slice(0, 10);
    const defaultFromDate = new Date(now.getTime() - (6 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10);
    if (!fromDateInput.value && !toDateInput.value) {
        fromDateInput.value = defaultFromDate;
        toDateInput.value = defaultToDate;
    } else {
        if (!fromDateInput.value) fromDateInput.value = toDateInput.value || defaultFromDate;
        if (!toDateInput.value) toDateInput.value = fromDateInput.value || defaultToDate;
    }
    if (!fromTimeInput.value) fromTimeInput.value = '00:00';
    if (!toTimeInput.value) toTimeInput.value = '23:59';

    cutRebuildContext.selectedSaleIds = new Set();
    cutRebuildContext.selectedCutIds = new Set();
    cutRebuildContext.keeperCutId = null;
    invalidateCutRebuildPersistState();

    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    closeCutRebuildCutsPopup({ restoreMain: false });
    setCutRebuildMessage('Cargando opciones de filtro...', false);

    try {
        await loadCutRebuildFilterOptions();
        cutRebuildContext.filtersLoaded = true;
    } catch (_) {
        cutRebuildContext.filtersLoaded = false;
    }
    await runCutRebuildPreview({ preserveSelection: false });
}

function closeCutRebuildPopup() {
    const overlay = document.getElementById('cut-rebuild-popup');
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.style.display = 'none';
    closeCutRebuildCutsPopup({ restoreMain: false });
}

function closeCutRebuildCutsPopup(options = {}) {
    const restoreMain = options?.restoreMain !== false;
    const overlay = document.getElementById('cut-rebuild-cuts-popup');
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.style.display = 'none';
    if (!restoreMain) return;
    const mainOverlay = document.getElementById('cut-rebuild-popup');
    if (!mainOverlay) return;
    mainOverlay.classList.remove('hidden');
    mainOverlay.style.display = 'flex';
}

function openCutRebuildCutsPopup() {
    const context = getSelectedCutRebuildSalesContext();
    if (!context.ok) {
        setCutRebuildMessage(context.message, true);
        alert(context.message);
        return;
    }
    const overlay = document.getElementById('cut-rebuild-cuts-popup');
    if (!overlay) return;

    applyCutRebuildOutputDefaults(context);
    const mainOverlay = document.getElementById('cut-rebuild-popup');
    if (mainOverlay) {
        mainOverlay.classList.add('hidden');
        mainOverlay.style.display = 'none';
    }
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    renderCutRebuildCutsPopupForContext(context);
    updateCutRebuildActionButtons();
}

async function runCutRebuildPreview(options = {}) {
    const preserveSelection = Boolean(options?.preserveSelection);
    const filters = getCutRebuildFiltersFromUI();
    if (!filters.desde || !filters.hasta) {
        setCutRebuildMessage('Debes indicar desde y hasta para buscar.', true);
        return;
    }
    if (filters.desde > filters.hasta) {
        setCutRebuildMessage('Rango de fechas invalido: desde no puede ser mayor a hasta.', true);
        return;
    }
    const fromDateTime = `${filters.desde} ${filters.hora_desde || '00:00'}:00`;
    const toDateTime = `${filters.hasta} ${filters.hora_hasta || '23:59'}:59`;
    if (fromDateTime > toDateTime) {
        setCutRebuildMessage('Rango de fecha/hora invalido.', true);
        return;
    }

    const query = new URLSearchParams({
        desde: filters.desde,
        hasta: filters.hasta,
        hora_desde: filters.hora_desde,
        hora_hasta: filters.hora_hasta,
    });
    if (filters.caja) query.set('caja', filters.caja);
    if (filters.cajero) query.set('cajero', filters.cajero);
    if (filters.turno) query.set('turno', filters.turno);

    const previousSelectedSales = new Set(cutRebuildContext.selectedSaleIds);
    const previousSelectedCuts = new Set(cutRebuildContext.selectedCutIds);
    const previousKeeper = Number(cutRebuildContext.keeperCutId || 0) || null;

    setCutRebuildMessage('Buscando cortes y ventas para reconstruccion...', false);
    try {
        const response = await fetch(API_URL + `api/corte/rebuild-preview?${query.toString()}`, {
            headers: withAuthHeaders(),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data?.message || 'No se pudo cargar reconstruccion de cortes');
        }

        const cuts = Array.isArray(data?.cuts) ? data.cuts : [];
        const sales = Array.isArray(data?.sales) ? data.sales : [];
        cutRebuildContext.cuts = cuts;
        cutRebuildContext.sales = sales;
        const validCutIds = new Set(cuts.map((row) => Number(row?.id_corte || 0)).filter((id) => id > 0));
        const validSaleIds = new Set(sales.map((row) => Number(row?.id_venta || 0)).filter((id) => id > 0));
        if (preserveSelection) {
            cutRebuildContext.selectedSaleIds = new Set(
                Array.from(previousSelectedSales).filter((id) => validSaleIds.has(Number(id || 0)))
            );
            cutRebuildContext.selectedCutIds = new Set(
                Array.from(previousSelectedCuts).filter((id) => validCutIds.has(Number(id || 0)))
            );
            cutRebuildContext.keeperCutId = cutRebuildContext.selectedCutIds.has(previousKeeper)
                ? previousKeeper
                : Number(Array.from(cutRebuildContext.selectedCutIds)[0] || 0) || null;
        } else {
            cutRebuildContext.selectedSaleIds = new Set();
            cutRebuildContext.selectedCutIds = new Set();
            cutRebuildContext.keeperCutId = null;
        }
        invalidateCutRebuildPersistState();

        renderCutRebuildRows(sales);
        const totalTx = Number(data?.totals?.transacciones || 0);
        const totalAmount = Number(data?.totals?.total || 0);
        const selectedSales = cutRebuildContext.selectedSaleIds.size;
        if (!sales.length) {
            setCutRebuildMessage(
                `No hay ventas para esos filtros. Ventas filtradas: ${totalTx} | Total: $${formatMoney(totalAmount)}.`,
                false
            );
        } else {
            setCutRebuildMessage(
                `Ventas encontradas: ${sales.length} | Cortes detectados: ${cuts.length} | Total: $${formatMoney(totalAmount)} | Ventas seleccionadas: ${selectedSales}.`,
                false
            );
        }
    } catch (error) {
        cutRebuildContext.cuts = [];
        cutRebuildContext.sales = [];
        cutRebuildContext.selectedSaleIds = new Set();
        cutRebuildContext.selectedCutIds = new Set();
        cutRebuildContext.keeperCutId = null;
        invalidateCutRebuildPersistState();
        renderCutRebuildRows([]);
        setCutRebuildMessage(error.message || 'No se pudo consultar reconstruccion de corte.', true);
    }
}

async function refreshCutRebuildAfterPersist(options = {}) {
    const persistedCutId = Number(options?.keepCutId || cutRebuildContext.persistedCutId || 0) || null;
    const persistedSignature = String(cutRebuildContext.persistedSignature || '').trim();
    await runCutRebuildPreview({ preserveSelection: true });
    if (persistedCutId) {
        cutRebuildContext.persistedCutId = persistedCutId;
        if (persistedSignature) {
            cutRebuildContext.persistedSignature = persistedSignature;
        }
        if (!cutRebuildContext.selectedCutIds.size) {
            cutRebuildContext.selectedCutIds = new Set([persistedCutId]);
        }
        if (!cutRebuildContext.keeperCutId) {
            cutRebuildContext.keeperCutId = persistedCutId;
        }
    }
    const cutsOverlay = document.getElementById('cut-rebuild-cuts-popup');
    if (!cutsOverlay || cutsOverlay.classList.contains('hidden')) {
        updateCutRebuildActionButtons();
        return;
    }
    const context = getSelectedCutRebuildSalesContext();
    if (!context.ok) {
        setCutRebuildCutsMessage(context.message, true);
        updateCutRebuildActionButtons();
        return;
    }
    renderCutRebuildCutsPopupForContext(context);
    updateCutRebuildActionButtons();
}

async function persistCutRebuildSelection(options = {}) {
    if (!isSessionAdminSiaUser()) {
        throw new Error('Solo admin_sia puede unificar cortes.');
    }
    const showMessage = options?.showMessage !== false;
    const askConfirmation = options?.askConfirmation !== false;
    const selectedContext = getSelectedCutRebuildSalesContext();
    if (!selectedContext.ok) {
        throw new Error(selectedContext.message);
    }
    const saleIds = getCutRebuildSelectedSaleIds();
    if (!saleIds.length) {
        throw new Error('Selecciona al menos una venta.');
    }
    if (!document.getElementById('cut-rebuild-output-from-date')?.value) {
        applyCutRebuildOutputDefaults(selectedContext);
    }
    const outputConfig = getCutRebuildOutputConfigFromUI();
    if (!outputConfig.ok) {
        throw new Error(outputConfig.message);
    }

    const cutIds = getCutRebuildSelectedCutIds();
    const keeperCutId = cutIds.length
        ? (Number(cutRebuildContext.keeperCutId || cutIds[0] || 0) || Number(cutIds[0] || 0))
        : null;
    const currentSignature = `${buildCutRebuildPersistSignature()}|${outputConfig.cut_from_date}|${outputConfig.cut_from_time}|${outputConfig.cut_to_date}|${outputConfig.cut_to_time}|${outputConfig.cut_caja_id}|${outputConfig.cut_cajero_id}`;
    if (
        cutRebuildContext.persistedCutId
        && cutRebuildContext.persistedSignature
        && cutRebuildContext.persistedSignature === currentSignature
    ) {
        return Number(cutRebuildContext.persistedCutId || 0) || null;
    }

    if (askConfirmation) {
        let question = '';
        if (!cutIds.length) {
            question = `Se creara un corte nuevo de ${outputConfig.cut_from_date} ${outputConfig.cut_from_time} a ${outputConfig.cut_to_date} ${outputConfig.cut_to_time}.`;
        } else if (cutIds.length === 1) {
            question = `Se usara el corte #${keeperCutId} con tramo ${outputConfig.cut_from_date} ${outputConfig.cut_from_time} -> ${outputConfig.cut_to_date} ${outputConfig.cut_to_time}.`;
        } else {
            question = `Se unificaran ${cutIds.length} cortes y se conservara #${keeperCutId}. Tramo final: ${outputConfig.cut_from_date} ${outputConfig.cut_from_time} -> ${outputConfig.cut_to_date} ${outputConfig.cut_to_time}.`;
        }
        let confirmed = true;
        if (typeof window.appConfirm === 'function') {
            confirmed = await window.appConfirm(question, 'warning');
        } else {
            confirmed = window.confirm(question);
        }
        if (!confirmed) {
            throw new Error('Operacion cancelada por el usuario.');
        }
    }

    const filters = getCutRebuildFiltersFromUI();
    const payload = {
        ...filters,
        ...outputConfig,
        sale_ids: saleIds,
        cut_ids: cutIds,
    };
    if (keeperCutId) {
        payload.keep_cut_id = keeperCutId;
    }

    const mergeBtn = document.getElementById('cut-rebuild-merge-btn');
    const printBtn = document.getElementById('cut-rebuild-print-btn');
    if (mergeBtn) mergeBtn.disabled = true;
    if (printBtn) printBtn.disabled = true;

    try {
        const response = await fetch(API_URL + 'api/corte/merge', {
            method: 'POST',
            headers: {
                ...withAuthHeaders({
                    'Content-Type': 'application/json',
                }),
            },
            body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data?.message || 'No se pudo guardar la reconstruccion');
        }
        const finalKeep = Number(data?.keep_cut_id || keeperCutId || 0) || null;
        cutRebuildContext.selectedCutIds = finalKeep ? new Set([finalKeep]) : new Set();
        cutRebuildContext.keeperCutId = finalKeep;
        cutRebuildContext.persistedCutId = finalKeep;
        cutRebuildContext.persistedSignature = currentSignature;
        if (showMessage) {
            const movedSales = Number(data?.reassigned_sales || 0);
            const movedMovements = Number(data?.reassigned_movements || 0);
            const label = data?.created_new_cut
                ? `Corte nuevo #${finalKeep || '-'} creado.`
                : (data?.message || 'Reconstruccion aplicada.');
            setCutRebuildMessage(`${label} Ventas reasignadas: ${movedSales} | Movimientos reasignados: ${movedMovements}.`, false);
        }
        return finalKeep;
    } finally {
        updateCutRebuildActionButtons();
    }
}

async function confirmCutRebuildCutsSelection(options = {}) {
    const printAfter = Boolean(options?.printAfter);
    const keepOpen = options?.keepOpen !== false;
    try {
        const keepCutId = await persistCutRebuildSelection({ showMessage: true, askConfirmation: true });
        await refreshCutRebuildAfterPersist({ keepCutId });
        setCutRebuildCutsMessage(
            `Corte #${Number(keepCutId || 0) || '-'} actualizado. Puedes imprimirlo o seguir ajustando la configuracion.`,
            false
        );
        if (printAfter) {
            await printCutRebuildReport({ skipPersist: true, messageTarget: 'cuts' });
        }
        if (!keepOpen) {
            closeCutRebuildCutsPopup();
        }
    } catch (error) {
        if (String(error?.message || '').includes('cancelada')) {
            return;
        }
        setCutRebuildCutsMessage(error.message || 'No se pudo aplicar la seleccion.', true);
        alert(error.message || 'No se pudo aplicar la seleccion.');
    }
}

function mergeSelectedCuts() {
    openCutRebuildCutsPopup();
}

function buildCutRebuildPrintPayload({ selectedContext, saleIds, outputConfig, cutIds = [], keepCutId = null }) {
    const filters = getCutRebuildFiltersFromUI();
    const cajaRaw = String(localStorage.getItem('n_caja') || localStorage.getItem('caja') || '').trim();
    const normalizedCutIds = Array.from(new Set(
        (Array.isArray(cutIds) ? cutIds : [])
            .map((value) => Number(value || 0))
            .filter((value) => Number.isFinite(value) && value > 0)
    ));
    const keeperCutId = Number(keepCutId || 0) || null;
    if (keeperCutId && !normalizedCutIds.includes(keeperCutId)) {
        normalizedCutIds.unshift(keeperCutId);
    }
    const targetCaja = String(
        outputConfig?.cut_caja_id
        || filters.caja
        || selectedContext?.boxId
        || ''
    ).trim();
    const targetCajero = String(
        outputConfig?.cut_cajero_id
        || filters.cajero
        || selectedContext?.userId
        || ''
    ).trim();
    const payload = {
        ...filters,
        ...(outputConfig?.ok ? outputConfig : {}),
        caja: targetCaja,
        cajero: targetCajero,
        turno: String(keeperCutId || normalizedCutIds[0] || ''),
        sale_ids: saleIds,
        cut_ids: normalizedCutIds,
        keep_cut_id: keeperCutId,
    };
    if (/^\d+$/.test(cajaRaw)) {
        payload.numero_caja = Number(cajaRaw);
    }
    return payload;
}

async function printCutRebuildTicketWithPayload(payload, options = {}) {
    const messageTarget = String(options?.messageTarget || 'main').toLowerCase() === 'cuts' ? 'cuts' : 'main';
    const setMessage = messageTarget === 'cuts' ? setCutRebuildCutsMessage : setCutRebuildMessage;
    try {
        const payloadData = await fetchPrintPayload('api/print/cut-rebuilt-ticket', payload, 'No se pudo generar el reporte reconstruido');
        const printResult = await printTicketLocalFirst({
            payloadData,
            localSuccessMessage: 'Reporte reconstruido enviado a impresion local',
            fallbackEndpoint: 'api/print/cut-rebuilt-ticket',
            fallbackPayload: payload,
            fallbackErrorMessage: 'No se pudo imprimir el reporte reconstruido',
        });
        setMessage(printResult?.message || 'Reporte reconstruido enviado a impresion.', false);
    } catch (error) {
        console.error('Error printing rebuilt cut report:', error);
        setMessage(error.message || 'No se pudo imprimir el reporte reconstruido.', true);
        alert(error.message || 'No se pudo imprimir el reporte reconstruido.');
    }
}

async function printCutRebuildPreviewReport() {
    if (!isSessionAdminSiaUser()) {
        alert('Solo admin_sia puede imprimir reconstrucciones de corte.');
        return;
    }
    const selectedContext = getSelectedCutRebuildSalesContext();
    if (!selectedContext.ok) {
        setCutRebuildCutsMessage(selectedContext.message, true);
        alert(selectedContext.message);
        return;
    }
    const saleIds = getCutRebuildSelectedSaleIds();
    if (!saleIds.length) {
        setCutRebuildCutsMessage('Selecciona al menos una venta para imprimir.', true);
        alert('Selecciona al menos una venta para imprimir.');
        return;
    }
    if (!document.getElementById('cut-rebuild-output-from-date')?.value) {
        applyCutRebuildOutputDefaults(selectedContext);
    }
    const outputConfig = getCutRebuildOutputConfigFromUI();
    if (!outputConfig.ok) {
        setCutRebuildCutsMessage(outputConfig.message, true);
        alert(outputConfig.message);
        return;
    }
    const cutIds = getCutRebuildSelectedCutIds();
    const keeperCutId = cutIds.length
        ? (Number(cutRebuildContext.keeperCutId || cutIds[0] || 0) || Number(cutIds[0] || 0))
        : null;
    setCutRebuildCutsMessage('Generando previsualizacion para imprimir...', false);
    const payload = buildCutRebuildPrintPayload({
        selectedContext,
        saleIds,
        outputConfig,
        cutIds,
        keepCutId: keeperCutId,
    });
    await printCutRebuildTicketWithPayload(payload, { messageTarget: 'cuts' });
}

async function printCutRebuildReport(options = {}) {
    if (!isSessionAdminSiaUser()) {
        alert('Solo admin_sia puede imprimir reconstrucciones de corte.');
        return;
    }
    const messageTarget = String(options?.messageTarget || 'main').toLowerCase() === 'cuts' ? 'cuts' : 'main';
    const setMessage = messageTarget === 'cuts' ? setCutRebuildCutsMessage : setCutRebuildMessage;
    const skipPersist = Boolean(options?.skipPersist);
    const selectedContext = getSelectedCutRebuildSalesContext();
    if (!selectedContext.ok) {
        setMessage(selectedContext.message, true);
        alert(selectedContext.message);
        return;
    }
    const saleIds = getCutRebuildSelectedSaleIds();
    if (!saleIds.length) {
        setMessage('Selecciona al menos una venta para generar el reporte.', true);
        alert('Selecciona al menos una venta para generar el reporte.');
        return;
    }
    if (!document.getElementById('cut-rebuild-output-from-date')?.value) {
        applyCutRebuildOutputDefaults(selectedContext);
    }
    const outputConfig = getCutRebuildOutputConfigFromUI();
    if (!outputConfig.ok) {
        setMessage(outputConfig.message, true);
        alert(outputConfig.message);
        return;
    }

    let keepCutId = Number(cutRebuildContext.persistedCutId || 0) || null;
    if (!skipPersist || !keepCutId) {
        setMessage('Aplicando reconstruccion para generar reporte...', false);
        try {
            keepCutId = await persistCutRebuildSelection({ showMessage: false, askConfirmation: false });
        } catch (error) {
            if (String(error?.message || '').includes('cancelada')) {
                return;
            }
            setMessage(error.message || 'No se pudo preparar el corte reconstruido.', true);
            alert(error.message || 'No se pudo preparar el corte reconstruido.');
            return;
        }
    }
    if (!keepCutId) {
        setMessage('No se pudo determinar el corte generado para imprimir.', true);
        return;
    }

    const payload = buildCutRebuildPrintPayload({
        selectedContext,
        saleIds,
        outputConfig,
        cutIds: [keepCutId],
        keepCutId,
    });
    await printCutRebuildTicketWithPayload(payload, { messageTarget });
}

window.openCutRebuildPopup = openCutRebuildPopup;
window.closeCutRebuildPopup = closeCutRebuildPopup;
window.openCutRebuildCutsPopup = openCutRebuildCutsPopup;
window.closeCutRebuildCutsPopup = closeCutRebuildCutsPopup;
window.confirmCutRebuildCutsSelection = confirmCutRebuildCutsSelection;
window.runCutRebuildPreview = runCutRebuildPreview;
window.mergeSelectedCuts = mergeSelectedCuts;
window.printCutRebuildReport = printCutRebuildReport;
window.printCutRebuildPreviewReport = printCutRebuildPreviewReport;
window.selectAllCutRebuildSales = selectAllCutRebuildSales;
window.clearCutRebuildSalesSelection = clearCutRebuildSalesSelection;

function normalizeSettingBool(value, fallback = false) {
    if (value === null || value === undefined) return fallback;
    return Boolean(Number(value));
}

async function fetchPaymentSettingsForCut() {
    try {
        const response = await fetch(API_URL + 'api/payment-settings', {
            headers: withAuthHeaders(),
        });
        if (!response.ok) {
            return null;
        }
        return await response.json().catch(() => null);
    } catch (error) {
        return null;
    }
}

async function fetchCutDepartmentBreakdown(scope = 'session') {
    const caja = localStorage.getItem('n_caja');
    const cajero = localStorage.getItem('id_user');
    if (!caja || !cajero) return [];

    try {
        const query = new URLSearchParams({ caja, cajero, scope });
        const response = await fetch(API_URL + `api/turno/departamentos?${query.toString()}`, {
            headers: withAuthHeaders(),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return [];
        }
        return Array.isArray(data.departamentos) ? data.departamentos : [];
    } catch (error) {
        return [];
    }
}

function getEnabledCutMethods(paymentSettings) {
    const cardEnabled = normalizeSettingBool(paymentSettings?.card_enabled, true);
    const mixedEnabled = normalizeSettingBool(paymentSettings?.mixed_enabled, true);
    const usdEnabled = normalizeSettingBool(paymentSettings?.usd_enabled, false);
    const transferEnabled = normalizeSettingBool(paymentSettings?.transfer_enabled, false);
    const checkEnabled = normalizeSettingBool(paymentSettings?.check_enabled, false);
    const voucherEnabled = normalizeSettingBool(paymentSettings?.voucher_enabled, false);

    const methods = [{ key: 'efectivo', label: 'Efectivo' }];
    if (cardEnabled || mixedEnabled) methods.push({ key: 'tarjeta', label: 'Tarjeta' });
    if (usdEnabled) methods.push({ key: 'dolares', label: 'Dolares' });
    if (transferEnabled) methods.push({ key: 'transferencia', label: 'Transferencia' });
    if (checkEnabled) methods.push({ key: 'cheque', label: 'Cheque' });
    if (voucherEnabled) methods.push({ key: 'vale', label: 'Vale' });
    return methods;
}

const CUT_METHOD_DISPLAY_ORDER = ['efectivo', 'tarjeta', 'dolares', 'transferencia', 'cheque', 'vale', 'credito', 'otro'];

function normalizeCutPaymentMethodKey(methodRaw = '') {
    return String(methodRaw || '').trim().toLowerCase();
}

function buildCutVisiblePaymentMethods(paymentSettings, summaryRows = []) {
    const methodsByKey = new Map();
    getEnabledCutMethods(paymentSettings).forEach((method) => {
        methodsByKey.set(method.key, {
            key: method.key,
            label: method.label,
        });
    });

    (Array.isArray(summaryRows) ? summaryRows : []).forEach((row) => {
        const key = normalizeCutPaymentMethodKey(row?.metodo_pago);
        if (!key || key === 'mixto') {
            return;
        }
        if (!methodsByKey.has(key)) {
            methodsByKey.set(key, {
                key,
                label: normalizeSalesPaymentMethodLabel(key),
            });
        }
    });

    const orderedMethods = [];
    CUT_METHOD_DISPLAY_ORDER.forEach((key) => {
        if (!methodsByKey.has(key)) {
            return;
        }
        orderedMethods.push(methodsByKey.get(key));
        methodsByKey.delete(key);
    });

    Array.from(methodsByKey.values())
        .sort((a, b) => String(a?.label || '').localeCompare(String(b?.label || ''), 'es', { sensitivity: 'base' }))
        .forEach((method) => orderedMethods.push(method));

    return orderedMethods;
}

function renderCutEnabledPaymentBreakdown(
    summaryRows,
    paymentSettings,
    scopeLabel,
    financialSummary = {},
    mixedSummary = {},
    detailRows = [],
    mixedRows = []
) {
    const cutSummary = document.getElementById('cut-summary');
    const cutBreakdown = document.getElementById('cut-breakdown');
    if (!cutSummary) {
        return;
    }

    const normalizedSummaryRows = Array.isArray(summaryRows) ? summaryRows : [];
    const enabledMethods = buildCutVisiblePaymentMethods(paymentSettings, normalizedSummaryRows);
    const totalsByMethod = new Map();
    enabledMethods.forEach((method) => {
        totalsByMethod.set(method.key, {
            label: method.label,
            total: 0,
            transacciones: 0,
        });
    });

    normalizedSummaryRows.forEach((row) => {
        const method = normalizeCutPaymentMethodKey(row.metodo_pago);
        const total = Number(row.total || 0);
        const transacciones = Number(row.transacciones || 0);
        if (method === 'mixto') {
            return;
        }
        if (!totalsByMethod.has(method)) {
            return;
        }
        const current = totalsByMethod.get(method);
        current.total += total;
        current.transacciones += transacciones;
    });

    const baseCashSummary = normalizedSummaryRows.reduce((acc, row) => {
        const method = String(row?.metodo_pago || '').toLowerCase().trim();
        if (method !== 'efectivo') return acc;
        acc.total += Number(row?.total || 0);
        acc.tx += Number(row?.transacciones || 0);
        return acc;
    }, { total: 0, tx: 0 });
    const baseCardSummary = normalizedSummaryRows.reduce((acc, row) => {
        const method = String(row?.metodo_pago || '').toLowerCase().trim();
        if (method !== 'tarjeta') return acc;
        acc.total += Number(row?.total || 0);
        acc.tx += Number(row?.transacciones || 0);
        return acc;
    }, { total: 0, tx: 0 });
    const baseTransferSummary = normalizedSummaryRows.reduce((acc, row) => {
        const method = String(row?.metodo_pago || '').toLowerCase().trim();
        if (method !== 'transferencia') return acc;
        acc.total += Number(row?.total || 0);
        acc.tx += Number(row?.transacciones || 0);
        return acc;
    }, { total: 0, tx: 0 });
    const totalVentas = normalizedSummaryRows.reduce((acc, row) => acc + Number(row.total || 0), 0);
    const totalTx = normalizedSummaryRows.reduce((acc, row) => acc + Number(row.transacciones || 0), 0);
    const financialCash = Number(financialSummary?.ventas_efectivo);
    const financialCard = Number(financialSummary?.ventas_tarjeta);
    const financialOpeningCash = Number(financialSummary?.fondo_caja ?? 0);
    const financialCashAbonos = Number(financialSummary?.abonos_efectivo ?? 0);
    const financialEntries = Number(financialSummary?.entradas_dinero ?? 0);
    const financialExits = Number(financialSummary?.salidas_dinero ?? 0);
    const financialCashInBox = Number(financialSummary?.ventas_totales_dinero_en_caja);
    const mixedTotals = resolveCutMixedTotals({
        summaryRows: normalizedSummaryRows,
        detailRows,
        mixedRows,
        mixedSummary,
        totalTx,
        financialCash,
        financialCard,
    });
    const mixedCash = Number(mixedTotals.efectivo || 0);
    const mixedCard = Number(mixedTotals.tarjeta || 0);
    const mixedTotal = Number(mixedTotals.total || 0);
    const normalizedMixedCount = Number(mixedTotals.count || 0);

    const hasLegacyMixtoSummary = normalizedSummaryRows.some((row) => {
        const method = String(row?.metodo_pago || '').toLowerCase().trim();
        return method === 'mixto' && Number(row?.total || 0) > 0;
    });
    if (totalsByMethod.has('efectivo') && Number.isFinite(financialCash) && financialCash >= 0) {
        const current = totalsByMethod.get('efectivo');
        const previousTotal = Number(current.total || 0);
        current.total = financialCash;
        if (hasLegacyMixtoSummary && normalizedMixedCount > 0 && mixedCash > 0 && financialCash > (previousTotal + 0.5)) {
            current.transacciones += normalizedMixedCount;
        }
    }

    const computedCashFromBreakdown = Math.max(
        0,
        hasLegacyMixtoSummary ? (baseCashSummary.total + mixedCash) : baseCashSummary.total
    );
    const computedCashInBoxFallback = Number.isFinite(financialOpeningCash)
        ? (financialOpeningCash + computedCashFromBreakdown + financialCashAbonos + financialEntries - financialExits)
        : (computedCashFromBreakdown + financialCashAbonos + financialEntries - financialExits);
    const computedCashTotal = Number.isFinite(financialCashInBox)
        ? financialCashInBox
        : computedCashInBoxFallback;
    const computedTransferTotal = Math.max(0, baseTransferSummary.total);
    const cardTotalFromBreakdown = Math.max(
        0,
        hasLegacyMixtoSummary ? (baseCardSummary.total + mixedCard) : baseCardSummary.total
    );
    const cardTotalFromFinancial = Number.isFinite(financialCard) && financialCard >= 0
        ? Math.max(0, financialCard - computedTransferTotal)
        : NaN;
    const computedCardTotal = cardTotalFromBreakdown > 0
        ? cardTotalFromBreakdown
        : (Number.isFinite(cardTotalFromFinancial) ? cardTotalFromFinancial : cardTotalFromBreakdown);

    if (totalsByMethod.has('tarjeta')) {
        const current = totalsByMethod.get('tarjeta');
        const previousTotal = Number(current.total || 0);
        current.total = computedCardTotal;
        if (hasLegacyMixtoSummary && normalizedMixedCount > 0 && mixedCard > 0 && computedCardTotal > (previousTotal + 0.5)) {
            current.transacciones += normalizedMixedCount;
        }
    }

    renderCutReferenceSummaryValues({
        cashMain: baseCashSummary.total,
        cashMainTx: baseCashSummary.tx,
        cardMain: baseCardSummary.total,
        cardMainTx: baseCardSummary.tx,
        transferMain: baseTransferSummary.total,
        transferMainTx: baseTransferSummary.tx,
        mixedTotal,
        mixedTx: normalizedMixedCount,
        mixedCash,
        mixedCard,
        entryTotal: financialEntries,
        exitTotal: financialExits,
        cashTotal: computedCashTotal,
        cashTotalTx: baseCashSummary.tx + (hasLegacyMixtoSummary && mixedCash > 0 ? normalizedMixedCount : 0),
        cardTotal: computedCardTotal,
        cardTotalTx: baseCardSummary.tx + (hasLegacyMixtoSummary && mixedCard > 0 ? normalizedMixedCount : 0),
        transferTotal: computedTransferTotal,
        transferTotalTx: baseTransferSummary.tx,
    });

    const scopeText = String(scopeLabel || '').toLowerCase();
    const isSessionScope = scopeText.includes('sesion');
    const isDayScope = scopeText.includes('dia');
    if (isSessionScope) {
        const statusText = cutCloseContext.turnStatusLabel || '';
        cutSummary.textContent = `Resumen de sesion: ${totalTx.toFixed(0)} venta(s) | Total $${totalVentas.toFixed(0)}${statusText}`;
    } else if (isDayScope) {
        cutSummary.textContent = `Resumen del dia: ${totalTx.toFixed(0)} venta(s) | Total $${totalVentas.toFixed(0)}`;
    } else {
        cutSummary.textContent = `Sin resumen cargado para la fecha seleccionada.`;
    }

    if (!cutBreakdown) {
        return;
    }
    cutBreakdown.innerHTML = '';
    const methodRows = Array.from(totalsByMethod.values());
    if (!methodRows.length) {
        const li = document.createElement('li');
        li.textContent = 'No hay formas de pago activas para el alcance seleccionado.';
        cutBreakdown.appendChild(li);
        return;
    }
    methodRows.forEach((row) => {
        const li = document.createElement('li');
        li.textContent = `${row.label}: $${Number(row.total || 0).toFixed(0)} (${Number(row.transacciones || 0).toFixed(0)} venta(s))`;
        cutBreakdown.appendChild(li);
    });
}

function buildMixedSalesDetails(detailRows = [], mixedRows = []) {
    const normalizedMixedRows = (Array.isArray(mixedRows) ? mixedRows : [])
        .map((row) => ({
            saleId: Number(row?.id_venta || 0),
            ticket: String(row?.numero_ticket || '').trim(),
            date: String(row?.fecha || '').trim(),
            efectivo: Number(row?.efectivo || 0),
            tarjeta: Number(row?.tarjeta || 0),
        }))
        .filter((row) => Number.isFinite(row.efectivo) && Number.isFinite(row.tarjeta))
        .filter((row) => row.efectivo > 0 || row.tarjeta > 0);
    if (normalizedMixedRows.length > 0) {
        const rows = normalizedMixedRows
            .slice()
            .sort((a, b) => {
                const aId = Number(a.saleId || 0);
                const bId = Number(b.saleId || 0);
                if (aId > 0 && bId > 0) return aId - bId;
                if (aId > 0) return -1;
                if (bId > 0) return 1;
                const dateCompare = String(a.date || '').localeCompare(String(b.date || ''));
                if (dateCompare !== 0) return dateCompare;
                return String(a.ticket || '').localeCompare(String(b.ticket || ''), 'es', { numeric: true, sensitivity: 'base' });
            })
            .map((row) => ({
                saleId: row.saleId,
                ticket: row.ticket || (row.saleId > 0 ? String(row.saleId) : '-'),
                efectivo: Number(row.efectivo || 0),
                tarjeta: Number(row.tarjeta || 0),
            }));
        const totals = rows.reduce((acc, row) => {
            acc.count += 1;
            acc.efectivo += Number(row.efectivo || 0);
            acc.tarjeta += Number(row.tarjeta || 0);
            return acc;
        }, { count: 0, efectivo: 0, tarjeta: 0 });
        totals.total = totals.efectivo + totals.tarjeta;
        return { rows, totals };
    }

    const bySale = new Map();
    (Array.isArray(detailRows) ? detailRows : []).forEach((row) => {
        const saleId = Number(row?.id_venta || 0);
        const ticketRaw = String(row?.numero_ticket || '').trim();
        const saleDate = String(row?.fecha || '').trim();
        const saleKey = saleId > 0
            ? `id:${saleId}`
            : (ticketRaw ? `ticket:${ticketRaw}|fecha:${saleDate.slice(0, 16)}` : '');
        if (!saleKey) return;
        const paymentMethod = String(row?.metodo_pago || '').trim().toLowerCase();
        const saleMethod = String(row?.metodo_venta || '').trim().toLowerCase();
        const current = bySale.get(saleKey) || {
            saleId,
            ticket: ticketRaw || (saleId > 0 ? String(saleId) : '-'),
            date: saleDate,
            efectivo: 0,
            tarjeta: 0,
            isMixedSale: saleMethod === 'mixto',
        };
        if (saleId > 0 && !current.saleId) current.saleId = saleId;
        if (!current.ticket || current.ticket === '-') current.ticket = ticketRaw || current.ticket;
        if (!current.date) current.date = saleDate;
        if (saleMethod === 'mixto') current.isMixedSale = true;

        if (paymentMethod === 'efectivo' || paymentMethod === 'tarjeta') {
            const amount = Number(row?.total || 0);
            if (Number.isFinite(amount) && amount > 0) {
                if (paymentMethod === 'efectivo') current.efectivo += amount;
                if (paymentMethod === 'tarjeta') current.tarjeta += amount;
            }
        }
        bySale.set(saleKey, current);
    });

    const rows = Array.from(bySale.values())
        .filter((row) => row.isMixedSale || (row.efectivo > 0 && row.tarjeta > 0))
        .sort((a, b) => {
            const aId = Number(a.saleId || 0);
            const bId = Number(b.saleId || 0);
            if (aId > 0 && bId > 0) return aId - bId;
            if (aId > 0) return -1;
            if (bId > 0) return 1;
            const dateCompare = String(a.date || '').localeCompare(String(b.date || ''));
            if (dateCompare !== 0) return dateCompare;
            return String(a.ticket || '').localeCompare(String(b.ticket || ''), 'es', { numeric: true, sensitivity: 'base' });
        })
        .map((row) => ({
            saleId: row.saleId,
            ticket: row.ticket,
            efectivo: Number(row.efectivo || 0),
            tarjeta: Number(row.tarjeta || 0),
        }));

    const totals = rows.reduce((acc, row) => {
        acc.count += 1;
        acc.efectivo += Number(row.efectivo || 0);
        acc.tarjeta += Number(row.tarjeta || 0);
        return acc;
    }, { count: 0, efectivo: 0, tarjeta: 0 });
    totals.total = totals.efectivo + totals.tarjeta;

    return { rows, totals };
}

function resolveCutMixedTotals({
    summaryRows = [],
    detailRows = [],
    mixedRows = [],
    mixedSummary = {},
    totalTx = 0,
    financialCash = NaN,
    financialCard = NaN,
} = {}) {
    const safeSummaryRows = Array.isArray(summaryRows) ? summaryRows : [];
    const safeMixedSummary = (mixedSummary && typeof mixedSummary === 'object') ? mixedSummary : {};
    const mixedDetails = buildMixedSalesDetails(detailRows, mixedRows);
    const detailTotals = mixedDetails?.totals || {};
    let mixedTotals = {
        count: Number(detailTotals.count || 0),
        efectivo: Number(detailTotals.efectivo || 0),
        tarjeta: Number(detailTotals.tarjeta || 0),
        total: Number(detailTotals.total || 0),
    };

    const hasServerMixedSummary = [
        'count',
        'ventas_mixtas',
        'efectivo',
        'efectivo_mixto',
        'tarjeta',
        'tarjeta_mixto',
        'total',
        'total_mixto',
    ].some((key) => safeMixedSummary?.[key] !== undefined && safeMixedSummary?.[key] !== null);

    const summaryMixedRow = safeSummaryRows.find((row) => String(row?.metodo_pago || '').trim().toLowerCase() === 'mixto') || null;
    const summaryMixedCount = Number(summaryMixedRow?.transacciones || 0);
    const summaryMixedTotal = Number(summaryMixedRow?.total || 0);

    if (hasServerMixedSummary) {
        const serverMixedCount = Number(safeMixedSummary?.count ?? safeMixedSummary?.ventas_mixtas ?? 0);
        const serverMixedEfectivo = Number(safeMixedSummary?.efectivo ?? safeMixedSummary?.efectivo_mixto ?? 0);
        const serverMixedTarjeta = Number(safeMixedSummary?.tarjeta ?? safeMixedSummary?.tarjeta_mixto ?? 0);
        const serverMixedTotal = Number(
            safeMixedSummary?.total
            ?? safeMixedSummary?.total_mixto
            ?? (serverMixedEfectivo + serverMixedTarjeta)
        );
        mixedTotals = {
            count: Math.max(0, serverMixedCount),
            efectivo: Math.max(0, serverMixedEfectivo),
            tarjeta: Math.max(0, serverMixedTarjeta),
            total: Math.max(0, serverMixedTotal),
        };
    } else {
        if (mixedTotals.count <= 0 && summaryMixedCount > 0) mixedTotals.count = Math.max(0, summaryMixedCount);
        if (mixedTotals.total <= 0 && summaryMixedTotal > 0) mixedTotals.total = Math.max(0, summaryMixedTotal);
    }

    if (mixedTotals.count <= 0 && summaryMixedCount > 0) mixedTotals.count = Math.max(0, summaryMixedCount);
    if (mixedTotals.total <= 0 && summaryMixedTotal > 0) mixedTotals.total = Math.max(0, summaryMixedTotal);
    if (mixedTotals.count <= 0 && Number(detailTotals.count || 0) > 0) {
        const detailHasAmounts = Number(detailTotals.efectivo || 0) > 0 || Number(detailTotals.tarjeta || 0) > 0;
        if (detailHasAmounts || mixedTotals.total > 0) {
            mixedTotals.count = Math.max(0, Number(detailTotals.count || 0));
        }
    }

    if ((mixedTotals.efectivo <= 0 && mixedTotals.tarjeta <= 0)) {
        const detailCash = Number(detailTotals.efectivo || 0);
        const detailCard = Number(detailTotals.tarjeta || 0);
        if (detailCash > 0 || detailCard > 0) {
            mixedTotals.efectivo = Math.max(0, detailCash);
            mixedTotals.tarjeta = Math.max(0, detailCard);
            if (mixedTotals.total <= 0) {
                mixedTotals.total = mixedTotals.efectivo + mixedTotals.tarjeta;
            }
            if (mixedTotals.count <= 0) {
                mixedTotals.count = Math.max(0, Number(detailTotals.count || 0));
            }
        }
    }

    if (mixedTotals.count <= 0) {
        const safeTotalTx = Math.max(0, Number(totalTx || 0));
        const cashSummary = safeSummaryRows
            .filter((row) => String(row?.metodo_pago || '').trim().toLowerCase() === 'efectivo')
            .reduce((acc, row) => {
                acc.tx += Number(row?.transacciones || 0);
                acc.total += Number(row?.total || 0);
                return acc;
            }, { tx: 0, total: 0 });
        const cardSummary = safeSummaryRows
            .filter((row) => String(row?.metodo_pago || '').trim().toLowerCase() === 'tarjeta')
            .reduce((acc, row) => {
                acc.tx += Number(row?.transacciones || 0);
                acc.total += Number(row?.total || 0);
                return acc;
            }, { tx: 0, total: 0 });
        const mixedLowerBound = Math.max(0, Number(cashSummary.tx || 0) + Number(cardSummary.tx || 0) - safeTotalTx);
        if (mixedLowerBound > 0) {
            mixedTotals.count = mixedLowerBound;
        }
        if (safeTotalTx > 0 && cashSummary.tx === safeTotalTx && cardSummary.tx === safeTotalTx) {
            mixedTotals.count = safeTotalTx;
            if (mixedTotals.efectivo <= 0) mixedTotals.efectivo = Math.max(0, Number(cashSummary.total || 0));
            if (mixedTotals.tarjeta <= 0) mixedTotals.tarjeta = Math.max(0, Number(cardSummary.total || 0));
            if (mixedTotals.total <= 0) mixedTotals.total = mixedTotals.efectivo + mixedTotals.tarjeta;
        }
    }

    if ((mixedTotals.efectivo <= 0 && mixedTotals.tarjeta <= 0) && mixedTotals.total > 0 && Number.isFinite(financialCash) && Number.isFinite(financialCard)) {
        const financialCombined = Math.max(0, Number(financialCash || 0)) + Math.max(0, Number(financialCard || 0));
        if (financialCombined > 0 && Math.abs(financialCombined - mixedTotals.total) <= 1) {
            mixedTotals.efectivo = Math.max(0, Number(financialCash || 0));
            mixedTotals.tarjeta = Math.max(0, Number(financialCard || 0));
        }
    }

    mixedTotals.count = mixedTotals.count > 0 ? Math.round(mixedTotals.count) : 0;
    mixedTotals.efectivo = Math.max(0, Number(mixedTotals.efectivo || 0));
    mixedTotals.tarjeta = Math.max(0, Number(mixedTotals.tarjeta || 0));
    if (mixedTotals.total <= 0 && (mixedTotals.efectivo > 0 || mixedTotals.tarjeta > 0)) {
        mixedTotals.total = mixedTotals.efectivo + mixedTotals.tarjeta;
    }
    mixedTotals.total = Math.max(0, Number(mixedTotals.total || 0));
    return mixedTotals;
}

function renderCutFinancialSections(data = {}, options = {}) {
    const clearOnly = Boolean(options.clearOnly);
    const financial = data.resumen_financiero || {};
    const movements = data.movimientos || {};
    const departments = Array.isArray(data.departamentos) ? data.departamentos : [];
    const rawSummaryRows = Array.isArray(data.resumen) ? data.resumen : [];
    const detailRows = Array.isArray(data.detalle) ? data.detalle : [];
    const mixedRowsFromServer = Array.isArray(data.ventas_mixtas) ? data.ventas_mixtas : [];

    const salesKpi = document.getElementById('cut-kpi-sales-total');
    const profitKpi = document.getElementById('cut-kpi-profit-total');
    const cashList = document.getElementById('cut-cash-detail-list');
    const cashTotal = document.getElementById('cut-cash-total');
    const profitList = document.getElementById('cut-profit-detail-list');
    const profitTotal = document.getElementById('cut-profit-total');
    const mixedSummaryList = document.getElementById('cut-mixed-summary-list');
    const mixedSummaryTotal = document.getElementById('cut-mixed-summary-total');
    const incomeList = document.getElementById('cut-session-income-list');
    const expenseList = document.getElementById('cut-session-expense-list');
    const departmentList = document.getElementById('cut-department-list');
    const departmentTotal = document.getElementById('cut-department-total');
    const mixedTicketList = document.getElementById('cut-mixed-ticket-list');
    const mixedTicketTotal = document.getElementById('cut-mixed-ticket-total');
    const topProductsByDepartmentList = document.getElementById('cut-top-products-by-department');

    if (clearOnly) {
        if (salesKpi) salesKpi.textContent = '$0';
        if (profitKpi) profitKpi.textContent = '$0';
        if (cashList) cashList.innerHTML = '';
        if (cashTotal) cashTotal.textContent = '';
        if (profitList) profitList.innerHTML = '';
        if (profitTotal) profitTotal.textContent = '';
        if (mixedSummaryList) mixedSummaryList.innerHTML = '';
        if (mixedSummaryTotal) mixedSummaryTotal.textContent = '';
        if (incomeList) incomeList.innerHTML = '';
        if (expenseList) expenseList.innerHTML = '';
        if (departmentList) departmentList.innerHTML = '';
        if (departmentTotal) departmentTotal.textContent = '';
        if (mixedTicketList) mixedTicketList.innerHTML = '';
        if (mixedTicketTotal) mixedTicketTotal.textContent = '';
        if (topProductsByDepartmentList) topProductsByDepartmentList.innerHTML = '';
        return;
    }

    const formatCurrency = (value) => `$${Number(value || 0).toFixed(0)}`;
    const formatSignedCurrency = (value, prefix = '') => `${prefix}${formatCurrency(value)}`;

    const fallbackVentasEfectivo = rawSummaryRows.reduce((acc, row) => {
        const method = String(row.metodo_pago || '').toLowerCase();
        const total = Number(row.total || 0);
        if (method === 'efectivo') return acc + total;
        if (method === 'mixto') return acc + (total / 2);
        return acc;
    }, 0);
    const fallbackVentasTarjeta = rawSummaryRows.reduce((acc, row) => {
        const method = String(row.metodo_pago || '').toLowerCase();
        const total = Number(row.total || 0);
        if (method === 'tarjeta') return acc + total;
        if (method === 'mixto') return acc + (total / 2);
        if (['dolares', 'transferencia', 'cheque', 'vale'].includes(method)) return acc + total;
        return acc;
    }, 0);

    const movementSummary = Array.isArray(movements.resumen) ? movements.resumen : [];
    const movementIncomeDetailRows = Array.isArray(movements.detalle_ingresos) ? movements.detalle_ingresos : [];
    const movementExitDetailRows = Array.isArray(movements.detalle_salidas) ? movements.detalle_salidas : [];
    const fallbackEntradasTotal = movementSummary
        .filter((row) => String(row.tipo || '').toLowerCase() === 'entrada')
        .reduce((acc, row) => acc + Number(row.total || 0), 0);
    const summaryHasEntryMethodBreakdown = movementSummary.some((row) =>
        String(row?.tipo || '').toLowerCase() === 'entrada' && typeof row?.metodo === 'string'
    );
    const fallbackEntradasEfectivoSummary = movementSummary
        .filter((row) =>
            String(row.tipo || '').toLowerCase() === 'entrada'
            && String(row.metodo || '').toLowerCase() === 'efectivo'
        )
        .reduce((acc, row) => acc + Number(row.total || 0), 0);
    const fallbackEntradasEfectivoDetail = movementIncomeDetailRows
        .filter((row) =>
            String(row.tipo || '').toLowerCase() === 'entrada'
            && String(row.metodo || '').toLowerCase() === 'efectivo'
        )
        .reduce((acc, row) => acc + Number(row.monto || 0), 0);
    const fallbackEntradas = movementIncomeDetailRows.length > 0
        ? fallbackEntradasEfectivoDetail
        : (summaryHasEntryMethodBreakdown ? fallbackEntradasEfectivoSummary : fallbackEntradasTotal);
    const fallbackSalidasTotal = movementSummary
        .filter((row) => String(row.tipo || '').toLowerCase() === 'salida')
        .reduce((acc, row) => acc + Number(row.total || 0), 0);
    const summaryHasExitMethodBreakdown = movementSummary.some((row) =>
        String(row?.tipo || '').toLowerCase() === 'salida' && typeof row?.metodo === 'string'
    );
    const fallbackSalidasEfectivoSummary = movementSummary
        .filter((row) =>
            String(row.tipo || '').toLowerCase() === 'salida'
            && String(row.metodo || '').toLowerCase() === 'efectivo'
        )
        .reduce((acc, row) => acc + Number(row.total || 0), 0);
    const fallbackSalidasEfectivoDetail = movementExitDetailRows
        .filter((row) =>
            String(row.tipo || '').toLowerCase() === 'salida'
            && String(row.metodo || '').toLowerCase() === 'efectivo'
        )
        .reduce((acc, row) => acc + Number(row.monto || 0), 0);
    const fallbackSalidasEfectivo = movementExitDetailRows.length > 0
        ? fallbackSalidasEfectivoDetail
        : (summaryHasExitMethodBreakdown ? fallbackSalidasEfectivoSummary : fallbackSalidasTotal);
    const fallbackAbonos = movementSummary
        .filter((row) => String(row.tipo || '').toLowerCase() === 'abono')
        .reduce((acc, row) => acc + Number(row.total || 0), 0);
    const fallbackDevoluciones = movementSummary
        .filter((row) => String(row.tipo || '').toLowerCase().includes('devol'))
        .reduce((acc, row) => acc + Number(row.total || 0), 0);
    const fallbackTotalVendido = Number(data.totales?.total || 0);
    const fallbackGanancia = departments.reduce((acc, row) => acc + Number(row.ganancia || 0), 0);

    const fondoCaja = Number(financial.fondo_caja ?? data.monto_inicial ?? 0);
    const ventasEfectivo = Number(financial.ventas_efectivo ?? fallbackVentasEfectivo);
    const ventasTarjeta = Number(financial.ventas_tarjeta ?? fallbackVentasTarjeta);
    const abonosEfectivo = Number(financial.abonos_efectivo ?? fallbackAbonos);
    const entradasDinero = Number(financial.entradas_dinero ?? fallbackEntradas);
    const salidasDinero = Number(financial.salidas_dinero ?? fallbackSalidasEfectivo);
    const devolucionesVentas = Number(financial.devoluciones_ventas ?? financial.devoluciones ?? fallbackDevoluciones);
    const totalVendido = Number(financial.total_vendido ?? fallbackTotalVendido);
    const gananciaVentas = Number(financial.ganancia_ventas ?? fallbackGanancia);
    const totalDepartamentos = departments.reduce((acc, row) => acc + Number(row.total_vendido || 0), 0);
    const dineroEnCaja = Number(
        financial.ventas_totales_dinero_en_caja
        ?? (fondoCaja + ventasEfectivo + abonosEfectivo + entradasDinero - salidasDinero)
    );
    const mixedDetails = buildMixedSalesDetails(detailRows, mixedRowsFromServer);
    let mixedTotals = {
        count: Number(mixedDetails?.totals?.count || 0),
        efectivo: Number(mixedDetails?.totals?.efectivo || 0),
        tarjeta: Number(mixedDetails?.totals?.tarjeta || 0),
        total: Number(mixedDetails?.totals?.total || 0),
    };
    let mixedRows = Array.isArray(mixedDetails?.rows) ? mixedDetails.rows : [];

    const serverMixedSummary = data?.resumen_mixto || {};
    const hasServerMixedSummary = [
        'count',
        'ventas_mixtas',
        'efectivo',
        'efectivo_mixto',
        'tarjeta',
        'tarjeta_mixto',
        'total',
        'total_mixto',
    ].some((key) => serverMixedSummary?.[key] !== undefined && serverMixedSummary?.[key] !== null);
    const serverMixedCount = Number(serverMixedSummary?.count ?? serverMixedSummary?.ventas_mixtas ?? 0);
    const serverMixedEfectivo = Number(serverMixedSummary?.efectivo ?? serverMixedSummary?.efectivo_mixto ?? 0);
    const serverMixedTarjeta = Number(serverMixedSummary?.tarjeta ?? serverMixedSummary?.tarjeta_mixto ?? 0);
    const serverMixedTotal = Number(
        serverMixedSummary?.total
        ?? serverMixedSummary?.total_mixto
        ?? (serverMixedEfectivo + serverMixedTarjeta)
    );
    const summaryMixedRow = rawSummaryRows.find((row) => String(row?.metodo_pago || '').trim().toLowerCase() === 'mixto') || null;
    const summaryMixedCount = Number(summaryMixedRow?.transacciones || 0);
    const summaryMixedTotal = Number(summaryMixedRow?.total || 0);
    if (hasServerMixedSummary) {
        mixedTotals = {
            count: Math.max(0, serverMixedCount),
            efectivo: Math.max(0, serverMixedEfectivo),
            tarjeta: Math.max(0, serverMixedTarjeta),
            total: Math.max(0, serverMixedTotal),
        };
        if ((mixedTotals.efectivo <= 0 && mixedTotals.tarjeta <= 0) && mixedDetails?.totals) {
            const detailCash = Number(mixedDetails.totals.efectivo || 0);
            const detailCard = Number(mixedDetails.totals.tarjeta || 0);
            if (detailCash > 0 || detailCard > 0) {
                mixedTotals.efectivo = Math.max(0, detailCash);
                mixedTotals.tarjeta = Math.max(0, detailCard);
                if (mixedTotals.total <= 0) {
                    mixedTotals.total = mixedTotals.efectivo + mixedTotals.tarjeta;
                }
            }
        }
    }
    if (!hasServerMixedSummary && mixedTotals.count <= 0 && summaryMixedCount > 0) {
        mixedTotals.count = Math.max(0, summaryMixedCount);
        mixedTotals.total = Math.max(0, summaryMixedTotal);
        if (mixedTotals.efectivo <= 0 && mixedTotals.tarjeta <= 0) {
            const financialMixedTotal = Math.max(0, ventasEfectivo) + Math.max(0, ventasTarjeta);
            if (financialMixedTotal > 0 && Math.abs(financialMixedTotal - mixedTotals.total) <= 1) {
                mixedTotals.efectivo = Math.max(0, ventasEfectivo);
                mixedTotals.tarjeta = Math.max(0, ventasTarjeta);
                mixedTotals.total = financialMixedTotal;
            }
        } else if (mixedTotals.total <= 0) {
            mixedTotals.total = Math.max(0, Number(mixedTotals.efectivo || 0) + Number(mixedTotals.tarjeta || 0));
        }
    }
    if (!hasServerMixedSummary && mixedTotals.count <= 0) {
        const totalTx = Number(data?.totales?.transacciones || 0);
        const cashSummary = rawSummaryRows
            .filter((row) => String(row?.metodo_pago || '').trim().toLowerCase() === 'efectivo')
            .reduce((acc, row) => {
                acc.tx += Number(row?.transacciones || 0);
                acc.total += Number(row?.total || 0);
                return acc;
            }, { tx: 0, total: 0 });
        const cardSummary = rawSummaryRows
            .filter((row) => String(row?.metodo_pago || '').trim().toLowerCase() === 'tarjeta')
            .reduce((acc, row) => {
                acc.tx += Number(row?.transacciones || 0);
                acc.total += Number(row?.total || 0);
                return acc;
            }, { tx: 0, total: 0 });
        const mixedLowerBound = Math.max(0, Number(cashSummary.tx || 0) + Number(cardSummary.tx || 0) - totalTx);
        if (mixedLowerBound > 0) {
            mixedTotals.count = mixedLowerBound;
        }
        if (totalTx > 0 && cashSummary.tx === totalTx && cardSummary.tx === totalTx) {
            mixedTotals = {
                count: totalTx,
                efectivo: Number(cashSummary.total || 0),
                tarjeta: Number(cardSummary.total || 0),
                total: Number(cashSummary.total || 0) + Number(cardSummary.total || 0),
            };
            if (!mixedRows.length && totalTx === 1) {
                mixedRows = [{
                    saleId: 0,
                    ticket: String(detailRows?.[0]?.numero_ticket || '-').trim() || '-',
                    efectivo: Number(cashSummary.total || 0),
                    tarjeta: Number(cardSummary.total || 0),
                }];
            }
        }
    }

    if (salesKpi) salesKpi.textContent = formatCurrency(totalVendido);
    if (profitKpi) profitKpi.textContent = formatCurrency(gananciaVentas);

    if (cashList) {
        cashList.innerHTML = '';
        [
            `Fondo de caja: ${formatCurrency(fondoCaja)}`,
            `Ventas en efectivo: ${formatCurrency(ventasEfectivo)}`,
            `Abonos en efectivo: ${formatCurrency(abonosEfectivo)}`,
            `Entradas de efectivo: ${formatSignedCurrency(entradasDinero, '+')}`,
            `Salidas de efectivo: ${formatSignedCurrency(salidasDinero, '-')}`,
        ].forEach((text) => {
            const li = document.createElement('li');
            li.textContent = text;
            cashList.appendChild(li);
        });
    }
    if (cashTotal) {
        cashTotal.textContent = `Total en caja: ${formatCurrency(dineroEnCaja)}`;
    }

    if (profitList) {
        profitList.innerHTML = '';
        [
            `En efectivo: ${formatCurrency(ventasEfectivo)}`,
            `Con tarjeta credito/debito: ${formatCurrency(ventasTarjeta)}`,
            `Devoluciones: ${formatSignedCurrency(devolucionesVentas, '-')}`,
        ].forEach((text) => {
            const li = document.createElement('li');
            li.textContent = text;
            profitList.appendChild(li);
        });
    }
    if (profitTotal) {
        profitTotal.textContent = `Total ventas: ${formatCurrency(totalVendido)}`;
    }
    if (mixedSummaryList) {
        console.log(`${mixedTotals.count }  venta(s)`);
        console.log(`${mixedTotals.efectivo }  venta(s)`);
        console.log(`${mixedTotals.tarjeta }  venta(s)`);

        mixedSummaryList.innerHTML = '';
        [
            `Ventas mixtas: ${mixedTotals.count} venta(s)`,
            `Efectivo (mixto): ${formatCurrency(mixedTotals.efectivo)}`,
            `Tarjeta (mixto): ${formatCurrency(mixedTotals.tarjeta)}`,
        ].forEach((text) => {
            const li = document.createElement('li');
            li.textContent = text;
            mixedSummaryList.appendChild(li);
        });
    }
    if (mixedSummaryTotal) {
        mixedSummaryTotal.textContent = `Total mixto: ${formatCurrency(mixedTotals.total)}`;
    }

    if (incomeList) {
        incomeList.innerHTML = '';
        const incomeRows = Array.isArray(movements.detalle_ingresos) ? movements.detalle_ingresos : [];
        if (incomeRows.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Sin entradas registradas en el alcance seleccionado.';
            incomeList.appendChild(li);
        } else {
            incomeRows.forEach((row) => {
                const li = document.createElement('li');
                const detailParts = [
                    row.fecha || '',
                    row.tipo || '',
                    row.metodo || '',
                    formatCurrency(Number(row.monto || 0)),
                ];
                if (row.descripcion) detailParts.push(row.descripcion);
                li.textContent = detailParts.join(' | ');
                incomeList.appendChild(li);
            });
        }
    }

    if (expenseList) {
        expenseList.innerHTML = '';
        const expenseRows = Array.isArray(movements.detalle_salidas) ? movements.detalle_salidas : [];
        if (expenseRows.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Sin salidas registradas en el alcance seleccionado.';
            expenseList.appendChild(li);
        } else {
            expenseRows.forEach((row) => {
                const li = document.createElement('li');
                const detailParts = [
                    row.fecha || '',
                    row.metodo || '',
                    formatCurrency(Number(row.monto || 0)),
                ];
                if (row.descripcion) detailParts.push(row.descripcion);
                li.textContent = detailParts.join(' | ');
                expenseList.appendChild(li);
            });
        }
    }

    if (departmentList) {
        departmentList.innerHTML = '';
        if (departments.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Sin ventas por departamento para el alcance seleccionado.';
            departmentList.appendChild(li);
        } else {
            departments.forEach((row) => {
                const li = document.createElement('li');
                li.textContent = `${row.departamento || 'Sin departamento'}: ${formatCurrency(Number(row.total_vendido || 0))}`;
                departmentList.appendChild(li);
            });
        }
    }
    if (departmentTotal) {
        departmentTotal.textContent = `Total ventas por departamento: ${formatCurrency(totalDepartamentos)}`;
    }
    if (mixedTicketList) {
        mixedTicketList.innerHTML = '';
        if (!mixedRows.length && mixedTotals.count > 0) {
            const li = document.createElement('li');
            li.textContent = 'Hay ventas mixtas en el resumen, pero no se pudo reconstruir el detalle por ticket.';
            mixedTicketList.appendChild(li);
        } else if (!mixedRows.length) {
            const li = document.createElement('li');
            li.textContent = 'Sin ventas mixtas para el alcance seleccionado.';
            mixedTicketList.appendChild(li);
        } else {
            mixedRows.forEach((row) => {
                const saleId = Number(row.saleId || 0);
                const ticketLabel = String(row.ticket || '').trim();
                const saleTag = saleId > 0 ? `V${saleId}` : 'V-';
                const ticketTag = ticketLabel ? ` Tk:${ticketLabel}` : '';
                const li = document.createElement('li');
                li.textContent = `${saleTag}${ticketTag} | E:${formatCurrency(row.efectivo)} T:${formatCurrency(row.tarjeta)}`;
                mixedTicketList.appendChild(li);
            });
        }
    }
    if (mixedTicketTotal) {
        mixedTicketTotal.textContent = `Mixtas: ${mixedTotals.count} | Tot: ${formatCurrency(mixedTotals.total)}`;
    }
    if (topProductsByDepartmentList) topProductsByDepartmentList.innerHTML = '';
}

function getCutCalculatorPopupElements() {
    return {
        container: document.getElementById('cut-view'),
        popup: document.getElementById('cut-calculator-popup'),
        display: document.getElementById('cut-calc-display'),
        historyList: document.getElementById('cut-calc-history-list'),
        dragHandle: document.getElementById('cut-calculator-drag-handle'),
    };
}

function sanitizeCutCalculatorHistoryRows(rows) {
    if (!Array.isArray(rows)) return [];
    return rows
        .map((row) => ({
            expression: String(row?.expression || '').trim().slice(0, 80),
            result: String(row?.result || '').trim().slice(0, 40),
        }))
        .filter((row) => row.expression && row.result)
        .slice(0, CUT_CALCULATOR_HISTORY_LIMIT);
}

function loadCutCalculatorHistoryFromStorage() {
    try {
        const raw = localStorage.getItem(CUT_CALCULATOR_HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return sanitizeCutCalculatorHistoryRows(parsed);
    } catch (_) {
        return [];
    }
}

function saveCutCalculatorHistoryToStorage() {
    try {
        localStorage.setItem(CUT_CALCULATOR_HISTORY_KEY, JSON.stringify(cutCalculatorState.history.slice(0, CUT_CALCULATOR_HISTORY_LIMIT)));
    } catch (_) {
    }
}

function renderCutCalculatorHistory() {
    const { historyList } = getCutCalculatorPopupElements();
    if (!historyList) return;
    historyList.innerHTML = '';
    const rows = sanitizeCutCalculatorHistoryRows(cutCalculatorState.history);
    cutCalculatorState.history = rows;

    if (!rows.length) {
        const li = document.createElement('li');
        li.className = 'cut-calc-history-empty';
        li.textContent = 'Sin cuentas recientes.';
        historyList.appendChild(li);
        return;
    }

    rows.forEach((row) => {
        const li = document.createElement('li');
        li.textContent = `${row.expression} = ${row.result}`;
        historyList.appendChild(li);
    });
}

function renderCutCalculatorDisplay() {
    const { display } = getCutCalculatorPopupElements();
    if (!display) return;
    display.value = cutCalculatorState.expression || '0';
}

function showCutCalculatorError() {
    const { display } = getCutCalculatorPopupElements();
    if (!display) return;
    display.value = 'Error';
    if (cutCalculatorState.errorTimer) {
        clearTimeout(cutCalculatorState.errorTimer);
    }
    cutCalculatorState.errorTimer = setTimeout(() => {
        cutCalculatorState.errorTimer = null;
        renderCutCalculatorDisplay();
    }, 900);
}

function formatCutCalculatorResult(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    const rounded = Math.round((numeric + Number.EPSILON) * 1000000) / 1000000;
    return String(rounded);
}

function addCutCalculatorHistoryEntry(expression, resultText) {
    const normalizedExpression = String(expression || '').trim().slice(0, 80);
    const normalizedResult = String(resultText || '').trim().slice(0, 40);
    if (!normalizedExpression || !normalizedResult) return;

    const nextRows = [
        { expression: normalizedExpression, result: normalizedResult },
        ...cutCalculatorState.history.filter((row) => !(row.expression === normalizedExpression && row.result === normalizedResult)),
    ].slice(0, CUT_CALCULATOR_HISTORY_LIMIT);

    cutCalculatorState.history = nextRows;
    saveCutCalculatorHistoryToStorage();
    renderCutCalculatorHistory();
}

function evaluateCutCalculatorExpression(expression) {
    const source = String(expression || '').trim();
    if (!source) throw new Error('Expresion vacia');
    if (!/^[0-9+\-*/().\s]+$/.test(source)) throw new Error('Expresion invalida');
    if (!/[0-9]/.test(source)) throw new Error('Expresion invalida');
    if (/[+\-*/.]$/.test(source)) throw new Error('Expresion incompleta');
    const evaluator = new Function('"use strict"; return (' + source + ');');
    const result = Number(evaluator());
    if (!Number.isFinite(result)) throw new Error('Resultado invalido');
    return result;
}

function appendCutCalculatorDigit(digitValue) {
    const token = String(digitValue || '');
    if (!/^\d$/.test(token)) return;

    if (cutCalculatorState.justEvaluated) {
        cutCalculatorState.expression = '';
        cutCalculatorState.justEvaluated = false;
    }

    cutCalculatorState.expression += token;
    renderCutCalculatorDisplay();
}

function appendCutCalculatorDecimal() {
    if (cutCalculatorState.justEvaluated) {
        cutCalculatorState.expression = '';
        cutCalculatorState.justEvaluated = false;
    }

    const source = String(cutCalculatorState.expression || '');
    const segment = source.split(/[+\-*/]/).pop() || '';
    if (segment.includes('.')) return;

    if (!source || /[+\-*/]$/.test(source)) {
        cutCalculatorState.expression += '0.';
    } else {
        cutCalculatorState.expression += '.';
    }
    renderCutCalculatorDisplay();
}

function appendCutCalculatorOperator(operatorValue) {
    const token = String(operatorValue || '');
    if (!['+', '-', '*', '/'].includes(token)) return;

    let source = String(cutCalculatorState.expression || '');
    if (!source) {
        if (token === '-') {
            cutCalculatorState.expression = '-';
            cutCalculatorState.justEvaluated = false;
            renderCutCalculatorDisplay();
        }
        return;
    }

    if (cutCalculatorState.justEvaluated) {
        cutCalculatorState.justEvaluated = false;
    }

    if (/[+\-*/]$/.test(source)) {
        source = source.slice(0, -1);
    }

    cutCalculatorState.expression = `${source}${token}`;
    renderCutCalculatorDisplay();
}

function runCutCalculatorEquals() {
    const source = String(cutCalculatorState.expression || '').trim();
    if (!source) return;

    try {
        const resultValue = evaluateCutCalculatorExpression(source);
        const resultText = formatCutCalculatorResult(resultValue);
        if (!resultText) {
            showCutCalculatorError();
            return;
        }
        const printableExpression = source.replace(/\*/g, 'x').replace(/\//g, '/');
        addCutCalculatorHistoryEntry(printableExpression, resultText);
        cutCalculatorState.expression = resultText;
        cutCalculatorState.justEvaluated = true;
        renderCutCalculatorDisplay();
    } catch (_) {
        cutCalculatorState.expression = '';
        cutCalculatorState.justEvaluated = false;
        showCutCalculatorError();
    }
}

function handleCutCalculatorAction(action, value = '') {
    const normalizedAction = String(action || '').trim().toLowerCase();
    if (!normalizedAction) return;

    if (normalizedAction === 'digit') {
        appendCutCalculatorDigit(value);
        return;
    }
    if (normalizedAction === 'decimal') {
        appendCutCalculatorDecimal();
        return;
    }
    if (normalizedAction === 'operator') {
        appendCutCalculatorOperator(value);
        return;
    }
    if (normalizedAction === 'clear') {
        cutCalculatorState.expression = '';
        cutCalculatorState.justEvaluated = false;
        renderCutCalculatorDisplay();
        return;
    }
    if (normalizedAction === 'backspace') {
        if (cutCalculatorState.justEvaluated) {
            cutCalculatorState.expression = '';
            cutCalculatorState.justEvaluated = false;
            renderCutCalculatorDisplay();
            return;
        }
        cutCalculatorState.expression = String(cutCalculatorState.expression || '').slice(0, -1);
        renderCutCalculatorDisplay();
        return;
    }
    if (normalizedAction === 'equals') {
        runCutCalculatorEquals();
    }
}

function isEditableFieldElement(target) {
    if (!target) return false;
    if (target.isContentEditable) return true;
    const tag = String(target.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
}

function mapCutCalculatorKeyboardAction(event) {
    if (!event) return null;
    if (event.ctrlKey || event.metaKey || event.altKey) return null;

    const key = String(event.key || '');
    const code = String(event.code || '');
    if (/^\d$/.test(key)) {
        return { action: 'digit', value: key };
    }
    if (/^Numpad\d$/.test(code)) {
        return { action: 'digit', value: code.replace('Numpad', '') };
    }

    if (key === '.' || key === ',' || code === 'NumpadDecimal') {
        return { action: 'decimal' };
    }
    if (key === '+' || code === 'NumpadAdd') {
        return { action: 'operator', value: '+' };
    }
    if (key === '-' || code === 'NumpadSubtract') {
        return { action: 'operator', value: '-' };
    }
    if (key === '*' || key.toLowerCase() === 'x' || code === 'NumpadMultiply') {
        return { action: 'operator', value: '*' };
    }
    if (key === '/' || code === 'NumpadDivide') {
        return { action: 'operator', value: '/' };
    }
    if (key === 'Backspace') {
        return { action: 'backspace' };
    }
    if (key === 'Delete') {
        return { action: 'clear' };
    }
    if (key === 'Enter' || key === '=' || code === 'NumpadEnter') {
        return { action: 'equals' };
    }
    if (key === 'Escape') {
        return { action: 'close' };
    }

    return null;
}

function onCutCalculatorKeyDown(event) {
    const { popup } = getCutCalculatorPopupElements();
    if (!popup || popup.classList.contains('hidden')) return;

    const target = event.target;
    const focusInsideCalculator = Boolean(target && popup.contains(target));
    if (!focusInsideCalculator && isEditableFieldElement(target)) {
        return;
    }

    const mapped = mapCutCalculatorKeyboardAction(event);
    if (!mapped) return;

    event.preventDefault();
    event.stopPropagation();

    if (mapped.action === 'close') {
        closeCutCalculatorPopup();
        return;
    }

    handleCutCalculatorAction(mapped.action, mapped.value || '');
}

function clampCutCalculatorPosition(left, top, container, popup) {
    const margin = 8;
    const maxLeft = Math.max(margin, container.clientWidth - popup.offsetWidth - margin);
    const maxTop = Math.max(margin, container.clientHeight - popup.offsetHeight - margin);
    return {
        left: Math.max(margin, Math.min(left, maxLeft)),
        top: Math.max(margin, Math.min(top, maxTop)),
    };
}

function placeCutCalculatorDefaultPosition() {
    const { container, popup } = getCutCalculatorPopupElements();
    if (!container || !popup) return;
    const desiredLeft = container.clientWidth - popup.offsetWidth - 12;
    const desiredTop = 112;
    const clamped = clampCutCalculatorPosition(desiredLeft, desiredTop, container, popup);
    popup.style.left = `${clamped.left}px`;
    popup.style.top = `${clamped.top}px`;
    popup.style.right = 'auto';
}

function keepCutCalculatorInsideContainer() {
    const { container, popup } = getCutCalculatorPopupElements();
    if (!container || !popup) return;
    const currentLeft = Number.parseFloat(popup.style.left);
    const currentTop = Number.parseFloat(popup.style.top);
    if (!Number.isFinite(currentLeft) || !Number.isFinite(currentTop)) {
        placeCutCalculatorDefaultPosition();
        return;
    }
    const clamped = clampCutCalculatorPosition(currentLeft, currentTop, container, popup);
    popup.style.left = `${clamped.left}px`;
    popup.style.top = `${clamped.top}px`;
    popup.style.right = 'auto';
}

function endCutCalculatorDrag(pointerId = null) {
    const { popup } = getCutCalculatorPopupElements();
    if (popup && pointerId !== null && popup.hasPointerCapture?.(pointerId)) {
        try {
            popup.releasePointerCapture(pointerId);
        } catch (_) {
        }
    }
    cutCalculatorState.dragPointerId = null;
    document.removeEventListener('pointermove', onCutCalculatorDragMove);
    document.removeEventListener('pointerup', onCutCalculatorDragEnd);
    document.removeEventListener('pointercancel', onCutCalculatorDragEnd);
}

function onCutCalculatorDragMove(event) {
    if (cutCalculatorState.dragPointerId === null || event.pointerId !== cutCalculatorState.dragPointerId) {
        return;
    }
    const { container, popup } = getCutCalculatorPopupElements();
    if (!container || !popup) return;

    const containerRect = container.getBoundingClientRect();
    const targetLeft = event.clientX - containerRect.left - cutCalculatorState.dragOffsetX;
    const targetTop = event.clientY - containerRect.top - cutCalculatorState.dragOffsetY;
    const clamped = clampCutCalculatorPosition(targetLeft, targetTop, container, popup);
    popup.style.left = `${clamped.left}px`;
    popup.style.top = `${clamped.top}px`;
    popup.style.right = 'auto';
}

function onCutCalculatorDragEnd(event) {
    if (cutCalculatorState.dragPointerId === null || event.pointerId !== cutCalculatorState.dragPointerId) {
        return;
    }
    endCutCalculatorDrag(event.pointerId);
}

function startCutCalculatorDrag(event) {
    if (event.button !== 0) return;
    const { container, popup } = getCutCalculatorPopupElements();
    if (!container || !popup || popup.classList.contains('hidden')) return;
    event.preventDefault();

    const popupRect = popup.getBoundingClientRect();
    cutCalculatorState.dragPointerId = event.pointerId;
    cutCalculatorState.dragOffsetX = event.clientX - popupRect.left;
    cutCalculatorState.dragOffsetY = event.clientY - popupRect.top;
    cutCalculatorState.manualPositioned = true;

    popup.setPointerCapture?.(event.pointerId);
    document.addEventListener('pointermove', onCutCalculatorDragMove);
    document.addEventListener('pointerup', onCutCalculatorDragEnd);
    document.addEventListener('pointercancel', onCutCalculatorDragEnd);
}

function closeCutCalculatorPopup(options = {}) {
    const resetPosition = Boolean(options?.resetPosition);
    const { popup } = getCutCalculatorPopupElements();
    if (!popup) return;
    popup.classList.add('hidden');
    popup.setAttribute('aria-hidden', 'true');
    endCutCalculatorDrag(cutCalculatorState.dragPointerId);
    if (resetPosition) {
        cutCalculatorState.manualPositioned = false;
        popup.style.left = '';
        popup.style.top = '';
        popup.style.right = '';
    }
}

function setupCutCalculatorPopup() {
    const { popup, display, historyList, dragHandle } = getCutCalculatorPopupElements();
    if (!popup || !display || !historyList || !dragHandle) return;
    if (popup.dataset.cutCalculatorReady === '1') return;

    popup.dataset.cutCalculatorReady = '1';
    cutCalculatorState.history = loadCutCalculatorHistoryFromStorage();
    renderCutCalculatorHistory();
    renderCutCalculatorDisplay();

    popup.addEventListener('click', (event) => {
        const target = event.target?.closest?.('[data-cut-calc-action]');
        if (!target) return;
        const action = String(target.getAttribute('data-cut-calc-action') || '');
        const value = String(target.getAttribute('data-cut-calc-value') || '');
        handleCutCalculatorAction(action, value);
    });

    dragHandle.addEventListener('pointerdown', (event) => {
        const closeButton = event.target?.closest?.('.cut-calc-close-btn');
        if (closeButton) return;
        startCutCalculatorDrag(event);
    });

    document.addEventListener('keydown', onCutCalculatorKeyDown, true);

    window.addEventListener('resize', () => {
        const { popup: currentPopup } = getCutCalculatorPopupElements();
        if (!currentPopup || currentPopup.classList.contains('hidden')) return;
        if (!cutCalculatorState.manualPositioned) {
            placeCutCalculatorDefaultPosition();
        } else {
            keepCutCalculatorInsideContainer();
        }
    });
}

function toggleCutCalculatorPopup() {
    setupCutCalculatorPopup();
    const { popup } = getCutCalculatorPopupElements();
    if (!popup) return;

    if (popup.classList.contains('hidden')) {
        popup.classList.remove('hidden');
        popup.setAttribute('aria-hidden', 'false');
        renderCutCalculatorDisplay();
        renderCutCalculatorHistory();
        requestAnimationFrame(() => {
            if (!cutCalculatorState.manualPositioned) {
                placeCutCalculatorDefaultPosition();
            } else {
                keepCutCalculatorInsideContainer();
            }
        });
        return;
    }

    closeCutCalculatorPopup();
}

window.toggleCutCalculatorPopup = toggleCutCalculatorPopup;
window.closeCutCalculatorPopup = closeCutCalculatorPopup;

function resetCutViewToInitialState() {
    const cutSummary = document.getElementById('cut-summary');
    const cutBreakdown = document.getElementById('cut-breakdown');
    const scopeInfo = document.getElementById('cut-close-scope-info');
    const breakdownList = document.getElementById('cut-close-breakdown');
    const detailBody = document.getElementById('cut-close-detail-body');
    const closeBtn = document.getElementById('cut-close-shift-btn');
    const printBtn = document.getElementById('cut-print-session-btn');

    closeCutCalculatorPopup({ resetPosition: true });
    const today = cutCloseContext.currentDate || new Date().toISOString().slice(0, 10);
    if (cutSummary) cutSummary.textContent = 'Sin datos cargados.';
    renderCutReferenceSummaryValues({
        cashMain: 0,
        cashMainTx: 0,
        cardMain: 0,
        cardMainTx: 0,
        transferMain: 0,
        transferMainTx: 0,
        mixedTotal: 0,
        mixedTx: 0,
        mixedCash: 0,
        mixedCard: 0,
        cashTotal: 0,
        cashTotalTx: 0,
        cardTotal: 0,
        cardTotalTx: 0,
        transferTotal: 0,
        transferTotalTx: 0,
    });
    if (cutBreakdown) cutBreakdown.innerHTML = '';
    if (scopeInfo) scopeInfo.textContent = 'Selecciona una opcion para cargar el resumen de ventas.';
    if (breakdownList) breakdownList.innerHTML = '';
    if (detailBody) detailBody.innerHTML = '';
    if (closeBtn) closeBtn.disabled = true;
    if (printBtn) printBtn.disabled = true;

    cutCloseContext = {
        scope: null,
        esperadoEfectivo: 0,
        esperadoTarjeta: 0,
        resumenLoaded: false,
        sessionResumenLoaded: false,
        turnStatusLabel: '',
        currentDate: today,
        sessionReportSnapshot: null,
        historicalCutId: null,
    };

    updateCutHeadline({
        cashierName: getCurrentCutCashierLabel(),
        dateIso: today,
        startTime: '',
        endTime: '',
        statusText: '',
    });
    updateCutSessionContext({ visible: false });
    renderCutFinancialSections({}, { clearOnly: true });
    refreshCutCloseButtonState();
}

window.resetCutViewToInitialState = resetCutViewToInitialState;

function setSalesEnabledByShift(enabled) {
    const barcodeInput = document.getElementById('barcode');
    const addBtn = document.getElementById('searchCode');
    const openFinalizeBtn = document.getElementById('open-finalize-popup-btn');
    if (barcodeInput) barcodeInput.disabled = !enabled;
    if (addBtn) addBtn.disabled = !enabled;
    if (openFinalizeBtn) {
        openFinalizeBtn.disabled = !enabled || getCartTotalAmount() <= 0;
    }
    updateSalesSessionStrip();
}

function getSelectedPaymentMethod() {
    const activeTab = document.querySelector('.tabss .tab.active');
    if (activeTab?.dataset?.tab) return activeTab.dataset.tab;
    const firstVisible = document.querySelector('.tabss .tab:not(.hidden)');
    return firstVisible?.dataset?.tab || 'efectivo';
}

function parseMoneyInputValue(rawValue) {
    if (rawValue === null || rawValue === undefined) return 0;
    // CLP: tratamos montos como enteros, ignorando separadores de miles/moneda.
    const digitsOnly = String(rawValue).replace(/\D/g, '');
    if (!digitsOnly) return 0;
    const parsed = Number(digitsOnly);
    return Number.isFinite(parsed) ? parsed : 0;
}

function roundClpAmount(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.round(numeric);
}

function roundPromotionalUnitToNearestTen(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    // Regla negocio: 1-4 baja, 5-9 sube en la decena.
    const roundedInteger = Math.round(numeric);
    return Math.round(roundedInteger / 10) * 10;
}

function normalizePromotionProductIds(entries = []) {
    return [...new Set(
        (Array.isArray(entries) ? entries : [])
            .map((entry) => {
                if (entry && typeof entry === 'object') {
                    return Number(entry.product_id || entry.id_producto || entry.id || 0);
                }
                return Number(entry);
            })
            .filter((id) => Number.isInteger(id) && id > 0)
    )];
}

function buildSalesSinglePromotionRuleMap(promotions = []) {
    const map = new Map();
    (Array.isArray(promotions) ? promotions : []).forEach((promo) => {
        const promoType = String(promo?.promo_type || 'single').toLowerCase();
        if (promoType !== 'single') return;
        if (Number(promo?.is_active ?? 1) === 0) return;

        const promoLabel = normalizeText(promo?.nombre || `Promocion ${Number(promo?.id || 0) || ''}`);
        const fallbackRule = parseSinglePromotionPattern(promoLabel);
        const minQtyRaw = Number(promo?.min_qty || 0);
        const discountRaw = Number(promo?.discount_percent || 0);
        const minQty = (Number.isFinite(minQtyRaw) && minQtyRaw > 0)
            ? minQtyRaw
            : Number(fallbackRule?.minQty || 0);
        const discountPercent = (Number.isFinite(discountRaw) && discountRaw > 0)
            ? discountRaw
            : Number(fallbackRule?.discountPercent || 0);
        if (!Number.isFinite(minQty) || minQty < 2) return;
        if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 100) return;

        const productIds = normalizePromotionProductIds(promo?.productos);
        if (!productIds.length) return;

        productIds.forEach((productId) => {
            if (!map.has(productId)) {
                map.set(productId, []);
            }
            map.get(productId).push({
                id: Number(promo?.id || 0),
                label: promoLabel || 'Promocion',
                minQty,
                discountPercent,
                payQty: Number(fallbackRule?.payQty || 0),
            });
        });
    });

    map.forEach((rules, productId) => {
        map.set(productId, rules.sort((a, b) => {
            const byDiscount = Number(b.discountPercent || 0) - Number(a.discountPercent || 0);
            if (byDiscount !== 0) return byDiscount;
            return Number(b.minQty || 0) - Number(a.minQty || 0);
        }));
    });
    return map;
}

function buildSalesComboPromotionRules(promotions = []) {
    return (Array.isArray(promotions) ? promotions : [])
        .filter((promo) => String(promo?.promo_type || 'single').toLowerCase() === 'combo')
        .filter((promo) => Number(promo?.is_active ?? 1) !== 0)
        .map((promo) => {
            const comboPrice = Number(promo?.combo_price || 0);
            const productIds = normalizePromotionProductIds(promo?.productos);
            if (!Number.isFinite(comboPrice) || comboPrice <= 0 || productIds.length < 2) {
                return null;
            }
            return {
                id: Number(promo?.id || 0),
                label: normalizeText(promo?.nombre || `Combo ${Number(promo?.id || 0) || ''}`) || 'Combo',
                comboPrice: roundClpAmount(comboPrice),
                productIds,
            };
        })
        .filter(Boolean)
        .sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
}

async function loadSalesPromotionRules(options = {}) {
    const forceReload = Boolean(options.forceReload);
    const now = Date.now();
    const hasFreshCache = !forceReload
        && salesPromotionRulesLastSyncAt > 0
        && (now - salesPromotionRulesLastSyncAt) < SALES_PROMOTION_RULES_TTL_MS;
    if (hasFreshCache) {
        return salesPromotionRulesByProduct;
    }
    if (!forceReload && salesPromotionRulesLoadPromise) {
        return salesPromotionRulesLoadPromise;
    }

    salesPromotionRulesLoadPromise = (async () => {
        try {
            const response = await fetch(API_URL + 'api/promociones', {
                headers: withAuthHeaders(),
            });
            if (response.ok) {
                const rows = await response.json().catch(() => []);
                const promotions = Array.isArray(rows) ? rows : [];
                salesPromotionRulesByProduct = buildSalesSinglePromotionRuleMap(promotions);
                salesComboPromotionRules = buildSalesComboPromotionRules(promotions);
            }
        } catch (_) {
            // Silencioso: mantenemos cache actual.
        } finally {
            salesPromotionRulesLastSyncAt = Date.now();
            salesPromotionRulesLoadPromise = null;
        }
        return salesPromotionRulesByProduct;
    })();

    return salesPromotionRulesLoadPromise;
}

function invalidateSalesPromotionRulesCache() {
    salesPromotionRulesByProduct = new Map();
    salesComboPromotionRules = [];
    salesPromotionRulesLastSyncAt = 0;
    salesPromotionRulesLoadPromise = null;
}

function resolveCartItemSinglePromotionRule(item) {
    const productId = Number(item?.id_producto || 0);
    if (!Number.isInteger(productId) || productId <= 0) return null;
    if (isBulkSaleProduct(item)) return null;

    const quantity = Number(item?.quantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) return null;

    const rules = salesPromotionRulesByProduct.get(productId) || [];
    if (!Array.isArray(rules) || !rules.length) return null;

    return rules.find((rule) => (
        Number.isFinite(Number(rule?.minQty || 0))
        && Number(rule.minQty) > 0
        && quantity >= Number(rule.minQty)
        && Number.isFinite(Number(rule?.discountPercent || 0))
        && Number(rule.discountPercent) > 0
    )) || null;
}

function calculateSinglePromotionLinePricing(quantityValue, unitPriceValue, rule) {
    const quantity = Math.max(0, Math.floor(Number(quantityValue || 0)));
    const unitPrice = Math.max(0, Number(unitPriceValue || 0));
    const minQty = Math.max(2, Math.floor(Number(rule?.minQty || 0)));
    const discountPercent = Number(rule?.discountPercent || 0);
    const payQtyRaw = Number(rule?.payQty || 0);
    if (!Number.isFinite(quantity) || quantity < minQty) return null;
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) return null;
    if (!Number.isFinite(minQty) || minQty < 2) return null;

    const baseSubtotal = Math.max(0, roundClpAmount(unitPrice * quantity));
    const fullGroups = Math.floor(quantity / minQty);
    if (!Number.isFinite(fullGroups) || fullGroups < 1) return null;
    const promoUnits = fullGroups * minQty;
    const remainderUnits = Math.max(0, quantity - promoUnits);

    let promoSubtotal = 0;
    let normalizedDiscountPercent = discountPercent;
    const payQty = Number.isFinite(payQtyRaw) ? Math.floor(payQtyRaw) : 0;
    if (payQty > 0 && payQty < minQty) {
        promoSubtotal = Math.max(0, roundClpAmount(unitPrice * payQty * fullGroups));
        normalizedDiscountPercent = Math.round(((1 - (payQty / minQty)) * 100) * 100) / 100;
    } else {
        if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent >= 100) return null;
        const discountedUnitRaw = unitPrice * (1 - (discountPercent / 100));
        const discountedUnit = Math.max(0, roundPromotionalUnitToNearestTen(discountedUnitRaw));
        promoSubtotal = Math.max(0, roundClpAmount(discountedUnit * promoUnits));
    }

    const remainderSubtotal = Math.max(0, roundClpAmount(unitPrice * remainderUnits));
    const subtotal = Math.max(0, roundClpAmount(promoSubtotal + remainderSubtotal));
    const savings = Math.max(0, baseSubtotal - subtotal);
    if (savings <= 0) return null;

    const effectiveUnitPrice = quantity > 0
        ? Math.max(0, roundClpAmount(subtotal / quantity))
        : Math.max(0, roundClpAmount(unitPrice));
    return {
        subtotal,
        savings,
        baseSubtotal,
        effectiveUnitPrice,
        discountPercent: Math.max(0, Number(normalizedDiscountPercent || 0)),
        fullGroups,
    };
}

function getCartPricingSnapshot(items = cart) {
    const sourceItems = Array.isArray(items) ? items : [];
    const lines = sourceItems.map((item, index) => {
        const quantity = Number(item?.quantity || 0);
        const unitPrice = Number(item?.precio_venta || 0);
        const baseSubtotal = Math.max(0, roundClpAmount(unitPrice * quantity));
        const manualSubtotalRaw = Number(item?.line_subtotal);
        const hasManualSubtotal = Number.isFinite(manualSubtotalRaw) && manualSubtotalRaw > 0;
        const manualSubtotal = hasManualSubtotal ? Math.max(0, roundClpAmount(manualSubtotalRaw)) : 0;
        const productId = Number(item?.id_producto || 0);
        const isCommon = Boolean(item?.is_common) || !Number.isInteger(productId) || productId <= 0;
        const isBulk = isBulkSaleProduct(item);
        return {
            index,
            item,
            productId,
            quantity,
            unitPrice,
            isCommon,
            isBulk,
            hasManualSubtotal,
            baseSubtotal: hasManualSubtotal ? manualSubtotal : baseSubtotal,
            effectiveUnitPrice: Math.max(0, roundClpAmount(unitPrice)),
            subtotal: hasManualSubtotal ? manualSubtotal : baseSubtotal,
            singleDiscountAmount: 0,
            comboDiscountAmount: 0,
            savings: 0,
            hasPromotion: false,
            discountPercent: 0,
            discountPercentApprox: 0,
            promotionLabels: [],
            appliedPromotionLabel: '',
        };
    });

    lines.forEach((line) => {
        if (line.hasManualSubtotal || line.isCommon || line.isBulk) return;
        if (!Number.isFinite(line.quantity) || line.quantity <= 0) return;
        const rule = resolveCartItemSinglePromotionRule(line.item);
        if (!rule) return;

        const promoLine = calculateSinglePromotionLinePricing(line.quantity, line.unitPrice, rule);
        if (!promoLine) return;

        line.effectiveUnitPrice = Number(promoLine.effectiveUnitPrice || line.effectiveUnitPrice || 0);
        line.subtotal = Number(promoLine.subtotal || line.subtotal || 0);
        line.singleDiscountAmount = Number(promoLine.savings || 0);
        line.discountPercent = Number(promoLine.discountPercent || 0);
        line.promotionLabels.push(`PROMO ${String(rule.label || 'Promocion')} (-${formatPromotionNumberInputValue(line.discountPercent, '0')}%)`);
    });

    if (Array.isArray(salesComboPromotionRules) && salesComboPromotionRules.length > 0) {
        const lineByProductId = new Map();
        const availableUnits = new Map();

        lines.forEach((line) => {
            if (line.isCommon || line.hasManualSubtotal) return;
            if (!Number.isInteger(line.productId) || line.productId <= 0) return;
            lineByProductId.set(line.productId, line);
            availableUnits.set(line.productId, Math.max(0, Math.floor(Number(line.quantity || 0))));
        });

        salesComboPromotionRules.forEach((combo) => {
            const requiredIds = (Array.isArray(combo.productIds) ? combo.productIds : [])
                .filter((id) => lineByProductId.has(id));
            if (requiredIds.length < 2 || requiredIds.length !== Number(combo.productIds?.length || 0)) return;

            const bundleCount = Math.min(...requiredIds.map((id) => Number(availableUnits.get(id) || 0)));
            if (!Number.isFinite(bundleCount) || bundleCount < 1) return;

            const bundleBasePrice = requiredIds.reduce((sum, id) => {
                const line = lineByProductId.get(id);
                return sum + Number(line?.effectiveUnitPrice || 0);
            }, 0);
            const discountPerBundle = bundleBasePrice - Number(combo.comboPrice || 0);
            if (!Number.isFinite(discountPerBundle) || discountPerBundle <= 0) return;

            const totalComboDiscount = Math.max(0, roundClpAmount(discountPerBundle * bundleCount));
            if (totalComboDiscount <= 0) return;

            requiredIds.forEach((id) => {
                const currentQty = Number(availableUnits.get(id) || 0);
                availableUnits.set(id, Math.max(0, currentQty - bundleCount));
            });

            const discountPerProduct = requiredIds.length > 0 ? Math.floor(totalComboDiscount / requiredIds.length) : 0;
            let discountRemainder = Math.max(0, totalComboDiscount - (discountPerProduct * requiredIds.length));
            requiredIds.forEach((id) => {
                const line = lineByProductId.get(id);
                if (!line) return;
                const addDiscount = discountPerProduct + (discountRemainder > 0 ? 1 : 0);
                if (discountRemainder > 0) discountRemainder -= 1;
                line.comboDiscountAmount = Math.max(0, roundClpAmount(Number(line.comboDiscountAmount || 0) + addDiscount));
                const comboLabel = `COMBO ${String(combo.label || 'Combo')}`;
                if (!line.promotionLabels.includes(comboLabel)) {
                    line.promotionLabels.push(comboLabel);
                }
            });
        });
    }

    lines.forEach((line) => {
        if (line.comboDiscountAmount > 0) {
            line.subtotal = Math.max(0, roundClpAmount(Number(line.subtotal || 0) - Number(line.comboDiscountAmount || 0)));
        }
        line.savings = Math.max(0, Number(line.baseSubtotal || 0) - Number(line.subtotal || 0));
        line.hasPromotion = line.savings > 0;
        line.discountPercentApprox = Number(line.baseSubtotal || 0) > 0
            ? Math.round((line.savings / Number(line.baseSubtotal || 1)) * 100)
            : 0;
        if (!line.discountPercent && line.discountPercentApprox > 0) {
            line.discountPercent = line.discountPercentApprox;
        }
        line.appliedPromotionLabel = line.promotionLabels.join(' + ');
    });

    const totalSubtotal = lines.reduce((sum, line) => sum + Number(line.subtotal || 0), 0);
    const totalSavings = lines.reduce((sum, line) => sum + Number(line.savings || 0), 0);
    return {
        lines,
        totalSubtotal: Math.max(0, roundClpAmount(totalSubtotal)),
        totalSavings: Math.max(0, roundClpAmount(totalSavings)),
    };
}

function getCartItemAmountBreakdown(item) {
    const indexInLiveCart = Array.isArray(cart) ? cart.indexOf(item) : -1;
    if (indexInLiveCart >= 0) {
        const snapshot = getCartPricingSnapshot(cart);
        const line = snapshot.lines[indexInLiveCart];
        if (line) {
            return {
                subtotal: Number(line.subtotal || 0),
                baseSubtotal: Number(line.baseSubtotal || 0),
                savings: Number(line.savings || 0),
                hasPromotion: Boolean(line.hasPromotion),
                effectiveUnitPrice: Number(line.effectiveUnitPrice || 0),
                discountPercent: Number(line.discountPercent || 0),
                discountPercentApprox: Number(line.discountPercentApprox || 0),
                appliedPromotionLabel: String(line.appliedPromotionLabel || ''),
            };
        }
    }

    const manualSubtotal = Number(item?.line_subtotal);
    if (Number.isFinite(manualSubtotal) && manualSubtotal > 0) {
        const subtotalManual = roundClpAmount(manualSubtotal);
        return {
            subtotal: subtotalManual,
            baseSubtotal: subtotalManual,
            savings: 0,
            hasPromotion: false,
            effectiveUnitPrice: Number(item?.precio_venta || 0),
            discountPercent: 0,
            discountPercentApprox: 0,
            appliedPromotionLabel: '',
        };
    }

    const unitPrice = Number(item?.precio_venta || 0);
    const quantity = Number(item?.quantity || 0);
    const baseSubtotal = roundClpAmount(unitPrice * quantity);
    const promoRule = resolveCartItemSinglePromotionRule(item);
    if (!promoRule) {
        return {
            subtotal: baseSubtotal,
            baseSubtotal,
            savings: 0,
            hasPromotion: false,
            effectiveUnitPrice: roundClpAmount(unitPrice),
            discountPercent: 0,
            discountPercentApprox: 0,
            appliedPromotionLabel: '',
        };
    }

    const promoLine = calculateSinglePromotionLinePricing(quantity, unitPrice, promoRule);
    const subtotalWithPromo = Number(promoLine?.subtotal || baseSubtotal);
    const savings = Number(promoLine?.savings || 0);
    const hasPromotion = savings > 0;
    const discountPercentApprox = baseSubtotal > 0
        ? Math.round((savings / baseSubtotal) * 100)
        : 0;
    const normalizedDiscountPercent = hasPromotion
        ? Number(promoLine?.discountPercent || discountPercentApprox)
        : 0;
    const promoLabel = normalizeText(promoRule.label || 'Promocion') || 'Promocion';
    return {
        subtotal: hasPromotion ? subtotalWithPromo : baseSubtotal,
        baseSubtotal,
        savings: hasPromotion ? savings : 0,
        hasPromotion,
        effectiveUnitPrice: hasPromotion
            ? Number(promoLine?.effectiveUnitPrice || roundClpAmount(unitPrice))
            : roundClpAmount(unitPrice),
        discountPercent: hasPromotion ? normalizedDiscountPercent : 0,
        discountPercentApprox: hasPromotion ? discountPercentApprox : 0,
        appliedPromotionLabel: hasPromotion
            ? `PROMO ${promoLabel} (-${formatPromotionNumberInputValue(normalizedDiscountPercent, '0')}%)`
            : '',
    };
}

function getCartItemSubtotalAmount(item) {
    return Number(getCartItemAmountBreakdown(item).subtotal || 0);
}

function getCartTotalSavingsAmount(items = cart) {
    return getCartPricingSnapshot(items).totalSavings;
}

function getCartTotalAmount(items = cart) {
    return getCartPricingSnapshot(items).totalSubtotal;
}

function updateSalesSessionStrip() {
    const cajaEl = document.getElementById('sales-status-caja');
    const cajeroEl = document.getElementById('sales-status-cajero');
    const turnoEl = document.getElementById('sales-status-turno');
    if (!cajaEl && !cajeroEl && !turnoEl) return;

    const caja = String(localStorage.getItem('n_caja') || localStorage.getItem('caja') || '-').trim() || '-';
    const cajeroId = String(localStorage.getItem('id_user') || '-').trim() || '-';
    const profileRaw = localStorage.getItem('user_profile');
    let profile = {};
    try {
        profile = profileRaw ? JSON.parse(profileRaw) : {};
    } catch (_) {
        profile = {};
    }
    const cajeroNombre = String(profile?.nombre || profile?.username_login || '').trim();
    const cajeroLabel = cajeroNombre ? `${cajeroNombre} (${cajeroId})` : cajeroId;
    const turnoLabel = shiftStarted ? 'Abierto' : 'Sin iniciar';

    if (cajaEl) cajaEl.textContent = caja;
    if (cajeroEl) cajeroEl.textContent = cajeroLabel;
    if (turnoEl) turnoEl.textContent = turnoLabel;
}

function showPaymentWarning(message) {
    const warning = document.getElementById('payment-warning');
    if (!warning) return;
    warning.textContent = message;
    warning.classList.remove('hidden');
}

function clearPaymentWarning() {
    const warning = document.getElementById('payment-warning');
    if (!warning) return;
    warning.textContent = '';
    warning.classList.add('hidden');
}

function resetPaymentInputs() {
    const fields = [
        'efectivoEfectivo',
        'efectivoMixto',
        'tarjetaMixto',
        'referenciaTarjeta',
        'referenciaDolares',
        'referenciaTransferencia',
        'referenciaCheque',
        'referenciaVale',
    ];
    fields.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const changeFields = ['cambioEfectivo', 'cambioMixto'];
    changeFields.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = '';
            el.style.color = '';
        }
    });
}

function validatePaymentCoverage(totalAmount, metodoPago) {
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
        return { ok: false, missingAmount: 0, reason: 'invalid_total' };
    }
    const strictCash = Boolean(Number(window.salePaymentSettings?.cash_strict_amount ?? 0));

    if (metodoPago === 'efectivo') {
        if (!strictCash) {
            return { ok: true, missingAmount: 0, reason: '' };
        }
        const efectivo = parseMoneyInputValue(document.getElementById('efectivoEfectivo')?.value);
        const missingAmount = totalAmount - efectivo;
        return {
            ok: missingAmount <= 0,
            missingAmount: Math.max(0, missingAmount),
            reason: missingAmount <= 0 ? '' : 'missing_amount',
        };
    }

    if (metodoPago === 'mixto') {
        const efectivoPagado = parseMoneyInputValue(document.getElementById('efectivoMixto')?.value);
        const tarjeta = parseMoneyInputValue(document.getElementById('tarjetaMixto')?.value);
        if (tarjeta > totalAmount) {
            return {
                ok: false,
                missingAmount: 0,
                reason: 'card_exceeds_total',
            };
        }
        const efectivoRequerido = Math.max(0, roundClpAmount(totalAmount) - roundClpAmount(tarjeta));
        const missingAmount = efectivoRequerido - efectivoPagado;
        return {
            ok: missingAmount <= 0,
            missingAmount: Math.max(0, missingAmount),
            reason: missingAmount <= 0 ? '' : 'missing_cash_for_mixed',
        };
    }

    return { ok: true, missingAmount: 0, reason: '' };
}

function buildPaymentAllocation(totalAmount, metodoPago) {
    const amount = roundClpAmount(totalAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
        return { monto_efectivo: 0, monto_tarjeta: 0 };
    }

    if (metodoPago === 'efectivo') {
        return { monto_efectivo: amount, monto_tarjeta: 0 };
    }
    if (metodoPago === 'tarjeta') {
        return { monto_efectivo: 0, monto_tarjeta: amount };
    }
    if (metodoPago === 'mixto') {
        const tarjetaIngresada = Math.max(0, roundClpAmount(parseMoneyInputValue(document.getElementById('tarjetaMixto')?.value)));
        const tarjetaAplicada = Math.max(0, Math.min(amount, tarjetaIngresada));
        const efectivoAplicado = Math.max(0, amount - tarjetaAplicada);

        return {
            monto_efectivo: efectivoAplicado,
            monto_tarjeta: tarjetaAplicada,
        };
    }

    return { monto_efectivo: 0, monto_tarjeta: 0 };
}

const LOCAL_PRINT_BRIDGE_CANDIDATES = ['http://127.0.0.1:7357/', 'http://localhost:7357/'];
let localPrintBridgeState = { base: null, checkedAt: 0 };
const LOCAL_PRINT_BRIDGE_CACHE_MS = 180000;

function getLocalPrintBridgeCandidates() {
    const custom = String(localStorage.getItem('local_print_bridge_url') || '').trim();
    if (!custom) return [...LOCAL_PRINT_BRIDGE_CANDIDATES];
    const normalized = custom.endsWith('/') ? custom : `${custom}/`;
    return [normalized, ...LOCAL_PRINT_BRIDGE_CANDIDATES];
}

async function resolveLocalPrintBridgeBase(force = false) {
    const now = Date.now();
    const cacheIsFresh = (now - localPrintBridgeState.checkedAt) < LOCAL_PRINT_BRIDGE_CACHE_MS;
    if (!force && cacheIsFresh) {
        return localPrintBridgeState.base || null;
    }
    const candidates = getLocalPrintBridgeCandidates();
    for (const base of candidates) {
        try {
            const response = await fetch(`${base}health`, { cache: 'no-store' });
            if (!response.ok) continue;
            localPrintBridgeState = { base, checkedAt: now };
            return base;
        } catch (_) {
            // continue
        }
    }
    localPrintBridgeState = { base: null, checkedAt: now };
    return null;
}

function shouldForceLocalTicketPrinting() {
    const raw = String(localStorage.getItem('force_local_ticket_print') || '').trim().toLowerCase();
    if (!raw) return false;
    return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'si';
}

function getLocalPrintBridgeRequiredMessage() {
    return 'No se detecto la impresion local de esta caja. Abre iniciar_servicios_ocultos.bat en este equipo y vuelve a intentar.';
}

function normalizeTicketPaperWidthMm(value, fallback = 58) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed)) {
        return Number(fallback || 58) >= 80 ? 80 : 58;
    }
    return parsed >= 80 ? 80 : 58;
}

function clampTicketFontSizePt(value, fallback = 6.5) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(4.5, Math.min(12, parsed));
}

function normalizeTicketFontAdjustPx(value, fallback = 0) {
    const parsed = Number(value);
    const normalizedFallback = Number.isFinite(Number(fallback)) ? Number(fallback) : 0;
    if (!Number.isFinite(parsed)) return Math.max(-8, Math.min(8, normalizedFallback));
    return Math.max(-8, Math.min(8, Number(parsed.toFixed(2))));
}

function isTicketTitleLineForPrint(line = '', index = 0) {
    const trimmed = String(line || '').trim();
    if (!trimmed) return false;
    if (/^[-=]{6,}$/.test(trimmed)) return false;
    if (index === 0) return true;
    return /^(DETALLE|TOTAL|ORIGINAL CLIENTE|CORTE DE TURNO|DINERO EN CAJA|ENTRADAS EFECTIVO|SALIDAS EFECTIVO|VENTAS POR DEPTO|VENTAS|RESUMEN|COMPROBANTE DE VENTA|COMPROBANTE|TICKET|TURNO\s*#\d+)$/i.test(trimmed);
}

function normalizeCutPrintLabelMapForBrowser(raw = {}) {
    const defaults = {
        title_cut: 'CORTE DE TURNO',
        title_cash_box: 'DINERO EN CAJA',
        title_entries: 'ENTRADAS EFECTIVO',
        title_exits: 'SALIDAS EFECTIVO',
        title_sales: 'VENTAS',
        title_departments: 'VENTAS POR DEPTO',
        title_report_footer: 'REPORTE DE CORTE',
        label_shift_prefix: 'TURNO #',
        label_generated_at: 'Realizado',
        label_cashier: 'Cajero',
        label_box: 'Caja',
        label_schedule: 'Horario',
        label_sales_total: 'Ventas totales',
        label_base_fund: 'Fondo de caja',
        label_cash_sales: 'Ventas en efectivo',
        label_cash_payments: 'Abonos en efectivo',
        label_cash_entries: 'Entradas',
        label_cash_exits: 'Salidas',
        label_cash_in_box: 'Efectivo en caja',
        label_total_entries: 'Total entradas',
        label_total_exits: 'Total salidas',
        label_detail_title: 'Detalle y suma por item',
        label_no_entries: 'SIN ENTRADAS DETALLADAS',
        label_no_exits: 'SIN SALIDAS DETALLADAS',
        label_hidden_detail: 'DETALLE OCULTO POR CONFIGURACION',
        label_returns: 'Devoluciones',
        label_total_sales_line: 'Total ventas',
        label_no_departments: 'SIN VENTAS POR DEPARTAMENTO',
        label_report_no_items: 'REPORTE CONFIGURADO SIN ITEMS',
    };
    const source = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    Object.keys(defaults).forEach((key) => {
        const value = String(source[key] ?? '').replace(/\s+/g, ' ').trim();
        out[key] = value || defaults[key];
    });
    return out;
}

function normalizeCutPrintStyleMapForBrowser(raw = {}, labelMap = {}) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    Object.keys(labelMap).forEach((key) => {
        const row = source[key] && typeof source[key] === 'object' ? source[key] : {};
        const modeRaw = String(row.mode || '').trim().toLowerCase();
        const mode = modeRaw === 'bold' || modeRaw === 'italic' ? modeRaw : 'normal';
        const parsedSize = Number(row.size);
        const size = Number.isFinite(parsedSize) ? Math.max(0.8, Math.min(1.8, Number(parsedSize.toFixed(2)))) : 1;
        out[key] = { mode, size };
    });
    return out;
}

function buildCutPrintStyleRulesForBrowser(options = {}) {
    const labels = normalizeCutPrintLabelMapForBrowser(options.cutPrintLabels || {});
    const styles = normalizeCutPrintStyleMapForBrowser(options.cutPrintStyles || {}, labels);
    const rules = [];
    const addRule = (key, match, text) => {
        const style = styles[key];
        const ruleText = String(text || '').trim();
        if (!style || !ruleText) return;
        if (style.mode === 'normal' && Math.abs(Number(style.size || 1) - 1) < 0.001) return;
        rules.push({
            match: match === 'starts' ? 'starts' : 'exact',
            text: ruleText,
            mode: style.mode,
            size: style.size,
        });
    };

    addRule('title_cut', 'exact', labels.title_cut);
    addRule('title_cash_box', 'exact', labels.title_cash_box);
    addRule('title_entries', 'exact', labels.title_entries);
    addRule('title_exits', 'exact', labels.title_exits);
    addRule('title_sales', 'exact', labels.title_sales);
    addRule('title_departments', 'exact', labels.title_departments);
    addRule('title_report_footer', 'exact', labels.title_report_footer);
    addRule('label_shift_prefix', 'starts', labels.label_shift_prefix);
    addRule('label_generated_at', 'starts', labels.label_generated_at);
    addRule('label_cashier', 'starts', labels.label_cashier);
    addRule('label_box', 'starts', labels.label_box);
    addRule('label_schedule', 'starts', labels.label_schedule);
    addRule('label_sales_total', 'starts', labels.label_sales_total);
    addRule('label_base_fund', 'starts', labels.label_base_fund);
    addRule('label_cash_sales', 'starts', labels.label_cash_sales);
    addRule('label_cash_payments', 'starts', labels.label_cash_payments);
    addRule('label_cash_entries', 'starts', labels.label_cash_entries);
    addRule('label_cash_exits', 'starts', labels.label_cash_exits);
    addRule('label_cash_in_box', 'starts', labels.label_cash_in_box);
    addRule('label_total_entries', 'starts', labels.label_total_entries);
    addRule('label_total_exits', 'starts', labels.label_total_exits);
    addRule('label_detail_title', 'exact', labels.label_detail_title);
    addRule('label_no_entries', 'exact', labels.label_no_entries);
    addRule('label_no_exits', 'exact', labels.label_no_exits);
    addRule('label_hidden_detail', 'exact', labels.label_hidden_detail);
    addRule('label_returns', 'starts', labels.label_returns);
    addRule('label_total_sales_line', 'starts', labels.label_total_sales_line);
    addRule('label_no_departments', 'exact', labels.label_no_departments);
    addRule('label_report_no_items', 'exact', labels.label_report_no_items);
    return rules;
}

function getCutCustomLineStyleForBrowser(line = '', rules = []) {
    if (!Array.isArray(rules) || !rules.length) return null;
    const trimmed = String(line || '').trim();
    if (!trimmed) return null;
    for (let i = 0; i < rules.length; i += 1) {
        const rule = rules[i];
        const text = String(rule?.text || '').trim();
        if (!text) continue;
        if (rule.match === 'starts') {
            if (trimmed.toLowerCase().startsWith(text.toLowerCase())) return rule;
            continue;
        }
        if (trimmed.toLowerCase() === text.toLowerCase()) return rule;
    }
    return null;
}

function renderTicketLinesHtml(ticketText = '', options = {}) {
    const customCutStyleRules = buildCutPrintStyleRulesForBrowser(options);
    const disableAutoTitleScale = Boolean(options.disableAutoTitleScale || options.cutPrintLabels || options.cutPrintStyles);
    const lines = String(ticketText || '').replace(/\r\n/g, '\n').split('\n');
    return lines.map((line, index) => {
        const customStyleRule = getCutCustomLineStyleForBrowser(line, customCutStyleRules);
        const isTitle = customStyleRule ? false : (!disableAutoTitleScale && isTicketTitleLineForPrint(line, index));
        const safeLine = escapeHtml(line || ' ');
        const customSizeRaw = Number(customStyleRule?.size || 1);
        const customSize = Number.isFinite(customSizeRaw) ? Math.max(0.8, Math.min(1.8, customSizeRaw)) : 1;
        const hasTrailingAmount = /[-+]?\s*\$\s*[0-9\.,]+\s*$/i.test(String(line || '').trim());
        const effectiveCustomSize = hasTrailingAmount ? Math.min(1, customSize) : customSize;
        const customStyleAttr = customStyleRule
            ? ` style="font-weight:${customStyleRule.mode === 'bold' ? 700 : 400};font-style:${customStyleRule.mode === 'italic' ? 'italic' : 'normal'};font-size:${effectiveCustomSize.toFixed(2)}em;"`
            : '';
        return `<div class="ticket-line${isTitle ? ' ticket-line-title' : ''}"${customStyleAttr}>${safeLine}</div>`;
    }).join('');
}

function buildBrowserTicketPrintHtml(ticketText = '', documentTitle = 'Ticket', options = {}) {
    const paperWidthMm = normalizeTicketPaperWidthMm(options.paperWidthMm, 58);
    const fontSizePt = clampTicketFontSizePt(options.fontSizePt, 6.5);
    const fontBoostPx = normalizeTicketFontAdjustPx(options.fontBoostPx, 0);
    const ticketHtml = renderTicketLinesHtml(ticketText, options);
    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(documentTitle)}</title>
  <style>
    @page { size: ${paperWidthMm}mm auto; margin: 0.6mm 0.5mm; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { width: ${paperWidthMm}mm; font-family: Consolas, "Courier New", monospace; font-size: ${fontSizePt}pt; line-height: 1.18; color: #000; --ticket-font-boost-px: ${fontBoostPx.toFixed(2)}px; }
    .ticket-content { width: 98%; margin: 0 auto; padding: 0; }
    .ticket-line { width: 100%; white-space: pre; font-weight: 400; overflow: hidden; font-size: calc(1em + var(--ticket-font-boost-px, 0px)); }
    .ticket-line-title { font-weight: 800; font-size: calc(1.26em + var(--ticket-font-boost-px, 0px)); letter-spacing: 0.2px; }
  </style>
</head>
<body>
  <div class="ticket-content">${ticketHtml}</div>
</body>
</html>`;
}

async function printTicketTextInBrowser(ticketText = '', documentTitle = 'Ticket', options = {}) {
    if (!String(ticketText || '').trim()) {
        throw new Error('No hay contenido para imprimir');
    }
    const printWindow = window.open('', '_blank', 'width=460,height=720');
    if (!printWindow) {
        throw new Error('El navegador bloqueo la ventana de impresion local. Habilita popups para este sitio.');
    }
    const html = buildBrowserTicketPrintHtml(ticketText, documentTitle, options);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        try {
            printWindow.print();
        } catch (_) {
        }
    }, 180);
    return { success: true, mode: 'browser_local', printer: 'default_browser_printer' };
}

async function fetchPrintPayload(endpoint, payload, defaultMessage) {
    const response = await fetch(API_URL + endpoint, {
        method: 'POST',
        headers: {
            ...withAuthHeaders({
                'Content-Type': 'application/json',
            }),
        },
        body: JSON.stringify({ ...payload, return_payload: true }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || defaultMessage);
    }
    if (!data?.ticket_text) {
        throw new Error('No se pudo generar el texto del ticket para imprimir');
    }
    return data;
}

async function sendTicketToLocalBridge({ bridgeBase = '', printerName = '', text = '', printEngine = 'auto', fontSize = 6.5 }) {
    const base = bridgeBase || await resolveLocalPrintBridgeBase();
    if (!base) {
        throw new Error('Bridge local no disponible');
    }
    const response = await fetch(`${base}api/print/ticket`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            printer_name: String(printerName || '').trim(),
            text: String(text || ''),
            print_engine: String(printEngine || 'auto'),
            font_size: Number(fontSize || 6.5),
        }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'No se pudo imprimir en el equipo local');
    }
    return data;
}

async function printTicketLocalFirst({
    payloadData,
    localSuccessMessage,
    fallbackEndpoint,
    fallbackPayload,
    fallbackErrorMessage,
}) {
    const bridgeBase = await resolveLocalPrintBridgeBase(true);
    const forceLocal = shouldForceLocalTicketPrinting();
    let localBridgeError = null;

    if (forceLocal) {
        if (!bridgeBase) {
            throw new Error(getLocalPrintBridgeRequiredMessage());
        }
        try {
            const localData = await sendTicketToLocalBridge({
                bridgeBase,
                printerName: payloadData.printer || '',
                text: payloadData.ticket_text,
                printEngine: payloadData.print_engine || 'auto',
                fontSize: payloadData.font_size || 6.5,
            });
            return {
                message: localSuccessMessage,
                printer: localData?.printer || payloadData.printer || null,
                mode: 'local',
            };
        } catch (error) {
            throw new Error(`No se pudo imprimir en la impresora local: ${error.message || 'Error de impresion local'}`);
        }
    }

    if (bridgeBase) {
        try {
            const localData = await sendTicketToLocalBridge({
                bridgeBase,
                printerName: payloadData.printer || '',
                text: payloadData.ticket_text,
                printEngine: payloadData.print_engine || 'auto',
                fontSize: payloadData.font_size || 6.5,
            });
            return {
                message: localSuccessMessage,
                printer: localData?.printer || payloadData.printer || null,
                mode: 'local',
            };
        } catch (error) {
            localBridgeError = error;
        }
    }

    try {
        await printTicketTextInBrowser(payloadData.ticket_text, localSuccessMessage, {
            paperWidthMm: payloadData.paper_width_mm,
            fontSizePt: payloadData.font_size,
            fontBoostPx: payloadData.font_size_adjust_px || 0,
            cutPrintLabels: payloadData.cut_print_labels || null,
            cutPrintStyles: payloadData.cut_print_styles || null,
        });
        return {
            message: `${localSuccessMessage} (navegador local)` ,
            printer: 'predeterminada del navegador',
            mode: 'browser_local',
        };
    } catch (browserError) {
        if (localBridgeError) {
            throw new Error(`No se pudo imprimir localmente (bridge y navegador): ${browserError.message}`);
        }
    }

    const response = await fetch(API_URL + fallbackEndpoint, {
        method: 'POST',
        headers: {
            ...withAuthHeaders({
                'Content-Type': 'application/json',
            }),
        },
        body: JSON.stringify(fallbackPayload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || fallbackErrorMessage);
    }
    return data;
}

async function printSaleTicket(ventaId, includeDetails) {
    const cajaRaw = String(localStorage.getItem('n_caja') || localStorage.getItem('caja') || '').trim();
    const payload = {
        venta_id: ventaId,
    };
    if (/^\d+$/.test(cajaRaw)) {
        payload.numero_caja = Number(cajaRaw);
    }
    if (typeof includeDetails !== 'undefined') {
        payload.include_details = includeDetails;
    }

    const payloadData = await fetchPrintPayload('api/print/sale-ticket', payload, 'No se pudo generar el ticket para imprimir');
    return printTicketLocalFirst({
        payloadData,
        localSuccessMessage: 'Ticket enviado a impresion local',
        fallbackEndpoint: 'api/print/sale-ticket',
        fallbackPayload: payload,
        fallbackErrorMessage: 'No se pudo imprimir el comprobante',
    });
}

async function printCutSessionTicket() {
    const cajaRaw = String(localStorage.getItem('n_caja') || localStorage.getItem('caja') || '').trim();
    const cajeroRaw = String(localStorage.getItem('id_user') || '').trim();
    const payload = {};
    if (/^\d+$/.test(cajaRaw)) {
        payload.numero_caja = Number(cajaRaw);
    }
    if (/^\d+$/.test(cajeroRaw)) {
        payload.cajero = Number(cajeroRaw);
    }

    const payloadData = await fetchPrintPayload('api/print/cut-session-ticket', payload, 'No se pudo generar el reporte de corte');
    return printTicketLocalFirst({
        payloadData,
        localSuccessMessage: 'Reporte de corte enviado a impresion local',
        fallbackEndpoint: 'api/print/cut-session-ticket',
        fallbackPayload: payload,
        fallbackErrorMessage: 'No se pudo imprimir el reporte de corte',
    });
}

async function printCutById(cutId) {
    const cajaRaw = String(localStorage.getItem('n_caja') || localStorage.getItem('caja') || '').trim();
    const cajeroRaw = String(localStorage.getItem('id_user') || '').trim();
    const parsedCutId = Number(cutId || 0);
    if (!Number.isFinite(parsedCutId) || parsedCutId <= 0) {
        throw new Error('Corte historico invalido para reimpresion');
    }

    const payload = { cut_id: parsedCutId };
    if (/^\d+$/.test(cajaRaw)) {
        payload.numero_caja = Number(cajaRaw);
    }
    if (/^\d+$/.test(cajeroRaw)) {
        payload.cajero = Number(cajeroRaw);
    }

    const payloadData = await fetchPrintPayload('api/print/cut-session-ticket', payload, 'No se pudo generar el corte historico para imprimir');
    return printTicketLocalFirst({
        payloadData,
        localSuccessMessage: 'Corte historico enviado a impresion local',
        fallbackEndpoint: 'api/print/cut-session-ticket',
        fallbackPayload: payload,
        fallbackErrorMessage: 'No se pudo reimprimir el corte historico',
    });
}

function withAuthHeaders(headers = {}) {
    const token = getSessionToken();
    if (token) {
        return { ...headers, Authorization: `Bearer ${token}` };
    }
    return headers;
}

function handleSessionExpiredRedirect(message = 'Sesion expirada. Vuelve a iniciar sesion.') {
    alert(message);
    revokeRefreshTokenSilently();
    clearSessionTokens();
    localStorage.removeItem('id_user');
    localStorage.removeItem('user_permissions');
    localStorage.removeItem('user_is_admin');
    localStorage.removeItem('estado_login');
    window.location.href = 'index.php';
}

function getActiveCajaCajero() {
    const caja = String(localStorage.getItem('n_caja') || localStorage.getItem('caja') || '').trim();
    const cajero = String(localStorage.getItem('id_user') || '').trim();
    if (!/^\d+$/.test(caja) || !/^\d+$/.test(cajero)) {
        return null;
    }
    return { caja, cajero };
}

async function fetchShiftStatus() {
    const session = getActiveCajaCajero();
    if (!session) {
        return { estado: 'sin_turno' };
    }
    let token = getSessionToken();
    if (!token) {
        token = await refreshAccessTokenIfNeeded();
    }
    if (!token) return { estado: 'sesion_invalida' };

    try {
        const { caja, cajero } = session;
        const query = new URLSearchParams({ caja, cajero });
        const requestShiftStatus = async () => {
            return fetch(API_URL + `api/turno/estado?${query.toString()}`, {
                headers: withAuthHeaders(),
            });
        };

        let response = await requestShiftStatus();
        let data = await response.json().catch(() => ({}));
        if (response.status === 401) {
            const refreshed = await refreshAccessTokenIfNeeded();
            if (!refreshed) return { estado: 'sesion_invalida' };
            response = await requestShiftStatus();
            data = await response.json().catch(() => ({}));
        }
        if (!response.ok) {
            if (response.status === 401) return { estado: 'sesion_invalida' };
            return { estado: 'error_validacion_turno' };
        }
        return data;
    } catch (_) {
        return { estado: 'error_validacion_turno' };
    }
}

async function startShift(montoInicial) {
    const session = getActiveCajaCajero();
    if (!session) {
        throw new Error('Sesion de caja/cajero invalida');
    }
    const { caja, cajero } = session;
    const response = await fetch(API_URL + 'api/turno/iniciar', {
        method: 'POST',
        headers: {
            ...withAuthHeaders({
                'Content-Type': 'application/json',
            }),
        },
        body: JSON.stringify({
            numero_caja: caja,
            cajero,
            monto_inicial: montoInicial,
        }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('SESION_INVALIDA');
        }
        throw new Error(data.message || 'No se pudo iniciar turno');
    }
    return data;
}

async function ensureShiftStartedOnLoadImpl() {
    const salesAnchor = document.getElementById('barcode');
    if (!salesAnchor) return;

    const session = getActiveCajaCajero();
    if (!session) return;

    if (localStorage.getItem('turno_id_actual') && !hasLocalShiftContextForCurrentUser()) {
        clearLocalShiftContext();
    }

    if (hasLocalShiftContextForCurrentUser()) {
        const localMontoInicial = Number(localStorage.getItem('turno_monto_inicial'));
        if (!Number.isFinite(localMontoInicial) || localMontoInicial < 0) {
            clearLocalShiftContext();
        } else {
            const localStatus = await fetchShiftStatus();
            if (localStatus.estado === 'abierto') {
                if (localStatus.id_corte) {
                    localStorage.setItem('turno_id_actual', String(localStatus.id_corte));
                }
                setLocalShiftOwnership();
                shiftStarted = true;
                applyShiftInitialAmountUI(localMontoInicial);
                setSalesEnabledByShift(true);
                ensureLocalShiftSalesFlagInitialized();
                await load_ticket();
                return;
            }
            if (localStatus.estado === 'error_validacion_turno') {
                shiftStarted = true;
                applyShiftInitialAmountUI(localMontoInicial);
                setSalesEnabledByShift(true);
                ensureLocalShiftSalesFlagInitialized();
                await load_ticket();
                scheduleShiftStatusRetry();
                return;
            }
            if (localStatus.estado === 'sesion_invalida') {
                shiftStarted = true;
                applyShiftInitialAmountUI(localMontoInicial);
                setSalesEnabledByShift(true);
                ensureLocalShiftSalesFlagInitialized();
                await load_ticket();
                refreshAccessTokenIfNeeded().catch(() => {});
                scheduleShiftStatusRetry();
                return;
            }
            clearLocalShiftContext();
        }
    }

    const status = await fetchShiftStatus();
    if (status.estado === 'sesion_invalida') {
        clearLocalShiftContext();
        shiftStarted = false;
        setSalesEnabledByShift(false);
        handleSessionExpiredRedirect('Sesion expirada. Vuelve a iniciar sesion para vender.');
        return;
    }
    if (status.estado === 'error_validacion_turno') {
        const hasLocalTurnContext = Boolean(localStorage.getItem('turno_id_actual'));
        if (hasLocalTurnContext) {
            shiftStarted = true;
            setSalesEnabledByShift(true);
            scheduleShiftStatusRetry();
            return;
        }
        shiftStarted = false;
        setSalesEnabledByShift(false);
        scheduleShiftStatusRetry();
        return;
    }
    if (status.estado === 'abierto') {
        shiftStarted = true;
        if (status.id_corte) {
            localStorage.setItem('turno_id_actual', String(status.id_corte));
        }
        setLocalShiftOwnership();
        ensureLocalShiftSalesFlagInitialized();
        localStorage.setItem('turno_monto_inicial', String(Number(status.monto_inicial || 0)));
        applyShiftInitialAmountUI(status.monto_inicial || 0);
        setSalesEnabledByShift(true);
        await load_ticket();
        return;
    }

    if (status.estado === 'cerrado') {
        shiftStarted = false;
        setSalesEnabledByShift(false);
        alert('El turno de hoy ya esta cerrado para esta caja/cajero.');
        return;
    }

    setSalesEnabledByShift(false);
    while (true) {
        const answer = (typeof window.appPrompt === 'function')
            ? await window.appPrompt(
                'Ingresa el monto inicial de caja para iniciar turno:',
                '0',
                {
                    title: 'Inicio de turno',
                    okText: 'Iniciar turno',
                    placeholder: 'Monto entre 0 y 150000',
                    helpText: 'Ingresa un monto entero entre 0 y 150000.',
                    helpStyle: 'warning',
                    inputType: 'number',
                    inputMode: 'numeric',
                    min: 0,
                    max: 150000,
                    step: 1,
                    disableCancel: true,
                    disableOkWhenInvalid: true,
                    hideValidationMessage: true,
                    validate: (value) => {
                        const trimmed = String(value || '').replace(',', '.').trim();
                        if (!trimmed) return 'Debes ingresar un monto inicial.';
                        const amount = Number(trimmed);
                        if (!Number.isFinite(amount)) return 'Ingresa un valor numerico valido.';
                        if (!Number.isInteger(amount)) return 'Solo se permiten montos enteros.';
                        if (amount < 0 || amount > 150000) return 'El monto debe estar entre 0 y 150000.';
                        return '';
                    },
                }
            )
            : prompt('Ingresa el monto inicial de caja para iniciar turno:', '0');
        if (answer === null) continue;
        const parsed = Number(String(answer).replace(',', '.'));
        if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0 || parsed > 150000) {
            alert('Monto inicial invalido. Debe ser un entero entre 0 y 150000.');
            continue;
        }
        try {
            const started = await startShift(parsed);
            shiftStarted = true;
            if (started.id_corte) {
                localStorage.setItem('turno_id_actual', String(started.id_corte));
            }
            setLocalShiftOwnership();
            setLocalShiftHasSales(false);
            localStorage.setItem('turno_monto_inicial', String(Number(started.monto_inicial || parsed)));
            applyShiftInitialAmountUI(started.monto_inicial || parsed);
            setSalesEnabledByShift(true);
            await load_ticket();
            await loadCurrentCut();
            break;
        } catch (error) {
            if (error.message === 'SESION_INVALIDA') {
                shiftStarted = false;
                setSalesEnabledByShift(false);
                alert('No se pudo validar sesion en este momento. Intenta recargar nuevamente.');
                return;
            }
            alert(error.message || 'No se pudo iniciar turno.');
            const refresh = await fetchShiftStatus();
            if (refresh.estado === 'sesion_invalida') {
                shiftStarted = false;
                setSalesEnabledByShift(false);
                alert('No se pudo validar sesion en este momento. Intenta recargar nuevamente.');
                return;
            }
            if (refresh.estado === 'error_validacion_turno') {
                shiftStarted = false;
                setSalesEnabledByShift(false);
                alert('No se pudo validar el estado del turno. Revisa la conexion e intenta nuevamente.');
                return;
            }
            if (refresh.estado === 'abierto') {
                shiftStarted = true;
                if (refresh.id_corte) {
                    localStorage.setItem('turno_id_actual', String(refresh.id_corte));
                }
                setLocalShiftOwnership();
                ensureLocalShiftSalesFlagInitialized();
                localStorage.setItem('turno_monto_inicial', String(Number(refresh.monto_inicial || 0)));
                applyShiftInitialAmountUI(refresh.monto_inicial || 0);
                setSalesEnabledByShift(true);
                await load_ticket();
                break;
            }
            if (refresh.estado === 'cerrado') {
                shiftStarted = false;
                setSalesEnabledByShift(false);
                alert('El turno de hoy ya esta cerrado para esta caja/cajero.');
                break;
            }
        }
    }
}

async function ensureShiftStartedOnLoad() {
    if (ensureShiftStartedInFlight) {
        return ensureShiftStartedInFlight;
    }
    ensureShiftStartedInFlight = ensureShiftStartedOnLoadImpl()
        .catch((error) => {
            throw error;
        })
        .finally(() => {
            ensureShiftStartedInFlight = null;
        });
    return ensureShiftStartedInFlight;
}


async function load_ticket(){
    const cajero = localStorage.getItem('id_user');
    const caja = localStorage.getItem('n_caja') || localStorage.getItem('caja');
    const n_ticket = document.getElementById('nticket');
    if (n_ticket) n_ticket.textContent = '1';
    if (!cajero || !caja || !n_ticket) return;

    const currentShiftId = localStorage.getItem('turno_id_actual');
    const seededShiftId = localStorage.getItem('ticket_seed_shift_id');
    if (currentShiftId && currentShiftId !== seededShiftId) {
        localStorage.setItem('ticket_seed_shift_id', currentShiftId);
        n_ticket.textContent = '1';
        setStoredTicketCounter(1);
    }
    
    try {
        const localCounter = getStoredTicketCounter();
        const pendingCounter = getPendingTicketCounterSync();
        const serverCounter = await fetchServerTicketCounter();

        let resolvedCounter = 1;
        if (localCounter && localCounter > resolvedCounter) resolvedCounter = localCounter;
        if (pendingCounter && pendingCounter > resolvedCounter) resolvedCounter = pendingCounter;
        if (serverCounter && serverCounter > resolvedCounter) resolvedCounter = serverCounter;

        n_ticket.textContent = String(resolvedCounter);
        setStoredTicketCounter(resolvedCounter);

        if (!serverCounter || serverCounter < resolvedCounter || (pendingCounter && pendingCounter >= resolvedCounter)) {
            const synced = await persistServerTicketCounter(resolvedCounter);
            if (synced) {
                n_ticket.textContent = String(synced);
                setStoredTicketCounter(synced);
                clearPendingTicketCounterSync();
            } else {
                setPendingTicketCounterSync(resolvedCounter);
            }
        } else if (pendingCounter) {
            clearPendingTicketCounterSync();
        }
    } catch (error) {
        console.error('Error DOM:', error);
        const fallback = getStoredTicketCounter() || 1;
        n_ticket.textContent = String(fallback);
        setStoredTicketCounter(fallback);
        setPendingTicketCounterSync(fallback);
    }
}

function normalizeBarcodeValue(value) {
    const raw = String(value || '').trim();
    const numeric = raw.replace(/[^0-9]/g, '');
    const numericNoLeadingZeros = numeric ? (numeric.replace(/^0+/, '') || '0') : '';
    return { raw, numeric, numericNoLeadingZeros };
}

function matchesBarcode(candidateCode, targetCode) {
    const a = normalizeBarcodeValue(candidateCode);
    const b = normalizeBarcodeValue(targetCode);
    if (!a.raw || !b.raw) return false;
    if (a.raw === b.raw) return true;
    if (a.numeric && b.numeric) {
        if (a.numeric === b.numeric) return true;
        if (a.numericNoLeadingZeros && b.numericNoLeadingZeros && a.numericNoLeadingZeros === b.numericNoLeadingZeros) {
            return true;
        }
    }
    return false;
}

function normalizeBarcodeByScannerSettings(value) {
    let raw = String(value || '');
    const fixedPrefix = String(scannerRuntimeSettings.scanner_prefix_to_strip || '').trim();
    if (fixedPrefix) {
        if (raw.startsWith(fixedPrefix)) {
            raw = raw.slice(fixedPrefix.length);
        } else if (raw.toUpperCase().startsWith(fixedPrefix.toUpperCase())) {
            raw = raw.slice(fixedPrefix.length);
        }
    }
    const trimmed = scannerRuntimeSettings.scanner_prefix_trim ? raw.trim() : raw;
    if (scannerRuntimeSettings.scanner_only_numeric) {
        return trimmed.replace(/[^0-9]/g, '');
    }
    return trimmed;
}

function handleBarcodeInputSanitize(inputEl) {
    if (!inputEl) return;
    const rawValue = String(inputEl.value || '');
    const hasTextSearchPattern = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(rawValue) || rawValue.includes(' ');
    if (hasTextSearchPattern) {
        const maybeTrimmed = scannerRuntimeSettings.scanner_prefix_trim ? rawValue.trimStart() : rawValue;
        if (inputEl.value !== maybeTrimmed) {
            inputEl.value = maybeTrimmed;
        }
        return;
    }
    const normalized = normalizeBarcodeByScannerSettings(rawValue);
    if (inputEl.value !== normalized) {
        inputEl.value = normalized;
    }
}
window.handleBarcodeInputSanitize = handleBarcodeInputSanitize;

function clearSalesBarcodeSuggestions() {
    const listEl = document.getElementById('sales-barcode-suggestions');
    if (listEl) {
        listEl.innerHTML = '';
    }
    salesBarcodeSuggestCodes = new Set();
}

async function performSalesBarcodeSuggestionSearch(queryText) {
    const listEl = document.getElementById('sales-barcode-suggestions');
    if (!listEl) return;

    const query = String(queryText || '').trim();
    if (!query || query.length < 2) {
        listEl.innerHTML = '';
        return;
    }

    try {
        const response = await fetch(API_URL + `api/productos/search?q=${encodeURIComponent(query)}`, {
            headers: withAuthHeaders(),
        });
        if (response.status === 401) {
            handleSessionExpiredRedirect('Sesion expirada. Vuelve a iniciar sesion.');
            return;
        }
        const rows = await response.json().catch(() => []);
        const normalizedRows = Array.isArray(rows) ? rows : [];

        listEl.innerHTML = '';
        salesBarcodeSuggestCodes = new Set();
        normalizedRows.slice(0, 20).forEach((row) => {
            const description = String(row.descripcion || '').trim();
            const code = String(row.codigo_barras || '').trim();
            if (!description || !code) return;
            const option = document.createElement('option');
            option.value = code;
            const price = Number(row.precio_venta || 0);
            option.label = `${description} | $${price.toFixed(0)}`;
            listEl.appendChild(option);
            salesBarcodeSuggestCodes.add(code);
        });
    } catch (_) {
        // noop
    }
}

function updateSalesBarcodeSuggestions(queryText) {
    const query = String(queryText || '');
    const hasTextSearchPattern = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(query) || query.includes(' ');
    if (!hasTextSearchPattern) {
        clearSalesBarcodeSuggestions();
        return;
    }
    if (salesBarcodeSuggestDebounceTimer) {
        clearTimeout(salesBarcodeSuggestDebounceTimer);
    }
    salesBarcodeSuggestDebounceTimer = setTimeout(() => {
        performSalesBarcodeSuggestionSearch(query);
    }, 220);
}
window.updateSalesBarcodeSuggestions = updateSalesBarcodeSuggestions;

function handleSalesBarcodeSelectionChange(value) {
    const selectedValue = String(value || '').trim();
    if (!selectedValue) return;
    if (!salesBarcodeSuggestCodes.has(selectedValue)) return;
    addToCart();
}
window.handleSalesBarcodeSelectionChange = handleSalesBarcodeSelectionChange;

function isLikelyMobileDeviceForCameraPrompt() {
    const ua = String(navigator.userAgent || '').toLowerCase();
    const mobileUa = /(android|iphone|ipad|ipod|mobile)/i.test(ua);
    const touchCapable = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const narrowScreen = window.matchMedia && window.matchMedia('(max-width: 1024px)').matches;
    return mobileUa || (touchCapable && narrowScreen);
}

async function ensureSalesCameraPermissionPromptOnce() {
    if (!isLikelyMobileDeviceForCameraPrompt()) return;
    if (salesCameraPermissionInFlight) return;
    const alreadyPrompted = String(localStorage.getItem(SALES_CAMERA_PERMISSION_KEY) || '');
    if (alreadyPrompted === 'done' || alreadyPrompted === 'attempted') return;
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') return;

    salesCameraPermissionInFlight = true;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
        });
        try {
            const tracks = stream?.getTracks?.() || [];
            tracks.forEach((track) => {
                try { track.stop(); } catch (_) {}
            });
        } catch (_) {}
        localStorage.setItem(SALES_CAMERA_PERMISSION_KEY, 'done');
    } catch (_) {
        localStorage.setItem(SALES_CAMERA_PERMISSION_KEY, 'attempted');
    } finally {
        salesCameraPermissionInFlight = false;
    }
}

function setupSalesMobileCameraPermissionHook() {
    const input = document.getElementById('barcode');
    if (!input) return;
    const requestPermission = () => {
        ensureSalesCameraPermissionPromptOnce().catch(() => {});
    };
    input.addEventListener('focus', requestPermission);
    input.addEventListener('touchstart', requestPermission, { passive: true });
    input.addEventListener('click', requestPermission);
}

function setupSalesCameraScanButtonVisibility() {
    const btn = document.getElementById('sales-camera-scan-btn');
    if (!btn) return;
    btn.style.display = isLikelyMobileDeviceForCameraPrompt() ? 'inline-flex' : 'none';
}

function getSalesCameraPermissionHelpText() {
    const ua = String(navigator.userAgent || '').toLowerCase();
    const insecureMobile = isLikelyMobileDeviceForCameraPrompt() && String(window.location.protocol || '') !== 'https:' && String(window.location.hostname || '').toLowerCase() !== 'localhost';
    if (insecureMobile) {
        return 'En móviles, la cámara requiere HTTPS. Abre esta app con https:// (no http://IP). Luego vuelve a intentar el escáner.';
    }
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('safari')) {
        return 'Safari: toca el candado de la barra de direcciones, entra a Configuración del sitio y cambia Cámara a Permitir. Si sigue bloqueado, abre Ajustes > Safari > Cámara > Permitir.';
    }
    if (ua.includes('android') && ua.includes('chrome')) {
        return 'Chrome Android: toca el candado de la barra de direcciones > Permisos > Cámara > Permitir. Luego vuelve a esta pantalla y pulsa Reintentar escáner.';
    }
    return 'En el navegador, abre el candado del sitio y habilita Cámara en Permitir. Luego vuelve y pulsa Reintentar escáner.';
}

function openSalesCameraPermissionPopup(reasonText) {
    const popup = document.getElementById('salesCameraPermissionPopUp');
    if (!popup) return;
    const reasonEl = document.getElementById('sales-camera-permission-reason');
    const helpEl = document.getElementById('sales-camera-permission-help');
    if (reasonEl) {
        reasonEl.textContent = String(reasonText || 'Se requiere permiso de cámara para escanear códigos.');
    }
    if (helpEl) {
        helpEl.textContent = getSalesCameraPermissionHelpText();
    }
    popup.classList.remove('hidden');
    popup.style.display = 'flex';
}
window.openSalesCameraPermissionPopup = openSalesCameraPermissionPopup;

function closeSalesCameraPermissionPopup() {
    const popup = document.getElementById('salesCameraPermissionPopUp');
    if (!popup) return;
    popup.classList.add('hidden');
    popup.style.display = '';
    focusBarcodeInputForNextScan();
}
window.closeSalesCameraPermissionPopup = closeSalesCameraPermissionPopup;

async function requestSalesCameraPermissionFromPopup() {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        openSalesCameraPermissionPopup('Tu navegador no soporta acceso a cámara desde esta página.');
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
        });
        try {
            const tracks = stream?.getTracks?.() || [];
            tracks.forEach((track) => {
                try { track.stop(); } catch (_) {}
            });
        } catch (_) {}
        localStorage.setItem(SALES_CAMERA_PERMISSION_KEY, 'done');
        closeSalesCameraPermissionPopup();
        setSalesCameraScanStatus('Permiso concedido. Puedes iniciar el escáner.');
    } catch (_) {
        openSalesCameraPermissionPopup('El permiso de cámara sigue bloqueado. Habilítalo en permisos del sitio y vuelve a intentar.');
    }
}
window.requestSalesCameraPermissionFromPopup = requestSalesCameraPermissionFromPopup;

function setSalesCameraScanStatus(message) {
    const el = document.getElementById('sales-camera-status');
    if (el) {
        el.textContent = String(message || '');
    }
}

function stopSalesCameraStream() {
    if (salesCameraScanRaf) {
        cancelAnimationFrame(salesCameraScanRaf);
        salesCameraScanRaf = null;
    }
    if (salesCameraScanStream) {
        try {
            const tracks = salesCameraScanStream.getTracks?.() || [];
            tracks.forEach((track) => {
                try { track.stop(); } catch (_) {}
            });
        } catch (_) {}
        salesCameraScanStream = null;
    }
    salesCameraScanActive = false;
    const video = document.getElementById('sales-camera-video');
    if (video) {
        try {
            video.pause();
            video.srcObject = null;
        } catch (_) {}
    }
}

function closeSalesCameraScanPopup() {
    stopSalesCameraStream();
    const popup = document.getElementById('salesCameraScanPopUp');
    if (!popup) return;
    popup.classList.add('hidden');
    popup.style.display = '';
    focusBarcodeInputForNextScan();
}
window.closeSalesCameraScanPopup = closeSalesCameraScanPopup;

async function handleSalesCameraBarcodeDetected(codeValue) {
    const code = normalizeBarcodeByScannerSettings(String(codeValue || '').trim());
    if (!code) return;
    const barcodeInput = document.getElementById('barcode');
    if (barcodeInput) {
        barcodeInput.value = code;
    }
    closeSalesCameraScanPopup();
    await addToCart();
}

function startSalesCameraDetectionLoop() {
    if (!salesCameraScanActive) return;
    const video = document.getElementById('sales-camera-video');
    if (!video) return;

    const run = async () => {
        if (!salesCameraScanActive) return;
        try {
            if (video.readyState >= 2 && salesBarcodeDetector) {
                const found = await salesBarcodeDetector.detect(video);
                if (Array.isArray(found) && found.length > 0) {
                    const raw = String(found[0]?.rawValue || '').trim();
                    if (raw) {
                        await handleSalesCameraBarcodeDetected(raw);
                        return;
                    }
                }
            }
        } catch (_) {
            // noop
        }
        salesCameraScanRaf = requestAnimationFrame(run);
    };
    salesCameraScanRaf = requestAnimationFrame(run);
}

async function openSalesCameraScanPopup() {
    const popup = document.getElementById('salesCameraScanPopUp');
    const video = document.getElementById('sales-camera-video');
    if (!popup || !video) return;

    const insecureMobile = isLikelyMobileDeviceForCameraPrompt()
        && String(window.location.protocol || '') !== 'https:'
        && String(window.location.hostname || '').toLowerCase() !== 'localhost';
    if (insecureMobile) {
        openSalesCameraPermissionPopup('Este móvil está usando HTTP. Para usar cámara debes abrir la app en HTTPS.');
        return;
    }

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        openSalesCameraPermissionPopup('Este navegador no soporta acceso a cámara desde esta página.');
        return;
    }

    popup.classList.remove('hidden');
    popup.style.display = 'flex';
    setSalesCameraScanStatus('Solicitando acceso a cámara...');

    try {
        await ensureSalesCameraPermissionPromptOnce();
        salesCameraScanStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
        });
        video.srcObject = salesCameraScanStream;
        await video.play().catch(() => {});

        if ('BarcodeDetector' in window) {
            if (!salesBarcodeDetector) {
                salesBarcodeDetector = new window.BarcodeDetector({
                    formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'],
                });
            }
            salesCameraScanActive = true;
            setSalesCameraScanStatus('Apunta al código de barras para escanear.');
            startSalesCameraDetectionLoop();
        } else {
            setSalesCameraScanStatus('Tu navegador no soporta lectura automática de códigos con cámara.');
        }
    } catch (_) {
        closeSalesCameraScanPopup();
        openSalesCameraPermissionPopup('No se pudo acceder a la cámara. Revisa permisos del navegador para este sitio.');
    }
}
window.openSalesCameraScanPopup = openSalesCameraScanPopup;

function handleBarcodeKeydown(event, inputEl) {
    if (!event) return;
    if (inputEl) {
        handleBarcodeInputSanitize(inputEl);
    }
    const suffix = scannerRuntimeSettings.scanner_suffix || 'enter';
    if (suffix === 'none') {
        return;
    }
    if (suffix === 'enter' && event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        addToCart();
        return;
    }
    if (suffix === 'tab' && event.key === 'Tab') {
        event.preventDefault();
        event.stopPropagation();
        addToCart();
    }
}
window.handleBarcodeKeydown = handleBarcodeKeydown;

function resetSalesBarcodeInputForNextScan(options = {}) {
    const select = options?.select !== false;
    const barcodeInput = document.getElementById('barcode');
    if (barcodeInput) {
        barcodeInput.value = '';
    }
    clearSalesBarcodeSuggestions();
    if (typeof focusBarcodeInputForNextScan === 'function') {
        focusBarcodeInputForNextScan({ select, force: true, delay: 0 });
    }
}

async function fetchScannerRuntimeSettings() {
    try {
        const response = await fetch(API_URL + 'api/scanner-settings', {
            headers: withAuthHeaders(),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return;
        scannerRuntimeSettings = {
            ...scannerRuntimeSettings,
            scanner_mode: data.scanner_mode === 'serial' ? 'serial' : 'keyboard',
            scanner_suffix: ['enter', 'tab', 'none'].includes(String(data.scanner_suffix || 'enter')) ? String(data.scanner_suffix || 'enter') : 'enter',
            scanner_prefix_to_strip: String(data.scanner_prefix_to_strip || '').slice(0, 16),
            scanner_prefix_trim: Boolean(Number(data.scanner_prefix_trim)) || data.scanner_prefix_trim === true,
            scanner_only_numeric: !(data.scanner_only_numeric === 0 || data.scanner_only_numeric === '0' || data.scanner_only_numeric === false),
            scanner_auto_focus: !(data.scanner_auto_focus === 0 || data.scanner_auto_focus === '0' || data.scanner_auto_focus === false),
            scanner_beep_on_scan: Boolean(Number(data.scanner_beep_on_scan)) || data.scanner_beep_on_scan === true,
        };
    } catch (_) {
        // noop
    }
}

async function resolveProductByBarcode(barcode) {
    const response = await fetch(API_URL+`api/productos/code/${encodeURIComponent(barcode)}`, {
        headers: withAuthHeaders(),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) return { authError: true };
    if (response.ok && payload?.found && payload?.product) {
        return { product: payload.product };
    }

    const listResponse = await fetch(API_URL + 'api/productos', {
        headers: withAuthHeaders(),
    });
    const rows = await listResponse.json().catch(() => []);
    if (listResponse.status === 401) return { authError: true };
    if (!listResponse.ok || !Array.isArray(rows)) {
        return { error: payload?.message || payload?.error || 'No se pudo obtener el producto' };
    }

    const found = rows.find((row) => matchesBarcode(row.codigo_barras, barcode));
    if (!found) return { notFound: true };
    return { product: found };
}

async function resolveProductBySearchText(searchText) {
    const query = String(searchText || '').trim();
    if (!query) return { notFound: true };
    const response = await fetch(API_URL + `api/productos/search?q=${encodeURIComponent(query)}`, {
        headers: withAuthHeaders(),
    });
    const rows = await response.json().catch(() => []);
    if (response.status === 401) return { authError: true };
    if (!response.ok || !Array.isArray(rows)) {
        return { error: 'No se pudo buscar el producto por nombre' };
    }
    if (!rows.length) return { notFound: true };

    const normalizedQuery = query.toLowerCase();
    const exact = rows.find((row) => String(row.descripcion || '').trim().toLowerCase() === normalizedQuery);
    if (exact) return { product: exact };
    return { product: rows[0] };
}

async function addToCart() {
    if (salesAddToCartInFlight) {
        return;
    }
    salesAddToCartInFlight = true;

    const barcodeInput = document.getElementById('barcode');
    const rawInput = String(barcodeInput?.value || '').trim();
    try {
        if (!rawInput) {
            alert("Por favor ingrese el código de un producto.");
            resetSalesBarcodeInputForNextScan({ select: true });
            return;
        }
        const isNameSearch = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(rawInput) || rawInput.includes(' ');
        const barcode = isNameSearch ? '' : normalizeBarcodeByScannerSettings(rawInput);
        if (!isNameSearch && barcodeInput && barcodeInput.value !== barcode) {
            barcodeInput.value = barcode;
        }
        if (!isNameSearch && barcode === '0') {
            resetSalesBarcodeInputForNextScan({ select: true });
            openCommonProductPopup();
            return;
        }
        if (!shiftStarted) {
            await ensureShiftStartedOnLoad();
            if (!shiftStarted) {
                alert('Debes iniciar turno ingresando el monto inicial de caja.');
                resetSalesBarcodeInputForNextScan({ select: true });
                return;
            }
        }

        const lookup = isNameSearch
            ? await resolveProductBySearchText(rawInput)
            : await resolveProductByBarcode(barcode);
        if (lookup.authError) {
            alert('Sesion expirada. Vuelve a iniciar sesion.');
            window.location.href = 'index.php';
            return;
        }
        if (lookup.notFound) {
            resetSalesBarcodeInputForNextScan({ select: true });
            if (typeof window.appAlert === 'function') {
                await window.appAlert('El producto no existe o no está ingresado.', 'warning', {
                    title: 'Producto no encontrado',
                    okText: 'Entendido',
                });
            } else {
                alert('El producto no existe o no está ingresado.');
            }
            return;
        }
        if (lookup.error || !lookup.product) {
            resetSalesBarcodeInputForNextScan({ select: true });
            alert(`Error: ${lookup.error || 'No se pudo obtener el producto'}`);
            return;
        }
        const product = lookup.product;
        const normalizedProduct = {
            ...product,
            precio_venta: Number(product.precio_venta || 0),
        };
        if (isBulkSaleProduct(normalizedProduct)) {
            const opened = openBulkProductPopup(normalizedProduct);
            if (opened) {
                document.getElementById('barcode').value = '';
                clearSalesBarcodeSuggestions();
            }
            return;
        }
        const useInventory = Number(normalizedProduct.utiliza_inventario || 0) === 1;
        const currentStock = Number(normalizedProduct.cantidad_actual || 0);
        const existingProduct = cart.find(item => item.id_producto === normalizedProduct.id_producto);
        const nextQty = existingProduct ? Number(existingProduct.quantity || 0) + 1 : 1;

        if (useInventory && (!Number.isFinite(currentStock) || currentStock <= 0)) {
            if (typeof window.appAlert === 'function') {
                await window.appAlert('Este producto no tiene stock o existencia disponible.', 'warning', {
                    title: 'Sin stock',
                    okText: 'Entendido',
                });
            } else {
                alert('Este producto no tiene stock o existencia disponible.');
            }
            return;
        }
        if (useInventory && nextQty > currentStock) {
            if (typeof window.appAlert === 'function') {
                await window.appAlert(`No puedes agregar más unidades. Stock disponible: ${currentStock.toFixed(0)}.`, 'warning', {
                    title: 'Stock insuficiente',
                    okText: 'Entendido',
                });
            } else {
                alert(`No puedes agregar más unidades. Stock disponible: ${currentStock.toFixed(0)}.`);
            }
            return;
        }

        if (existingProduct) {
            existingProduct.quantity += 1;
            existingProduct.line_subtotal = 0;
            selectedCartIndex = cart.indexOf(existingProduct);
        } else {
            cart.push({ ...normalizedProduct, quantity: 1, formato_venta: resolveProductSaleFormat(normalizedProduct) });
            selectedCartIndex = cart.length - 1;
        }

        updateCartUI();
        resetSalesBarcodeInputForNextScan({ select: true });
        if (scannerRuntimeSettings.scanner_beep_on_scan) {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = ctx.createOscillator();
                oscillator.frequency.value = 980;
                oscillator.connect(ctx.destination);
                oscillator.start();
                oscillator.stop(ctx.currentTime + 0.05);
            } catch (_) {}
        }
    } catch (error) {
        console.error("Error adding product to cart:", error);
        alert("Failed to add product to cart. Please try again.");
        resetSalesBarcodeInputForNextScan({ select: true });
    } finally {
        salesAddToCartInFlight = false;
    }
}

// Actualizar la interfaz del carrito
function updateCartUI() {
    const cartTable = document.getElementById('cart-table-body');
    if (!cartTable) return;
    cartTable.innerHTML = '';
    if (selectedCartIndex >= cart.length) {
        selectedCartIndex = -1;
    }
    if (cart.length > 0 && salesPromotionRulesByProduct.size === 0 && salesPromotionRulesLastSyncAt === 0 && !salesPromotionRulesLoadPromise) {
        loadSalesPromotionRules()
            .then(() => {
                updateCartUI();
            })
            .catch(() => {});
    }

    const pricingSnapshot = getCartPricingSnapshot(cart);
    cart.forEach((item, index) => {
        const row = document.createElement('tr');
        const unitPrice = Number(item.precio_venta || 0);
        const quantity = Number(item.quantity || 0);
        const isBulk = isBulkSaleProduct(item);
        const pricingLine = pricingSnapshot.lines[index];
        const pricing = pricingLine
            ? {
                subtotal: Number(pricingLine.subtotal || 0),
                baseSubtotal: Number(pricingLine.baseSubtotal || 0),
                savings: Number(pricingLine.savings || 0),
                hasPromotion: Boolean(pricingLine.hasPromotion),
                effectiveUnitPrice: Number(pricingLine.effectiveUnitPrice || 0),
                discountPercent: Number(pricingLine.discountPercent || 0),
                discountPercentApprox: Number(pricingLine.discountPercentApprox || 0),
                appliedPromotionLabel: String(pricingLine.appliedPromotionLabel || ''),
            }
            : getCartItemAmountBreakdown(item);
        const hasPromo = pricing.hasPromotion && pricing.savings > 0;
        const quantityLabel = isBulk ? formatGramQuantityFromKg(quantity) : quantity.toFixed(0);
        const unitPriceLabel = isBulk ? `$${unitPrice.toFixed(0)} /kg` : `$${unitPrice.toFixed(0)}`;
        const unitPricePromoLabel = hasPromo && !isBulk
            ? `<div style="font-size:11px; color:#1a7f37;">Promo: $${Number(pricing.effectiveUnitPrice || 0).toFixed(0)}</div>`
            : '';
        const lineAmount = pricing.subtotal;
        const lineAmountLabel = `$${lineAmount.toFixed(0)}`;
        const approxDiscountPercent = Math.max(0, Number(pricing.discountPercentApprox || 0));
        const discountColumnLabel = hasPromo
            ? `$${Number(pricing.savings || 0).toFixed(0)} (${approxDiscountPercent.toFixed(0)}%)`
            : '$0 (0%)';
        const promoInfo = hasPromo
            ? `<div style="font-size:11px; color:#1a7f37;">${escapeHtml(pricing.appliedPromotionLabel || 'PROMOCION')}</div>`
            : '';
        const descriptionLabel = escapeHtml(item.descripcion || '');
        const codeLabel = escapeHtml(item.codigo_barras || 'COMUN');

        row.innerHTML = `
            <td>${codeLabel}</td>
            <td><div>${descriptionLabel}</div>${promoInfo}</td>
            <td style="text-align: center;">${unitPriceLabel}${unitPricePromoLabel}</td>
            <td style="text-align: center;">${quantityLabel}</td>
            <td style="text-align: right;">${discountColumnLabel}</td>
            <td style="text-align: right;">${lineAmountLabel}</td>
        `;
        row.style.cursor = 'pointer';
        if (index === selectedCartIndex) {
            row.classList.add('cart-row-selected');
        }
        row.addEventListener('click', () => {
            selectedCartIndex = index;
            updateCartUI();
        });
        cartTable.appendChild(row);
    });

    const carritoContainer = document.querySelector('#sales .carrito');
    if (carritoContainer && cartTable.children.length > 0) {
        const preferredIndex = Number.isInteger(selectedCartIndex) && selectedCartIndex >= 0
            ? selectedCartIndex
            : (cartTable.children.length - 1);
        const targetRow = cartTable.children[preferredIndex];
        if (targetRow) {
            const rowTop = targetRow.offsetTop;
            const rowBottom = rowTop + targetRow.offsetHeight;
            const viewTop = carritoContainer.scrollTop;
            const viewBottom = viewTop + carritoContainer.clientHeight;
            if (rowTop < viewTop) {
                carritoContainer.scrollTop = Math.max(0, rowTop - 8);
            } else if (rowBottom > viewBottom) {
                carritoContainer.scrollTop = Math.max(0, rowBottom - carritoContainer.clientHeight + 8);
            }
        }
    }

    // Actualizar el total
    const totalAmount = Number(pricingSnapshot.totalSubtotal || 0);
    const totalSavingsAmount = Number(pricingSnapshot.totalSavings || 0);
    const totalSavingsEl = document.getElementById('total-savings');

    document.getElementById('total-amount').textContent = "$ "+totalAmount.toFixed(0);
    document.getElementById('montoAPagar').textContent = "$ "+totalAmount.toFixed(0);
    if (totalSavingsEl) {
        if (totalSavingsAmount > 0) {
            totalSavingsEl.textContent = `Ahorro promociones: $${totalSavingsAmount.toFixed(0)}`;
            totalSavingsEl.classList.remove('hidden');
        } else {
            totalSavingsEl.textContent = '';
            totalSavingsEl.classList.add('hidden');
        }
    }
    const cambioEfectivo = document.getElementById('cambioEfectivo');
    const cambioMixto = document.getElementById('cambioMixto');
    if (cambioEfectivo) cambioEfectivo.value = totalAmount > 0 ? "$ "+totalAmount.toFixed(0) : '';
    if (cambioMixto) cambioMixto.value = totalAmount > 0 ? "$ "+totalAmount.toFixed(0) : '';

    const openFinalizeBtn = document.getElementById('open-finalize-popup-btn');
    if (openFinalizeBtn) {
        const canCharge = hasUserPermission('ventas_cobrar_ticket');
        openFinalizeBtn.disabled = !canCharge || !shiftStarted || cart.length === 0 || totalAmount <= 0;
    }
    if (typeof window.refreshFinalizeButtonState === 'function') {
        window.refreshFinalizeButtonState();
    }
    updateSalesSessionStrip();
    renderPendingTicketsInlineStrip();
    persistCartState();
}

function removeSelectedCartItem() {
    if (!hasUserPermission('ventas_eliminar_articulo')) {
        alert('No tienes permiso para eliminar articulos de la venta.');
        return;
    }
    if (!Array.isArray(cart) || cart.length === 0) {
        alert('El carrito esta vacio.');
        return;
    }
    if (!Number.isInteger(selectedCartIndex) || selectedCartIndex < 0 || selectedCartIndex >= cart.length) {
        alert('Selecciona un producto del carrito para eliminar.');
        return;
    }
    cart.splice(selectedCartIndex, 1);
    selectedCartIndex = -1;
    if (cart.length === 0) {
        clearPaymentWarning();
        resetPaymentInputs();
        if (typeof cerrarPopUp === 'function') {
            cerrarPopUp('miPopUp');
        }
    }
    updateCartUI();
}

async function adjustSelectedCartQuantityByDelta(delta) {
    const step = Number(delta);
    if (!Number.isFinite(step) || step === 0) return;
    if (!Array.isArray(cart) || cart.length === 0) return;
    if (!Number.isInteger(selectedCartIndex) || selectedCartIndex < 0 || selectedCartIndex >= cart.length) {
        return;
    }

    const item = cart[selectedCartIndex];
    if (!item) return;
    const isBulk = isBulkSaleProduct(item);
    const effectiveStep = isBulk ? (step > 0 ? 0.1 : -0.1) : step;
    const currentQty = Number(item.quantity || 0);
    const nextQty = Number((currentQty + effectiveStep).toFixed(isBulk ? 3 : 0));

    if (nextQty <= 0) {
        cart.splice(selectedCartIndex, 1);
        selectedCartIndex = -1;
        if (cart.length === 0) {
            clearPaymentWarning();
            resetPaymentInputs();
            if (typeof cerrarPopUp === 'function') {
                cerrarPopUp('miPopUp');
            }
        }
        updateCartUI();
        return;
    }

    const useInventory = Number(item.utiliza_inventario || 0) === 1;
    const currentStock = Number(item.cantidad_actual || 0);
    if (useInventory && nextQty > currentStock) {
        const stockLabel = isBulk ? formatKgQuantity(currentStock) : currentStock.toFixed(0);
        if (typeof window.appAlert === 'function') {
            await window.appAlert(`No puedes agregar más unidades. Stock disponible: ${stockLabel}.`, 'warning', {
                title: 'Stock insuficiente',
                okText: 'Entendido',
            });
        } else {
            alert(`No puedes agregar más unidades. Stock disponible: ${stockLabel}.`);
        }
        return;
    }

    item.quantity = nextQty;
    item.line_subtotal = 0;
    updateCartUI();
}

function setupCartQuantityKeyboardShortcuts() {
    document.addEventListener('keydown', async (event) => {
        const target = event.target;
        const tag = String(target?.tagName || '').toLowerCase();
        const isBarcodeInput = String(target?.id || '') === 'barcode';
        const isTypingContext = Boolean(
            target?.isContentEditable ||
            tag === 'input' ||
            tag === 'textarea' ||
            tag === 'select'
        );
        if (isTypingContext && !isBarcodeInput) return;
        if (document.getElementById('mm-alert-overlay')?.classList.contains('show')) return;
        if (document.getElementById('sales')?.classList.contains('hidden')) return;

        const key = String(event.key || '').toLowerCase();
        const isPlus = key === '+' || key === 'add';
        const isMinus = key === '-' || key === 'subtract';
        if (!isPlus && !isMinus) return;

        event.preventDefault();
        await adjustSelectedCartQuantityByDelta(isPlus ? 1 : -1);
    });
}

async function triggerChargeSaleShortcut() {
    if (!hasUserPermission('ventas_cobrar_ticket')) {
        return;
    }
    showSection('sales');
    if (!shiftStarted) {
        await ensureShiftStartedOnLoad();
        if (!shiftStarted) {
            return;
        }
    }
    if (getCartTotalAmount() <= 0) {
        if (typeof window.appAlert === 'function') {
            await window.appAlert('No hay productos en el carrito para cobrar.', 'warning', {
                title: 'Cobro',
                okText: 'Entendido',
            });
        } else {
            alert('No hay productos en el carrito para cobrar.');
        }
        return;
    }
    if (typeof mostrarPopUp === 'function') {
        mostrarPopUp('miPopUp');
    }
}

function isSalesChargePopupOpen() {
    const popup = document.getElementById('miPopUp');
    return Boolean(popup && !popup.classList.contains('hidden'));
}

function handleSalesChargePopupShortcuts(event) {
    if (!isSalesChargePopupOpen()) return false;
    const key = String(event.key || '').toLowerCase();
    if (key === 'escape') {
        event.preventDefault();
        if (typeof cerrarPopUp === 'function') {
            cerrarPopUp('miPopUp');
        }
        return true;
    }
    if (key === 'f1') {
        event.preventDefault();
        const btn = document.getElementById('finalize-sale-btn');
        if (btn && !btn.disabled) btn.click();
        return true;
    }
    if (key === 'f2') {
        event.preventDefault();
        const btn = document.getElementById('finalize-no-receipt-btn');
        if (btn && !btn.disabled) btn.click();
        return true;
    }
    return false;
}

function isPopupElementVisible(popupEl) {
    if (!popupEl) return false;
    if (popupEl.classList.contains('hidden')) return false;
    const computed = window.getComputedStyle(popupEl);
    if (!computed) return false;
    if (computed.display === 'none') return false;
    if (computed.visibility === 'hidden') return false;
    return true;
}

function closePopupById(popupId) {
    const id = String(popupId || '');
    if (!id) return false;

    switch (id) {
    case 'miPopUp':
        if (typeof cerrarPopUp === 'function') {
            cerrarPopUp('miPopUp');
            return true;
        }
        break;
    case 'pendingTicketsPopUp':
        if (typeof closePendingTicketsPopup === 'function') {
            closePendingTicketsPopup();
            return true;
        }
        break;
    case 'commonProductPopUp':
        if (typeof closeCommonProductPopup === 'function') {
            closeCommonProductPopup();
            return true;
        }
        break;
    case 'bulkProductPopUp':
        if (typeof closeBulkProductPopup === 'function') {
            closeBulkProductPopup();
            return true;
        }
        break;
    case 'searchProductPopUp':
        if (typeof closeSearchProductPopup === 'function') {
            closeSearchProductPopup();
            return true;
        }
        break;
    case 'cashEntryPopUp':
        if (typeof closeCashEntryPopup === 'function') {
            closeCashEntryPopup();
            return true;
        }
        break;
    case 'cashExitPopUp':
        if (typeof closeCashExitPopup === 'function') {
            closeCashExitPopup();
            return true;
        }
        break;
    case 'cashExitProviderPopUp':
        if (typeof closeCashExitProviderPopup === 'function') {
            closeCashExitProviderPopup();
            return true;
        }
        break;
    case 'priceCheckPopUp':
        if (typeof closePriceCheckPopup === 'function') {
            closePriceCheckPopup();
            return true;
        }
        break;
    case 'salesHistoryPopUp':
        if (typeof closeSalesSessionHistoryPopup === 'function') {
            closeSalesSessionHistoryPopup();
            return true;
        }
        break;
    case 'salesCameraScanPopUp':
        if (typeof closeSalesCameraScanPopup === 'function') {
            closeSalesCameraScanPopup();
            return true;
        }
        break;
    case 'salesCameraPermissionPopUp':
        if (typeof closeSalesCameraPermissionPopup === 'function') {
            closeSalesCameraPermissionPopup();
            return true;
        }
        break;
    case 'embedded-popup-overlay':
        if (typeof closeEmbeddedPopup === 'function') {
            closeEmbeddedPopup();
            return true;
        }
        break;
    default:
        break;
    }

    if (typeof cerrarPopUp === 'function') {
        try {
            cerrarPopUp(id);
            return true;
        } catch (_) {
        }
    }

    const popup = document.getElementById(id);
    if (!popup) return false;
    popup.classList.add('hidden');
    popup.style.display = '';
    return true;
}

function closeTopMostVisiblePopup() {
    const candidates = Array.from(document.querySelectorAll('#embedded-popup-overlay, [id$="PopUp"], [id$="Popup"]'))
        .filter((el) => isPopupElementVisible(el));
    if (!candidates.length) return false;

    let selected = null;
    candidates.forEach((el, index) => {
        const computed = window.getComputedStyle(el);
        const zIndex = Number.parseInt(String(computed?.zIndex || ''), 10);
        const zScore = Number.isFinite(zIndex) ? zIndex : 0;
        if (!selected || zScore > selected.zScore || (zScore === selected.zScore && index > selected.index)) {
            selected = { el, zScore, index };
        }
    });
    if (!selected?.el?.id) return false;
    return closePopupById(selected.el.id);
}

function setupSystemFunctionKeyShortcuts() {
    document.addEventListener('keydown', async (event) => {
        if (handleSalesChargePopupShortcuts(event)) return;
        const key = String(event.key || '').toLowerCase();
        const hasModifier = Boolean(event.ctrlKey || event.metaKey || event.altKey);
        if ((key === 'f5' || key === 'f6') && hasModifier) {
            // Permitir combinaciones del navegador como Ctrl+F5 / Cmd+R.
            return;
        }
        if (key === 'f5' || key === 'f6') {
            // Reservar F5/F6 para atajos POS y evitar acciones nativas del navegador.
            event.preventDefault();
            if (event.repeat) return;
        }
        if (document.getElementById('mm-alert-overlay')?.classList.contains('show')) return;
        if (key === 'escape') {
            if (closeTopMostVisiblePopup()) {
                event.preventDefault();
                return;
            }
        }
        const target = event.target;
        const tag = String(target?.tagName || '').toLowerCase();
        const isBarcodeInput = String(target?.id || '') === 'barcode';
        const isTypingContext = Boolean(
            target?.isContentEditable ||
            tag === 'input' ||
            tag === 'textarea' ||
            tag === 'select'
        );
        if (key === 'f1') {
            event.preventDefault();
            showSection('sales');
            return;
        }
        if (key === 'f2') {
            event.preventDefault();
            showSection('product');
            return;
        }
        if (key === 'f3') {
            event.preventDefault();
            showSection('inventory');
            return;
        }
        if (key === 'f4') {
            event.preventDefault();
            showSection('shopping');
            return;
        }
        if (key === 'f12') {
            event.preventDefault();
            await triggerChargeSaleShortcut();
            return;
        }

        if (document.getElementById('sales')?.classList.contains('hidden')) return;
        if (key === 'f5') {
            if (typeof leaveCurrentTicketAsPending === 'function') {
                await leaveCurrentTicketAsPending();
            }
            return;
        }
        if (key === 'f6') {
            if (typeof openPendingTicketsPopup === 'function') openPendingTicketsPopup();
            return;
        }
        if (isTypingContext && !isBarcodeInput) return;

        if (key === 'f10') {
            event.preventDefault();
            if (typeof openSearchProductPopup === 'function') openSearchProductPopup();
            return;
        }
        if (key === 'f7') {
            event.preventDefault();
            if (typeof openCashEntryPopup === 'function') openCashEntryPopup();
            return;
        }
        if (key === 'f8') {
            event.preventDefault();
            if (typeof openCashExitPopup === 'function') openCashExitPopup();
            return;
        }
        if (key === 'f9') {
            event.preventDefault();
            if (typeof openPriceCheckPopup === 'function') openPriceCheckPopup();
            return;
        }
        const isDeleteKey = key === 'delete'
            || key === 'del'
            || key === 'supr'
            || String(event.code || '').toLowerCase() === 'delete';
        if (isDeleteKey) {
            event.preventDefault();
            if (typeof removeSelectedCartItem === 'function') removeSelectedCartItem();
        }
    }, true);
}

// Finalizar la venta
async function finalizeSale(printReceipt = true) {
    if (!hasUserPermission('ventas_cobrar_ticket')) {
        return;
    }
    if (!shiftStarted) {
        await ensureShiftStartedOnLoad();
        if (!shiftStarted) {
            alert('Debes iniciar turno antes de cobrar.');
            return;
        }
    }
    if (isFinalizingSale) {
        return;
    }

    const finalizeBtn = document.getElementById('finalize-sale-btn');
    const finalizeNoReceiptBtn = document.getElementById('finalize-no-receipt-btn');
    if (finalizeBtn) finalizeBtn.disabled = true;
    if (finalizeNoReceiptBtn) finalizeNoReceiptBtn.disabled = true;
    isFinalizingSale = true;

    const num_ticket = document.getElementById('nticket');
    const cajero = localStorage.getItem('id_user');
    const caja = localStorage.getItem('n_caja') || localStorage.getItem('caja');
    const metodo_pago = getSelectedPaymentMethod();
    const totalAmount = getCartTotalAmount();
    const paymentAllocation = buildPaymentAllocation(totalAmount, metodo_pago);

    const venta = {
        cajero: cajero,
        numero_ticket: num_ticket.textContent,
        numero_caja: caja,
        metodo_pago: metodo_pago,
        monto_efectivo: paymentAllocation.monto_efectivo,
        monto_tarjeta: paymentAllocation.monto_tarjeta,
        producto: cart,
    };

    if (!caja) {
        alert("No hay caja configurada para esta sesión.");
        isFinalizingSale = false;
        if (finalizeBtn) finalizeBtn.disabled = false;
        if (finalizeNoReceiptBtn) finalizeNoReceiptBtn.disabled = false;
        return;
    }
    if (cart.length === 0) {
        alert("El carrito está vacío. Añade productos antes de finalizar la compra.");
        isFinalizingSale = false;
        if (finalizeBtn) finalizeBtn.disabled = false;
        if (finalizeNoReceiptBtn) finalizeNoReceiptBtn.disabled = false;
        return;
    }

    clearPaymentWarning();
    const paymentCheck = validatePaymentCoverage(totalAmount, metodo_pago);
    if (!paymentCheck.ok) {
        if (paymentCheck.reason === 'card_exceeds_total') {
            showPaymentWarning('No se puede finalizar: en pago mixto la tarjeta no puede superar el total de la venta.');
        } else {
            showPaymentWarning(`No se puede finalizar: faltan ${paymentCheck.missingAmount.toFixed(0)} por cobrar en efectivo.`);
        }
        isFinalizingSale = false;
        if (finalizeBtn) finalizeBtn.disabled = false;
        if (finalizeNoReceiptBtn) finalizeNoReceiptBtn.disabled = false;
        return;
    }

    const currentTicketNumber = Number.parseInt(num_ticket.textContent, 10) || 1;
    const storedTicketCounter = Number(getStoredTicketCounter() || 0);
    let num_tic = Math.max(currentTicketNumber + 1, storedTicketCounter || 0);

    try {
        const response = await fetch(API_URL+'api/sales', {
            method: 'POST',
            headers: {
                ...withAuthHeaders({
                    'Content-Type': 'application/json',
                }),
            },
            body: JSON.stringify(venta),
        });

        if (response.ok) {
            const data = await response.json();
            const saleChange = calculateSaleChangeAmount(totalAmount, metodo_pago);
            const lastTicketInfo = {
                id_venta: Number(data?.venta_id || 0),
                numero_ticket: Number(data?.numero_ticket || 0),
                folio_ticket: String(data?.folio_ticket || data?.numero_ticket || '').trim(),
                metodo_pago: metodo_pago,
                total: Number(totalAmount || 0),
                vuelto: Number(saleChange || 0),
                vuelto_text: formatSalesTicketMoney(saleChange),
                updated_at: new Date().toISOString(),
            };
            persistLastSalesTicketInfo(lastTicketInfo);
            setLastSalesTicketInfoCard(lastTicketInfo);

            const serverNextTicket = Number(data?.next_ticket);
            const nextTicket = Number.isFinite(serverNextTicket) && serverNextTicket > 0
                ? Math.floor(serverNextTicket)
                : num_tic;
            num_ticket.textContent = nextTicket.toString();
            setStoredTicketCounter(nextTicket);
            setLocalShiftHasSales(true);
            clearPendingTicketCounterSync();
            cart = []; // Vaciar el carrito
            clearPaymentWarning();
            updateCartUI();
            resetPaymentInputs();
            if (typeof cerrarPopUp === 'function') {
                cerrarPopUp('miPopUp');
            }

            if (printReceipt) {
                try {
                    await printSaleTicket(data.venta_id);
                } catch (printError) {
                    console.error('Error al imprimir ticket:', printError);
                    if (typeof appAlert === 'function') {
                        await appAlert(
                            printError.message || 'La venta se guardo, pero no se pudo imprimir el ticket en esta caja.',
                            'warning',
                            { title: 'Impresion' }
                        );
                    } else {
                        alert(printError.message || 'La venta se guardo, pero no se pudo imprimir el ticket en esta caja.');
                    }
                }
            }
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        console.error("Error al finalizar la venta:", error);
        alert("No se pudo finalizar la venta. Inténtelo de nuevo.");
    } finally {
        isFinalizingSale = false;
        if (finalizeBtn) finalizeBtn.disabled = false;
        if (finalizeNoReceiptBtn) finalizeNoReceiptBtn.disabled = false;
    }
}

function openCommonProductPopup() {
    if (!hasUserPermission('ventas_producto_comun')) return;
    const popup = document.getElementById('commonProductPopUp');
    if (!popup) return;
    const nameInput = document.getElementById('common-product-name');
    const priceInput = document.getElementById('common-product-price');
    const qtyInput = document.getElementById('common-product-qty');
    if (nameInput) nameInput.value = 'Producto Comun';
    if (priceInput) priceInput.value = '';
    if (qtyInput) qtyInput.value = '1';
    popup.classList.remove('hidden');
    popup.style.display = 'flex';
    if (priceInput) {
        setTimeout(() => {
            priceInput.focus();
            priceInput.select?.();
        }, 0);
    }
}

function closeCommonProductPopup() {
    const popup = document.getElementById('commonProductPopUp');
    if (!popup) return;
    popup.classList.add('hidden');
    popup.style.display = '';
    focusBarcodeInputForNextScan();
}

function handleCommonProductPopupKeydown(event) {
    if (!event || event.key !== 'Enter') return;
    event.preventDefault();
    addCommonProductToCart();
}
window.handleCommonProductPopupKeydown = handleCommonProductPopupKeydown;

async function addCommonProductToCart() {
    if (!shiftStarted) {
        await ensureShiftStartedOnLoad();
        if (!shiftStarted) {
            alert('Debes iniciar turno antes de agregar productos.');
            return;
        }
    }

    const nameInput = document.getElementById('common-product-name');
    const priceInput = document.getElementById('common-product-price');
    const qtyInput = document.getElementById('common-product-qty');
    const name = (nameInput?.value || '').trim();
    const unitPrice = Number(priceInput?.value || 0);
    const qty = Number(qtyInput?.value || 0);

    if (!name) {
        alert('Ingresa un nombre para el producto comun.');
        return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        alert('Ingresa un precio unitario valido.');
        return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
        alert('Ingresa una cantidad valida.');
        return;
    }

    cart.push({
        id_producto: null,
        codigo_barras: 'COMUN',
        descripcion: name,
        precio_venta: unitPrice,
        quantity: qty,
        line_subtotal: roundClpAmount(unitPrice * qty),
        is_common: true,
    });
    selectedCartIndex = cart.length - 1;

    updateCartUI();
    closeCommonProductPopup();
}

function openBulkProductPopup(product) {
    const popup = document.getElementById('bulkProductPopUp');
    if (!popup) return false;
    const pricePerKg = Number(product?.precio_venta || 0);
    if (!Number.isFinite(pricePerKg) || pricePerKg <= 0) {
        alert('El producto granel no tiene un precio por kilo valido.');
        return false;
    }

    bulkProductPopupContext = {
        product: {
            ...product,
            precio_venta: pricePerKg,
            formato_venta: resolveProductSaleFormat(product),
        },
    };
    bulkProductLastEditedField = 'total';

    const nameEl = document.getElementById('bulk-product-name');
    const priceEl = document.getElementById('bulk-product-price-kg');
    const stockEl = document.getElementById('bulk-product-stock');
    const gramsInput = document.getElementById('bulk-product-grams');
    const totalInput = document.getElementById('bulk-product-total');
    const kgInput = document.getElementById('bulk-product-kg');

    if (nameEl) nameEl.textContent = normalizeText(product?.descripcion || 'Producto granel');
    if (priceEl) priceEl.textContent = `$${pricePerKg.toFixed(0)} / kg`;
    if (stockEl) {
        const useInventory = Number(product?.utiliza_inventario || 0) === 1;
        const currentStock = Number(product?.cantidad_actual || 0);
        stockEl.textContent = useInventory
            ? `Stock disponible: ${formatKgQuantity(currentStock)}`
            : 'Stock: no controla inventario';
    }
    if (gramsInput) gramsInput.value = '';
    if (totalInput) totalInput.value = '';
    if (kgInput) kgInput.value = '';

    popup.classList.remove('hidden');
    popup.style.display = 'flex';
    if (totalInput) {
        totalInput.focus();
        totalInput.select?.();
    } else if (gramsInput) {
        gramsInput.focus();
    }
    return true;
}

function closeBulkProductPopup() {
    const popup = document.getElementById('bulkProductPopUp');
    if (!popup) return;
    popup.classList.add('hidden');
    popup.style.display = '';
    bulkProductPopupContext = null;
    bulkProductLastEditedField = null;
    focusBarcodeInputForNextScan();
}

function recalculateBulkPopupFromGrams() {
    const gramsInput = document.getElementById('bulk-product-grams');
    const totalInput = document.getElementById('bulk-product-total');
    const kgInput = document.getElementById('bulk-product-kg');
    const pricePerKg = Number(bulkProductPopupContext?.product?.precio_venta || 0);
    if (!gramsInput || !totalInput || !kgInput || !Number.isFinite(pricePerKg) || pricePerKg <= 0) return;

    const grams = parseWeightInputToGrams(gramsInput.value);
    if (!Number.isFinite(grams) || grams <= 0) {
        kgInput.value = '';
        if (!String(totalInput.value || '').trim()) {
            totalInput.value = '';
        }
        return;
    }

    const quantityKg = grams / 1000;
    const computedTotal = Math.round(quantityKg * pricePerKg);
    kgInput.value = quantityKg.toFixed(3);
    totalInput.value = computedTotal.toString();
}

function recalculateBulkPopupFromTotal() {
    const gramsInput = document.getElementById('bulk-product-grams');
    const totalInput = document.getElementById('bulk-product-total');
    const kgInput = document.getElementById('bulk-product-kg');
    const pricePerKg = Number(bulkProductPopupContext?.product?.precio_venta || 0);
    if (!gramsInput || !totalInput || !kgInput || !Number.isFinite(pricePerKg) || pricePerKg <= 0) return;

    const totalAmount = parseMoneyInputValue(totalInput.value);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
        kgInput.value = '';
        if (!String(gramsInput.value || '').trim()) {
            gramsInput.value = '';
        }
        return;
    }

    const quantityKg = totalAmount / pricePerKg;
    const grams = quantityKg * 1000;
    kgInput.value = quantityKg.toFixed(3);
    gramsInput.value = Math.round(grams).toString();
}

async function confirmBulkProductToCart() {
    const context = bulkProductPopupContext;
    if (!context?.product) {
        closeBulkProductPopup();
        return;
    }

    const gramsInput = document.getElementById('bulk-product-grams');
    const totalInput = document.getElementById('bulk-product-total');
    const gramsValue = parseWeightInputToGrams(gramsInput?.value || '');
    const totalValue = parseMoneyInputValue(totalInput?.value || '');
    const pricePerKg = Number(context.product.precio_venta || 0);

    if (!Number.isFinite(pricePerKg) || pricePerKg <= 0) {
        alert('Precio por kilo invalido para este producto.');
        return;
    }

    let quantityKg = 0;
    if (bulkProductLastEditedField === 'total' && totalValue > 0) {
        quantityKg = totalValue / pricePerKg;
    } else if (gramsValue > 0) {
        quantityKg = gramsValue / 1000;
    } else if (totalValue > 0) {
        quantityKg = totalValue / pricePerKg;
    }

    quantityKg = Number(quantityKg.toFixed(3));
    if (!Number.isFinite(quantityKg) || quantityKg <= 0) {
        alert('Ingresa gramos o monto total valido para agregar el producto granel.');
        return;
    }

    const totalAmountClp = roundClpAmount(totalValue);
    const addedSubtotal = (bulkProductLastEditedField === 'total' && totalAmountClp > 0)
        ? totalAmountClp
        : roundClpAmount(pricePerKg * quantityKg);

    const productId = Number(context.product.id_producto || 0);
    const useInventory = Number(context.product.utiliza_inventario || 0) === 1;
    const currentStock = Number(context.product.cantidad_actual || 0);
    const existingProduct = cart.find((item) => Number(item.id_producto) === productId);
    const nextQty = (Number(existingProduct?.quantity || 0) || 0) + quantityKg;

    if (useInventory && (!Number.isFinite(currentStock) || currentStock <= 0)) {
        alert('Este producto no tiene stock o existencia disponible.');
        return;
    }
    if (useInventory && (nextQty - currentStock) > 0.000001) {
        alert(`No puedes agregar más. Stock disponible: ${formatKgQuantity(currentStock)}.`);
        return;
    }

    if (existingProduct) {
        const currentSubtotal = getCartItemSubtotalAmount(existingProduct);
        existingProduct.quantity = Number((Number(existingProduct.quantity || 0) + quantityKg).toFixed(3));
        existingProduct.line_subtotal = currentSubtotal + addedSubtotal;
        selectedCartIndex = cart.indexOf(existingProduct);
    } else {
        cart.push({
            id_producto: productId,
            codigo_barras: context.product.codigo_barras || '',
            descripcion: context.product.descripcion || '',
            precio_venta: pricePerKg,
            utiliza_inventario: useInventory ? 1 : 0,
            cantidad_actual: currentStock,
            quantity: quantityKg,
            line_subtotal: addedSubtotal,
            formato_venta: 'granel',
        });
        selectedCartIndex = cart.length - 1;
    }

    updateCartUI();
    closeBulkProductPopup();
}

function setupBulkProductPopup() {
    const gramsInput = document.getElementById('bulk-product-grams');
    const totalInput = document.getElementById('bulk-product-total');
    const kgInput = document.getElementById('bulk-product-kg');
    const popup = document.getElementById('bulkProductPopUp');
    if (!popup || !gramsInput || !totalInput) return;

    gramsInput.addEventListener('input', () => {
        bulkProductLastEditedField = 'grams';
        recalculateBulkPopupFromGrams();
    });

    totalInput.addEventListener('input', () => {
        bulkProductLastEditedField = 'total';
        recalculateBulkPopupFromTotal();
    });

    totalInput.addEventListener('focus', () => {
        bulkProductLastEditedField = 'total';
    });

    totalInput.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        confirmBulkProductToCart();
    });

    popup.addEventListener('focusin', (event) => {
        if (!isPopupElementVisible(popup)) return;
        const target = event.target;
        if (target !== gramsInput && target !== kgInput) return;
        totalInput.focus({ preventScroll: true });
        totalInput.select?.();
    });
}

function openSearchProductPopup() {
    if (!hasUserPermission('ventas_buscar_producto')) return;
    const popup = document.getElementById('searchProductPopUp');
    const input = document.getElementById('search-product-input');
    const resultsBody = document.getElementById('search-product-results-body');
    searchSelectedProductId = null;
    searchProductsLastResults = [];
    if (resultsBody) {
        resultsBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Escribe para buscar productos.</td></tr>';
    }
    if (input) input.value = '';
    if (!popup) return;
    popup.classList.remove('hidden');
    popup.style.display = 'flex';
    if (input) input.focus();
}

function closeSearchProductPopup() {
    const popup = document.getElementById('searchProductPopUp');
    if (!popup) return;
    popup.classList.add('hidden');
    popup.style.display = '';
    focusBarcodeInputForNextScan();
}

function openCashEntryPopup() {
    if (!hasUserPermission('ventas_entrada_efectivo')) return;
    const popup = document.getElementById('cashEntryPopUp');
    const amountInput = document.getElementById('cash-entry-amount');
    const entryKind = document.getElementById('cash-entry-kind');
    const descriptionInput = document.getElementById('cash-entry-description');
    if (amountInput) amountInput.value = '';
    if (entryKind) entryKind.value = 'sencillo';
    if (descriptionInput) descriptionInput.value = '';
    updateCashEntryDescriptionVisibility();
    if (!popup) return;
    popup.classList.remove('hidden');
    popup.style.display = 'flex';
    if (amountInput) amountInput.focus();
}

function closeCashEntryPopup() {
    const popup = document.getElementById('cashEntryPopUp');
    if (!popup) return;
    popup.classList.add('hidden');
    popup.style.display = '';
    focusBarcodeInputForNextScan();
}

function updateCashEntryDescriptionVisibility() {
    const entryKind = document.getElementById('cash-entry-kind');
    const wrapper = document.getElementById('cash-entry-description-wrapper');
    const descriptionInput = document.getElementById('cash-entry-description');
    if (!wrapper || !entryKind) return;
    const show = entryKind.value === 'otro';
    wrapper.classList.toggle('hidden', !show);
    if (!show && descriptionInput) {
        descriptionInput.value = '';
    }
}

function renderCashExitProviderOptions(selectedValue = '') {
    const providerSelect = document.getElementById('cash-exit-provider');
    if (!providerSelect) return;

    const previous = String(selectedValue || providerSelect.value || '').trim();
    const providers = Array.isArray(cashExitProvidersCache) ? cashExitProvidersCache : [];
    providerSelect.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = providers.length ? 'Seleccione proveedor' : 'Sin proveedores registrados';
    providerSelect.appendChild(defaultOption);

    providers.forEach((provider) => {
        const providerId = Number(provider?.id || 0);
        const providerName = String(provider?.name || '').trim();
        if (!providerId || !providerName) return;
        const option = document.createElement('option');
        option.value = String(providerId);
        option.textContent = providerName;
        providerSelect.appendChild(option);
    });

    if (previous && providers.some((provider) => String(provider?.id || '') === previous)) {
        providerSelect.value = previous;
    } else {
        providerSelect.value = '';
    }
}

async function fetchCashExitProviders(options = {}) {
    const force = Boolean(options?.force);
    const now = Date.now();
    const cacheValid = !force
        && Array.isArray(cashExitProvidersCache)
        && cashExitProvidersCache.length > 0
        && (now - cashExitProvidersLastLoadedAt) < CASH_EXIT_PROVIDER_CACHE_TTL_MS;

    if (cacheValid) {
        renderCashExitProviderOptions(options?.selectedValue || '');
        return cashExitProvidersCache;
    }

    if (!force && cashExitProvidersRequestPromise) {
        const rows = await cashExitProvidersRequestPromise;
        renderCashExitProviderOptions(options?.selectedValue || '');
        return rows;
    }

    cashExitProvidersRequestPromise = (async () => {
        const response = await fetch(API_URL + 'api/cash-exit-providers', {
            headers: withAuthHeaders(),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.message || 'No se pudo cargar proveedores de salida.');
        }
        const rows = (Array.isArray(data) ? data : [])
            .map((row) => ({
                id: Number(row?.id || 0),
                name: String(row?.name || '').trim(),
            }))
            .filter((row) => row.id > 0 && row.name);
        cashExitProvidersCache = rows;
        cashExitProvidersLastLoadedAt = Date.now();
        return rows;
    })();

    try {
        const rows = await cashExitProvidersRequestPromise;
        renderCashExitProviderOptions(options?.selectedValue || '');
        return rows;
    } finally {
        cashExitProvidersRequestPromise = null;
    }
}

async function openCashExitPopup() {
    if (!hasUserPermission('ventas_salida_efectivo')) return;
    const popup = document.getElementById('cashExitPopUp');
    const amountInput = document.getElementById('cash-exit-amount');
    const providerSelect = document.getElementById('cash-exit-provider');
    const methodSelect = document.getElementById('cash-exit-method');
    if (amountInput) amountInput.value = '';
    if (providerSelect) providerSelect.value = '';
    if (methodSelect) methodSelect.value = 'efectivo';
    if (!popup) return;

    try {
        await fetchCashExitProviders();
    } catch (error) {
        console.error('Error loading cash exit providers:', error);
        cashExitProvidersCache = [];
        cashExitProvidersLastLoadedAt = 0;
        renderCashExitProviderOptions();
    }

    popup.classList.remove('hidden');
    popup.style.display = 'flex';
    if (amountInput) amountInput.focus();
}

function closeCashExitPopup() {
    const popup = document.getElementById('cashExitPopUp');
    if (!popup) return;
    closeCashExitProviderPopup({ restoreFocus: false });
    popup.classList.add('hidden');
    popup.style.display = '';
    focusBarcodeInputForNextScan();
}

function openCashExitProviderPopup() {
    const popup = document.getElementById('cashExitProviderPopUp');
    const nameInput = document.getElementById('cash-exit-provider-name');
    if (!popup) return;
    if (nameInput) nameInput.value = '';
    popup.classList.remove('hidden');
    popup.style.display = 'flex';
    if (nameInput) nameInput.focus();
}

function closeCashExitProviderPopup(options = {}) {
    const popup = document.getElementById('cashExitProviderPopUp');
    if (!popup) return;
    popup.classList.add('hidden');
    popup.style.display = '';
    if (options?.restoreFocus === false) return;
    const providerSelect = document.getElementById('cash-exit-provider');
    if (providerSelect) {
        providerSelect.focus();
    }
}

function handleCashExitProviderPopupKeydown(event) {
    const key = String(event?.key || '').toLowerCase();
    if (key === 'escape') {
        event.preventDefault();
        closeCashExitProviderPopup();
        return;
    }
    if (key === 'enter') {
        event.preventDefault();
        saveCashExitProvider();
    }
}

async function saveCashExitProvider() {
    const input = document.getElementById('cash-exit-provider-name');
    const name = String(input?.value || '').trim();
    if (!name) {
        alert('Ingresa el nombre del proveedor.');
        if (input) input.focus();
        return;
    }

    try {
        const response = await fetch(API_URL + 'api/cash-exit-providers', {
            method: 'POST',
            headers: withAuthHeaders({
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify({ name }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.message || 'No se pudo guardar el proveedor.');
        }
        const providerId = Number(data?.id || 0);
        await fetchCashExitProviders({
            force: true,
            selectedValue: providerId > 0 ? String(providerId) : '',
        });
        closeCashExitProviderPopup();
    } catch (error) {
        console.error('Error saving cash exit provider:', error);
        alert(error.message || 'No se pudo guardar el proveedor.');
    }
}

function openPriceCheckPopup() {
    const popup = document.getElementById('priceCheckPopUp');
    const codeInput = document.getElementById('price-check-code');
    const nameEl = document.getElementById('price-check-name');
    const priceEl = document.getElementById('price-check-value');
    if (!popup) return;
    if (codeInput) codeInput.value = '';
    if (nameEl) nameEl.textContent = '';
    if (priceEl) priceEl.textContent = '$0';
    popup.classList.remove('hidden');
    popup.style.display = 'flex';
    if (codeInput) codeInput.focus();
}

function closePriceCheckPopup() {
    const popup = document.getElementById('priceCheckPopUp');
    if (!popup) return;
    popup.classList.add('hidden');
    popup.style.display = '';
    focusBarcodeInputForNextScan();
}

async function fetchSalesSessionHistory(limit = 400) {
    const caja = String(localStorage.getItem('n_caja') || localStorage.getItem('caja') || '').trim();
    const cajero = String(localStorage.getItem('id_user') || '').trim();
    const turno = String(localStorage.getItem('turno_id_actual') || '').trim();
    const params = new URLSearchParams();
    if (caja) params.set('caja', caja);
    if (cajero) params.set('cajero', cajero);
    if (turno) params.set('turno', turno);
    const parsedLimit = Number(limit);
    if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
        params.set('limit', String(Math.floor(parsedLimit)));
    }
    const response = await fetch(API_URL + `api/sales/session-history?${params.toString()}`, {
        headers: withAuthHeaders(),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'No se pudo obtener historial de ventas.');
    }
    return data;
}

function getSalesSessionIdentity() {
    const caja = String(localStorage.getItem('n_caja') || localStorage.getItem('caja') || '').trim();
    const cajero = String(localStorage.getItem('id_user') || '').trim();
    const turno = String(localStorage.getItem('turno_id_actual') || '').trim();
    return { caja, cajero, turno };
}

async function fetchSalesHistorySaleDetail(saleId) {
    const parsedSaleId = Number(saleId || 0);
    if (!Number.isFinite(parsedSaleId) || parsedSaleId <= 0) {
        throw new Error('Venta invalida para consultar detalle.');
    }
    const { caja, cajero } = getSalesSessionIdentity();
    const params = new URLSearchParams();
    if (caja) params.set('caja', caja);
    if (cajero) params.set('cajero', cajero);
    const response = await fetch(API_URL + `api/sales/${encodeURIComponent(parsedSaleId)}/detail?${params.toString()}`, {
        headers: withAuthHeaders(),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'No se pudo cargar el detalle de la venta.');
    }
    return data;
}

async function updateSalesHistorySalePayment(saleId, payload = {}) {
    const parsedSaleId = Number(saleId || 0);
    if (!Number.isFinite(parsedSaleId) || parsedSaleId <= 0) {
        throw new Error('Venta invalida para editar pago.');
    }
    const response = await fetch(API_URL + `api/sales/${encodeURIComponent(parsedSaleId)}/payment`, {
        method: 'PUT',
        headers: withAuthHeaders({
            'Content-Type': 'application/json',
        }),
        body: JSON.stringify(payload || {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'No se pudo editar la forma de pago.');
    }
    return data;
}

function getSalesLastTicketStorageKey() {
    const caja = String(localStorage.getItem('n_caja') || localStorage.getItem('caja') || '').trim();
    const cajero = String(localStorage.getItem('id_user') || '').trim();
    const turno = String(localStorage.getItem('turno_id_actual') || '').trim() || 'sin_turno';
    if (!caja || !cajero) return null;
    return `sales_last_ticket_${caja}_${cajero}_${turno}`;
}

function normalizeSalesPaymentMethodLabel(methodRaw = '') {
    const method = String(methodRaw || '').trim().toLowerCase();
    if (!method) return '-';
    const labels = {
        efectivo: 'Efectivo',
        tarjeta: 'Tarjeta',
        mixto: 'Efectivo + Tarjeta',
        dolares: 'Dolares',
        transferencia: 'Transferencia',
        cheque: 'Cheque',
        vale: 'Vale',
        credito: 'Credito',
    };
    return labels[method] || (method.charAt(0).toUpperCase() + method.slice(1));
}

function formatSalesTicketMoney(value) {
    const amount = Number(value || 0);
    return `$${Number.isFinite(amount) ? amount.toFixed(0) : '0'}`;
}

function readLastSalesTicketInfo() {
    const key = getSalesLastTicketStorageKey();
    if (!key) return null;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
    } catch (_) {
        return null;
    }
}

function persistLastSalesTicketInfo(info) {
    const key = getSalesLastTicketStorageKey();
    if (!key || !info) return;
    try {
        localStorage.setItem(key, JSON.stringify(info));
    } catch (_) {
    }
}

function setLastSalesTicketInfoCard(info = null) {
    const folioEl = document.getElementById('sales-last-ticket-folio');
    const methodEl = document.getElementById('sales-last-ticket-method');
    const amountEl = document.getElementById('sales-last-ticket-amount');
    const changeEl = document.getElementById('sales-last-ticket-change');
    if (!folioEl || !methodEl || !amountEl || !changeEl) return;

    if (!info) {
        folioEl.textContent = '-';
        methodEl.textContent = '-';
        amountEl.textContent = '$0';
        changeEl.textContent = '$0';
        return;
    }

    folioEl.textContent = String(info.folio_ticket || info.numero_ticket || info.id_venta || '-');
    methodEl.textContent = normalizeSalesPaymentMethodLabel(info.metodo_pago);
    amountEl.textContent = formatSalesTicketMoney(info.total);
    if (typeof info.vuelto_text === 'string' && info.vuelto_text.trim()) {
        changeEl.textContent = info.vuelto_text.trim();
    } else {
        changeEl.textContent = formatSalesTicketMoney(info.vuelto || 0);
    }
}

async function refreshLastSalesTicketInfoCard() {
    const localInfo = readLastSalesTicketInfo();
    if (localInfo) {
        setLastSalesTicketInfoCard(localInfo);
    } else {
        setLastSalesTicketInfoCard(null);
    }

    try {
        const data = await fetchSalesSessionHistory(1);
        const rows = Array.isArray(data?.ventas) ? data.ventas : [];
        if (!rows.length) {
            const key = getSalesLastTicketStorageKey();
            if (key) {
                try {
                    localStorage.removeItem(key);
                } catch (_) {
                }
            }
            setLastSalesTicketInfoCard(null);
            return;
        }
        const row = rows[0];
        const mergedInfo = {
            id_venta: Number(row.id_venta || 0),
            numero_ticket: Number(row.numero_ticket || 0),
            folio_ticket: String(row.folio_ticket || row.numero_ticket || '').trim(),
            metodo_pago: String(row.metodo_pago || '').trim(),
            total: Number(row.total || 0),
            vuelto: Number(localInfo?.id_venta || 0) === Number(row.id_venta || 0)
                ? Number(localInfo?.vuelto || 0)
                : 0,
            vuelto_text: Number(localInfo?.id_venta || 0) === Number(row.id_venta || 0)
                ? (localInfo?.vuelto_text || formatSalesTicketMoney(localInfo?.vuelto || 0))
                : 'N/D',
            updated_at: localInfo?.updated_at || new Date().toISOString(),
        };
        persistLastSalesTicketInfo(mergedInfo);
        setLastSalesTicketInfoCard(mergedInfo);
    } catch (_) {
    }
}

function calculateSaleChangeAmount(totalAmount, metodoPago) {
    const total = Number(totalAmount || 0);
    if (!Number.isFinite(total) || total <= 0) return 0;
    const method = String(metodoPago || '').trim().toLowerCase();
    if (method === 'efectivo') {
        const paid = parseMoneyInputValue(document.getElementById('efectivoEfectivo')?.value);
        return Math.max(0, paid - total);
    }
    if (method === 'mixto') {
        const efectivoPagado = parseMoneyInputValue(document.getElementById('efectivoMixto')?.value);
        const tarjeta = parseMoneyInputValue(document.getElementById('tarjetaMixto')?.value);
        if (tarjeta > total) return 0;
        const efectivoRequerido = Math.max(0, roundClpAmount(total) - roundClpAmount(tarjeta));
        return Math.max(0, efectivoPagado - efectivoRequerido);
    }
    return 0;
}

async function reprintLastSaleTicketOrInvoice() {
    const notifyReprint = async (message, type = 'warning') => {
        if (typeof window.appAlert === 'function') {
            await window.appAlert(message, type, { title: 'Reimpresión' });
            return;
        }
        alert(message);
    };

    try {
        const data = await fetchSalesSessionHistory(1);
        const rows = Array.isArray(data?.ventas) ? data.ventas : [];
        if (!rows.length) {
            await notifyReprint('No hay ventas en la sesión para reimprimir.', 'warning');
            return;
        }
        const ventaId = Number(rows[0]?.id_venta || 0);
        if (!ventaId) {
            await notifyReprint('No se pudo identificar la última venta para reimprimir.', 'error');
            return;
        }
        await printSaleTicket(ventaId);
        await notifyReprint(`Reimpresión enviada: venta #${rows[0]?.folio_ticket || rows[0]?.numero_ticket || ventaId}.`, 'success');
    } catch (error) {
        console.error('Error al reimprimir última venta:', error);
        await notifyReprint(error.message || 'No se pudo reimprimir la última venta.', 'error');
    }
}

function closeSalesSessionHistoryPopup() {
    const popup = document.getElementById('salesHistoryPopUp');
    const editFeedback = document.getElementById('sales-history-edit-feedback');
    if (!popup) return;
    popup.classList.add('hidden');
    popup.style.display = '';
    salesHistoryRowsCache = [];
    salesHistorySelectedSaleId = 0;
    salesHistorySelectedSaleDetail = null;
    salesHistoryKeyboardNavigationInFlight = false;
    salesHistoryEditMode = false;
    salesHistoryOriginalPaymentState = null;
    if (editFeedback) {
        editFeedback.textContent = '';
        editFeedback.classList.add('hidden');
    }
    focusBarcodeInputForNextScan();
}

function setSalesHistoryEditFeedback(message = '', type = 'info') {
    const feedbackEl = document.getElementById('sales-history-edit-feedback');
    if (!feedbackEl) return;
    const normalized = String(message || '').trim();
    feedbackEl.classList.remove('feedback-ok', 'feedback-error', 'feedback-warning');
    if (!normalized) {
        feedbackEl.textContent = '';
        feedbackEl.classList.add('hidden');
        return;
    }
    feedbackEl.textContent = normalized;
    if (type === 'ok' || type === 'success') {
        feedbackEl.classList.add('feedback-ok');
    } else if (type === 'error') {
        feedbackEl.classList.add('feedback-error');
    } else if (type === 'warning') {
        feedbackEl.classList.add('feedback-warning');
    }
    feedbackEl.classList.remove('hidden');
}

function normalizeSalesHistoryPaymentMethodValue(value) {
    const method = String(value || '').trim().toLowerCase();
    return method || 'efectivo';
}

function buildSalesHistoryPaymentStateFromDetail(detail = {}) {
    const sale = detail?.sale || {};
    const payments = Array.isArray(detail?.payment_breakdown) ? detail.payment_breakdown : [];
    const total = Math.max(0, Number(sale?.total || 0));
    const cardByBreakdown = payments
        .filter((entry) => normalizeSalesHistoryPaymentMethodValue(entry?.metodo_pago) === 'tarjeta')
        .reduce((sum, entry) => sum + Number(entry?.monto || 0), 0);
    const cashByBreakdown = payments
        .filter((entry) => normalizeSalesHistoryPaymentMethodValue(entry?.metodo_pago) === 'efectivo')
        .reduce((sum, entry) => sum + Number(entry?.monto || 0), 0);

    const cardAmount = Math.max(0, Math.round(cardByBreakdown > 0 ? cardByBreakdown : Number(sale?.monto_tarjeta || 0)));
    const cashAmount = Math.max(0, Math.round(cashByBreakdown > 0 ? cashByBreakdown : Number(sale?.monto_efectivo || 0)));

    return {
        method: normalizeSalesHistoryPaymentMethodValue(sale?.metodo_pago),
        cardAmount,
        cashAmount,
        totalAmount: Math.round(total),
    };
}

function readSalesHistoryPaymentInputsState() {
    const methodSelect = document.getElementById('sales-history-payment-method');
    const cardInput = document.getElementById('sales-history-payment-card');
    const cashInput = document.getElementById('sales-history-payment-cash');
    return {
        method: normalizeSalesHistoryPaymentMethodValue(methodSelect?.value),
        cardAmount: Math.max(0, Math.round(parseMoneyInputValue(cardInput?.value))),
        cashAmount: Math.max(0, Math.round(parseMoneyInputValue(cashInput?.value))),
    };
}

function restoreSalesHistoryPaymentInputsFromState(state = null) {
    if (!state || typeof state !== 'object') return;
    const methodSelect = document.getElementById('sales-history-payment-method');
    const cardInput = document.getElementById('sales-history-payment-card');
    const cashInput = document.getElementById('sales-history-payment-cash');

    if (methodSelect) {
        const nextMethod = normalizeSalesHistoryPaymentMethodValue(state.method);
        if (methodSelect.querySelector(`option[value="${nextMethod}"]`)) {
            methodSelect.value = nextMethod;
        }
    }
    if (cardInput) cardInput.value = Number(state.cardAmount || 0) > 0 ? String(Math.round(Number(state.cardAmount || 0))) : '';
    if (cashInput) cashInput.value = Number(state.cashAmount || 0) > 0 ? String(Math.round(Number(state.cashAmount || 0))) : '';
}

function isSalesHistoryPaymentStateChanged(currentState = null, originalState = null) {
    if (!currentState || !originalState) return false;
    const methodCurrent = normalizeSalesHistoryPaymentMethodValue(currentState.method);
    const methodOriginal = normalizeSalesHistoryPaymentMethodValue(originalState.method);
    if (methodCurrent !== methodOriginal) return true;
    if (methodCurrent !== 'mixto') return false;
    const cardCurrent = Math.max(0, Math.round(Number(currentState.cardAmount || 0)));
    const cashCurrent = Math.max(0, Math.round(Number(currentState.cashAmount || 0)));
    const cardOriginal = Math.max(0, Math.round(Number(originalState.cardAmount || 0)));
    const cashOriginal = Math.max(0, Math.round(Number(originalState.cashAmount || 0)));
    return cardCurrent !== cardOriginal || cashCurrent !== cashOriginal;
}

function validateSalesHistoryPaymentState(state = null, totalAmount = 0, showFeedback = false) {
    const normalizedState = state && typeof state === 'object' ? state : readSalesHistoryPaymentInputsState();
    const total = Math.max(0, Math.round(Number(totalAmount || 0)));
    const method = normalizeSalesHistoryPaymentMethodValue(normalizedState.method);
    if (!method) {
        if (showFeedback) setSalesHistoryEditFeedback('Selecciona un método de pago válido.', 'warning');
        return { ok: false };
    }
    if (method !== 'mixto') {
        return { ok: true };
    }

    const cardAmount = Math.max(0, Math.round(Number(normalizedState.cardAmount || 0)));
    const cashAmount = Math.max(0, Math.round(Number(normalizedState.cashAmount || 0)));
    if (cardAmount > total) {
        if (showFeedback) setSalesHistoryEditFeedback('Pago mixto inválido: la tarjeta no puede superar el total de la venta.', 'warning');
        return { ok: false };
    }
    if (cardAmount + cashAmount < total) {
        if (showFeedback) setSalesHistoryEditFeedback('Pago mixto inválido: efectivo + tarjeta no puede ser inferior al total.', 'warning');
        return { ok: false };
    }
    return { ok: true };
}

function updateSalesHistoryEditControlsState() {
    const viewActions = document.getElementById('sales-history-view-actions');
    const editActions = document.getElementById('sales-history-edit-actions');
    const editBox = document.getElementById('sales-history-edit-box');
    const methodSelect = document.getElementById('sales-history-payment-method');
    const cardInput = document.getElementById('sales-history-payment-card');
    const cashInput = document.getElementById('sales-history-payment-cash');
    const saveBtn = document.getElementById('sales-history-save-payment-btn');
    const cancelBtn = document.getElementById('sales-history-cancel-edit-btn');
    const editBtn = document.getElementById('sales-history-enter-edit-btn');
    const reprintBtn = document.getElementById('sales-history-reprint-btn');

    const hasSaleSelected = Number(salesHistorySelectedSaleId || 0) > 0 && !!salesHistorySelectedSaleDetail;
    const isEditMode = Boolean(salesHistoryEditMode && hasSaleSelected);

    if (viewActions) viewActions.classList.toggle('hidden', !hasSaleSelected || isEditMode);
    if (editActions) editActions.classList.toggle('hidden', !hasSaleSelected || !isEditMode);
    if (editBox) editBox.classList.toggle('hidden', !hasSaleSelected || !isEditMode);

    [methodSelect, cardInput, cashInput].forEach((control) => {
        if (!control) return;
        control.disabled = !isEditMode;
    });

    if (editBtn) editBtn.disabled = !hasSaleSelected;
    if (reprintBtn) reprintBtn.disabled = !hasSaleSelected || isEditMode;
    if (cancelBtn) cancelBtn.disabled = !isEditMode;

    if (saveBtn) {
        if (!isEditMode || !salesHistoryOriginalPaymentState) {
            saveBtn.disabled = true;
        } else {
            const currentState = readSalesHistoryPaymentInputsState();
            const hasChanges = isSalesHistoryPaymentStateChanged(currentState, salesHistoryOriginalPaymentState);
            const validation = validateSalesHistoryPaymentState(currentState, salesHistoryOriginalPaymentState.totalAmount, false);
            saveBtn.disabled = !hasChanges || !validation.ok;
        }
    }
}

function setSalesHistoryEditMode(enabled, options = {}) {
    const shouldEnable = Boolean(enabled);
    const restoreInputs = options?.restoreInputs !== false;
    const keepFeedback = options?.keepFeedback === true;

    if (!shouldEnable && restoreInputs && salesHistoryOriginalPaymentState) {
        restoreSalesHistoryPaymentInputsFromState(salesHistoryOriginalPaymentState);
    }

    salesHistoryEditMode = shouldEnable && Number(salesHistorySelectedSaleId || 0) > 0 && !!salesHistorySelectedSaleDetail;
    handleSalesHistoryPaymentMethodChange();
    updateSalesHistoryEditControlsState();

    if (!keepFeedback) {
        setSalesHistoryEditFeedback('');
    }
}

function enterSalesHistoryEditMode() {
    if (!salesHistorySelectedSaleDetail || Number(salesHistorySelectedSaleId || 0) <= 0) {
        setSalesHistoryEditFeedback('Selecciona una venta para editar.', 'warning');
        return;
    }
    setSalesHistoryEditMode(true, { restoreInputs: false });
}

function cancelSalesHistoryEditMode() {
    setSalesHistoryEditMode(false, { restoreInputs: true, keepFeedback: false });
}

async function reprintSalesHistorySelectedSale() {
    const saleId = Number(salesHistorySelectedSaleId || salesHistorySelectedSaleDetail?.sale?.id_venta || 0);
    if (!Number.isFinite(saleId) || saleId <= 0) {
        setSalesHistoryEditFeedback('Selecciona una venta para reimprimir.', 'warning');
        return;
    }
    const reprintBtn = document.getElementById('sales-history-reprint-btn');
    try {
        if (reprintBtn) reprintBtn.disabled = true;
        await printSaleTicket(saleId);
        const ticketLabel = normalizeText(
            salesHistorySelectedSaleDetail?.sale?.folio_ticket
            || salesHistorySelectedSaleDetail?.sale?.numero_ticket
            || String(saleId)
        );
        setSalesHistoryEditFeedback(`Reimpresión enviada para venta #${ticketLabel}.`, 'ok');
    } catch (error) {
        console.error('Error al reimprimir venta seleccionada:', error);
        setSalesHistoryEditFeedback(error.message || 'No se pudo reimprimir la venta seleccionada.', 'error');
    } finally {
        if (reprintBtn) reprintBtn.disabled = false;
        updateSalesHistoryEditControlsState();
    }
}

function setupSalesHistoryEditInputWatchers() {
    const methodSelect = document.getElementById('sales-history-payment-method');
    const cardInput = document.getElementById('sales-history-payment-card');
    const cashInput = document.getElementById('sales-history-payment-cash');

    if (methodSelect && methodSelect.dataset.salesHistoryWatchBound !== '1') {
        methodSelect.addEventListener('change', () => {
            updateSalesHistoryEditControlsState();
        });
        methodSelect.dataset.salesHistoryWatchBound = '1';
    }
    [cardInput, cashInput].forEach((input) => {
        if (!input || input.dataset.salesHistoryWatchBound === '1') return;
        input.addEventListener('input', () => {
            updateSalesHistoryEditControlsState();
        });
        input.dataset.salesHistoryWatchBound = '1';
    });
}

function splitSalesHistoryDateTimeParts(value) {
    const raw = normalizeText(value);
    if (!raw) {
        return {
            dateLabel: '-',
            timeLabel: '--:--',
        };
    }

    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T]+(\d{2}):(\d{2}))?/);
    if (isoMatch) {
        return {
            dateLabel: `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`,
            timeLabel: isoMatch[4] ? `${isoMatch[4]}:${isoMatch[5]}` : '--:--',
        };
    }

    const parsed = new Date(raw.replace(' ', 'T'));
    if (!Number.isNaN(parsed.getTime())) {
        const day = String(parsed.getDate()).padStart(2, '0');
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const year = parsed.getFullYear();
        const hour = String(parsed.getHours()).padStart(2, '0');
        const minute = String(parsed.getMinutes()).padStart(2, '0');
        return {
            dateLabel: `${day}/${month}/${year}`,
            timeLabel: `${hour}:${minute}`,
        };
    }

    const looseParts = raw.split(/\s+/);
    if (looseParts.length >= 2) {
        return {
            dateLabel: looseParts[0],
            timeLabel: looseParts[1].slice(0, 5),
        };
    }

    return {
        dateLabel: raw,
        timeLabel: '--:--',
    };
}

function isSalesHistoryPopupVisible() {
    const popup = document.getElementById('salesHistoryPopUp');
    if (!popup || popup.classList.contains('hidden')) return false;
    const computed = window.getComputedStyle(popup);
    if (!computed) return false;
    return computed.display !== 'none' && computed.visibility !== 'hidden';
}

function getSalesHistoryVisibleSaleIds() {
    return Array.from(document.querySelectorAll('#sales-history-body tr[data-sale-id]'))
        .map((rowEl) => Number(rowEl?.dataset?.saleId || 0))
        .filter((saleId) => Number.isFinite(saleId) && saleId > 0);
}

function scrollSalesHistoryRowIntoView(saleId) {
    const parsedSaleId = Number(saleId || 0);
    if (!Number.isFinite(parsedSaleId) || parsedSaleId <= 0) return;
    const rowEl = document.querySelector(`#sales-history-body tr[data-sale-id="${parsedSaleId}"]`);
    if (!rowEl || typeof rowEl.scrollIntoView !== 'function') return;
    rowEl.scrollIntoView({ block: 'nearest' });
}

async function moveSalesHistorySelectionByStep(step = 0) {
    const direction = Number(step);
    if (!Number.isFinite(direction) || direction === 0) return;
    const saleIds = getSalesHistoryVisibleSaleIds();
    if (!saleIds.length) return;

    const currentId = Number(salesHistorySelectedSaleId || 0);
    const currentIndex = saleIds.indexOf(currentId);
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = Math.max(0, Math.min(
        saleIds.length - 1,
        baseIndex + (direction > 0 ? 1 : -1)
    ));
    const nextSaleId = Number(saleIds[nextIndex] || 0);
    if (!Number.isFinite(nextSaleId) || nextSaleId <= 0) return;

    scrollSalesHistoryRowIntoView(nextSaleId);
    if (nextSaleId === currentId) return;
    await selectSalesHistorySale(nextSaleId);
    scrollSalesHistoryRowIntoView(nextSaleId);
}

function setupSalesHistoryKeyboardNavigation() {
    document.addEventListener('keydown', async (event) => {
        if (!isSalesHistoryPopupVisible()) return;
        if (document.getElementById('mm-alert-overlay')?.classList.contains('show')) return;
        if (salesHistoryEditMode) return;

        const key = String(event.key || '').toLowerCase();
        if (key !== 'arrowdown' && key !== 'arrowup') return;

        const target = event.target;
        const tag = String(target?.tagName || '').toLowerCase();
        const isTypingContext = Boolean(
            target?.isContentEditable ||
            tag === 'input' ||
            tag === 'textarea' ||
            tag === 'select'
        );
        if (isTypingContext) return;
        if (salesHistoryKeyboardNavigationInFlight) return;

        event.preventDefault();
        try {
            salesHistoryKeyboardNavigationInFlight = true;
            await moveSalesHistorySelectionByStep(key === 'arrowdown' ? 1 : -1);
        } catch (error) {
            setSalesHistoryEditFeedback(error?.message || 'No se pudo navegar el historial de ventas.', 'error');
        } finally {
            salesHistoryKeyboardNavigationInFlight = false;
        }
    });
}

function renderSalesHistoryRows(rows = []) {
    const body = document.getElementById('sales-history-body');
    if (!body) return;
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) {
        body.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay ventas para mostrar.</td></tr>';
        return;
    }

    body.innerHTML = list.map((row) => {
        const saleId = Number(row?.id_venta || 0);
        const total = Number(row?.total || 0);
        const dateParts = splitSalesHistoryDateTimeParts(row?.fecha || '');
        const rowSelectedClass = saleId === salesHistorySelectedSaleId ? 'sales-history-row-selected' : '';
        const ticketLabel = normalizeText(row?.folio_ticket || row?.numero_ticket || String(saleId || '-')) || '-';
        return `
            <tr data-sale-id="${saleId}" class="${rowSelectedClass}">
                <td>
                    <div class="sales-history-date-cell">
                        <span class="sales-history-date-main">${escapeHtml(dateParts.dateLabel)}</span>
                        <span class="sales-history-date-time">${escapeHtml(dateParts.timeLabel)}</span>
                    </div>
                </td>
                <td style="text-align:center;">${escapeHtml(ticketLabel)}</td>
                <td>${escapeHtml(normalizeText(normalizeSalesPaymentMethodLabel(row?.metodo_pago || '-')))}</td>
                <td style="text-align:right;">$${total.toFixed(0)}</td>
            </tr>
        `;
    }).join('');

    body.querySelectorAll('tr[data-sale-id]').forEach((rowEl) => {
        rowEl.addEventListener('click', () => {
            const saleId = Number(rowEl.dataset.saleId || 0);
            if (!saleId) return;
            selectSalesHistorySale(saleId).catch((error) => {
                setSalesHistoryEditFeedback(error.message || 'No se pudo cargar el detalle de la venta.', 'error');
            });
        });
    });
}

function handleSalesHistoryPaymentMethodChange() {
    const methodSelect = document.getElementById('sales-history-payment-method');
    const mixedFields = document.getElementById('sales-history-mixed-fields');
    const method = String(methodSelect?.value || '').trim().toLowerCase();
    if (!mixedFields) return;
    if (method === 'mixto' && salesHistoryEditMode) {
        mixedFields.classList.remove('hidden');
    } else {
        mixedFields.classList.add('hidden');
    }
    updateSalesHistoryEditControlsState();
}

function renderSalesHistorySaleDetail(detail = {}) {
    const emptyBox = document.getElementById('sales-history-detail-empty');
    const detailCard = document.getElementById('sales-history-detail-card');
    if (!emptyBox || !detailCard) return;

    const sale = detail?.sale || {};
    const items = Array.isArray(detail?.items) ? detail.items : [];
    const payments = Array.isArray(detail?.payment_breakdown) ? detail.payment_breakdown : [];

    const ribbon = document.getElementById('sales-history-modified-ribbon');
    const datetimeEl = document.getElementById('sales-history-detail-datetime');
    const ticketEl = document.getElementById('sales-history-detail-ticket');
    const cajaEl = document.getElementById('sales-history-detail-caja');
    const cajeroEl = document.getElementById('sales-history-detail-cajero');
    const methodEl = document.getElementById('sales-history-detail-method');
    const totalEl = document.getElementById('sales-history-detail-total');
    const productsBody = document.getElementById('sales-history-detail-products-body');
    const paymentsWrap = document.getElementById('sales-history-detail-payments');
    const methodSelect = document.getElementById('sales-history-payment-method');
    const cardInput = document.getElementById('sales-history-payment-card');
    const cashInput = document.getElementById('sales-history-payment-cash');

    const isModified = Number(sale?.pago_modificado || 0) === 1;
    if (ribbon) ribbon.classList.toggle('hidden', !isModified);

    if (datetimeEl) datetimeEl.textContent = normalizeText(sale?.fecha || '-');
    if (ticketEl) ticketEl.textContent = normalizeText(sale?.folio_ticket || sale?.numero_ticket || String(sale?.id_venta || '-'));
    if (cajaEl) cajaEl.textContent = String(sale?.caja_id || '-');
    if (cajeroEl) cajeroEl.textContent = normalizeText(sale?.cajero_nombre || '-');
    if (methodEl) methodEl.textContent = normalizeSalesPaymentMethodLabel(sale?.metodo_pago || '-');
    if (totalEl) totalEl.textContent = formatSalesTicketMoney(sale?.total || 0);

    if (productsBody) {
        if (!items.length) {
            productsBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Sin productos.</td></tr>';
        } else {
            productsBody.innerHTML = items.map((item) => {
                const qty = Number(item?.cantidad || 0);
                const unitPrice = Number(item?.precio_unitario || 0);
                const subtotal = Number(item?.subtotal || 0);
                return `
                    <tr>
                        <td>${escapeHtml(normalizeText(item?.descripcion || 'Producto'))}</td>
                        <td style="text-align:center;">${qty.toFixed(2).replace(/\.00$/, '')}</td>
                        <td style="text-align:right;">$${unitPrice.toFixed(0)}</td>
                        <td style="text-align:right;">$${subtotal.toFixed(0)}</td>
                    </tr>
                `;
            }).join('');
        }
    }

    if (paymentsWrap) {
        if (!payments.length) {
            paymentsWrap.innerHTML = '<p class="sales-history-payment-item">Sin desglose de pago.</p>';
        } else {
            const modifiedMeta = isModified
                ? `<p class="sales-history-payment-item"><span>Actualizado</span><strong>${escapeHtml(normalizeText(sale?.pago_modificado_at || ''))}</strong></p>`
                : '';
            paymentsWrap.innerHTML = `
                ${payments.map((entry) => `
                    <p class="sales-history-payment-item">
                        <span>${escapeHtml(normalizeSalesPaymentMethodLabel(entry?.metodo_pago || ''))}</span>
                        <strong>${escapeHtml(formatSalesTicketMoney(entry?.monto || 0))}</strong>
                    </p>
                `).join('')}
                ${modifiedMeta}
            `;
        }
    }

    if (methodSelect) {
        const saleMethod = String(sale?.metodo_pago || 'efectivo').trim().toLowerCase();
        if (methodSelect.querySelector(`option[value="${saleMethod}"]`)) {
            methodSelect.value = saleMethod;
        } else {
            methodSelect.value = 'efectivo';
        }
    }

    const cardAmount = payments
        .filter((entry) => String(entry?.metodo_pago || '').trim().toLowerCase() === 'tarjeta')
        .reduce((sum, entry) => sum + Number(entry?.monto || 0), 0);
    const cashAmount = payments
        .filter((entry) => String(entry?.metodo_pago || '').trim().toLowerCase() === 'efectivo')
        .reduce((sum, entry) => sum + Number(entry?.monto || 0), 0);
    if (cardInput) cardInput.value = cardAmount > 0 ? String(Math.round(cardAmount)) : '';
    if (cashInput) cashInput.value = cashAmount > 0 ? String(Math.round(cashAmount)) : '';

    salesHistoryOriginalPaymentState = buildSalesHistoryPaymentStateFromDetail({
        sale,
        payment_breakdown: payments,
    });
    restoreSalesHistoryPaymentInputsFromState(salesHistoryOriginalPaymentState);
    setSalesHistoryEditMode(false, { restoreInputs: true, keepFeedback: true });

    emptyBox.classList.add('hidden');
    detailCard.classList.remove('hidden');
    setSalesHistoryEditFeedback('');
}

async function selectSalesHistorySale(saleId) {
    const parsedSaleId = Number(saleId || 0);
    if (!Number.isFinite(parsedSaleId) || parsedSaleId <= 0) return;
    salesHistorySelectedSaleId = parsedSaleId;
    salesHistorySelectedSaleDetail = null;
    salesHistoryOriginalPaymentState = null;
    setSalesHistoryEditMode(false, { restoreInputs: false, keepFeedback: true });

    document.querySelectorAll('#sales-history-body tr[data-sale-id]').forEach((rowEl) => {
        const rowSaleId = Number(rowEl.dataset.saleId || 0);
        rowEl.classList.toggle('sales-history-row-selected', rowSaleId === parsedSaleId);
    });

    const emptyBox = document.getElementById('sales-history-detail-empty');
    const detailCard = document.getElementById('sales-history-detail-card');
    if (emptyBox) {
        emptyBox.textContent = 'Cargando detalle de venta...';
        emptyBox.classList.remove('hidden');
    }
    if (detailCard) detailCard.classList.add('hidden');

    const detail = await fetchSalesHistorySaleDetail(parsedSaleId);
    if (salesHistorySelectedSaleId !== parsedSaleId) return;
    salesHistorySelectedSaleDetail = detail;
    renderSalesHistorySaleDetail(detail);
}

async function openSalesSessionHistoryPopup() {
    const popup = document.getElementById('salesHistoryPopUp');
    const body = document.getElementById('sales-history-body');
    const summary = document.getElementById('sales-history-summary');
    const emptyBox = document.getElementById('sales-history-detail-empty');
    const detailCard = document.getElementById('sales-history-detail-card');
    if (!popup || !body || !summary) return;

    popup.classList.remove('hidden');
    popup.style.display = 'flex';
    salesHistoryRowsCache = [];
    salesHistorySelectedSaleId = 0;
    salesHistorySelectedSaleDetail = null;
    salesHistoryKeyboardNavigationInFlight = false;
    salesHistoryEditMode = false;
    salesHistoryOriginalPaymentState = null;
    summary.textContent = 'Cargando ventas...';
    body.innerHTML = '<tr><td colspan="4" style="text-align:center;">Cargando...</td></tr>';
    if (emptyBox) {
        emptyBox.textContent = 'Selecciona una venta para ver el detalle y editar su forma de pago.';
        emptyBox.classList.remove('hidden');
    }
    if (detailCard) detailCard.classList.add('hidden');
    setSalesHistoryEditFeedback('');
    updateSalesHistoryEditControlsState();

    try {
        const data = await fetchSalesSessionHistory(500);
        const rows = Array.isArray(data?.ventas) ? data.ventas : [];
        const caja = String(data?.caja_id || localStorage.getItem('n_caja') || localStorage.getItem('caja') || '-').trim() || '-';
        const cajero = String(data?.usuario_id || localStorage.getItem('id_user') || '-').trim() || '-';
        const turno = Number(data?.turno_id || localStorage.getItem('turno_id_actual') || 0);
        salesHistoryRowsCache = rows;
        summary.textContent = rows.length
            ? `Mostrando ${rows.length} venta(s) de la caja ${caja}, cajero ${cajero}, turno #${turno || '-'}.`
            : `Sin ventas en caja ${caja}, cajero ${cajero}, turno #${turno || '-'}.`;
        renderSalesHistoryRows(rows);
        if (rows.length) {
            try {
                await selectSalesHistorySale(Number(rows[0]?.id_venta || 0));
            } catch (detailError) {
                console.error('Error al cargar detalle inicial de venta:', detailError);
                setSalesHistoryEditFeedback(detailError?.message || 'No se pudo cargar el detalle inicial de la venta.', 'error');
            }
        }
    } catch (error) {
        console.error('Error al abrir historial de ventas:', error);
        summary.textContent = 'No se pudo cargar el historial de ventas.';
        body.innerHTML = '<tr><td colspan="4" style="text-align:center;">Error al cargar ventas.</td></tr>';
        if (emptyBox) {
            emptyBox.textContent = 'No se pudo cargar el detalle de ventas.';
            emptyBox.classList.remove('hidden');
        }
    }
}

async function saveSalesHistoryPaymentUpdate() {
    const saleId = Number(salesHistorySelectedSaleId || 0);
    if (!Number.isFinite(saleId) || saleId <= 0) {
        setSalesHistoryEditFeedback('Selecciona una venta para editar su forma de pago.', 'warning');
        return;
    }
    if (!salesHistoryEditMode) {
        setSalesHistoryEditFeedback('Pulsa "Editar" para habilitar cambios en la forma de pago.', 'warning');
        return;
    }

    const saveBtn = document.getElementById('sales-history-save-payment-btn');
    const cancelBtn = document.getElementById('sales-history-cancel-edit-btn');
    const editState = readSalesHistoryPaymentInputsState();
    const method = normalizeSalesHistoryPaymentMethodValue(editState.method);
    const totalAmount = Number(salesHistoryOriginalPaymentState?.totalAmount || salesHistorySelectedSaleDetail?.sale?.total || 0);

    const validation = validateSalesHistoryPaymentState(editState, totalAmount, true);
    if (!validation.ok) {
        updateSalesHistoryEditControlsState();
        return;
    }
    if (!isSalesHistoryPaymentStateChanged(editState, salesHistoryOriginalPaymentState)) {
        setSalesHistoryEditFeedback('No hay cambios para guardar.', 'warning');
        updateSalesHistoryEditControlsState();
        return;
    }

    const { caja, cajero } = getSalesSessionIdentity();
    const payload = {
        metodo_pago: method,
        caja: caja ? Number(caja) : null,
        cajero: cajero ? Number(cajero) : null,
    };
    if (method === 'mixto') {
        payload.monto_tarjeta = editState.cardAmount;
        payload.monto_efectivo = editState.cashAmount;
    }

    try {
        if (saveBtn) saveBtn.disabled = true;
        if (cancelBtn) cancelBtn.disabled = true;
        setSalesHistoryEditFeedback('Guardando cambios...', 'info');
        const updateResponse = await updateSalesHistorySalePayment(saleId, payload);
        const data = await fetchSalesSessionHistory(500);
        salesHistoryRowsCache = Array.isArray(data?.ventas) ? data.ventas : [];
        renderSalesHistoryRows(salesHistoryRowsCache);
        await selectSalesHistorySale(saleId);
        setSalesHistoryEditFeedback(updateResponse?.message || 'Forma de pago actualizada.', 'ok');
        refreshLastSalesTicketInfoCard().catch(() => {});
    } catch (error) {
        console.error('Error guardando forma de pago:', error);
        setSalesHistoryEditFeedback(error.message || 'No se pudo guardar la forma de pago.', 'error');
    } finally {
        if (saveBtn) saveBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
        updateSalesHistoryEditControlsState();
    }
}

async function lookupProductPrice() {
    const codeInput = document.getElementById('price-check-code');
    const nameEl = document.getElementById('price-check-name');
    const priceEl = document.getElementById('price-check-value');
    const codigo = String(codeInput?.value || '').trim();
    if (!codigo) {
        if (nameEl) nameEl.textContent = 'Ingresa un codigo.';
        if (priceEl) priceEl.textContent = '$0';
        return;
    }

    try {
        const response = await fetch(API_URL + `api/productos/code/${encodeURIComponent(codigo)}`, {
            headers: withAuthHeaders(),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.status === 401) {
            handleSessionExpiredRedirect('Sesion expirada. Vuelve a iniciar sesion.');
            return;
        }
        if (!response.ok) {
            if (nameEl) nameEl.textContent = payload.message || payload.error || 'Producto no encontrado.';
            if (priceEl) priceEl.textContent = '$0';
            return;
        }
        if (!payload?.found || !payload?.product) {
            if (nameEl) nameEl.textContent = payload?.error || 'Producto no encontrado.';
            if (priceEl) priceEl.textContent = '$0';
            return;
        }
        const data = payload.product;
        const nombre = String(data.descripcion || '').trim();
        const precio = Number(data.precio_venta || 0);
        if (nameEl) nameEl.textContent = nombre || 'Producto';
        if (priceEl) priceEl.textContent = `$${precio.toFixed(0)}`;
    } catch (error) {
        console.error('Error consultando precio:', error);
        if (nameEl) nameEl.textContent = 'Error de conexion.';
        if (priceEl) priceEl.textContent = '$0';
    }
}

async function saveCashEntry() {
    return saveCashMovement('entrada');
}

async function saveCashExit() {
    return saveCashMovement('salida');
}

async function saveCashMovement(tipoMovimiento) {
    if (!shiftStarted) {
        await ensureShiftStartedOnLoad();
        if (!shiftStarted) {
            alert('Debes iniciar turno antes de registrar movimientos.');
            return;
        }
    }

    const caja = localStorage.getItem('n_caja') || localStorage.getItem('caja');
    const cajero = localStorage.getItem('id_user');
    const isExit = tipoMovimiento === 'salida';
    const amountInput = document.getElementById(isExit ? 'cash-exit-amount' : 'cash-entry-amount');
    const entryKind = document.getElementById('cash-entry-kind');
    const entryDescriptionInput = document.getElementById('cash-entry-description');
    const exitProviderSelect = document.getElementById('cash-exit-provider');
    const exitMethodSelect = document.getElementById('cash-exit-method');
    const rawAmount = String(amountInput?.value || '').replace(/[^0-9]/g, '');
    const monto = Number(rawAmount || 0);
    const isOtherEntry = !isExit && (entryKind?.value || 'sencillo') === 'otro';
    const selectedProviderValue = String(exitProviderSelect?.value || '').trim();
    const selectedProviderOption = exitProviderSelect?.selectedOptions?.[0] || null;
    const selectedProviderName = String(selectedProviderOption?.textContent || '').trim();
    const selectedExitMethod = String(exitMethodSelect?.value || '').trim().toLowerCase();
    const selectedProviderId = Number(selectedProviderValue || 0);
    const descripcion = isExit
        ? selectedProviderName
        : (isOtherEntry ? String(entryDescriptionInput?.value || '').trim() : 'sencillo');

    if (!caja || !cajero) {
        alert('No hay sesión activa de caja/cajero.');
        return;
    }
    if (!Number.isFinite(monto) || monto <= 0) {
        alert('Ingresa un monto válido.');
        return;
    }
    if (isExit && !selectedProviderValue) {
        alert('Selecciona el proveedor de la salida.');
        return;
    }
    if (isExit && !selectedExitMethod) {
        alert('Selecciona la forma de pago de la salida.');
        return;
    }
    if (isExit && !descripcion) {
        alert('Selecciona un proveedor valido para la salida.');
        return;
    }
    if (isOtherEntry && !descripcion) {
        alert('Ingresa una descripcion para el ingreso tipo otro.');
        return;
    }

    try {
        const payload = {
            numero_caja: caja,
            cajero,
            tipo: isExit ? 'salida' : 'entrada',
            metodo: isExit ? selectedExitMethod : 'efectivo',
            monto,
            descripcion,
            provider_id: isExit && Number.isFinite(selectedProviderId) && selectedProviderId > 0 ? selectedProviderId : null,
            provider_name: isExit ? descripcion : null,
        };
        const endpoints = [API_URL + 'api/cash-movements'];
        const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
        const fallbackBase = `${isLocalHost ? 'http:' : window.location.protocol}//${window.location.hostname}:3002/`;
        const fallbackEndpoint = fallbackBase + 'api/cash-movements';
        if (!endpoints.includes(fallbackEndpoint)) {
            endpoints.push(fallbackEndpoint);
        }

        let data = {};
        let rawText = '';
        let response = null;
        for (let i = 0; i < endpoints.length; i += 1) {
            response = await fetch(endpoints[i], {
                method: 'POST',
                headers: {
                    ...withAuthHeaders({
                        'Content-Type': 'application/json',
                    }),
                },
                body: JSON.stringify(payload),
            });
            try {
                rawText = await response.text();
                data = rawText ? JSON.parse(rawText) : {};
            } catch (_) {
                data = {};
            }
            const cannotPost = response.status === 404 && /cannot post/i.test(String(rawText || ''));
            if (!cannotPost || i === endpoints.length - 1) {
                break;
            }
        }

        if (!response.ok) {
            if (response.status === 401) {
                handleSessionExpiredRedirect('Sesion expirada. Vuelve a iniciar sesion.');
                return;
            }
            if (response.status === 409) {
                shiftStarted = false;
                setSalesEnabledByShift(false);
                alert(data.message || 'No hay turno abierto para registrar movimientos.');
                return;
            }
            const fallbackText = String(rawText || '').trim();
            alert(data.message || (fallbackText ? fallbackText.slice(0, 180) : 'No se pudo registrar el movimiento.'));
            return;
        }
        if (isExit) {
            closeCashExitPopup();
        } else {
            closeCashEntryPopup();
        }
        if (typeof loadCurrentCut === 'function') {
            await loadCurrentCut();
        }
    } catch (error) {
        console.error('Error guardando movimiento de caja:', error);
        alert('Error de conexión al registrar movimiento.');
    }
}

async function performProductSuggestionSearch(queryText) {
    const resultsBody = document.getElementById('search-product-results-body');
    if (!resultsBody) return;
    const query = String(queryText || '').trim();
    if (query.length < 2) {
        resultsBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Escribe al menos 2 letras.</td></tr>';
        searchProductsLastResults = [];
        searchSelectedProductId = null;
        return;
    }

    try {
        const params = new URLSearchParams({ q: query });
        const response = await fetch(API_URL + `api/productos/search?${params.toString()}`, {
            headers: withAuthHeaders(),
        });
        if (response.status === 401) {
            handleSessionExpiredRedirect('Sesion expirada. Vuelve a iniciar sesion.');
            return;
        }
        let rows = await response.json().catch(() => []);
        if (!response.ok || !Array.isArray(rows)) {
            rows = [];
        }
        if (Array.isArray(rows) && rows.length === 0) {
            const fallbackResp = await fetch(API_URL + 'api/productos', {
                headers: withAuthHeaders(),
            });
            if (fallbackResp.status === 401) {
                handleSessionExpiredRedirect('Sesion expirada. Vuelve a iniciar sesion.');
                return;
            }
            const fallbackRows = await fallbackResp.json().catch(() => []);
            if (fallbackResp.ok && Array.isArray(fallbackRows)) {
                const q = query.toLowerCase();
                rows = fallbackRows.filter((item) =>
                    String(item.descripcion || '').toLowerCase().includes(q)
                ).slice(0, 20);
            }
        }

        searchProductsLastResults = (Array.isArray(rows) ? rows : []).map((r) => ({
            ...r,
            id_producto: Number(r.id_producto),
            precio_venta: Number(r.precio_venta || 0),
            cantidad_actual: Number(r.cantidad_actual || 0),
        }));
        searchSelectedProductId = null;

        if (searchProductsLastResults.length === 0) {
            resultsBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Sin coincidencias.</td></tr>';
            return;
        }

        resultsBody.innerHTML = '';
        searchProductsLastResults.forEach((row) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.descripcion || ''}</td>
                <td style="text-align:right;">$${Number(row.precio_venta || 0).toFixed(0)}</td>
                <td style="text-align:right;">${Number(row.cantidad_actual || 0).toFixed(0)}</td>
                <td style="text-align:center;"><input type="radio" name="search-product-choice" value="${row.id_producto}"></td>
            `;
            tr.addEventListener('click', () => {
                searchSelectedProductId = row.id_producto;
                const radio = tr.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
            });
            resultsBody.appendChild(tr);
        });
    } catch (error) {
        resultsBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Error de conexión.</td></tr>';
        searchProductsLastResults = [];
        searchSelectedProductId = null;
    }
}

function searchProductsSuggestions(queryText) {
    if (searchProductsDebounceTimer) {
        clearTimeout(searchProductsDebounceTimer);
    }
    searchProductsDebounceTimer = setTimeout(() => {
        performProductSuggestionSearch(queryText);
    }, 220);
}

async function addSelectedSearchedProductToCart() {
    if (!shiftStarted) {
        await ensureShiftStartedOnLoad();
        if (!shiftStarted) {
            alert('Debes iniciar turno antes de agregar productos.');
            return;
        }
    }

    const selectedByRadio = document.querySelector('input[name="search-product-choice"]:checked');
    const selectedId = Number(selectedByRadio?.value || searchSelectedProductId || 0);
    if (!selectedId) {
        alert('Selecciona un producto de la lista.');
        return;
    }

    const selected = searchProductsLastResults.find((item) => Number(item.id_producto) === selectedId);
    if (!selected) {
        alert('Producto no válido.');
        return;
    }
    if (isBulkSaleProduct(selected)) {
        closeSearchProductPopup();
        openBulkProductPopup(selected);
        return;
    }
    const useInventory = Number(selected.utiliza_inventario || 0) === 1;
    const currentStock = Number(selected.cantidad_actual || 0);

    const existingProduct = cart.find(item => Number(item.id_producto) === Number(selected.id_producto));
    const nextQty = existingProduct ? Number(existingProduct.quantity || 0) + 1 : 1;
    if (useInventory && (!Number.isFinite(currentStock) || currentStock <= 0)) {
        if (typeof window.appAlert === 'function') {
            await window.appAlert('Este producto no tiene stock o existencia disponible.', 'warning', {
                title: 'Sin stock',
                okText: 'Entendido',
            });
        } else {
            alert('Este producto no tiene stock o existencia disponible.');
        }
        return;
    }
    if (useInventory && nextQty > currentStock) {
        if (typeof window.appAlert === 'function') {
            await window.appAlert(`No puedes agregar más unidades. Stock disponible: ${currentStock.toFixed(0)}.`, 'warning', {
                title: 'Stock insuficiente',
                okText: 'Entendido',
            });
        } else {
            alert(`No puedes agregar más unidades. Stock disponible: ${currentStock.toFixed(0)}.`);
        }
        return;
    }

    if (existingProduct) {
        existingProduct.quantity = Number(existingProduct.quantity || 0) + 1;
        existingProduct.line_subtotal = 0;
        selectedCartIndex = cart.indexOf(existingProduct);
    } else {
        cart.push({
            id_producto: Number(selected.id_producto),
            codigo_barras: selected.codigo_barras || '',
            descripcion: selected.descripcion || '',
            precio_venta: Number(selected.precio_venta || 0),
            utiliza_inventario: useInventory ? 1 : 0,
            cantidad_actual: currentStock,
            formato_venta: resolveProductSaleFormat(selected),
            quantity: 1,
        });
        selectedCartIndex = cart.length - 1;
    }

    updateCartUI();
    closeSearchProductPopup();
}

// Mostrar el recibo
function showReceipt(receipt) {
    const receiptDetails = document.getElementById('receipt-details');
    receiptDetails.innerHTML = ''; // Limpiar los detalles del recibo

    receipt.products.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.name} - $${item.price} x ${item.quantity}`;
        receiptDetails.appendChild(li);
    });

    document.getElementById('receipt-total').textContent = receipt.total.toFixed(2);
    document.getElementById('receipt').classList.remove('hidden');
}

// FunciÃ³n para mostrar la secciÃ³n activa
function showSectioninventario(sectionId) {
    const sections = document.querySelectorAll('div > section');
    sections.forEach(section => section.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
    if (sectionId === 'add') {
        loadProductSupplierOptions().catch(() => {});
    }
}

// FunciÃ³n para ocultar la secciÃ³n activa
function hideAllSections() {
    const sections = document.querySelectorAll('div > section');
    sections.forEach(section => section.classList.add('hidden'));
}

// FunciÃ³n para obtener los productos desde el backend
async function getProducts() {
    try {
        const response = await fetch(API_URL+'api/productos', {
            headers: withAuthHeaders(),
        });
        const products = await response.json();
        updateInventoryList(Array.isArray(products) ? products : []);
    } catch (error) {
        console.error('Error fetching products:', error);
    }
}


// Actualiza la lista de productos en la vista de inventario
function updateInventoryList(products) {
    const inventoryList = document.getElementById('inventory-list');
    if (!inventoryList) {
        return;
    }
    inventoryList.innerHTML = ''; // Limpiar la lista antes de agregar nuevos productos
    products.forEach(product => {
        if (!Number(product.utiliza_inventario || 0)) return;
        const li = document.createElement('li');
        li.textContent = `${product.descripcion || product.name} - $${product.precio_venta || product.price} x ${product.cantidad_actual || product.quantity}`;
        inventoryList.appendChild(li);
    });
}

function setInventoryFeedback(message, type = 'info') {
    const box = document.getElementById('inventory-feedback');
    if (!box) return;
    box.textContent = String(message || '');
    box.classList.remove('feedback-error', 'feedback-ok', 'feedback-warning');
    if (type === 'error') box.classList.add('feedback-error');
    if (type === 'ok') box.classList.add('feedback-ok');
    if (type === 'warning') box.classList.add('feedback-warning');
}

function setInventoryAdjustFeedback(message, type = 'info') {
    const box = document.getElementById('inventory-adjust-feedback');
    if (!box) return;
    box.textContent = String(message || '');
    box.classList.remove('feedback-error', 'feedback-ok', 'feedback-warning');
    if (type === 'error') box.classList.add('feedback-error');
    if (type === 'ok') box.classList.add('feedback-ok');
    if (type === 'warning') box.classList.add('feedback-warning');
}

function setInventoryMovementsFeedback(message, type = 'info') {
    const box = document.getElementById('inventory-mov-feedback');
    if (!box) return;
    box.textContent = String(message || '');
    box.classList.remove('feedback-error', 'feedback-ok', 'feedback-warning');
    if (type === 'error') box.classList.add('feedback-error');
    if (type === 'ok') box.classList.add('feedback-ok');
    if (type === 'warning') box.classList.add('feedback-warning');
}

function setInventoryPanelsVisibility(visible) {
    const panels = document.getElementById('inventory-edit-panels');
    const actions = document.getElementById('inventory-footer-actions');
    if (panels) panels.classList.toggle('hidden', !visible);
    if (actions) actions.classList.toggle('hidden', !visible);
}

function setInventoryAdjustPanelsVisibility(visible) {
    const panels = document.getElementById('inventory-adjust-panels');
    const actions = document.getElementById('inventory-adjust-footer-actions');
    if (panels) panels.classList.toggle('hidden', !visible);
    if (actions) actions.classList.toggle('hidden', !visible);
}

function setInventoryScanInputLocked(inputId, locked, options = {}) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const shouldLock = Boolean(locked);
    input.disabled = shouldLock;
    if (!shouldLock && options.clear) {
        input.value = '';
    }
    if (!shouldLock && options.focus) {
        setTimeout(() => {
            try {
                input.focus();
                if (options.select) input.select();
            } catch (_) {
            }
        }, 0);
    }
}

function setInventoryNewScanInputLocked(locked, options = {}) {
    setInventoryScanInputLocked('inventory-code-input', locked, options);
}

function setInventoryAdjustScanInputLocked(locked, options = {}) {
    setInventoryScanInputLocked('inventory-adjust-code-input', locked, options);
}

function clearInventoryProductDetails() {
    selectedInventoryProduct = null;
    const map = {
        'inventory-product-cost': '',
        'inventory-product-profit': '',
        'inventory-product-sale': '',
        'inventory-stock-current': '',
        'inventory-stock-min': '',
        'inventory-stock-max': '',
        'inventory-restock-qty': '',
    };
    Object.entries(map).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    });
    const btn = document.getElementById('inventory-save-btn');
    if (btn) btn.disabled = true;
    setInventoryPanelsVisibility(false);
}

function clearInventoryAdjustProductDetails() {
    selectedInventoryAdjustProduct = null;
    const map = {
        'inventory-adjust-stock-current': '',
        'inventory-adjust-qty': '',
        'inventory-adjust-new-stock': '',
        'inventory-adjust-note': '',
        'inventory-adjust-cost': '',
        'inventory-adjust-profit': '',
        'inventory-adjust-sale': '',
    };
    Object.entries(map).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    });
    const btn = document.getElementById('inventory-adjust-save-btn');
    if (btn) btn.disabled = true;
    setInventoryAdjustPanelsVisibility(false);
}

function fillInventoryAdjustProductDetails(product) {
    const data = product || {};
    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = String(value ?? '');
    };
    setValue('inventory-adjust-stock-current', Number(data.cantidad_actual || 0).toFixed(0));
    setValue('inventory-adjust-cost', Number(data.costo || 0).toFixed(0));
    setValue('inventory-adjust-profit', Number(data.ganancia || 0).toFixed(2));
    setValue('inventory-adjust-sale', Number(data.precio_venta || 0).toFixed(0));
    setValue('inventory-adjust-note', '');
    // Permite calcular en ambos sentidos: ajuste -> nueva existencia y nueva existencia -> ajuste.
    const qtyInput = document.getElementById('inventory-adjust-qty');
    const newStockInput = document.getElementById('inventory-adjust-new-stock');
    if (qtyInput) {
        qtyInput.oninput = updateInventoryAdjustNewStock;
    }
    if (newStockInput) {
        newStockInput.oninput = updateInventoryAdjustQtyFromNewStock;
    }
    updateInventoryAdjustNewStock(); // inicial
}

function updateInventoryAdjustNewStock() {
    const current = Number(document.getElementById('inventory-adjust-stock-current')?.value || 0);
    const adjust = Number(document.getElementById('inventory-adjust-qty')?.value || 0);
    const newStock = current + adjust;
    const newStockEl = document.getElementById('inventory-adjust-new-stock');
    if (newStockEl) {
        newStockEl.value = Number.isFinite(newStock) ? newStock.toFixed(0) : '';
    }
}

function updateInventoryAdjustQtyFromNewStock() {
    const current = Number(document.getElementById('inventory-adjust-stock-current')?.value || 0);
    const newStockInput = document.getElementById('inventory-adjust-new-stock');
    const qtyInput = document.getElementById('inventory-adjust-qty');
    if (!newStockInput || !qtyInput) return;

    const rawTarget = String(newStockInput.value ?? '').replace(',', '.').trim();
    if (!rawTarget) {
        qtyInput.value = '';
        return;
    }

    const target = Number(rawTarget);
    if (!Number.isFinite(target)) {
        qtyInput.value = '';
        return;
    }

    const adjust = target - current;
    qtyInput.value = Number.isFinite(adjust) ? adjust.toFixed(0) : '';
}

function fillInventoryProductDetails(product) {
    const data = product || {};
    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = String(value ?? '');
    };
    setValue('inventory-product-cost', Number(data.costo || 0).toFixed(0));
    setValue('inventory-product-profit', Number(data.ganancia || 0).toFixed(2));
    setValue('inventory-product-sale', Number(data.precio_venta || 0).toFixed(0));
    setValue('inventory-stock-current', Number(data.cantidad_actual || 0).toFixed(0));
    setValue('inventory-stock-min', Number(data.cantidad_minima || 0).toFixed(0));
    setValue('inventory-stock-max', Number(data.cantidad_maxima || 0).toFixed(0));
}

function clearInventoryView() {
    const codeInput = document.getElementById('inventory-code-input');
    if (codeInput) codeInput.value = '';
    setInventoryNewScanInputLocked(false);
    clearInventoryProductDetails();
    setInventoryFeedback('Escanea un producto para consultar inventario.', 'info');
}

function clearInventoryAdjustView() {
    const codeInput = document.getElementById('inventory-adjust-code-input');
    if (codeInput) codeInput.value = '';
    setInventoryAdjustScanInputLocked(false);
    clearInventoryAdjustProductDetails();
    setInventoryAdjustFeedback('Escanea un producto para ajustar inventario.', 'info');
}

function cancelInventoryEdition() {
    clearInventoryView();
    setInventoryNewScanInputLocked(false, { focus: true });
}

function cancelInventoryAdjustEdition() {
    clearInventoryAdjustView();
    setInventoryAdjustScanInputLocked(false, { focus: true });
}

function formatInventoryQtyValue(value) {
    const qty = Number(value || 0);
    if (!Number.isFinite(qty)) return '0';
    return qty.toFixed(3).replace(/\.?0+$/, '');
}

function formatInventoryQtyDelta(value) {
    const qty = Number(value || 0);
    if (!Number.isFinite(qty) || Math.abs(qty) < 0.000001) return '0';
    const sign = qty > 0 ? '+' : '-';
    return `${sign}${formatInventoryQtyValue(Math.abs(qty))}`;
}

function normalizeInventoryMovementTypeLabel(value) {
    const type = String(value || '').trim().toLowerCase();
    if (type === 'venta') return 'Salida por venta';
    if (type === 'modificacion') return 'Ingreso (modificacion)';
    if (type === 'ajuste') return 'Ajuste';
    if (type === 'top_sold') return 'Producto mas vendido';
    if (!type) return 'Ajuste';
    return type.charAt(0).toUpperCase() + type.slice(1);
}

function fillInventoryMovementsTable(rows) {
    const body = document.getElementById('inventory-movements-body');
    if (!body) return;
    body.innerHTML = '';
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 10;
        td.style.textAlign = 'center';
        td.textContent = 'Sin movimientos para mostrar.';
        tr.appendChild(td);
        body.appendChild(tr);
        return;
    }

    list.forEach((row) => {
        const moveType = String(row.tipo_movimiento || '').trim().toLowerCase();
        const isTopSold = moveType === 'top_sold';
        const previousQty = Number(row.cantidad_anterior);
        const deltaQty = isTopSold
            ? (Number(row.cantidad_vendida || 0) * -1)
            : Number(row.cambio_cantidad);
        const newQty = Number(row.cantidad_nueva);
        const note = isTopSold
            ? `Cantidad vendida: ${formatInventoryQtyValue(row.cantidad_vendida)} | Total: $${formatMoney(row.total_vendido || 0)}`
            : String(row.especificacion || '-');
        const previousQtyText = Number.isFinite(previousQty) && !isTopSold ? formatInventoryQtyValue(previousQty) : '-';
        const deltaQtyText = Number.isFinite(deltaQty) ? formatInventoryQtyDelta(deltaQty) : '-';
        const newQtyText = Number.isFinite(newQty) && !isTopSold ? formatInventoryQtyValue(newQty) : '-';
        const tr = document.createElement('tr');
        const cells = [
            isTopSold ? '-' : String(row.fecha || ''),
            row.caja_id ? `Caja ${row.caja_id}` : '-',
            String(row.codigo_barras || ''),
            String(row.producto_descripcion || ''),
            normalizeInventoryMovementTypeLabel(moveType),
            previousQtyText,
            deltaQtyText,
            newQtyText,
            note,
            isTopSold ? '-' : String(row.usuario_nombre || '-'),
        ];
        cells.forEach((value) => {
            const td = document.createElement('td');
            td.textContent = value;
            tr.appendChild(td);
        });
        body.appendChild(tr);
    });
}

async function loadInventoryMovementBoxes() {
    const select = document.getElementById('inventory-mov-caja');
    if (!select) return;
    const previous = String(select.value || 'all');

    try {
        const response = await fetch(API_URL + 'api/getCajas', {
            headers: withAuthHeaders(),
        });
        const payload = await response.json().catch(() => []);
        const rows = Array.isArray(payload) ? payload : [];

        select.innerHTML = '';
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'Todas';
        select.appendChild(allOption);

        rows.forEach((row) => {
            const caja = Number(row.n_caja || 0);
            const cajaActiva = Number(row.estado ?? 0) === 1;
            const sucursalActiva = Number(row.sucursal_activa ?? 1) === 1;
            if (!Number.isFinite(caja) || caja <= 0 || !cajaActiva || !sucursalActiva) return;
            const option = document.createElement('option');
            option.value = String(caja);
            option.textContent = `Caja ${caja}`;
            select.appendChild(option);
        });

        if (select.querySelector(`option[value="${previous}"]`)) {
            select.value = previous;
        } else {
            select.value = 'all';
        }
    } catch (_) {
        if (!select.querySelector('option[value="all"]')) {
            select.innerHTML = '<option value="all">Todas</option>';
        }
        select.value = 'all';
    }
}

function clearInventoryMovementsView() {
    const fromInput = document.getElementById('inventory-mov-from');
    const toInput = document.getElementById('inventory-mov-to');
    const today = new Date().toISOString().slice(0, 10);
    if (fromInput) fromInput.value = today;
    if (toInput) toInput.value = today;
    const cajaSelect = document.getElementById('inventory-mov-caja');
    if (cajaSelect) cajaSelect.value = 'all';
    const typeSelect = document.getElementById('inventory-mov-type');
    if (typeSelect) typeSelect.value = 'all';
    fillInventoryMovementsTable([]);
    setInventoryMovementsFeedback('Selecciona filtros y consulta movimientos.', 'info');
}

async function loadInventoryMovements() {
    const from = String(document.getElementById('inventory-mov-from')?.value || '').trim();
    const to = String(document.getElementById('inventory-mov-to')?.value || '').trim();
    const caja = String(document.getElementById('inventory-mov-caja')?.value || 'all').trim() || 'all';
    const movementType = String(document.getElementById('inventory-mov-type')?.value || 'all').trim() || 'all';

    if (!from || !to) {
        setInventoryMovementsFeedback('Debes seleccionar fecha desde y hasta.', 'warning');
        return;
    }
    if (from > to) {
        setInventoryMovementsFeedback('La fecha desde no puede ser mayor que la fecha hasta.', 'warning');
        return;
    }

    try {
        const params = new URLSearchParams({ from, to, caja, movement_type: movementType });
        const response = await fetch(API_URL + `api/inventory/movements?${params.toString()}`, {
            headers: withAuthHeaders(),
        });
        const data = await response.json().catch(() => []);
        if (!response.ok) {
            setInventoryMovementsFeedback(data.message || data.error || 'No se pudieron cargar movimientos.', 'error');
            fillInventoryMovementsTable([]);
            return;
        }
        fillInventoryMovementsTable(data);
        const count = Array.isArray(data) ? data.length : 0;
        const suffix = movementType === 'top_sold' ? 'producto(s) encontrado(s).' : 'movimiento(s) encontrado(s).';
        setInventoryMovementsFeedback(`${count} ${suffix}`, 'ok');
    } catch (error) {
        console.error('Error loadInventoryMovements:', error);
        setInventoryMovementsFeedback('No se pudieron cargar movimientos.', 'error');
        fillInventoryMovementsTable([]);
    }
}

function fillInventorySearchDatalist(rows) {
    const list = document.getElementById('inventory-search-options');
    if (!list) return;
    list.innerHTML = '';
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        const code = normalizeText(row.codigo_barras || '');
        const desc = normalizeText(row.descripcion || '');
        if (!code && !desc) return;
        const option = document.createElement('option');
        option.value = code || desc;
        option.label = code && desc ? `${code} - ${desc}` : (desc || code);
        list.appendChild(option);
    });
}

function fillInventoryAdjustSearchDatalist(rows) {
    const list = document.getElementById('inventory-adjust-search-options');
    if (!list) return;
    list.innerHTML = '';
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        const code = normalizeText(row.codigo_barras || '');
        const desc = normalizeText(row.descripcion || '');
        if (!code && !desc) return;
        const option = document.createElement('option');
        option.value = code || desc;
        option.label = code && desc ? `${code} - ${desc}` : (desc || code);
        list.appendChild(option);
    });
}

async function inventorySearchSuggest(value) {
    const query = normalizeText(value);
    if (query.length < 2) {
        fillInventorySearchDatalist([]);
        return;
    }
    const rows = await searchProductsForInput(query);
    fillInventorySearchDatalist(rows);
}

async function inventoryAdjustSearchSuggest(value) {
    const query = normalizeText(value);
    if (query.length < 2) {
        fillInventoryAdjustSearchDatalist([]);
        return;
    }
    const rows = await searchProductsForInput(query);
    fillInventoryAdjustSearchDatalist(rows);
}

async function findInventoryProductByInput(inputValue) {
    const query = normalizeText(inputValue);
    if (!query) return null;

    const codeLookupResponse = await fetch(API_URL + `api/productos/code/${encodeURIComponent(query)}`, {
        headers: withAuthHeaders(),
    });
    const codeLookup = await codeLookupResponse.json().catch(() => ({}));
    if (codeLookupResponse.ok && codeLookup?.found && codeLookup?.product) {
        return codeLookup.product;
    }

    const matches = await searchProductsForInput(query);
    if (!matches.length) return null;
    const exact = matches.find((row) => normalizeText(row.descripcion).toLowerCase() === query.toLowerCase());
    return exact || matches[0];
}

async function loadInventoryProductByCode() {
    const codeInput = document.getElementById('inventory-code-input');
    const rawValue = String(codeInput?.value || '').trim();
    const normalizedValue = normalizeBarcodeByScannerSettings(rawValue) || normalizeText(rawValue);
    if (!normalizedValue) {
        setInventoryFeedback('Ingresa, escanea o busca un producto para consultar.', 'warning');
        return;
    }
    if (codeInput) codeInput.value = normalizedValue;

    try {
        const product = await findInventoryProductByInput(normalizedValue);
        if (!product) {
            clearInventoryProductDetails();
            setInventoryFeedback('Producto no encontrado.', 'error');
            return;
        }

        const useInventory = Number(product.utiliza_inventario || 0) === 1;
        if (!useInventory) {
            clearInventoryProductDetails();
            setInventoryFeedback(`El producto "${normalizeText(product.descripcion || 'Sin nombre')}" no tiene habilitada la opcion de inventario.`, 'warning');
            if (codeInput) {
                codeInput.value = '';
                setTimeout(() => {
                    try {
                        codeInput.focus();
                        codeInput.select();
                    } catch (_) {
                    }
                }, 0);
            }
            return;
        }

        fillInventoryProductDetails(product);
        setInventoryPanelsVisibility(true);
        const saveBtn = document.getElementById('inventory-save-btn');
        if (saveBtn) saveBtn.disabled = false;
        selectedInventoryProduct = product;
        setInventoryNewScanInputLocked(true);
        setInventoryFeedback(`Producto cargado: ${normalizeText(product.descripcion || '')}.`, 'ok');
    } catch (error) {
        console.error('Error loadInventoryProductByCode:', error);
        clearInventoryProductDetails();
        setInventoryFeedback('No se pudo consultar el producto.', 'error');
    }
}

async function loadInventoryAdjustProductByCode() {
    const codeInput = document.getElementById('inventory-adjust-code-input');
    const rawValue = String(codeInput?.value || '').trim();
    const normalizedValue = normalizeBarcodeByScannerSettings(rawValue) || normalizeText(rawValue);
    if (!normalizedValue) {
        setInventoryAdjustFeedback('Ingresa, escanea o busca un producto para ajustar.', 'warning');
        return;
    }
    if (codeInput) codeInput.value = normalizedValue;

    try {
        const product = await findInventoryProductByInput(normalizedValue);
        if (!product) {
            clearInventoryAdjustProductDetails();
            setInventoryAdjustFeedback('Producto no encontrado.', 'error');
            return;
        }

        const useInventory = Number(product.utiliza_inventario || 0) === 1;
        if (!useInventory) {
            clearInventoryAdjustProductDetails();
            setInventoryAdjustFeedback(`El producto "${normalizeText(product.descripcion || 'Sin nombre')}" no tiene habilitada la opcion de inventario.`, 'warning');
            if (codeInput) {
                codeInput.value = '';
                setTimeout(() => {
                    try {
                        codeInput.focus();
                        codeInput.select();
                    } catch (_) {
                    }
                }, 0);
            }
            return;
        }

        fillInventoryAdjustProductDetails(product);
        setInventoryAdjustPanelsVisibility(true);
        const saveBtn = document.getElementById('inventory-adjust-save-btn');
        if (saveBtn) saveBtn.disabled = false;
        selectedInventoryAdjustProduct = product;
        setInventoryAdjustScanInputLocked(true);
        setInventoryAdjustFeedback(`Producto cargado: ${normalizeText(product.descripcion || '')}.`, 'ok');
    } catch (error) {
        console.error('Error loadInventoryAdjustProductByCode:', error);
        clearInventoryAdjustProductDetails();
        setInventoryAdjustFeedback('No se pudo consultar el producto.', 'error');
    }
}

async function saveInventoryChanges() {
    if (!selectedInventoryProduct) {
        setInventoryFeedback('Primero carga un producto con inventario habilitado.', 'warning');
        return;
    }
    const stockCurrent = Number(String(document.getElementById('inventory-stock-current')?.value || '0').replace(',', '.'));
    const restockQty = Number(String(document.getElementById('inventory-restock-qty')?.value || '0').replace(',', '.'));
    const movementNote = 'Ingreso de mercaderia';
    const cajaId = toPositiveIntOrNull(getActiveCajaCajero()?.caja);
    if (!Number.isFinite(stockCurrent) || stockCurrent < 0) {
        setInventoryFeedback('Existencia actual invalida.', 'error');
        return;
    }
    if (!Number.isFinite(restockQty) || restockQty < 0) {
        setInventoryFeedback('La cantidad de reposicion no puede ser negativa.', 'warning');
        return;
    }

    const cost = toIntOrNull(document.getElementById('inventory-product-cost')?.value);
    const profit = toDecimalOrNull(document.getElementById('inventory-product-profit')?.value, 2);
    const salePrice = toIntOrNull(document.getElementById('inventory-product-sale')?.value);
    const minStock = toIntOrNull(document.getElementById('inventory-stock-min')?.value);
    const maxStock = toIntOrNull(document.getElementById('inventory-stock-max')?.value);

    if (cost === null || profit === null || salePrice === null || minStock === null || maxStock === null) {
        setInventoryFeedback('Completa correctamente los datos numericos del producto e inventario.', 'warning');
        return;
    }
    if (minStock < 0 || maxStock < 0) {
        setInventoryFeedback('Stock minimo y maximo no pueden ser negativos.', 'warning');
        return;
    }
    if (maxStock > 0 && minStock > maxStock) {
        setInventoryFeedback('Stock minimo no puede ser mayor al stock maximo.', 'warning');
        return;
    }

    const code = normalizeText(selectedInventoryProduct.codigo_barras || '');
    if (!code) {
        setInventoryFeedback('Codigo de producto invalido para actualizar inventario.', 'error');
        return;
    }

    const newQty = stockCurrent + restockQty;
    const payload = {
        descripcion: normalizeText(selectedInventoryProduct.descripcion || ''),
        formato_venta: normalizeText(selectedInventoryProduct.formato_venta || 'unidad'),
        precio_venta: salePrice,
        costo: cost,
        ganancia: profit,
        cantidad_actual: newQty,
        cantidad_minima: minStock,
        cantidad_maxima: maxStock,
        utiliza_inventario: 1,
        departamento: normalizeText(selectedInventoryProduct.departamento || ''),
        supplier_id: toPositiveIntOrNull(selectedInventoryProduct.supplier_id),
    };

    try {
        const response = await fetch(API_URL + `api/productos/${encodeURIComponent(code)}/inventory`, {
            method: 'PUT',
            headers: withAuthHeaders({
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify({
                cantidad_actual: newQty,
                cantidad_minima: minStock,
                cantidad_maxima: maxStock,
                utiliza_inventario: 1,

                // opcionales (para mantener consistencia con la pantalla de inventario)
                costo: cost,
                ganancia: profit,
                precio_venta: salePrice,
                movement_type: 'modificacion',
                especificacion: movementNote,
                caja_id: cajaId,
            }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            setInventoryFeedback(data.error || data.message || 'No se pudo aplicar la reposicion.', 'error');
            return;
        }

        clearInventoryProductDetails();
        setInventoryNewScanInputLocked(false, { clear: true, focus: true });
        setInventoryFeedback(`Cambios guardados. Nuevo stock: ${Number(newQty).toFixed(0)}.`, 'ok');
    } catch (error) {
        console.error('Error saveInventoryChanges:', error);
        setInventoryFeedback('Error de conexion al actualizar inventario.', 'error');
    }
}

async function saveInventoryAdjustChanges() {
    if (!selectedInventoryAdjustProduct) {
        setInventoryAdjustFeedback('Primero carga un producto con inventario habilitado.', 'warning');
        return;
    }
    const stockCurrent = Number(String(document.getElementById('inventory-adjust-stock-current')?.value || '0').replace(',', '.'));
    const adjustQty = Number(String(document.getElementById('inventory-adjust-qty')?.value || '0').replace(',', '.'));
    const cost = toIntOrNull(document.getElementById('inventory-adjust-cost')?.value);
    const profit = toDecimalOrNull(document.getElementById('inventory-adjust-profit')?.value, 2);
    const salePrice = toIntOrNull(document.getElementById('inventory-adjust-sale')?.value);
    const movementNote = normalizeText(document.getElementById('inventory-adjust-note')?.value || '');
    const cajaId = toPositiveIntOrNull(getActiveCajaCajero()?.caja);
    if (!Number.isFinite(stockCurrent) || stockCurrent < 0) {
        setInventoryAdjustFeedback('Existencia actual invalida.', 'error');
        return;
    }
    if (!Number.isFinite(adjustQty)) {
        setInventoryAdjustFeedback('La cantidad de ajuste debe ser un numero valido.', 'warning');
        return;
    }
    if (cost === null || profit === null || salePrice === null) {
        setInventoryAdjustFeedback('Completa correctamente costo, ganancia y precio de venta.', 'warning');
        return;
    }

    const code = normalizeText(selectedInventoryAdjustProduct.codigo_barras || '');
    if (!code) {
        setInventoryAdjustFeedback('Codigo de producto invalido para ajustar inventario.', 'error');
        return;
    }

    const newQty = stockCurrent + adjustQty;
    if (newQty < 0) {
        setInventoryAdjustFeedback('La nueva existencia no puede ser negativa.', 'warning');
        return;
    }

    try {
        const response = await fetch(API_URL + `api/productos/${encodeURIComponent(code)}/inventory`, {
            method: 'PUT',
            headers: withAuthHeaders({
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify({
                cantidad_actual: newQty,
                costo: cost,
                ganancia: profit,
                precio_venta: salePrice,
                movement_type: 'ajuste',
                especificacion: movementNote || null,
                caja_id: cajaId,
            }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            setInventoryAdjustFeedback(data.error || data.message || 'No se pudo aplicar el ajuste.', 'error');
            return;
        }

        clearInventoryAdjustProductDetails();
        setInventoryAdjustScanInputLocked(false, { clear: true, focus: true });
        setInventoryAdjustFeedback(`Ajuste guardado. Nuevo stock: ${Number(newQty).toFixed(0)}.`, 'ok');
    } catch (error) {
        console.error('Error saveInventoryAdjustChanges:', error);
        setInventoryAdjustFeedback('Error de conexion al ajustar inventario.', 'error');
    }
}

function prepareInventoryView() {
    // Ocultar contenidos y mostrar botones
    document.getElementById('inventory-nuevo-content').classList.add('hidden');
    document.getElementById('inventory-ajustar-content').classList.add('hidden');
    document.getElementById('inventory-movimientos-content')?.classList.add('hidden');
    // Mostrar botones
    const nuevoBtn = document.getElementById('inventory-nuevo-btn');
    const ajustarBtn = document.getElementById('inventory-ajustar-btn');
    const movimientosBtn = document.getElementById('inventory-movimientos-btn');
    if (nuevoBtn) nuevoBtn.style.display = 'inline-block';
    if (ajustarBtn) ajustarBtn.style.display = 'inline-block';
    if (movimientosBtn) movimientosBtn.style.display = 'inline-block';
}

function showInventoryNuevo() {
    document.getElementById('inventory-nuevo-content').classList.remove('hidden');
    document.getElementById('inventory-ajustar-content').classList.add('hidden');
    document.getElementById('inventory-movimientos-content')?.classList.add('hidden');
    setInventoryNewScanInputLocked(false);
    // Preparar vista
    const codeInput = document.getElementById('inventory-code-input');
    if (codeInput && scannerRuntimeSettings.scanner_auto_focus) {
        setTimeout(() => codeInput.focus(), 0);
    }
    setInventoryFeedback('Escanea un producto para agregar mercancía.', 'info');
}

function showInventoryAjustar() {
    document.getElementById('inventory-ajustar-content').classList.remove('hidden');
    document.getElementById('inventory-nuevo-content').classList.add('hidden');
    document.getElementById('inventory-movimientos-content')?.classList.add('hidden');
    setInventoryAdjustScanInputLocked(false);
    // Preparar vista
    const codeInput = document.getElementById('inventory-adjust-code-input');
    if (codeInput && scannerRuntimeSettings.scanner_auto_focus) {
        setTimeout(() => codeInput.focus(), 0);
    }
    setInventoryAdjustFeedback('Escanea un producto para ajustar inventario.', 'info');
}

async function showInventoryMovimientos() {
    document.getElementById('inventory-movimientos-content')?.classList.remove('hidden');
    document.getElementById('inventory-nuevo-content').classList.add('hidden');
    document.getElementById('inventory-ajustar-content').classList.add('hidden');

    await loadInventoryMovementBoxes();

    const fromInput = document.getElementById('inventory-mov-from');
    const toInput = document.getElementById('inventory-mov-to');
    const typeSelect = document.getElementById('inventory-mov-type');
    const today = new Date().toISOString().slice(0, 10);
    if (fromInput && !fromInput.value) fromInput.value = today;
    if (toInput && !toInput.value) toInput.value = today;
    if (typeSelect && !typeSelect.value) typeSelect.value = 'all';

    await loadInventoryMovements();
}

async function loadProductSupplierOptions() {
    const select = document.getElementById('product-supplier');
    if (!select) return;
    const previous = String(select.value || '');
    try {
        const response = await fetch(API_URL + 'api/service-suppliers', {
            headers: withAuthHeaders(),
        });
        const rows = await response.json().catch(() => []);
        if (!response.ok || !Array.isArray(rows)) {
            throw new Error('No se pudo cargar proveedores');
        }
        const options = ['<option value=\"\">Sin proveedor</option>'];
        rows.forEach((row) => {
            const id = Number(row.id || 0);
            const name = String(row.name || '').trim();
            if (!id || !name) return;
            options.push(`<option value=\"${id}\">${name}</option>`);
        });
        select.innerHTML = options.join('');
        if (previous && select.querySelector(`option[value=\"${previous}\"]`)) {
            select.value = previous;
        }
    } catch (_) {
        select.innerHTML = '<option value=\"\">Sin proveedor</option>';
    }
}

// FunciÃ³n para modificar un producto
async function modifyProduct() {
    const code = prompt("Enter the product barcode to modify:");
    const name = prompt("Enter new name:");
    const price = parseFloat(prompt("Enter new price:"));
    const quantity = parseInt(prompt("Enter new quantity:"));

    if (code && name && !isNaN(price) && !isNaN(quantity)) {
        try {
            const response = await fetch(API_URL+`api/productos/${code}`, {
                method: 'PUT',
                headers: {
                    ...withAuthHeaders({
                        'Content-Type': 'application/json'
                    }),
                },
                body: JSON.stringify({ name, price, quantity })
            });
            const result = await response.json();
            alert(result.message);
            getProducts();
        } catch (error) {
            console.error('Error modifying product:', error);
        }
    }
}

// FunciÃ³n para buscar productos
async function searchProduct() {
    const searchQuery = document.getElementById('search-product').value;
    if (searchQuery) {
        try {
            const response = await fetch(API_URL+`api/productos/search?query=${searchQuery}`, {
                headers: withAuthHeaders(),
            });
            const products = await response.json();
            updateInventoryList(products);
        } catch (error) {
            console.error('Error searching for product:', error);
        }
    } else {
        getProducts();
    }
}

/* Llamar a getProducts cuando la secciÃ³n de inventario se muestra
document.getElementById('inventory').addEventListener('show', () => {
    getProducts();
});*/

// Fetch product by code
async function searchByCode() {
    const code = document.getElementById('product-code').value;
    if (!code) {
        alert("Please enter the product code.");
        return;
    }

    const response = await fetch(API_URL+`api/productos/code/${code}`, {
        headers: withAuthHeaders(),
    });
    const payload = await response.json().catch(() => ({}));

    if (response.ok) {
        if (!payload?.found || !payload?.product) {
            alert(payload?.error || 'Producto no encontrado.');
            return;
        }
        const product = payload.product;
        alert(`Producto encontrado: ${product.descripcion}, Precio: ${product.precio_venta}, Cantidad: ${product.cantidad_actual}`);
    } else {
        alert(`Error: ${payload.error || payload.message || 'No se pudo consultar el producto'}`);
    }
}

// Fetch product by name
async function searchByName() {
    const name = document.getElementById('product-name').value;
    if (!name) {
        alert("Please enter the product name.");
        return;
    }

    const response = await fetch(API_URL+`api/productos/name/${name}`, {
        headers: withAuthHeaders(),
    });
    const product = await response.json();

    if (response.ok) {
            const normalizedProduct = {
                ...product,
                precio_venta: Number(product.precio_venta || 0),
            };
        alert(`Product found: ${product.name}, Price: ${product.price}, Quantity: ${product.quantity}`);
    } else {
        alert(`Error: ${product.error}`);
    }
}

// Add new product
async function addProduct() {
    const productCode = document.getElementById('product-code').value;
    const productName = document.getElementById('product-name').value;
    const formatoVenta = document.querySelector('input[name="formato_venta"]:checked').value;
    const costo = parseInt(document.getElementById('product-costo').value);
    const ganancia = parseInt(document.getElementById('product-ganancia').value) || 0;
    const precioVenta = parseInt(document.getElementById('product-price').value);
    const utilizaInventario = document.querySelector('input[name="utiliza_inv"]')?.checked || false;
    const cantidadActual = parseInt(document.getElementById('product-quantity').value) || 0;
    const cantidadMinima = parseInt(document.getElementById('product-quantity-min').value) || 0;
    const cantidadMaxima = parseInt(document.getElementById('product-quantity-max').value) || 0;
    const departamento = document.querySelector('select[name="dep"]').value;
    const supplierIdRaw = parseInt(document.getElementById('product-supplier')?.value || '', 10);
    const supplierId = Number.isInteger(supplierIdRaw) && supplierIdRaw > 0 ? supplierIdRaw : null;

    const productData = {
        codigo_barras: productCode,
        descripcion: productName,
        formato_venta: formatoVenta,
        costo,
        ganancia,
        precio_venta: precioVenta,
        utiliza_inventario: utilizaInventario,
        cantidad_actual: cantidadActual,
        cantidad_minima: cantidadMinima,
        cantidad_maxima: cantidadMaxima,
        departamento,
        supplier_id: supplierId,
    };

    try {
        const response = await fetch(API_URL+'api/productos', {
            method: 'POST',
            headers: {
                ...withAuthHeaders({
                    'Content-Type': 'application/json',
                }),
            },
            body: JSON.stringify(productData),
        });

        const result = await response.json();

        if (response.ok) {
            const normalizedProduct = {
                ...product,
                precio_venta: Number(product.precio_venta || 0),
            };
            alert('Producto añadido exitosamente');
            claerAddProd();
            hideAllSections();
        } else {
            alert(`Error al añadir el producto: ${result.message}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al conectar con el servidor');
    }
}

function claerAddProd(){
    document.getElementById('product-code').value = "";
    document.getElementById('product-name').value = "";
    document.getElementById('radio-unidad').checked = true;
    parseInt(document.getElementById('product-costo').value = null);
    parseInt(document.getElementById('product-ganancia').value = null);
    parseInt(document.getElementById('product-price').value = null);
    //document.getElementById('checkbox-inventario').checked = false;
    parseInt(document.getElementById('product-quantity').value = null);
    parseInt(document.getElementById('product-quantity-min').value = null);
    parseInt(document.getElementById('product-quantity-max').value = null);
    document.querySelector('select[name="dep"]').value = "verduleria";
    const supplierSelect = document.getElementById('product-supplier');
    if (supplierSelect) supplierSelect.value = "";
}

// Update existing product
async function updateProduct() {
    const code = document.getElementById('product-code').value;
    const name = document.getElementById('product-name').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const quantity = parseInt(document.getElementById('product-quantity').value);

    if (!code || !name || isNaN(price) || isNaN(quantity)) {
        alert("Please fill in all fields correctly.");
        return;
    }

    const response = await fetch(API_URL+`api/productos/${code}`, {
        method: "PUT",
        headers: {
            ...withAuthHeaders({
                "Content-Type": "application/json",
            }),
        },
        body: JSON.stringify({ name, price, quantity }),
    });

    if (response.ok) {
            const normalizedProduct = {
                ...product,
                precio_venta: Number(product.precio_venta || 0),
            };
        alert("Product updated successfully!");
        getProducts();
    } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
    }
}

//update user 
async function updateUser() {
    const id = localStorage.getItem("id_user");
    const estado_usuario =  localStorage.getItem("estado_login")

    if (!id || !estado_usuario ) {
        alert("Please fill in all fields correctly.");
        return;
    }
    const response = await fetch(API_URL+`api/updateUser`, {
        method: "PUT",
        headers: {
            ...withAuthHeaders({
                "Content-Type": "application/json",
            }),
        },
        body: JSON.stringify({ id, estado_usuario }),
    });
    if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.error}`);
    }

}

// Delete product by code
async function deleteProduct() {
    const code = document.getElementById('product-code-delete').value;
    if (!code) {
        alert("Please enter the product code.");
        return;
    }

    const response = await fetch(API_URL+`api/productos/${code}`, {
        method: "DELETE",
        headers: withAuthHeaders(),
    });

    if (response.ok) {
            const normalizedProduct = {
                ...product,
                precio_venta: Number(product.precio_venta || 0),
            };
        alert("Product deleted successfully!");
        getProducts();
    } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
    }
}

// -------------agrega sesiones de usuarios conectado al backend
async function addConnectedUser() {
    const numero_caja = localStorage.getItem('n_caja');
    const user_id = localStorage.getItem('id_user');

    const connectedData = { numero_caja: numero_caja, user_id: user_id}
    try{
        const response = await fetch(API_URL+'api/connect', {
            method: 'POST',
            headers: {
                ...withAuthHeaders({
                    'Content-Type': 'application/json',
                }),
            },
            body: JSON.stringify(connectedData)
        });
    } catch (error) {
    console.error("Error al crear la sesion: ", error);
    }
}

// ------------agrega logout de usuarios desconectado al backend
async function deleteConnectedUser() {
  
    const numero_caja = localStorage.getItem('n_caja');
    const user_id = localStorage.getItem('id_user');

    const connectedData = { numero_caja: numero_caja, user_id: user_id}
    /*console.log("data enviada a server.js");
    console.log(connectedData);*/
     try{
        const response = await fetch(API_URL+'api/disconnect', {
            method: 'POST',
            headers: {
                ...withAuthHeaders({
                    'Content-Type': 'application/json',
                }),
            },
            body: JSON.stringify(connectedData)
        });
    } catch (error) {
    console.error("Error al crear la sesion: ", error);
    }
}

// -------------agrega sesiones de usuarios conectado al backend
async function addCajaConnected() {
    const numero_caja = localStorage.getItem('n_caja');
    const nombre_caja = localStorage.getItem('nombre_caja');
    const fingerprint = String(localStorage.getItem('device_fp') || '').trim();

    const connectedData = {
        numero_caja: numero_caja,
        nombre_caja: nombre_caja,
        estado: 1,
        fingerprint: fingerprint || null,
    };
    //console.log(connectedData);
    try{
        const response = await fetch(API_URL+'api/addCaja', {
            method: 'POST',
            headers: {
                ...withAuthHeaders({
                    'Content-Type': 'application/json',
                }),
            },
            body: JSON.stringify(connectedData)
        });
    }catch (error){
    console.error("Error al crear la sesion: ", error);
    }
}

// -------------agrega la info(configuracion) del sistema al backend
async function addInfo() {

    const inventario        = parseStoredBoolean('inventario');
    const credito           = parseStoredBoolean('credito');
    const producto_comun    = parseStoredBoolean('producto_comun');
    const margen_ganancia   = parseStoredBoolean('margen_ganancia');
    const monto_ganancia    = localStorage.getItem('monto_ganancia');
    const redondeo          = parseStoredBoolean('redondeo');
    const monto_redondeo    = localStorage.getItem('monto_redondeo');
    const mensaje           = parseStoredBoolean('mensaje');
    const data_mensaje      = localStorage.getItem('data_mensaje');
    const time_mensaje      = localStorage.getItem('time_mensaje');

    const nombre_local      = localStorage.getItem('nombre_local');
    const telefono_local    = localStorage.getItem('telefono_local');
    const mail_local        = localStorage.getItem('mail_local');
    const tipo_local        = localStorage.getItem('tipo_local');

    const connectedData = { 
        nombre_local:       nombre_local, 
        telefono_local:     telefono_local,
        mail_local:         mail_local, 
        tipo_local:         tipo_local,

        inventario:         inventario, 
        credito:            credito, 
        producto_comun:     producto_comun,
        margen_ganancia:    margen_ganancia, 
        monto_ganancia:     monto_ganancia, 
        redondeo:           redondeo,
        monto_redondeo:     monto_redondeo, 
        mensaje:            mensaje, 
        data_mensaje:       data_mensaje,
        time_mensaje:       time_mensaje, 
        
        
    }
    try{
        const response = await fetch(API_URL+'api/addInfo', {
            method: 'POST',
            headers: {
                ...withAuthHeaders({
                    'Content-Type': 'application/json',
                }),
            },
            body: JSON.stringify(connectedData)
        });
    }catch (error){
    console.error("Error al crear la sesion: ", error);
    }
}

//---------------obtener informacion del negocio del backend
async function getInfo() {
    try {
        const response = await fetch(API_URL+'api/getInfo', {
            headers: withAuthHeaders(),
        });
        const info = await response.json();
        return info;
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

//---------------obtener informacion del negocio del backend
async function getCajas() {
    try {
        const response = await fetch(API_URL+'api/getCajas', {
            headers: withAuthHeaders(),
        });
        const cajas = await response.json();
        return cajas;
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

function getTodayIsoDate() {
    return new Date().toISOString().slice(0, 10);
}

async function loadReportFilters() {
    const fromInput = document.getElementById('report-date-from');
    const toInput = document.getElementById('report-date-to');
    const cajaSelect = document.getElementById('report-caja-filter');
    const cajeroSelect = document.getElementById('report-cajero-filter');
    const cashierPeriodSelect = document.getElementById('report-cashier-period');
    const globalPeriodSelect = document.getElementById('report-global-period');

    if (!fromInput || !toInput || !cajaSelect || !cajeroSelect) {
        return;
    }

    const today = getTodayIsoDate();
    if (!fromInput.value) fromInput.value = today;
    if (!toInput.value) toInput.value = today;

    try {
        const cajas = await getCajas();
        cajaSelect.innerHTML = '<option value="">Todas</option>';
        if (Array.isArray(cajas)) {
            cajas.forEach((caja) => {
                const option = document.createElement('option');
                option.value = caja.n_caja;
                option.textContent = `${caja.n_caja} - ${caja.nombre_caja}`;
                cajaSelect.appendChild(option);
            });
        }

        const usersResp = await fetch(API_URL+'api/usuarios', {
            headers: withAuthHeaders(),
        });
        const users = await usersResp.json();
        cajeroSelect.innerHTML = '<option value="">Todos</option>';
        if (usersResp.ok && Array.isArray(users)) {
            users.forEach((u) => {
                const option = document.createElement('option');
                option.value = u.id;
                option.textContent = `${u.nombre} (${u.user})`;
                cajeroSelect.appendChild(option);
            });
        }

        if (cashierPeriodSelect && !cashierPeriodSelect.value) {
            cashierPeriodSelect.value = 'daily';
        }
        if (globalPeriodSelect && !globalPeriodSelect.value) {
            globalPeriodSelect.value = 'monthly';
        }
    } catch (error) {
        console.error('Error loading report filters:', error);
    }
}

function getReportFilterValues() {
    const fromInput = document.getElementById('report-date-from');
    const toInput = document.getElementById('report-date-to');
    const cajaSelect = document.getElementById('report-caja-filter');
    const cajeroSelect = document.getElementById('report-cajero-filter');
    const today = getTodayIsoDate();

    return {
        desde: fromInput?.value || today,
        hasta: toInput?.value || today,
        caja: cajaSelect?.value || '',
        cajero: cajeroSelect?.value || '',
    };
}

function buildReportFilterQuery() {
    const filters = getReportFilterValues();
    const query = new URLSearchParams({
        desde: filters.desde,
        hasta: filters.hasta,
    });
    if (filters.caja) query.set('caja', filters.caja);
    if (filters.cajero) query.set('cajero', filters.cajero);
    return query;
}

function buildReportChartsQuery() {
    const query = buildReportFilterQuery();
    const cashierPeriod = document.getElementById('report-cashier-period')?.value || 'daily';
    const globalPeriod = document.getElementById('report-global-period')?.value || 'monthly';
    query.set('cashier_period', cashierPeriod === 'monthly' ? 'monthly' : 'daily');
    query.set('global_period', globalPeriod === 'annual' ? 'annual' : 'monthly');
    return query;
}

async function applyReportFilters() {
    const filters = getReportFilterValues();
    if (filters.desde > filters.hasta) {
        alert('El rango de fechas es inválido: "Desde" no puede ser mayor a "Hasta".');
        return;
    }
    await loadReports(filters);
}

async function downloadCsvFromEndpoint(endpoint, defaultName) {
    const filters = getReportFilterValues();
    if (filters.desde > filters.hasta) {
        alert('El rango de fechas es inválido: "Desde" no puede ser mayor a "Hasta".');
        return;
    }

    const query = buildReportFilterQuery();
    try {
        const response = await fetch(API_URL+`${endpoint}?${query.toString()}`, {
            headers: withAuthHeaders(),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'No se pudo exportar el archivo');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = defaultName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting file:', error);
        alert(error.message || 'Error al exportar el archivo');
    }
}

async function exportSalesCsv() {
    const today = getTodayIsoDate();
    await downloadCsvFromEndpoint('api/export/ventas.csv', `ventas_${today}.csv`);
}

async function exportCutsCsv() {
    const today = getTodayIsoDate();
    await downloadCsvFromEndpoint('api/export/cortes.csv', `cortes_${today}.csv`);
}

async function exportCashExitsCsv() {
    const today = getTodayIsoDate();
    await downloadCsvFromEndpoint('api/export/salidas.xlsx', `salidas_dinero_${today}.xlsx`);
}

function formatMoney(value) {
    const amount = Number(value || 0);
    return amount.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function renderEmptyChart(container, message = 'Sin datos para el periodo seleccionado.') {
    if (!container) return;
    container.innerHTML = `<div class="report-chart-empty">${message}</div>`;
}

function renderSingleSeriesBars(container, items, valueKey = 'total') {
    if (!container) return;
    const normalized = (Array.isArray(items) ? items : [])
        .map((item) => ({
            label: String(item?.label || '').trim(),
            value: Number(item?.[valueKey] || 0),
        }))
        .filter((item) => item.label && item.value > 0);
    if (!normalized.length) {
        renderEmptyChart(container);
        return;
    }

    const total = normalized.reduce((acc, item) => acc + item.value, 0);
    const colors = ['#2563eb', '#16a34a', '#f59e0b', '#9333ea', '#ef4444', '#0ea5e9', '#84cc16', '#f97316', '#14b8a6', '#e11d48', '#6366f1', '#22c55e'];
    let start = 0;
    const slices = normalized.map((item, index) => {
        const pct = total > 0 ? (item.value / total) * 100 : 0;
        const end = start + pct;
        const color = colors[index % colors.length];
        const segment = `${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
        start = end;
        return segment;
    }).join(', ');
    const legend = normalized.map((item, index) => {
        const pct = total > 0 ? (item.value / total) * 100 : 0;
        return `
            <li>
                <span class="swatch" style="background:${colors[index % colors.length]};"></span>
                <span class="label" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</span>
                <span class="value">$${formatMoney(item.value)} (${pct.toFixed(1)}%)</span>
            </li>
        `;
    }).join('');

    container.innerHTML = `
        <div class="report-pie-layout">
            <div class="report-pie" style="background: conic-gradient(${slices});"></div>
            <ul class="report-pie-legend">${legend}</ul>
        </div>
    `;
}

function renderDualSeriesBars(container, items, firstKey = 'efectivo', secondKey = 'tarjeta') {
    if (!container) return;
    const firstTotal = (Array.isArray(items) ? items : []).reduce((acc, item) => acc + Number(item?.[firstKey] || 0), 0);
    const secondTotal = (Array.isArray(items) ? items : []).reduce((acc, item) => acc + Number(item?.[secondKey] || 0), 0);
    const total = firstTotal + secondTotal;
    if (total <= 0) {
        renderEmptyChart(container);
        return;
    }

    const firstPct = (firstTotal / total) * 100;
    const slices = `#16a34a 0% ${firstPct.toFixed(2)}%, #2563eb ${firstPct.toFixed(2)}% 100%`;
    container.innerHTML = `
        <div class="report-pie-layout">
            <div class="report-pie" style="background: conic-gradient(${slices});"></div>
            <ul class="report-pie-legend">
                <li>
                    <span class="swatch" style="background:#16a34a;"></span>
                    <span class="label">Efectivo</span>
                    <span class="value">$${formatMoney(firstTotal)} (${firstPct.toFixed(1)}%)</span>
                </li>
                <li>
                    <span class="swatch" style="background:#2563eb;"></span>
                    <span class="label">Tarjetas</span>
                    <span class="value">$${formatMoney(secondTotal)} (${(100 - firstPct).toFixed(1)}%)</span>
                </li>
            </ul>
        </div>
    `;
}

async function downloadReportChartDetail(chartName) {
    const filters = getReportFilterValues();
    if (filters.desde > filters.hasta) {
        alert('El rango de fechas es invalido: "Desde" no puede ser mayor a "Hasta".');
        return;
    }

    const query = buildReportChartsQuery();
    query.set('chart', chartName);

    try {
        const response = await fetch(API_URL + `api/reportes/chart-detail.csv?${query.toString()}`, {
            headers: withAuthHeaders(),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'No se pudo descargar el detalle del grafico');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${chartName}_${getTodayIsoDate()}.xlsx`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting chart detail csv:', error);
        alert(error.message || 'Error al descargar detalle del grafico');
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function getBusinessDisplayInfo() {
    const storedLogo =
        localStorage.getItem('logo_data') ||
        localStorage.getItem('logo_url') ||
        localStorage.getItem('business_logo') ||
        '';
    const defaultLogo = `${window.location.origin}/img/cajero-automatico.png`;

    try {
        const info = await getInfo();
        const first = Array.isArray(info) && info.length ? info[0] : null;
        if (first) {
            return {
                nombre: first.nombre || 'Minimarket',
                telefono: first.telefono || '',
                mail: first.mail || '',
                tipo: first.tipo_local || '',
                logo: storedLogo || defaultLogo,
            };
        }
    } catch (error) {
        console.error('Error loading business info for pdf:', error);
    }

    return {
        nombre: localStorage.getItem('nombre_local') || 'Minimarket',
        telefono: localStorage.getItem('telefono_local') || '',
        mail: localStorage.getItem('mail_local') || '',
        tipo: localStorage.getItem('tipo_local') || '',
        logo: storedLogo || defaultLogo,
    };
}

function buildPrintableHtml(title, headers, rows, options = {}) {
    const {
        business = { nombre: 'Minimarket', telefono: '', mail: '', tipo: '', logo: '' },
        filtersText = '',
        summary = [],
        signatures = ['Firma Cajero', 'Firma Supervisor'],
    } = options;

    const headerHtml = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
    const bodyHtml = rows.map((cols) => {
        const colsHtml = cols.map((c) => `<td>${escapeHtml(c)}</td>`).join('');
        return `<tr>${colsHtml}</tr>`;
    }).join('');
    const summaryHtml = summary.map((item) => `
      <div class="card">
        <div class="label">${escapeHtml(item.label)}</div>
        <div class="value">${escapeHtml(item.value)}</div>
      </div>
    `).join('');
    const signaturesHtml = signatures.map((s) => `
      <div class="signature-item">
        <div class="line"></div>
        <div class="name">${escapeHtml(s)}</div>
      </div>
    `).join('');

    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { margin: 20mm 12mm 18mm 12mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; margin: 0; }
    .print-header { position: fixed; top: 0; left: 0; right: 0; background: #fff; border-bottom: 1px solid #dbe3ea; padding: 8px 0 10px; }
    .print-footer { position: fixed; bottom: 0; left: 0; right: 0; border-top: 1px solid #dbe3ea; padding: 6px 0 0; font-size: 10px; color: #666; display: flex; justify-content: space-between; }
    .page-num::after { content: counter(page); }
    .container { padding: 0 8px; }
    .doc { margin-top: 122px; margin-bottom: 62px; padding: 0 8px; }
    .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px; }
    .brand-wrap { display: flex; gap: 10px; align-items: center; }
    .logo { width: 48px; height: 48px; object-fit: contain; border: 1px solid #d5dde5; border-radius: 6px; background: #fff; }
    .brand h1 { margin: 0; font-size: 24px; letter-spacing: 0.2px; }
    .brand p { margin: 3px 0 0; color: #555; font-size: 12px; }
    .meta { text-align: right; font-size: 11px; color: #444; }
    .doc-title { margin: 10px 0 6px; font-size: 18px; }
    .filters { margin: 0 0 12px; font-size: 12px; color: #444; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 10px; margin: 10px 0 14px; }
    .card { border: 1px solid #ddd; border-radius: 6px; padding: 8px; background: #fafafa; }
    .card .label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.4px; }
    .card .value { font-size: 14px; margin-top: 4px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    th, td { border: 1px solid #d6d6d6; padding: 6px 7px; text-align: left; }
    th { background: #f1f5f9; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 28px; }
    .signature-item .line { border-top: 1px solid #111; margin-top: 24px; }
    .signature-item .name { margin-top: 4px; font-size: 11px; color: #444; text-align: center; }
    .small { margin-top: 10px; font-size: 10px; color: #666; }
  </style>
</head>
<body>
  <div class="print-header">
    <div class="container header">
      <div class="brand-wrap">
        <img class="logo" src="${escapeHtml(business.logo || '')}" alt="Logo">
        <div class="brand">
          <h1>${escapeHtml(business.nombre)}</h1>
          <p>${business.tipo ? `Tipo: ${escapeHtml(business.tipo)}` : ''}</p>
          <p>${business.telefono ? `Tel: ${escapeHtml(business.telefono)}` : ''} ${business.mail ? `| ${escapeHtml(business.mail)}` : ''}</p>
        </div>
      </div>
      <div class="meta">
        <div>Documento: ${escapeHtml(title)}</div>
        <div>Generado: ${escapeHtml(new Date().toLocaleString())}</div>
      </div>
    </div>
  </div>
  <div class="print-footer">
    <div>Sistema Minimarket - Reporte operativo</div>
    <div>Pagina <span class="page-num"></span></div>
  </div>
  <div class="doc">
    <h2 class="doc-title">${escapeHtml(title)}</h2>
    <p class="filters">${escapeHtml(filtersText)}</p>
    <div class="summary-grid">${summaryHtml}</div>
    <table>
      <thead><tr>${headerHtml}</tr></thead>
      <tbody>${bodyHtml}</tbody>
    </table>
    <div class="signatures">${signaturesHtml}</div>
    <div class="small">Documento interno de cierre y control</div>
  </div>
</body>
</html>`;
}

function openPrintWindow(html) {
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) {
        alert('El navegador bloqueó la ventana emergente. Habilítala para exportar PDF.');
        return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
        win.print();
    }, 300);
}

function formatCutReceiptDateTime(value = null) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return '--/--/---- --:--';
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()] || '---';
    const year = date.getFullYear();
    const hour24 = date.getHours();
    const hour12 = ((hour24 + 11) % 12) + 1;
    const minute = String(date.getMinutes()).padStart(2, '0');
    const suffix = hour24 >= 12 ? 'PM' : 'AM';
    return `${day}/${month}/${year} ${hour12}:${minute} ${suffix}`;
}

function normalizeCutReceiptPaymentLabel(methodRaw = '') {
    const method = String(methodRaw || '').trim().toLowerCase();
    const labels = {
        efectivo: 'EN EFECTIVO',
        tarjeta: 'CON TARJETA',
        credito: 'A CREDITO',
        vale: 'CON VALES',
        transferencia: 'TRANSFERENCIA',
        cheque: 'CHEQUE',
        dolares: 'DOLARES',
        mixto: 'EFECTIVO + TARJETA',
    };
    if (labels[method]) return labels[method];
    if (!method) return 'OTRO';
    return method.toUpperCase();
}

function buildCutSessionReceiptHtml(snapshot = {}, options = {}) {
    const data = snapshot?.data && typeof snapshot.data === 'object' ? snapshot.data : {};
    const business = options?.business || {};
    const cashierName = String(options?.cashierName || getCurrentCutCashierLabel()).trim() || 'CAJERO';
    const cajaLabel = String(options?.cajaLabel || '').trim() || '-';
    const detailRows = Array.isArray(data.detalle) ? data.detalle : [];
    const summaryRows = Array.isArray(data.resumen) ? data.resumen : [];
    const movementSummaryRows = Array.isArray(data?.movimientos?.resumen) ? data.movimientos.resumen : [];
    const movementIncomeRows = Array.isArray(data?.movimientos?.detalle_ingresos) ? data.movimientos.detalle_ingresos : [];
    const movementExpenseRows = Array.isArray(data?.movimientos?.detalle_salidas) ? data.movimientos.detalle_salidas : [];
    const departmentRows = Array.isArray(data.departamentos) ? data.departamentos : [];
    const financial = data.resumen_financiero || {};

    const money = (value) => `$${formatMoney(value)}`;
    const lineHtml = (label, value, isBold = false) => `
      <div class="line${isBold ? ' strong' : ''}">
        <span>${escapeHtml(label)}</span>
        <span>${escapeHtml(value)}</span>
      </div>
    `;

    const fallbackVentasEfectivo = summaryRows.reduce((acc, row) => {
        const method = String(row.metodo_pago || '').toLowerCase();
        const total = Number(row.total || 0);
        if (method === 'efectivo') return acc + total;
        if (method === 'mixto') return acc + (total / 2);
        return acc;
    }, 0);
    const fallbackEntradasTotal = movementSummaryRows
        .filter((row) => String(row.tipo || '').toLowerCase() === 'entrada')
        .reduce((acc, row) => acc + Number(row.total || 0), 0);
    const summaryHasEntryMethodBreakdown = movementSummaryRows.some((row) =>
        String(row?.tipo || '').toLowerCase() === 'entrada' && typeof row?.metodo === 'string'
    );
    const fallbackEntradasEfectivoSummary = movementSummaryRows
        .filter((row) =>
            String(row.tipo || '').toLowerCase() === 'entrada'
            && String(row.metodo || '').toLowerCase() === 'efectivo'
        )
        .reduce((acc, row) => acc + Number(row.total || 0), 0);
    const fallbackEntradasEfectivoDetail = movementIncomeRows
        .filter((row) =>
            String(row.tipo || '').toLowerCase() === 'entrada'
            && String(row.metodo || '').toLowerCase() === 'efectivo'
        )
        .reduce((acc, row) => acc + Number(row.monto || 0), 0);
    const fallbackEntradas = movementIncomeRows.length > 0
        ? fallbackEntradasEfectivoDetail
        : (summaryHasEntryMethodBreakdown ? fallbackEntradasEfectivoSummary : fallbackEntradasTotal);
    const fallbackSalidasTotal = movementSummaryRows
        .filter((row) => String(row.tipo || '').toLowerCase() === 'salida')
        .reduce((acc, row) => acc + Number(row.total || 0), 0);
    const summaryHasExitMethodBreakdown = movementSummaryRows.some((row) =>
        String(row?.tipo || '').toLowerCase() === 'salida' && typeof row?.metodo === 'string'
    );
    const fallbackSalidasEfectivoSummary = movementSummaryRows
        .filter((row) =>
            String(row.tipo || '').toLowerCase() === 'salida'
            && String(row.metodo || '').toLowerCase() === 'efectivo'
        )
        .reduce((acc, row) => acc + Number(row.total || 0), 0);
    const fallbackSalidasEfectivoDetail = movementExpenseRows
        .filter((row) =>
            String(row.tipo || '').toLowerCase() === 'salida'
            && String(row.metodo || '').toLowerCase() === 'efectivo'
        )
        .reduce((acc, row) => acc + Number(row.monto || 0), 0);
    const fallbackSalidasEfectivo = movementExpenseRows.length > 0
        ? fallbackSalidasEfectivoDetail
        : (summaryHasExitMethodBreakdown ? fallbackSalidasEfectivoSummary : fallbackSalidasTotal);
    const fallbackAbonos = movementSummaryRows
        .filter((row) => String(row.tipo || '').toLowerCase() === 'abono')
        .reduce((acc, row) => acc + Number(row.total || 0), 0);

    const fondoCaja = Number(financial.fondo_caja ?? data.monto_inicial ?? 0);
    const ventasEfectivo = Number(financial.ventas_efectivo ?? fallbackVentasEfectivo);
    const abonosEfectivo = Number(financial.abonos_efectivo ?? fallbackAbonos);
    const entradasDinero = Number(financial.entradas_dinero ?? fallbackEntradas);
    const salidasDinero = Number(financial.salidas_dinero ?? fallbackSalidasEfectivo);
    const efectivoEnCaja = Number(
        financial.ventas_totales_dinero_en_caja
        ?? (fondoCaja + ventasEfectivo + abonosEfectivo + entradasDinero - salidasDinero)
    );
    const devolucionesVentas = Number(financial.devoluciones_ventas ?? financial.devoluciones ?? 0);
    const totalVentas = Number(data.totales?.total ?? financial.total_vendido ?? 0);
    const totalTransacciones = Number(data.totales?.transacciones || detailRows.length || 0);
    const totalEntradas = movementIncomeRows
        .filter((row) => String(row.tipo || '').toLowerCase() === 'entrada')
        .reduce((acc, row) => acc + Number(row.monto || 0), 0);
    const totalSalidas = movementExpenseRows.reduce((acc, row) => acc + Number(row.monto || 0), 0);

    const methodTotals = new Map();
    summaryRows.forEach((row) => {
        const key = String(row.metodo_pago || '').trim().toLowerCase();
        if (!key) return;
        methodTotals.set(key, (methodTotals.get(key) || 0) + Number(row.total || 0));
    });

    const preferredMethodOrder = ['efectivo', 'tarjeta', 'credito', 'vale', 'transferencia', 'cheque', 'dolares', 'mixto'];
    const methodRows = [];
    preferredMethodOrder.forEach((key) => {
        let value = Number(methodTotals.get(key) || 0);
        if (key === 'efectivo') value = ventasEfectivo;
        if (key === 'mixto' && value <= 0) return;
        if (key === 'credito' && !methodTotals.has(key)) value = 0;
        methodRows.push({
            key,
            label: normalizeCutReceiptPaymentLabel(key),
            value,
        });
        methodTotals.delete(key);
    });
    methodTotals.forEach((value, key) => {
        methodRows.push({
            key,
            label: normalizeCutReceiptPaymentLabel(key),
            value: Number(value || 0),
        });
    });

    const departmentRowsWithSales = departmentRows
        .map((row) => ({
            label: String(row.departamento || 'SIN DEPARTAMENTO').trim().toUpperCase(),
            total: Number(row.total_vendido || 0),
        }))
        .filter((row) => row.total > 0);

    const businessName = String(business.nombre || 'MINIMARKET').trim() || 'MINIMARKET';
    const businessType = String(business.tipo || '').trim();
    const dateIso = String(data.fecha || cutCloseContext.currentDate || new Date().toISOString().slice(0, 10)).trim();
    const dateLabel = formatCutDateForHeader(dateIso).toUpperCase();
    const generatedAtLabel = formatCutReceiptDateTime(snapshot?.loadedAt || new Date());
    const turnoId = Number(data.turno_id || 0);
    const shiftRangeLabel = buildCutHistoryTimeRange(data.hora_apertura || '', data.hora_cierre || '');

    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Corte de turno</title>
  <style>
    @page { size: 80mm auto; margin: 3mm; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; }
    body { font-family: "Courier New", Consolas, monospace; font-size: 12px; line-height: 1.22; }
    .receipt { width: 74mm; margin: 0 auto; }
    .center { text-align: center; }
    .brand { font-size: 34px; font-weight: 700; text-transform: uppercase; line-height: 1.05; }
    .subtitle { font-size: 13px; margin-top: 2px; text-transform: uppercase; font-weight: 700; }
    .main-title { font-size: 36px; margin: 8px 0 2px; text-transform: uppercase; font-weight: 700; }
    .meta { margin: 2px 0; font-size: 11px; text-transform: uppercase; }
    .spacer { height: 4px; }
    .separator { border-top: 1px dashed #000; margin: 6px 0; }
    .section-title { text-align: center; font-size: 16px; font-weight: 700; text-transform: uppercase; margin: 8px 0 4px; }
    .line { display: flex; justify-content: space-between; gap: 10px; margin: 1px 0; align-items: flex-start; }
    .line span:last-child { text-align: right; white-space: nowrap; }
    .strong { font-weight: 700; }
    .footer { margin-top: 8px; text-align: center; font-size: 10px; color: #222; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="center brand">${escapeHtml(businessName)}</div>
    ${businessType ? `<div class="center subtitle">${escapeHtml(businessType)}</div>` : ''}
    <div class="center main-title">CORTE DE TURNO</div>
    <div class="center subtitle">TURNO #${escapeHtml(String(turnoId || '-'))}</div>
    <div class="meta">REALIZADO: ${escapeHtml(generatedAtLabel)}</div>
    <div class="meta">CAJERO: ${escapeHtml(cashierName.toUpperCase())}</div>
    <div class="meta">CAJA: ${escapeHtml(String(cajaLabel).toUpperCase())}</div>
    <div class="meta">FECHA: ${escapeHtml(dateLabel)}</div>
    <div class="meta">HORARIO: ${escapeHtml(shiftRangeLabel.toUpperCase())}</div>
    <div class="spacer"></div>
    ${lineHtml('VENTAS TOTALES', money(totalVentas), true)}
    <div class="meta">${escapeHtml(String(totalTransacciones))} VENTAS EN EL TURNO</div>

    <div class="section-title">== DINERO EN CAJA ==</div>
    ${lineHtml('FONDO DE CAJA', money(fondoCaja))}
    ${lineHtml('VENTAS EN EFECTIVO', money(ventasEfectivo))}
    ${lineHtml('ABONOS EN EFECTIVO', `+ ${money(abonosEfectivo)}`)}
    ${lineHtml('ENTRADAS', `+ ${money(entradasDinero)}`)}
    ${lineHtml('SALIDAS', `- ${money(salidasDinero)}`)}
    <div class="separator"></div>
    ${lineHtml('EFECTIVO EN CAJA', money(efectivoEnCaja), true)}

    <div class="section-title">== ENTRADAS EFECTIVO ==</div>
    ${lineHtml('TOTAL ENTRADAS', money(totalEntradas), true)}

    <div class="section-title">== SALIDAS EFECTIVO ==</div>
    ${lineHtml('TOTAL SALIDAS', money(totalSalidas), true)}

    <div class="section-title">== VENTAS ==</div>
    ${methodRows.map((row) => lineHtml(row.label, money(row.value))).join('')}
    ${lineHtml('DEVOLUCIONES', `- ${money(devolucionesVentas)}`)}
    <div class="separator"></div>
    ${lineHtml('TOTAL VENTAS', money(totalVentas), true)}

    <div class="section-title">== VENTAS POR DEPTO ==</div>
    ${
        departmentRowsWithSales.length
            ? departmentRowsWithSales.map((row) => lineHtml(row.label, money(row.total))).join('')
            : lineHtml('SIN VENTAS POR DEPARTAMENTO', money(0))
    }

    <div class="footer">Reporte generado desde corte de turno</div>
  </div>
</body>
</html>`;
}

async function printCurrentCutSessionReport() {
    if (!hasUserPermission('corte_turno')) {
        return;
    }
    const historicalCutId = Number(cutCloseContext.historicalCutId || 0);
    if (!cutCloseContext.sessionResumenLoaded && historicalCutId <= 0) {
        alert('Primero carga el resumen de sesion o abre un corte historico para imprimir.');
        return;
    }
    let snapshot = cutCloseContext.sessionReportSnapshot;
    if (historicalCutId <= 0 && (!snapshot || !snapshot.data)) {
        const loaded = await loadCutSummaryForClose('session', { silent: true });
        snapshot = cutCloseContext.sessionReportSnapshot;
        if (!loaded || !snapshot || !snapshot.data) {
            alert('No se pudo cargar la informacion del corte para imprimir.');
            return;
        }
    }

    try {
        if (historicalCutId > 0) {
            await printCutById(historicalCutId);
        } else {
            await printCutSessionTicket();
        }
    } catch (error) {
        console.error('Error printing cut report:', error);
        alert(error.message || 'Error al imprimir el reporte de corte.');
    }
}

window.printCurrentCutSessionReport = printCurrentCutSessionReport;

async function exportSalesPdf() {
    const filters = getReportFilterValues();
    if (filters.desde > filters.hasta) {
        alert('El rango de fechas es inválido.');
        return;
    }

    const query = buildReportFilterQuery();
    try {
        const business = await getBusinessDisplayInfo();
        const response = await fetch(API_URL+`api/reportes/ventas-detalle?${query.toString()}`, {
            headers: withAuthHeaders(),
        });
        const rows = await response.json();
        if (!response.ok) {
            throw new Error(rows.message || 'No se pudo generar PDF de ventas');
        }

        const printableRows = rows.map((r) => [
            r.fecha,
            r.numero_ticket,
            r.caja_id,
            `${r.cajero_nombre} (${r.usuario_id})`,
            r.metodo_pago,
            Number(r.total || 0).toFixed(0),
        ]);

        const totalVentas = rows.reduce((acc, r) => acc + Number(r.total || 0), 0);
        const byPay = rows.reduce((acc, r) => {
            const key = r.metodo_pago || 'otro';
            acc[key] = (acc[key] || 0) + Number(r.total || 0);
            return acc;
        }, {});
        const nonCashTotal = Object.keys(byPay).reduce((sum, key) => {
            if (key === 'efectivo') return sum;
            return sum + Number(byPay[key] || 0);
        }, 0);

        const html = buildPrintableHtml(
            'Reporte de Ventas',
            ['Fecha', 'Ticket', 'Caja', 'Cajero', 'Metodo Pago', 'Total'],
            printableRows,
            {
                business,
                filtersText: `Rango: ${filters.desde} a ${filters.hasta} | Caja: ${filters.caja || 'Todas'} | Cajero: ${filters.cajero || 'Todos'}`,
                summary: [
                    { label: 'Transacciones', value: String(rows.length) },
                    { label: 'Total Ventas', value: formatMoney(totalVentas) },
                    { label: 'Efectivo', value: formatMoney(byPay.efectivo || 0) },
                    { label: 'No efectivo', value: formatMoney(nonCashTotal) },
                ],
                signatures: ['Firma Cajero', 'Firma Supervisor'],
            }
        );
        openPrintWindow(html);
    } catch (error) {
        console.error('Error exporting sales pdf:', error);
        alert(error.message || 'Error al exportar PDF de ventas');
    }
}

async function exportCutsPdf() {
    const filters = getReportFilterValues();
    if (filters.desde > filters.hasta) {
        alert('El rango de fechas es inválido.');
        return;
    }

    const query = buildReportFilterQuery();
    try {
        const business = await getBusinessDisplayInfo();
        const response = await fetch(API_URL+`api/corte/historial?${query.toString()}`, {
            headers: withAuthHeaders(),
        });
        const rows = await response.json();
        if (!response.ok) {
            throw new Error(rows.message || 'No se pudo generar PDF de cortes');
        }

        const printableRows = rows.map((r) => [
            r.fecha,
            r.caja_id,
            `${r.cajero_nombre || ''} (${r.usuario_id})`,
            Number(r.total_ventas || 0).toFixed(0),
            Number(r.monto_inicial || 0).toFixed(0),
            Number(r.monto_declarado || 0).toFixed(0),
            Number(r.diferencia_efectivo || 0).toFixed(0),
            r.estado,
        ]);

        const totalVentas = rows.reduce((acc, r) => acc + Number(r.total_ventas || 0), 0);
        const totalDiff = rows.reduce((acc, r) => acc + Number(r.diferencia_efectivo || 0), 0);
        const cerrados = rows.filter((r) => String(r.estado) === 'cerrado').length;

        const html = buildPrintableHtml(
            'Historial de Cortes',
            ['Fecha', 'Caja', 'Cajero', 'Ventas', 'Inicial', 'Declarado', 'Diferencia', 'Estado'],
            printableRows,
            {
                business,
                filtersText: `Rango: ${filters.desde} a ${filters.hasta} | Caja: ${filters.caja || 'Todas'} | Cajero: ${filters.cajero || 'Todos'}`,
                summary: [
                    { label: 'Cierres', value: String(rows.length) },
                    { label: 'Cierres Cerrados', value: String(cerrados) },
                    { label: 'Total Ventas', value: formatMoney(totalVentas) },
                    { label: 'Diferencia Neta', value: formatMoney(totalDiff) },
                ],
                signatures: ['Firma Cajero', 'Firma Administrador'],
            }
        );
        openPrintWindow(html);
    } catch (error) {
        console.error('Error exporting cuts pdf:', error);
        alert(error.message || 'Error al exportar PDF de cortes');
    }
}

async function loadReports(filters = null) {
    const dailyContainer = document.getElementById('report-chart-daily');
    const cashExitsContainer = document.getElementById('report-chart-cash-exits');
    const departmentContainer = document.getElementById('report-chart-department');
    const monthlyContainer = document.getElementById('report-chart-monthly');
    const cashierContainer = document.getElementById('report-chart-cashier');
    const globalContainer = document.getElementById('report-chart-global');
    if (!dailyContainer || !cashExitsContainer || !departmentContainer || !monthlyContainer || !cashierContainer || !globalContainer) {
        return;
    }

    const values = filters || getReportFilterValues();
    if (values.desde > values.hasta) {
        renderEmptyChart(dailyContainer, 'Rango de fechas invalido.');
        renderEmptyChart(cashExitsContainer, 'Rango de fechas invalido.');
        renderEmptyChart(departmentContainer, 'Rango de fechas invalido.');
        renderEmptyChart(monthlyContainer, 'Rango de fechas invalido.');
        renderEmptyChart(cashierContainer, 'Rango de fechas invalido.');
        renderEmptyChart(globalContainer, 'Rango de fechas invalido.');
        return;
    }

    const query = buildReportChartsQuery();

    try {
        const response = await fetch(API_URL + `api/reportes/charts?${query.toString()}`, {
            headers: withAuthHeaders(),
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'No se pudo cargar los graficos');
        }

        const dailyData = Array.isArray(data.daily_payment) ? data.daily_payment : [];
        if (dailyData.length) renderDualSeriesBars(dailyContainer, dailyData, 'efectivo', 'tarjeta');
        else renderEmptyChart(dailyContainer);

        const cashExitData = Array.isArray(data.cash_exits) ? data.cash_exits : [];
        if (cashExitData.length) renderSingleSeriesBars(cashExitsContainer, cashExitData, 'total');
        else renderEmptyChart(cashExitsContainer, 'Sin salidas en el periodo seleccionado.');

        const departmentData = Array.isArray(data.department_sales) ? data.department_sales : [];
        if (departmentData.length) renderSingleSeriesBars(departmentContainer, departmentData, 'total');
        else renderEmptyChart(departmentContainer);

        const monthlyData = Array.isArray(data.monthly_payment) ? data.monthly_payment : [];
        if (monthlyData.length) renderDualSeriesBars(monthlyContainer, monthlyData, 'efectivo', 'tarjeta');
        else renderEmptyChart(monthlyContainer);

        const cashierData = Array.isArray(data.cashier_sales) ? data.cashier_sales : [];
        if (cashierData.length) renderSingleSeriesBars(cashierContainer, cashierData, 'total');
        else renderEmptyChart(cashierContainer);

        const globalData = Array.isArray(data.all_cashiers_sales) ? data.all_cashiers_sales : [];
        if (globalData.length) renderSingleSeriesBars(globalContainer, globalData, 'total');
        else renderEmptyChart(globalContainer);
    } catch (error) {
        renderEmptyChart(dailyContainer, 'Error al cargar grafico de ventas diarias.');
        renderEmptyChart(cashExitsContainer, 'Error al cargar grafico de salidas.');
        renderEmptyChart(departmentContainer, 'Error al cargar grafico por departamento.');
        renderEmptyChart(monthlyContainer, 'Error al cargar grafico de ventas mensuales.');
        renderEmptyChart(cashierContainer, 'Error al cargar grafico por cajero.');
        renderEmptyChart(globalContainer, 'Error al cargar grafico global de cajeros.');
        console.error('Error loading reports:', error);
    }
}

async function loadCurrentCut() {
    setupCutCalculatorPopup();
    if (!hasUserPermission('corte_turno') && !hasUserPermission('corte_dia') && !hasUserPermission('corte_todos_turnos')) {
        return;
    }
    const cutSummary = document.getElementById('cut-summary');
    const cutBreakdown = document.getElementById('cut-breakdown');
    if (!cutSummary || !cutBreakdown) {
        return;
    }
    refreshCutCloseButtonState();

    const caja = localStorage.getItem('n_caja');
    const cajero = localStorage.getItem('id_user');
    const query = new URLSearchParams();
    if (caja) query.set('caja', caja);
    if (cajero) query.set('cajero', cajero);

    try {
        const response = await fetch(API_URL+`api/corte/actual?${query.toString()}`, {
            headers: withAuthHeaders(),
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'No se pudo cargar el corte');
        }

        const closeStatus = data.cerrado ? ' (turno cerrado)' : ' (turno abierto)';
        cutCloseContext.turnStatusLabel = closeStatus;
        cutCloseContext.currentDate = data.fecha || new Date().toISOString().slice(0, 10);
        cutSummary.textContent = 'Sin resumen cargado. Usa "Hacer corte de cajero" o "Hacer corte del dia".';
        renderCutReferenceSummaryValues({
            cashMain: 0,
            cashMainTx: 0,
            cardMain: 0,
            cardMainTx: 0,
            transferMain: 0,
            transferMainTx: 0,
            mixedTotal: 0,
            mixedTx: 0,
            mixedCash: 0,
            mixedCard: 0,
            cashTotal: 0,
            cashTotalTx: 0,
            cardTotal: 0,
            cardTotalTx: 0,
            transferTotal: 0,
            transferTotalTx: 0,
        });
        updateCutHeadline({
            cashierName: getCurrentCutCashierLabel(),
            dateIso: cutCloseContext.currentDate,
            startTime: data?.cierre?.hora_apertura || '',
            endTime: data?.cierre?.hora_cierre || '',
            statusText: data.cerrado ? 'Turno cerrado' : 'Turno abierto',
        });
        updateCutSessionContext({ visible: false });
        cutBreakdown.innerHTML = '';
        renderCutFinancialSections({}, { clearOnly: true });
        const scopeInfo = document.getElementById('cut-close-scope-info');
        const breakdownList = document.getElementById('cut-close-breakdown');
        const detailBody = document.getElementById('cut-close-detail-body');
        if (scopeInfo) scopeInfo.textContent = 'Selecciona una opcion para cargar el resumen de ventas.';
        if (breakdownList) breakdownList.innerHTML = '';
        if (detailBody) detailBody.innerHTML = '';
        cutCloseContext.scope = null;
        cutCloseContext.resumenLoaded = false;
        cutCloseContext.sessionResumenLoaded = false;
        cutCloseContext.esperadoEfectivo = 0;
        cutCloseContext.esperadoTarjeta = 0;
        cutCloseContext.sessionReportSnapshot = null;
        cutCloseContext.historicalCutId = null;
        refreshCutCloseButtonState();
    } catch (error) {
        const today = new Date().toISOString().slice(0, 10);
        cutCloseContext.currentDate = today;
        cutSummary.textContent = 'Sin resumen cargado. Usa "Hacer corte de cajero" o "Hacer corte del dia".';
        renderCutReferenceSummaryValues({
            cashMain: 0,
            cashMainTx: 0,
            cardMain: 0,
            cardMainTx: 0,
            transferMain: 0,
            transferMainTx: 0,
            mixedTotal: 0,
            mixedTx: 0,
            mixedCash: 0,
            mixedCard: 0,
            cashTotal: 0,
            cashTotalTx: 0,
            cardTotal: 0,
            cardTotalTx: 0,
            transferTotal: 0,
            transferTotalTx: 0,
        });
        updateCutHeadline({
            cashierName: getCurrentCutCashierLabel(),
            dateIso: today,
            startTime: '',
            endTime: '',
            statusText: '',
        });
        updateCutSessionContext({ visible: false });
        cutBreakdown.innerHTML = '';
        renderCutFinancialSections({}, { clearOnly: true });
        const scopeInfo = document.getElementById('cut-close-scope-info');
        const breakdownList = document.getElementById('cut-close-breakdown');
        const detailBody = document.getElementById('cut-close-detail-body');
        if (scopeInfo) scopeInfo.textContent = 'Selecciona una opcion para cargar el resumen de ventas.';
        if (breakdownList) breakdownList.innerHTML = '';
        if (detailBody) detailBody.innerHTML = '';
        cutCloseContext.scope = null;
        cutCloseContext.resumenLoaded = false;
        cutCloseContext.sessionResumenLoaded = false;
        cutCloseContext.esperadoEfectivo = 0;
        cutCloseContext.esperadoTarjeta = 0;
        cutCloseContext.sessionReportSnapshot = null;
        cutCloseContext.historicalCutId = null;
        refreshCutCloseButtonState();
        console.error('Error loading cut:', error);
    }
}

async function loadCutSummaryForClose(scope = 'session', options = {}) {
    const silent = Boolean(options?.silent);
    if (scope === 'session' && !hasUserPermission('corte_turno')) {
        return false;
    }
    if (scope === 'day' && !hasUserPermission('corte_dia')) {
        return false;
    }
    const caja = localStorage.getItem('n_caja');
    const cajero = localStorage.getItem('id_user');
    const scopeInfo = document.getElementById('cut-close-scope-info');
    const breakdownList = document.getElementById('cut-close-breakdown');
    const detailBody = document.getElementById('cut-close-detail-body');

    if (!scopeInfo || !breakdownList || !detailBody) {
        return false;
    }
    if (!caja || !cajero) {
        if (!silent) {
            alert('No hay sesion de caja/cajero activa.');
        }
        return false;
    }

    try {
        const query = new URLSearchParams({ caja, cajero, scope });
        const response = await fetch(API_URL + `api/turno/resumen?${query.toString()}`, {
            headers: withAuthHeaders(),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            if (silent) {
                scopeInfo.textContent = data.message || 'No se pudo cargar resumen para cierre.';
            } else {
                alert(data.message || 'No se pudo cargar resumen para cierre.');
            }
            return false;
        }

        const totalVentas = Number(data.totales?.total || 0);
        const totalTx = Number(data.totales?.transacciones || 0);
        const paymentSettings = await fetchPaymentSettingsForCut();
        const departmentRows = await fetchCutDepartmentBreakdown(scope);
        data.departamentos = departmentRows;
        cutCloseContext.scope = scope;
        const scopeLabel = scope === 'session' ? 'sesion actual' : 'dia completo';
        renderCutEnabledPaymentBreakdown(
            data.resumen || [],
            paymentSettings,
            scopeLabel,
            data.resumen_financiero || {},
            data.resumen_mixto || {},
            data.detalle || [],
            data.ventas_mixtas || []
        );
        if (scope === 'session') {
            renderCutFinancialSections(data);
        } else {
            renderCutFinancialSections({}, { clearOnly: true });
        }
        scopeInfo.textContent = scope === 'session'
            ? `Resumen cargado: sesion actual (${totalTx} ventas, total ${totalVentas.toFixed(0)}).`
            : `Resumen cargado: dia completo (${totalTx} ventas, total ${totalVentas.toFixed(0)}).`;

        breakdownList.innerHTML = '';
        const detailHint = document.createElement('li');
        detailHint.textContent = 'El desglose por forma de pago se muestra en el panel izquierdo.';
        breakdownList.appendChild(detailHint);

        detailBody.innerHTML = '';
        (data.detalle || []).forEach((row) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.fecha || ''}</td>
                <td>${row.numero_ticket || ''}</td>
                <td>${normalizeSalesPaymentMethodLabel(row.metodo_pago || '')}</td>
                <td style="text-align:right;">${Number(row.total || 0).toFixed(0)}</td>
            `;
            detailBody.appendChild(tr);
        });
        if (!data.detalle || data.detalle.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="4" style="text-align:center;">Sin ventas para el alcance seleccionado.</td>';
            detailBody.appendChild(tr);
        }

        const nextCurrentDate = cutCloseContext.currentDate || data.fecha || new Date().toISOString().slice(0, 10);
        const summaryFinancial = data?.resumen_financiero || {};
        const expectedCashFromFinancial = Number(
            summaryFinancial.ventas_totales_dinero_en_caja
            ?? (
                Number(summaryFinancial.fondo_caja ?? data.monto_inicial ?? 0)
                + Number(summaryFinancial.ventas_efectivo ?? 0)
                + Number(summaryFinancial.abonos_efectivo ?? 0)
                + Number(summaryFinancial.entradas_dinero ?? 0)
                - Number(summaryFinancial.salidas_dinero ?? 0)
            )
        );
        const expectedCashFromApi = Number(data.esperado_efectivo || 0);
        const resolvedExpectedCash = Number.isFinite(expectedCashFromFinancial)
            ? expectedCashFromFinancial
            : (Number.isFinite(expectedCashFromApi) ? expectedCashFromApi : 0);
        const summaryRows = Array.isArray(data?.resumen) ? data.resumen : [];
        const expectedTransferFromSummary = summaryRows.reduce((acc, row) => {
            const method = String(row?.metodo_pago || '').trim().toLowerCase();
            if (method !== 'transferencia') return acc;
            return acc + Number(row?.total || 0);
        }, 0);
        const expectedCardMainFromSummary = summaryRows.reduce((acc, row) => {
            const method = String(row?.metodo_pago || '').trim().toLowerCase();
            if (method !== 'tarjeta') return acc;
            return acc + Number(row?.total || 0);
        }, 0);
        const hasLegacyMixtoSummary = summaryRows.some((row) => {
            const method = String(row?.metodo_pago || '').trim().toLowerCase();
            return method === 'mixto' && Number(row?.total || 0) > 0;
        });
        const expectedMixedTotals = resolveCutMixedTotals({
            summaryRows,
            detailRows: Array.isArray(data?.detalle) ? data.detalle : [],
            mixedRows: Array.isArray(data?.ventas_mixtas) ? data.ventas_mixtas : [],
            mixedSummary: data?.resumen_mixto || {},
            totalTx: Number(data?.totales?.transacciones || 0),
            financialCash: Number(summaryFinancial?.ventas_efectivo),
            financialCard: Number(summaryFinancial?.ventas_tarjeta),
        });
        const expectedCardFromBreakdown = Math.max(
            0,
            hasLegacyMixtoSummary
                ? (Number(expectedCardMainFromSummary || 0) + Number(expectedMixedTotals?.tarjeta || 0))
                : Number(expectedCardMainFromSummary || 0)
        );
        const expectedCardFromFinancial = Number(summaryFinancial.ventas_tarjeta ?? 0);
        const expectedCardFromApi = Number(data.esperado_tarjeta || 0);
        const expectedCardAdjustedFromFinancial = Number.isFinite(expectedCardFromFinancial)
            ? Math.max(0, expectedCardFromFinancial - expectedTransferFromSummary)
            : NaN;
        const expectedCardAdjustedFromApi = Number.isFinite(expectedCardFromApi)
            ? Math.max(0, expectedCardFromApi - expectedTransferFromSummary)
            : NaN;
        const resolvedExpectedCard = expectedCardFromBreakdown > 0
            ? expectedCardFromBreakdown
            : (Number.isFinite(expectedCardAdjustedFromFinancial)
                ? expectedCardAdjustedFromFinancial
                : (Number.isFinite(expectedCardAdjustedFromApi) ? expectedCardAdjustedFromApi : 0));

        cutCloseContext = {
            scope,
            esperadoEfectivo: resolvedExpectedCash,
            esperadoTarjeta: resolvedExpectedCard,
            resumenLoaded: true,
            sessionResumenLoaded: scope === 'session' ? true : cutCloseContext.sessionResumenLoaded,
            turnStatusLabel: cutCloseContext.turnStatusLabel || '',
            currentDate: nextCurrentDate,
            sessionReportSnapshot: scope === 'session'
                ? {
                    data,
                    paymentSettings,
                    loadedAt: new Date().toISOString(),
                }
                : cutCloseContext.sessionReportSnapshot,
            historicalCutId: null,
        };
        updateCutHeadline({
            cashierName: getCurrentCutCashierLabel(),
            dateIso: nextCurrentDate,
            startTime: data.hora_apertura || '',
            endTime: data.hora_cierre || '',
            statusText: scope === 'session' ? 'Sesion actual' : 'Dia completo',
        });
        if (scope === 'session') {
            updateCutSessionContext({
                visible: true,
                cashierName: getCurrentCutCashierLabel(),
                dateIso: nextCurrentDate,
            });
        } else {
            updateCutSessionContext({ visible: false });
        }
        refreshCutCloseButtonState();
        refreshCloseShiftDifference();
        return true;
    } catch (error) {
        console.error('Error loading cut summary for close:', error);
        if (silent) {
            scopeInfo.textContent = 'Error al cargar resumen para cierre.';
        } else {
            alert('Error al cargar resumen para cierre.');
        }
        return false;
    }
}

function refreshCloseShiftDifference() {
    const declaredInput = document.getElementById('cut-declared-amount');
    const declaredCardInput = document.getElementById('cut-declared-card-amount');
    const diffInput = document.getElementById('cut-difference-preview');
    const cardDiffInput = document.getElementById('cut-card-difference-preview');
    const info = document.getElementById('cut-close-popup-info');
    if (!declaredInput || !declaredCardInput || !diffInput || !cardDiffInput || !info) {
        return;
    }
    const declarado = Number(declaredInput.value || 0);
    const declaradoTarjeta = Number(declaredCardInput.value || 0);
    const esperado = Number(cutCloseContext.esperadoEfectivo || 0);
    const esperadoTarjeta = Number(cutCloseContext.esperadoTarjeta || 0);
    const diff = declarado - esperado;
    const diffTarjeta = declaradoTarjeta - esperadoTarjeta;
    diffInput.value = `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`;
    diffInput.style.color = diff < 0 ? 'red' : (diff > 0 ? 'green' : 'inherit');
    cardDiffInput.value = `${diffTarjeta >= 0 ? '+' : ''}${diffTarjeta.toFixed(2)}`;
    cardDiffInput.style.color = diffTarjeta < 0 ? 'red' : (diffTarjeta > 0 ? 'green' : 'inherit');
    info.textContent = '';
}

function applyCloseShiftModeUI(mode) {
    const declaredRow = document.getElementById('cut-declared-row');
    const declaredCardRow = document.getElementById('cut-declared-card-row');
    const diffRow = document.getElementById('cut-difference-row');
    const cardDiffRow = document.getElementById('cut-card-difference-row');
    const declaredInput = document.getElementById('cut-declared-amount');
    const declaredCardInput = document.getElementById('cut-declared-card-amount');
    const diffInput = document.getElementById('cut-difference-preview');
    const cardDiffInput = document.getElementById('cut-card-difference-preview');
    const info = document.getElementById('cut-close-popup-info');
    const autoAdjust = mode !== 'sin_ajuste';
    const esperado = Number(cutCloseContext.esperadoEfectivo || 0);
    const esperadoTarjeta = Number(cutCloseContext.esperadoTarjeta || 0);

    if (declaredRow) declaredRow.style.display = autoAdjust ? '' : 'none';
    if (declaredCardRow) declaredCardRow.style.display = autoAdjust ? '' : 'none';
    if (diffRow) diffRow.style.display = autoAdjust ? '' : 'none';
    if (cardDiffRow) cardDiffRow.style.display = autoAdjust ? '' : 'none';
    if (declaredInput) {
        declaredInput.readOnly = !autoAdjust;
        if (!autoAdjust) declaredInput.value = esperado.toFixed(2);
    }
    if (declaredCardInput) {
        declaredCardInput.readOnly = !autoAdjust;
        if (!autoAdjust) declaredCardInput.value = esperadoTarjeta.toFixed(2);
    }
    if (diffInput && !autoAdjust) {
        diffInput.value = '0.00';
        diffInput.style.color = 'inherit';
    }
    if (cardDiffInput && !autoAdjust) {
        cardDiffInput.value = '0.00';
        cardDiffInput.style.color = 'inherit';
    }
    if (info && !autoAdjust) {
        info.textContent = '';
    } else {
        refreshCloseShiftDifference();
    }
}

function isElementVisibleForCloseShiftFlow(element) {
    if (!element) return false;
    if (element.offsetParent !== null) return true;
    const computed = window.getComputedStyle(element);
    return computed.display !== 'none' && computed.visibility !== 'hidden';
}

function focusCloseShiftDeclaredInputs() {
    const declaredInput = document.getElementById('cut-declared-amount');
    const declaredCardInput = document.getElementById('cut-declared-card-amount');
    const declaredRow = document.getElementById('cut-declared-row');
    const declaredCardRow = document.getElementById('cut-declared-card-row');

    if (
        declaredInput &&
        isElementVisibleForCloseShiftFlow(declaredRow || declaredInput) &&
        !declaredInput.readOnly &&
        !declaredInput.disabled
    ) {
        try {
            declaredInput.focus({ preventScroll: true });
            declaredInput.select?.();
            return;
        } catch (_) {
            return;
        }
    }

    if (
        declaredCardInput &&
        isElementVisibleForCloseShiftFlow(declaredCardRow || declaredCardInput) &&
        !declaredCardInput.readOnly &&
        !declaredCardInput.disabled
    ) {
        try {
            declaredCardInput.focus({ preventScroll: true });
            declaredCardInput.select?.();
        } catch (_) {
        }
    }
}

function setupCloseShiftDialogInputFlow() {
    if (window.__cutCloseShiftInputFlowInit) return;
    window.__cutCloseShiftInputFlowInit = true;

    const declaredInput = document.getElementById('cut-declared-amount');
    if (!declaredInput) return;

    declaredInput.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        event.stopPropagation();

        const declaredCardInput = document.getElementById('cut-declared-card-amount');
        const declaredCardRow = document.getElementById('cut-declared-card-row');
        if (
            declaredCardInput &&
            isElementVisibleForCloseShiftFlow(declaredCardRow || declaredCardInput) &&
            !declaredCardInput.readOnly &&
            !declaredCardInput.disabled
        ) {
            try {
                declaredCardInput.focus({ preventScroll: true });
                declaredCardInput.select?.();
            } catch (_) {
            }
        }
    });
}

async function openCloseShiftDialog() {
    if (!hasUserPermission('corte_turno')) {
        return;
    }
    if (!cutCloseContext.sessionResumenLoaded) {
        alert('Primero carga el resumen de sesion antes de cerrar turno.');
        return;
    }
    const overlay = document.getElementById('cut-close-popup');
    if (!overlay) return;
    const cutSettings = await fetchCutSettingsForShift();
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    applyCloseShiftModeUI(cutSettings.mode);
    setupCloseShiftDialogInputFlow();
    setTimeout(() => {
        focusCloseShiftDeclaredInputs();
    }, 0);
}

function closeCloseShiftDialog() {
    const overlay = document.getElementById('cut-close-popup');
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.style.display = '';
}

async function confirmCloseShiftFromDialog() {
    if (isClosingShift) {
        return;
    }
    const declaredInput = document.getElementById('cut-declared-amount');
    const declaredCardInput = document.getElementById('cut-declared-card-amount');
    const declarado = Number(declaredInput?.value || 0);
    const declaradoTarjeta = Number(declaredCardInput?.value || 0);
    await closeCurrentShift(declarado, declaradoTarjeta);
}

async function fetchCutSettingsForShift() {
    try {
        const response = await fetch(API_URL + 'api/cut-settings', {
            headers: withAuthHeaders(),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return { mode: 'ajuste_auto' };
        }
        return {
            mode: data.mode === 'sin_ajuste' ? 'sin_ajuste' : 'ajuste_auto',
        };
    } catch (error) {
        return { mode: 'ajuste_auto' };
    }
}

async function closeCurrentShift(declaredOverride = null, declaredCardOverride = null) {
    if (isClosingShift) {
        return;
    }
    isClosingShift = true;
    const confirmBtn = document.getElementById('cut-confirm-close-btn');
    if (confirmBtn) confirmBtn.disabled = true;

    const caja = localStorage.getItem('n_caja');
    const cajero = localStorage.getItem('id_user');
    const montoInicialInput = document.getElementById('cut-initial-amount');
    const obsInput = document.getElementById('cut-notes');
    const montoInicial = Number(localStorage.getItem('turno_monto_inicial') || montoInicialInput?.value || 0);
    const montoDeclarado = declaredOverride === null
        ? Number(document.getElementById('cut-declared-amount')?.value || 0)
        : Number(declaredOverride);
    const montoDeclaradoTarjeta = declaredCardOverride === null
        ? Number(document.getElementById('cut-declared-card-amount')?.value || 0)
        : Number(declaredCardOverride);
    const observaciones = (obsInput?.value || '').trim();
    const cutSettings = await fetchCutSettingsForShift();
    const usesAutoAdjust = cutSettings.mode !== 'sin_ajuste';

    if (!caja || !cajero) {
        alert('No hay sesión de caja/cajero activa.');
        isClosingShift = false;
        if (confirmBtn) confirmBtn.disabled = false;
        return;
    }
    if (!Number.isFinite(montoInicial) || montoInicial < 0) {
        alert('Monto inicial inválido.');
        isClosingShift = false;
        if (confirmBtn) confirmBtn.disabled = false;
        return;
    }
    if (usesAutoAdjust && (!Number.isFinite(montoDeclarado) || montoDeclarado < 0)) {
        alert('Monto declarado inválido.');
        isClosingShift = false;
        if (confirmBtn) confirmBtn.disabled = false;
        return;
    }
    if (usesAutoAdjust && (!Number.isFinite(montoDeclaradoTarjeta) || montoDeclaradoTarjeta < 0)) {
        alert('Monto declarado de tarjeta inválido.');
        isClosingShift = false;
        if (confirmBtn) confirmBtn.disabled = false;
        return;
    }

    try {
        const shiftSalesKey = buildShiftSalesStorageKey();
        const response = await fetch(API_URL+'api/corte/cerrar', {
            method: 'POST',
            headers: {
                ...withAuthHeaders({
                    'Content-Type': 'application/json',
                }),
            },
            body: JSON.stringify({
                numero_caja: caja,
                cajero,
                monto_inicial: montoInicial,
                monto_declarado: usesAutoAdjust ? montoDeclarado : 0,
                monto_declarado_tarjeta: usesAutoAdjust ? montoDeclaradoTarjeta : 0,
                observaciones,
            }),
        });
        const data = await response.json();

        if (!response.ok) {
            alert(data.message || 'No se pudo cerrar el turno');
            isClosingShift = false;
            if (confirmBtn) confirmBtn.disabled = false;
            return;
        }

        const diff = Number(data.diferencia_efectivo || 0);
        if (usesAutoAdjust) {
            const diffCard = Number(data.diferencia_tarjeta || 0);
            alert(`Turno cerrado: total ${Number(data.total_ventas || 0).toFixed(0)} en ${data.transacciones || 0} ventas. Diferencia efectivo: ${diff >= 0 ? '+' : ''}${diff.toFixed(0)}. Diferencia tarjeta: ${diffCard >= 0 ? '+' : ''}${diffCard.toFixed(0)}`);
        } else {
            alert(`Turno cerrado: total ${Number(data.total_ventas || 0).toFixed(0)} en ${data.transacciones || 0} ventas.`);
        }
        closeCloseShiftDialog();
        shiftStarted = false;
        clearLocalShiftContext();
        if (shiftSalesKey) {
            localStorage.removeItem(shiftSalesKey);
        }
        setSalesEnabledByShift(false);
        cutCloseContext = {
            scope: null,
            esperadoEfectivo: 0,
            esperadoTarjeta: 0,
            resumenLoaded: false,
            sessionResumenLoaded: false,
            turnStatusLabel: '',
            currentDate: new Date().toISOString().slice(0, 10),
            sessionReportSnapshot: null,
            historicalCutId: null,
        };
        refreshCutCloseButtonState();
        const scopeInfo = document.getElementById('cut-close-scope-info');
        const breakdownList = document.getElementById('cut-close-breakdown');
        const detailBody = document.getElementById('cut-close-detail-body');
        const salesKpi = document.getElementById('cut-kpi-sales-total');
        const profitKpi = document.getElementById('cut-kpi-profit-total');
        const cashList = document.getElementById('cut-cash-detail-list');
        const cashTotal = document.getElementById('cut-cash-total');
        const profitList = document.getElementById('cut-profit-detail-list');
        const profitTotal = document.getElementById('cut-profit-total');
        const mixedSummaryList = document.getElementById('cut-mixed-summary-list');
        const mixedSummaryTotal = document.getElementById('cut-mixed-summary-total');
        const incomeList = document.getElementById('cut-session-income-list');
        const expenseList = document.getElementById('cut-session-expense-list');
        const departmentList = document.getElementById('cut-department-list');
        const departmentTotal = document.getElementById('cut-department-total');
        const mixedTicketList = document.getElementById('cut-mixed-ticket-list');
        const mixedTicketTotal = document.getElementById('cut-mixed-ticket-total');
        const topProductsByDepartmentList = document.getElementById('cut-top-products-by-department');
        if (scopeInfo) scopeInfo.textContent = 'Selecciona una opcion para cargar el resumen de ventas.';
        if (breakdownList) breakdownList.innerHTML = '';
        if (detailBody) detailBody.innerHTML = '';
        if (salesKpi) salesKpi.textContent = '$0';
        if (profitKpi) profitKpi.textContent = '$0';
        if (cashList) cashList.innerHTML = '';
        if (cashTotal) cashTotal.textContent = '';
        if (profitList) profitList.innerHTML = '';
        if (profitTotal) profitTotal.textContent = '';
        if (mixedSummaryList) mixedSummaryList.innerHTML = '';
        if (mixedSummaryTotal) mixedSummaryTotal.textContent = '';
        if (incomeList) incomeList.innerHTML = '';
        if (expenseList) expenseList.innerHTML = '';
        if (departmentList) departmentList.innerHTML = '';
        if (departmentTotal) departmentTotal.textContent = '';
        if (mixedTicketList) mixedTicketList.innerHTML = '';
        if (mixedTicketTotal) mixedTicketTotal.textContent = '';
        if (topProductsByDepartmentList) topProductsByDepartmentList.innerHTML = '';
        try {
            await deleteConnectedUser();
        } catch (logoutError) {
            console.error('Error during disconnect after shift close:', logoutError);
        }
        clearSessionTokens();
        localStorage.removeItem('id_user');
        localStorage.removeItem('user_permissions');
        localStorage.removeItem('user_is_admin');
        localStorage.removeItem('estado_login');
        window.location.href = 'index.php';
        return;
    } catch (error) {
        console.error('Error closing shift:', error);
        alert('Error al cerrar el turno.');
        isClosingShift = false;
        if (confirmBtn) confirmBtn.disabled = false;
    }
}

/* consulta el servidor para obtener la cantidad de equipos conectados.
async function getConnectedDevices() {
    try {
        const response = await fetch(API_URL+'devices'); // Consultar al backend
        const data = await response.json();
        return (parseInt(data.connected));
    } catch (error) {
        console.error("Error al obtener la cantidad de dispositivos:", error);
    }
}*/

// Llamar a la funciÃ³n cada 5 segundos para actualizar el nÃºmero de equipos conectados
//setInterval(getConnectedDevices, 5000);


// Llamar una vez al cargar la pÃ¡gina
//document.addEventListener('DOMContentLoaded', getConnectedDevices);

/*document.getElementById("info").textContent =
                `Sistema Operativo: ${getDeviceInfo().sistemaOperativo}, ` +
                `Dispositivo: ${getDeviceInfo().tipoDispositivo}, ` +
                `Navegador: ${getDeviceInfo().navegador}`;

*/

//-------------muestra los popup de la vista de configuracion en una ventana nueva
function mostrarPopUp(popUp) {
    //console.log("mostrar popup");
  if (popUp === 'miPopUp' && !hasUserPermission('ventas_cobrar_ticket')) {
    return;
  }
  if (popUp === 'miPopUp' && getCartTotalAmount() <= 0) {
    return;
  }
  if (popUp === 'miPopUp' && typeof window.reloadSalePaymentSettings === 'function') {
    window.reloadSalePaymentSettings();
  }
  clearPaymentWarning();
  const popupElement = document.getElementById(popUp);
  if (!popupElement) return;
  popupElement.classList.remove("hidden");
  if (popUp === 'miPopUp' && typeof window.prefillSaleCashPaymentFromTotal === 'function') {
    window.prefillSaleCashPaymentFromTotal({ select: false });
  }
  if (popUp === 'miPopUp' && typeof window.focusSalePaymentTabsForKeyboard === 'function') {
    window.focusSalePaymentTabsForKeyboard();
  }
}

function isEditableElementForScannerFocus(element) {
    const target = element || document.activeElement;
    if (!target) return false;
    if (target.isContentEditable) return true;
    const tag = String(target.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
}

function isSalesSectionVisibleForScanner() {
    const salesSection = document.getElementById('sales');
    if (!salesSection) return false;
    return !salesSection.classList.contains('hidden');
}

function isAnyBlockingPopupVisibleForScanner() {
    const candidates = Array.from(document.querySelectorAll('#mm-alert-overlay, #embedded-popup-overlay, [id$="PopUp"], [id$="Popup"], #cut-history-popup, #cut-close-popup, #cut-rebuild-popup, #cut-rebuild-cuts-popup'));
    return candidates.some((el) => {
        if (!el) return false;
        if (el.id === 'sales-barcode-suggestions') return false;
        return isPopupElementVisible(el);
    });
}

function focusBarcodeInputForNextScan(options = {}) {
    const select = options?.select !== false;
    const force = Boolean(options?.force);
    const delay = Number.isFinite(Number(options?.delay)) ? Number(options.delay) : 0;
    const barcodeInput = document.getElementById('barcode');
    if (!barcodeInput) return;

    const runFocus = () => {
        if (!force) {
            if (!isSalesSectionVisibleForScanner()) return;
            if (isAnyBlockingPopupVisibleForScanner()) return;
            const activeEl = document.activeElement;
            if (activeEl && activeEl !== barcodeInput && isEditableElementForScannerFocus(activeEl)) return;
        }
        if (barcodeInput.disabled) return;
        try {
            barcodeInput.focus({ preventScroll: true });
            if (select) {
                barcodeInput.select?.();
            }
        } catch (_) {
        }
    };

    setTimeout(runFocus, Math.max(0, delay));
}
window.focusBarcodeInputForNextScan = focusBarcodeInputForNextScan;

function setupSalesScannerStickyFocus() {
    if (window.__salesScannerStickyFocusInit) return;
    window.__salesScannerStickyFocusInit = true;

    const queueFocus = () => {
        focusBarcodeInputForNextScan({ select: false, delay: 0 });
    };

    document.addEventListener('click', (event) => {
        if (!isSalesSectionVisibleForScanner()) return;
        const target = event.target;
        if (!target) return;
        if (isEditableElementForScannerFocus(target)) return;
        if (target.closest?.('#mm-alert-overlay, #embedded-popup-overlay, [id$="PopUp"], [id$="Popup"], #cut-history-popup, #cut-close-popup, #cut-rebuild-popup, #cut-rebuild-cuts-popup')) return;
        queueFocus();
    }, true);

    document.addEventListener('keyup', (event) => {
        if (!isSalesSectionVisibleForScanner()) return;
        if (isAnyBlockingPopupVisibleForScanner()) return;
        const key = String(event.key || '').toLowerCase();
        if (['shift', 'control', 'alt', 'meta', 'capslock', 'tab'].includes(key)) return;
        const target = event.target;
        if (target && isEditableElementForScannerFocus(target)) return;
        queueFocus();
    }, true);

    window.addEventListener('focus', () => {
        queueFocus();
    });
}

//-------------oculta los popup de la vista de configuracion de una ventana abierta
function cerrarPopUp(popUp) {
    //console.log("cerrar popup");
  clearPaymentWarning();
  document.getElementById(popUp).classList.add("hidden");
  focusBarcodeInputForNextScan();
}

function mostrarMensaje(mensaje) {
    //console.log("mensaje popup");
  document.getElementById("mensajePopUp").textContent = mensaje;
  mostrarPopUp();
}

function persistLocalUserSessionSnapshot(usernameInput, loginData) {
    const userId = Number(loginData?.id || 0);
    if (!userId) return;
    const snapshot = {
        id: userId,
        username_login: String(usernameInput || '').trim(),
        nombre: String(loginData?.username || '').trim(),
        caja: String(localStorage.getItem('n_caja') || '').trim(),
        primer_login_local: localStorage.getItem('user_profile') ? null : new Date().toISOString(),
        ultimo_login_local: new Date().toISOString(),
    };
    localStorage.setItem('user_profile', JSON.stringify(snapshot));
}

// -------------valida y crea la sesion del usuario
async function login(){
    const username = (document.getElementById('username').value || '').trim();
    const password = document.getElementById('password').value || '';
    const numeroCaja = String(localStorage.getItem('n_caja') || '').trim();
    const deviceHash = String(localStorage.getItem('device_fp') || '').trim();
    const turnoOwnerCaja = String(localStorage.getItem('turno_owner_caja') || '').trim();
    const turnoOwnerUser = String(localStorage.getItem('turno_owner_user') || '').trim();
    const loginError = document.getElementById('login-error');
    if (loginError) {
        loginError.classList.add('hidden');
        loginError.textContent = '';
    }
    if (!username || !password) {
        if (loginError) {
            loginError.textContent = 'Debe ingresar usuario y contraseña.';
            loginError.classList.remove('hidden');
        }
        return;
    }
    try {
        const response = await fetch(API_URL +'api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, numero_caja: numeroCaja || null, device_hash: deviceHash || null }),
        });

        if (response.ok) {
          const data = await response.json();
          const loggedUserId = String(Number(data?.id || 0) || '');
          if (numeroCaja && turnoOwnerCaja === numeroCaja && turnoOwnerUser && loggedUserId && turnoOwnerUser !== loggedUserId) {
            if (loginError) {
                loginError.textContent = 'Caja con turno abierto: solo el cajero que abrio el turno puede ingresar hasta cerrar caja.';
                loginError.classList.remove('hidden');
            }
            return;
          }
          // Guardar token o sesiÃ³n
          setSessionTokens(data.token, data.refresh_token || null);
          localStorage.setItem('user', username);// Opcional: guardar el nombre de usuario
          localStorage.setItem('id_user', data.id);
          localStorage.setItem('username', data.username);
          localStorage.setItem('estado_login','1');
          localStorage.setItem('user_is_admin', String(Number(data.es_administrador || 0)));
          localStorage.setItem('user_permissions', JSON.stringify(data.permisos || {}));
          persistLocalUserSessionSnapshot(username, data);
          localStorage.setItem('user_sync_pending', '1');

          try {
            await addConnectedUser();
            await updateUser();
            localStorage.removeItem('user_sync_pending');
          } catch (sessionError) {
            console.warn('No se pudo sincronizar estado de sesion, se continuara con el login:', sessionError);
          }

          /*console.log(`token: ${data.token}`);
          console.log(`user: ${username}`);
          console.log(`id_user: ${data.id}`);
          console.log(`username: ${data.username}`);
          */
          window.location.href = 'home.php'; // Redirigir al sistema principal
        } else {
            const errorData = await response.json().catch(() => ({}));
            if (loginError) {
                loginError.textContent = errorData.message || 'Usuario o contraseña incorrecta.';
                loginError.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Error during login:', error);
        if (loginError) {
            loginError.textContent = 'No se pudo conectar con el servidor de login.';
            loginError.classList.remove('hidden');
        }
    }
}
                  
// -------------------------PRODUCTOS (V2)-------------------------
let selectedProductForModify = null;
let selectedProductForDelete = null;
let selectedCatalogProductCode = '';
let catalogRowsCache = [];
let selectedPromotionProductIds = new Set();
let promotionRowsCache = [];
let promotionEditingId = null;
let promotionProductsCatalogCache = null;
let promotionProductsLoadPromise = null;
let promotionProductsSelectHydrated = false;
let selectedInventoryProduct = null;
let selectedInventoryAdjustProduct = null;
let shoppingOrderState = { order: null, items: [] };
let shoppingReceiveState = { selectedOrderId: null, selectedOrder: null, pendingOrders: [], items: [] };

function isSessionAdminSiaUser() {
    const byLogin = String(localStorage.getItem('user') || '').trim().toLowerCase();
    if (byLogin === 'admin_sia') return true;
    try {
        const raw = localStorage.getItem('user_profile');
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        const byProfileLogin = String(parsed?.username_login || '').trim().toLowerCase();
        return byProfileLogin === 'admin_sia';
    } catch (_) {
        return false;
    }
}

function applyAdminSiaOnlyProductsActionsVisibility() {
    const canView = isSessionAdminSiaUser();
    document.querySelectorAll('button[data-admin-sia-only="1"], a[data-admin-sia-only="1"], [role="button"][data-admin-sia-only="1"]').forEach((control) => {
        control.classList.toggle('hidden', !canView);
    });
}

function parseLocalBoolFlexible(key) {
    const raw = String(localStorage.getItem(key) || '').trim().toLowerCase();
    return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function getConfiguredDefaultProfitPercent() {
    const marginEnabled = parseLocalBoolFlexible('margen_ganancia');
    const storedAmount = Number(localStorage.getItem('monto_ganancia'));
    if (!marginEnabled) return 0;
    if (!Number.isFinite(storedAmount) || storedAmount < 0) return 0;
    return storedAmount;
}

async function syncProfitConfigFromServer() {
    try {
        const rows = await getInfo();
        const current = Array.isArray(rows) && rows.length ? rows[0] : null;
        if (!current) return;
        const enabled = Boolean(Number(current.margen_ganancia || 0));
        const amount = Number(current.monto_ganancia || 0);
        localStorage.setItem('margen_ganancia', enabled ? 'true' : 'false');
        localStorage.setItem('monto_ganancia', String(Number.isFinite(amount) && amount > 0 ? amount : 0));
        applyDefaultProfitToProductForms();
    } catch (_) {
        // Silencioso: se mantiene localStorage actual.
    }
}

function applyDefaultProfitToProductForms() {
    const defaultProfit = getConfiguredDefaultProfitPercent();
    const addProfitInput = document.getElementById('product-ganancia');
    const editProfitInput = document.getElementById('product-edit-profit');
    if (addProfitInput) addProfitInput.value = String(defaultProfit);
    if (editProfitInput && !selectedProductForModify) editProfitInput.value = String(defaultProfit);
    updateSalePriceByMargin('product-costo', 'product-ganancia', 'product-price');
    if (!selectedProductForModify) {
        updateSalePriceByMargin('product-edit-cost', 'product-edit-profit', 'product-edit-price');
    }
}

function syncAddInventoryFieldsState() {
    const useInventory = document.getElementById('product-use-inventory');
    const qtyInput = document.getElementById('product-quantity');
    const minInput = document.getElementById('product-quantity-min');
    const maxInput = document.getElementById('product-quantity-max');
    if (!useInventory || !qtyInput || !minInput || !maxInput) return;

    const enabled = Boolean(useInventory.checked);
    [qtyInput, minInput, maxInput].forEach((input) => {
        input.disabled = !enabled;
        if (!enabled) input.value = '0';
    });
}

function refreshSuppliersOnProductContext() {
    const addSection = document.getElementById('add');
    const modifySection = document.getElementById('modify');
    const addVisible = addSection && !addSection.classList.contains('hidden');
    const modifyVisible = modifySection && !modifySection.classList.contains('hidden');
    if (addVisible || modifyVisible) {
        loadProductSupplierOptions().catch(() => {});
    }
}

function setupAddInventoryToggle() {
    const useInventory = document.getElementById('product-use-inventory');
    if (!useInventory) return;
    useInventory.addEventListener('change', syncAddInventoryFieldsState);
    syncAddInventoryFieldsState();
}

function normalizeText(value) {
    return String(value || '').trim();
}

function toIntOrNull(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toDecimalOrNull(value, decimals = 2) {
    const normalized = String(value ?? '').replace(',', '.').trim();
    if (!normalized) return null;
    const n = Number(normalized);
    if (!Number.isFinite(n)) return null;
    const factor = 10 ** Math.max(0, Number(decimals) || 0);
    return Math.round(n * factor) / factor;
}

function toPositiveIntOrNull(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    const parsed = Math.trunc(n);
    return parsed > 0 ? parsed : null;
}

function normalizeSaleFormatValue(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return '';
    if (['unidad', 'unidades', 'botella', 'botellas'].includes(normalized)) return 'unidad';
    if (['granel', 'kilo', 'kilos', 'kg', 'kilogramo', 'kilogramos'].includes(normalized)) return 'granel';
    if (['pack', 'paquete', 'paquetes'].includes(normalized)) return 'pack';
    return normalized;
}

function resolveProductSaleFormat(product) {
    const byName = normalizeSaleFormatValue(product?.formato_venta || '');
    if (byName) return byName;
    return 'unidad';
}

function isBulkSaleProduct(product) {
    return resolveProductSaleFormat(product) === 'granel';
}

function parseWeightInputToGrams(value) {
    const normalized = String(value ?? '')
        .replace(',', '.')
        .replace(/[^0-9.\-]/g, '')
        .trim();
    if (!normalized) return 0;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatKgQuantity(value) {
    const qty = Number(value || 0);
    if (!Number.isFinite(qty) || qty <= 0) return '0 kg';
    return `${qty.toFixed(3)} kg`;
}

function formatGramQuantityFromKg(value) {
    const qty = Number(value || 0);
    if (!Number.isFinite(qty) || qty <= 0) return '0 g';
    const grams = Math.round(qty * 1000);
    return `${grams.toLocaleString('es-CL')} g`;
}

function calculateSalePriceFromCost(costValue, profitPercentValue) {
    const cost = Number(costValue);
    const profit = Number(profitPercentValue);
    if (!Number.isFinite(cost) || cost < 0) return null;
    const safeProfit = Number.isFinite(profit) && profit >= 0 ? profit : 0;
    return Math.round(cost * (1 + (safeProfit / 100)));
}

function updateSalePriceByMargin(costInputId, profitInputId, salePriceInputId) {
    const costInput = document.getElementById(costInputId);
    const profitInput = document.getElementById(profitInputId);
    const salePriceInput = document.getElementById(salePriceInputId);
    if (!costInput || !profitInput || !salePriceInput) return;
    const computed = calculateSalePriceFromCost(costInput.value, profitInput.value);
    if (computed === null) return;
    salePriceInput.value = String(computed);
}

function updateProfitBySalePrice(costInputId, salePriceInputId, profitInputId) {
    const costInput = document.getElementById(costInputId);
    const salePriceInput = document.getElementById(salePriceInputId);
    const profitInput = document.getElementById(profitInputId);
    if (!costInput || !salePriceInput || !profitInput) return;

    const cost = Number(costInput.value);
    const salePrice = Number(salePriceInput.value);
    if (!Number.isFinite(cost) || cost <= 0 || !Number.isFinite(salePrice)) {
        return;
    }

    const rawPercent = ((salePrice - cost) / cost) * 100;
    const normalizedPercent = Math.max(0, rawPercent);
    profitInput.value = String(Number(normalizedPercent.toFixed(2)));
}

function setupProductPriceAutoCalc() {
    const bindings = [
        { costId: 'product-costo', profitId: 'product-ganancia', saleId: 'product-price' },
        { costId: 'product-edit-cost', profitId: 'product-edit-profit', saleId: 'product-edit-price' },
        { costId: 'inventory-product-cost', profitId: 'inventory-product-profit', saleId: 'inventory-product-sale' },
        { costId: 'inventory-adjust-cost', profitId: 'inventory-adjust-profit', saleId: 'inventory-adjust-sale' },
    ];
    bindings.forEach((bind) => {
        const costInput = document.getElementById(bind.costId);
        const profitInput = document.getElementById(bind.profitId);
        const saleInput = document.getElementById(bind.saleId);
        if (!costInput || !profitInput) return;
        const recalc = () => updateSalePriceByMargin(bind.costId, bind.profitId, bind.saleId);
        costInput.addEventListener('input', recalc);
        profitInput.addEventListener('input', recalc);
        if (saleInput) {
            saleInput.addEventListener('input', () => updateProfitBySalePrice(bind.costId, bind.saleId, bind.profitId));
            saleInput.addEventListener('change', () => updateProfitBySalePrice(bind.costId, bind.saleId, bind.profitId));
        }
    });
}

function toTitleCaseWords(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/\b([a-z\u00c0-\u00ff])/g, (match) => match.toUpperCase());
}

function setupProductDescriptionTitleCase() {
    const fields = ['product-name', 'product-edit-name'];
    fields.forEach((id) => {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('input', () => {
            const start = input.selectionStart;
            const formatted = toTitleCaseWords(input.value);
            if (formatted !== input.value) {
                input.value = formatted;
                if (typeof start === 'number') {
                    input.setSelectionRange(start, start);
                }
            }
        });
    });
}

function getProductSearchDatalist() {
    return document.getElementById('product-search-options');
}

function fillProductSearchDatalist(rows) {
    const datalist = getProductSearchDatalist();
    if (!datalist) return;
    datalist.innerHTML = '';
    (rows || []).forEach((row) => {
        const code = normalizeText(row.codigo_barras);
        const desc = normalizeText(row.descripcion);
        if (!code && !desc) return;
        const option = document.createElement('option');
        option.value = code || desc;
        option.label = code && desc ? `${code} - ${desc}` : (code || desc);
        datalist.appendChild(option);
    });
}

async function searchProductsForInput(query) {
    const q = normalizeText(query);
    if (!q) return [];
    const response = await fetch(API_URL + `api/productos/search?q=${encodeURIComponent(q)}`, {
        headers: withAuthHeaders(),
    });
    if (!response.ok) return [];
    const rows = await response.json().catch(() => []);
    return Array.isArray(rows) ? rows : [];
}

async function findProductByCodeOrText(inputValue) {
    const query = normalizeText(inputValue);
    if (!query) return null;

    const byCodeResponse = await fetch(API_URL + `api/productos/code/${encodeURIComponent(query)}`, {
        headers: withAuthHeaders(),
    });
    const byCodeData = await byCodeResponse.json().catch(() => ({}));
    if (byCodeResponse.ok && byCodeData?.found && byCodeData?.product) {
        return byCodeData.product;
    }

    const matches = await searchProductsForInput(query);
    return matches.length ? matches[0] : null;
}

async function loadDepartmentOptions(targetId, selectedName = '') {
    const select = document.getElementById(targetId);
    if (!select) return;
    try {
        const response = await fetch(API_URL + 'api/departamentos', {
            headers: withAuthHeaders(),
        });
        const rows = await response.json().catch(() => []);
        const list = Array.isArray(rows) ? rows : [];
        select.innerHTML = list.map((row) => {
            const name = normalizeText(row.nombre || row.departamento || '');
            const selected = normalizeText(selectedName) === name ? ' selected' : '';
            return `<option value="${name}"${selected}>${name}</option>`;
        }).join('');
    } catch (_) {
        select.innerHTML = '';
    }
}

async function loadProductSupplierOptions() {
    const targets = ['product-supplier', 'product-supplier-edit'];
    let rows = [];
    try {
        const response = await fetch(API_URL + 'api/service-suppliers', {
            headers: withAuthHeaders(),
        });
        rows = await response.json().catch(() => []);
        if (!response.ok || !Array.isArray(rows)) rows = [];
    } catch (_) {
        rows = [];
    }

    targets.forEach((id) => {
        const select = document.getElementById(id);
        if (!select) return;
        const previous = String(select.value || '');
        const html = ['<option value="">Sin proveedor</option>'];
        rows.forEach((row) => {
            const supplierId = Number(row.id || 0);
            const name = normalizeText(row.name);
            if (!supplierId || !name) return;
            html.push(`<option value="${supplierId}">${name}</option>`);
        });
        select.innerHTML = html.join('');
        if (previous && select.querySelector(`option[value="${previous}"]`)) {
            select.value = previous;
        }
    });
}

function isPromotionSectionVisible() {
    const section = document.getElementById('promo');
    return Boolean(section && !section.classList.contains('hidden') && section.offsetParent !== null);
}

function invalidatePromotionProductsCache(options = {}) {
    const refreshIfVisible = Boolean(options.refreshIfVisible);
    promotionProductsCatalogCache = null;
    promotionProductsSelectHydrated = false;
    if (refreshIfVisible && isPromotionSectionVisible()) {
        loadPromotionProductsSelect({ forceReload: true }).catch(() => {});
    }
}

async function fetchPromotionProductsCatalog(forceReload = false) {
    if (!forceReload && Array.isArray(promotionProductsCatalogCache)) {
        return promotionProductsCatalogCache;
    }
    if (!forceReload && promotionProductsLoadPromise) {
        return promotionProductsLoadPromise;
    }

    promotionProductsLoadPromise = (async () => {
        const response = await fetch(API_URL + 'api/productos', {
            headers: withAuthHeaders(),
        });
        const rows = await response.json().catch(() => []);
        const list = Array.isArray(rows) ? rows : [];
        promotionProductsCatalogCache = list;
        return list;
    })().finally(() => {
        promotionProductsLoadPromise = null;
    });

    return promotionProductsLoadPromise;
}

async function loadPromotionProductsSelect(options = {}) {
    const select = document.getElementById('promo-products');
    if (!select) return;

    const normalizedOptions = (typeof options === 'boolean')
        ? { forceReload: options }
        : (options || {});
    const forceReload = Boolean(normalizedOptions.forceReload);

    if (promotionProductsSelectHydrated && !forceReload) {
        renderPromotionSelectedProducts();
        return;
    }

    if (!promotionProductsSelectHydrated || forceReload) {
        select.innerHTML = '<option value="">Cargando productos...</option>';
    }

    try {
        const list = await fetchPromotionProductsCatalog(forceReload);
        const previous = String(select.value || '');
        const optionsHtml = ['<option value="">Selecciona un producto para agregar</option>'];

        list.forEach((row) => {
            const id = Number(row.id_producto || 0);
            const code = normalizeText(row.codigo_barras);
            const desc = normalizeText(row.descripcion);
            const unitPrice = Math.max(0, roundClpAmount(Number(row.precio_venta || 0)));
            if (!id || !desc) return;
            const label = `${code ? `${code} - ` : ''}${desc}`;
            optionsHtml.push(`<option value="${id}" data-price="${unitPrice}">${escapeHtml(label)}</option>`);
        });

        select.innerHTML = optionsHtml.join('');
        if (previous && select.querySelector(`option[value="${previous}"]`)) {
            select.value = previous;
        } else {
            select.value = '';
        }
        promotionProductsSelectHydrated = true;
        renderPromotionSelectedProducts();
        refreshSinglePromotionDiscountFromTotal({ keepDiscountOnMissing: true });
    } catch (_) {
        select.innerHTML = '<option value="">No se pudieron cargar productos</option>';
    }
}

function renderPromotionSelectedProducts() {
    const list = document.getElementById('promo-selected-products');
    const select = document.getElementById('promo-products');
    if (!list || !select) return;
    list.innerHTML = '';
    const ids = Array.from(selectedPromotionProductIds);
    if (!ids.length) {
        const li = document.createElement('li');
        li.textContent = 'Sin productos seleccionados.';
        list.appendChild(li);
        return;
    }

    ids.forEach((id) => {
        const option = select.querySelector(`option[value="${id}"]`);
        const label = option ? option.textContent : `Producto ${id}`;
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.gap = '8px';
        li.innerHTML = `<span>${escapeHtml(label)}</span><button class="btn" type="button" data-remove-promo-id="${id}">Quitar</button>`;
        list.appendChild(li);
    });

    list.querySelectorAll('button[data-remove-promo-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = Number(btn.dataset.removePromoId || 0);
            if (id > 0) {
                selectedPromotionProductIds.delete(id);
                renderPromotionSelectedProducts();
                refreshSinglePromotionDiscountFromTotal();
            }
        });
    });
}

function addSelectedPromotionProduct() {
    const select = document.getElementById('promo-products');
    if (!select) return;
    const id = Number(select.value || 0);
    if (!id) return;
    const promoType = String(document.getElementById('promo-type')?.value || 'single');
    if (promoType === 'single') {
        selectedPromotionProductIds = new Set([id]);
    } else {
        selectedPromotionProductIds.add(id);
    }
    select.value = '';
    renderPromotionSelectedProducts();
    refreshSinglePromotionDiscountFromTotal();
}

function clearPromotionSelection() {
    selectedPromotionProductIds = new Set();
    const select = document.getElementById('promo-products');
    if (select) select.value = '';
    renderPromotionSelectedProducts();
    refreshSinglePromotionDiscountFromTotal();
}

function parseSinglePromotionPattern(name = '') {
    const raw = String(name || '').trim();
    if (!raw) return null;
    const match = raw.match(/(\d+)\s*x\s*(\d+)/i);
    if (!match) return null;
    const buyQty = Number(match[1] || 0);
    const payQty = Number(match[2] || 0);
    if (!Number.isFinite(buyQty) || !Number.isFinite(payQty) || buyQty < 2 || payQty < 1 || payQty >= buyQty) {
        return null;
    }
    const discountPercent = Math.round(((1 - (payQty / buyQty)) * 100) * 100) / 100;
    if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent >= 100) {
        return null;
    }
    return {
        minQty: Math.trunc(buyQty),
        discountPercent,
        payQty: Math.trunc(payQty),
    };
}

function getPrimarySelectedPromotionProductId() {
    const ids = Array.from(selectedPromotionProductIds || [])
        .map((id) => Number(id || 0))
        .filter((id) => Number.isInteger(id) && id > 0);
    return ids.length ? ids[0] : 0;
}

function getPromotionProductUnitPrice(productId) {
    const id = Number(productId || 0);
    if (!id) return 0;
    if (Array.isArray(promotionProductsCatalogCache)) {
        const row = promotionProductsCatalogCache.find((item) => Number(item?.id_producto || 0) === id);
        if (row) return Math.max(0, roundClpAmount(Number(row.precio_venta || 0)));
    }
    const select = document.getElementById('promo-products');
    const option = select?.querySelector?.(`option[value="${id}"]`);
    if (option) {
        return Math.max(0, roundClpAmount(Number(option.dataset?.price || 0)));
    }
    return 0;
}

function calculateDiscountPercentFromPromotionTotal(totalAmountValue, unitPriceValue, minQtyValue) {
    const totalAmount = Math.max(0, Number(totalAmountValue || 0));
    const unitPrice = Math.max(0, Number(unitPriceValue || 0));
    const minQty = Math.max(0, Number(minQtyValue || 0));
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) return null;
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) return null;
    if (!Number.isFinite(minQty) || minQty < 2) return null;
    const baseTotal = Math.max(0, roundClpAmount(unitPrice * minQty));
    if (baseTotal <= 0 || totalAmount >= baseTotal) return null;
    const discount = ((baseTotal - totalAmount) / baseTotal) * 100;
    const rounded = Math.round(discount * 100) / 100;
    return Number.isFinite(rounded) && rounded > 0 && rounded < 100 ? rounded : null;
}

function calculatePromotionTotalFromDiscount(discountPercentValue, unitPriceValue, minQtyValue) {
    const discountPercent = Number(discountPercentValue || 0);
    const unitPrice = Math.max(0, Number(unitPriceValue || 0));
    const minQty = Math.max(0, Number(minQtyValue || 0));
    if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent >= 100) return null;
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) return null;
    if (!Number.isFinite(minQty) || minQty < 2) return null;
    const baseTotal = Math.max(0, roundClpAmount(unitPrice * minQty));
    const total = Math.max(1, roundClpAmount(baseTotal * (1 - (discountPercent / 100))));
    if (total >= baseTotal) return null;
    return total;
}

function refreshSinglePromotionDiscountFromTotal(options = {}) {
    const keepDiscountOnMissing = Boolean(options.keepDiscountOnMissing);
    const syncTotalFromDiscount = Boolean(options.syncTotalFromDiscount);
    const promoType = String(document.getElementById('promo-type')?.value || 'single');
    const minQty = toIntOrNull(document.getElementById('promo-min-qty')?.value);
    const totalInput = document.getElementById('promo-total-amount');
    const discountInput = document.getElementById('promo-discount');
    if (!totalInput || !discountInput) return;

    if (promoType !== 'single') {
        if (!keepDiscountOnMissing) discountInput.value = '0';
        return;
    }

    const productId = getPrimarySelectedPromotionProductId();
    const unitPrice = getPromotionProductUnitPrice(productId);
    if (!productId || !unitPrice || !minQty || minQty < 2) {
        if (!keepDiscountOnMissing) discountInput.value = '0';
        return;
    }

    if (syncTotalFromDiscount) {
        const currentDiscount = toDecimalOrNull(discountInput.value, 2);
        const computedTotal = calculatePromotionTotalFromDiscount(currentDiscount, unitPrice, minQty);
        if (computedTotal !== null) {
            totalInput.value = String(computedTotal);
        }
    }

    const totalAmount = toIntOrNull(totalInput.value);
    const calculatedDiscount = calculateDiscountPercentFromPromotionTotal(totalAmount, unitPrice, minQty);
    if (calculatedDiscount === null) {
        if (!keepDiscountOnMissing) discountInput.value = '0';
        return;
    }
    discountInput.value = formatPromotionNumberInputValue(calculatedDiscount, '0');
}

function formatPromotionNumberInputValue(value, fallback = '') {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(fallback);
    return String(Number(numeric.toFixed(2))).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

function setPromotionFormMode(isEditing = false) {
    const title = document.getElementById('promo-form-title');
    const saveBtn = document.getElementById('promo-save-btn');
    const cancelBtn = document.getElementById('promo-cancel-edit-btn');
    if (title) title.textContent = isEditing ? 'Editar promoción' : 'Crear promoción';
    if (saveBtn) saveBtn.textContent = isEditing ? 'Guardar cambios' : 'Guardar promoción';
    if (cancelBtn) cancelBtn.classList.toggle('hidden', !isEditing);
}

function clearPromotionForm(options = {}) {
    const keepSelection = Boolean(options.keepSelection);
    promotionEditingId = null;
    const nameInput = document.getElementById('promo-name');
    const typeInput = document.getElementById('promo-type');
    const minQtyInput = document.getElementById('promo-min-qty');
    const totalAmountInput = document.getElementById('promo-total-amount');
    const discountInput = document.getElementById('promo-discount');
    const comboPriceInput = document.getElementById('promo-combo-price');

    if (nameInput) nameInput.value = '';
    if (typeInput) typeInput.value = 'single';
    if (minQtyInput) minQtyInput.value = '2';
    if (totalAmountInput) totalAmountInput.value = '';
    if (discountInput) discountInput.value = '0';
    if (comboPriceInput) comboPriceInput.value = '';
    onPromotionTypeChange();
    if (!keepSelection) clearPromotionSelection();
    refreshSinglePromotionDiscountFromTotal({ keepDiscountOnMissing: true });
    setPromotionFormMode(false);

    if (nameInput) {
        setTimeout(() => {
            try {
                nameInput.focus();
                nameInput.select?.();
            } catch (_) {
            }
        }, 0);
    }
}

function cancelPromotionEdit() {
    clearPromotionForm();
}

async function startPromotionEdit(promotionId) {
    const id = Number(promotionId || 0);
    if (!id) return;
    const promotion = (Array.isArray(promotionRowsCache) ? promotionRowsCache : [])
        .find((row) => Number(row?.id || 0) === id);
    if (!promotion) {
        alert('No se encontró la promoción seleccionada para editar.');
        return;
    }

    try {
        await loadPromotionProductsSelect();
    } catch (_) {
        // continuamos igualmente para no bloquear la edición
    }

    const promoType = String(promotion.promo_type || 'single').toLowerCase() === 'combo' ? 'combo' : 'single';
    const minQty = Math.max(promoType === 'combo' ? 1 : 2, Number(promotion.min_qty || 0) || (promoType === 'combo' ? 1 : 2));
    const discountPercent = Number(promotion.discount_percent || 0);
    const comboPrice = Number(promotion.combo_price || 0);
    const loadedProductIds = (Array.isArray(promotion.productos) ? promotion.productos : [])
        .map((item) => Number(item?.product_id || 0))
        .filter((value) => Number.isInteger(value) && value > 0);
    const productIds = promoType === 'single'
        ? loadedProductIds.slice(0, 1)
        : loadedProductIds;

    const nameInput = document.getElementById('promo-name');
    const typeInput = document.getElementById('promo-type');
    const minQtyInput = document.getElementById('promo-min-qty');
    const totalAmountInput = document.getElementById('promo-total-amount');
    const discountInput = document.getElementById('promo-discount');
    const comboPriceInput = document.getElementById('promo-combo-price');

    if (nameInput) nameInput.value = normalizeText(promotion.nombre);
    if (typeInput) typeInput.value = promoType;
    onPromotionTypeChange({ preserveValues: true });
    if (minQtyInput) minQtyInput.value = String(minQty);
    if (discountInput) discountInput.value = formatPromotionNumberInputValue(discountPercent, '0');
    const firstProductId = productIds.length ? productIds[0] : 0;
    const referenceUnitPrice = getPromotionProductUnitPrice(firstProductId);
    const computedTotalAmount = calculatePromotionTotalFromDiscount(discountPercent, referenceUnitPrice, minQty);
    if (totalAmountInput) {
        totalAmountInput.value = promoType === 'single' && computedTotalAmount !== null
            ? String(computedTotalAmount)
            : '';
    }
    if (comboPriceInput) comboPriceInput.value = promoType === 'combo'
        ? formatPromotionNumberInputValue(comboPrice, '')
        : '';

    selectedPromotionProductIds = new Set(productIds);
    renderPromotionSelectedProducts();
    promotionEditingId = id;
    refreshSinglePromotionDiscountFromTotal({ keepDiscountOnMissing: true });
    setPromotionFormMode(true);
}

function onPromotionTypeChange(options = {}) {
    const preserveValues = Boolean(options.preserveValues);
    const type = String(document.getElementById('promo-type')?.value || 'single');
    const discountInput = document.getElementById('promo-discount');
    const discountRow = discountInput ? discountInput.closest('.form-row') : null;
    const totalAmountInput = document.getElementById('promo-total-amount');
    const totalAmountRow = totalAmountInput ? totalAmountInput.closest('.form-row') : null;
    const minQtyInput = document.getElementById('promo-min-qty');
    const comboPriceRow = document.getElementById('promo-combo-price-row');

    if (type === 'combo') {
        if (discountRow) discountRow.classList.add('hidden');
        if (totalAmountRow) totalAmountRow.classList.add('hidden');
        if (comboPriceRow) comboPriceRow.classList.remove('hidden');
        if (minQtyInput) {
            minQtyInput.min = '1';
            if (!preserveValues || Number(minQtyInput.value || 0) < 1) {
                minQtyInput.value = '1';
            }
        }
        if (!preserveValues) {
            if (totalAmountInput) totalAmountInput.value = '';
            if (discountInput) discountInput.value = '0';
        }
    } else {
        if (discountRow) discountRow.classList.remove('hidden');
        if (totalAmountRow) totalAmountRow.classList.remove('hidden');
        if (comboPriceRow) comboPriceRow.classList.add('hidden');
        if (minQtyInput) {
            minQtyInput.min = '2';
            if (!preserveValues || Number(minQtyInput.value || 0) < 2) {
                minQtyInput.value = '2';
            }
        }
        if (selectedPromotionProductIds.size > 1) {
            const firstSelected = Array.from(selectedPromotionProductIds)[0];
            selectedPromotionProductIds = new Set([firstSelected]);
            renderPromotionSelectedProducts();
        }
    }
    refreshSinglePromotionDiscountFromTotal({ keepDiscountOnMissing: preserveValues });
}

async function loadDepartmentsView() {
    await loadDepartmentOptions('product-department-add');
    await loadDepartmentOptions('product-department-edit');
    const list = document.getElementById('department-list');
    if (!list) return;
    try {
        const response = await fetch(API_URL + 'api/departamentos', {
            headers: withAuthHeaders(),
        });
        const rows = await response.json().catch(() => []);
        const departments = Array.isArray(rows) ? rows : [];
        list.innerHTML = '';
        if (!departments.length) {
            const li = document.createElement('li');
            li.textContent = 'No hay departamentos registrados.';
            list.appendChild(li);
            return;
        }
        departments.forEach((row) => {
            const li = document.createElement('li');
            li.textContent = normalizeText(row.nombre || row.departamento || 'Sin nombre').toUpperCase();
            list.appendChild(li);
        });
    } catch (_) {
        list.innerHTML = '<li>No se pudo cargar la lista de departamentos.</li>';
    }
}

async function loadPromotions() {
    const wrap = document.getElementById('promo-list');
    if (!wrap) return;
    try {
        const response = await fetch(API_URL + 'api/promociones', {
            headers: withAuthHeaders(),
        });
        const rows = await response.json().catch(() => []);
        const promotions = Array.isArray(rows) ? rows : [];
        promotionRowsCache = promotions;
        if (promotionEditingId > 0 && !promotions.some((row) => Number(row?.id || 0) === Number(promotionEditingId))) {
            clearPromotionForm();
        }
        if (!promotions.length) {
            wrap.textContent = 'Sin promociones.';
            return;
        }
        wrap.innerHTML = promotions.map((promo) => {
            const items = Array.isArray(promo.productos) ? promo.productos : [];
            const promoId = Number(promo.id || 0);
            const editingThisPromotion = Number(promotionEditingId || 0) === promoId;
            const names = items.map((it) => normalizeText(it.descripcion)).filter(Boolean).join(', ');
            const isCombo = String(promo.promo_type || 'single') === 'combo';
            const typeText = isCombo
                ? `Combo (${Number(promo.combo_price || 0).toFixed(0)})`
                : `Por cantidad (${Number(promo.discount_percent || 0)}%)`;
            return `
                <div style="padding:6px 0; border-bottom:1px solid #e5e7eb;">
                    <strong>${escapeHtml(promo.nombre)}</strong>
                    <div>Tipo: ${escapeHtml(typeText)} | Mínimo: ${Number(promo.min_qty || 2)}</div>
                    <div>Productos: ${escapeHtml(names || 'Sin productos')}</div>
                    <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
                        <button class="btn" type="button" data-edit-promo-id="${promoId}" ${editingThisPromotion ? 'disabled' : ''}>${editingThisPromotion ? 'Editando' : 'Editar'}</button>
                        <button class="btn" type="button" data-delete-promo-id="${promoId}">Eliminar</button>
                    </div>
                </div>
            `;
        }).join('');
        wrap.querySelectorAll('button[data-edit-promo-id]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = Number(btn.dataset.editPromoId || 0);
                if (id > 0) {
                    startPromotionEdit(id);
                }
            });
        });
        wrap.querySelectorAll('button[data-delete-promo-id]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = Number(btn.dataset.deletePromoId || 0);
                if (id > 0) {
                    await deletePromotion(id);
                }
            });
        });
    } catch (_) {
        promotionRowsCache = [];
        wrap.textContent = 'No se pudieron cargar las promociones.';
    }
}

async function deletePromotion(promotionId) {
    const id = Number(promotionId || 0);
    if (!id) return;
    const promotion = (Array.isArray(promotionRowsCache) ? promotionRowsCache : [])
        .find((row) => Number(row?.id || 0) === id);
    const promoName = normalizeText(promotion?.nombre || `Promocion ${id}`);
    const confirmDelete = (typeof window.appConfirm === 'function')
        ? await window.appConfirm(
            `¿Eliminar la promoción "${promoName}"?`,
            'warning',
            {
                title: 'Eliminar promoción',
                okText: 'Eliminar',
                cancelText: 'Cancelar',
            }
        )
        : confirm(`¿Eliminar la promoción "${promoName}"?`);
    if (!confirmDelete) return;

    try {
        const response = await fetch(API_URL + `api/promociones/${id}`, {
            method: 'DELETE',
            headers: withAuthHeaders(),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            alert(data.message || data.error || 'No se pudo eliminar la promoción.');
            return;
        }
        if (Number(promotionEditingId || 0) === id) {
            clearPromotionForm();
        }
        await loadPromotions();
        invalidateSalesPromotionRulesCache();
        loadSalesPromotionRules({ forceReload: true })
            .then(() => {
                if (Array.isArray(cart) && cart.length > 0) {
                    updateCartUI();
                }
            })
            .catch(() => {});
        alert('Promoción eliminada.');
    } catch (_) {
        alert('No se pudo eliminar la promoción.');
    }
}

function fillModifyFormFromProduct(product) {
    selectedProductForModify = product || null;
    if (!product) return;
    document.getElementById('product-edit-code').value = normalizeText(product.codigo_barras);
    document.getElementById('product-edit-name').value = normalizeText(product.descripcion);
    document.getElementById('product-edit-price').value = Number(product.precio_venta || 0);
    document.getElementById('product-edit-cost').value = Number(product.costo || 0);
    const configuredDefaultProfit = getConfiguredDefaultProfitPercent();
    const currentProfit = Number(product.ganancia);
    document.getElementById('product-edit-profit').value = Number.isFinite(currentProfit) ? currentProfit : configuredDefaultProfit;
    const formatName = resolveProductSaleFormat(product);
    const editUnidad = document.getElementById('radio-edit-unidad');
    const editKilo = document.getElementById('radio-edit-kilo');
    const editPack = document.getElementById('radio-edit-pack');
    if (editUnidad) editUnidad.checked = (formatName === 'unidad' || !formatName || (formatName !== 'granel' && formatName !== 'pack'));
    if (editKilo) editKilo.checked = formatName === 'granel';
    if (editPack) editPack.checked = formatName === 'pack';
    loadDepartmentOptions('product-department-edit', normalizeText(product.departamento || product.nombre_departamento || ''));
    const supplierSelect = document.getElementById('product-supplier-edit');
    if (supplierSelect) supplierSelect.value = String(product.supplier_id || '');
    const taxExemptEdit = document.getElementById('product-edit-tax-exempt');
    if (taxExemptEdit) taxExemptEdit.checked = Number(product.exento_iva || 0) === 1;
    const useInventoryEdit = document.getElementById('product-edit-use-inventory');
    if (useInventoryEdit) useInventoryEdit.checked = Number(product.utiliza_inventario || 0) === 1;
    const searchInput = document.getElementById('product-modify-search');
    if (searchInput) searchInput.disabled = true;
    setModifyFormVisibility(true);
}

function fillDeleteInfo(product) {
    const box = document.getElementById('product-remove-info');
    if (!box) return;
    if (!product) {
        box.textContent = 'Selecciona un producto para eliminar.';
        return;
    }
    const qty = Number(product.cantidad_actual || 0);
    const supplier = normalizeText(product.supplier_name || '');
    box.innerHTML = `
        <div><strong>Código:</strong> ${escapeHtml(normalizeText(product.codigo_barras))}</div>
        <div><strong>Descripción:</strong> ${escapeHtml(normalizeText(product.descripcion))}</div>
        <div><strong>Stock actual:</strong> ${qty}</div>
        <div><strong>Proveedor:</strong> ${escapeHtml(supplier || 'Sin proveedor')}</div>
    `;
}

function setAddProductFeedback(message, type = 'error') {
    const box = document.getElementById('product-add-feedback');
    if (!box) return;
    const text = String(message || '').trim();
    if (!text) {
        box.textContent = '';
        box.classList.add('hidden');
        box.classList.remove('feedback-error', 'feedback-ok');
        return;
    }
    box.textContent = text;
    box.classList.remove('hidden');
    box.classList.remove('feedback-error', 'feedback-ok');
    box.classList.add(type === 'ok' ? 'feedback-ok' : 'feedback-error');
}

function clearProductAddForm() {
    document.getElementById('product-code').value = '';
    document.getElementById('product-name').value = '';
    document.getElementById('radio-unidad').checked = true;
    document.getElementById('product-costo').value = '';
    document.getElementById('product-ganancia').value = String(getConfiguredDefaultProfitPercent());
    document.getElementById('product-price').value = '';
    document.getElementById('product-use-inventory').checked = false;
    document.getElementById('product-quantity').value = '';
    document.getElementById('product-quantity-min').value = '';
    document.getElementById('product-quantity-max').value = '';
    const supplier = document.getElementById('product-supplier');
    if (supplier) supplier.value = '';
    const taxExempt = document.getElementById('product-tax-exempt');
    if (taxExempt) taxExempt.checked = false;
    syncAddInventoryFieldsState();
    setAddProductFeedback('');
    const codeInput = document.getElementById('product-code');
    if (codeInput) {
        setTimeout(() => {
            try {
                codeInput.focus();
                codeInput.select();
            } catch (_) {
            }
        }, 0);
    }
}

function clearProductModifyForm() {
    selectedProductForModify = null;
    const searchInput = document.getElementById('product-modify-search');
    if (searchInput) {
        searchInput.value = '';
        searchInput.disabled = false;
    }
    document.getElementById('product-edit-code').value = '';
    document.getElementById('product-edit-name').value = '';
    document.getElementById('product-edit-price').value = '';
    document.getElementById('product-edit-cost').value = '';
    document.getElementById('product-edit-profit').value = String(getConfiguredDefaultProfitPercent());
    const editUnidad = document.getElementById('radio-edit-unidad');
    const editKilo = document.getElementById('radio-edit-kilo');
    const editPack = document.getElementById('radio-edit-pack');
    if (editUnidad) editUnidad.checked = false;
    if (editKilo) editKilo.checked = false;
    if (editPack) editPack.checked = false;
    const supplier = document.getElementById('product-supplier-edit');
    if (supplier) supplier.value = '';
    const taxExemptEdit = document.getElementById('product-edit-tax-exempt');
    if (taxExemptEdit) taxExemptEdit.checked = false;
    const useInventoryEdit = document.getElementById('product-edit-use-inventory');
    if (useInventoryEdit) useInventoryEdit.checked = false;
    setModifyFormVisibility(false);
}

function setModifyFormVisibility(visible) {
    const formBody = document.getElementById('product-modify-form-body');
    const emptyState = document.getElementById('product-modify-empty-state');
    if (formBody) formBody.classList.toggle('hidden', !visible);
    if (emptyState) emptyState.classList.toggle('hidden', visible);
}

function cancelProductOperation(sectionId) {
    if (sectionId === 'add') {
        clearProductAddForm();
    }
    if (sectionId === 'modify') {
        clearProductModifyForm();
    }
    hideAllSections();
}

function focusFirstInputInProductSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section || section.classList.contains('hidden')) return;
    const firstField = section.querySelector('input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])');
    if (!firstField) return;
    setTimeout(() => {
        try {
            firstField.focus();
            if (typeof firstField.select === 'function' && firstField.tagName?.toLowerCase() === 'input') {
                firstField.select();
            }
        } catch (_) {
        }
    }, 0);
}

function showSectioninventario(sectionId) {
    const root = document.getElementById('products-panel');
    if (!root) return;
    root.querySelectorAll('.product-section').forEach((section) => section.classList.add('hidden'));
    const target = document.getElementById(sectionId);
    if (target) target.classList.remove('hidden');
    applyAdminSiaOnlyProductsActionsVisibility();

    if (sectionId === 'add') {
        applyDefaultProfitToProductForms();
        syncProfitConfigFromServer();
        loadDepartmentOptions('product-department-add');
        loadProductSupplierOptions();
        const codeInput = document.getElementById('product-code');
        if (codeInput) {
            setTimeout(() => {
                try {
                    codeInput.focus();
                    codeInput.select();
                } catch (_) {
                }
            }, 0);
        }
    }
    if (sectionId === 'modify') {
        setModifyFormVisibility(false);
        const searchInput = document.getElementById('product-modify-search');
        if (searchInput) searchInput.disabled = false;
        applyDefaultProfitToProductForms();
        syncProfitConfigFromServer();
        loadDepartmentOptions('product-department-edit');
        loadProductSupplierOptions();
        focusFirstInputInProductSection(sectionId);
    }
    if (sectionId === 'remove') {
        focusFirstInputInProductSection(sectionId);
    }
    if (sectionId === 'dep') {
        loadDepartmentsView();
        focusFirstInputInProductSection(sectionId);
    }
    if (sectionId === 'promo') {
        const select = document.getElementById('promo-products');
        if (select && !promotionProductsSelectHydrated) {
            select.innerHTML = '<option value="">Cargando productos...</option>';
        }
        loadPromotionProductsSelect().catch(() => {});
        loadPromotions();
        focusFirstInputInProductSection(sectionId);
    }
    if (sectionId === 'catalog') {
        loadCatalogTable();
    }
}

function hideAllSections() {
    const root = document.getElementById('products-panel');
    if (!root) return;
    root.querySelectorAll('.product-section').forEach((section) => section.classList.add('hidden'));
}

async function redirectToInventoryForExistingProduct(code) {
    if (typeof showSection === 'function') {
        showSection('inventory');
    }
    const inventoryInput = document.getElementById('inventory-code-input');
    if (inventoryInput) {
        inventoryInput.value = code;
    }
    if (typeof loadInventoryProductByCode === 'function') {
        await loadInventoryProductByCode();
    }
    if (inventoryInput) {
        setTimeout(() => {
            try {
                inventoryInput.focus();
                inventoryInput.select();
            } catch (_) {
            }
        }, 0);
    }
}

async function redirectToModifyForExistingProduct(code) {
    showSectioninventario('modify');
    const modifyInput = document.getElementById('product-modify-search');
    if (modifyInput) {
        modifyInput.value = code;
    }
    if (typeof loadProductForModify === 'function') {
        await loadProductForModify();
    }
}

async function handleExistingProductCodeOnAdd(redirectPrompt = true) {
    const codeInput = document.getElementById('product-code');
    const rawCode = normalizeText(codeInput?.value || '');
    const code = normalizeBarcodeByScannerSettings(rawCode) || rawCode;
    if (!code) return false;
    if (codeInput && codeInput.value !== code) codeInput.value = code;

    try {
        const response = await fetch(API_URL + `api/productos/code/${encodeURIComponent(code)}`, {
            headers: withAuthHeaders(),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.found) return false;

        const product = data?.product || null;
        const inventoryEnabled = Number(product?.utiliza_inventario || 0) === 1;
        const msg = `El código ${code} ya está registrado.`;
        setAddProductFeedback('');

        if (inventoryEnabled) {
            if (!redirectPrompt) {
                if (typeof window.appAlert === 'function') {
                    await window.appAlert(
                        `${msg} Este producto usa inventario. Para aumentar stock, ve a Inventario.`,
                        'warning',
                        { title: 'Producto existente', okText: 'Entendido' }
                    );
                } else {
                    alert(`${msg} Este producto usa inventario. Para aumentar stock, ve a Inventario.`);
                }
                return true;
            }

            let goInventory = false;
            if (typeof window.appConfirm === 'function') {
                goInventory = await window.appConfirm(
                    `${msg} Este producto tiene inventario activo. ¿Quieres ir a Inventario para aumentar stock?`,
                    'warning',
                    { title: 'Producto existente', okText: 'Ir a Inventario', cancelText: 'Cerrar' }
                );
            } else {
                goInventory = confirm(`${msg}\n\nEste producto tiene inventario activo.\n¿Quieres ir a Inventario para aumentar stock?`);
            }
            if (goInventory) {
                await redirectToInventoryForExistingProduct(code);
            }
            return true;
        }

        let goModify = false;
        if (typeof window.appConfirm === 'function') {
            goModify = await window.appConfirm(
                `${msg} Este producto no tiene inventario activo. Si quiere habilitar inventario debe modificar el producto en la pestaña Modificar. ¿Quieres ir a Modificar producto?`,
                'info',
                { title: 'Producto existente', okText: 'Ir a Modificar', cancelText: 'Cancelar' }
            );
        } else {
            goModify = confirm(`${msg}\n\nEste producto no tiene inventario activo.\nSi quiere habilitar inventario debe modificar el producto en la pestaña Modificar.\n¿Quieres ir a Modificar producto?`);
        }
        if (goModify) {
            await redirectToModifyForExistingProduct(code);
        }
        return true;
    } catch (_) {
        return false;
    }
}

async function addProduct() {
    if (await handleExistingProductCodeOnAdd(true)) {
        return;
    }

    const payload = {
        codigo_barras: normalizeText(document.getElementById('product-code').value),
        descripcion: normalizeText(document.getElementById('product-name').value),
        formato_venta: document.querySelector('input[name="formato_venta"]:checked')?.value || 'unidad',
        costo: toDecimalOrNull(document.getElementById('product-costo').value, 2),
        ganancia: toDecimalOrNull(document.getElementById('product-ganancia').value, 2) ?? 0,
        precio_venta: toDecimalOrNull(document.getElementById('product-price').value, 2),
        utiliza_inventario: document.getElementById('product-use-inventory').checked ? 1 : 0,
        cantidad_actual: toDecimalOrNull(document.getElementById('product-quantity').value, 3) ?? 0,
        cantidad_minima: toDecimalOrNull(document.getElementById('product-quantity-min').value, 3) ?? 0,
        cantidad_maxima: toDecimalOrNull(document.getElementById('product-quantity-max').value, 3) ?? 0,
        departamento: normalizeText(document.getElementById('product-department-add').value),
        supplier_id: toPositiveIntOrNull(document.getElementById('product-supplier')?.value),
        exento_iva: document.getElementById('product-tax-exempt')?.checked ? 1 : 0,
    };

    if (!payload.codigo_barras || !payload.descripcion || payload.costo === null || payload.ganancia === null || payload.precio_venta === null || !payload.departamento) {
        setAddProductFeedback('Completa los campos obligatorios: código, descripción, costo, ganancia, precio de venta y departamento.', 'error');
        return;
    }
    setAddProductFeedback('');

    try {
        const response = await fetch(API_URL + 'api/productos', {
            method: 'POST',
            headers: withAuthHeaders({
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            if (response.status === 409 && String(data.code || '') === 'PRODUCT_CODE_EXISTS') {
                await handleExistingProductCodeOnAdd(true);
                return;
            }
            setAddProductFeedback(data.message || data.error || 'No se pudo guardar el producto.', 'error');
            return;
        }
        clearProductAddForm();
        setAddProductFeedback('Producto guardado correctamente.', 'ok');
        invalidatePromotionProductsCache({ refreshIfVisible: true });
        await loadCatalogTable();
    } catch (error) {
        console.error('Error addProduct:', error);
        setAddProductFeedback('No se pudo guardar el producto.', 'error');
    }
}

async function loadProductForModify() {
    const query = normalizeText(document.getElementById('product-modify-search').value);
    if (!query) {
        setModifyFormVisibility(false);
        alert('Ingresa un código o descripción para buscar.');
        return;
    }
    const product = await findProductByCodeOrText(query);
    if (!product) {
        clearProductModifyForm();
        alert('Producto no encontrado.');
        return;
    }
    fillModifyFormFromProduct(product);
}

async function saveModifiedProduct() {
    const code = normalizeText(selectedProductForModify?.codigo_barras || '');
    if (!code) {
        alert('Debes cargar un producto primero.');
        return;
    }
    const editedCodeInput = document.getElementById('product-edit-code');
    const editedCodeRaw = normalizeText(editedCodeInput?.value || '');
    const editedCode = normalizeBarcodeByScannerSettings(editedCodeRaw) || editedCodeRaw;
    if (editedCodeInput) editedCodeInput.value = editedCode;
    const payload = {
        codigo_barras: editedCode,
        descripcion: normalizeText(document.getElementById('product-edit-name').value),
        precio_venta: toDecimalOrNull(document.getElementById('product-edit-price').value, 2),
        costo: toDecimalOrNull(document.getElementById('product-edit-cost').value, 2),
        ganancia: toDecimalOrNull(document.getElementById('product-edit-profit').value, 2) ?? 0,
        formato_venta: document.querySelector('input[name="formato_venta_edit"]:checked')?.value || 'unidad',
        cantidad_actual: selectedProductForModify ? Number(selectedProductForModify.cantidad_actual || 0) : 0,
        cantidad_minima: selectedProductForModify ? Number(selectedProductForModify.cantidad_minima || 0) : 0,
        cantidad_maxima: selectedProductForModify ? Number(selectedProductForModify.cantidad_maxima || 0) : 0,
        utiliza_inventario: document.getElementById('product-edit-use-inventory')?.checked ? 1 : 0,
        departamento: normalizeText(document.getElementById('product-department-edit').value),
        supplier_id: toPositiveIntOrNull(document.getElementById('product-supplier-edit')?.value),
        exento_iva: document.getElementById('product-edit-tax-exempt')?.checked ? 1 : 0,
    };

    if (!payload.codigo_barras || !payload.descripcion || payload.precio_venta === null || payload.costo === null || !payload.departamento) {
        alert('Completa los campos obligatorios para guardar cambios.');
        return;
    }

    try {
        const response = await fetch(API_URL + `api/productos/${encodeURIComponent(code)}`, {
            method: 'PUT',
            headers: withAuthHeaders({
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            alert(data.message || data.error || 'No se pudo actualizar el producto.');
            return;
        }
        alert('Producto actualizado correctamente.');
        clearProductModifyForm();
        invalidatePromotionProductsCache({ refreshIfVisible: true });
        await loadCatalogTable();
    } catch (error) {
        console.error('Error saveModifiedProduct:', error);
        alert('No se pudo actualizar el producto.');
    }
}

async function loadProductForDelete() {
    const query = normalizeText(document.getElementById('product-remove-search').value);
    if (!query) {
        alert('Ingresa un código o descripción para buscar.');
        return;
    }
    const product = await findProductByCodeOrText(query);
    if (!product) {
        selectedProductForDelete = null;
        fillDeleteInfo(null);
        alert('Producto no encontrado.');
        return;
    }
    selectedProductForDelete = product;
    fillDeleteInfo(product);
}

function clearProductDeleteSelection() {
    selectedProductForDelete = null;
    const searchInput = document.getElementById('product-remove-search');
    if (searchInput) searchInput.value = '';
    fillDeleteInfo(null);
}

async function deleteLoadedProduct() {
    if (!selectedProductForDelete) {
        alert('Primero selecciona un producto.');
        return;
    }
    const code = normalizeText(selectedProductForDelete.codigo_barras);
    if (!code) {
        alert('Producto inválido.');
        return;
    }
    const confirmDelete = (typeof window.appConfirm === 'function')
        ? await window.appConfirm(
            `¿Eliminar el producto "${selectedProductForDelete.descripcion}"?`,
            'warning',
            {
                title: 'Confirmar eliminacion',
                okText: 'Eliminar',
                cancelText: 'Cancelar',
            }
        )
        : confirm(`¿Eliminar el producto "${selectedProductForDelete.descripcion}"?`);
    if (!confirmDelete) return;

    try {
        const response = await fetch(API_URL + `api/productos/${encodeURIComponent(code)}`, {
            method: 'DELETE',
            headers: withAuthHeaders(),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            alert(data.message || data.error || 'No se pudo eliminar el producto.');
            return;
        }
        alert('Producto eliminado correctamente.');
        clearProductDeleteSelection();
        invalidatePromotionProductsCache({ refreshIfVisible: true });
        await loadCatalogTable();
    } catch (error) {
        console.error('Error deleteLoadedProduct:', error);
        alert('No se pudo eliminar el producto.');
    }
}

function setupDepartmentNameUppercase() {
    const input = document.getElementById('department-name');
    if (!input) return;
    input.addEventListener('input', () => {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const upper = String(input.value || '').toUpperCase();
        if (upper !== input.value) {
            input.value = upper;
            if (typeof start === 'number' && typeof end === 'number') {
                input.setSelectionRange(start, end);
            }
        }
    });
}

async function createDepartment() {
    const name = normalizeText(document.getElementById('department-name').value).toUpperCase();
    if (!name) {
        alert('Ingresa el nombre del departamento.');
        return;
    }
    try {
        const response = await fetch(API_URL + 'api/departamentos', {
            method: 'POST',
            headers: withAuthHeaders({
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify({ nombre: name }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            alert(data.message || data.error || 'No se pudo crear el departamento.');
            return;
        }
        document.getElementById('department-name').value = '';
        await loadDepartmentsView();
        alert('Departamento guardado.');
    } catch (error) {
        console.error('Error createDepartment:', error);
        alert('No se pudo crear el departamento.');
    }
}

async function createPromotion() {
    const name = normalizeText(document.getElementById('promo-name').value);
    const promoType = String(document.getElementById('promo-type')?.value || 'single');
    let minQty = toIntOrNull(document.getElementById('promo-min-qty').value);
    let discount = toDecimalOrNull(document.getElementById('promo-discount').value, 2);
    let totalAmount = toIntOrNull(document.getElementById('promo-total-amount')?.value);
    const comboPrice = toIntOrNull(document.getElementById('promo-combo-price')?.value);
    const productIds = Array.from(selectedPromotionProductIds).filter((id) => Number(id) > 0);
    const inferredSingleRule = parseSinglePromotionPattern(name);
    const editingPromotionId = Number(promotionEditingId || 0);
    const isEditing = editingPromotionId > 0;

    if (!name || !productIds.length) {
        alert('Completa nombre y selecciona productos.');
        return;
    }
    if (promoType === 'single') {
        // Si el nombre viene como "2x1", "3x2", etc., preferimos esa cantidad mínima
        // cuando el formulario sigue en valor por defecto.
        if (inferredSingleRule && minQty === 2) {
            minQty = inferredSingleRule.minQty;
            discount = inferredSingleRule.discountPercent;
            const minQtyInput = document.getElementById('promo-min-qty');
            const discountInput = document.getElementById('promo-discount');
            if (minQtyInput) minQtyInput.value = String(minQty);
            if (discountInput) discountInput.value = formatPromotionNumberInputValue(discount, '0');
        }

        if (!Array.isArray(promotionProductsCatalogCache)) {
            try {
                await fetchPromotionProductsCatalog(false);
            } catch (_) {
                // validamos más abajo y mostramos mensaje claro
            }
        }

        const referenceProductId = Number(productIds[0] || 0);
        const referenceUnitPrice = getPromotionProductUnitPrice(referenceProductId);
        if (!referenceProductId || !referenceUnitPrice) {
            alert('Selecciona un producto válido para calcular la promoción por monto.');
            return;
        }

        if ((!totalAmount || totalAmount <= 0) && inferredSingleRule && inferredSingleRule.minQty === minQty) {
            totalAmount = Math.max(1, roundClpAmount(referenceUnitPrice * Number(inferredSingleRule.payQty || 0)));
            const totalAmountInput = document.getElementById('promo-total-amount');
            if (totalAmountInput && totalAmount > 0) totalAmountInput.value = String(totalAmount);
        }

        discount = calculateDiscountPercentFromPromotionTotal(totalAmount, referenceUnitPrice, minQty);
        if (discount !== null) {
            const discountInput = document.getElementById('promo-discount');
            if (discountInput) discountInput.value = formatPromotionNumberInputValue(discount, '0');
        }

        if (!minQty || minQty < 2 || !totalAmount || totalAmount <= 0 || discount === null || discount <= 0 || discount >= 100) {
            alert('Para promoción por cantidad indica mínimo (>=2) y un monto total válido menor al total normal.');
            return;
        }
    } else if (promoType === 'combo') {
        if (productIds.length < 2) {
            alert('El combo requiere al menos 2 productos distintos.');
            return;
        }
        if (!comboPrice || comboPrice <= 0) {
            alert('Ingresa el precio final del combo.');
            return;
        }
    } else {
        alert('Tipo de promoción no válido.');
        return;
    }
    try {
        const response = await fetch(API_URL + (isEditing ? `api/promociones/${editingPromotionId}` : 'api/promociones'), {
            method: isEditing ? 'PUT' : 'POST',
            headers: withAuthHeaders({
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify({
                nombre: name,
                promo_type: promoType,
                min_qty: promoType === 'combo' ? 1 : minQty,
                discount_percent: promoType === 'combo' ? 0 : discount,
                combo_price: promoType === 'combo' ? comboPrice : null,
                product_ids: productIds,
            }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            if (isEditing && response.status === 404 && !data.message && !data.error) {
                alert('El servidor activo no tiene cargada la ruta de edición de promociones. Reinicia el servicio minimarket-node.');
                return;
            }
            alert(data.message || data.error || 'No se pudo guardar la promoción.');
            return;
        }
        clearPromotionForm();
        await loadPromotions();
        invalidateSalesPromotionRulesCache();
        loadSalesPromotionRules({ forceReload: true })
            .then(() => {
                if (Array.isArray(cart) && cart.length > 0) {
                    updateCartUI();
                }
            })
            .catch(() => {});
        alert(isEditing ? 'Promoción actualizada.' : 'Promoción guardada.');
    } catch (error) {
        console.error('Error createPromotion:', error);
        alert('No se pudo guardar la promoción.');
    }
}

async function importProductsFile() {
    const input = document.getElementById('product-import-file');
    const status = document.getElementById('product-import-status');
    const file = input?.files?.[0];
    if (!file) {
        alert('Selecciona un archivo para importar.');
        return;
    }
    const fileName = String(file.name || '').toLowerCase();
    const format = fileName.endsWith('.json') ? 'json' : 'csv';
    if (status) status.textContent = 'Importando...';
    try {
        const text = await file.text();
        const response = await fetch(API_URL + 'api/productos/import', {
            method: 'POST',
            headers: withAuthHeaders({
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify({
                format,
                data: text,
            }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.message || data.error || 'No se pudo importar.');
        }
        if (status) status.textContent = `Importación completada. Creados: ${Number(data.inserted || 0)}.`;
        await loadCatalogTable();
        invalidatePromotionProductsCache({ refreshIfVisible: true });
    } catch (error) {
        if (status) status.textContent = error.message || 'No se pudo importar.';
    }
}

async function exportProductsFile(format) {
    const normalized = format === 'json'
        ? 'json'
        : (format === 'xlsx' ? 'xlsx' : 'csv');
    try {
        const response = await fetch(API_URL + `api/productos/export.${normalized}`, {
            headers: withAuthHeaders(),
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'No se pudo exportar.');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `productos_${date}.${normalized}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        alert(error.message || 'No se pudo exportar.');
    }
}

async function exportProductsDetailedPdf() {
    if (!isSessionAdminSiaUser()) {
        alert('Esta exportacion esta disponible solo para admin_sia.');
        return;
    }

    const toNumber = (value) => {
        const amount = Number(value);
        return Number.isFinite(amount) ? amount : 0;
    };
    const formatQuantity = (value) => {
        const amount = toNumber(value);
        return Number.isInteger(amount)
            ? amount.toLocaleString('es-CL', { maximumFractionDigits: 0 })
            : amount.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    const formatPercent = (value) => `${toNumber(value).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

    try {
        const business = await getBusinessDisplayInfo();
        const response = await fetch(API_URL + 'api/productos', {
            headers: withAuthHeaders(),
        });
        const payload = await response.json().catch(() => []);
        if (!response.ok) {
            throw new Error(payload.message || payload.error || 'No se pudo generar el listado PDF.');
        }

        const rawRows = Array.isArray(payload) ? payload : [];
        if (!rawRows.length) {
            alert('No hay productos para exportar.');
            return;
        }

        const rows = rawRows
            .map((row) => {
                const costo = toNumber(row.costo);
                const venta = toNumber(row.precio_venta);
                const utilidadUnit = venta - costo;
                const stock = toNumber(row.cantidad_actual);
                const stockMin = toNumber(row.cantidad_minima);
                const stockMax = toNumber(row.cantidad_maxima);
                const marginRaw = row.ganancia;
                const marginParsed = Number(marginRaw);
                const marginFallback = costo > 0 ? ((venta - costo) / costo) * 100 : 0;
                const marginPercent = (marginRaw === null || marginRaw === '' || !Number.isFinite(marginParsed))
                    ? marginFallback
                    : marginParsed;
                const inventoryEnabled = Number(row.utiliza_inventario || 0) === 1;
                const exentoIva = Number(row.exento_iva || 0) === 1;

                return {
                    codigo: normalizeText(row.codigo_barras || '-'),
                    nombre: normalizeText(row.descripcion || ''),
                    departamento: normalizeText(row.departamento || 'Sin departamento'),
                    formato: normalizeText(row.formato_venta || '-'),
                    costo,
                    venta,
                    utilidadUnit,
                    marginPercent,
                    stock,
                    stockMin,
                    stockMax,
                    inventoryEnabled,
                    exentoIva,
                    proveedor: normalizeText(row.supplier_name || 'Sin proveedor'),
                };
            })
            .sort((a, b) => {
                const byDepartment = a.departamento.localeCompare(b.departamento, 'es', { sensitivity: 'base' });
                if (byDepartment !== 0) return byDepartment;
                return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
            });

        const printableRows = rows.map((row) => [
            row.codigo,
            row.nombre,
            row.departamento,
            row.formato,
            `$${formatMoney(row.costo)}`,
            `$${formatMoney(row.venta)}`,
            formatPercent(row.marginPercent),
            `$${formatMoney(row.utilidadUnit)}`,
            formatQuantity(row.stock),
            formatQuantity(row.stockMin),
            formatQuantity(row.stockMax),
            row.inventoryEnabled ? 'Si' : 'No',
            row.exentoIva ? 'Exento' : 'Afecto',
            row.proveedor,
        ]);

        const totalStock = rows.reduce((acc, row) => acc + row.stock, 0);
        const totalCostStock = rows.reduce((acc, row) => acc + (row.costo * row.stock), 0);
        const totalSaleStock = rows.reduce((acc, row) => acc + (row.venta * row.stock), 0);
        const totalProfitStock = totalSaleStock - totalCostStock;
        const avgMargin = rows.length
            ? rows.reduce((acc, row) => acc + row.marginPercent, 0) / rows.length
            : 0;
        const inventoryEnabledCount = rows.filter((row) => row.inventoryEnabled).length;
        const exentoIvaCount = rows.filter((row) => row.exentoIva).length;
        const currentUser = normalizeText(localStorage.getItem('user') || '').toLowerCase() || 'desconocido';

        const html = buildPrintableHtml(
            'Listado detallado de productos',
            ['Codigo', 'Nombre', 'Departamento', 'Formato', 'Costo', 'Venta', 'Margen %', 'Utilidad/U', 'Stock', 'Min', 'Max', 'Inventario', 'IVA', 'Proveedor'],
            printableRows,
            {
                business,
                filtersText: `Ordenado por departamento y nombre | Usuario: ${currentUser}`,
                summary: [
                    { label: 'Productos', value: String(rows.length) },
                    { label: 'Con inventario', value: String(inventoryEnabledCount) },
                    { label: 'Stock total', value: formatQuantity(totalStock) },
                    { label: 'Margen promedio', value: formatPercent(avgMargin) },
                    { label: 'Costo stock', value: `$${formatMoney(totalCostStock)}` },
                    { label: 'Venta stock', value: `$${formatMoney(totalSaleStock)}` },
                    { label: 'Utilidad potencial', value: `$${formatMoney(totalProfitStock)}` },
                    { label: 'Exentos IVA', value: String(exentoIvaCount) },
                ],
                signatures: ['Responsable de inventario', 'Administrador SIA'],
            }
        );
        openPrintWindow(html);
    } catch (error) {
        console.error('Error exporting products detailed pdf:', error);
        alert(error.message || 'No se pudo exportar el listado de productos en PDF.');
    }
}

async function downloadProductsTemplate(format) {
    const normalized = format === 'json' ? 'json' : 'csv';
    try {
        const response = await fetch(API_URL + `api/productos/template.${normalized}`, {
            headers: withAuthHeaders(),
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'No se pudo descargar la plantilla.');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = normalized === 'json' ? 'plantilla_productos.json' : 'plantilla_productos.csv';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        alert(error.message || 'No se pudo descargar la plantilla.');
    }
}

function renderCatalogTableRows(rows) {
    const body = document.getElementById('catalog-table-body');
    if (!body) return;
    const list = Array.isArray(rows) ? rows : [];
    body.innerHTML = '';
    if (!list.length) {
        body.innerHTML = '<tr><td colspan="7" style="text-align:center;">Sin datos.</td></tr>';
        return;
    }
    list.forEach((row) => {
        const tr = document.createElement('tr');
        const code = normalizeText(row.codigo_barras);
        const inventoryEnabled = Number(row.utiliza_inventario || 0) === 1 ? 'Si' : 'No';
        tr.innerHTML = `
            <td style="text-align:center;"><input type="radio" name="catalog-selected" value="${escapeHtml(code)}"></td>
            <td>${escapeHtml(code)}</td>
            <td>${escapeHtml(normalizeText(row.descripcion))}</td>
            <td>${Number(row.precio_venta || 0).toFixed(0)}</td>
            <td>${Number(row.cantidad_actual || 0).toFixed(0)}</td>
            <td>${inventoryEnabled}</td>
            <td>${escapeHtml(normalizeText(row.supplier_name || 'Sin proveedor'))}</td>
        `;
        body.appendChild(tr);
    });
    body.querySelectorAll('input[name="catalog-selected"]').forEach((radio) => {
        radio.addEventListener('change', () => {
            selectedCatalogProductCode = String(radio.value || '');
        });
    });
}

function filterCatalogTable(queryValue) {
    const query = normalizeText(queryValue).toLowerCase();
    if (!query) {
        renderCatalogTableRows(catalogRowsCache);
        return;
    }
    const filtered = (catalogRowsCache || []).filter((row) => {
        const code = normalizeText(row.codigo_barras).toLowerCase();
        const desc = normalizeText(row.descripcion).toLowerCase();
        return code.includes(query) || desc.includes(query);
    });
    renderCatalogTableRows(filtered);
}

async function loadCatalogTable() {
    const body = document.getElementById('catalog-table-body');
    if (!body) return;
    try {
        const response = await fetch(API_URL + 'api/productos/catalog', {
            headers: withAuthHeaders(),
        });
        const rows = await response.json().catch(() => []);
        catalogRowsCache = Array.isArray(rows) ? rows : [];
        selectedCatalogProductCode = '';
        const searchInput = document.getElementById('catalog-search-input');
        const query = normalizeText(searchInput?.value || '');
        if (query) {
            filterCatalogTable(query);
        } else {
            renderCatalogTableRows(catalogRowsCache);
        }
    } catch (_) {
        catalogRowsCache = [];
        body.innerHTML = '<tr><td colspan="7" style="text-align:center;">No se pudo cargar catálogo.</td></tr>';
    }
}

async function editSelectedCatalogProduct() {
    const selected = selectedCatalogProductCode || String(document.querySelector('input[name="catalog-selected"]:checked')?.value || '');
    if (!selected) {
        alert('Selecciona un producto del catálogo.');
        return;
    }
    showSectioninventario('modify');
    const search = document.getElementById('product-modify-search');
    if (search) search.value = selected;
    await loadProductForModify();
}

function setupProductSearchAutocomplete() {
    const bindInput = (id) => {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('input', async () => {
            const query = normalizeText(input.value);
            if (query.length < 2) return;
            const rows = await searchProductsForInput(query);
            fillProductSearchDatalist(rows);
        });
    };
    bindInput('product-modify-search');
    bindInput('product-remove-search');
}

function setShoppingFeedback(message, type = 'info', receive = false) {
    const id = receive ? 'shopping-receive-feedback' : 'shopping-feedback';
    const box = document.getElementById(id);
    if (!box) return;
    const text = String(message || '').trim();
    if (!text) {
        box.textContent = '';
        box.classList.add('hidden');
        box.classList.remove('feedback-error', 'feedback-ok', 'feedback-warning');
        return;
    }
    box.textContent = text;
    box.classList.remove('hidden');
    box.classList.remove('feedback-error', 'feedback-ok', 'feedback-warning');
    if (type === 'ok') box.classList.add('feedback-ok');
    else if (type === 'error') box.classList.add('feedback-error');
    else if (type === 'warning') box.classList.add('feedback-warning');
}

function updateShoppingSendButtonState() {
    const sendBtn = document.getElementById('shopping-send-close-btn');
    const buyerSelect = document.getElementById('shopping-buyer-select');
    if (!sendBtn || !buyerSelect) return;
    const buyerId = Number(buyerSelect.value || 0);
    const canSend = buyerId > 0;
    sendBtn.disabled = !canSend;
    sendBtn.classList.toggle('hidden', !canSend);
}

function setShoppingMode(mode = '') {
    const createSection = document.getElementById('shopping-create-section');
    const receiveSection = document.getElementById('shopping-receive-section');
    const requestsSection = document.getElementById('shopping-requests-section');
    if (createSection) createSection.classList.toggle('hidden', mode !== 'create');
    if (receiveSection) receiveSection.classList.toggle('hidden', mode !== 'receive');
    if (requestsSection) requestsSection.classList.toggle('hidden', mode !== 'requests');
}

function applyShoppingCreateWorkspaceState() {
    const hasActive = Boolean(shoppingOrderState.order && Number(shoppingOrderState.order.id || 0) > 0);
    const emptyBox = document.getElementById('shopping-create-empty');
    const workspace = document.getElementById('shopping-create-workspace');
    if (emptyBox) {
        emptyBox.classList.toggle('hidden', hasActive);
    }
    if (workspace) {
        workspace.classList.toggle('hidden', !hasActive);
    }
}

function fillShoppingProductsDatalist(rows) {
    const list = document.getElementById('shopping-product-options');
    if (!list) return;
    list.innerHTML = '';
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        const code = normalizeText(row.codigo_barras || '');
        const desc = normalizeText(row.descripcion || '');
        if (!code && !desc) return;
        const opt = document.createElement('option');
        opt.value = code || desc;
        opt.label = code && desc ? `${code} - ${desc}` : (desc || code);
        list.appendChild(opt);
    });
}

async function shoppingSuggestProducts(value) {
    const query = normalizeText(value);
    if (query.length < 2) {
        fillShoppingProductsDatalist([]);
        return;
    }
    const rows = await searchProductsForInput(query);
    fillShoppingProductsDatalist(rows);
}

function renderShoppingOrderTable() {
    const body = document.getElementById('shopping-order-body');
    if (!body) return;
    const items = Array.isArray(shoppingOrderState.items) ? shoppingOrderState.items : [];
    body.innerHTML = '';
    if (!items.length) {
        body.innerHTML = '<tr><td colspan="7" style="text-align:center;">Sin productos en la orden activa.</td></tr>';
        return;
    }
    items.forEach((item) => {
        const tr = document.createElement('tr');
        const itemId = Number(item.id || 0);
        const requested = Number.parseFloat(item.requested_qty ?? 0) || 0;
        const received = Number.parseFloat(item.received_qty ?? 0) || 0;
        const pending = requested - received;
        tr.innerHTML = `
            <td>${escapeHtml(normalizeText(item.barcode))}</td>
            <td>${escapeHtml(normalizeText(item.description))}</td>
            <td style="text-align:right;">${requested.toFixed(2)}</td>
            <td style="text-align:right;">${received.toFixed(2)}</td>
            <td style="text-align:right;">${pending.toFixed(2)}</td>
            <td>${escapeHtml(normalizeText(item.requester_names || item.last_requested_by_name || '-'))}</td>
            <td style="text-align:center;">
                <button class="btn" type="button" style="padding:4px 8px; font-size:12px;" onclick="removeShoppingOrderItem(${itemId})">Eliminar</button>
            </td>
        `;
        body.appendChild(tr);
    });
}

async function removeShoppingOrderItem(itemId) {
    const parsedId = Number(itemId || 0);
    if (!parsedId || !shoppingOrderState.order) {
        setShoppingFeedback('No se pudo identificar el producto a eliminar.', 'warning');
        return;
    }

    const confirmDelete = (typeof window.appConfirm === 'function')
        ? await window.appConfirm(
            '¿Eliminar este producto de la orden activa?',
            'warning',
            { title: 'Eliminar producto', okText: 'Eliminar', cancelText: 'Cancelar' }
        )
        : window.confirm('¿Eliminar este producto de la orden activa?');
    if (!confirmDelete) return;

    try {
        const response = await fetch(API_URL + `api/purchase-order/items/${parsedId}`, {
            method: 'DELETE',
            headers: withAuthHeaders(),
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
            handleSessionExpiredRedirect('Sesion expirada. Vuelve a iniciar sesion.');
            return;
        }
        if (!response.ok) {
            setShoppingFeedback(data.message || 'No se pudo eliminar el producto de la orden.', 'error');
            return;
        }
        shoppingOrderState = {
            order: data.order || shoppingOrderState.order || null,
            items: Array.isArray(data.items) ? data.items : [],
        };
        renderShoppingOrderTable();
        applyShoppingCreateWorkspaceState();
        updateShoppingSendButtonState();
        setShoppingFeedback('Producto eliminado de la orden activa.', 'ok');
    } catch (_) {
        setShoppingFeedback('Error de conexión al eliminar producto de la orden.', 'error');
    }
}

async function loadShoppingBuyers() {
    const select = document.getElementById('shopping-buyer-select');
    if (!select) return;
    try {
        const response = await fetch(API_URL + 'api/service-buyers', { headers: withAuthHeaders() });
        const rows = await response.json().catch(() => []);
        const buyers = Array.isArray(rows) ? rows.filter((r) => Number(r.is_active || 0) === 1) : [];
        select.innerHTML = '<option value="">Selecciona encargado</option>';
        buyers.forEach((buyer) => {
            const id = Number(buyer.id || 0);
            if (!id) return;
            const name = normalizeText(buyer.name || `Encargado ${id}`);
            const email = normalizeText(buyer.email || '');
            const opt = document.createElement('option');
            opt.value = String(id);
            opt.textContent = email ? `${name} (${email})` : name;
            select.appendChild(opt);
        });
        select.onchange = () => updateShoppingSendButtonState();
        updateShoppingSendButtonState();
    } catch (_) {
        select.innerHTML = '<option value="">Sin encargados disponibles</option>';
        select.onchange = () => updateShoppingSendButtonState();
        updateShoppingSendButtonState();
    }
}

async function loadShoppingOrderActive() {
    try {
        const response = await fetch(API_URL + 'api/purchase-order/active', { headers: withAuthHeaders() });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
            handleSessionExpiredRedirect('Sesion expirada. Vuelve a iniciar sesion.');
            return false;
        }
        if (!response.ok) {
            setShoppingFeedback(data.message || 'No se pudo cargar orden activa.', 'error');
            return false;
        }
        shoppingOrderState = {
            order: data.order || null,
            items: Array.isArray(data.items) ? data.items : Object.values(data.items || {}),
        };
        renderShoppingOrderTable();
        applyShoppingCreateWorkspaceState();
        if (shoppingOrderState.order) {
            setShoppingFeedback('Orden activa cargada.', 'ok');
        } else {
            setShoppingFeedback('');
            const createSection = document.getElementById('shopping-create-section');
            const receiveSection = document.getElementById('shopping-receive-section');
            const isCreateVisible = Boolean(createSection && !createSection.classList.contains('hidden'));
            const isReceiveVisible = Boolean(receiveSection && !receiveSection.classList.contains('hidden'));
            if (isCreateVisible || isReceiveVisible) {
                await openShoppingRequestsView();
            }
        }
        return Boolean(shoppingOrderState.order);
    } catch (error) {
        setShoppingFeedback('Error de conexión al cargar orden activa.', 'error');
        return false;
    }
}

async function addShoppingItemFromInput() {
    if (!shoppingOrderState.order) {
        setShoppingFeedback('No hay una orden activa. Debes crear una nueva orden.', 'warning');
        return;
    }
    const input = document.getElementById('shopping-product-input');
    const rawValue = String(input?.value || '').trim();
    const query = normalizeBarcodeByScannerSettings(rawValue) || normalizeText(rawValue);
    if (!query) {
        setShoppingFeedback('Ingresa o escanea un producto.', 'warning');
        return;
    }
    try {
        const product = await findProductByCodeOrText(query);
        if (!product) {
            setShoppingFeedback('Producto no encontrado.', 'error');
            return;
        }
        const code = normalizeText(product.codigo_barras);
        const desc = normalizeText(product.descripcion || code || 'Producto');
        const existing = (shoppingOrderState.items || []).find((item) => normalizeText(item.barcode) === code);
        const isEditingExisting = Boolean(existing);
        const currentRequested = Number.parseFloat(existing?.requested_qty ?? 0) || 0;
        const defaultQty = isEditingExisting ? String(currentRequested) : '1';
        const qtyRaw = (typeof window.appPrompt === 'function')
            ? await window.appPrompt(
                isEditingExisting
                    ? `El producto ya est\u00e1 en la orden.\n\nProducto: ${desc}\nCodigo: ${code}\nCantidad solicitada actual: ${currentRequested.toFixed(2)}\n\nIngresa la nueva cantidad total solicitada:`
                    : `Producto: ${desc}\nCodigo: ${code}\n\nIngresa la cantidad a encargar:`,
                defaultQty,
                {
                    title: isEditingExisting ? 'Producto ya agregado' : 'Agregar a orden de compra',
                    inputType: 'number',
                    inputMode: 'decimal',
                    placeholder: 'Ej: 12',
                    okText: 'Guardar',
                    cancelText: 'Cancelar',
                    validate: (value) => {
                        const n = Number(String(value || '').replace(',', '.'));
                        if (!Number.isFinite(n) || n <= 0) return 'Ingresa una cantidad valida mayor a 0';
                        return '';
                    },
                }
            )
            : prompt(
                isEditingExisting
                    ? `El producto ya esta en la orden.\nProducto: ${desc}\nCodigo: ${code}\nCantidad actual: ${currentRequested.toFixed(2)}\nNueva cantidad total:`
                    : `Producto: ${desc}\nCodigo: ${code}\nCantidad a encargar:`,
                defaultQty
            );
        if (qtyRaw === null) return;
        const qty = Number(String(qtyRaw).replace(',', '.'));
        if (!Number.isFinite(qty) || qty <= 0) {
            setShoppingFeedback('Cantidad invalida.', 'warning');
            return;
        }

        const response = await fetch(API_URL + 'api/purchase-order/items', {
            method: 'POST',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                barcode: code,
                description: desc,
                product_id: Number(product.id_producto || 0) || null,
                qty,
                replace_qty: isEditingExisting ? qty : null,
            }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
            handleSessionExpiredRedirect('Sesion expirada. Vuelve a iniciar sesion.');
            return;
        }
        if (!response.ok) {
            setShoppingFeedback(data.message || 'No se pudo agregar a la orden.', 'error');
            return;
        }
        if (input) input.value = '';
        if (Array.isArray(data.items)) {
            shoppingOrderState = {
                order: data.order || shoppingOrderState.order || null,
                items: data.items,
            };
            renderShoppingOrderTable();
        } else {
            await loadShoppingOrderActive();
        }
        setShoppingFeedback(isEditingExisting ? 'Cantidad solicitada actualizada en la orden.' : 'Producto agregado a la orden de compra.', 'ok');
        if (input) {
            setTimeout(() => {
                try {
                    input.focus();
                } catch (_) {
                }
            }, 0);
        }
    } catch (_) {
        setShoppingFeedback('No se pudo agregar el producto.', 'error');
    }
}

async function assignShoppingOrderAndEmail() {
    if (!shoppingOrderState.order) {
        setShoppingFeedback('No hay una orden activa para enviar.', 'warning');
        return;
    }
    const buyerSelect = document.getElementById('shopping-buyer-select');
    const noteInput = document.getElementById('shopping-assignment-note');
    const sendBtn = document.getElementById('shopping-send-close-btn');
    const buyerId = Number(buyerSelect?.value || 0);
    const note = normalizeText(noteInput?.value || '');
    if (!buyerId) {
        setShoppingFeedback('Selecciona un encargado de compra.', 'warning');
        return;
    }
    try {
        if (sendBtn) sendBtn.disabled = true;
        showShoppingBusyOverlay('Enviando correo y cerrando orden...');
        const response = await fetch(API_URL + 'api/purchase-order/assign-email', {
            method: 'POST',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ buyer_id: buyerId, note }),
        });
        const data = await response.json().catch(() => ({}));
        hideShoppingBusyOverlay();
        if (response.status === 401) {
            handleSessionExpiredRedirect('Sesion expirada. Vuelve a iniciar sesion.');
            return;
        }
        if (!response.ok) {
            setShoppingFeedback(data.message || 'No se pudo enviar la orden.', 'error');
            return;
        }
        const shouldPrint = (typeof window.appConfirm === 'function')
            ? await window.appConfirm(
                'La orden fue enviada y cerrada.\n\n¿Quieres imprimir una copia en impresora de hoja (carta/oficio)?',
                'info',
                {
                    title: 'Imprimir orden',
                    okText: 'Sí, imprimir',
                    cancelText: 'No imprimir',
                }
            )
            : confirm('¿Quieres imprimir una copia de la orden en impresora normal (carta/oficio)?');
        if (shouldPrint) {
            const printPayload = data.print_payload || {
                order_id: shoppingOrderState.order?.id || 0,
                requested_by: localStorage.getItem('username') || 'Usuario del sistema',
                buyer_name: buyerSelect?.selectedOptions?.[0]?.textContent || '',
                buyer_email: '',
                note,
                items: shoppingOrderState.items || [],
            };
            printShoppingOrderDocument(printPayload);
        }
        setShoppingFeedback(data.message || 'Orden enviada por correo y cerrada.', 'ok');
        shoppingOrderState = { order: null, items: [] };
        renderShoppingOrderTable();
        applyShoppingCreateWorkspaceState();
        await loadShoppingRequestsSummary();
        setShoppingMode('requests');
    } catch (_) {
        hideShoppingBusyOverlay();
        setShoppingFeedback('Error de conexión al enviar orden.', 'error');
    } finally {
        if (sendBtn) sendBtn.disabled = false;
    }
}

function buildShoppingOrderPrintHtml(payload = {}) {
    const orderId = Number(payload.order_id || 0);
    const dateText = payload.date ? new Date(payload.date).toLocaleString('es-CL') : new Date().toLocaleString('es-CL');
    const requestedBy = escapeHtml(normalizeText(payload.requested_by || 'Usuario del sistema'));
    const buyerName = escapeHtml(normalizeText(payload.buyer_name || ''));
    const buyerEmail = escapeHtml(normalizeText(payload.buyer_email || ''));
    const note = escapeHtml(normalizeText(payload.note || ''));
    const items = Array.isArray(payload.items) ? payload.items : [];
    const rowsHtml = items.map((item, idx) => {
        const requested = Number(item.requested_qty || 0);
        const received = Number(item.received_qty || 0);
        const pending = Number(item.pending_qty || Math.max(0, requested - received));
        const requesterNames = escapeHtml(normalizeText(item.requester_names || '-'));
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        return `
            <tr style="background:${bg};">
                <td>${idx + 1}</td>
                <td>${escapeHtml(normalizeText(item.description || ''))}</td>
                <td>${escapeHtml(normalizeText(item.barcode || ''))}</td>
                <td style="text-align:right;">${requested.toFixed(2)}</td>
                <td style="text-align:right;">${received.toFixed(2)}</td>
                <td style="text-align:right; font-weight:700;">${pending.toFixed(2)}</td>
                <td>${requesterNames}</td>
            </tr>
        `;
    }).join('');
    const totalRequested = items.reduce((acc, item) => acc + Number(item.requested_qty || 0), 0);
    const totalReceived = items.reduce((acc, item) => acc + Number(item.received_qty || 0), 0);
    const totalPending = items.reduce((acc, item) => acc + Number(item.pending_qty || 0), 0);

    return `<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Orden de compra #${orderId || '-'}</title>
    <style>
        @page { size: auto; margin: 12mm; }
        body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; }
        .header { border-bottom: 2px solid #1e3a8a; margin-bottom: 12px; padding-bottom: 8px; }
        .title { font-size: 22px; font-weight: 800; margin: 0; }
        .meta { font-size: 12px; margin-top: 4px; color: #334155; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #cbd5e1; padding: 7px 6px; font-size: 12px; vertical-align: top; }
        th { background: #e2e8f0; text-align: left; }
        tfoot td { background: #eff6ff; font-weight: 700; }
        .note { margin-top: 10px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <p class="title">Orden de compra #${orderId || '-'}</p>
        <div class="meta">Fecha: ${escapeHtml(dateText)}</div>
        <div class="meta">Solicitada por: ${requestedBy}</div>
        <div class="meta">Encargado: ${buyerName || '-'}</div>
        <div class="meta">Correo encargado: ${buyerEmail || '-'}</div>
    </div>
    ${note ? `<div class="note"><strong>Observación:</strong> ${note}</div>` : ''}
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Producto</th>
                <th>Código</th>
                <th>Solicitado</th>
                <th>Recibido</th>
                <th>Pendiente</th>
                <th>Solicitado por</th>
            </tr>
        </thead>
        <tbody>
            ${rowsHtml || '<tr><td colspan="7" style="text-align:center;">Sin productos.</td></tr>'}
        </tbody>
        <tfoot>
            <tr>
                <td colspan="3">Totales</td>
                <td style="text-align:right;">${totalRequested.toFixed(2)}</td>
                <td style="text-align:right;">${totalReceived.toFixed(2)}</td>
                <td style="text-align:right;">${totalPending.toFixed(2)}</td>
                <td></td>
            </tr>
        </tfoot>
    </table>
</body>
</html>`;
}

function printShoppingOrderDocument(payload = {}) {
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
        setShoppingFeedback('No se pudo abrir la ventana de impresión. Revisa bloqueo de popups.', 'warning');
        return;
    }
    const html = buildShoppingOrderPrintHtml(payload);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        try {
            printWindow.print();
        } catch (_) {
            // noop
        }
    }, 250);
}

function ensureShoppingBusyOverlay() {
    let overlay = document.getElementById('shopping-busy-overlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'shopping-busy-overlay';
    overlay.innerHTML = `
        <div id="shopping-busy-box" role="status" aria-live="polite">
            <div id="shopping-busy-spinner" aria-hidden="true"></div>
            <div id="shopping-busy-text">Enviando correo, por favor espera...</div>
        </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

function showShoppingBusyOverlay(message = 'Enviando correo, por favor espera...') {
    const overlay = ensureShoppingBusyOverlay();
    const textEl = overlay.querySelector('#shopping-busy-text');
    if (textEl) textEl.textContent = String(message || 'Procesando...');
    overlay.classList.add('show');
}

function hideShoppingBusyOverlay() {
    const overlay = document.getElementById('shopping-busy-overlay');
    if (!overlay) return;
    overlay.classList.remove('show');
}

function getShoppingReceiveItemStatus(item) {
    const requested = Number(item.requested_qty || 0);
    const received = Number(item.received_qty || 0);
    if (received <= 0) {
        return { css: 'shopping-status-missing', icon: 'X', text: 'Pendiente sin ingreso' };
    }
    if (Math.abs(received - requested) < 0.000001) {
        return { css: 'shopping-status-complete', icon: '✓', text: 'Ingreso exacto (igual a lo solicitado)' };
    }
    if (received > requested) {
        return { css: 'shopping-status-partial', icon: '✓', text: 'Ingreso mayor a lo solicitado' };
    }
    return { css: 'shopping-status-short', icon: '✓', text: 'Ingreso menor a lo solicitado' };
}

function areBarcodesEquivalent(a, b) {
    const left = normalizeText(a || '');
    const right = normalizeText(b || '');
    if (!left || !right) return false;
    if (left === right) return true;
    const leftDigits = left.replace(/\D/g, '');
    const rightDigits = right.replace(/\D/g, '');
    if (!leftDigits || !rightDigits) return false;
    const leftNorm = leftDigits.replace(/^0+/, '') || '0';
    const rightNorm = rightDigits.replace(/^0+/, '') || '0';
    return leftNorm === rightNorm;
}

function renderShoppingReceiveItemsTable() {
    const body = document.getElementById('shopping-receive-items-body');
    if (!body) return;
    const items = Array.isArray(shoppingReceiveState.items) ? shoppingReceiveState.items : [];
    body.innerHTML = '';
    if (!items.length) {
        body.innerHTML = '<tr><td colspan="6" style="text-align:center;">Selecciona una compra para ver detalle.</td></tr>';
        return;
    }
    items.forEach((item) => {
        const requested = Number(item.requested_qty || 0);
        const received = Number(item.received_qty || 0);
        const pending = Math.max(0, requested - received);
        const st = getShoppingReceiveItemStatus(item);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td title="${escapeHtml(st.text)}"><span class="shopping-status-badge ${st.css}">${st.icon}</span></td>
            <td>${escapeHtml(normalizeText(item.barcode || ''))}</td>
            <td>${escapeHtml(normalizeText(item.description || ''))}</td>
            <td style="text-align:right;">${requested.toFixed(2)}</td>
            <td style="text-align:right;">${received.toFixed(2)}</td>
            <td style="text-align:right;">${pending.toFixed(2)}</td>
        `;
        body.appendChild(tr);
    });
}

function setShoppingReceiveDetailVisible(visible) {
    const detailColumn = document.getElementById('shopping-receive-detail-column');
    if (!detailColumn) return;
    detailColumn.classList.toggle('hidden', !Boolean(visible));
}

function renderShoppingReceiveOrdersTable() {
    const body = document.getElementById('shopping-receive-orders-body');
    if (!body) return;
    const list = Array.isArray(shoppingReceiveState.pendingOrders) ? shoppingReceiveState.pendingOrders : [];
    body.innerHTML = '';
    if (!list.length) {
        body.innerHTML = '<tr><td colspan="4" style="text-align:center;">Sin compras pendientes.</td></tr>';
        return;
    }
    list.forEach((row) => {
        const requested = Number.parseFloat(row.requested_qty ?? 0) || 0;
        const received = Number.parseFloat(row.received_qty ?? 0) || 0;
        const pending = Math.max(0, requested - received);
        const selected = Number(shoppingReceiveState.selectedOrderId || 0) === Number(row.id || 0);
        const tr = document.createElement('tr');
        tr.style.background = selected ? '#eff6ff' : '';
        tr.innerHTML = `
            <td>#${Number(row.id || 0)}</td>
            <td style="text-align:right;">${Number(row.items_count || 0)}</td>
            <td style="text-align:right;">${pending.toFixed(2)}</td>
            <td style="text-align:center;"><button class="btn" type="button" data-order-id="${Number(row.id || 0)}">Ver</button></td>
        `;
        const btn = tr.querySelector('button[data-order-id]');
        if (btn) {
            btn.addEventListener('click', async () => {
                await loadShoppingReceiveOrderDetail(Number(row.id || 0));
            });
        }
        body.appendChild(tr);
    });
}

async function loadShoppingReceiveOrderDetail(orderId) {
    if (!orderId) return;
    try {
        const response = await fetch(API_URL + `api/purchase-order/${orderId}/detail`, { headers: withAuthHeaders() });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
            handleSessionExpiredRedirect('Sesion expirada. Vuelve a iniciar sesion.');
            return;
        }
        if (!response.ok) {
            setShoppingFeedback(data.message || 'No se pudo cargar detalle de la compra.', 'error', true);
            return;
        }
        shoppingReceiveState.selectedOrderId = Number(data.order?.id || 0) || null;
        shoppingReceiveState.selectedOrder = data.order || null;
        shoppingReceiveState.items = Array.isArray(data.items) ? data.items : [];
        setShoppingReceiveDetailVisible(Boolean(shoppingReceiveState.selectedOrderId));
        const selectedOrderEl = document.getElementById('shopping-receive-selected-order');
        if (selectedOrderEl) {
            selectedOrderEl.textContent = shoppingReceiveState.selectedOrderId
                ? `Pedido seleccionado: #${shoppingReceiveState.selectedOrderId}`
                : 'Sin pedido seleccionado.';
        }
        renderShoppingReceiveOrdersTable();
        renderShoppingReceiveItemsTable();
        setShoppingFeedback(`Orden #${shoppingReceiveState.selectedOrderId} cargada para recepción.`, 'ok', true);
        const input = document.getElementById('shopping-receive-input');
        if (input) {
            input.value = '';
            setTimeout(() => {
                try {
                    input.focus();
                    input.select();
                } catch (_) {
                }
            }, 0);
        }
    } catch (_) {
        setShoppingFeedback('Error de conexión al cargar detalle de la compra.', 'error', true);
    }
}

async function refreshShoppingReceiveOrders(autoselect = true) {
    try {
        const response = await fetch(API_URL + 'api/purchase-orders/summary', { headers: withAuthHeaders() });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
            handleSessionExpiredRedirect('Sesion expirada. Vuelve a iniciar sesion.');
            return;
        }
        if (!response.ok) {
            setShoppingFeedback(data.message || 'No se pudo cargar compras pendientes.', 'error', true);
            return;
        }
        const pending = Array.isArray(data.pending_orders) ? data.pending_orders : [];
        shoppingReceiveState.pendingOrders = pending;
        renderShoppingReceiveOrdersTable();
        if (!pending.length) {
            shoppingReceiveState.selectedOrderId = null;
            shoppingReceiveState.selectedOrder = null;
            shoppingReceiveState.items = [];
            setShoppingReceiveDetailVisible(false);
            const selectedOrderEl = document.getElementById('shopping-receive-selected-order');
            if (selectedOrderEl) {
                selectedOrderEl.textContent = 'Sin pedido seleccionado.';
            }
            renderShoppingReceiveItemsTable();
            setShoppingFeedback('No hay compras pendientes por ingresar.', 'warning', true);
            return;
        }
        const keepSelected = pending.some((row) => Number(row.id) === Number(shoppingReceiveState.selectedOrderId || 0));
        if (keepSelected) {
            await loadShoppingReceiveOrderDetail(Number(shoppingReceiveState.selectedOrderId));
            return;
        }
        if (autoselect) {
            await loadShoppingReceiveOrderDetail(Number(pending[0].id || 0));
        } else {
            shoppingReceiveState.selectedOrderId = null;
            shoppingReceiveState.selectedOrder = null;
            shoppingReceiveState.items = [];
            setShoppingReceiveDetailVisible(false);
            renderShoppingReceiveItemsTable();
            const selectedOrderEl = document.getElementById('shopping-receive-selected-order');
            if (selectedOrderEl) {
                selectedOrderEl.textContent = 'Sin pedido seleccionado.';
            }
        }
    } catch (_) {
        setShoppingFeedback('Error de conexión al cargar compras pendientes.', 'error', true);
    }
}

async function openShoppingReceiveFromInput() {
    const input = document.getElementById('shopping-receive-input');
    const raw = String(input?.value || '').trim();
    const query = normalizeBarcodeByScannerSettings(raw) || normalizeText(raw);
    if (!query) {
        setShoppingFeedback('Ingresa o escanea un producto para recepción.', 'warning', true);
        return;
    }
    if (!shoppingReceiveState.selectedOrderId) {
        setShoppingFeedback('Selecciona primero una compra pendiente.', 'warning', true);
        return;
    }
    if (!Array.isArray(shoppingReceiveState.items) || !shoppingReceiveState.items.length) {
        await loadShoppingReceiveOrderDetail(Number(shoppingReceiveState.selectedOrderId || 0));
    }
    const normalizedQuery = normalizeText(query).toLowerCase();
    const items = Array.isArray(shoppingReceiveState.items) ? shoppingReceiveState.items : [];
    let match = items.find((item) => areBarcodesEquivalent(item.barcode, query));
    if (!match) {
        const byDescExact = items.find((item) => normalizeText(item.description).toLowerCase() === normalizedQuery);
        if (byDescExact) {
            match = byDescExact;
        } else {
            const byDesc = items.filter((item) => normalizeText(item.description).toLowerCase().includes(normalizedQuery));
            if (byDesc.length === 1) {
                match = byDesc[0];
            } else if (byDesc.length > 1) {
                setShoppingFeedback('Hay varios productos que coinciden. Escribe el nombre completo o escanea el código exacto.', 'warning', true);
                if (input) {
                    input.focus();
                    input.select();
                }
                return;
            }
        }
    }
    if (!match) {
        await loadShoppingReceiveOrderDetail(Number(shoppingReceiveState.selectedOrderId || 0));
        const refreshedItems = Array.isArray(shoppingReceiveState.items) ? shoppingReceiveState.items : [];
        match = refreshedItems.find((item) => areBarcodesEquivalent(item.barcode, query));
    }
    if (!match) {
        setShoppingFeedback(`Ese producto no pertenece a la compra seleccionada. Código: ${normalizeText(query)}`, 'warning', true);
        if (input) {
            input.value = '';
            input.focus();
        }
        return;
    }
    const requested = Number(match.requested_qty || 0);
    const received = Number(match.received_qty || 0);
    const pending = Math.max(0, requested - received);
    const qtyRaw = (typeof window.appPrompt === 'function')
        ? await window.appPrompt(
            `Producto: ${normalizeText(match.description)}\nSolicitado: ${requested.toFixed(2)}\nRecibido: ${received.toFixed(2)}\nPendiente: ${pending.toFixed(2)}\n\nCantidad que llegó ahora:`,
            '',
            {
                title: 'Recepción de producto',
                inputType: 'number',
                inputMode: 'decimal',
                placeholder: 'Ej: 6',
                okText: 'Guardar recepción',
                cancelText: 'Cancelar',
                disableOkWhenInvalid: true,
                validate: (value) => {
                    const n = Number(String(value || '').replace(',', '.'));
                    if (!String(value || '').trim()) return 'Debes ingresar la cantidad que llegó';
                    if (!Number.isFinite(n) || n <= 0) return 'Ingresa una cantidad válida mayor a 0';
                    return '';
                },
            }
        )
        : prompt(`Producto: ${normalizeText(match.description)}\nPendiente: ${pending.toFixed(2)}\nCantidad que llegó:`, '');
    if (qtyRaw === null) return;
    const qty = Number(String(qtyRaw).replace(',', '.'));
    if (!Number.isFinite(qty) || qty <= 0) {
        setShoppingFeedback('Cantidad recibida inválida.', 'warning', true);
        return;
    }

    try {
        const response = await fetch(API_URL + 'api/purchase-order/receive', {
            method: 'POST',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                order_id: shoppingReceiveState.selectedOrderId,
                barcode: query,
                qty_received: qty,
            }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
            handleSessionExpiredRedirect('Sesion expirada. Vuelve a iniciar sesion.');
            return;
        }
        if (!response.ok) {
            setShoppingFeedback(data.message || 'No se pudo guardar recepción.', 'error', true);
            return;
        }
        if (input) input.value = '';
        await refreshShoppingReceiveOrders(true);
        const msg = data.order_ready_to_close
            ? 'Todos los productos fueron ingresados. Ya puedes cerrar el pedido.'
            : (data.inventory_message || data.message || 'Recepción guardada.');
        setShoppingFeedback(msg, 'ok', true);
        if (input) {
            setTimeout(() => {
                try {
                    input.focus();
                    input.select();
                } catch (_) {
                }
            }, 0);
        }
    } catch (_) {
        setShoppingFeedback('Error de conexión al registrar recepción.', 'error', true);
    }
}

async function closeSelectedShoppingReceiveOrder() {
    const orderId = Number(shoppingReceiveState.selectedOrderId || 0);
    if (!orderId) {
        setShoppingFeedback('Selecciona un pedido para cerrar.', 'warning', true);
        return;
    }
    try {
        let response = await fetch(API_URL + 'api/purchase-order/close', {
            method: 'POST',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ order_id: orderId }),
        });
        let data = await response.json().catch(() => ({}));
        if (response.status === 401) {
            handleSessionExpiredRedirect('Sesion expirada. Vuelve a iniciar sesion.');
            return;
        }
        if (response.status === 409) {
            const missingList = Array.isArray(data.missing_items) ? data.missing_items : [];
            const missingText = missingList.length
                ? missingList.map((it) => {
                    const pending = Number(it.pending_qty || 0).toFixed(2);
                    return `- ${normalizeText(it.description || it.barcode || 'Producto')} (faltan: ${pending})`;
                }).join('\n')
                : '- Hay productos pendientes';
            const confirmForce = (typeof window.appConfirm === 'function')
                ? await window.appConfirm(
                    `Aún faltan productos por ingresar:\n\n${missingText}\n\n¿Deseas cerrar el pedido de todas formas?`,
                    'warning',
                    {
                        title: 'Cerrar pedido incompleto',
                        okText: 'Confirmar cierre',
                        cancelText: 'Cancelar',
                    }
                )
                : confirm('Aún faltan productos por ingresar. ¿Deseas cerrar el pedido de todas formas?');
            if (!confirmForce) {
                setShoppingFeedback('Cierre cancelado. Pedido sigue abierto.', 'warning', true);
                return;
            }
            response = await fetch(API_URL + 'api/purchase-order/close', {
                method: 'POST',
                headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ order_id: orderId, force_close: 1 }),
            });
            data = await response.json().catch(() => ({}));
            if (response.status === 401) {
                handleSessionExpiredRedirect('Sesion expirada. Vuelve a iniciar sesion.');
                return;
            }
        }
        if (!response.ok) {
            setShoppingFeedback(data.message || 'No se pudo cerrar el pedido.', 'error', true);
            return;
        }
        setShoppingFeedback(data.message || 'Pedido cerrado.', 'ok', true);
        await refreshShoppingReceiveOrders(true);
        await loadShoppingRequestsSummary();
    } catch (_) {
        setShoppingFeedback('Error de conexión al cerrar el pedido.', 'error', true);
    }
}

function renderShoppingOrdersSummaryRows(rows, bodyId, isClosed = false) {
    const body = document.getElementById(bodyId);
    if (!body) return;
    const list = Array.isArray(rows) ? rows : [];
    body.innerHTML = '';
    if (!list.length) {
        body.innerHTML = `<tr><td colspan="6" style="text-align:center;">${isClosed ? 'Sin solicitudes cerradas.' : 'Sin pendientes.'}</td></tr>`;
        return;
    }
    list.forEach((row) => {
        const requested = Number.parseFloat(row.requested_qty ?? 0) || 0;
        const received = Number.parseFloat(row.received_qty ?? 0) || 0;
        const diff = requested - received;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${Number(row.id || 0)}</td>
            <td style="text-align:right;">${Number(row.items_count || 0)}</td>
            <td style="text-align:right;">${requested.toFixed(2)}</td>
            <td style="text-align:right;">${received.toFixed(2)}</td>
            <td style="text-align:right;">${diff.toFixed(2)}</td>
            <td>${escapeHtml(String((isClosed ? (row.assignment_sent_at || row.updated_at) : row.updated_at) || '').replace('T', ' ').slice(0, 19) || '-')}</td>
        `;
        body.appendChild(tr);
    });
}

function renderShoppingClosedRequestsRows(rows) {
    const body = document.getElementById('shopping-requests-closed-body');
    if (!body) return;
    const list = Array.isArray(rows) ? rows : [];
    body.innerHTML = '';
    if (!list.length) {
        body.innerHTML = '<tr><td colspan="7" style="text-align:center;">Sin solicitudes cerradas.</td></tr>';
        return;
    }
    list.forEach((row) => {
        const requested = Number.parseFloat(row.requested_qty ?? 0) || 0;
        const received = Number.parseFloat(row.received_qty ?? 0) || 0;
        const isComplete = String(row.reception_result || '') === 'complete';
        const badgeClass = isComplete ? 'shopping-status-complete' : 'shopping-status-missing';
        const badgeIcon = isComplete ? '✓' : 'X';
        const closedAt = String(row.reception_closed_at || row.updated_at || '').replace('T', ' ').slice(0, 19) || '-';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="shopping-status-badge ${badgeClass}">${badgeIcon}</span></td>
            <td>#${Number(row.id || 0)}</td>
            <td style="text-align:right;">${Number(row.items_count || 0)}</td>
            <td style="text-align:right;">${requested.toFixed(2)}</td>
            <td style="text-align:right;">${received.toFixed(2)}</td>
            <td>${escapeHtml(closedAt)}</td>
            <td style="text-align:center;"><button class="btn" type="button" data-request-id="${Number(row.id || 0)}">Ver</button></td>
        `;
        const btn = tr.querySelector('button[data-request-id]');
        if (btn) {
            btn.addEventListener('click', async () => {
                await loadShoppingRequestDetail(Number(row.id || 0));
            });
        }
        body.appendChild(tr);
    });
}

function renderShoppingRequestDetail(order, items) {
    const header = document.getElementById('shopping-request-detail-header');
    const body = document.getElementById('shopping-request-detail-body');
    if (!body) return;
    const list = Array.isArray(items) ? items : [];
    if (header) {
        if (!order) {
            header.textContent = 'Selecciona una solicitud cerrada para ver el detalle.';
        } else {
            const state = String(order.reception_result || '') === 'complete' ? 'Recepción completa' : 'Recepción cerrada con faltantes';
            header.textContent = `Solicitud #${Number(order.id || 0)} - ${state}`;
        }
    }
    body.innerHTML = '';
    if (!order || !list.length) {
        body.innerHTML = '<tr><td colspan="6" style="text-align:center;">Sin detalle para mostrar.</td></tr>';
        return;
    }
    list.forEach((item) => {
        const requested = Number(item.requested_qty || 0);
        const received = Number(item.received_qty || 0);
        const pending = Math.max(0, requested - received);
        const status = getShoppingReceiveItemStatus(item);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="shopping-status-badge ${status.css}">${status.icon}</span></td>
            <td>${escapeHtml(normalizeText(item.barcode || ''))}</td>
            <td>${escapeHtml(normalizeText(item.description || ''))}</td>
            <td style="text-align:right;">${requested.toFixed(2)}</td>
            <td style="text-align:right;">${received.toFixed(2)}</td>
            <td style="text-align:right;">${pending.toFixed(2)}</td>
        `;
        body.appendChild(tr);
    });
}

async function loadShoppingRequestDetail(orderId) {
    if (!orderId) return;
    try {
        const response = await fetch(API_URL + `api/purchase-order/${orderId}/detail`, { headers: withAuthHeaders() });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
            handleSessionExpiredRedirect('Sesion expirada. Vuelve a iniciar sesion.');
            return;
        }
        if (!response.ok) {
            setShoppingFeedback(data.message || 'No se pudo cargar detalle de la solicitud.', 'error');
            return;
        }
        renderShoppingRequestDetail(data.order || null, data.items || []);
    } catch (_) {
        setShoppingFeedback('Error de conexión al cargar detalle de solicitud.', 'error');
    }
}

async function loadShoppingRequestsSummary() {
    try {
        const response = await fetch(API_URL + 'api/purchase-orders/summary', { headers: withAuthHeaders() });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
            handleSessionExpiredRedirect('Sesion expirada. Vuelve a iniciar sesion.');
            return;
        }
        if (!response.ok) {
            setShoppingFeedback(data.message || 'No se pudo cargar solicitudes de compra.', 'error');
            return;
        }
        renderShoppingOrdersSummaryRows(data.pending_orders || [], 'shopping-pending-orders-body', false);
        renderShoppingClosedRequestsRows(data.closed_orders || []);
        renderShoppingRequestDetail(null, []);
    } catch (_) {
        setShoppingFeedback('Error de conexión al cargar solicitudes.', 'error');
    }
}

async function startShoppingNewOrderFlow() {
    setShoppingMode('create');
    try {
        const response = await fetch(API_URL + 'api/purchase-order/create', {
            method: 'POST',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
            handleSessionExpiredRedirect('Sesion expirada. Vuelve a iniciar sesion.');
            return;
        }
        if (!response.ok) {
            setShoppingFeedback(data.message || 'No se pudo crear la orden de compra.', 'error');
            return;
        }
        await loadShoppingOrderActive();
        setShoppingFeedback(data.message || 'Orden de compra activa lista.', 'ok');
        const input = document.getElementById('shopping-product-input');
        if (input) {
            setTimeout(() => {
                try {
                    input.focus();
                    input.select();
                } catch (_) {
                }
            }, 0);
        }
    } catch (_) {
        setShoppingFeedback('Error de conexión al crear la orden.', 'error');
    }
}

async function closeShoppingOrder() {
    if (!shoppingOrderState.order) {
        setShoppingFeedback('No hay orden activa para cerrar.', 'warning');
        return;
    }
    const ok = (typeof window.appConfirm === 'function')
        ? await window.appConfirm('¿Cerrar la orden de compra actual? Quedará en solicitudes cerradas.', 'warning', {
            title: 'Cerrar orden',
            okText: 'Cerrar orden',
            cancelText: 'Cancelar',
        })
        : confirm('¿Cerrar la orden de compra actual?');
    if (!ok) return;

    try {
        const response = await fetch(API_URL + 'api/purchase-order/close', {
            method: 'POST',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
            handleSessionExpiredRedirect('Sesion expirada. Vuelve a iniciar sesion.');
            return;
        }
        if (!response.ok) {
            setShoppingFeedback(data.message || 'No se pudo cerrar la orden.', 'error');
            return;
        }
        shoppingOrderState = { order: null, items: [] };
        renderShoppingOrderTable();
        applyShoppingCreateWorkspaceState();
        setShoppingFeedback(data.message || 'Orden cerrada.', 'ok');
        await loadShoppingRequestsSummary();
    } catch (_) {
        setShoppingFeedback('Error de conexión al cerrar la orden.', 'error');
    }
}

async function openShoppingReceiveView() {
    setShoppingMode('receive');
    setShoppingReceiveDetailVisible(false);
    await refreshShoppingReceiveOrders(false);
    const input = document.getElementById('shopping-receive-input');
    if (input && shoppingReceiveState.selectedOrderId) {
        setTimeout(() => {
            try {
                input.focus();
                input.select();
            } catch (_) {
            }
        }, 0);
    }
}

async function openShoppingRequestsView() {
    setShoppingMode('requests');
    await loadShoppingRequestsSummary();
}

async function prepareShoppingView() {
    await loadShoppingBuyers();
    const hasActiveOrder = await loadShoppingOrderActive();
    const hasActiveItems = Array.isArray(shoppingOrderState.items) && shoppingOrderState.items.length > 0;
    applyShoppingCreateWorkspaceState();
    if (hasActiveOrder && hasActiveItems) {
        setShoppingMode('create');
        const input = document.getElementById('shopping-product-input');
        if (input) {
            setTimeout(() => {
                try {
                    input.focus();
                    input.select();
                } catch (_) {
                }
            }, 0);
        }
        return;
    }
    await openShoppingRequestsView();
}

function setupAddProductCodeGuard() {
    const codeInput = document.getElementById('product-code');
    if (!codeInput) return;
    codeInput.addEventListener('keydown', async (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        await handleExistingProductCodeOnAdd(true);
    });
}

function setupPromotionSelectorUI() {
    const select = document.getElementById('promo-products');
    if (!select) return;
    const minQtyInput = document.getElementById('promo-min-qty');
    const totalAmountInput = document.getElementById('promo-total-amount');
    select.addEventListener('change', addSelectedPromotionProduct);
    if (minQtyInput) {
        minQtyInput.addEventListener('input', () => refreshSinglePromotionDiscountFromTotal());
    }
    if (totalAmountInput) {
        totalAmountInput.addEventListener('input', () => refreshSinglePromotionDiscountFromTotal());
    }
    onPromotionTypeChange();
    setPromotionFormMode(false);
    renderPromotionSelectedProducts();
}

function isLoginBootstrapPage() {
    return Boolean(document.getElementById('login-form')) && !document.getElementById('barcode');
}

function scheduleIdleTask(task, fallbackDelay = 200) {
    const runTask = () => {
        try {
            task();
        } catch (_) {
        }
    };
    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => runTask(), { timeout: 1200 });
        return;
    }
    window.setTimeout(runTask, fallbackDelay);
}

async function warmupProductFormsData() {
    await Promise.allSettled([
        loadDepartmentOptions('product-department-add'),
        loadDepartmentOptions('product-department-edit'),
        loadProductSupplierOptions(),
        syncProfitConfigFromServer(),
    ]);
    applyDefaultProfitToProductForms();
}

/* Mostrar la informaciÃ³n en la consola*/

document.addEventListener('DOMContentLoaded', () => {
    if (isLoginBootstrapPage()) {
        return;
    }
    setupFrontendErrorReporting();
    setupSessionKeepAlive();
    applyUserPermissionsToUI();
    applyAdminSiaOnlyProductsActionsVisibility();
    setSalesEnabledByShift(false);
    setupProductSearchAutocomplete();
    setupAddProductCodeGuard();
    setupDepartmentNameUppercase();
    setupPromotionSelectorUI();
    setupCartQuantityKeyboardShortcuts();
    setupSystemFunctionKeyShortcuts();
    setupSalesHistoryKeyboardNavigation();
    setupSalesHistoryEditInputWatchers();
    setupSalesScannerStickyFocus();
    setupProductPriceAutoCalc();
    setupProductDescriptionTitleCase();
    setupAddInventoryToggle();
    setupBulkProductPopup();
    applyDefaultProfitToProductForms();
    restoreCartState();
    updateCartUI();
    loadSalesPromotionRules()
        .then(() => {
            if (Array.isArray(cart) && cart.length > 0) {
                updateCartUI();
            }
        })
        .catch(() => {});
    updateSalesSessionStrip();
    refreshLastSalesTicketInfoCard().catch(() => {});
    setupSalesMobileCameraPermissionHook();
    setupSalesCameraScanButtonVisibility();
    if (document.getElementById('inventory-code-input')) {
        clearInventoryView();
    }

    fetchScannerRuntimeSettings()
        .catch(() => {})
        .finally(() => {
            focusBarcodeInputForNextScan({ force: true, select: false });
        });

    ensureShiftStartedOnLoad().catch((error) => {
        console.error('Error ensureShiftStartedOnLoad:', error);
    });

    scheduleIdleTask(() => {
        warmupProductFormsData().catch(() => {});
    });
});

if (!isLoginBootstrapPage()) {
    window.addEventListener('resize', setupSalesCameraScanButtonVisibility);
    window.addEventListener('orientationchange', setupSalesCameraScanButtonVisibility);

    window.addEventListener('focus', refreshSuppliersOnProductContext);
    window.addEventListener('minimarket:suppliers-updated', refreshSuppliersOnProductContext);
    window.addEventListener('message', (event) => {
        try {
            if (event.origin !== window.location.origin) return;
            if (event?.data?.type !== 'minimarket:suppliers-updated') return;
            refreshSuppliersOnProductContext();
        } catch (_) {
        }
    });
}
            

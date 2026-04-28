const token = sessionStorage.getItem('token') || localStorage.getItem('token');
let cart = []; // Array para almacenar los productos del carrito
let myWindow;
var configuracion_ventana =
  "toolbar=no,"+
  "fullscreen=no,"+
  "location=no,"+
  "menubar=no,"+
  "resizable=no,"+
  "scrollbars=no,"+
  "status=no,"+
  "top=150,"+
  "left=200,"+
  "width=1100,"+
  "height=700";

(function setupCustomAlertUI() {
    if (window.__minimarketAlertUiInit) return;
    window.__minimarketAlertUiInit = true;

    const style = document.createElement('style');
    style.id = 'mm-alert-style';
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
        </div>
        <div id="mm-alert-actions">
          <button id="mm-alert-cancel" type="button" style="display:none;">Cancelar</button>
          <button id="mm-alert-close" type="button">Entendido</button>
        </div>
      </div>
    `;
    const mountStyleOnHead = () => {
        if (document.getElementById('mm-alert-style')) return true;
        const headEl = document.head || document.getElementsByTagName('head')[0];
        if (!headEl) return false;
        headEl.appendChild(style);
        return true;
    };
    const mountOverlayOnBody = () => {
        if (!document.body) return false;
        if (!document.getElementById('mm-alert-overlay')) {
            document.body.appendChild(overlay);
        }
        return true;
    };
    const mountAlertUi = () => {
        const styleReady = mountStyleOnHead();
        const overlayReady = mountOverlayOnBody();
        return styleReady && overlayReady;
    };
    if (!mountAlertUi()) {
        document.addEventListener('DOMContentLoaded', mountAlertUi, { once: true });
        window.addEventListener('load', mountAlertUi, { once: true });
    }

    const boxEl = overlay.querySelector('#mm-alert-box');
    const iconEl = overlay.querySelector('#mm-alert-icon');
    const titleEl = overlay.querySelector('#mm-alert-title');
    const messageEl = overlay.querySelector('#mm-alert-message');
    const inputWrapEl = overlay.querySelector('#mm-alert-input-wrap');
    const inputEl = overlay.querySelector('#mm-alert-input');
    const closeBtn = overlay.querySelector('#mm-alert-close');
    const cancelBtn = overlay.querySelector('#mm-alert-cancel');

    let activeResolver = null;
    let activeMode = 'alert';

    function resolveDialog(value) {
        if (!activeResolver) return;
        const resolver = activeResolver;
        activeResolver = null;
        overlay.classList.remove('show');
        resolver(value);
    }

    function closeByDismiss() {
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
            closeByDismiss();
        }
        if (ev.key === 'Enter') {
            ev.preventDefault();
            if (activeMode === 'prompt') {
                resolveDialog(String(inputEl.value || ''));
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

        const detectedType = detectType(opts.message, opts.type || '');
        const cfg = getTypeConfig(detectedType);
        boxEl.classList.remove('mm-alert-info', 'mm-alert-success', 'mm-alert-error', 'mm-alert-warning', 'mm-alert-input');
        boxEl.classList.add(cfg.cls);

        iconEl.textContent = cfg.icon;
        titleEl.textContent = String(opts.title || cfg.title);
        messageEl.textContent = String(opts.message ?? '');

        closeBtn.textContent = String(opts.okText || (mode === 'alert' ? 'Entendido' : 'Aceptar'));
        cancelBtn.textContent = String(opts.cancelText || 'Cancelar');

        const needsCancel = mode === 'confirm' || mode === 'prompt';
        const needsInput = mode === 'prompt';

        cancelBtn.style.display = needsCancel ? '' : 'none';
        inputWrapEl.style.display = needsInput ? '' : 'none';

        inputEl.value = needsInput ? String(opts.defaultValue ?? '') : '';
        inputEl.placeholder = needsInput ? String(opts.placeholder || '') : '';

        mountAlertUi();
        overlay.classList.add('show');

        return new Promise((resolve) => {
            activeResolver = resolve;
            setTimeout(() => {
                if (needsInput) {
                    inputEl.focus();
                    inputEl.select();
                } else {
                    closeBtn.focus();
                }
            }, 0);
        });
    }

    closeBtn.addEventListener('click', () => {
        if (activeMode === 'prompt') {
            resolveDialog(String(inputEl.value || ''));
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

function applyHeaderLogo() {
  const logoEl = document.getElementById('header-business-logo');
  const nameEl = document.getElementById('header-business-name');
  if (!logoEl) return;

  const keys = ['business_logo', 'logo_data', 'logo_url'];
  let logo = '';
  keys.some((k) => {
    const value = localStorage.getItem(k);
    if (value) {
      logo = value;
      return true;
    }
    return false;
  });

  if (logo) {
    logoEl.src = logo;
    logoEl.classList.remove('hidden');
    if (nameEl) nameEl.style.display = 'none';
  } else {
    logoEl.src = '';
    logoEl.classList.add('hidden');
    if (nameEl) nameEl.style.display = '';
  }
}

function open_w(popUpReference) {
  const temporarilyDisabledPopups = new Set([
    'articulos-precargados',
    'sincronizar-nube'
  ]);
  if (temporarilyDisabledPopups.has(popUpReference)) {
    if (popUpReference === 'sincronizar-nube') {
      alert('Sincronizar nube esta en preparacion y se habilitara cuando se configure el servicio de nube.');
      return;
    }
    alert('Articulos precargados esta en preparacion y se habilitara cuando se configure una fuente de catalogo global confiable.');
    return;
  }

  const embeddedPopups = new Set([
    'opciones-Habilitadas',
    'cajero',
    'base-datos',
    'articulos-precargados',
    'facturacion',
    'modificar-folio',
    'administrar-caja',
    'sucursales',
    'ticket',
    'corte-formato',
    'logotipo-programa',
    'forma-pago',
    'impuestos',
    'corte',
    'simbolo-moneda',
    'unidad-medida',
    'impresora',
    'lector-codigo',
    'cajon-dinero',
    'compra-proveedor',
    'sincronizar-nube',
    'notificar-correo',
    'respaldo-automatico',
    'licencia',
    'actualizacion-automatica'
  ]);

  if (embeddedPopups.has(popUpReference)) {
    openEmbeddedPopup("./popup/"+popUpReference+".php?v=20260320a");
    return;
  }
  myWindow = window.open(
    "./popup/"+popUpReference+".php",
    "_blank",
    configuracion_ventana
  ); 
};

function openEmbeddedPopup(url) {
  const overlay = document.getElementById('embedded-popup-overlay');
  const frame = document.getElementById('embedded-popup-frame');
  if (!overlay || !frame) {
    myWindow = window.open(url, "_blank", configuracion_ventana);
    return;
  }
  frame.onload = () => {
    try {
      if (frame.contentWindow) {
        frame.contentWindow.close = () => {
          window.postMessage({ type: 'close-app-popup' }, '*');
        };
      }
    } catch (_) {
      // noop: mismo origen esperado; si no, se mantiene boton Cerrar del overlay.
    }
  };
  frame.src = url;
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
}

function closeEmbeddedPopup() {
  const overlay = document.getElementById('embedded-popup-overlay');
  const frame = document.getElementById('embedded-popup-frame');
  if (!overlay || !frame) return;
  frame.src = 'about:blank';
  overlay.classList.add('hidden');
  overlay.style.display = '';
}

function close_w() {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'close-app-popup' }, '*');
    return;
  }
  window.close();
};

window.addEventListener('message', (event) => {
  if (event?.data?.type === 'close-app-popup') {
    closeEmbeddedPopup();
    return;
  }
  if (event?.data?.type === 'logo-updated') {
    const dataUrl = typeof event?.data?.dataUrl === 'string' ? event.data.dataUrl.trim() : '';
    if (dataUrl) {
      ['business_logo', 'logo_data', 'logo_url'].forEach((k) => localStorage.setItem(k, dataUrl));
    } else {
      ['business_logo', 'logo_data', 'logo_url'].forEach((k) => localStorage.removeItem(k));
    }
    applyHeaderLogo();
  }
});

if (!token) {
    window.location.href = 'index.php'; // Redirige al login si no hay token
}

window.onload = () => {};










document.addEventListener('DOMContentLoaded', () => {
    applyHeaderLogo();
    syncHeaderLogoFromServer().then((updated) => {
      if (updated) applyHeaderLogo();
    });

    // 1) Fuerza a que todos los contenedores .tabs sean horizontales
    //    (solo si el CSS no lo hace ya)
    document.querySelectorAll('.tabs').forEach(tabsBar => {
        tabsBar.style.display = 'flex';
        tabsBar.style.flexWrap = 'wrap';  // se ajusta si se queda sin ancho

        const tabs      = tabsBar.querySelectorAll('.tab');
        const contents  = tabsBar.nextElementSibling?.querySelectorAll('.tab-content');

        if (!tabs.length || !contents?.length) return; // nada que hacer

        // 2) Asigna el evento click a cada pestaÃƒÂ±a
        tabs.forEach((tab, idx) => {
            tab.addEventListener('click', () => {

                // Desactiva todos
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));

                // Activa el seleccionado
                tab.classList.add('active');
                contents[idx].classList.add('active');
            });
        });
    });

});











// MiniÃ¢â‚¬â€˜script para conmutar pestaÃƒÂ±as (sin librerÃƒÂ­as externas) -->
function showTab(index) {
  // Obtener todas las pestaÃƒÂ±as y el contenido
  const tabs = document.querySelectorAll('.tabs');
  const tabContents = document.querySelectorAll('.tab-content');

  // Eliminar la clase activa de todas las pestaÃƒÂ±as y contenido
  tabs.forEach(tab => tab.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));

  // Activar la pestaÃƒÂ±a y contenido correspondiente
  tabs[index].classList.add('active');
  tabContents[index].classList.add('active');
};
function showTabVenta(index) {
  // Obtener todas las pestaÃƒÂ±as y el contenido
  const tabs = document.querySelectorAll('.tabss');
  const tabContents = document.querySelectorAll('.tab-metodo-pago-content   ');

  // Eliminar la clase activa de todas las pestaÃƒÂ±as y contenido
  tabs.forEach(tab => tab.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));

  // Activar la pestaÃƒÂ±a y contenido correspondiente
  tabs[index].classList.add('active');
  tabContents[index].classList.add('active');
};

function showNewCajero(code){
  // FunciÃƒÂ³n para alternar la visibilidad del div
  const butonSettings = document.getElementById('toggleButton');
  const tablaSettings = document.getElementById('id-tablaNewCajero');
  const btnGuardarSettings = document.getElementById('guardarButton');
  
  if(code==1){
    btnGuardarSettings.classList.remove('hidden'); // Ocultar el div
    butonSettings.classList.add('hidden'); // Ocultar el div
    tablaSettings.classList.remove('hidden'); // Ocultar el div
  }else{
    btnGuardarSettings.classList.add('hidden'); // Ocultar el div
    butonSettings.classList.remove('hidden'); // Ocultar el div
    tablaSettings.classList.add('hidden'); // Ocultar el div
  }
};



function getDeviceInfo() {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  const isMobile = /Mobi|Android/i.test(userAgent);
  const isTablet = /Tablet|iPad/i.test(userAgent);
  const isWindows = /Win/i.test(platform);
  const isMac = /Mac/i.test(platform);
  const isLinux = /Linux/i.test(platform);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

  let os = "Desconocido";
  if (isWindows) os = "Windows";
  else if (isMac) os = "MacOS";
  else if (isLinux) os = "Linux";
  else if (isIOS) os = "iOS";
  else if (isMobile) os = "Android";

  let deviceType = "PC o Laptop";
  if (isMobile) deviceType = "MÃƒÂ³vil";
  else if (isTablet) deviceType = "Tablet";

  let browser = "Desconocido";
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) browser = "Google Chrome";
  else if (userAgent.includes("Firefox")) browser = "Mozilla Firefox";
  else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";
  else if (userAgent.includes("Edg")) browser = "Microsoft Edge";
  else if (userAgent.includes("Opera") || userAgent.includes("OPR")) browser = "Opera";
  else if (userAgent.includes("MSIE") || userAgent.includes("Trident")) browser = "Internet Explorer";

  return {
      sistemaOperativo: os,
      tipoDispositivo: deviceType,
      navegador: browser,
  };
};



  //toggle modo oscuro
const body = document.body;
const toggleBtn = document.getElementById('toggle-theme');
const root = document.documentElement; // <html>

if (toggleBtn) {
  // ---------- estado inicial ----------
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') enableDark();
  else enableLight();

  // ---------- eventos ----------
  toggleBtn.addEventListener('click', () => {
    if (root.getAttribute('data-theme') === 'dark') {
      enableLight();
    } else {
      enableDark();
    }
  });
}


  // ---------- helpers ----------
function enableDark() {
  root.setAttribute('data-theme', 'dark');
  body.classList.add('dark', 'dark-mode');
  localStorage.setItem('theme', 'dark');
  if (toggleBtn) { toggleBtn.textContent = 'Light'; }
};

function enableLight() {
  root.setAttribute('data-theme', 'light');
  body.classList.remove('dark', 'dark-mode');
  localStorage.setItem('theme', 'light');
  if (toggleBtn) { toggleBtn.textContent = 'Dark'; }
};

let temporaryAdminSectionAccess = null;
let adminSectionAuthInProgress = false;

function getSectionPermissionKeys(sectionId) {
  switch (sectionId) {
    case 'configuration':
      return ['configuracion_acceso'];
    case 'reports':
      return ['reportes_ver'];
    case 'cut':
      return ['corte_turno', 'corte_dia', 'corte_todos_turnos'];
    case 'product':
      return ['productos_crear', 'productos_modificar', 'productos_eliminar', 'productos_reporte_ventas', 'productos_crear_promociones', 'productos_modificar_varios'];
    case 'inventory':
      return ['inventario_agregar_mercancia', 'inventario_reportes_existencia', 'inventario_movimientos', 'inventario_ajustar'];
    case 'shopping':
      return ['compras_crear_orden', 'compras_recibir_orden'];
    default:
      return [];
  }
}

function getSectionDisplayName(sectionId) {
  switch (sectionId) {
    case 'configuration': return 'Configuración';
    case 'reports': return 'Reportes';
    case 'cut': return 'Corte';
    case 'product': return 'Productos';
    case 'inventory': return 'Inventario';
    case 'shopping': return 'Compras';
    case 'sales': return 'Ventas';
    default: return String(sectionId || 'sección');
  }
}

function getStoredUserPermissionsSafe() {
  try {
    const raw = localStorage.getItem('user_permissions');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null;
  }
}

function hasPermanentSectionAccess(sectionId) {
  const required = getSectionPermissionKeys(sectionId);
  if (!required.length) return true;

  const permissions = getStoredUserPermissionsSafe();
  if (!permissions) return true;

  return required.some((key) => Number(permissions?.[key] || 0) === 1);
}

function hasTemporarySectionAccess(sectionId) {
  return Boolean(
    temporaryAdminSectionAccess &&
    String(temporaryAdminSectionAccess.sectionId || '') === String(sectionId || '')
  );
}

function clearTemporarySectionAccess() {
  temporaryAdminSectionAccess = null;
}

function canAccessSection(sectionId) {
  if (hasPermanentSectionAccess(sectionId)) return true;
  return hasTemporarySectionAccess(sectionId);
}

function buildAuthHeadersForSectionElevation() {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token') || '';
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function verifyAdminCredentialsForSectionElevation(username, password, sectionId = '') {
  const apiBase = resolveApiBaseForHeader();
  let response;
  try {
    response = await fetch(apiBase + 'api/auth/verify-admin', {
      method: 'POST',
      headers: buildAuthHeadersForSectionElevation(),
      body: JSON.stringify({
        username: String(username || '').trim(),
        password: String(password || ''),
        section_id: String(sectionId || '').trim().toLowerCase(),
      }),
    });
  } catch (error) {
    return {
      ok: false,
      message: 'No se pudo conectar con el servidor para validar credenciales.',
    };
  }

  let data = {};
  let textBody = '';
  try {
    data = await response.json();
  } catch (_) {
    try {
      textBody = await response.text();
    } catch (_) {
      textBody = '';
    }
  }

  const fallbackMessage = textBody
    ? String(textBody).trim().slice(0, 220)
    : `No se pudo validar credenciales de administrador. (HTTP ${response.status})`;

  if (!response.ok) {
    return {
      ok: false,
      message: data?.message || fallbackMessage,
    };
  }
  return {
    ok: true,
    adminName: String(data?.nombre || data?.username || '').trim() || String(username || '').trim(),
    adminId: Number(data?.id || 0) || null,
  };
}

async function promptForAdminSectionAccess(sectionId) {
  const sectionName = getSectionDisplayName(sectionId);
  if (adminSectionAuthInProgress) return false;
  adminSectionAuthInProgress = true;
  try {
    const username = typeof window.appPrompt === 'function'
      ? await window.appPrompt(
        `Acceso restringido a ${sectionName}.\n\nIngresa usuario administrador:`,
        '',
        {
          title: 'Autorización administrador',
          okText: 'Continuar',
          cancelText: 'Cancelar',
          placeholder: 'Usuario administrador',
          helpText: 'Esta autorización aplica solo mientras permanezcas en esta pestaña.',
          validate: (value) => String(value || '').trim() ? '' : 'Debes ingresar usuario administrador.',
          disableOkWhenInvalid: true,
        }
      )
      : prompt(`Acceso restringido a ${sectionName}. Ingresa usuario administrador:`, '');

    if (username === null) return false;
    const usernameClean = String(username || '').trim();
    if (!usernameClean) return false;

    const password = typeof window.appPrompt === 'function'
      ? await window.appPrompt(
        'Ingresa contraseña del administrador:',
        '',
        {
          title: 'Autorización administrador',
          okText: 'Autorizar',
          cancelText: 'Cancelar',
          placeholder: 'Contraseña',
          inputType: 'password',
          validate: (value) => String(value || '').trim() ? '' : 'Debes ingresar contraseña.',
          disableOkWhenInvalid: true,
        }
      )
      : prompt('Ingresa contraseña del administrador:', '');

    if (password === null) return false;
    const passwordClean = String(password || '');
    if (!passwordClean.trim()) return false;

    const result = await verifyAdminCredentialsForSectionElevation(usernameClean, passwordClean, sectionId);
    if (!result.ok) {
      if (typeof window.appAlert === 'function') {
        await window.appAlert(result.message || 'Credenciales de administrador inválidas.', 'error', {
          title: 'Acceso denegado',
          okText: 'Entendido',
        });
      } else {
        alert(result.message || 'Credenciales de administrador inválidas.');
      }
      return false;
    }

    temporaryAdminSectionAccess = {
      sectionId: String(sectionId || ''),
      grantedAt: Date.now(),
      adminName: result.adminName || usernameClean,
      adminId: result.adminId || null,
    };
    return true;
  } catch (error) {
    if (typeof window.appAlert === 'function') {
      await window.appAlert(error?.message || 'No se pudo validar autorización de administrador.', 'error', {
        title: 'Autorización',
        okText: 'Entendido',
      });
    } else {
      alert(error?.message || 'No se pudo validar autorización de administrador.');
    }
    return false;
  } finally {
    adminSectionAuthInProgress = false;
  }
}

function resolveApiBaseForHeader() {
  if (typeof API_URL === 'string' && API_URL) {
    return API_URL.endsWith('/') ? API_URL : `${API_URL}/`;
  }
  const override = localStorage.getItem('api_url');
  if (override) return override.endsWith('/') ? override : `${override}/`;
  if (window.location.port === '3002') return `${window.location.origin}/`;
  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  const protocol = isLocalHost ? 'http:' : window.location.protocol;
  return `${protocol}//${window.location.hostname}:3002/`;
}

async function syncHeaderLogoFromServer() {
  const authToken = sessionStorage.getItem('token') || localStorage.getItem('token') || '';
  if (!authToken) return false;
  const apiBase = resolveApiBaseForHeader();
  try {
    const response = await fetch(apiBase + 'api/logo-settings', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return false;
    const logoData = typeof data?.logo_data === 'string' ? data.logo_data.trim() : '';
    if (!logoData) {
      let hadLogo = false;
      ['business_logo', 'logo_data', 'logo_url'].forEach((k) => {
        if (localStorage.getItem(k)) hadLogo = true;
        localStorage.removeItem(k);
      });
      return hadLogo;
    }
    ['business_logo', 'logo_data', 'logo_url'].forEach((k) => localStorage.setItem(k, logoData));
    return true;
  } catch (_) {
    return false;
  }
}



















 

  
  // =========================
  //  FunciÃƒÂ³n: mostrar secciÃƒÂ³n
  // =========================
async function showSection(sectionId) {
  const nextSectionId = String(sectionId || '').trim();
  if (!nextSectionId) {
    return;
  }

  if (temporaryAdminSectionAccess && String(temporaryAdminSectionAccess.sectionId || '') !== nextSectionId) {
    clearTemporarySectionAccess();
  }

  if (!canAccessSection(nextSectionId)) {
    const granted = await promptForAdminSectionAccess(nextSectionId);
    if (!granted || !canAccessSection(nextSectionId)) {
      return;
    }
  }

  // 1) Oculta todas
  document.querySelectorAll('.main-content > section').forEach(sec => sec.classList.add('hidden'));

  if (nextSectionId !== 'cut' && typeof window.resetCutViewToInitialState === 'function') {
    window.resetCutViewToInitialState();
  }

  // 2) Muestra la solicitada (si existe)
  const target = document.getElementById(nextSectionId);
  if (target) target.classList.remove('hidden');
  if (nextSectionId === 'configuration') {
    const configSection = document.getElementById('configuration');
    if (configSection) {
      configSection.querySelectorAll('.tabs .tab').forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.tab === 'general');
      });
      configSection.querySelectorAll('.tab-content').forEach((content) => {
        content.classList.toggle('active', content.id === 'general');
      });
    }
  }

  if (nextSectionId === 'reports' && typeof window.loadReports === 'function') {
    if (typeof window.loadReportFilters === 'function') {
      window.loadReportFilters().then(() => window.loadReports());
    } else {
      window.loadReports();
    }
  }
  if (nextSectionId === 'cut' && typeof window.loadCurrentCut === 'function') {
    window.loadCurrentCut();
  }
  if (nextSectionId === 'inventory' && typeof window.prepareInventoryView === 'function') {
    window.prepareInventoryView();
  }
  if (nextSectionId === 'shopping' && typeof window.prepareShoppingView === 'function') {
    window.prepareShoppingView();
  }
  if (nextSectionId === 'sales') {
    if (typeof window.focusBarcodeInputForNextScan === 'function') {
      window.focusBarcodeInputForNextScan();
    } else {
      const barcodeInput = document.getElementById('barcode');
      if (barcodeInput) {
        setTimeout(() => {
          try {
            barcodeInput.focus();
            barcodeInput.select();
          } catch (_) {
          }
        }, 0);
      }
    }
  }

  // 3) (Opcional) Cierra el menu en moviles
  if (window.innerWidth <= 768) {
    document.getElementById('main-menu')?.classList.add('collapsed');
  }
};












//pop ups 
document.querySelectorAll('.panel .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            // activar pestaÃƒÂ±a
            document.querySelectorAll('.panel .tab').forEach(t => t.classList.toggle('active', t === tab));
            // mostrar / ocultar contenido
            document.querySelectorAll('.panel .tab-content').forEach(c =>
                c.classList.toggle('active', c.id === target)
            );
        });
    });
/* Mostrar la informaciÃƒÂ³n en la consola
*/





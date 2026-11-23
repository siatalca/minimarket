// Guarda de las opciones de Configuración que el servidor solo deja usar a administradores (M-045).
//
// La autorización temporal de administrador (verify-admin en js/functions.js) solo abre la pantalla de
// Configuración: el token sigue siendo el del cajero, así que los endpoints protegidos con
// requireAdministrator o requireAdminSia (server/server.js) responden 403. Estas opciones se ocultan en
// content/configuracion.php (data-admin-only / data-admin-sia-only) y aquí se bloquea abrirlas por atajo,
// por consola o por la URL del popup.
//
// Lógica pura (sin DOM salvo guardPopupPage) para poder probarla con node --test.
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.MinimarketConfigGuard = api;
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';

    // Popup -> rol que exige el servidor para guardar en él.
    //   admin:     requireAdministrator (es_administrador = 1 o admin_sia).
    //   admin_sia: requireAdminSia (solo el usuario admin_sia).
    const POPUP_REQUIRED_ROLE = Object.freeze({
        'opciones-Habilitadas': 'admin', // POST /api/addInfo
        cajero: 'admin', // POST /api/cajeros, PUT y DELETE /api/cajeros/:id
        'administrar-caja': 'admin', // POST /api/cajas/upsert, DELETE /api/cajas/:numero
        'clientes-app': 'admin', // /api/admin/tienda/* (registerTiendaAdminRoutes)
        'datos-negocio': 'admin_sia', // GET y PUT /api/business-owner-settings
        'notificar-correo': 'admin_sia', // /api/service-email-settings
        'respaldo-automatico': 'admin_sia', // /api/admin/automatic-backup-settings, /api/admin/automatic-backups/run
    });

    const MESSAGE_ADMIN = 'Esta opción solo la puede usar un administrador con su propia sesión. '
        + 'La autorización temporal permite entrar a Configuración, pero no guardar aquí. '
        + 'Pide al administrador que inicie sesión con su usuario.';
    const MESSAGE_ADMIN_SIA = 'Esta opción solo está disponible para el usuario de soporte SIA (admin_sia).';

    function safeGet(storage, key) {
        try {
            return storage && typeof storage.getItem === 'function' ? storage.getItem(key) : null;
        } catch (_) {
            return null;
        }
    }

    // Mismo criterio que applyAdminSiaOnlyProductsActionsVisibility (js/scripts.js), que oculta las opciones.
    function readSessionRole(storage) {
        const login = String(safeGet(storage, 'user') || '').trim().toLowerCase();
        let isAdminSia = login === 'admin_sia';
        if (!isAdminSia) {
            try {
                const profile = JSON.parse(safeGet(storage, 'user_profile') || 'null');
                isAdminSia = String(profile?.username_login || '').trim().toLowerCase() === 'admin_sia';
            } catch (_) {
                isAdminSia = false;
            }
        }
        const isAdmin = isAdminSia || Number(safeGet(storage, 'user_is_admin') || 0) === 1;
        return { isAdmin, isAdminSia };
    }

    function requiredRoleForPopup(popupRef) {
        const key = String(popupRef || '').trim();
        return Object.prototype.hasOwnProperty.call(POPUP_REQUIRED_ROLE, key) ? POPUP_REQUIRED_ROLE[key] : null;
    }

    function checkConfigPopupAccess(popupRef, role) {
        const required = requiredRoleForPopup(popupRef);
        const current = role || { isAdmin: false, isAdminSia: false };
        if (required === 'admin_sia' && !current.isAdminSia) {
            return { allowed: false, message: MESSAGE_ADMIN_SIA };
        }
        if (required === 'admin' && !current.isAdmin) {
            return { allowed: false, message: MESSAGE_ADMIN };
        }
        return { allowed: true, message: '' };
    }

    // Texto para mostrar cuando un guardado responde 403: nunca el error crudo del servidor.
    function describeSaveError(status, serverMessage, fallback) {
        if (Number(status) === 403) return MESSAGE_ADMIN;
        const text = String(serverMessage || '').trim();
        return text || String(fallback || 'No se pudo guardar.');
    }

    // Bloquea un popup protegido abierto sin el rol que pide el servidor. Se llama desde el <head> del popup,
    // antes que sus otros scripts: su listener de DOMContentLoaded es el primero y corta los demás, así la
    // pantalla no carga datos ni muestra el formulario.
    function guardPopupPage(popupRef, options = {}) {
        const doc = options.document || (typeof document !== 'undefined' ? document : null);
        const win = options.window || (typeof window !== 'undefined' ? window : null);
        const storage = options.storage || (win ? win.localStorage : null);
        const result = checkConfigPopupAccess(popupRef, readSessionRole(storage));
        if (result.allowed || !doc) return result;

        doc.documentElement.classList.add('config-guard-blocked');
        const style = doc.createElement('style');
        style.textContent = 'html.config-guard-blocked body > *:not(.config-guard-notice){display:none !important;}'
            + '.config-guard-notice{max-width:560px;margin:32px auto;padding:20px 22px;border-radius:10px;'
            + 'background:#FFF7E6;color:#5C3B00;border-left:5px solid #B45309;font-family:inherit;line-height:1.45;}'
            + '.config-guard-notice h2{margin:0 0 8px;font-size:1.15rem;color:#5C3B00;}'
            + '.config-guard-notice p{margin:0 0 14px;}'
            + '.config-guard-notice button{font:inherit;font-weight:700;padding:9px 16px;border-radius:8px;'
            + 'border:1px solid #92400E;background:#B45309;color:#fff;cursor:pointer;}'
            + '.config-guard-notice button:focus-visible{outline:3px solid #0057B8;outline-offset:2px;}';
        (doc.head || doc.documentElement).appendChild(style);

        doc.addEventListener('DOMContentLoaded', (event) => {
            event.stopImmediatePropagation();
            const notice = doc.createElement('main');
            notice.className = 'config-guard-notice';
            notice.setAttribute('role', 'alert');
            const title = doc.createElement('h2');
            title.textContent = 'Opción solo para administradores';
            const text = doc.createElement('p');
            text.textContent = result.message;
            const closeBtn = doc.createElement('button');
            closeBtn.type = 'button';
            closeBtn.textContent = 'Cerrar';
            closeBtn.addEventListener('click', () => {
                if (win && win.parent && win.parent !== win) {
                    win.parent.postMessage({ type: 'close-app-popup' }, win.location.origin);
                } else if (win) {
                    win.close();
                }
            });
            notice.append(title, text, closeBtn);
            doc.body.prepend(notice);
            closeBtn.focus();
        }, { capture: true });
        return result;
    }

    return {
        POPUP_REQUIRED_ROLE,
        MESSAGE_ADMIN,
        MESSAGE_ADMIN_SIA,
        readSessionRole,
        requiredRoleForPopup,
        checkConfigPopupAccess,
        describeSaveError,
        guardPopupPage,
    };
});

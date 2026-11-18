// Utilidades de pantalla de la consulta de precios (misión M-037): almacenamiento seguro, creación de elementos
// con textContent, aviso breve e instalación en el teléfono (manifest, service worker y ayuda para iPhone).
(function () {
    'use strict';

    const IOS_HINT_KEY = 'consulta_ios_hint_oculto';

    function storageGet(key) {
        try { return window.localStorage.getItem(key) || ''; } catch (_) { return ''; }
    }
    function storageSet(key, value) {
        try { window.localStorage.setItem(key, value); } catch (_) {}
    }
    function storageRemove(key) {
        try { window.localStorage.removeItem(key); } catch (_) {}
    }

    function $(id) {
        return document.getElementById(id);
    }

    // Crea un elemento. attrs: class, text, y atributos normales; on: { click: fn }.
    // El texto siempre entra con textContent / createTextNode (nunca como HTML).
    function h(tag, attrs, children) {
        const node = document.createElement(tag);
        Object.entries(attrs || {}).forEach(([key, value]) => {
            if (value === undefined || value === null || value === false) return;
            if (key === 'class') node.className = value;
            else if (key === 'text') node.textContent = String(value);
            else if (key === 'on') Object.entries(value).forEach(([ev, fn]) => node.addEventListener(ev, fn));
            else if (value === true) node.setAttribute(key, '');
            else node.setAttribute(key, String(value));
        });
        (children || []).forEach((child) => {
            if (child === null || child === undefined || child === false) return;
            node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
        });
        return node;
    }

    function replaceContent(container, ...nodes) {
        if (!container) return;
        container.replaceChildren(...nodes.filter(Boolean));
    }

    let toastTimer = null;
    function showToast(text) {
        const toast = $('toast');
        if (!toast) return;
        toast.textContent = text;
        toast.classList.remove('hidden');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.add('hidden'), 2600);
    }

    function isStandalone() {
        return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);
    }

    // Botón «Instalar» (Android/Chrome), ayuda para iPhone y registro del service worker.
    function setupInstall() {
        const btn = $('install-btn');
        let installEvent = null;
        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            installEvent = event;
            btn.classList.remove('hidden');
        });
        btn.addEventListener('click', async () => {
            const event = installEvent;
            if (!event) return;
            installEvent = null;
            btn.classList.add('hidden');
            try {
                await event.prompt();
            } catch (_) {}
        });
        window.addEventListener('appinstalled', () => {
            installEvent = null;
            btn.classList.add('hidden');
            showToast('Listo: ya tienes el ícono en tu teléfono');
        });

        const ua = String(navigator.userAgent || '');
        const isIOS = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
        if (isIOS && !isStandalone() && storageGet(IOS_HINT_KEY) !== '1') {
            const hint = $('ios-install-hint');
            hint.appendChild(h('button', {
                class: 'link', type: 'button', text: 'Ocultar',
                on: { click: () => { hint.classList.add('hidden'); storageSet(IOS_HINT_KEY, '1'); } },
            }));
            hint.classList.remove('hidden');
        }

        if ('serviceWorker' in navigator && window.isSecureContext) {
            navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((error) => {
                console.warn('Consulta: no se pudo activar el modo instalable:', error.message);
            });
        }
    }

    window.ConsultaUi = { storageGet, storageSet, storageRemove, $, h, replaceContent, showToast, setupInstall };
})();

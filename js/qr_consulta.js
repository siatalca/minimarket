// Ventana «QR consulta de precios» de Configuración (misión M-037).
// Pide al servidor el QR (SVG) de location.origin + '/consulta/' con el token del personal y lo muestra para imprimir.
// La parte pura (dirección y aviso) no tiene pruebas automáticas propias; se verificó en el navegador.
(function registerQrConsulta(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    if (root && root.document) {
        root.QrConsultaCore = api;
    }
})(typeof window !== 'undefined' ? window : globalThis, function createQrConsultaCore() {
    'use strict';

    function buildConsultaUrl(origin) {
        return `${String(origin || '').replace(/\/+$/, '')}/consulta/`;
    }

    function isIpHostname(hostname) {
        const host = String(hostname || '').replace(/^\[|\]$/g, '');
        return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':');
    }

    // Aviso cuando la dirección del QR no sirve para los teléfonos de los clientes.
    function describeQrAddressProblem(location) {
        const hostname = String(location?.hostname || '').toLowerCase();
        const protocol = String(location?.protocol || '').toLowerCase();
        if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') {
            return 'Este QR apunta a este mismo computador (localhost): los teléfonos no podrán abrirlo. Abre el sistema con su dirección pública (https://...) y genera el QR desde ahí.';
        }
        if (isIpHostname(hostname)) {
            return 'Este QR apunta a una dirección IP: solo funcionará dentro de esta red y la cámara del teléfono necesita https. Mejor genera el QR desde la dirección pública del sistema (https://...).';
        }
        if (protocol !== 'https:') {
            return 'Este QR usa http://: el teléfono no podrá usar la cámara para escanear productos. Genera el QR desde la dirección https:// del sistema.';
        }
        return '';
    }

    function qrErrorMessage(status, body) {
        const code = body && typeof body.code === 'string' ? body.code : '';
        if (code === 'QR_UNAVAILABLE' || status === 503) return 'El servidor no tiene instalado el generador de códigos QR. Avisa a soporte para que lo instale.';
        if (code === 'INVALID_URL' || status === 400) return 'El servidor rechazó la dirección del QR. Debe ser https://<tu dominio>/consulta/. Abre el sistema con su dirección pública y vuelve a intentar.';
        if (status === 401) return 'Tu sesión expiró. Cierra esta ventana, vuelve a entrar al sistema y abre de nuevo «QR consulta».';
        if (status === 403) return 'Tu usuario no tiene permiso para generar el QR.';
        if (status === 404) return 'El servidor todavía no tiene la función de QR. Actualiza el sistema y vuelve a intentar.';
        if (body && typeof body.message === 'string' && body.message.trim()) return body.message.trim().slice(0, 200);
        return 'No se pudo generar el código QR. Intenta de nuevo.';
    }

    return { buildConsultaUrl, describeQrAddressProblem, qrErrorMessage };
});

(function () {
    'use strict';
    if (typeof window === 'undefined' || !window.document || !window.QrConsultaCore) return;
    const core = window.QrConsultaCore;
    const $ = (id) => document.getElementById(id);
    let API_URL = '';
    try { API_URL = window.MinimarketApi.resolveApiBase() || ''; } catch (_) { API_URL = ''; }
    let objectUrl = '';

    function staffToken() {
        try {
            return window.sessionStorage.getItem('token') || window.localStorage.getItem('token') || '';
        } catch (_) {
            return '';
        }
    }

    function showError(text) {
        const box = $('qr-error');
        box.textContent = text || '';
        box.classList.toggle('hidden', !text);
        $('qr-retry-btn').classList.toggle('hidden', !text);
    }

    function showPlaceholder(text) {
        $('qr-placeholder').textContent = text;
        $('qr-placeholder').classList.remove('hidden');
        $('qr-image').classList.add('hidden');
        $('qr-print-btn').disabled = true;
    }

    async function loadStoreName() {
        try {
            const response = await fetch(`${API_URL}api/tienda/info`, { headers: { Accept: 'application/json' } });
            const data = await response.json().catch(() => null);
            if (response.ok && data && typeof data.nombre === 'string' && data.nombre.trim()) {
                $('qr-store').textContent = data.nombre.trim();
            }
        } catch (_) {
            // El nombre es opcional en la hoja; el QR sigue funcionando sin él.
        }
    }

    async function loadQr() {
        const url = core.buildConsultaUrl(window.location.origin);
        $('qr-url').textContent = url;
        showError('');
        showPlaceholder('Generando el código QR…');
        const token = staffToken();
        if (!token) {
            showPlaceholder('Sin código QR.');
            showError(core.qrErrorMessage(401, null));
            return;
        }
        let response;
        try {
            response = await fetch(`${API_URL}api/consulta-qr.svg?url=${encodeURIComponent(url)}`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: 'no-store',
            });
        } catch (_) {
            showPlaceholder('Sin código QR.');
            showError('No hay conexión con el servidor. Revisa la red y vuelve a intentar.');
            return;
        }
        const type = String(response.headers.get('content-type') || '').toLowerCase();
        if (!response.ok || !type.includes('image/svg+xml')) {
            const body = type.includes('json') ? await response.json().catch(() => null) : null;
            showPlaceholder('Sin código QR.');
            showError(response.ok ? 'El servidor respondió algo que no es un código QR. Avisa a soporte.' : core.qrErrorMessage(response.status, body));
            return;
        }
        // Se muestra como imagen (blob), nunca insertando el SVG en la página.
        const blob = await response.blob();
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = URL.createObjectURL(new Blob([blob], { type: 'image/svg+xml' }));
        const img = $('qr-image');
        img.onload = () => {
            $('qr-placeholder').classList.add('hidden');
            img.classList.remove('hidden');
            $('qr-print-btn').disabled = false;
        };
        img.onerror = () => {
            showPlaceholder('Sin código QR.');
            showError('El código QR recibido no se pudo mostrar. Intenta de nuevo.');
        };
        img.src = objectUrl;
    }

    function init() {
        const warning = core.describeQrAddressProblem(window.location);
        if (warning) {
            $('qr-warning').textContent = warning;
            $('qr-warning').classList.remove('hidden');
        }
        $('qr-print-btn').addEventListener('click', () => window.print());
        $('qr-retry-btn').addEventListener('click', loadQr);
        loadStoreName();
        loadQr();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

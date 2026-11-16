// Escáner de códigos de barras con la cámara del teléfono.
// Un solo componente para Ventas, Productos, Inventario y Compras (misión M-033).
//
// - Usa BarcodeDetector del navegador si existe y lee todos los formatos pedidos.
// - Si no (iPhone/Safari, Firefox), usa ZXing guardado en js/vendor/zxing/ (versión fija 0.21.3),
//   que se carga solo la primera vez que se abre el escáner.
// - La cámara se detiene al cerrar, al leer un código y si la pestaña se oculta.
//
// API global:
//   openCameraBarcodeScanner({ onDetected(code), onClose() })
//   closeCameraBarcodeScanner()
//   isLikelyMobileDeviceForCameraPrompt()
//   refreshCameraScanButtonsVisibility()
// Botones: class="camera-scan-btn" se muestran solo en móvil. Con data-camera-scan-target="<id del input>"
// el código leído llena ese campo y simula el Enter del lector USB (misma acción que al escanear).
(function () {
    'use strict';

    const ZXING_VERSION = '0.21.3';
    const ZXING_FILE = `vendor/zxing/zxing-library-${ZXING_VERSION}.min.js`;

    // Formatos pedidos: EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39 e ITF.
    const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'];
    const ZXING_FORMATS = ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'CODE_128', 'CODE_39', 'ITF'];

    const NATIVE_INTERVAL_MS = 120;
    const ZXING_INTERVAL_MS = 200;
    const ZXING_MAX_WIDTH = 800;
    const MAX_CODE_LENGTH = 64;

    const MESSAGES = {
        insecure: 'Este dispositivo está usando HTTP. Para usar la cámara debes abrir el sistema con https://.',
        unsupported: 'Este navegador no permite usar la cámara desde esta página.',
        denied: 'El permiso de cámara está bloqueado para este sitio.',
        noCamera: 'No se encontró una cámara disponible en este dispositivo.',
        busy: 'La cámara está ocupada por otra aplicación. Ciérrala y vuelve a intentar.',
        other: 'No se pudo acceder a la cámara. Revisa los permisos del navegador para este sitio.',
        libraryFailed: 'No se pudo cargar el lector de códigos. Revisa la conexión y vuelve a intentar.',
    };

    // ---------- Lógica pura (probada en tests/camera-barcode-scanner.test.js) ----------

    // 'native' si el navegador tiene BarcodeDetector y lee todos los formatos pedidos; si no, 'zxing'.
    function chooseCameraBarcodeEngine(hasBarcodeDetector, supportedFormats) {
        if (!hasBarcodeDetector) return 'zxing';
        if (!Array.isArray(supportedFormats)) return 'zxing';
        const supported = new Set(supportedFormats.map((f) => String(f || '').toLowerCase()));
        return NATIVE_FORMATS.every((f) => supported.has(f)) ? 'native' : 'zxing';
    }

    // Quita caracteres de control y espacios de los extremos. Devuelve '' si no queda un código usable.
    function normalizeCameraBarcodeText(raw) {
        const text = String(raw ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
        if (!text || text.length > MAX_CODE_LENGTH) return '';
        return text;
    }

    function classifyCameraError(error) {
        const name = String(error?.name || '');
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
            return { kind: 'denied', message: MESSAGES.denied };
        }
        if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
            return { kind: 'no-camera', message: MESSAGES.noCamera };
        }
        if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
            return { kind: 'busy', message: MESSAGES.busy };
        }
        return { kind: 'other', message: MESSAGES.other };
    }

    // La cámara solo funciona en contexto seguro (https o localhost).
    function isCameraBlockedByInsecureContext(env) {
        if (typeof env?.isSecureContext === 'boolean') return !env.isSecureContext;
        const protocol = String(env?.protocol || '').toLowerCase();
        const hostname = String(env?.hostname || '').toLowerCase();
        if (protocol === 'https:') return false;
        return !(hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname.endsWith('.localhost'));
    }

    function isLikelyMobileDevice(env) {
        const ua = String(env?.userAgent || '').toLowerCase();
        const mobileUa = /(android|iphone|ipad|ipod|mobile)/i.test(ua);
        return mobileUa || Boolean(env?.touchCapable && env?.narrowScreen);
    }

    function getCameraPermissionHelpText(userAgent, insecure) {
        const ua = String(userAgent || '').toLowerCase();
        if (insecure) {
            return 'La cámara requiere HTTPS. Abre el sistema con https:// (no http://IP) y vuelve a intentar el escáner.';
        }
        if (ua.includes('iphone') || ua.includes('ipad') || (ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android'))) {
            return 'Safari: toca «aA» o el candado de la barra de direcciones, entra a Configuración del sitio y cambia Cámara a Permitir. Si sigue bloqueado, abre Ajustes > Safari > Cámara > Permitir.';
        }
        if (ua.includes('android') && ua.includes('chrome')) {
            return 'Chrome Android: toca el candado de la barra de direcciones > Permisos > Cámara > Permitir. Luego vuelve y pulsa Reintentar escáner.';
        }
        return 'En el navegador, abre el candado del sitio y cambia Cámara a Permitir. Luego vuelve y pulsa Reintentar escáner.';
    }

    // Zona central del video que se analiza con ZXing (franja horizontal, como el recuadro guía).
    function getCenterCropRect(videoWidth, videoHeight, maxWidth = ZXING_MAX_WIDTH) {
        const w = Math.max(0, Math.floor(Number(videoWidth) || 0));
        const h = Math.max(0, Math.floor(Number(videoHeight) || 0));
        if (!w || !h) return null;
        const sw = Math.max(1, Math.round(w * 0.9));
        const sh = Math.max(1, Math.round(h * 0.5));
        const sx = Math.round((w - sw) / 2);
        const sy = Math.round((h - sh) / 2);
        const scale = Math.min(1, maxWidth / sw);
        return { sx, sy, sw, sh, dw: Math.max(1, Math.round(sw * scale)), dh: Math.max(1, Math.round(sh * scale)) };
    }

    function createZXingReader(ZXing) {
        const hints = new Map();
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS.map((f) => ZXing.BarcodeFormat[f]));
        hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
        const reader = new ZXing.MultiFormatReader();
        reader.setHints(hints);
        return reader;
    }

    // Decodifica una fuente de luminancia. Devuelve el texto o '' si en esa imagen no hay código.
    function decodeLuminanceWithZXing(ZXing, reader, luminanceSource) {
        const bitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminanceSource));
        try {
            const result = reader.decodeWithState(bitmap);
            return String(result?.getText?.() || '');
        } catch (error) {
            // NotFound/Checksum/Format son normales mientras el código no está enfocado.
            if (error instanceof ZXing.NotFoundException
                || error instanceof ZXing.ChecksumException
                || error instanceof ZXing.FormatException) {
                return '';
            }
            throw error;
        } finally {
            try { reader.reset(); } catch (_) {}
        }
    }

    const core = {
        NATIVE_FORMATS,
        ZXING_FORMATS,
        ZXING_VERSION,
        MESSAGES,
        chooseCameraBarcodeEngine,
        normalizeCameraBarcodeText,
        classifyCameraError,
        isCameraBlockedByInsecureContext,
        isLikelyMobileDevice,
        getCameraPermissionHelpText,
        getCenterCropRect,
        createZXingReader,
        decodeLuminanceWithZXing,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = core;
    }
    if (typeof window === 'undefined' || !window.document) return;

    // ---------- Navegador ----------

    const scriptSrc = (document.currentScript && document.currentScript.src) || '';
    const zxingUrl = (() => {
        try { return new URL(ZXING_FILE, scriptSrc || window.location.href).href; } catch (_) { return `./js/${ZXING_FILE}`; }
    })();

    const state = {
        session: 0,
        open: false,
        detected: false,
        options: null,
        lastOptions: null,
        stream: null,
        timer: null,
        engine: '',
        nativeDetector: null,
        zxingReader: null,
        canvas: null,
        ctx: null,
    };
    let zxingLoadPromise = null;
    let lastUnexpectedDecodeError = '';

    function currentEnv() {
        return {
            userAgent: navigator.userAgent,
            touchCapable: ('ontouchstart' in window) || (navigator.maxTouchPoints > 0),
            narrowScreen: Boolean(window.matchMedia && window.matchMedia('(max-width: 1024px)').matches),
            isSecureContext: window.isSecureContext,
            protocol: window.location.protocol,
            hostname: window.location.hostname,
        };
    }

    function isLikelyMobileDeviceForCameraPrompt() {
        return isLikelyMobileDevice(currentEnv());
    }

    function loadZXingLibrary() {
        if (window.ZXing && window.ZXing.MultiFormatReader) return Promise.resolve(window.ZXing);
        if (zxingLoadPromise) return zxingLoadPromise;
        zxingLoadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = zxingUrl;
            script.async = true;
            const timeout = setTimeout(() => fail(new Error('Tiempo de espera agotado al cargar ZXing')), 20000);
            function fail(error) {
                clearTimeout(timeout);
                script.remove();
                zxingLoadPromise = null;
                reject(error);
            }
            script.onload = () => {
                clearTimeout(timeout);
                if (window.ZXing && window.ZXing.MultiFormatReader) {
                    resolve(window.ZXing);
                } else {
                    fail(new Error('ZXing cargó sin exponer el lector'));
                }
            };
            script.onerror = () => fail(new Error('No se pudo descargar ZXing'));
            document.head.appendChild(script);
        });
        return zxingLoadPromise;
    }

    async function detectEngine() {
        const BD = window.BarcodeDetector;
        if (typeof BD !== 'function') return 'zxing';
        let formats = null;
        try {
            formats = typeof BD.getSupportedFormats === 'function' ? await BD.getSupportedFormats() : null;
        } catch (_) {
            formats = null;
        }
        return chooseCameraBarcodeEngine(true, formats);
    }

    // ----- DOM del popup (se crea una sola vez, fuera de las secciones para verse en cualquier pantalla) -----

    function el(tag, attrs, children) {
        const node = document.createElement(tag);
        Object.entries(attrs || {}).forEach(([k, v]) => {
            if (k === 'style') node.style.cssText = v;
            else if (k === 'text') node.textContent = v;
            else node.setAttribute(k, v);
        });
        (children || []).forEach((c) => node.appendChild(c));
        return node;
    }

    function buildPopupShell(id, zIndex, titleText, onCloseClick) {
        const closeBtn = el('button', { class: 'popup-cerrar', type: 'button', 'aria-label': 'Cerrar' }, [el('p', { text: 'X' })]);
        closeBtn.addEventListener('click', onCloseClick);
        const body = el('div', { class: 'popup-body', style: 'padding:10px; display:flex; flex-direction:column; gap:10px;' });
        const popup = el('div', {
            id,
            class: 'hidden',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': titleText,
            style: `position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:${zIndex}; align-items:center; justify-content:center;`,
        }, [
            el('div', { class: 'contenidoPopUp', style: 'width:min(560px,95vw); max-width:560px; margin:0; display:flex; flex-direction:column;' }, [
                el('div', { class: 'popup-titulo' }, [el('p', { class: 'popup-titulo-texto', text: titleText }), closeBtn]),
                body,
            ]),
        ]);
        return { popup, body };
    }

    function actionButton(text, onClick) {
        const btn = el('button', { class: 'btn2', type: 'button', text, style: 'height:36px; min-width:130px;' });
        btn.addEventListener('click', onClick);
        return btn;
    }

    function ensureScanPopup() {
        let popup = document.getElementById('cameraBarcodeScanPopUp');
        if (popup) return popup;
        const shell = buildPopupShell('cameraBarcodeScanPopUp', 9999, 'Escanear código con cámara', () => closeCameraBarcodeScanner());
        popup = shell.popup;
        const video = el('video', {
            id: 'camera-barcode-video',
            autoplay: '',
            playsinline: '',
            'webkit-playsinline': '',
            muted: '',
            style: 'display:block; width:100%; max-height:56vh; object-fit:cover; background:#0b1220; border-radius:8px;',
        });
        video.muted = true;
        video.playsInline = true;
        // Recuadro guía: misma zona central que analiza ZXing.
        const guide = el('div', {
            'aria-hidden': 'true',
            style: 'position:absolute; left:5%; right:5%; top:25%; bottom:25%; border:2px solid rgba(255,255,255,.9); border-radius:6px; box-shadow:0 0 0 9999px rgba(0,0,0,.25); pointer-events:none;',
        });
        const frame = el('div', { style: 'position:relative; overflow:hidden; border:1px solid #334155; border-radius:8px; background:#0b1220;' }, [video, guide]);
        const status = el('div', { id: 'camera-barcode-status', class: 'product-status-box', role: 'status', 'aria-live': 'polite', text: 'Apunta al código de barras para escanear.' });
        const actions = el('div', { style: 'display:flex; justify-content:flex-end; gap:8px;' }, [
            actionButton('Cerrar', () => closeCameraBarcodeScanner()),
        ]);
        shell.body.appendChild(frame);
        shell.body.appendChild(status);
        shell.body.appendChild(actions);
        document.body.appendChild(popup);
        return popup;
    }

    function ensureNoticePopup() {
        let popup = document.getElementById('cameraBarcodePermissionPopUp');
        if (popup) return popup;
        const shell = buildPopupShell('cameraBarcodePermissionPopUp', 10000, 'Cámara no disponible', () => closeCameraBarcodeNotice());
        popup = shell.popup;
        shell.body.appendChild(el('div', { id: 'camera-barcode-notice-reason', class: 'product-status-box', role: 'alert' }));
        shell.body.appendChild(el('div', {
            id: 'camera-barcode-notice-help',
            style: 'font-size:13px; line-height:1.45; color:#334155; background:#f8fafc; border:1px solid #dbe5f1; border-radius:8px; padding:8px 10px;',
        }));
        shell.body.appendChild(el('div', { style: 'display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap;' }, [
            actionButton('Reintentar escáner', () => {
                const options = state.lastOptions;
                hidePopup(document.getElementById('cameraBarcodePermissionPopUp'));
                openCameraBarcodeScanner(options || {});
            }),
            actionButton('Cerrar', () => closeCameraBarcodeNotice()),
        ]));
        document.body.appendChild(popup);
        return popup;
    }

    function showPopup(popup) {
        if (!popup) return;
        popup.classList.remove('hidden');
        popup.style.display = 'flex';
    }

    function hidePopup(popup) {
        if (!popup) return;
        popup.classList.add('hidden');
        popup.style.display = '';
    }

    function setStatus(message) {
        const status = document.getElementById('camera-barcode-status');
        if (status) status.textContent = String(message || '');
    }

    function showNotice(message, insecure) {
        const popup = ensureNoticePopup();
        const reason = document.getElementById('camera-barcode-notice-reason');
        const help = document.getElementById('camera-barcode-notice-help');
        if (reason) reason.textContent = message;
        if (help) help.textContent = getCameraPermissionHelpText(navigator.userAgent, Boolean(insecure));
        showPopup(popup);
    }

    function closeCameraBarcodeNotice() {
        hidePopup(document.getElementById('cameraBarcodePermissionPopUp'));
        const onClose = state.lastOptions?.onClose;
        if (typeof onClose === 'function') {
            try { onClose(); } catch (_) {}
        }
    }

    // ----- Cámara -----

    function stopCamera() {
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = null;
        }
        if (state.stream) {
            try {
                (state.stream.getTracks?.() || []).forEach((track) => {
                    try { track.stop(); } catch (_) {}
                });
            } catch (_) {}
            state.stream = null;
        }
        const video = document.getElementById('camera-barcode-video');
        if (video) {
            try {
                video.pause();
                video.srcObject = null;
            } catch (_) {}
        }
    }

    function finishSession() {
        state.session += 1;
        state.open = false;
        stopCamera();
        hidePopup(document.getElementById('cameraBarcodeScanPopUp'));
    }

    function closeCameraBarcodeScanner() {
        const wasOpen = state.open;
        const options = state.options;
        finishSession();
        state.options = null;
        if (wasOpen && !state.detected && typeof options?.onClose === 'function') {
            try { options.onClose(); } catch (_) {}
        }
    }

    function handleDetected(session, rawValue) {
        if (session !== state.session || state.detected) return;
        const code = normalizeCameraBarcodeText(rawValue);
        if (!code) return;
        state.detected = true; // bloquea dobles lecturas
        const onDetected = state.options?.onDetected;
        finishSession();
        state.options = null;
        if (typeof onDetected === 'function') {
            Promise.resolve()
                .then(() => onDetected(code))
                .catch((error) => console.error('Error al usar el código leído con la cámara:', error));
        }
    }

    function readFrameWithZXing(video) {
        const rect = getCenterCropRect(video.videoWidth, video.videoHeight);
        if (!rect) return '';
        if (!state.canvas) {
            state.canvas = document.createElement('canvas');
            state.ctx = state.canvas.getContext('2d', { willReadFrequently: true });
        }
        if (state.canvas.width !== rect.dw) state.canvas.width = rect.dw;
        if (state.canvas.height !== rect.dh) state.canvas.height = rect.dh;
        state.ctx.drawImage(video, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, rect.dw, rect.dh);
        const ZXing = window.ZXing;
        if (!state.zxingReader) state.zxingReader = createZXingReader(ZXing);
        return decodeLuminanceWithZXing(ZXing, state.zxingReader, new ZXing.HTMLCanvasElementLuminanceSource(state.canvas));
    }

    function startDetectionLoop(session, video) {
        const interval = state.engine === 'native' ? NATIVE_INTERVAL_MS : ZXING_INTERVAL_MS;
        const tick = async () => {
            if (session !== state.session || state.detected) return;
            let code = '';
            try {
                if (video.readyState >= 2 && video.videoWidth > 0) {
                    if (state.engine === 'native') {
                        const found = await state.nativeDetector.detect(video);
                        code = Array.isArray(found) && found.length ? String(found[0]?.rawValue || '') : '';
                    } else {
                        code = readFrameWithZXing(video);
                    }
                }
            } catch (error) {
                const text = String(error?.message || error);
                if (text !== lastUnexpectedDecodeError) {
                    lastUnexpectedDecodeError = text;
                    console.warn('Escáner de cámara: error al analizar la imagen:', error);
                }
            }
            if (session !== state.session || state.detected) return;
            if (code) {
                handleDetected(session, code);
                return;
            }
            state.timer = setTimeout(tick, interval);
        };
        state.timer = setTimeout(tick, 0);
    }

    async function openCameraBarcodeScanner(options = {}) {
        if (state.open) closeCameraBarcodeScanner();
        hidePopup(document.getElementById('cameraBarcodePermissionPopUp'));
        state.lastOptions = options;
        state.options = options;
        state.detected = false;

        const env = currentEnv();
        if (isCameraBlockedByInsecureContext(env)) {
            showNotice(MESSAGES.insecure, true);
            return;
        }
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
            showNotice(MESSAGES.unsupported, false);
            return;
        }

        state.session += 1;
        const session = state.session;
        state.open = true;
        const popup = ensureScanPopup();
        const video = document.getElementById('camera-barcode-video');
        showPopup(popup);
        setStatus('Solicitando acceso a la cámara...');

        const engine = await detectEngine();
        if (session !== state.session) return;
        state.engine = engine;
        const libraryPromise = engine === 'zxing' ? loadZXingLibrary() : null;
        if (libraryPromise) libraryPromise.catch(() => {});

        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            });
        } catch (error) {
            if (session !== state.session) return;
            const info = classifyCameraError(error);
            finishSession();
            showNotice(info.message, false);
            return;
        }
        if (session !== state.session) {
            // Se cerró mientras se pedía el permiso: apagar la cámara recién abierta.
            (stream.getTracks?.() || []).forEach((track) => { try { track.stop(); } catch (_) {} });
            return;
        }
        state.stream = stream;
        video.srcObject = stream;
        await video.play().catch(() => {});
        if (session !== state.session) return;

        if (engine === 'native') {
            try {
                if (!state.nativeDetector) state.nativeDetector = new window.BarcodeDetector({ formats: NATIVE_FORMATS });
            } catch (_) {
                state.engine = 'zxing';
            }
        }
        if (state.engine === 'zxing') {
            setStatus('Preparando el lector de códigos...');
            try {
                await (libraryPromise || loadZXingLibrary());
            } catch (error) {
                if (session !== state.session) return;
                console.error('Escáner de cámara: no se pudo cargar ZXing:', error);
                stopCamera();
                setStatus(MESSAGES.libraryFailed);
                return;
            }
            if (session !== state.session) return;
        }
        setStatus('Apunta al código de barras dentro del recuadro.');
        startDetectionLoop(session, video);
    }

    // ----- Botones «Escanear cámara» -----

    function refreshCameraScanButtonsVisibility() {
        const show = isLikelyMobileDeviceForCameraPrompt();
        document.querySelectorAll('.camera-scan-btn').forEach((btn) => {
            btn.style.display = show ? 'inline-flex' : 'none';
        });
    }

    // Llena el campo y simula lo que hace el lector USB: escribe el código y presiona Enter.
    function submitCodeToInput(input, code) {
        if (!input || input.disabled) return;
        input.value = code;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        try { input.focus({ preventScroll: true }); } catch (_) {}
        input.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true,
        }));
    }

    document.addEventListener('click', (event) => {
        const btn = event.target?.closest?.('[data-camera-scan-target]');
        if (!btn) return;
        event.preventDefault();
        const input = document.getElementById(btn.getAttribute('data-camera-scan-target'));
        if (!input) return;
        if (input.disabled) {
            const msg = 'El campo de código está bloqueado. Termina o cancela el producto cargado antes de escanear otro.';
            if (typeof window.appAlert === 'function') {
                window.appAlert(msg, 'warning');
            } else {
                window.alert(msg);
            }
            return;
        }
        openCameraBarcodeScanner({
            onDetected: (code) => submitCodeToInput(input, code),
            onClose: () => { try { input.focus({ preventScroll: true }); } catch (_) {} },
        });
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && state.open) closeCameraBarcodeScanner();
    });
    window.addEventListener('pagehide', () => {
        if (state.open) closeCameraBarcodeScanner();
    });
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', refreshCameraScanButtonsVisibility);
    } else {
        refreshCameraScanButtonsVisibility();
    }
    window.addEventListener('resize', refreshCameraScanButtonsVisibility);
    window.addEventListener('orientationchange', refreshCameraScanButtonsVisibility);

    window.CameraBarcodeScanner = { ...core, loadZXingLibrary, detectEngine, submitCodeToInput };
    window.openCameraBarcodeScanner = openCameraBarcodeScanner;
    window.closeCameraBarcodeScanner = closeCameraBarcodeScanner;
    window.closeCameraBarcodeNotice = closeCameraBarcodeNotice;
    window.isLikelyMobileDeviceForCameraPrompt = isLikelyMobileDeviceForCameraPrompt;
    window.refreshCameraScanButtonsVisibility = refreshCameraScanButtonsVisibility;
})();

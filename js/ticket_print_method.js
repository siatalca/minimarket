(function registerMinimarketPrint(root, factory) {
    const api = factory(root);
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.MinimarketPrint = api;
    }
})(typeof window !== 'undefined' ? window : globalThis, function createMinimarketPrint(root) {
    // Metodo de impresion de tickets en ESTE equipo (se guarda en el navegador de cada caja):
    //  - 'bridge':  puente local en 127.0.0.1:7357 (paquete_impresion / iniciar_servicios_ocultos.bat)
    //  - 'browser': impresion del navegador; con Chrome --kiosk-printing sale sin dialogo
    const STORAGE_KEY = 'ticket_print_method';
    const URL_PARAM = 'impresion';
    const METHODS = ['bridge', 'browser'];
    const URL_ALIASES = {
        navegador: 'browser',
        browser: 'browser',
        puente: 'bridge',
        bridge: 'bridge',
    };

    function normalizeMethod(value) {
        const raw = String(value || '').trim().toLowerCase();
        return METHODS.includes(raw) ? raw : 'bridge';
    }

    function getMethod() {
        try {
            return normalizeMethod(root?.localStorage?.getItem(STORAGE_KEY));
        } catch (_) {
            return 'bridge';
        }
    }

    function setMethod(value) {
        const method = normalizeMethod(value);
        try {
            root?.localStorage?.setItem(STORAGE_KEY, method);
        } catch (_) {
        }
        return method;
    }

    function isBrowserMethod() {
        return getMethod() === 'browser';
    }

    // Permite que el acceso directo de la caja fije el metodo: ...?impresion=navegador
    function applyMethodFromUrl(location = root?.location) {
        if (!location?.search) return null;
        let params;
        try {
            params = new URLSearchParams(location.search);
        } catch (_) {
            return null;
        }
        const requested = URL_ALIASES[String(params.get(URL_PARAM) || '').trim().toLowerCase()];
        return requested ? setMethod(requested) : null;
    }

    // Imprime un documento HTML completo desde un iframe oculto: no depende de popups
    // y no deja ventanas abiertas cuando Chrome usa --kiosk-printing.
    function printHtmlDocument(html) {
        const doc = root?.document;
        if (!doc?.body) {
            return Promise.reject(new Error('No hay documento disponible para imprimir'));
        }
        return new Promise((resolve, reject) => {
            const frame = doc.createElement('iframe');
            frame.setAttribute('aria-hidden', 'true');
            frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
            let settled = false;
            const cleanup = () => setTimeout(() => frame.remove(), 1000);
            frame.onload = () => {
                if (settled) return;
                settled = true;
                try {
                    frame.contentWindow.focus();
                    frame.contentWindow.print();
                    resolve();
                } catch (error) {
                    reject(error);
                } finally {
                    cleanup();
                }
            };
            frame.srcdoc = html;
            doc.body.appendChild(frame);
        });
    }

    applyMethodFromUrl();

    return {
        STORAGE_KEY,
        normalizeMethod,
        getMethod,
        setMethod,
        isBrowserMethod,
        applyMethodFromUrl,
        printHtmlDocument,
    };
});

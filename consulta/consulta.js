// Consulta de precios y carrito del cliente (misión M-037).
// Página pública: no usa el token del personal (clave 'token'); el cliente tiene su propia sesión en
// localStorage 'tienda_cliente_token' y solo llama a /api/tienda/*. Todo texto del servidor va con textContent.
(function () {
    'use strict';

    const C = window.ConsultaCore;
    const UI = window.ConsultaUi;
    if (!C || !UI) {
        document.body.textContent = 'No se pudo cargar la página. Recarga e intenta de nuevo.';
        return;
    }
    const { storageGet, storageSet, storageRemove, $, h, replaceContent, showToast } = UI;
    const TOKEN_KEY = 'tienda_cliente_token';
    const GOOGLE_SCRIPT = 'https://accounts.google.com/gsi/client';
    const NETWORK_ERROR = 'No hay conexión con la tienda. Revisa tu internet o el WiFi del local e intenta de nuevo.';
    const SHAPE_ERROR = 'La tienda respondió algo inesperado. Intenta de nuevo en un momento.';

    let API_URL = '';
    try {
        API_URL = window.MinimarketApi.resolveApiBase() || '';
    } catch (_) {
        API_URL = '';
    }

    const state = {
        view: 'consultar',
        token: storageGet(TOKEN_KEY),
        cuenta: null,
        carrito: null,
        cartStatus: 'idle', // idle | loading | ready | error
        cartError: '',
        cartActionError: '',
        busy: false,
        lastProduct: null,
        addQty: 1,
        productMessage: null, // { tone, text }
        accountMode: 'login', // login | register
        accountNotice: '',
        accountErrors: {},
        accountFormError: '',
        accountValues: {},
        passwordMessage: null,
        pendingGoogle: null, // { credential, correo, nombre }
        info: null,
        infoPromise: null,
        google: { clientId: '', ready: false, loading: null, intent: 'login' },
        codeTimer: null,
    };

    // ---------- API ----------

    class ApiError extends Error {
        constructor(message, status, body) {
            super(message);
            this.status = status;
            this.body = body;
            this.code = body && typeof body.code === 'string' ? body.code : '';
        }
    }

    async function api(path, options = {}) {
        const headers = { Accept: 'application/json' };
        if (options.body !== undefined) headers['Content-Type'] = 'application/json';
        if (options.auth) {
            if (!state.token) throw new ApiError(C.ERROR_MESSAGES.SESSION_INVALID, 401, { code: 'SESSION_INVALID' });
            headers.Authorization = `Bearer ${state.token}`;
        }
        let response;
        try {
            response = await fetch(API_URL + path, {
                method: options.method || 'GET',
                headers,
                body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
                credentials: 'omit',
                cache: 'no-store',
            });
        } catch (_) {
            throw new ApiError(NETWORK_ERROR, 0, null);
        }
        if (response.status === 204) return null;
        let body = null;
        const text = await response.text().catch(() => '');
        if (text) {
            try { body = JSON.parse(text); } catch (_) { body = null; }
        }
        if (!response.ok) {
            if (options.auth && response.status === 401) handleSessionLost();
            throw new ApiError(C.apiErrorMessage(response.status, body), response.status, body);
        }
        if (body === null) throw new ApiError(SHAPE_ERROR, response.status, null);
        return body;
    }

    function handleSessionLost() {
        setSession('', null);
        state.carrito = null;
        state.cartStatus = 'idle';
        state.accountNotice = C.ERROR_MESSAGES.SESSION_INVALID;
        state.accountMode = 'login';
        updateBadge();
    }

    function setSession(token, cuenta) {
        state.token = token || '';
        state.cuenta = cuenta || null;
        if (token) storageSet(TOKEN_KEY, token);
        else storageRemove(TOKEN_KEY);
    }

    function ensureInfo() {
        if (state.info) return Promise.resolve(state.info);
        if (state.infoPromise) return state.infoPromise;
        state.infoPromise = api('api/tienda/info')
            .then((data) => {
                if (!data || typeof data.nombre !== 'string') throw new ApiError(SHAPE_ERROR, 200, data);
                state.info = {
                    nombre: data.nombre,
                    google_client_id: typeof data.google_client_id === 'string' ? data.google_client_id.trim() : '',
                };
                applyInfo();
                return state.info;
            })
            .catch((error) => {
                // Se reintenta la próxima vez que haga falta (por ejemplo al abrir Cuenta).
                console.warn('Consulta: no se pudo leer la información de la tienda:', error.message);
                return null;
            })
            .finally(() => { state.infoPromise = null; });
        return state.infoPromise;
    }

    function applyInfo() {
        const name = state.info?.nombre?.trim();
        if (name) {
            $('store-name').textContent = name;
            document.title = `Precios · ${name}`;
        }
        state.google.clientId = state.info?.google_client_id || '';
    }

    // ---------- Vistas ----------

    function showView(name) {
        state.view = name;
        ['consultar', 'carrito', 'cuenta'].forEach((view) => {
            $(`view-${view}`).classList.toggle('hidden', view !== name);
            const tab = $(`tab-${view}`);
            tab.classList.toggle('active', view === name);
            if (view === name) tab.setAttribute('aria-current', 'page');
            else tab.removeAttribute('aria-current');
        });
        stopCodeTimer();
        if (name === 'carrito') {
            renderCart();
            if (state.token) loadCart();
        } else if (name === 'cuenta') {
            renderAccount();
            ensureInfo().then(() => { if (state.view === 'cuenta') renderAccount(); });
        } else {
            renderProduct();
        }
        window.scrollTo(0, 0);
    }

    // ---------- Consultar ----------

    function openScanner() {
        if (typeof window.openCameraBarcodeScanner !== 'function') {
            setCodeError('El escáner no está disponible en este teléfono. Escribe el código.');
            return;
        }
        window.openCameraBarcodeScanner({
            onDetected: (code) => {
                $('code-input').value = code;
                lookupProduct(code);
            },
        });
    }

    function setCodeError(text) {
        const el = $('code-error');
        el.textContent = text || '';
        $('code-input').setAttribute('aria-invalid', text ? 'true' : 'false');
    }

    let lookupSeq = 0;
    async function lookupProduct(rawCode) {
        const code = String(rawCode || '').trim();
        if (!code) {
            setCodeError('Escribe el código que aparece bajo las barras del producto.');
            return;
        }
        if (!C.isValidProductCode(code)) {
            setCodeError('El código solo puede tener números, letras, punto o guion (hasta 64).');
            return;
        }
        setCodeError('');
        const seq = ++lookupSeq;
        state.lastProduct = null;
        state.productMessage = { tone: 'info', text: 'Buscando el producto…' };
        renderProduct();
        try {
            const data = await api(`api/tienda/producto?codigo=${encodeURIComponent(code)}`);
            if (seq !== lookupSeq) return;
            state.lastProduct = C.parseProductResponse(data);
            state.addQty = 1;
            state.productMessage = null;
        } catch (error) {
            if (seq !== lookupSeq) return;
            state.lastProduct = null;
            if (error.status === 404 && error.body && error.body.found === false) {
                state.productMessage = { tone: 'warn', text: `No encontramos el código ${code}. Revisa el número o pregunta en caja.` };
            } else {
                state.productMessage = { tone: 'error', text: error instanceof ApiError ? error.message : SHAPE_ERROR };
            }
        }
        renderProduct();
    }

    function stockLine(stock, formato) {
        const info = C.describeStock(stock, formato);
        return h('div', { class: `stock stock-${info.tone}` }, [
            h('span', { class: 'stock-dot', 'aria-hidden': 'true' }),
            h('div', {}, [
                h('strong', { text: info.label }),
                info.detail ? h('span', { class: 'stock-detail', text: info.detail }) : null,
            ]),
        ]);
    }

    function qtyStepper(value, onChange, opts = {}) {
        const label = opts.label || 'Cantidad';
        const minus = h('button', {
            class: 'step', type: 'button', 'aria-label': `Restar uno a ${label}`, text: '−',
            disabled: opts.disabled || value <= 1,
            on: { click: () => onChange(value - 1) },
        });
        const plus = h('button', {
            class: 'step', type: 'button', 'aria-label': `Sumar uno a ${label}`, text: '+',
            disabled: opts.disabled || value >= C.MAX_QTY,
            on: { click: () => onChange(value + 1) },
        });
        return h('div', { class: 'stepper', role: 'group', 'aria-label': label }, [
            minus,
            h('output', { class: 'step-value', 'aria-live': 'polite', text: String(value) }),
            plus,
        ]);
    }

    function renderProduct() {
        const container = $('product-result');
        if (!container) return;
        const p = state.lastProduct;
        const msg = state.productMessage;
        if (!p) {
            replaceContent(container, msg ? h('p', { class: `msg msg-${msg.tone}`, text: msg.text }) : null);
            return;
        }
        const unit = p.formato === 'granel' ? 'el kilo' : 'c/u';
        const tag = h('article', { class: 'tag', 'aria-label': `Precio de ${p.nombre}` }, [
            h('p', { class: 'tag-name', text: p.nombre }),
            h('p', { class: 'tag-price' }, [
                h('span', { class: 'tag-amount', text: C.formatPrice(p.precio) }),
                h('span', { class: 'tag-unit', text: unit }),
            ]),
            h('p', { class: 'tag-code', text: `Código ${p.codigo}` }),
        ]);
        const parts = [tag, stockLine(p.stock, p.formato)];

        if (p.formato === 'granel') {
            parts.push(h('p', { class: 'msg msg-info', text: 'Este producto se pesa en caja, por eso no se agrega al carrito.' }));
        } else if (state.token) {
            parts.push(h('div', { class: 'add-row' }, [
                qtyStepper(state.addQty, (n) => { state.addQty = C.clampQuantity(n); renderProduct(); }, { label: 'cantidad a agregar', disabled: state.busy }),
                h('button', {
                    class: 'btn-primary btn-grow', type: 'button', disabled: state.busy,
                    text: state.busy ? 'Agregando…' : 'Agregar al carrito',
                    on: { click: () => addItem(p, state.addQty) },
                }),
            ]));
        } else {
            parts.push(h('p', { class: 'msg msg-info' }, [
                '¿Quieres ir juntando tu compra? ',
                h('button', { class: 'link', type: 'button', text: 'Crea una cuenta o entra', on: { click: () => showView('cuenta') } }),
                ' y agrega productos a tu carrito.',
            ]));
        }
        if (msg) parts.push(h('p', { class: `msg msg-${msg.tone}`, role: 'alert', text: msg.text }));
        replaceContent(container, ...parts);
    }

    async function addItem(product, qty) {
        if (state.busy) return;
        state.busy = true;
        state.productMessage = null;
        renderProduct();
        try {
            const data = await api('api/tienda/carrito/items', {
                method: 'POST', auth: true, body: { codigo: product.codigo, cantidad: C.clampQuantity(qty) },
            });
            setCart(C.parseCartResponse(data));
            state.addQty = 1;
            showToast(`Agregado: ${product.nombre}${qty > 1 ? ` (x${qty})` : ''}`);
        } catch (error) {
            state.productMessage = { tone: 'error', text: error instanceof ApiError ? error.message : SHAPE_ERROR };
            if (error.status === 401) {
                state.busy = false;
                showView('cuenta');
                return;
            }
        } finally {
            state.busy = false;
        }
        renderProduct();
    }

    // ---------- Carrito ----------

    function setCart(carrito) {
        state.carrito = carrito;
        state.cartStatus = 'ready';
        state.cartError = '';
        updateBadge();
    }

    function updateBadge() {
        const badge = $('cart-badge');
        const units = state.token && state.carrito && state.carrito.estado !== 'retirado'
            ? state.carrito.items.reduce((sum, item) => sum + Number(item.cantidad || 0), 0)
            : 0;
        badge.textContent = units > 0 ? String(units) : '';
        badge.classList.toggle('hidden', units <= 0);
    }

    async function loadCart() {
        if (!state.token) return;
        if (!state.carrito) state.cartStatus = 'loading';
        renderCart();
        try {
            const data = await api('api/tienda/carrito', { auth: true });
            setCart(C.parseCartResponse(data));
        } catch (error) {
            if (error.status === 401) {
                if (state.view === 'carrito') renderCart();
                return;
            }
            state.cartStatus = 'error';
            state.cartError = error instanceof ApiError ? error.message : SHAPE_ERROR;
        }
        if (state.view === 'carrito') renderCart();
    }

    async function cartAction(run) {
        if (state.busy) return;
        state.busy = true;
        state.cartActionError = '';
        renderCart();
        try {
            const data = await run();
            setCart(C.parseCartResponse(data));
        } catch (error) {
            state.cartActionError = error instanceof ApiError ? error.message : SHAPE_ERROR;
            if (error.code === 'CART_LOCKED' || error.code === 'ITEM_NOT_FOUND') loadCart();
        } finally {
            state.busy = false;
        }
        if (state.view === 'carrito') renderCart();
    }

    function changeItemQty(item, qty) {
        const cantidad = C.clampQuantity(qty);
        cartAction(() => api(`api/tienda/carrito/items/${encodeURIComponent(item.item_id)}`, {
            method: 'PUT', auth: true, body: { cantidad },
        }));
    }

    function removeItem(item) {
        cartAction(() => api(`api/tienda/carrito/items/${encodeURIComponent(item.item_id)}`, { method: 'DELETE', auth: true }));
    }

    function finalizeCart() {
        cartAction(() => api('api/tienda/carrito/finalizar', { method: 'POST', auth: true }));
    }

    function reopenCart() {
        const ok = window.confirm('Si modificas el carrito, el código actual deja de servir y tendrás que pedir uno nuevo. ¿Continuar?');
        if (!ok) return;
        cartAction(() => api('api/tienda/carrito/reabrir', { method: 'POST', auth: true }));
    }

    // Código vencido: finalizar de nuevo entrega un código nuevo (el servidor anula el vencido).
    function renewCode() {
        cartAction(() => api('api/tienda/carrito/finalizar', { method: 'POST', auth: true }));
    }

    function goScan() {
        showView('consultar');
        openScanner();
    }

    function stopCodeTimer() {
        if (state.codeTimer) {
            clearInterval(state.codeTimer);
            state.codeTimer = null;
        }
    }

    function cartItemRow(item, editable) {
        const label = item.nombre;
        const info = [
            h('p', { class: 'item-name', text: item.nombre }),
            h('p', { class: 'item-meta', text: `${C.formatPrice(item.precio)} c/u` }),
        ];
        if (item.stock && item.stock.estado === 'sin_stock') {
            info.push(h('p', { class: 'item-warn', text: 'Sin stock en la tienda ahora.' }));
        }
        const side = editable
            ? h('div', { class: 'item-side' }, [
                qtyStepper(item.cantidad, (n) => changeItemQty(item, n), { label, disabled: state.busy }),
                h('button', { class: 'link link-danger', type: 'button', text: 'Quitar', disabled: state.busy, 'aria-label': `Quitar ${label}`, on: { click: () => removeItem(item) } }),
            ])
            : h('p', { class: 'item-qty', text: `x${item.cantidad}` });
        return h('li', { class: 'item' }, [
            h('div', { class: 'item-info' }, info),
            side,
            h('p', { class: 'item-subtotal', text: C.formatPrice(item.subtotal) }),
        ]);
    }

    function cartTotal(carrito) {
        return h('div', { class: 'total' }, [
            h('span', { text: 'Total referencial' }),
            h('strong', { text: C.formatPrice(carrito.total) }),
        ]);
    }

    function renderCart() {
        const container = $('cart-panel');
        stopCodeTimer();
        if (!state.token) {
            replaceContent(container, h('div', { class: 'empty' }, [
                h('h2', { text: 'Tu carrito' }),
                h('p', { text: 'Crea una cuenta para ir juntando productos con tu teléfono. Al terminar te damos un código y en caja tu compra aparece lista para pagar.' }),
                h('button', { class: 'btn-primary', type: 'button', text: 'Entrar o crear cuenta', on: { click: () => showView('cuenta') } }),
            ]));
            return;
        }
        if (state.cartStatus === 'loading' || (state.cartStatus === 'idle' && !state.carrito)) {
            replaceContent(container, h('p', { class: 'msg msg-info', text: 'Cargando tu carrito…' }));
            return;
        }
        if (state.cartStatus === 'error' && !state.carrito) {
            replaceContent(container,
                h('p', { class: 'msg msg-error', role: 'alert', text: state.cartError }),
                h('button', { class: 'btn-secondary', type: 'button', text: 'Reintentar', on: { click: loadCart } }));
            return;
        }
        const carrito = state.carrito;
        const actionError = state.cartActionError
            ? h('p', { class: 'msg msg-error', role: 'alert', text: state.cartActionError })
            : null;

        if (carrito.estado === 'retirado') {
            replaceContent(container, h('div', { class: 'empty' }, [
                h('h2', { text: 'Compra cargada en caja' }),
                h('p', { text: 'Tu carrito ya se cargó en caja. Puedes empezar uno nuevo cuando quieras.' }),
                h('button', { class: 'btn-primary', type: 'button', text: 'Escanear producto', on: { click: goScan } }),
            ]));
            return;
        }

        if (carrito.estado === 'enviado') {
            const expiry = C.describeCodeExpiry(carrito.codigo_expira, Date.now());
            const list = h('ul', { class: 'items' }, carrito.items.map((item) => cartItemRow(item, false)));
            let ticket;
            if (expiry.expired) {
                ticket = h('section', { class: 'ticket ticket-expired', 'aria-labelledby': 'ticket-title' }, [
                    h('h2', { id: 'ticket-title', class: 'ticket-title', text: 'Tu código venció' }),
                    h('p', { class: 'ticket-code ticket-code-old', text: C.formatCartCode(carrito.codigo) }),
                    h('p', { class: 'ticket-sub', text: expiry.timeLabel ? `Venció a las ${expiry.timeLabel}. Genera uno nuevo para pasar a caja.` : 'Genera uno nuevo para pasar a caja.' }),
                    h('button', { class: 'btn-primary', type: 'button', disabled: state.busy, text: state.busy ? 'Generando…' : 'Generar código nuevo', on: { click: renewCode } }),
                ]);
            } else {
                ticket = h('section', { class: 'ticket', 'aria-labelledby': 'ticket-title' }, [
                    h('h2', { id: 'ticket-title', class: 'ticket-title', text: 'Muestra este código en caja' }),
                    h('p', { class: 'ticket-code', 'aria-label': `Código ${String(carrito.codigo).split('').join(' ')}`, text: C.formatCartCode(carrito.codigo) }),
                    h('p', { class: 'ticket-sub', text: `Vence a las ${expiry.timeLabel} (quedan ${expiry.remainingLabel}).` }),
                ]);
                state.codeTimer = setInterval(() => {
                    if (state.view === 'carrito' && !state.busy) renderCart();
                }, 30000);
            }
            replaceContent(container,
                ticket,
                actionError,
                list,
                cartTotal(carrito),
                h('p', { class: 'note', text: 'En caja se cobra el precio y las promociones vigentes. Lo que se pesa o no tiene código lo agrega la cajera.' }),
                h('button', { class: 'btn-secondary', type: 'button', disabled: state.busy, text: 'Modificar carrito', on: { click: reopenCart } }));
            return;
        }

        // Abierto
        if (!carrito.items.length) {
            replaceContent(container, h('div', { class: 'empty' }, [
                h('h2', { text: 'Tu carrito está vacío' }),
                h('p', { text: 'Escanea un producto y toca «Agregar al carrito».' }),
                h('button', { class: 'btn-primary', type: 'button', text: 'Escanear producto', on: { click: goScan } }),
            ]), actionError);
            return;
        }
        const units = carrito.items.reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
        replaceContent(container,
            h('div', { class: 'cart-head' }, [
                h('h2', { text: 'Tu carrito' }),
                h('p', { class: 'cart-count', text: `${carrito.items.length} ${carrito.items.length === 1 ? 'producto' : 'productos'}, ${units} ${units === 1 ? 'unidad' : 'unidades'}` }),
            ]),
            actionError,
            h('ul', { class: 'items' }, carrito.items.map((item) => cartItemRow(item, true))),
            cartTotal(carrito),
            h('button', { class: 'btn-secondary', type: 'button', disabled: state.busy, text: 'Seguir escaneando', on: { click: goScan } }),
            h('button', { class: 'btn-primary btn-wide', type: 'button', disabled: state.busy, text: state.busy ? 'Un momento…' : 'Terminar y obtener código para caja', on: { click: finalizeCart } }),
            h('p', { class: 'note', text: 'El código vence en 2 horas. El carrito no aparta productos: el stock puede cambiar.' }));
    }

    // ---------- Cuenta ----------

    function field(id, labelText, input, error, hint) {
        const describedBy = [hint ? `${id}-hint` : '', `${id}-error`].filter(Boolean).join(' ');
        input.id = id;
        input.setAttribute('aria-describedby', describedBy);
        if (error) input.setAttribute('aria-invalid', 'true');
        return h('div', { class: 'field' }, [
            h('label', { for: id, text: labelText }),
            input,
            hint ? h('p', { id: `${id}-hint`, class: 'field-hint', text: hint }) : null,
            h('p', { id: `${id}-error`, class: 'field-error', text: error || '' }),
        ]);
    }

    function input(attrs) {
        return h('input', attrs);
    }

    function googleBlock(intent) {
        if (!state.google.clientId) return null;
        const holder = h('div', { class: 'google-btn', 'data-intent': intent });
        const wrap = h('div', { class: 'google-wrap' }, [
            h('p', { class: 'divider', text: 'o' }),
            holder,
        ]);
        // Se dibuja después de insertarlo en la página (Google necesita medir el ancho).
        setTimeout(() => renderGoogleButton(holder, intent), 0);
        return wrap;
    }

    function renderAccount() {
        const container = $('account-panel');
        if (state.token && state.cuenta) {
            renderAccountDetails(container);
            return;
        }
        if (state.token && !state.cuenta) {
            replaceContent(container, h('p', { class: 'msg msg-info', text: 'Cargando tu cuenta…' }));
            loadAccount();
            return;
        }
        const isLogin = state.accountMode === 'login';
        const switcher = h('div', { class: 'switch', role: 'tablist', 'aria-label': 'Entrar o crear cuenta' }, [
            h('button', { class: `switch-btn${isLogin ? ' active' : ''}`, type: 'button', role: 'tab', 'aria-selected': isLogin ? 'true' : 'false', text: 'Entrar', on: { click: () => setAccountMode('login') } }),
            h('button', { class: `switch-btn${!isLogin ? ' active' : ''}`, type: 'button', role: 'tab', 'aria-selected': !isLogin ? 'true' : 'false', text: 'Crear cuenta', on: { click: () => setAccountMode('register') } }),
        ]);
        const notice = state.accountNotice ? h('p', { class: 'msg msg-warn', role: 'alert', text: state.accountNotice }) : null;
        replaceContent(container, switcher, notice, isLogin ? loginForm() : registerForm());
    }

    function setAccountMode(mode) {
        state.accountMode = mode;
        state.accountErrors = {};
        state.accountFormError = '';
        state.accountNotice = '';
        if (mode === 'login') state.pendingGoogle = null;
        renderAccount();
    }

    function loginForm() {
        const errors = state.accountErrors;
        const v = state.accountValues;
        const form = h('form', { class: 'form', novalidate: true }, [
            h('h2', { text: 'Entra a tu cuenta' }),
            field('login-telefono', 'Teléfono celular', input({ type: 'tel', inputmode: 'tel', autocomplete: 'tel', placeholder: '9 1234 5678', value: v.telefono || '', maxlength: 20 }), errors.telefono),
            field('login-clave', 'Clave', input({ type: 'password', autocomplete: 'current-password', maxlength: 72 }), errors.clave),
            state.accountFormError ? h('p', { class: 'msg msg-error', role: 'alert', text: state.accountFormError }) : null,
            h('button', { class: 'btn-primary btn-wide', type: 'submit', disabled: state.busy, text: state.busy ? 'Entrando…' : 'Entrar' }),
        ]);
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            submitLogin(form);
        });
        const extra = [googleBlock('login')];
        if (state.google.clientId) {
            extra.push(h('p', { class: 'field-hint center', text: '¿Olvidaste tu clave? Entra con Google y luego cámbiala en Cuenta.' }));
        }
        return h('div', {}, [form, ...extra]);
    }

    function registerForm() {
        const errors = state.accountErrors;
        const v = state.accountValues;
        const g = state.pendingGoogle;
        const correoInput = input({ type: 'email', inputmode: 'email', autocomplete: 'email', placeholder: 'nombre@correo.cl', value: g ? g.correo : (v.correo || ''), maxlength: 120, readonly: Boolean(g) });
        const form = h('form', { class: 'form', novalidate: true }, [
            h('h2', { text: 'Crea tu cuenta' }),
            g ? h('p', { class: 'msg msg-info', text: 'Tomamos tu nombre y correo de Google. Completa tu teléfono y una clave para terminar.' }) : null,
            field('reg-nombre', 'Nombre', input({ type: 'text', autocomplete: 'name', value: g ? g.nombre : (v.nombre || ''), maxlength: 60 }), errors.nombre),
            field('reg-telefono', 'Teléfono celular', input({ type: 'tel', inputmode: 'tel', autocomplete: 'tel', placeholder: '9 1234 5678', value: v.telefono || '', maxlength: 20 }), errors.telefono, 'Con este número y tu clave entras después.'),
            field('reg-correo', 'Correo', correoInput, errors.correo),
            field('reg-clave', 'Clave', input({ type: 'password', autocomplete: 'new-password', maxlength: 72 }), errors.clave, 'Mínimo 6 caracteres.'),
            state.accountFormError ? h('p', { class: 'msg msg-error', role: 'alert', text: state.accountFormError }) : null,
            h('button', { class: 'btn-primary btn-wide', type: 'submit', disabled: state.busy, text: state.busy ? 'Creando cuenta…' : 'Crear cuenta' }),
            h('p', { class: 'field-hint', text: 'Usamos tus datos solo para tu cuenta y tu carrito en esta tienda.' }),
        ]);
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            submitRegister(form);
        });
        return h('div', {}, [form, g ? null : googleBlock('register')]);
    }

    function focusFirstError(form) {
        const bad = form.querySelector('[aria-invalid="true"]');
        if (bad) bad.focus();
    }

    async function submitLogin() {
        const telefonoRaw = $('login-telefono').value;
        const clave = $('login-clave').value;
        state.accountValues = { telefono: telefonoRaw };
        const errors = {};
        const telefono = C.normalizePhone(telefonoRaw);
        if (!telefono) errors.telefono = 'Escribe un celular chileno, por ejemplo 9 1234 5678.';
        if (!clave) errors.clave = 'Escribe tu clave.';
        state.accountErrors = errors;
        state.accountFormError = '';
        if (Object.keys(errors).length) {
            renderAccount();
            focusFirstError($('account-panel'));
            return;
        }
        await accountRequest(() => api('api/tienda/cuenta/login', { method: 'POST', body: { telefono, clave } }));
    }

    async function submitRegister() {
        const values = {
            nombre: $('reg-nombre').value,
            telefono: $('reg-telefono').value,
            correo: $('reg-correo').value,
            clave: $('reg-clave').value,
        };
        state.accountValues = { nombre: values.nombre, telefono: values.telefono, correo: values.correo };
        const result = C.validateRegistration(values);
        state.accountErrors = result.errors;
        state.accountFormError = '';
        if (!result.ok) {
            renderAccount();
            focusFirstError($('account-panel'));
            return;
        }
        const body = { ...result.data };
        if (state.pendingGoogle) body.google_credential = state.pendingGoogle.credential;
        await accountRequest(() => api('api/tienda/cuenta/registro', { method: 'POST', body }), (error) => {
            if (error.code === 'PHONE_TAKEN') state.accountErrors = { telefono: error.message };
            else if (error.code === 'EMAIL_TAKEN') state.accountErrors = { correo: error.message };
            else return false;
            return true;
        });
    }

    // Envía login/registro/Google. Si sale bien guarda la sesión y abre el carrito.
    async function accountRequest(run, onFieldError) {
        if (state.busy) return;
        state.busy = true;
        renderAccount();
        try {
            const data = await run();
            if (!data || typeof data.token !== 'string' || !data.token) throw new ApiError(SHAPE_ERROR, 200, data);
            const cuenta = C.parseAccount(data.cuenta);
            setSession(data.token, cuenta);
            state.accountValues = {};
            state.accountErrors = {};
            state.accountFormError = '';
            state.accountNotice = '';
            state.pendingGoogle = null;
            state.carrito = null;
            state.cartStatus = 'idle';
            state.busy = false;
            showToast(`Hola, ${cuenta.nombre}`);
            showView('carrito');
            return;
        } catch (error) {
            const message = error instanceof ApiError ? error.message : SHAPE_ERROR;
            if (!(onFieldError && onFieldError(error))) state.accountFormError = message;
        } finally {
            state.busy = false;
        }
        renderAccount();
        focusFirstError($('account-panel'));
    }

    async function loadAccount() {
        try {
            const data = await api('api/tienda/cuenta', { auth: true });
            state.cuenta = C.parseAccount(data && data.cuenta);
        } catch (error) {
            if (error.status !== 401) {
                replaceContent($('account-panel'),
                    h('p', { class: 'msg msg-error', role: 'alert', text: error instanceof ApiError ? error.message : SHAPE_ERROR }),
                    h('button', { class: 'btn-secondary', type: 'button', text: 'Reintentar', on: { click: renderAccount } }));
                return;
            }
        }
        if (state.view === 'cuenta') renderAccount();
        if (state.view === 'consultar') renderProduct();
    }

    function renderAccountDetails(container) {
        const c = state.cuenta;
        const pm = state.passwordMessage;
        const passForm = h('form', { class: 'form', novalidate: true }, [
            h('h3', { text: 'Cambiar clave' }),
            field('nueva-clave', 'Clave nueva', input({ type: 'password', autocomplete: 'new-password', maxlength: 72 }), pm && pm.field ? pm.text : '', 'Mínimo 6 caracteres.'),
            pm && !pm.field ? h('p', { class: `msg msg-${pm.tone}`, role: pm.tone === 'error' ? 'alert' : 'status', text: pm.text }) : null,
            h('button', { class: 'btn-secondary', type: 'submit', disabled: state.busy, text: 'Guardar clave nueva' }),
        ]);
        passForm.addEventListener('submit', (event) => {
            event.preventDefault();
            submitNewPassword();
        });
        const googleInfo = c.google_vinculado
            ? h('p', { class: 'field-hint', text: 'Google vinculado: puedes entrar con «Continuar con Google».' })
            : (state.google.clientId
                ? h('div', {}, [
                    h('p', { class: 'field-hint', text: 'Vincula tu cuenta de Google para entrar más rápido y recuperar tu clave si la olvidas.' }),
                    googleBlock('link'),
                ])
                : null);
        replaceContent(container,
            h('section', { class: 'card' }, [
                h('h2', { text: c.nombre }),
                h('dl', { class: 'data' }, [
                    h('dt', { text: 'Teléfono' }), h('dd', { text: c.telefono }),
                    h('dt', { text: 'Correo' }), h('dd', { text: c.correo || 'Sin correo' }),
                ]),
                googleInfo,
            ]),
            passForm,
            h('button', { class: 'btn-ghost btn-wide', type: 'button', disabled: state.busy, text: 'Cerrar sesión', on: { click: logout } }));
    }

    async function submitNewPassword() {
        const clave = $('nueva-clave').value;
        const problem = C.validatePassword(clave);
        if (problem) {
            state.passwordMessage = { tone: 'error', text: problem, field: true };
            renderAccount();
            $('nueva-clave').focus();
            return;
        }
        if (state.busy) return;
        state.busy = true;
        try {
            await api('api/tienda/cuenta/clave', { method: 'POST', auth: true, body: { clave_nueva: clave } });
            state.passwordMessage = { tone: 'ok', text: 'Clave actualizada. Se cerró tu sesión en los demás teléfonos; este sigue conectado.' };
        } catch (error) {
            state.passwordMessage = { tone: 'error', text: error instanceof ApiError ? error.message : SHAPE_ERROR };
        } finally {
            state.busy = false;
        }
        renderAccount();
    }

    async function logout() {
        if (state.busy) return;
        state.busy = true;
        try {
            await api('api/tienda/cuenta/logout', { method: 'POST', auth: true });
        } catch (_) {
            // Aunque falle, la sesión se borra de este teléfono.
        } finally {
            state.busy = false;
        }
        setSession('', null);
        state.carrito = null;
        state.cartStatus = 'idle';
        state.passwordMessage = null;
        state.accountMode = 'login';
        state.accountNotice = '';
        updateBadge();
        showToast('Sesión cerrada');
        renderAccount();
    }

    // ---------- Google Identity Services ----------

    function loadGoogleScript() {
        if (window.google?.accounts?.id) return Promise.resolve();
        if (state.google.loading) return state.google.loading;
        state.google.loading = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = GOOGLE_SCRIPT;
            script.async = true;
            script.onload = () => (window.google?.accounts?.id ? resolve() : reject(new Error('Google no quedó disponible')));
            script.onerror = () => reject(new Error('No se pudo cargar Google'));
            document.head.appendChild(script);
        }).catch((error) => {
            state.google.loading = null;
            throw error;
        });
        return state.google.loading;
    }

    async function renderGoogleButton(holder, intent) {
        if (!state.google.clientId || !holder.isConnected) return;
        try {
            await loadGoogleScript();
            if (!state.google.ready) {
                window.google.accounts.id.initialize({
                    client_id: state.google.clientId,
                    callback: onGoogleCredential,
                    ux_mode: 'popup',
                    auto_select: false,
                    cancel_on_tap_outside: true,
                });
                state.google.ready = true;
            }
            if (!holder.isConnected) return;
            state.google.intent = intent;
            const width = Math.max(200, Math.min(400, Math.floor(holder.clientWidth || 300)));
            window.google.accounts.id.renderButton(holder, {
                type: 'standard', theme: 'outline', size: 'large', shape: 'pill',
                text: 'continue_with', locale: 'es', width,
            });
        } catch (error) {
            console.warn('Consulta: Google no disponible:', error.message);
            replaceContent(holder, h('p', { class: 'field-hint', text: 'No se pudo cargar «Continuar con Google». Revisa tu conexión.' }));
        }
    }

    async function onGoogleCredential(response) {
        const credential = response && typeof response.credential === 'string' ? response.credential : '';
        if (!credential) return;
        const intent = state.google.intent;
        if (intent === 'link') {
            if (state.busy) return;
            state.busy = true;
            try {
                const data = await api('api/tienda/cuenta/google/vincular', { method: 'POST', auth: true, body: { credential } });
                state.cuenta = C.parseAccount(data && data.cuenta);
                showToast('Google vinculado');
            } catch (error) {
                state.passwordMessage = { tone: 'error', text: error instanceof ApiError ? error.message : SHAPE_ERROR };
            } finally {
                state.busy = false;
            }
            renderAccount();
            return;
        }
        await accountRequest(() => api('api/tienda/cuenta/google', { method: 'POST', body: { credential } }), (error) => {
            if (error.code === 'GOOGLE_NOT_LINKED') {
                const body = error.body || {};
                state.pendingGoogle = {
                    credential,
                    correo: typeof body.correo === 'string' ? body.correo : '',
                    nombre: typeof body.nombre === 'string' ? body.nombre.slice(0, 60) : '',
                };
                state.accountMode = 'register';
                state.accountErrors = {};
                state.accountFormError = '';
                state.accountNotice = '';
                return true;
            }
            if (error.code === 'GOOGLE_DISABLED') {
                state.google.clientId = '';
            }
            return false;
        });
    }

    // ---------- Inicio ----------

    function init() {
        document.querySelectorAll('.tab[data-view]').forEach((tab) => {
            tab.addEventListener('click', () => showView(tab.getAttribute('data-view')));
        });
        $('scan-btn').addEventListener('click', openScanner);
        $('code-form').addEventListener('submit', (event) => {
            event.preventDefault();
            lookupProduct($('code-input').value);
        });
        $('code-input').addEventListener('input', () => setCodeError(''));
        UI.setupInstall();
        ensureInfo();
        if (state.token) {
            loadAccount();
            loadCart();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

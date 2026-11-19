// Ventas: cargar el carrito que el cliente armó en su teléfono (misión M-037).
// La cajera ingresa el código de 6 dígitos; los productos entran al ticket actual con la misma regla de stock
// que addToCart (js/scripts.js). Después la cajera sigue agregando productos (granel, sin código) y cobra con F12.
//
// planCustomerCartLoad es lógica pura (probada en tests/consulta-carrito-caja.test.js). El resto usa las
// funciones y variables globales de Ventas: cart, selectedCartIndex, shiftStarted, ensureShiftStartedOnLoad,
// updateCartUI, isBulkSaleProduct, resolveProductSaleFormat, withAuthHeaders, API_URL.
(function registerCustomerCartLoader(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    if (root && root.document) {
        root.CustomerCartCore = api;
    }
})(typeof window !== 'undefined' ? window : globalThis, function createCustomerCartCore() {
    'use strict';

    const CODE_RE = /^\d{6}$/;

    // Quita espacios y guiones: «482 913» -> «482913». Devuelve '' si no son 6 dígitos.
    function normalizeCustomerCartCode(raw) {
        const value = String(raw ?? '').replace(/[\s-]/g, '');
        return CODE_RE.test(value) ? value : '';
    }

    function isPlainObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    // Revisa la forma de POST /api/ventas/carrito-cliente/cargar. Lanza si no calza con el contrato.
    function parseCustomerCartResponse(data) {
        if (!isPlainObject(data) || !isPlainObject(data.cliente) || !Array.isArray(data.items) || !Array.isArray(data.faltantes)) {
            throw new Error('Respuesta inesperada del servidor al cargar el carrito del cliente.');
        }
        return {
            cliente: {
                nombre: typeof data.cliente.nombre === 'string' ? data.cliente.nombre : '',
                telefono: typeof data.cliente.telefono === 'string' ? data.cliente.telefono : '',
            },
            items: data.items,
            faltantes: data.faltantes
                .filter(isPlainObject)
                .map((row) => ({ nombre: String(row.nombre ?? ''), motivo: String(row.motivo ?? '') })),
            // M-039: id del carrito para vincularlo con la venta al cobrar. Un servidor antiguo no lo envía.
            carrito_id: normalizeCartLinkId(data.carrito_id),
        };
    }

    // Cuerpo de POST /api/ventas/carrito-cliente/cargar. caja_id es la caja de este equipo (n_caja, la misma que
    // numero_caja en la venta), solo si es un entero positivo; si no, no se envía (M-039).
    function buildCustomerCartLoadBody(code, rawBoxId) {
        const body = { codigo: code };
        const boxId = normalizeCartLinkId(rawBoxId);
        if (boxId) body.caja_id = boxId;
        return body;
    }

    // Id del carrito del cliente que viaja en POST /api/sales como carrito_cliente_id (M-039).
    // Solo enteros positivos (número o texto de dígitos); cualquier otra cosa es «sin vínculo» (null).
    function normalizeCartLinkId(value) {
        const parsed = typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value.trim()) : value;
        return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
    }

    // Arma el carrito nuevo de Ventas sin tocar el original.
    // helpers: { isBulk(product), saleFormat(product) } (las mismas funciones de Ventas).
    // Regla de stock igual a addToCart: si el producto usa inventario, no se pasa del stock actual
    // (contando lo que ya está en el ticket); sin stock no se carga.
    function planCustomerCartLoad(items, currentCart, helpers) {
        const isBulk = typeof helpers?.isBulk === 'function' ? helpers.isBulk : () => false;
        const saleFormat = typeof helpers?.saleFormat === 'function' ? helpers.saleFormat : () => 'unidad';
        const cart = (Array.isArray(currentCart) ? currentCart : []).map((item) => ({ ...item }));
        const notes = [];
        let loadedLines = 0;
        let loadedUnits = 0;

        (Array.isArray(items) ? items : []).forEach((row) => {
            const product = isPlainObject(row) ? row.product : null;
            const requested = Math.trunc(Number(row?.cantidad));
            if (!isPlainObject(product) || product.id_producto === undefined || product.id_producto === null
                || !Number.isFinite(requested) || requested < 1) {
                notes.push('Un producto llegó con datos incompletos y no se cargó.');
                return;
            }
            const name = String(product.descripcion || product.codigo_barras || 'Producto');
            const normalized = { ...product, precio_venta: Number(product.precio_venta || 0) };
            if (isBulk(normalized)) {
                notes.push(`${name}: se vende a granel. Pésalo y agrégalo a mano.`);
                return;
            }
            const existing = cart.find((item) => String(item.id_producto) === String(normalized.id_producto));
            const existingQty = existing ? Number(existing.quantity || 0) : 0;
            let qty = requested;
            if (Number(normalized.utiliza_inventario || 0) === 1) {
                const stock = Number(normalized.cantidad_actual || 0);
                const available = Number.isFinite(stock) ? Math.floor(stock) - existingQty : 0;
                if (available <= 0) {
                    notes.push(`${name}: sin stock en el sistema, no se cargó (pidió ${requested}).`);
                    return;
                }
                if (qty > available) {
                    notes.push(`${name}: se cargaron ${available} de ${requested} por el stock disponible.`);
                    qty = available;
                }
            }
            if (existing) {
                existing.quantity = existingQty + qty;
                existing.line_subtotal = 0;
            } else {
                cart.push({ ...normalized, quantity: qty, formato_venta: saleFormat(normalized) });
            }
            loadedLines += 1;
            loadedUnits += qty;
        });
        return { cart, notes, loadedLines, loadedUnits };
    }

    function customerCartErrorMessage(status, body) {
        const code = isPlainObject(body) && typeof body.code === 'string' ? body.code : '';
        if (code === 'INVALID_CODE') return 'El código del cliente tiene 6 números. Revisa y vuelve a escribirlo.';
        if (code === 'CODE_NOT_FOUND' || status === 404) return 'No existe un carrito con ese código. Revisa los números con el cliente.';
        if (code === 'CODE_EXPIRED' || status === 410) return 'El código venció (dura 2 horas). Pide al cliente que genere uno nuevo en su teléfono.';
        if (code === 'CODE_USED' || status === 409) return 'Ese carrito ya se cargó en caja. No se puede cargar dos veces.';
        if (status === 429) return 'Demasiados intentos seguidos. Espera un momento y vuelve a intentar.';
        if (isPlainObject(body) && typeof body.message === 'string' && body.message.trim()) return body.message.trim().slice(0, 200);
        return 'No se pudo cargar el carrito del cliente. Intenta de nuevo.';
    }

    return { normalizeCustomerCartCode, parseCustomerCartResponse, planCustomerCartLoad, customerCartErrorMessage, normalizeCartLinkId, buildCustomerCartLoadBody };
});

// ---------- Navegador (Ventas) ----------
(function () {
    'use strict';
    if (typeof window === 'undefined' || !window.document || !window.CustomerCartCore) return;
    const core = window.CustomerCartCore;
    let inFlight = false;

    // Vínculo del ticket actual con el carrito del cliente (M-039). Se guarda junto al carrito de Ventas
    // (misma clave de caja, cajera y turno) para que sobreviva a recargar la página; Ventas lo envía al cobrar
    // y lo borra cuando el ticket queda vacío (cobrado, vaciado o dejado pendiente con F5).
    function readLocalBoxId() {
        try {
            return window.localStorage.getItem('n_caja') || window.localStorage.getItem('caja') || '';
        } catch (_) {
            return '';
        }
    }

    function linkStorageKey() {
        const cartKey = typeof buildCartStorageKey === 'function' ? buildCartStorageKey() : null;
        return cartKey ? `customer_cart_link_${cartKey}` : null;
    }

    const CustomerCartLink = {
        get() {
            const key = linkStorageKey();
            if (!key) return null;
            try {
                return core.normalizeCartLinkId(window.localStorage.getItem(key));
            } catch (_) {
                return null;
            }
        },
        set(value) {
            const key = linkStorageKey();
            const id = core.normalizeCartLinkId(value);
            if (!key) return;
            try {
                if (id) window.localStorage.setItem(key, String(id));
                else window.localStorage.removeItem(key);
            } catch (_) {
                // Sin almacenamiento la venta se cobra igual; solo no queda vinculada al carrito.
            }
        },
        clear() {
            this.set(null);
        },
    };

    function el(id) {
        return document.getElementById(id);
    }

    const STATUS_COLORS = {
        info: ['#0F2F5F', '#E8F1FC', '#0057B8'],
        warning: ['#7A4A00', '#FFF6E0', '#B45309'],
        error: ['#991B1B', '#FDECEC', '#DC2626'],
    };

    function setStatus(text, tone) {
        const status = el('customer-cart-status');
        if (!status) return;
        const [color, background, border] = STATUS_COLORS[tone] || STATUS_COLORS.info;
        status.textContent = text || '';
        status.style.color = color;
        status.style.background = background;
        status.style.borderLeft = `4px solid ${border}`;
        status.classList.toggle('hidden', !text);
    }

    function setBusy(busy) {
        inFlight = busy;
        const input = el('customer-cart-code');
        const btn = el('customer-cart-load-btn');
        if (input) input.disabled = busy;
        if (btn) {
            btn.disabled = busy;
            btn.textContent = busy ? 'Cargando…' : 'Cargar carrito';
        }
    }

    function openCustomerCartPopup() {
        const popup = el('customerCartPopUp');
        if (!popup) return;
        const input = el('customer-cart-code');
        if (input) {
            input.value = '';
            input.removeAttribute('aria-invalid');
        }
        setStatus('');
        setBusy(false);
        popup.classList.remove('hidden');
        popup.style.display = 'flex';
        if (input) input.focus();
    }

    function closeCustomerCartPopup() {
        if (inFlight) return;
        const popup = el('customerCartPopUp');
        if (!popup) return;
        popup.classList.add('hidden');
        popup.style.display = '';
        if (typeof focusBarcodeInputForNextScan === 'function') focusBarcodeInputForNextScan();
    }

    async function showAlert(message, type, title) {
        if (typeof window.appAlert === 'function') {
            await window.appAlert(message, type, { title, okText: 'Entendido' });
        } else if (typeof window.appNotify === 'function') {
            // Diálogo del sistema (js/functions.js) con el color del tipo (aviso o éxito).
            window.appNotify(message, type);
        } else {
            window.alert(message);
        }
    }

    // Carga el carrito del cliente por su código. Devuelve true si se cargó.
    async function loadCustomerCartByCode(rawCode) {
        if (inFlight) return false;
        const input = el('customer-cart-code');
        const code = core.normalizeCustomerCartCode(rawCode);
        if (!code) {
            if (input) input.setAttribute('aria-invalid', 'true');
            setStatus('El código del cliente tiene 6 números. Revisa y vuelve a escribirlo.', 'error');
            if (input) input.focus();
            return false;
        }
        if (input) input.removeAttribute('aria-invalid');
        if (!shiftStarted) {
            await ensureShiftStartedOnLoad();
            if (!shiftStarted) {
                setStatus('Debes iniciar turno ingresando el monto inicial de caja antes de cargar un carrito.', 'error');
                return false;
            }
        }
        // El canje en el servidor es de una sola vez: no se llama si el ticket ya tiene productos.
        if (Array.isArray(cart) && cart.length > 0) {
            setStatus('El ticket actual ya tiene productos. Presiona F5 para dejarlo pendiente y vuelve a ingresar el código.', 'warning');
            return false;
        }

        setBusy(true);
        setStatus('Buscando el carrito del cliente…', 'info');
        let response;
        let body = null;
        try {
            response = await fetch(`${API_URL}api/ventas/carrito-cliente/cargar`, {
                method: 'POST',
                headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(core.buildCustomerCartLoadBody(code, readLocalBoxId())),
            });
            body = await response.json().catch(() => null);
        } catch (_) {
            setBusy(false);
            setStatus('No hay conexión con el servidor. Revisa la red e intenta de nuevo.', 'error');
            return false;
        }
        setBusy(false);
        if (response.status === 401) {
            alert('Sesion expirada. Vuelve a iniciar sesion.');
            window.location.href = 'index.php';
            return false;
        }
        if (!response.ok) {
            setStatus(core.customerCartErrorMessage(response.status, body), 'error');
            if (input) input.focus();
            return false;
        }
        let parsed;
        try {
            parsed = core.parseCustomerCartResponse(body);
        } catch (error) {
            setStatus(error.message, 'error');
            return false;
        }

        const plan = core.planCustomerCartLoad(parsed.items, cart, {
            isBulk: isBulkSaleProduct,
            saleFormat: resolveProductSaleFormat,
        });
        cart = plan.cart;
        selectedCartIndex = cart.length ? cart.length - 1 : -1;
        // El ticket estaba vacío (se exige arriba), así que el carrito del cliente es todo el ticket.
        CustomerCartLink.set(plan.loadedLines > 0 ? parsed.carrito_id : null);
        updateCartUI();
        closeCustomerCartPopup();

        const notes = [
            ...parsed.faltantes.map((row) => `${row.nombre || 'Producto'}: ${row.motivo || 'no se pudo cargar'}`),
            ...plan.notes,
        ];
        const who = parsed.cliente.nombre ? ` de ${parsed.cliente.nombre}` : '';
        const summary = `Carrito${who} cargado: ${plan.loadedLines} ${plan.loadedLines === 1 ? 'producto' : 'productos'}, ${plan.loadedUnits} ${plan.loadedUnits === 1 ? 'unidad' : 'unidades'}.`;
        const tail = 'Agrega lo que se pesa o no tiene código y cobra con F12.';
        if (notes.length) {
            await showAlert(`${summary}\n\nRevisa con el cliente:\n- ${notes.join('\n- ')}\n\n${tail}`, 'warning', 'Carrito del cliente');
        } else {
            await showAlert(`${summary}\n${tail}`, 'success', 'Carrito del cliente');
        }
        if (typeof focusBarcodeInputForNextScan === 'function') focusBarcodeInputForNextScan();
        return true;
    }

    function submitCustomerCartCode() {
        const input = el('customer-cart-code');
        return loadCustomerCartByCode(input ? input.value : '');
    }

    window.CustomerCartLink = CustomerCartLink;
    window.openCustomerCartPopup = openCustomerCartPopup;
    window.closeCustomerCartPopup = closeCustomerCartPopup;
    window.submitCustomerCartCode = submitCustomerCartCode;
    window.loadCustomerCartByCode = loadCustomerCartByCode;
})();

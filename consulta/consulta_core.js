// Lógica pura de la consulta de precios y el carrito del cliente (misión M-037).
// Sin DOM: se prueba en tests/consulta-core.test.js. El servidor valida lo mismo y su respuesta manda;
// aquí solo se evita mandar datos que de seguro serán rechazados y se revisa la forma de las respuestas.
(function registerConsultaCore(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.ConsultaCore = api;
    }
})(typeof window !== 'undefined' ? window : globalThis, function createConsultaCore() {
    'use strict';

    const PRODUCT_CODE_RE = /^[0-9A-Za-z.\-]{1,64}$/;
    const STOCK_STATES = new Set(['disponible', 'pocas', 'sin_stock', 'no_controlado']);
    const CART_STATES = new Set(['abierto', 'enviado', 'retirado']);
    const FORMATS = new Set(['unidad', 'granel']);
    const MAX_QTY = 99;
    const NAME_MAX = 60;
    const EMAIL_MAX = 120;
    const PASSWORD_MIN_BYTES = 6;
    const PASSWORD_MAX_BYTES = 72;

    const ERROR_MESSAGES = {
        INVALID_CODE: 'Ese código no es válido. Revisa los números e intenta de nuevo.',
        RATE_LIMITED: 'Hay muchas consultas seguidas. Espera un momento y vuelve a intentar.',
        PHONE_TAKEN: 'Ese teléfono ya tiene una cuenta. Entra con tu teléfono y clave.',
        EMAIL_TAKEN: 'Ese correo ya está usado en otra cuenta.',
        INVALID_DATA: 'Revisa los datos: hay un campo que no es válido.',
        INVALID_CREDENTIALS: 'Teléfono o clave incorrectos.',
        GOOGLE_NOT_LINKED: 'Esa cuenta de Google no está vinculada. Completa tus datos para crear la cuenta.',
        GOOGLE_INVALID: 'Google no confirmó tu identidad. Intenta de nuevo.',
        GOOGLE_DISABLED: 'El acceso con Google no está activado en esta tienda.',
        GOOGLE_UNAVAILABLE: 'No se pudo confirmar con Google en este momento. Intenta de nuevo en un rato o entra con tu teléfono y clave.',
        ITEM_NOT_FOUND: 'Ese producto ya no está en tu carrito. Actualizamos la lista.',
        GOOGLE_TAKEN:'Esa cuenta de Google ya está vinculada a otra cuenta.',
        SESSION_INVALID: 'Tu sesión terminó. Vuelve a entrar.',
        PRODUCT_NOT_FOUND: 'Ese producto no está registrado en la tienda.',
        CART_LOCKED: 'Tu carrito ya tiene un código para caja. Toca «Modificar carrito» para cambiarlo.',
        BULK_NOT_ALLOWED: 'Este producto se pesa en caja: no se agrega al carrito.',
        CART_LIMIT: 'Llegaste al máximo del carrito (60 productos distintos o 99 unidades por producto).',
        CART_EMPTY: 'Tu carrito está vacío. Agrega al menos un producto.',
    };

    function isValidProductCode(raw) {
        return PRODUCT_CODE_RE.test(String(raw ?? '').trim());
    }

    // Deja el teléfono chileno como +569XXXXXXXX. Acepta espacios, guiones y el prefijo +56 o 56.
    // Devuelve '' si no es un celular chileno de 9 dígitos.
    function normalizePhone(raw) {
        let digits = String(raw ?? '').replace(/[\s\-().]/g, '');
        if (digits.startsWith('+')) {
            if (!digits.startsWith('+56')) return '';
            digits = digits.slice(3);
        } else if (digits.length === 11 && digits.startsWith('56')) {
            digits = digits.slice(2);
        }
        if (!/^\d+$/.test(digits)) return '';
        if (digits.length === 8) digits = `9${digits}`;
        if (!/^9\d{8}$/.test(digits)) return '';
        return `+56${digits}`;
    }

    function utf8Length(text) {
        const value = String(text ?? '');
        if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value).length;
        return Buffer.byteLength(value, 'utf8');
    }

    function validatePassword(clave) {
        const bytes = utf8Length(clave);
        if (bytes < PASSWORD_MIN_BYTES) return `La clave debe tener al menos ${PASSWORD_MIN_BYTES} caracteres.`;
        if (bytes > PASSWORD_MAX_BYTES) return 'La clave es demasiado larga (máximo 72 caracteres).';
        return '';
    }

    function isValidEmail(correo) {
        const value = String(correo ?? '').trim();
        return value.length > 0 && value.length <= EMAIL_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    // Revisa el formulario de registro. Devuelve { ok, data, errors } con un mensaje por campo.
    function validateRegistration(input) {
        const errors = {};
        const nombre = String(input?.nombre ?? '').trim().replace(/\s+/g, ' ');
        const telefono = normalizePhone(input?.telefono);
        const correo = String(input?.correo ?? '').trim();
        const clave = String(input?.clave ?? '');
        if (!nombre) errors.nombre = 'Escribe tu nombre.';
        else if (nombre.length > NAME_MAX) errors.nombre = `El nombre puede tener hasta ${NAME_MAX} caracteres.`;
        if (!telefono) errors.telefono = 'Escribe un celular chileno, por ejemplo 9 1234 5678.';
        if (!isValidEmail(correo)) errors.correo = 'Escribe un correo válido, por ejemplo nombre@correo.cl.';
        const passwordError = validatePassword(clave);
        if (passwordError) errors.clave = passwordError;
        return { ok: Object.keys(errors).length === 0, data: { nombre, telefono, correo, clave }, errors };
    }

    // Precio en pesos chilenos sin decimales: 1990 -> "$1.990".
    function formatPrice(value) {
        const n = Math.round(Number(value) || 0);
        const sign = n < 0 ? '-' : '';
        return `${sign}$${String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
    }

    function formatQuantity(value, formato) {
        const n = Number(value);
        if (!Number.isFinite(n)) return '';
        if (formato === 'granel') {
            const rounded = Math.round(n * 1000) / 1000;
            return `${String(rounded).replace('.', ',')} kg`;
        }
        const whole = Math.trunc(n);
        return `${whole} ${whole === 1 ? 'unidad' : 'unidades'}`;
    }

    // Texto y tono del stock para mostrar al cliente.
    function describeStock(stock, formato) {
        const estado = String(stock?.estado || '');
        const hasQty = stock && stock.cantidad !== undefined && stock.cantidad !== null && Number.isFinite(Number(stock.cantidad));
        const qty = hasQty ? formatQuantity(stock.cantidad, formato) : '';
        switch (estado) {
        case 'disponible':
            return { tone: 'ok', label: 'Disponible', detail: qty ? `${qty} en la tienda` : '' };
        case 'pocas':
            return { tone: 'low', label: 'Quedan pocas', detail: qty ? `${qty} en la tienda` : '' };
        case 'sin_stock':
            return { tone: 'out', label: 'Sin stock', detail: 'Pregunta en caja si llegará pronto.' };
        case 'no_controlado':
            return { tone: 'ok', label: 'Disponible', detail: '' };
        default:
            return { tone: 'unknown', label: 'Stock no informado', detail: '' };
        }
    }

    function isPlainObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function isFiniteNumber(value) {
        return typeof value === 'number' && Number.isFinite(value);
    }

    // Revisa la forma de GET /api/tienda/producto. Lanza si no calza con el contrato.
    function parseProductResponse(data) {
        if (!isPlainObject(data) || data.found !== true || !isPlainObject(data.producto)) {
            throw new Error('La respuesta del producto no tiene la forma esperada.');
        }
        const p = data.producto;
        if (typeof p.codigo !== 'string' || typeof p.nombre !== 'string' || !isFiniteNumber(p.precio)
            || !FORMATS.has(p.formato) || !isPlainObject(p.stock) || !STOCK_STATES.has(p.stock.estado)) {
            throw new Error('La respuesta del producto no tiene la forma esperada.');
        }
        if (p.stock.cantidad !== undefined && p.stock.cantidad !== null && !isFiniteNumber(p.stock.cantidad)) {
            throw new Error('La respuesta del producto no tiene la forma esperada.');
        }
        return {
            codigo: p.codigo,
            nombre: p.nombre,
            precio: p.precio,
            formato: p.formato,
            stock: { estado: p.stock.estado, cantidad: p.stock.cantidad ?? null },
        };
    }

    // Revisa la forma de { carrito } de las rutas del carrito. Lanza si no calza con el contrato.
    function parseCartResponse(data) {
        const c = isPlainObject(data) ? data.carrito : null;
        if (!isPlainObject(c) || !CART_STATES.has(c.estado) || !Array.isArray(c.items) || !isFiniteNumber(c.total)) {
            throw new Error('La respuesta del carrito no tiene la forma esperada.');
        }
        const items = c.items.map((item) => {
            if (!isPlainObject(item) || (typeof item.item_id !== 'number' && typeof item.item_id !== 'string')
                || typeof item.nombre !== 'string' || !isFiniteNumber(item.precio)
                || !isFiniteNumber(item.cantidad) || !isFiniteNumber(item.subtotal)) {
                throw new Error('La respuesta del carrito no tiene la forma esperada.');
            }
            return {
                item_id: item.item_id,
                codigo: typeof item.codigo === 'string' ? item.codigo : '',
                nombre: item.nombre,
                precio: item.precio,
                cantidad: item.cantidad,
                subtotal: item.subtotal,
                stock: isPlainObject(item.stock) ? item.stock : null,
            };
        });
        const codigo = typeof c.codigo === 'string' && c.codigo ? c.codigo : null;
        const expira = typeof c.codigo_expira === 'string' && c.codigo_expira ? c.codigo_expira : null;
        if (c.estado === 'enviado' && (!codigo || !expira || Number.isNaN(Date.parse(expira)))) {
            throw new Error('El carrito enviado no trae su código para caja.');
        }
        return { estado: c.estado, items, total: c.total, codigo, codigo_expira: expira };
    }

    // Revisa { token?, cuenta } de las rutas de cuenta.
    function parseAccount(cuenta) {
        if (!isPlainObject(cuenta) || typeof cuenta.nombre !== 'string' || typeof cuenta.telefono !== 'string') {
            throw new Error('La respuesta de la cuenta no tiene la forma esperada.');
        }
        return {
            nombre: cuenta.nombre,
            telefono: cuenta.telefono,
            correo: typeof cuenta.correo === 'string' ? cuenta.correo : '',
            google_vinculado: cuenta.google_vinculado === true,
        };
    }

    function pad2(n) {
        return String(n).padStart(2, '0');
    }

    // Estado del código para caja: hora de vencimiento y minutos que quedan.
    function describeCodeExpiry(expiraIso, nowMs) {
        const expMs = Date.parse(String(expiraIso || ''));
        if (Number.isNaN(expMs)) return { expired: true, minutesLeft: 0, timeLabel: '', remainingLabel: '' };
        const exp = new Date(expMs);
        const timeLabel = `${pad2(exp.getHours())}:${pad2(exp.getMinutes())}`;
        const diffMs = expMs - Number(nowMs);
        if (diffMs <= 0) return { expired: true, minutesLeft: 0, timeLabel, remainingLabel: '' };
        const minutesLeft = Math.ceil(diffMs / 60000);
        const h = Math.floor(minutesLeft / 60);
        const m = minutesLeft % 60;
        const remainingLabel = h > 0 ? `${h} h ${m} min` : `${m} min`;
        return { expired: false, minutesLeft, timeLabel, remainingLabel };
    }

    // "482913" -> "482 913" para leerlo en voz alta en caja.
    function formatCartCode(code) {
        const value = String(code || '').replace(/\s+/g, '');
        if (value.length === 6) return `${value.slice(0, 3)} ${value.slice(3)}`;
        return value;
    }

    function clampQuantity(value) {
        const n = Math.trunc(Number(value));
        if (!Number.isFinite(n) || n < 1) return 1;
        return Math.min(MAX_QTY, n);
    }

    // Mensaje para el cliente a partir del estado HTTP y el cuerpo { message, code }.
    function apiErrorMessage(status, body) {
        const code = isPlainObject(body) && typeof body.code === 'string' ? body.code : '';
        if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
        if (status === 429) return ERROR_MESSAGES.RATE_LIMITED;
        if (status === 401) return ERROR_MESSAGES.SESSION_INVALID;
        if (isPlainObject(body) && typeof body.message === 'string' && body.message.trim()) {
            return body.message.trim().slice(0, 200);
        }
        if (status >= 500) return 'El servidor tuvo un problema. Intenta de nuevo en un momento.';
        return 'No se pudo completar la acción. Intenta de nuevo.';
    }

    return {
        MAX_QTY,
        ERROR_MESSAGES,
        isValidProductCode,
        normalizePhone,
        validatePassword,
        isValidEmail,
        validateRegistration,
        formatPrice,
        formatQuantity,
        describeStock,
        parseProductResponse,
        parseCartResponse,
        parseAccount,
        describeCodeExpiry,
        formatCartCode,
        clampQuantity,
        apiErrorMessage,
    };
});

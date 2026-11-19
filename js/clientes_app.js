// Ventana «Clientes de la app» de Configuración (misión M-039). Solo lectura y solo administradores:
// el servidor responde 403 a los cajeros; aquí solo se muestra lo que llega, siempre con textContent.
// La parte pura (validar la forma de las respuestas, textos y formatos) se prueba en tests/clientes-app-core.test.js.
(function registerClientesApp(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    if (root && root.document) {
        root.ClientesAppCore = api;
    }
})(typeof window !== 'undefined' ? window : globalThis, function createClientesAppCore() {
    'use strict';

    const MAX_QUERY = 60;
    const CART_STATES = new Set(['abierto', 'enviado', 'retirado']);
    const BAD_SHAPE = 'El servidor respondió con un formato inesperado. Avisa a soporte.';

    function isPlainObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function isPositiveInt(value) {
        return Number.isInteger(value) && value > 0;
    }

    function isNonNegativeInt(value) {
        return Number.isInteger(value) && value >= 0;
    }

    function text(value) {
        return typeof value === 'string' ? value.trim() : '';
    }

    function dateOrNull(value) {
        if (value === null || value === undefined || value === '') return null;
        if (typeof value !== 'string' || !Number.isFinite(new Date(value).getTime())) throw new Error(BAD_SHAPE);
        return value;
    }

    function numberOrThrow(value) {
        const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
        if (typeof parsed !== 'number' || !Number.isFinite(parsed)) throw new Error(BAD_SHAPE);
        return parsed;
    }

    function normalizeQuery(raw) {
        return String(raw ?? '').trim().slice(0, MAX_QUERY);
    }

    function buildListPath(query, page) {
        const params = new URLSearchParams();
        const q = normalizeQuery(query);
        if (q) params.set('q', q);
        params.set('pagina', String(isPositiveInt(page) ? page : 1));
        return `api/admin/tienda/clientes?${params.toString()}`;
    }

    function buildDetailPath(id) {
        if (!isPositiveInt(id)) throw new Error('Cliente no válido.');
        return `api/admin/tienda/clientes/${id}`;
    }

    function parseClient(row) {
        if (!isPlainObject(row) || !isPositiveInt(row.id)) throw new Error(BAD_SHAPE);
        const carritos = row.carritos === undefined ? null : row.carritos;
        if (carritos !== null && !isNonNegativeInt(carritos)) throw new Error(BAD_SHAPE);
        return {
            id: row.id,
            nombre: text(row.nombre),
            telefono: text(row.telefono),
            correo: text(row.correo),
            google_vinculado: Boolean(row.google_vinculado),
            activo: row.activo === undefined ? true : Boolean(Number(row.activo)),
            creado: dateOrNull(row.creado),
            ultimo_ingreso: dateOrNull(row.ultimo_ingreso),
            carritos,
        };
    }

    // GET /api/admin/tienda/clientes. Lanza si no calza con el contrato (nunca se muestra como lista vacía).
    function parseClientList(data) {
        if (!isPlainObject(data) || !Array.isArray(data.clientes) || !isNonNegativeInt(data.total)
            || !isPositiveInt(data.pagina) || !isPositiveInt(data.por_pagina)) {
            throw new Error(BAD_SHAPE);
        }
        const clientes = data.clientes.map(parseClient);
        const paginas = Math.max(1, Math.ceil(data.total / data.por_pagina));
        return { clientes, total: data.total, pagina: data.pagina, por_pagina: data.por_pagina, paginas };
    }

    function parsePerson(value) {
        if (value === null || value === undefined) return null;
        if (!isPlainObject(value)) throw new Error(BAD_SHAPE);
        return { nombre: text(value.nombre) };
    }

    function parseBox(value) {
        if (value === null || value === undefined) return null;
        if (!isPlainObject(value)) throw new Error(BAD_SHAPE);
        const numero = value.numero === null || value.numero === undefined ? '' : String(value.numero).trim();
        return { numero, nombre: text(value.nombre) };
    }

    function parseCart(row) {
        if (!isPlainObject(row) || !isPositiveInt(row.id) || !CART_STATES.has(row.estado) || !Array.isArray(row.items)) {
            throw new Error(BAD_SHAPE);
        }
        let cargado = null;
        if (row.cargado_en_caja !== null && row.cargado_en_caja !== undefined) {
            if (!isPlainObject(row.cargado_en_caja)) throw new Error(BAD_SHAPE);
            cargado = {
                fecha: dateOrNull(row.cargado_en_caja.fecha),
                caja: parseBox(row.cargado_en_caja.caja),
                cajera: parsePerson(row.cargado_en_caja.cajera),
            };
        }
        let venta = null;
        if (row.venta !== null && row.venta !== undefined) {
            if (!isPlainObject(row.venta) || !isPositiveInt(row.venta.id)) throw new Error(BAD_SHAPE);
            venta = { id: row.venta.id, fecha: dateOrNull(row.venta.fecha), total: numberOrThrow(row.venta.total) };
        }
        const items = row.items.map((item) => {
            if (!isPlainObject(item)) throw new Error(BAD_SHAPE);
            const cantidad = numberOrThrow(item.cantidad);
            const precio = item.precio_actual === null || item.precio_actual === undefined ? null : numberOrThrow(item.precio_actual);
            return { codigo: text(String(item.codigo ?? '')), nombre: text(item.nombre), cantidad, precio_actual: precio };
        });
        return {
            id: row.id,
            estado: row.estado,
            codigo: text(String(row.codigo ?? '')),
            codigo_usado: text(String(row.codigo_usado ?? '')),
            creado: dateOrNull(row.creado),
            actualizado: dateOrNull(row.actualizado),
            codigo_expira: dateOrNull(row.codigo_expira),
            cargado_en_caja: cargado,
            venta,
            items,
            total_actual: row.total_actual === null || row.total_actual === undefined ? null : numberOrThrow(row.total_actual),
        };
    }

    // GET /api/admin/tienda/clientes/:id. Lanza si no calza con el contrato.
    function parseClientDetail(data) {
        if (!isPlainObject(data) || !Array.isArray(data.carritos)) throw new Error(BAD_SHAPE);
        return { cliente: parseClient(data.cliente), carritos: data.carritos.map(parseCart) };
    }

    function formatDate(value) {
        if (!value) return '—';
        const dt = new Date(value);
        if (!Number.isFinite(dt.getTime())) return '—';
        return dt.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    }

    function formatMoney(value) {
        if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
        return `$${Math.round(Number(value)).toLocaleString('es-CL')}`;
    }

    function formatQuantity(value) {
        const n = Number(value);
        if (!Number.isFinite(n)) return '—';
        return Number.isInteger(n) ? String(n) : n.toLocaleString('es-CL', { maximumFractionDigits: 3 });
    }

    // Textos de un carrito para la ficha. now: milisegundos (para saber si el código ya venció).
    function describeCart(cart, now) {
        const nowMs = Number.isFinite(now) ? now : Date.now();
        const out = { estado: '', tono: 'info', lineas: [] };
        if (cart.estado === 'abierto') {
            out.estado = 'Abierto';
            out.lineas.push('El cliente lo está armando en su teléfono; todavía no pide código.');
            return out;
        }
        if (cart.estado === 'enviado') {
            const expira = cart.codigo_expira ? new Date(cart.codigo_expira).getTime() : NaN;
            const vencido = Number.isFinite(expira) && expira <= nowMs;
            out.estado = vencido ? 'Código vencido' : 'Esperando caja';
            out.tono = vencido ? 'muted' : 'warning';
            const codigo = cart.codigo ? `Código ${cart.codigo}` : 'Código sin dato';
            out.lineas.push(vencido
                ? `${codigo}: venció el ${formatDate(cart.codigo_expira)} sin cargarse en caja.`
                : `${codigo}: vence el ${formatDate(cart.codigo_expira)}`);
            return out;
        }
        out.estado = 'Retirado en caja';
        out.tono = 'ok';
        const cargado = cart.cargado_en_caja;
        const usado = cart.codigo_usado ? ` con el código ${cart.codigo_usado}` : '';
        if (!cargado) {
            out.lineas.push(`Cargado en caja${usado}. Sin datos de fecha ni cajera.`);
        } else {
            const quien = cargado.cajera && cargado.cajera.nombre ? ` por ${cargado.cajera.nombre}` : '';
            out.lineas.push(`Cargado en caja el ${formatDate(cargado.fecha)}${quien}${usado}.`);
            if (cargado.caja) {
                const nombre = cargado.caja.nombre ? ` (${cargado.caja.nombre})` : '';
                out.lineas.push(`Caja ${cargado.caja.numero || 'sin número'}${nombre}.`);
            } else {
                out.lineas.push('Caja: sin registro (carrito cargado antes de que el sistema guardara la caja).');
            }
        }
        if (cart.venta) {
            out.lineas.push(`Venta N° ${cart.venta.id} del ${formatDate(cart.venta.fecha)} por ${formatMoney(cart.venta.total)}.`);
        } else if (cargado && cargado.caja) {
            out.lineas.push('Sin venta vinculada: el ticket no se cobró o se cobró sin el vínculo del carrito.');
        } else {
            out.lineas.push('Sin venta vinculada (carrito anterior a este registro).');
        }
        return out;
    }

    // El detalle trae como máximo los últimos 100 carritos; si el cliente tiene más, se dice.
    // total: el conteo «carritos» del cliente (null si no vino).
    function cartsTitle(shown, total) {
        if (!shown) return 'Carritos';
        if (shown >= 100 && Number.isInteger(total) && total > shown) return `Carritos (últimos ${shown} de ${total})`;
        return `Carritos (${shown})`;
    }

    function clientsErrorMessage(status, body, context) {
        if (status === 401) return 'Tu sesión expiró. Cierra esta ventana, vuelve a entrar al sistema y abre de nuevo «Clientes de la app».';
        if (status === 403) return 'Solo los administradores pueden ver los clientes de la app. Pide a un administrador que la abra con su usuario.';
        if (status === 404) {
            return context === 'detail'
                ? 'Ese cliente ya no existe. Vuelve a la lista y busca de nuevo.'
                : 'El servidor todavía no tiene esta función. Actualiza el sistema y vuelve a intentar.';
        }
        if (status === 429) return 'Demasiadas consultas seguidas. Espera un momento y vuelve a intentar.';
        if (isPlainObject(body) && typeof body.message === 'string' && body.message.trim()) return body.message.trim().slice(0, 200);
        return 'No se pudo cargar la información. Intenta de nuevo.';
    }

    return {
        MAX_QUERY,
        normalizeQuery,
        buildListPath,
        buildDetailPath,
        parseClientList,
        parseClientDetail,
        describeCart,
        cartsTitle,
        formatDate,
        formatMoney,
        formatQuantity,
        clientsErrorMessage,
    };
});

// ---------- Navegador (popup/clientes-app.php) ----------
(function () {
    'use strict';
    if (typeof window === 'undefined' || !window.document || !window.ClientesAppCore) return;
    const core = window.ClientesAppCore;
    const $ = (id) => document.getElementById(id);
    let API_URL = '';
    try { API_URL = window.MinimarketApi.resolveApiBase() || ''; } catch (_) { API_URL = ''; }

    const state = { query: '', page: 1, requestSeq: 0, lastAction: null };

    function staffToken() {
        try {
            return window.sessionStorage.getItem('token') || window.localStorage.getItem('token') || '';
        } catch (_) {
            return '';
        }
    }

    function make(tag, className, content) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (content !== undefined && content !== null) node.textContent = String(content);
        return node;
    }

    function showError(message, retry) {
        $('ca-error-text').textContent = message || '';
        $('ca-error').classList.toggle('hidden', !message);
        state.lastAction = message ? retry || null : null;
        $('ca-retry-btn').classList.toggle('hidden', !state.lastAction);
    }

    function setLoading(text) {
        $('ca-loading').textContent = text || '';
        $('ca-loading').classList.toggle('hidden', !text);
    }

    // Devuelve { data } o { error }. Nunca deja pasar una respuesta sin JSON como si fuera vacía.
    async function getJson(path, context) {
        const token = staffToken();
        if (!token) return { error: core.clientsErrorMessage(401, null, context), fatal: true };
        let response;
        try {
            response = await fetch(`${API_URL}${path}`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                cache: 'no-store',
            });
        } catch (_) {
            return { error: 'No hay conexión con el servidor. Revisa la red y vuelve a intentar.' };
        }
        const body = await response.json().catch(() => null);
        if (!response.ok) {
            const fatal = response.status === 401 || response.status === 403;
            return { error: core.clientsErrorMessage(response.status, body, context), fatal, status: response.status };
        }
        if (body === null) return { error: 'El servidor respondió con un formato inesperado. Avisa a soporte.' };
        return { data: body };
    }

    function showView(name) {
        $('ca-list-view').classList.toggle('hidden', name !== 'list');
        $('ca-detail-view').classList.toggle('hidden', name !== 'detail');
    }

    function renderList(list) {
        const body = $('ca-list-body');
        body.replaceChildren();
        const summary = state.query
            ? `${list.total} ${list.total === 1 ? 'cliente encontrado' : 'clientes encontrados'} para «${state.query}».`
            : `${list.total} ${list.total === 1 ? 'cliente registrado' : 'clientes registrados'}.`;
        $('ca-summary').textContent = summary;
        $('ca-table').classList.toggle('hidden', list.clientes.length === 0);
        $('ca-empty').classList.toggle('hidden', list.clientes.length > 0);
        $('ca-empty').textContent = state.query
            ? 'Ningún cliente coincide con la búsqueda. Prueba con parte del nombre, del teléfono o del correo.'
            : 'Todavía no hay clientes registrados en la app.';

        list.clientes.forEach((cliente) => {
            const tr = make('tr');
            const nameCell = make('td', 'ca-cell-name');
            nameCell.dataset.label = 'Cliente';
            nameCell.appendChild(make('strong', null, cliente.nombre || 'Sin nombre'));
            if (!cliente.activo) nameCell.appendChild(make('span', 'ca-tag ca-tag-muted', 'Inactivo'));
            if (cliente.google_vinculado) nameCell.appendChild(make('span', 'ca-tag', 'Google'));
            tr.appendChild(nameCell);

            const contact = make('td');
            contact.dataset.label = 'Contacto';
            contact.appendChild(make('span', 'ca-line', cliente.telefono || 'Sin teléfono'));
            contact.appendChild(make('span', 'ca-line ca-muted', cliente.correo || 'Sin correo'));
            tr.appendChild(contact);

            const created = make('td', null, core.formatDate(cliente.creado));
            created.dataset.label = 'Registro';
            tr.appendChild(created);

            const last = make('td', null, core.formatDate(cliente.ultimo_ingreso));
            last.dataset.label = 'Último ingreso';
            tr.appendChild(last);

            const carts = make('td', 'ca-num', cliente.carritos === null ? '—' : cliente.carritos);
            carts.dataset.label = 'Carritos';
            tr.appendChild(carts);

            const action = make('td', 'ca-action');
            const btn = make('button', 'btn ca-btn-small', 'Ver detalle');
            btn.type = 'button';
            btn.setAttribute('aria-label', `Ver detalle de ${cliente.nombre || 'cliente sin nombre'}`);
            btn.addEventListener('click', () => loadDetail(cliente.id));
            action.appendChild(btn);
            tr.appendChild(action);
            body.appendChild(tr);
        });

        $('ca-pager').classList.toggle('hidden', list.paginas <= 1);
        $('ca-page-info').textContent = `Página ${list.pagina} de ${list.paginas}`;
        $('ca-prev-btn').disabled = list.pagina <= 1;
        $('ca-next-btn').disabled = list.pagina >= list.paginas;
    }

    async function loadList(page) {
        const seq = ++state.requestSeq;
        state.page = page;
        showView('list');
        showError('');
        setLoading('Cargando clientes…');
        $('ca-list-content').classList.add('hidden');
        const result = await getJson(core.buildListPath(state.query, page), 'list');
        if (seq !== state.requestSeq) return;
        setLoading('');
        if (result.error) {
            showError(result.error, result.fatal ? null : () => loadList(page));
            return;
        }
        let list;
        try {
            list = core.parseClientList(result.data);
        } catch (error) {
            showError(error.message, () => loadList(page));
            return;
        }
        $('ca-list-content').classList.remove('hidden');
        renderList(list);
    }

    function addField(dl, label, value) {
        dl.appendChild(make('dt', null, label));
        dl.appendChild(make('dd', null, value));
    }

    function renderCart(cart) {
        const info = core.describeCart(cart, Date.now());
        const article = make('article', `ca-cart ca-cart-${info.tono}`);
        const head = make('div', 'ca-cart-head');
        head.appendChild(make('h4', null, `Carrito N° ${cart.id}`));
        head.appendChild(make('span', `ca-state ca-state-${info.tono}`, info.estado));
        article.appendChild(head);
        const dates = `Creado el ${core.formatDate(cart.creado)} · última modificación ${core.formatDate(cart.actualizado)}`;
        article.appendChild(make('p', 'ca-muted ca-small', dates));
        info.lineas.forEach((line) => article.appendChild(make('p', 'ca-cart-line', line)));

        if (!cart.items.length) {
            article.appendChild(make('p', 'ca-muted', 'Sin productos.'));
            return article;
        }
        const wrap = make('div', 'ca-items-wrap');
        const table = make('table', 'ca-items');
        const thead = make('thead');
        const hr = make('tr');
        ['Producto', 'Código', 'Cantidad', 'Precio hoy'].forEach((label, idx) => {
            const th = make('th', idx >= 2 ? 'ca-num' : null, label);
            th.scope = 'col';
            hr.appendChild(th);
        });
        thead.appendChild(hr);
        table.appendChild(thead);
        const tbody = make('tbody');
        cart.items.forEach((item) => {
            const tr = make('tr');
            tr.appendChild(make('td', null, item.nombre || 'Producto sin nombre'));
            tr.appendChild(make('td', 'ca-muted', item.codigo || '—'));
            tr.appendChild(make('td', 'ca-num', core.formatQuantity(item.cantidad)));
            tr.appendChild(make('td', 'ca-num', core.formatMoney(item.precio_actual)));
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        wrap.appendChild(table);
        article.appendChild(wrap);
        article.appendChild(make('p', 'ca-total', `Total a precios de hoy: ${core.formatMoney(cart.total_actual)}`));
        return article;
    }

    function renderDetail(detail) {
        const c = detail.cliente;
        $('ca-detail-name').textContent = c.nombre || 'Cliente sin nombre';
        const dl = $('ca-detail-data');
        dl.replaceChildren();
        addField(dl, 'Teléfono', c.telefono || 'Sin teléfono');
        addField(dl, 'Correo', c.correo || 'Sin correo');
        addField(dl, 'Google', c.google_vinculado ? 'Vinculado' : 'No vinculado');
        addField(dl, 'Estado', c.activo ? 'Activo' : 'Inactivo');
        addField(dl, 'Registro', core.formatDate(c.creado));
        addField(dl, 'Último ingreso', core.formatDate(c.ultimo_ingreso));

        const list = $('ca-carts');
        list.replaceChildren();
        $('ca-carts-title').textContent = core.cartsTitle(detail.carritos.length, c.carritos);
        if (!detail.carritos.length) {
            list.appendChild(make('p', 'ca-muted', 'Este cliente todavía no ha armado carritos.'));
            return;
        }
        detail.carritos.forEach((cart) => list.appendChild(renderCart(cart)));
    }

    async function loadDetail(id) {
        const seq = ++state.requestSeq;
        showView('detail');
        showError('');
        $('ca-detail-content').classList.add('hidden');
        setLoading('Cargando cliente…');
        let path;
        try {
            path = core.buildDetailPath(id);
        } catch (error) {
            setLoading('');
            showError(error.message);
            return;
        }
        const result = await getJson(path, 'detail');
        if (seq !== state.requestSeq) return;
        setLoading('');
        if (result.error) {
            showError(result.error, result.fatal || result.status === 404 ? null : () => loadDetail(id));
            return;
        }
        let detail;
        try {
            detail = core.parseClientDetail(result.data);
        } catch (error) {
            showError(error.message, () => loadDetail(id));
            return;
        }
        $('ca-detail-content').classList.remove('hidden');
        renderDetail(detail);
        $('ca-back-btn').focus();
    }

    function init() {
        $('ca-search-input').maxLength = core.MAX_QUERY;
        $('ca-search-form').addEventListener('submit', (ev) => {
            ev.preventDefault();
            state.query = core.normalizeQuery($('ca-search-input').value);
            loadList(1);
        });
        $('ca-clear-btn').addEventListener('click', () => {
            $('ca-search-input').value = '';
            state.query = '';
            loadList(1);
            $('ca-search-input').focus();
        });
        $('ca-prev-btn').addEventListener('click', () => loadList(Math.max(1, state.page - 1)));
        $('ca-next-btn').addEventListener('click', () => loadList(state.page + 1));
        $('ca-back-btn').addEventListener('click', () => loadList(state.page));
        $('ca-retry-btn').addEventListener('click', () => {
            if (state.lastAction) state.lastAction();
        });
        loadList(1);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

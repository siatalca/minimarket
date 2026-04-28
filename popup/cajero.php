<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cajeros</title>
    <link rel="stylesheet" href="../css/root.css">
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <style>
        :root {
            --cashier-border: #dbe3ef;
            --cashier-soft: #f8fbff;
            --cashier-text: #1f2937;
            --cashier-muted: #6b7280;
            --cashier-accent: #0ea5e9;
            --cashier-danger: #ef4444;
        }

        body {
            margin: 0;
            padding: 0;
            background: #f2f6fb;
            color: var(--cashier-text);
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }

        .cashier-shell {
            max-width: 1160px;
            margin: 12px auto;
            padding: 0 12px 12px;
        }

        .cashier-panel {
            border: 1px solid var(--cashier-border);
            border-radius: 12px;
            background: #fff;
            overflow: hidden;
            box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
        }

        .cashier-head {
            margin: 0;
            padding: 14px 16px;
            font-size: 1.08rem;
            font-weight: 700;
            border-bottom: 1px solid var(--cashier-border);
            background: linear-gradient(90deg, #ecfeff 0%, #f0f9ff 100%);
        }

        .cashier-toolbar {
            padding: 10px 12px;
            border-bottom: 1px solid var(--cashier-border);
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px;
        }

        .cashier-toolbar input[type="text"] {
            width: min(360px, 100%);
        }

        .btn-sm {
            min-height: 34px;
            padding: 0 12px;
            border: 1px solid #ced8e6;
            border-radius: 8px;
            background: #fff;
            color: var(--cashier-text);
            cursor: pointer;
            font-weight: 600;
        }

        .btn-sm.primary {
            background: #0ea5e9;
            border-color: #0284c7;
            color: #fff;
        }

        .btn-sm.danger {
            background: #fff5f5;
            border-color: #fecaca;
            color: #b91c1c;
        }

        .btn-sm[disabled] {
            cursor: not-allowed;
            opacity: 0.55;
        }

        .cashier-grid {
            display: grid;
            grid-template-columns: minmax(360px, 1fr) minmax(360px, 1fr);
            gap: 10px;
            padding: 10px;
        }

        .card {
            border: 1px solid var(--cashier-border);
            border-radius: 10px;
            background: #fff;
            min-height: 500px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        .card-title {
            margin: 0;
            padding: 10px 12px;
            font-size: 0.92rem;
            font-weight: 700;
            border-bottom: 1px solid var(--cashier-border);
            background: var(--cashier-soft);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
        }

        .perm-counter {
            font-size: 0.76rem;
            color: #64748b;
            font-weight: 600;
        }

        .cashier-list {
            list-style: none;
            margin: 0;
            padding: 0;
            border-bottom: 1px solid var(--cashier-border);
            max-height: 220px;
            overflow: auto;
        }

        .cashier-item {
            border-bottom: 1px solid #edf2f7;
            padding: 10px 12px;
            display: flex;
            justify-content: space-between;
            gap: 8px;
            cursor: pointer;
        }

        .cashier-item:last-child {
            border-bottom: none;
        }

        .cashier-item.active {
            background: #ecfeff;
        }

        .cashier-item .meta {
            margin-top: 2px;
            color: var(--cashier-muted);
            font-size: 0.84rem;
        }

        .state-tag {
            align-self: center;
            font-size: 0.78rem;
            font-weight: 700;
            color: #065f46;
            background: #d1fae5;
            border: 1px solid #a7f3d0;
            border-radius: 999px;
            padding: 2px 8px;
            white-space: nowrap;
        }

        .state-tag.off {
            color: #991b1b;
            background: #fee2e2;
            border-color: #fecaca;
        }

        .role-tag {
            align-self: center;
            font-size: 0.76rem;
            font-weight: 700;
            color: #1d4ed8;
            background: #dbeafe;
            border: 1px solid #bfdbfe;
            border-radius: 999px;
            padding: 2px 8px;
            white-space: nowrap;
        }

        .form-stack {
            padding: 10px 12px 12px;
            display: grid;
            gap: 8px;
        }

        .form-lock-msg {
            margin: 8px 12px 12px;
            padding: 10px;
            border: 1px dashed #cbd5e1;
            border-radius: 8px;
            color: #64748b;
            background: #f8fafc;
            font-size: 0.85rem;
        }

        .form-stack label {
            font-size: 0.84rem;
            font-weight: 700;
        }

        .form-stack input[type="text"],
        .form-stack input[type="password"] {
            width: 100%;
            min-height: 36px;
            border: 1px solid #cfd8e6;
            border-radius: 8px;
            padding: 0 10px;
            box-sizing: border-box;
            background: #fff;
        }

        .checkbox-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 2px;
        }

        .perm-wrap {
            padding: 10px;
            overflow: auto;
        }

        .perm-group {
            border: 1px solid var(--cashier-border);
            border-radius: 10px;
            margin-bottom: 8px;
            background: #fff;
            overflow: hidden;
        }

        .perm-group-title {
            margin: 0;
            padding: 8px 10px;
            font-size: 0.86rem;
            border-bottom: 1px solid var(--cashier-border);
            background: var(--cashier-soft);
            cursor: pointer;
            user-select: none;
            position: relative;
            padding-right: 28px;
        }

        .perm-group-title::after {
            content: '+';
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            font-weight: 700;
            color: #334155;
        }

        .perm-group.open .perm-group-title::after {
            content: '-';
        }

        .perm-list {
            display: grid;
            gap: 0;
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.2s ease;
        }

        .perm-group.open .perm-list {
            max-height: 420px;
        }

        .perm-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            border-bottom: 1px solid #eef2f7;
            font-size: 0.86rem;
        }

        .perm-item:last-child {
            border-bottom: none;
        }

        .status-note {
            margin-left: auto;
            font-size: 0.82rem;
            color: var(--cashier-muted);
        }

        .status-note.error {
            color: var(--cashier-danger);
        }

        @media (max-width: 980px) {
            .cashier-grid {
                grid-template-columns: 1fr;
            }

            .card {
                min-height: 420px;
            }
        }
    </style>
</head>
<body>
    <div class="cashier-shell">
        <div class="cashier-panel">
            <h2 class="cashier-head">Administracion de cajeros</h2>

            <div class="cashier-toolbar">
                <input id="cashier-search" type="text" class="form-input" placeholder="Buscar por nombre o usuario">
                <button id="btn-new-cashier" type="button" class="btn-sm" onclick="startNewCashier()">Nuevo</button>
                <button id="btn-save-cashier" type="button" class="btn-sm primary" onclick="saveCashier()">Guardar</button>
                <button id="btn-cancel-cashier" type="button" class="btn-sm" style="display:none;" onclick="cancelCashierOperation()">Cancelar</button>
                <button id="btn-delete-cashier" type="button" class="btn-sm danger" onclick="deleteCashier()">Eliminar</button>
                <span id="status-note" class="status-note"></span>
            </div>

            <div class="cashier-grid">
                <section class="card">
                    <h3 class="card-title">Cajeros registrados</h3>
                    <ul id="cashier-list" class="cashier-list"></ul>
                    <div id="cashier-form-lock-msg" class="form-lock-msg">Selecciona un cajero o presiona Nuevo para habilitar el formulario.</div>
                    <div id="cashier-form" class="form-stack" style="display:none;">
                        <label for="cashier-user">Usuario</label>
                        <input id="cashier-user" type="text" maxlength="80">

                        <label for="cashier-name">Nombre completo</label>
                        <input id="cashier-name" type="text" maxlength="120">

                        <label for="cashier-password">Contrasena</label>
                        <input id="cashier-password" type="password" maxlength="120" placeholder="Obligatoria al crear, opcional al editar">

                        <div class="checkbox-row">
                            <input id="cashier-active" type="checkbox" checked>
                            <label for="cashier-active" style="margin:0;">Cajero activo</label>
                        </div>

                        <div class="checkbox-row">
                            <input id="cashier-admin" type="checkbox">
                            <label for="cashier-admin" style="margin:0;">Es administrador</label>
                        </div>
                    </div>
                </section>

                <section class="card">
                    <h3 class="card-title">
                        <span>Limitar uso por cajero</span>
                        <span id="permissions-counter" class="perm-counter">0/0</span>
                    </h3>
                    <div id="permissions-wrap" class="perm-wrap"></div>
                </section>
            </div>
        </div>
    </div>

    <script src="../js/functions.js"></script>
    <script>
        const API_URL = (() => {
            const override = window.localStorage.getItem('api_url');
            if (override) return override.endsWith('/') ? override : `${override}/`;
            if (window.location.port === '3002') return `${window.location.origin}/`;
            const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
            const protocol = isLocalHost ? 'http:' : window.location.protocol;
            return `${protocol}//${window.location.hostname}:3002/`;
        })();

        const PERMISSION_DEFS = [
            { key: 'ventas_producto_comun', label: 'Utilizar producto comun', group: 'Ventas' },
            { key: 'ventas_historial', label: 'Revisar historial de ventas', group: 'Ventas' },
            { key: 'ventas_entrada_efectivo', label: 'Registrar entradas de efectivo', group: 'Ventas' },
            { key: 'ventas_salida_efectivo', label: 'Registrar salidas de efectivo', group: 'Ventas' },
            { key: 'ventas_cobrar_ticket', label: 'Cobrar un ticket', group: 'Ventas' },
            { key: 'ventas_cancelar_ticket', label: 'Cancelar ticket y devolver articulos', group: 'Ventas' },
            { key: 'ventas_eliminar_articulo', label: 'Eliminar articulo de venta', group: 'Ventas' },
            { key: 'ventas_facturar', label: 'Facturar / ver factura', group: 'Ventas' },
            { key: 'ventas_recarga_electronica', label: 'Vender recargas electronicas', group: 'Ventas' },
            { key: 'ventas_buscar_producto', label: 'Usar buscador de productos', group: 'Ventas' },
            { key: 'productos_crear', label: 'Crear productos', group: 'Productos' },
            { key: 'productos_modificar', label: 'Modificar productos', group: 'Productos' },
            { key: 'productos_eliminar', label: 'Eliminar productos', group: 'Productos' },
            { key: 'productos_crear_promociones', label: 'Crear promociones', group: 'Productos' },
            { key: 'inventario_agregar_mercancia', label: 'Agregar mercancia', group: 'Inventario' },
            { key: 'inventario_reportes_existencia', label: 'Ver reportes de existencia y minimos', group: 'Inventario' },
            { key: 'inventario_movimientos', label: 'Ver movimientos de inventario', group: 'Inventario' },
            { key: 'inventario_ajustar', label: 'Ajustar inventario', group: 'Inventario' },
            { key: 'corte_turno', label: 'Corte de su turno y efectivo esperado', group: 'Corte' },
            { key: 'corte_todos_turnos', label: 'Corte de todos los turnos', group: 'Corte' },
            { key: 'corte_dia', label: 'Corte del dia (todos los turnos)', group: 'Corte' },
            { key: 'corte_ver_ganancia_dia', label: 'Ver ganancia del dia', group: 'Corte' },
            { key: 'reportes_ver', label: 'Acceder a reportes de ventas y ganancias', group: 'Reportes' },
            { key: 'configuracion_acceso', label: 'Cambiar configuracion del programa', group: 'Configuracion' },
            { key: 'compras_crear_orden', label: 'Crear ordenes de compra', group: 'Compras' },
            { key: 'compras_recibir_orden', label: 'Recibir ordenes de compra', group: 'Compras' }
        ];

        let cashiers = [];
        let selectedCashierId = null;
        let mode = 'idle';
        let activePermissionGroup = 'Ventas';

        function authHeaders(extra = {}) {
            const token = sessionStorage.getItem('token') || localStorage.getItem('token');
            const base = token ? { Authorization: `Bearer ${token}` } : {};
            return { ...base, ...extra };
        }

        function setStatus(message = '', isError = false) {
            const note = document.getElementById('status-note');
            if (!note) return;
            note.textContent = message;
            note.classList.toggle('error', Boolean(isError));
        }

        function defaultPermissions() {
            const permissions = {};
            PERMISSION_DEFS.forEach((item) => {
                permissions[item.key] = 0;
            });
            return permissions;
        }

        function permissionsByGroup() {
            const map = new Map();
            PERMISSION_DEFS.forEach((item) => {
                if (!map.has(item.group)) map.set(item.group, []);
                map.get(item.group).push(item);
            });
            return map;
        }

        function renderPermissions(permissions = defaultPermissions(), disabled = false) {
            const wrap = document.getElementById('permissions-wrap');
            if (!wrap) return;

            const groups = permissionsByGroup();
            wrap.innerHTML = '';

            groups.forEach((items, groupName) => {
                const group = document.createElement('div');
                group.className = 'perm-group';
                group.dataset.groupName = groupName;
                if (groupName === activePermissionGroup) {
                    group.classList.add('open');
                }

                const title = document.createElement('h4');
                title.className = 'perm-group-title';
                title.textContent = groupName;
                title.addEventListener('click', () => togglePermissionGroup(groupName));
                group.appendChild(title);

                const list = document.createElement('div');
                list.className = 'perm-list';
                items.forEach((item) => {
                    const row = document.createElement('label');
                    row.className = 'perm-item';
                    const checked = Number(permissions[item.key] || 0) === 1 ? 'checked' : '';
                    const lock = disabled ? 'disabled' : '';
                    row.innerHTML = `<input type="checkbox" data-perm-key="${item.key}" ${checked} ${lock}> <span>${item.label}</span>`;
                    list.appendChild(row);
                });

                group.appendChild(list);
                wrap.appendChild(group);
            });
            updatePermissionsCounter();
        }

        function togglePermissionGroup(groupName) {
            activePermissionGroup = groupName;
            document.querySelectorAll('.perm-group').forEach((group) => {
                const isCurrent = group.dataset.groupName === groupName;
                group.classList.toggle('open', isCurrent);
            });
        }

        function formPermissions() {
            const permissions = defaultPermissions();
            document.querySelectorAll('[data-perm-key]').forEach((el) => {
                permissions[el.dataset.permKey] = el.checked ? 1 : 0;
            });
            return permissions;
        }

        function updatePermissionsCounter() {
            const counter = document.getElementById('permissions-counter');
            if (!counter) return;
            const inputs = Array.from(document.querySelectorAll('[data-perm-key]'));
            const total = inputs.length;
            const enabled = inputs.filter((input) => input.checked).length;
            counter.textContent = `${enabled}/${total}`;
        }

        function setFormState(enabled, visible) {
            const form = document.getElementById('cashier-form');
            const lockMsg = document.getElementById('cashier-form-lock-msg');
            const saveBtn = document.getElementById('btn-save-cashier');
            const cancelBtn = document.getElementById('btn-cancel-cashier');
            if (form) form.style.display = visible ? '' : 'none';
            if (lockMsg) lockMsg.style.display = visible ? 'none' : '';
            if (saveBtn) saveBtn.disabled = !enabled;
            if (cancelBtn) cancelBtn.style.display = visible ? '' : 'none';

            ['cashier-user', 'cashier-name', 'cashier-password', 'cashier-active', 'cashier-admin'].forEach((id) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.disabled = !enabled;
            });
        }

        function setIdleState() {
            selectedCashierId = null;
            mode = 'idle';
            clearForm();
            setFormState(false, false);
            renderPermissions(defaultPermissions(), true);
            renderCashierList();
            syncActionButtons();
            setStatus('Selecciona un cajero o crea uno nuevo.');
        }

        function cancelCashierOperation() {
            setIdleState();
        }

        function clearForm() {
            document.getElementById('cashier-user').value = '';
            document.getElementById('cashier-name').value = '';
            document.getElementById('cashier-password').value = '';
            document.getElementById('cashier-active').checked = true;
            document.getElementById('cashier-admin').checked = false;
            renderPermissions(defaultPermissions(), mode === 'idle');
        }

        function fillForm(cashier) {
            if (!cashier) {
                clearForm();
                return;
            }
            document.getElementById('cashier-user').value = cashier.user || '';
            document.getElementById('cashier-name').value = cashier.nombre || '';
            document.getElementById('cashier-password').value = '';
            document.getElementById('cashier-active').checked = Number(cashier.estado_usuario || 0) === 1;
            document.getElementById('cashier-admin').checked = Number(cashier.es_administrador || 0) === 1;
            renderPermissions(cashier.permisos || defaultPermissions(), false);
        }

        function filteredCashiers() {
            const q = String(document.getElementById('cashier-search')?.value || '').trim().toLowerCase();
            if (!q) return cashiers;
            return cashiers.filter((cashier) =>
                String(cashier.nombre || '').toLowerCase().includes(q) ||
                String(cashier.user || '').toLowerCase().includes(q)
            );
        }

        function syncActionButtons() {
            const deleteBtn = document.getElementById('btn-delete-cashier');
            const saveBtn = document.getElementById('btn-save-cashier');
            if (deleteBtn) deleteBtn.disabled = !(mode === 'edit' && selectedCashierId !== null);
            if (saveBtn) saveBtn.disabled = !(mode === 'create' || mode === 'edit');
        }

        function renderCashierList() {
            const list = document.getElementById('cashier-list');
            if (!list) return;
            const rows = filteredCashiers();
            list.innerHTML = '';

            if (!rows.length) {
                const li = document.createElement('li');
                li.className = 'cashier-item';
                li.textContent = 'No hay cajeros registrados.';
                list.appendChild(li);
                return;
            }

            rows.forEach((cashier) => {
                const li = document.createElement('li');
                li.className = `cashier-item ${Number(selectedCashierId) === Number(cashier.id) ? 'active' : ''}`;
                const isActive = Number(cashier.estado_usuario || 0) === 1;
                const isAdmin = Number(cashier.es_administrador || 0) === 1;
                const stateClass = isActive ? 'state-tag' : 'state-tag off';
                const stateText = isActive ? 'Activo' : 'Inactivo';
                li.innerHTML = `
                    <div>
                        <strong>${cashier.nombre || ''}</strong>
                        <div class="meta">@${cashier.user || ''}</div>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center;">
                        ${isAdmin ? '<span class="role-tag">Admin</span>' : ''}
                        <span class="${stateClass}">${stateText}</span>
                    </div>
                `;
                li.addEventListener('click', () => selectCashier(cashier.id));
                list.appendChild(li);
            });
        }

        function selectCashier(id) {
            const found = cashiers.find((cashier) => Number(cashier.id) === Number(id));
            if (!found) return;
            selectedCashierId = Number(found.id);
            mode = 'edit';
            setFormState(true, true);
            fillForm(found);
            renderCashierList();
            syncActionButtons();
            setStatus('');
        }

        function startNewCashier() {
            selectedCashierId = null;
            mode = 'create';
            setFormState(true, true);
            clearForm();
            renderCashierList();
            renderPermissions(defaultPermissions(), false);
            syncActionButtons();
            setStatus('Nuevo cajero');
        }

        async function loadCashiers(preferredId = null) {
            setStatus('Cargando cajeros...');
            try {
                const response = await fetch(API_URL + 'api/cajeros', {
                    headers: authHeaders()
                });
                const rows = await response.json().catch(() => []);
                if (!response.ok || !Array.isArray(rows)) {
                    setStatus('No se pudo cargar la lista de cajeros.', true);
                    return;
                }

                cashiers = rows.map((row) => ({
                    ...row,
                    permisos: row.permisos || defaultPermissions()
                }));

                if (cashiers.length === 0) {
                    setIdleState();
                    setStatus('Sin cajeros registrados');
                    return;
                }

                const targetId = preferredId ?? selectedCashierId;
                if (targetId && cashiers.some((row) => Number(row.id) === Number(targetId))) {
                    selectCashier(targetId);
                    setStatus('Cajeros cargados');
                    return;
                }
                setIdleState();
            } catch (error) {
                console.error('Error cargando cajeros:', error);
                setStatus('Error de conexion al cargar cajeros.', true);
            }
        }

        function buildPayload() {
            return {
                user: String(document.getElementById('cashier-user').value || '').trim(),
                nombre: String(document.getElementById('cashier-name').value || '').trim(),
                contrasena: String(document.getElementById('cashier-password').value || ''),
                estado_usuario: document.getElementById('cashier-active').checked,
                es_administrador: document.getElementById('cashier-admin').checked,
                permisos: formPermissions()
            };
        }

        async function saveCashier() {
            const payload = buildPayload();
            if (!payload.user || !payload.nombre) {
                setStatus('Completa usuario y nombre.', true);
                return;
            }
            if (mode === 'create' && (!payload.contrasena || payload.contrasena.length < 4)) {
                setStatus('La contrasena debe tener al menos 4 caracteres.', true);
                return;
            }
            if (mode === 'edit' && selectedCashierId === null) {
                setStatus('Selecciona un cajero para editar.', true);
                return;
            }

            const isCreate = mode === 'create' || selectedCashierId === null;
            const url = isCreate ? API_URL + 'api/cajeros' : API_URL + `api/cajeros/${selectedCashierId}`;
            const method = isCreate ? 'POST' : 'PUT';

            setStatus('Guardando...');
            try {
                const response = await fetch(url, {
                    method,
                    headers: authHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(payload)
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    setStatus(data.error || 'No se pudo guardar el cajero.', true);
                    return;
                }
                const nextId = isCreate ? Number(data.id || 0) : Number(selectedCashierId || 0);
                mode = 'edit';
                await loadCashiers(nextId || null);
                setStatus('Cambios guardados');
            } catch (error) {
                console.error('Error guardando cajero:', error);
                setStatus('Error de conexion al guardar.', true);
            }
        }

        async function deleteCashier() {
            if (selectedCashierId === null) {
                setStatus('Selecciona un cajero para eliminar.', true);
                return;
            }

            const found = cashiers.find((cashier) => Number(cashier.id) === Number(selectedCashierId));
            const name = found?.nombre || `ID ${selectedCashierId}`;
            if (!confirm(`Eliminar cajero ${name}?`)) return;

            setStatus('Eliminando...');
            try {
                const response = await fetch(API_URL + `api/cajeros/${selectedCashierId}`, {
                    method: 'DELETE',
                    headers: authHeaders()
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    setStatus(data.error || 'No se pudo eliminar el cajero.', true);
                    return;
                }
                await loadCashiers();
                setStatus('Cajero eliminado');
            } catch (error) {
                console.error('Error eliminando cajero:', error);
                setStatus('Error de conexion al eliminar.', true);
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            renderPermissions(defaultPermissions(), true);
            setFormState(false, false);
            const searchInput = document.getElementById('cashier-search');
            if (searchInput) {
                searchInput.addEventListener('input', renderCashierList);
            }
            document.addEventListener('change', (event) => {
                const target = event.target;
                if (target && target.matches('[data-perm-key]')) {
                    updatePermissionsCounter();
                }
            });
            syncActionButtons();
            loadCashiers();
        });
    </script>
</body>
</html>

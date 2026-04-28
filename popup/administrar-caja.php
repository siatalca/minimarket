<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Administrar cajas</title>
    <link rel="stylesheet" href="../css/root.css">
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <script src="../js/functions.js"></script>
    <style>
        body {
            padding: 14px 16px;
            background: var(--clr-bg-light);
        }

        .box-admin-shell {
            max-width: 1080px;
            margin: 0 auto;
        }

        .box-admin-panel {
            border: 1px solid #dbe3ef;
            border-radius: 12px;
            overflow: hidden;
            background: #fff;
            box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
        }

        .box-admin-title {
            margin: 0;
            padding: 14px 16px;
            font-size: 1.08rem;
            font-weight: 700;
            border-bottom: 1px solid #dbe3ef;
            background: linear-gradient(90deg, #ecfeff 0%, #f0f9ff 100%);
        }

        .box-admin-body {
            padding: 10px;
        }

        .box-admin-layout {
            display: grid;
            grid-template-columns: 1.5fr 1fr;
            gap: 12px;
        }

        .box-admin-card {
            border: 1px solid #d6e0ef;
            border-radius: 12px;
            background: #fff;
            padding: 12px;
        }

        .box-admin-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(130px, 1fr));
            gap: 10px;
        }

        .box-slot {
            border: 1px solid #d6e0ef;
            border-radius: 10px;
            padding: 10px;
            background: #f8fbff;
            cursor: pointer;
            text-align: center;
        }

        .box-slot.selected {
            border-color: #0ea5e9;
            box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.18);
            background: #eef9ff;
        }

        .box-slot img {
            width: 48px;
            height: 48px;
            object-fit: contain;
        }

        .box-slot-number {
            margin-top: 6px;
            font-weight: 700;
            font-size: 0.9rem;
        }

        .box-slot-name {
            margin-top: 4px;
            font-size: 0.83rem;
            color: #4b5563;
            min-height: 18px;
        }

        .box-slot-branch {
            margin-top: 3px;
            font-size: 0.72rem;
            color: #2563eb;
            min-height: 16px;
        }

        .box-slot-state {
            margin-top: 8px;
            display: inline-block;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 0.72rem;
            font-weight: 700;
            border: 1px solid #93c5fd;
            color: #1d4ed8;
            background: #eff6ff;
        }

        .box-slot-state.off {
            border-color: #fecaca;
            color: #b91c1c;
            background: #fef2f2;
        }

        .box-admin-form {
            display: grid;
            gap: 10px;
        }

        .box-admin-form label {
            font-size: 0.85rem;
            font-weight: 700;
            color: var(--clr-text-light);
        }

        .box-admin-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .box-admin-toolbar {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
        }

        .box-view-btn {
            min-width: 150px;
        }

        .box-view-btn.active {
            box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.22);
            border-color: #0ea5e9;
        }

        .box-admin-editor-empty {
            min-height: 300px;
            border: 1px dashed #cbd5e1;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #64748b;
            text-align: center;
            padding: 16px;
        }

        .box-admin-summary {
            margin: 0 0 10px;
            font-size: 0.87rem;
            color: #4b5563;
        }

        .box-admin-msg {
            min-height: 18px;
            font-size: 0.83rem;
        }

        .box-admin-msg.ok {
            color: #166534;
        }

        .box-admin-msg.err {
            color: #b91c1c;
        }

        body.dark .box-admin-card {
            background: #111c2f;
            border-color: #263952;
        }

        body.dark .box-slot {
            background: #0f1a2c;
            border-color: #2b3f5c;
        }

        body.dark .box-slot.selected {
            background: #13253a;
        }

        body.dark .box-slot-name,
        body.dark .box-admin-summary {
            color: #c1d0e6;
        }

        body.dark .box-slot-branch {
            color: #93c5fd;
        }

        body.dark .box-admin-editor-empty {
            border-color: #334e73;
            color: #c1d0e6;
        }

        body.dark .box-view-btn.active {
            border-color: #38bdf8;
            box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.28);
        }

        @media (max-width: 900px) {
            .box-admin-layout {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 650px) {
            .box-admin-grid {
                grid-template-columns: repeat(2, minmax(130px, 1fr));
            }
        }
    </style>
</head>
<body>
    <div class="box-admin-shell">
        <section class="box-admin-panel">
        <h2 class="box-admin-title">Administrar Cajas</h2>
        <div class="box-admin-body">
        <p class="box-admin-summary" id="box-admin-summary">Cargando cajas habilitadas...</p>
        <div class="box-admin-layout">
            <div class="box-admin-card">
                <div class="box-admin-toolbar">
                    <button type="button" class="btn box-view-btn active" id="box-view-enabled-btn">Cajas habilitadas</button>
                    <button type="button" class="btn box-view-btn" id="box-view-inactive-btn">Cajas inactivas</button>
                    <button type="button" class="btn" id="box-refresh-btn">Recargar</button>
                </div>
                <div class="box-admin-grid" id="box-admin-grid"></div>
            </div>

            <div class="box-admin-card">
                <div id="box-admin-editor-empty" class="box-admin-editor-empty">
                    Selecciona una caja habilitada para editarla.
                </div>
                <form id="box-admin-form" class="box-admin-form hidden">
                    <div>
                        <label for="box-number">Numero de caja</label>
                        <select id="box-number"></select>
                    </div>
                    <div>
                        <label for="box-name">Nombre de caja</label>
                        <input type="text" id="box-name" maxlength="120" placeholder="Ej. Caja Principal" required>
                    </div>
                    <div>
                        <label for="box-branch">Sucursal</label>
                        <select id="box-branch"></select>
                    </div>
                    <div>
                        <label>
                            <input type="checkbox" id="box-enabled" checked>
                            Caja habilitada
                        </label>
                    </div>
                    <div>
                        <label>
                            <input type="checkbox" id="box-assign-local">
                            Asignar esta caja al equipo actual
                        </label>
                    </div>
                    <div class="box-admin-actions">
                        <button type="submit" class="btn" id="box-save-btn" disabled>Guardar caja</button>
                        <button type="button" class="btn" id="box-delete-btn">Eliminar caja</button>
                        <button type="button" class="btn" id="box-cancel-btn" disabled>Cancelar</button>
                    </div>
                    <p id="box-admin-msg" class="box-admin-msg"></p>
                </form>
            </div>
        </div>
        </div>
        </section>
    </div>

    <script>
        const API_URL = (() => {
            const override = window.localStorage.getItem('api_url');
            if (override) return override.endsWith('/') ? override : `${override}/`;
            if (window.location.port === '3002') return `${window.location.origin}/`;
            const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
            const protocol = isLocalHost ? 'http:' : window.location.protocol;
            return `${protocol}//${window.location.hostname}:3002/`;
        })();

        const slots = Array.from({ length: 8 }, (_, i) => i + 1);
        let boxesByNumber = new Map();
        let branchesById = new Map();
        let selectedBoxNumber = null;
        let initialFormSnapshot = null;
        let currentBoxView = 'enabled';

        function getCurrentAssignedBoxNumber() {
            const raw = String(localStorage.getItem('n_caja') || '').trim();
            const num = Number(raw);
            return Number.isFinite(num) && num >= 1 && num <= 8 ? num : null;
        }

        function applyPopupTheme() {
            const saved = localStorage.getItem('theme');
            if (saved === 'dark') {
                document.body.classList.add('dark');
            } else {
                document.body.classList.remove('dark');
            }
        }

        function withAuthHeaders(headers = {}) {
            const token = sessionStorage.getItem('token') || localStorage.getItem('token');
            return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
        }

        function setEditorVisible(visible) {
            const form = document.getElementById('box-admin-form');
            const empty = document.getElementById('box-admin-editor-empty');
            if (form) form.classList.toggle('hidden', !visible);
            if (empty) empty.classList.toggle('hidden', visible);
        }

        function getFormSnapshot() {
            const numberInput = document.getElementById('box-number');
            const nameInput = document.getElementById('box-name');
            const branchInput = document.getElementById('box-branch');
            const enabledInput = document.getElementById('box-enabled');
            const assignInput = document.getElementById('box-assign-local');
            return {
                numero_caja: Number(numberInput?.value || 0),
                nombre_caja: String(nameInput?.value || '').trim(),
                sucursal_id: Number(branchInput?.value || 1),
                estado: Boolean(enabledInput?.checked),
                assign_local: Boolean(assignInput?.checked),
            };
        }

        function isFormDirty() {
            if (!initialFormSnapshot) return false;
            const current = getFormSnapshot();
            return (
                current.numero_caja !== initialFormSnapshot.numero_caja ||
                current.nombre_caja !== initialFormSnapshot.nombre_caja ||
                current.sucursal_id !== initialFormSnapshot.sucursal_id ||
                current.estado !== initialFormSnapshot.estado ||
                current.assign_local !== initialFormSnapshot.assign_local
            );
        }

        function refreshFormButtonsState() {
            const saveBtn = document.getElementById('box-save-btn');
            const cancelBtn = document.getElementById('box-cancel-btn');
            const dirty = isFormDirty();
            if (saveBtn) saveBtn.disabled = !dirty;
            if (cancelBtn) cancelBtn.disabled = !dirty;
        }

        function syncInitialSnapshot() {
            initialFormSnapshot = getFormSnapshot();
            refreshFormButtonsState();
        }

        function setMessage(text, type = '') {
            const el = document.getElementById('box-admin-msg');
            if (!el) return;
            el.textContent = text || '';
            el.className = `box-admin-msg ${type}`.trim();
        }

        function isBoxVisibleInCurrentView(box) {
            if (!box) return false;
            const enabled = Number(box.estado || 0) === 1;
            return currentBoxView === 'inactive' ? !enabled : enabled;
        }

        function updateEditorEmptyText() {
            const empty = document.getElementById('box-admin-editor-empty');
            if (!empty) return;
            empty.textContent = currentBoxView === 'inactive'
                ? 'Selecciona una caja inactiva para reactivarla o editarla.'
                : 'Selecciona una caja habilitada para editarla.';
        }

        function updateViewToggleButtons() {
            const enabledBtn = document.getElementById('box-view-enabled-btn');
            const inactiveBtn = document.getElementById('box-view-inactive-btn');
            if (enabledBtn) enabledBtn.classList.toggle('active', currentBoxView === 'enabled');
            if (inactiveBtn) inactiveBtn.classList.toggle('active', currentBoxView === 'inactive');
        }

        function setCurrentBoxView(view) {
            currentBoxView = view === 'inactive' ? 'inactive' : 'enabled';
            const selected = selectedBoxNumber !== null ? boxesByNumber.get(selectedBoxNumber) : null;
            if (!selected || !isBoxVisibleInCurrentView(selected)) {
                selectedBoxNumber = null;
                initialFormSnapshot = null;
                setEditorVisible(false);
                refreshFormButtonsState();
            } else {
                setEditorVisible(true);
                fillFormFromSelection();
            }
            updateViewToggleButtons();
            updateEditorEmptyText();
            renderGrid();
        }

        function normalizeBoxes(raw) {
            if (!Array.isArray(raw)) return [];
            return raw
                .map((row) => ({
                    n_caja: Number(row?.n_caja || 0),
                    nombre_caja: String(row?.nombre_caja || '').trim(),
                    sucursal_id: Number(row?.sucursal_id || 1),
                    sucursal_nombre: String(row?.sucursal_nombre || '').trim(),
                    estado: Number(row?.estado || 0) === 1 ? 1 : 0,
                }))
                .filter((row) => row.n_caja >= 1 && row.n_caja <= 8);
        }

        function renderSummary() {
            const enabled = Array.from(boxesByNumber.values()).filter((box) => box.estado === 1).length;
            const inactive = Array.from(boxesByNumber.values()).filter((box) => box.estado !== 1).length;
            const summary = document.getElementById('box-admin-summary');
            if (summary) {
                summary.textContent = `Cajas habilitadas: ${enabled} de 8 equipos permitidos. Inactivas: ${inactive}.`;
            }
        }

        function renderGrid() {
            const grid = document.getElementById('box-admin-grid');
            if (!grid) return;
            grid.innerHTML = '';

            const visibleBoxes = Array.from(boxesByNumber.values())
                .filter((box) => isBoxVisibleInCurrentView(box))
                .sort((a, b) => a.n_caja - b.n_caja);

            if (visibleBoxes.length === 0) {
                const empty = document.createElement('div');
                empty.style.gridColumn = '1 / -1';
                empty.style.padding = '10px';
                empty.style.border = '1px dashed #cbd5e1';
                empty.style.borderRadius = '8px';
                empty.style.textAlign = 'center';
                empty.textContent = currentBoxView === 'inactive'
                    ? 'No hay cajas inactivas.'
                    : 'No hay cajas habilitadas.';
                grid.appendChild(empty);
                return;
            }

            visibleBoxes.forEach((box) => {
                const number = Number(box.n_caja);
                const isEnabled = Number(box.estado || 0) === 1;
                const slot = document.createElement('button');
                slot.type = 'button';
                slot.className = `box-slot${selectedBoxNumber === number ? ' selected' : ''}`;
                slot.dataset.box = String(number);
                slot.innerHTML = `
                    <img src="../img/cajero-automatico.png" alt="Caja ${number}">
                    <div class="box-slot-number">Caja ${number}</div>
                    <div class="box-slot-name">${box?.nombre_caja || 'Sin configurar'}</div>
                    <div class="box-slot-branch">${box?.sucursal_nombre || 'Sucursal Principal'}</div>
                    <span class="box-slot-state${isEnabled ? '' : ' off'}">${isEnabled ? 'Habilitada' : 'Inactiva'}</span>
                `;
                slot.addEventListener('click', () => {
                    selectedBoxNumber = number;
                    fillFormFromSelection();
                    setEditorVisible(true);
                    renderGrid();
                });
                grid.appendChild(slot);
            });
        }

        function buildBoxNumberOptions() {
            const select = document.getElementById('box-number');
            if (!select) return;
            select.innerHTML = slots.map((n) => `<option value="${n}">Caja ${n}</option>`).join('');
            if (selectedBoxNumber) {
                select.value = String(selectedBoxNumber);
            }
        }

        function buildBranchOptions() {
            const select = document.getElementById('box-branch');
            if (!select) return;
            const branches = Array.from(branchesById.values()).sort((a, b) => a.id_sucursal - b.id_sucursal);
            if (!branches.length) {
                select.innerHTML = '<option value="1">Sucursal Principal</option>';
                return;
            }
            select.innerHTML = branches
                .map((branch) => `<option value="${branch.id_sucursal}">${branch.nombre}</option>`)
                .join('');
        }

        function fillFormFromSelection() {
            if (!selectedBoxNumber) {
                initialFormSnapshot = null;
                refreshFormButtonsState();
                return;
            }
            const box = boxesByNumber.get(selectedBoxNumber);
            const numberInput = document.getElementById('box-number');
            const nameInput = document.getElementById('box-name');
            const branchInput = document.getElementById('box-branch');
            const enabledInput = document.getElementById('box-enabled');
            const assignInput = document.getElementById('box-assign-local');

            if (numberInput) numberInput.value = String(selectedBoxNumber);
            if (nameInput) nameInput.value = box?.nombre_caja || `Caja ${selectedBoxNumber}`;
            if (branchInput) branchInput.value = String(box?.sucursal_id || 1);
            if (enabledInput) enabledInput.checked = box ? box.estado === 1 : true;
            if (assignInput) {
                const assignedBox = getCurrentAssignedBoxNumber();
                assignInput.checked = assignedBox !== null && assignedBox === selectedBoxNumber;
            }
            syncInitialSnapshot();
        }

        function clearSelectionAndEditor() {
            selectedBoxNumber = null;
            initialFormSnapshot = null;
            setEditorVisible(false);
            refreshFormButtonsState();
            renderGrid();
        }

        async function loadBoxes() {
            setMessage('');
            try {
                const response = await fetch(API_URL + 'api/getCajas', {
                    headers: withAuthHeaders(),
                });
                const data = await response.json().catch(() => []);
                const boxes = normalizeBoxes(data);
                boxesByNumber = new Map(boxes.map((box) => [box.n_caja, box]));
                if (selectedBoxNumber !== null) {
                    const selected = boxesByNumber.get(selectedBoxNumber);
                    if (!selected || !isBoxVisibleInCurrentView(selected)) {
                        selectedBoxNumber = null;
                    }
                }
                buildBoxNumberOptions();
                renderSummary();
                updateViewToggleButtons();
                updateEditorEmptyText();
                if (selectedBoxNumber === null) {
                    setEditorVisible(false);
                    initialFormSnapshot = null;
                    refreshFormButtonsState();
                } else {
                    setEditorVisible(true);
                    fillFormFromSelection();
                }
                renderGrid();
            } catch (error) {
                setMessage('No se pudo cargar la informacion de cajas.', 'err');
            }
        }

        async function loadBranches() {
            try {
                const response = await fetch(API_URL + 'api/sucursales', {
                    headers: withAuthHeaders(),
                });
                const data = await response.json().catch(() => []);
                if (!response.ok || !Array.isArray(data)) {
                    branchesById = new Map([[1, { id_sucursal: 1, nombre: 'Sucursal Principal', activa: 1 }]]);
                } else {
                    const rows = data.map((row) => ({
                        id_sucursal: Number(row?.id_sucursal || 0),
                        nombre: String(row?.nombre || '').trim(),
                        activa: Number(row?.activa || 0),
                    })).filter((row) => row.id_sucursal > 0);
                    branchesById = new Map(rows.map((row) => [row.id_sucursal, row]));
                    if (!branchesById.size) {
                        branchesById = new Map([[1, { id_sucursal: 1, nombre: 'Sucursal Principal', activa: 1 }]]);
                    }
                }
            } catch (_) {
                branchesById = new Map([[1, { id_sucursal: 1, nombre: 'Sucursal Principal', activa: 1 }]]);
            }
            buildBranchOptions();
        }

        async function bindDeviceIfNeeded(boxNumber, boxName) {
            const assignInput = document.getElementById('box-assign-local');
            if (!assignInput || !assignInput.checked) return;

            localStorage.setItem('n_caja', String(boxNumber));
            localStorage.setItem('nombre_caja', String(boxName));

            const fingerprint = String(localStorage.getItem('device_fp') || '').trim();
            if (!fingerprint) return;

            try {
                await fetch(API_URL + 'api/device-caja/bind', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fingerprint,
                        numero_caja: Number(boxNumber),
                        nombre_caja: String(boxName),
                    }),
                });
            } catch (_) {}
        }

        async function submitBoxForm(event) {
            event.preventDefault();
            if (selectedBoxNumber === null) {
                setMessage('Selecciona una caja para editar.', 'err');
                return;
            }
            const numberInput = document.getElementById('box-number');
            const nameInput = document.getElementById('box-name');
            const enabledInput = document.getElementById('box-enabled');
            const boxNumber = Number(numberInput?.value || 0);
            const boxName = String(nameInput?.value || '').trim();
            const branchId = Number(document.getElementById('box-branch')?.value || 1);
            const isEnabled = Boolean(enabledInput?.checked);
            const previousBox = boxesByNumber.get(selectedBoxNumber);
            const isReactivation = Boolean(previousBox) && Number(previousBox.estado || 0) !== 1 && isEnabled;
            if (!isFormDirty()) {
                return;
            }

            if (boxNumber < 1 || boxNumber > 8) {
                setMessage('Numero de caja invalido. Solo se permite 1 a 8.', 'err');
                return;
            }
            if (!boxName) {
                setMessage('Debes indicar un nombre para la caja.', 'err');
                return;
            }
            if (!branchId || !branchesById.has(branchId)) {
                setMessage('Debes seleccionar una sucursal valida.', 'err');
                return;
            }

            setMessage('Guardando...', '');
            try {
                const response = await fetch(API_URL + 'api/cajas/upsert', {
                    method: 'POST',
                    headers: withAuthHeaders({
                        'Content-Type': 'application/json',
                    }),
                    body: JSON.stringify({
                        numero_caja: boxNumber,
                        nombre_caja: boxName,
                        sucursal_id: branchId,
                        estado: isEnabled ? 1 : 0,
                        fingerprint: String(localStorage.getItem('device_fp') || '').trim() || null,
                    }),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    setMessage(data.error || data.message || 'No se pudo guardar la caja.', 'err');
                    return;
                }

                await bindDeviceIfNeeded(boxNumber, boxName);
                selectedBoxNumber = boxNumber;
                if (isReactivation) {
                    setMessage('Caja reactivada correctamente.', 'ok');
                    if (currentBoxView === 'inactive') {
                        currentBoxView = 'enabled';
                    }
                } else {
                    setMessage('Caja guardada correctamente.', 'ok');
                }
                await loadBoxes();
            } catch (error) {
                setMessage('Error de conexion al guardar la caja.', 'err');
            }
        }

        async function deleteSelectedBox() {
            if (selectedBoxNumber === null) {
                setMessage('Selecciona una caja para eliminar.', 'err');
                return;
            }
            const confirmed = window.confirm(`¿Eliminar la Caja ${selectedBoxNumber}?`);
            if (!confirmed) return;

            setMessage('Inactivando caja...', '');
            try {
                const response = await fetch(API_URL + `api/cajas/${selectedBoxNumber}`, {
                    method: 'DELETE',
                    headers: withAuthHeaders(),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    setMessage(data.error || data.message || 'No se pudo eliminar la caja.', 'err');
                    return;
                }

                clearSelectionAndEditor();
                await loadBoxes();
                if (data.mode === 'already_inactive') {
                    setMessage('La caja ya estaba inactiva.', 'ok');
                } else {
                    setMessage('Caja inactivada correctamente.', 'ok');
                }
            } catch (_) {
                setMessage('Error de conexion al eliminar la caja.', 'err');
            }
        }

        document.addEventListener('DOMContentLoaded', async () => {
            applyPopupTheme();
            buildBoxNumberOptions();
            setEditorVisible(false);
            refreshFormButtonsState();
            updateEditorEmptyText();
            updateViewToggleButtons();

            document.getElementById('box-number')?.addEventListener('change', (e) => {
                selectedBoxNumber = Number(e.target.value || 1);
                fillFormFromSelection();
                setEditorVisible(true);
                renderGrid();
            });
            document.getElementById('box-view-enabled-btn')?.addEventListener('click', () => {
                setCurrentBoxView('enabled');
            });
            document.getElementById('box-view-inactive-btn')?.addEventListener('click', () => {
                setCurrentBoxView('inactive');
            });
            document.getElementById('box-name')?.addEventListener('input', refreshFormButtonsState);
            document.getElementById('box-branch')?.addEventListener('change', refreshFormButtonsState);
            document.getElementById('box-enabled')?.addEventListener('change', refreshFormButtonsState);
            document.getElementById('box-assign-local')?.addEventListener('change', refreshFormButtonsState);
            document.getElementById('box-admin-form')?.addEventListener('submit', submitBoxForm);
            document.getElementById('box-refresh-btn')?.addEventListener('click', loadBoxes);
            document.getElementById('box-delete-btn')?.addEventListener('click', deleteSelectedBox);
            document.getElementById('box-cancel-btn')?.addEventListener('click', () => {
                clearSelectionAndEditor();
                setMessage('');
            });

            await loadBranches();
            await loadBoxes();
        });
    </script>
</body>
</html>

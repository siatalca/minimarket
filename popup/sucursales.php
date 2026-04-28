<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Administrar sucursales</title>
    <link rel="stylesheet" href="../css/root.css">
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <script src="../js/functions.js"></script>
    <style>
        body { padding: 0; background: var(--clr-bg-light); }
        .content {
            max-width: 100%;
            width: 100%;
            min-height: 100vh;
            margin: 0;
            border: none;
            border-radius: 0;
            padding: 14px 16px;
            box-sizing: border-box;
            background: var(--clr-bg-light);
        }
        .branch-shell { max-width: 1100px; margin: 0 auto; }
        .branch-panel {
            border: 1px solid #dbe3ef;
            border-radius: 12px;
            overflow: hidden;
            background: #fff;
            box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
        }
        .branch-title {
            margin: 0;
            padding: 14px 16px;
            font-size: 1.08rem;
            font-weight: 700;
            border-bottom: 1px solid #dbe3ef;
            background: linear-gradient(90deg, #ecfeff 0%, #f0f9ff 100%);
        }
        .branch-body { padding: 10px; }
        .branch-summary { margin: 0 0 10px; font-size: 0.9rem; color: #334155; }
        .branch-layout { display: grid; grid-template-columns: 1.35fr 1fr; gap: 12px; }
        .branch-card {
            border: 1px solid var(--popup-border-light);
            border-radius: 10px;
            background: #fff;
            padding: 14px;
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
        }
        .branch-toolbar { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
        .branch-list { display: grid; gap: 8px; }
        .branch-item {
            border: 1px solid var(--popup-border-light);
            border-radius: 10px;
            padding: 10px;
            background: #f8fbff;
            cursor: pointer;
        }
        .branch-item.selected { border-color: #0ea5e9; box-shadow: 0 0 0 2px rgba(14, 165, 233, .18); background: #eef9ff; }
        .branch-item-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .branch-item-name { font-weight: 700; font-size: 0.92rem; color: #0f172a; }
        .branch-item-code { font-size: 0.76rem; color: #334155; }
        .branch-item-meta { margin-top: 6px; font-size: 0.78rem; color: #475569; }
        .branch-pill {
            display: inline-block;
            border: 1px solid #93c5fd;
            background: #eff6ff;
            color: #1d4ed8;
            border-radius: 999px;
            padding: 2px 8px;
            font-weight: 700;
            font-size: 0.72rem;
        }
        .branch-pill.off { border-color: #fecaca; background: #fef2f2; color: #b91c1c; }
        .branch-form { display: grid; gap: 10px; }
        .branch-form label { font-size: 0.85rem; font-weight: 700; color: var(--popup-text-light); }
        .branch-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .branch-msg { min-height: 18px; font-size: 0.83rem; }
        .branch-msg.ok { color: #166534; }
        .branch-msg.err { color: #b91c1c; }
        body.dark .content { background: var(--clr-bg-dark); }
        body.dark .branch-panel { background: #111c2f; border-color: var(--popup-border-dark); box-shadow: none; }
        body.dark .branch-card { background: #111c2f; border-color: var(--popup-border-dark); box-shadow: none; }
        body.dark .branch-item { background: #0f1a2c; border-color: #2b3f5c; }
        body.dark .branch-item.selected { background: #13253a; }
        body.dark .branch-item-name { color: #e2e8f0; }
        body.dark .branch-item-code, body.dark .branch-item-meta, body.dark .branch-summary { color: #c1d0e6; }
        @media (max-width: 900px) { .branch-layout { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <div class="content">
    <div class="branch-shell">
        <section class="branch-panel">
        <h2 class="branch-title">Administrar Sucursales</h2>
        <div class="branch-body">
        <p id="branch-summary" class="branch-summary">Cargando sucursales...</p>
        <div class="branch-layout">
            <div class="branch-card">
                <div class="branch-toolbar">
                    <button type="button" class="btn" id="branch-new-btn">Nueva sucursal</button>
                    <button type="button" class="btn" id="branch-refresh-btn">Recargar</button>
                </div>
                <div id="branch-list" class="branch-list"></div>
            </div>
            <div class="branch-card">
                <form id="branch-form" class="branch-form">
                    <div>
                        <label for="branch-code">Codigo</label>
                        <input type="text" id="branch-code" maxlength="16" placeholder="Ej. CENTRO_1">
                    </div>
                    <div>
                        <label for="branch-name">Nombre</label>
                        <input type="text" id="branch-name" maxlength="120" placeholder="Ej. Sucursal Centro" required>
                    </div>
                    <div>
                        <label for="branch-address">Direccion</label>
                        <input type="text" id="branch-address" maxlength="255" placeholder="Ej. Av. Principal 123">
                    </div>
                    <div>
                        <label>
                            <input type="checkbox" id="branch-active" checked>
                            Sucursal activa
                        </label>
                    </div>
                    <div class="branch-actions">
                        <button type="submit" class="btn" id="branch-save-btn">Guardar</button>
                        <button type="button" class="btn" id="branch-delete-btn">Eliminar</button>
                        <button type="button" class="btn" id="branch-cancel-btn">Cancelar</button>
                    </div>
                    <p id="branch-msg" class="branch-msg"></p>
                </form>
            </div>
        </div>
        </div>
        </section>
    </div>
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

        let selectedBranchId = null;
        let branches = [];
        let limits = { max_sucursales: 3, creator_contact: 'SIA' };

        function applyPopupTheme() {
            const saved = localStorage.getItem('theme');
            document.body.classList.toggle('dark', saved === 'dark');
        }

        function withAuthHeaders(headers = {}) {
            const token = sessionStorage.getItem('token') || localStorage.getItem('token');
            return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
        }

        function setMessage(text, type = '') {
            const el = document.getElementById('branch-msg');
            if (!el) return;
            el.textContent = text || '';
            el.className = `branch-msg ${type}`.trim();
        }

        function getFormData() {
            return {
                codigo: String(document.getElementById('branch-code')?.value || '').trim(),
                nombre: String(document.getElementById('branch-name')?.value || '').trim(),
                direccion: String(document.getElementById('branch-address')?.value || '').trim(),
                activa: document.getElementById('branch-active')?.checked ? 1 : 0,
            };
        }

        function setFormData(data = {}) {
            document.getElementById('branch-code').value = data.codigo || '';
            document.getElementById('branch-name').value = data.nombre || '';
            document.getElementById('branch-address').value = data.direccion || '';
            document.getElementById('branch-active').checked = Number(data.activa || 0) === 1;
        }

        function clearForm() {
            selectedBranchId = null;
            setFormData({ codigo: '', nombre: '', direccion: '', activa: 1 });
            setMessage('');
            document.getElementById('branch-name')?.focus();
        }

        function renderSummary() {
            const active = branches.filter((b) => Number(b.activa || 0) === 1).length;
            const summary = document.getElementById('branch-summary');
            if (summary) {
                summary.textContent = `Sucursales activas: ${active} de ${limits.max_sucursales}. Si necesita mas, contacte a ${limits.creator_contact}.`;
            }
        }

        function renderList() {
            const list = document.getElementById('branch-list');
            if (!list) return;
            list.innerHTML = '';
            if (!branches.length) {
                list.innerHTML = '<div class="branch-item">No hay sucursales registradas.</div>';
                return;
            }

            branches.forEach((branch) => {
                const id = Number(branch.id_sucursal || 0);
                const item = document.createElement('button');
                item.type = 'button';
                item.className = `branch-item${selectedBranchId === id ? ' selected' : ''}`;
                item.innerHTML = `
                    <div class="branch-item-head">
                        <div>
                            <div class="branch-item-name">${branch.nombre || ''}</div>
                            <div class="branch-item-code">Codigo: ${branch.codigo || ''}</div>
                        </div>
                        <span class="branch-pill ${Number(branch.activa || 0) === 1 ? '' : 'off'}">${Number(branch.activa || 0) === 1 ? 'Activa' : 'Inactiva'}</span>
                    </div>
                    <div class="branch-item-meta">Direccion: ${branch.direccion || 'Sin direccion'} | Cajas: ${Number(branch.cajas_total || 0)}</div>
                `;
                item.addEventListener('click', () => {
                    selectedBranchId = id;
                    setFormData(branch);
                    setMessage('');
                    renderList();
                });
                list.appendChild(item);
            });
        }

        async function loadLimits() {
            try {
                const response = await fetch(API_URL + 'api/sucursales/limits', { headers: withAuthHeaders() });
                const data = await response.json().catch(() => ({}));
                if (response.ok) {
                    limits.max_sucursales = Number(data.max_sucursales || 3);
                    limits.creator_contact = String(data.creator_contact || 'SIA');
                }
            } catch (_) {}
        }

        async function loadBranches() {
            setMessage('');
            try {
                const response = await fetch(API_URL + 'api/sucursales', { headers: withAuthHeaders() });
                const data = await response.json().catch(() => []);
                if (!response.ok || !Array.isArray(data)) {
                    setMessage('No se pudieron cargar sucursales.', 'err');
                    return;
                }
                branches = data;
                if (selectedBranchId !== null && !branches.some((b) => Number(b.id_sucursal) === selectedBranchId)) {
                    selectedBranchId = null;
                }
                renderSummary();
                renderList();
                if (selectedBranchId !== null) {
                    const selected = branches.find((b) => Number(b.id_sucursal) === selectedBranchId);
                    if (selected) setFormData(selected);
                }
            } catch (error) {
                setMessage('Error de conexion al cargar sucursales.', 'err');
            }
        }

        async function saveBranch(event) {
            event.preventDefault();
            const payload = getFormData();
            if (!payload.nombre) {
                setMessage('Debes ingresar el nombre de la sucursal.', 'err');
                return;
            }

            setMessage('Guardando...', '');
            try {
                const endpoint = selectedBranchId
                    ? `${API_URL}api/sucursales/${selectedBranchId}`
                    : `${API_URL}api/sucursales`;
                const method = selectedBranchId ? 'PUT' : 'POST';
                const response = await fetch(endpoint, {
                    method,
                    headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(payload),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    setMessage(data.message || data.error || 'No se pudo guardar la sucursal.', 'err');
                    return;
                }
                setMessage('Sucursal guardada correctamente.', 'ok');
                await loadBranches();
                if (!selectedBranchId) {
                    clearForm();
                }
            } catch (_) {
                setMessage('Error de conexion al guardar.', 'err');
            }
        }

        async function deleteBranch() {
            if (!selectedBranchId) {
                setMessage('Selecciona una sucursal para eliminar.', 'err');
                return;
            }
            const branch = branches.find((b) => Number(b.id_sucursal) === Number(selectedBranchId));
            const branchName = branch?.nombre || `ID ${selectedBranchId}`;
            const confirmed = window.confirm(`¿Eliminar la sucursal "${branchName}"?`);
            if (!confirmed) return;

            setMessage('Eliminando sucursal...', '');
            try {
                const response = await fetch(`${API_URL}api/sucursales/${selectedBranchId}`, {
                    method: 'DELETE',
                    headers: withAuthHeaders(),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    setMessage(data.message || data.error || 'No se pudo eliminar la sucursal.', 'err');
                    return;
                }
                clearForm();
                await loadBranches();
                setMessage('Sucursal eliminada correctamente.', 'ok');
            } catch (_) {
                setMessage('Error de conexion al eliminar sucursal.', 'err');
            }
        }

        document.addEventListener('DOMContentLoaded', async () => {
            applyPopupTheme();
            document.getElementById('branch-form')?.addEventListener('submit', saveBranch);
            document.getElementById('branch-new-btn')?.addEventListener('click', clearForm);
            document.getElementById('branch-delete-btn')?.addEventListener('click', deleteBranch);
            document.getElementById('branch-cancel-btn')?.addEventListener('click', clearForm);
            document.getElementById('branch-refresh-btn')?.addEventListener('click', loadBranches);
            await loadLimits();
            await loadBranches();
            if (!branches.length) clearForm();
        });
    </script>
</body>
</html>

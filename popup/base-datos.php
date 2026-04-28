<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Base de datos</title>
    <link rel="stylesheet" href="../css/root.css">
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <style>
        body {
            margin: 0;
            background: #f4f7fb;
            color: #1f2937;
        }

        .db-shell {
            max-width: 980px;
            margin: 12px auto;
            padding: 0 12px 12px;
        }

        .db-panel {
            border: 1px solid #dbe3ef;
            border-radius: 12px;
            overflow: hidden;
            background: #fff;
            box-shadow: 0 12px 26px rgba(15, 23, 42, 0.07);
        }

        .db-header {
            margin: 0;
            padding: 14px 16px;
            font-size: 1.08rem;
            font-weight: 700;
            background: linear-gradient(90deg, #ecfeff 0%, #f0f9ff 100%);
            border-bottom: 1px solid #dbe3ef;
        }

        .db-body {
            padding: 12px;
            display: grid;
            gap: 12px;
        }

        .db-card {
            border: 1px solid #dbe3ef;
            border-radius: 10px;
            background: #fff;
            padding: 12px;
        }

        .db-card-title {
            margin: 0 0 8px 0;
            font-size: 0.98rem;
            font-weight: 700;
            color: #0f172a;
        }

        .db-note {
            margin: 0 0 8px 0;
            font-size: 0.9rem;
            color: #334155;
            line-height: 1.45;
        }

        .db-note:last-child {
            margin-bottom: 0;
        }

        .db-actions {
            margin-top: 10px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .db-btn {
            min-height: 34px;
            padding: 0 12px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            background: #fff;
            color: #0f172a;
            font-weight: 600;
            cursor: pointer;
        }

        .db-btn.primary {
            border-color: #0284c7;
            background: #0ea5e9;
            color: #fff;
        }

        .db-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }

        @media (max-width: 860px) {
            .db-grid {
                grid-template-columns: 1fr;
            }
        }

        .db-modal {
            position: fixed;
            inset: 0;
            background: rgba(2, 6, 23, 0.55);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 14px;
        }

        .db-modal.open {
            display: flex;
        }

        .db-modal-card {
            width: min(760px, 94vw);
            background: #fff;
            border: 1px solid #dbe3ef;
            border-radius: 12px;
            box-shadow: 0 18px 36px rgba(15, 23, 42, 0.22);
            overflow: hidden;
        }

        .db-modal-head {
            margin: 0;
            padding: 12px 14px;
            background: #eef6ff;
            border-bottom: 1px solid #dbe3ef;
            font-size: 0.98rem;
        }

        .db-modal-body {
            padding: 12px 14px;
            font-size: 0.9rem;
            color: #334155;
            line-height: 1.45;
        }

        .db-modal-body ul {
            margin: 8px 0 0 18px;
            padding: 0;
        }

        .db-modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            padding: 0 14px 14px;
        }

        .db-preview {
            width: 100%;
            min-height: 320px;
            max-height: 56vh;
            overflow: auto;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            background: #f8fafc;
            color: #0f172a;
            box-sizing: border-box;
            padding: 10px;
            font-family: Consolas, "Courier New", monospace;
            font-size: 0.8rem;
            white-space: pre-wrap;
            margin-top: 8px;
        }
    </style>
</head>
<body>
    <div class="db-shell">
        <section class="db-panel">
            <h2 class="db-header">Base de datos</h2>

            <div class="db-body">
                <article class="db-card">
                    <h3 class="db-card-title">Exportar base de datos</h3>
                    <p class="db-note">
                        Si cuentas con otro negocio con este punto de venta, esta opcion permite exportar la base de datos
                        para reutilizar productos de la base actual.
                    </p>
                    <p class="db-note">
                        Nota: se exportara la base de datos con productos de inventario ilimitado, mismos departamentos y
                        solo el usuario administrador. No se transfieren cantidades de inventario, cajeros adicionales,
                        clientes ni ventas.
                    </p>
                    <div class="db-actions">
                        <button id="db-export-btn" class="db-btn primary" type="button" onclick="exportDatabase()">Exportar la base de datos</button>
                    </div>
                </article>

                <article class="db-card">
                    <h3 class="db-card-title">Soporte de base de datos</h3>
                    <p class="db-note">Solo distribuidores y usuarios avanzados.</p>

                    <div class="db-grid">
                        <button id="db-verify-btn" class="db-btn" type="button" onclick="verifyDatabase()">Verificar base de datos</button>
                        <button id="db-maintenance-btn" class="db-btn" type="button" onclick="readMaintenanceFile()">Leer archivo de mantenimiento</button>
                        <button id="db-restart-btn" class="db-btn" type="button" onclick="restartBackend()">Reiniciar backend</button>
                        <button id="db-diagnostics-btn" class="db-btn" type="button" onclick="sendDiagnosticsFile()">Enviar archivos de diagnosticos</button>
                    </div>
                    <p id="db-status" class="db-note" style="margin-top:10px; color:#475569;"></p>
                </article>
            </div>
        </section>
    </div>

    <div id="db-maintenance-modal" class="db-modal" aria-hidden="true">
        <div class="db-modal-card">
            <h4 class="db-modal-head">Vista previa - Archivo de mantenimiento</h4>
            <div class="db-modal-body">
                <p class="db-note">Puedes revisar el contenido antes de imprimir o descargar.</p>
                <pre id="db-maintenance-preview" class="db-preview"></pre>
            </div>
            <div class="db-modal-actions">
                <button class="db-btn" type="button" onclick="closeMaintenancePreview()">Cerrar</button>
                <button class="db-btn" type="button" onclick="printMaintenancePreview()">Imprimir</button>
                <button class="db-btn primary" type="button" onclick="downloadMaintenancePreview()">Descargar</button>
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

        function authHeaders(extra = {}) {
            const token = sessionStorage.getItem('token') || localStorage.getItem('token');
            const base = token ? { Authorization: `Bearer ${token}` } : {};
            return { ...base, ...extra };
        }

        function setDbStatus(message = '', isError = false) {
            const status = document.getElementById('db-status');
            if (!status) return;
            status.textContent = message;
            status.style.color = isError ? '#b91c1c' : '#475569';
        }

        async function fetchJsonWithRetry(url, options = {}, retries = 4, delayMs = 700) {
            let lastError = null;
            for (let i = 0; i <= retries; i += 1) {
                try {
                    const response = await fetch(url, options);
                    const data = await response.json().catch(() => ({}));
                    return { response, data };
                } catch (error) {
                    lastError = error;
                    if (i < retries) {
                        await new Promise((resolve) => setTimeout(resolve, delayMs));
                    }
                }
            }
            throw lastError || new Error('No se pudo conectar con el backend');
        }

        async function waitBackendReady(maxAttempts = 15, intervalMs = 1000) {
            for (let i = 0; i < maxAttempts; i += 1) {
                try {
                    const response = await fetch(API_URL + 'api/getInfo');
                    if (response.ok) {
                        return true;
                    }
                } catch (_) {}
                await new Promise((resolve) => setTimeout(resolve, intervalMs));
            }
            return false;
        }

        async function exportDatabase() {
            const exportBtn = document.getElementById('db-export-btn');
            if (exportBtn) exportBtn.disabled = true;
            setDbStatus('Generando archivo de respaldo...');
            try {
                const response = await fetch(API_URL + 'api/database/export', {
                    headers: authHeaders(),
                });
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.message || 'No se pudo exportar la base de datos');
                }
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                const contentDisposition = response.headers.get('content-disposition') || '';
                const match = contentDisposition.match(/filename=\"?([^"]+)\"?/i);
                link.href = url;
                link.download = match?.[1] || `minimarket_export_${Date.now()}.sql`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
                setDbStatus('Exportacion completada.');
            } catch (error) {
                console.error('Error exportando base de datos:', error);
                setDbStatus(error.message || 'No se pudo exportar la base de datos.', true);
            } finally {
                if (exportBtn) exportBtn.disabled = false;
            }
        }

        async function verifyDatabase() {
            const verifyBtn = document.getElementById('db-verify-btn');
            if (verifyBtn) verifyBtn.disabled = true;
            setDbStatus('Verificando base de datos...');
            try {
                const response = await fetch(API_URL + 'api/database/verify', {
                    headers: authHeaders(),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data.message || 'No se pudo verificar la base de datos');
                }
                if (data.ok) {
                    const counters = data.counters || {};
                    setDbStatus(
                        `Verificacion OK. Tablas: ${data.total_tables}. Usuarios: ${counters.usuarios || 0}, Productos: ${counters.productos || 0}, Ventas: ${counters.ventas || 0}.`
                    );
                } else {
                    const missing = Array.isArray(data.missing_tables) ? data.missing_tables.join(', ') : '';
                    setDbStatus(`Verificacion con alertas. Faltan tablas: ${missing || 'desconocido'}.`, true);
                }
            } catch (error) {
                const msg = String(error?.message || '');
                if (msg.toLowerCase().includes('failed to fetch')) {
                    setDbStatus('Backend no disponible (conexion rechazada). Usa "Reiniciar backend" y espera a que vuelva.', true);
                } else {
                    setDbStatus(msg || 'No se pudo verificar la base de datos.', true);
                }
            } finally {
                if (verifyBtn) verifyBtn.disabled = false;
            }
        }

        async function restartBackend() {
            const restartBtn = document.getElementById('db-restart-btn');
            if (restartBtn) restartBtn.disabled = true;
            setDbStatus('Reiniciando backend...');
            try {
                const { response, data } = await fetchJsonWithRetry(
                    API_URL + 'api/system/restart-backend',
                    {
                        method: 'POST',
                        headers: authHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify({ restart: true }),
                    },
                    2,
                    500
                );
                if (!response.ok) {
                    throw new Error(data.message || 'No se pudo reiniciar el backend');
                }
                setDbStatus(data.message || 'Backend reiniciandose. Esperando disponibilidad...');
                const ready = await waitBackendReady(35, 800);
                if (ready) {
                    setDbStatus('Backend reiniciado y operativo.');
                } else {
                    setDbStatus('El backend aun no responde. Intenta nuevamente en unos segundos.', true);
                }
            } catch (error) {
                console.error('Error reiniciando backend:', error);
                setDbStatus(error.message || 'No se pudo reiniciar el backend.', true);
            } finally {
                if (restartBtn) restartBtn.disabled = false;
            }
        }

        async function readMaintenanceFile() {
            const btn = document.getElementById('db-maintenance-btn');
            if (btn) btn.disabled = true;
            setDbStatus('Generando vista previa de mantenimiento...');
            try {
                const response = await fetch(API_URL + 'api/database/maintenance-preview', {
                    headers: authHeaders(),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'No se pudo generar la vista previa de mantenimiento');
                }
                const preview = document.getElementById('db-maintenance-preview');
                if (preview) {
                    preview.textContent = String(data.content || '');
                }
                openMaintenancePreview();
                setDbStatus('Vista previa cargada.');
            } catch (error) {
                console.error('Error leyendo archivo de mantenimiento:', error);
                setDbStatus(error.message || 'No se pudo leer el archivo de mantenimiento.', true);
            } finally {
                if (btn) btn.disabled = false;
            }
        }

        async function sendDiagnosticsFile() {
            const btn = document.getElementById('db-diagnostics-btn');
            if (btn) btn.disabled = true;
            setDbStatus('Enviando diagnostico a siatalca@gmail.com...');
            try {
                const response = await fetch(API_URL + 'api/database/send-diagnostics', {
                    method: 'POST',
                    headers: authHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ send_now: true }),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data.message || 'No se pudo enviar el diagnostico');
                }
                setDbStatus(data.message || 'Diagnostico enviado correctamente.');
            } catch (error) {
                console.error('Error enviando diagnostico:', error);
                setDbStatus(error.message || 'No se pudo enviar el diagnostico.', true);
            } finally {
                if (btn) btn.disabled = false;
            }
        }

        function openMaintenancePreview() {
            const modal = document.getElementById('db-maintenance-modal');
            if (!modal) return;
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
        }

        function closeMaintenancePreview() {
            const modal = document.getElementById('db-maintenance-modal');
            if (!modal) return;
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
        }

        function printMaintenancePreview() {
            const preview = document.getElementById('db-maintenance-preview');
            const content = String(preview?.textContent || '').trim();
            if (!content) {
                setDbStatus('No hay contenido para imprimir.', true);
                return;
            }
            const win = window.open('', '_blank', 'width=900,height=700');
            if (!win) {
                setDbStatus('No se pudo abrir la vista de impresion.', true);
                return;
            }
            win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Mantenimiento</title></head><body><pre style="white-space:pre-wrap;font-family:Consolas,monospace;font-size:12px;">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`);
            win.document.close();
            win.focus();
            win.print();
        }

        function downloadMaintenancePreview() {
            const preview = document.getElementById('db-maintenance-preview');
            const content = String(preview?.textContent || '').trim();
            if (!content) {
                setDbStatus('No hay contenido para descargar.', true);
                return;
            }
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `mantenimiento_${Date.now()}.txt`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            setDbStatus('Archivo de mantenimiento descargado.');
        }
    </script>
</body>
</html>

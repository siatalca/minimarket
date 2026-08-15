const BACKUP_API_URL = (() => {
    const override = window.localStorage.getItem('api_url');
    if (override) return override.endsWith('/') ? override : `${override}/`;
    if (window.location.port === '3002') return `${window.location.origin}/`;
    const local = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    return `${local ? 'http:' : window.location.protocol}//${window.location.hostname}:3002/`;
})();

function backupHeaders(json = false) {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (json) headers['Content-Type'] = 'application/json';
    return headers;
}

async function backupRequest(path, options = {}) {
    const response = await fetch(BACKUP_API_URL + path, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudo completar la operacion');
    return data;
}

function formatBackupDate(value) {
    if (!value) return 'Aun no registrado';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('es-CL');
}

function showBackupStatus(data) {
    const box = document.getElementById('backup-status');
    if (!box) return;
    const runner = data.runner_enabled ? 'Activo en este equipo' : 'Deshabilitado en este equipo';
    const labels = { pending: 'Pendiente', running: 'En ejecucion', success: 'Correcto', error: 'Error' };
    box.textContent = [
        `Ejecutor: ${runner}`,
        `Estado ultimo intento: ${labels[data.last_status] || data.last_status || 'Pendiente'}`,
        `Ultimo respaldo correcto: ${formatBackupDate(data.last_success_at)}`,
        `Proximo respaldo: ${data.enabled ? formatBackupDate(data.next_run_at) : 'Deshabilitado'}`,
        `Base sincronizada: ${data.last_database_name || 'Aun no registrada'}`,
        data.last_error ? `Detalle del error: ${data.last_error}` : '',
    ].filter(Boolean).join('\n');
}

async function loadBackupSettings() {
    const data = await backupRequest('api/admin/automatic-backup-settings', { headers: backupHeaders() });
    document.getElementById('backup-enabled').checked = Boolean(Number(data.enabled));
    document.getElementById('backup-interval').value = Number(data.interval_days || 15);
    document.getElementById('backup-destination').value = data.destination_host ? `${data.destination_host}:${data.destination_port}` : 'Pendiente en server/.env';
    document.getElementById('backup-run').disabled = !data.runner_enabled || data.in_progress;
    showBackupStatus(data);
}

document.addEventListener('DOMContentLoaded', async () => {
    try { await loadBackupSettings(); } catch (error) { document.getElementById('backup-status').textContent = error.message; }

    document.getElementById('backup-save')?.addEventListener('click', async () => {
        const button = document.getElementById('backup-save');
        button.disabled = true;
        try {
            await backupRequest('api/admin/automatic-backup-settings', {
                method: 'PUT', headers: backupHeaders(true),
                body: JSON.stringify({ enabled: document.getElementById('backup-enabled').checked, interval_days: Number(document.getElementById('backup-interval').value || 15) }),
            });
            await loadBackupSettings();
        } catch (error) { document.getElementById('backup-status').textContent = error.message; }
        finally { button.disabled = false; }
    });

    document.getElementById('backup-run')?.addEventListener('click', async () => {
        const button = document.getElementById('backup-run');
        if (!confirm('Se creara ahora una copia completa en el servidor remoto. ¿Continuar?')) return;
        button.disabled = true;
        document.getElementById('backup-status').textContent = 'Respaldo en ejecucion. No cierres el backend...';
        try {
            const data = await backupRequest('api/admin/automatic-backups/run', { method: 'POST', headers: backupHeaders(true), body: '{}' });
            await loadBackupSettings();
            alert(`Respaldo completado: ${data.database_name}`);
        } catch (error) { document.getElementById('backup-status').textContent = error.message; }
        finally { button.disabled = false; }
    });
});
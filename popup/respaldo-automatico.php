<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Respaldo automatico</title>
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <script src="../js/functions.js?v=20260411a"></script>
    <style>
        .backup-shell{max-width:760px;margin:0 auto}.backup-card{background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:18px}.backup-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.backup-row label{display:block;font-weight:700;margin-bottom:6px}.backup-row input{width:100%;box-sizing:border-box;padding:9px;border:1px solid #94a3b8;border-radius:7px}.backup-status{margin-top:16px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:9px;padding:12px;white-space:pre-wrap;line-height:1.5}.backup-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px;flex-wrap:wrap}.backup-actions button{padding:9px 14px;border-radius:7px;border:1px solid #1d4ed8;font-weight:700;cursor:pointer}.backup-save{background:#2563eb;color:#fff}.backup-run{background:#15803d!important;border-color:#166534!important;color:#fff}.backup-note{color:#475569;line-height:1.5}.backup-warning{background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:10px;margin-bottom:14px}body.dark .backup-card,body.dark .backup-status{background:#111827;border-color:#374151;color:#e5e7eb}body.dark .backup-note{color:#cbd5e1}@media(max-width:650px){.backup-grid{grid-template-columns:1fr}}
    </style>
</head>
<body>
<h2 class="h2-ext">RESPALDO AUTOMATICO</h2>
<div class="sub"><div class="content backup-shell"><section class="backup-card">
    <div class="backup-warning"><strong>Acceso exclusivo de admin_sia.</strong> La clave de MariaDB permanece en el archivo local server/.env y nunca se muestra aqui.</div>
    <p class="backup-note">El servidor principal actualiza siempre la misma base remota. Antes de reemplazarla crea una copia temporal, la valida y la elimina cuando el proceso termina correctamente.</p>
    <label style="display:flex;gap:8px;align-items:center;margin:14px 0"><input id="backup-enabled" type="checkbox" style="width:auto"> Habilitar respaldo programado</label>
    <div class="backup-grid">
        <div class="backup-row"><label for="backup-interval">Frecuencia (dias)</label><input id="backup-interval" type="number" min="1" max="365" value="15"></div>
        <div class="backup-row"><label>Servidor de destino</label><input id="backup-destination" type="text" readonly></div>
    </div>
    <div id="backup-status" class="backup-status">Cargando configuracion...</div>
    <div class="backup-actions">
        <button id="backup-save" class="backup-save" type="button">Guardar configuracion</button>
        <button id="backup-run" class="backup-run" type="button">Respaldar ahora</button>
    </div>
</section></div></div>
<script src="../js/automatic_backup_settings.js?v=20260814a"></script>
</body>
</html>

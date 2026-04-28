<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cajon dinero</title>
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <script src="../js/functions.js?v=20260411a"></script>
    <style>
        .drawer-shell { max-width: 920px; margin: 0 auto; }
        .drawer-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 14px; align-items: start; }
        .drawer-card { border:1px solid #d1d5db; border-radius:10px; background:#fff; padding:14px; }
        .drawer-card h3 { margin:0 0 8px; font-size:1rem; }
        .drawer-help { margin:0 0 10px; font-size:.93rem; color:#4b5563; line-height:1.35; }
        .drawer-row { margin-bottom: 10px; }
        .drawer-row label { display:block; margin-bottom:5px; font-weight:600; }
        .drawer-inline { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .drawer-shell input[type="text"],
        .drawer-shell input[type="number"],
        .drawer-shell select {
            width:100%; border:1px solid #8a8a8a; background:#fff; border-radius:6px; padding:8px 10px; box-sizing:border-box;
        }
        .drawer-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:12px; flex-wrap:wrap; }
        .drawer-shell .btn { font-weight:700; padding:10px 14px; min-width:170px; }
        body.dark .drawer-card { background:#111827; border-color:#374151; }
        body.dark .drawer-help { color:#cbd5e1; }
        body.dark .drawer-card h3 { color:#f3f4f6; }
        @media (max-width: 860px) { .drawer-grid { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <h2 class="h2-ext">CAJON / GAVETA DE DINERO</h2>
    <div class="sub">
        <div class="content drawer-shell">
            <div class="drawer-grid">
                <section class="drawer-card">
                    <h3>Configuracion del cajon</h3>
                    <p class="drawer-help">Define por donde se envia el pulso de apertura y cuando habilitar apertura automatica.</p>

                    <div class="drawer-row drawer-inline">
                        <label><input id="drawer-enabled" type="checkbox"> Habilitar uso de cajon de dinero</label>
                    </div>

                    <div class="drawer-row">
                        <label for="drawer-connection">Tipo de conexion</label>
                        <select id="drawer-connection">
                            <option value="printer_usb">Por impresora (USB/Red)</option>
                            <option value="serial">Puerto serial (COM)</option>
                            <option value="lpt">Puerto paralelo (LPT)</option>
                        </select>
                    </div>

                    <div id="drawer-printer-group" class="drawer-row">
                        <label for="drawer-printer-name">Impresora asociada</label>
                        <select id="drawer-printer-name"><option value="">Selecciona impresora...</option></select>
                    </div>

                    <div id="drawer-serial-group" class="drawer-row hidden">
                        <label for="drawer-serial-port">Puerto serial</label>
                        <select id="drawer-serial-port"><option value="">Sin puerto disponible</option></select>
                    </div>

                    <div id="drawer-lpt-group" class="drawer-row hidden">
                        <label for="drawer-lpt-port">Puerto LPT</label>
                        <select id="drawer-lpt-port">
                            <option value="LPT1">LPT1</option>
                            <option value="LPT2">LPT2</option>
                            <option value="LPT3">LPT3</option>
                        </select>
                    </div>

                    <div class="drawer-row">
                        <label for="drawer-pulse-ms">Duracion pulso de apertura (ms)</label>
                        <input id="drawer-pulse-ms" type="number" min="50" max="500" step="10" value="120">
                    </div>

                    <div class="drawer-row drawer-inline">
                        <label><input id="drawer-open-on-cash" type="checkbox"> Abrir automaticamente en pago efectivo</label>
                        <label><input id="drawer-open-on-mixed" type="checkbox"> Abrir automaticamente en pago mixto con efectivo</label>
                    </div>
                </section>

                <section class="drawer-card">
                    <h3>Pruebas y acciones</h3>
                    <p class="drawer-help">Prueba apertura real del cajon con la configuracion actual.</p>
                    <p id="drawer-test-result" class="drawer-help" style="min-height:22px;">Sin prueba.</p>
                    <div class="drawer-actions">
                        <button id="drawer-refresh-devices-btn" type="button" class="btn" style="background:#0f766e; color:#fff; border:1px solid #115e59;">Recargar dispositivos</button>
                        <button id="drawer-open-test-btn" type="button" class="btn" style="background:#b45309; color:#fff; border:1px solid #92400e;">Probar apertura</button>
                        <button id="save-drawer-settings-btn" type="button" class="btn" style="background:#1f8f4f; color:#fff; border:1px solid #14663a;">Guardar configuracion</button>
                    </div>
                </section>
            </div>
        </div>
    </div>

    <script src="../js/cash_drawer_settings.js?v=20260222o"></script>
</body>
</html>

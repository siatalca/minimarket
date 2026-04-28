<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lector codigo</title>
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <script src="../js/functions.js?v=20260411a"></script>
    <style>
        .scanner-shell { max-width: 920px; margin: 0 auto; }
        .scanner-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 14px; align-items: start; }
        .scanner-card { border:1px solid #d1d5db; border-radius:10px; background:#fff; padding:14px; }
        .scanner-card h3 { margin:0 0 8px; font-size:1rem; }
        .scanner-help { margin:0 0 10px; font-size:.93rem; color:#4b5563; line-height:1.35; }
        .scanner-row { margin-bottom: 10px; }
        .scanner-row label { display:block; margin-bottom:5px; font-weight:600; }
        .scanner-inline { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .scanner-shell input[type="text"],
        .scanner-shell input[type="number"],
        .scanner-shell select {
            width:100%; border:1px solid #8a8a8a; background:#fff; border-radius:6px; padding:8px 10px; box-sizing:border-box;
        }
        .scanner-test-box {
            border: 1px dashed #9ca3af; border-radius:8px; padding:10px; background:#f8fafc;
        }
        .scanner-test-box input { margin-top:6px; }
        .scanner-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:12px; flex-wrap:wrap; }
        .scanner-upcoming-badge {
            display:inline-block; font-size:.72rem; font-weight:700; letter-spacing:.2px;
            padding:2px 8px; border-radius:999px; background:#ffedd5; color:#9a3412; border:1px solid #fdba74;
            margin-left:6px; vertical-align:middle;
        }
        .scanner-shell .btn { font-weight:700; padding:10px 14px; min-width:170px; }
        body.dark .scanner-card { background:#111827; border-color:#374151; }
        body.dark .scanner-help { color:#cbd5e1; }
        body.dark .scanner-card h3 { color:#f3f4f6; }
        body.dark .scanner-test-box { background:#1f2937; border-color:#475569; }
        body.dark .scanner-upcoming-badge { background:#3f1d0f; color:#fdba74; border-color:#7c2d12; }
        @media (max-width: 860px) { .scanner-grid { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <h2 class="h2-ext">LECTOR DE CODIGO DE BARRAS</h2>
    <div class="sub">
        <div class="content scanner-shell">
            <div class="scanner-grid">
                <section class="scanner-card">
                    <h3>Configuracion del lector</h3>
                    <p class="scanner-help">Configura lector tipo teclado o serial, y como interpretar el codigo al escanear.</p>

                    <div class="scanner-row">
                        <label for="scanner-mode">Tipo de lector</label>
                        <select id="scanner-mode">
                            <option value="keyboard">Teclado (USB / Bluetooth HID)</option>
                            <option value="serial">Serial (RS232)</option>
                        </select>
                    </div>

                    <div id="scanner-serial-settings" class="hidden">
                        <div class="scanner-row">
                            <label for="scanner-serial-port">Puerto serial</label>
                            <select id="scanner-serial-port"><option value="">Sin puerto disponible</option></select>
                        </div>
                        <div class="scanner-inline">
                            <div style="flex:1 1 140px; min-width:120px;">
                                <label for="scanner-baud-rate">Baud rate</label>
                                <select id="scanner-baud-rate">
                                    <option value="9600">9600</option>
                                    <option value="19200">19200</option>
                                    <option value="38400">38400</option>
                                    <option value="57600">57600</option>
                                    <option value="115200">115200</option>
                                </select>
                            </div>
                            <div style="flex:1 1 120px; min-width:100px;">
                                <label for="scanner-data-bits">Data bits</label>
                                <select id="scanner-data-bits">
                                    <option value="8">8</option>
                                    <option value="7">7</option>
                                    <option value="6">6</option>
                                    <option value="5">5</option>
                                </select>
                            </div>
                            <div style="flex:1 1 120px; min-width:100px;">
                                <label for="scanner-parity">Paridad</label>
                                <select id="scanner-parity">
                                    <option value="none">None</option>
                                    <option value="even">Even</option>
                                    <option value="odd">Odd</option>
                                </select>
                            </div>
                        </div>
                        <div class="scanner-inline">
                            <div style="flex:1 1 120px; min-width:100px;">
                                <label for="scanner-stop-bits">Stop bits</label>
                                <select id="scanner-stop-bits">
                                    <option value="1">1</option>
                                    <option value="1.5">1.5</option>
                                    <option value="2">2</option>
                                </select>
                            </div>
                            <div style="flex:1 1 180px; min-width:140px;">
                                <label for="scanner-flow-control">Flow control</label>
                                <select id="scanner-flow-control">
                                    <option value="none">None</option>
                                    <option value="xonxoff">XON/XOFF</option>
                                    <option value="rtscts">RTS/CTS</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="scanner-row">
                        <label for="scanner-suffix">Tecla final del escaneo</label>
                        <select id="scanner-suffix">
                            <option value="enter">Enter</option>
                            <option value="tab">Tab</option>
                            <option value="none">Ninguna</option>
                        </select>
                    </div>

                    <div class="scanner-row">
                        <label for="scanner-prefix-strip">Prefijo fijo a eliminar (opcional)</label>
                        <input id="scanner-prefix-strip" type="text" maxlength="16" placeholder="Ejemplo: ]C1">
                    </div>

                    <div class="scanner-row scanner-inline">
                        <label><input id="scanner-prefix-trim" type="checkbox"> Limpiar espacios al inicio/fin</label>
                        <label><input id="scanner-only-numeric" type="checkbox"> Aceptar solo numeros</label>
                    </div>
                    <div class="scanner-row scanner-inline">
                        <label><input id="scanner-auto-focus" type="checkbox"> Autoenfocar campo codigo en ventas</label>
                        <label><input id="scanner-beep-on-scan" type="checkbox"> Sonido al escanear</label>
                    </div>
                </section>

                <section class="scanner-card">
                    <h3>Prueba rapida</h3>
                    <p class="scanner-help">Escanea aqui para validar lectura. Si finaliza con Enter, se detecta automaticamente.</p>
                    <div class="scanner-test-box">
                        <label for="scanner-test-input">Campo de prueba</label>
                        <input id="scanner-test-input" type="text" autocomplete="off" placeholder="Escanea un codigo aqui">
                    </div>
                    <p id="scanner-test-result" class="scanner-help" style="margin-top:10px; min-height:22px;">Sin prueba.</p>
                    <div class="scanner-actions">
                        <button id="scanner-refresh-ports-btn" type="button" class="btn" style="background:#0f766e; color:#fff; border:1px solid #115e59; min-width:170px;">Recargar puertos</button>
                        <button id="save-scanner-settings-btn" type="button" class="btn" style="background:#1f8f4f; color:#fff; border:1px solid #14663a;">Guardar configuracion</button>
                    </div>
                </section>

                <section class="scanner-card" style="grid-column: 1 / -1;">
                    <h3>
                        Camara movil para escaneo
                        <span class="scanner-upcoming-badge">PROXIMAMENTE</span>
                    </h3>
                    <p class="scanner-help">Se prepara configuracion y permisos de camara. Esta opcion aun no altera el flujo actual de ventas ni el lector tradicional.</p>

                    <div class="scanner-inline" style="margin-bottom:10px;">
                        <label><input id="camera-mobile-enabled" type="checkbox"> Habilitar escaneo por camara en modo movil (preparacion)</label>
                    </div>

                    <div class="scanner-inline">
                        <div style="flex:1 1 220px; min-width:200px;">
                            <label for="camera-preferred-facing">Camara preferida</label>
                            <select id="camera-preferred-facing">
                                <option value="environment">Trasera (recomendada)</option>
                                <option value="user">Frontal</option>
                                <option value="auto">Automatica</option>
                            </select>
                        </div>
                        <div style="flex:1 1 220px; min-width:200px;">
                            <label for="camera-scan-trigger">Disparo de lectura</label>
                            <select id="camera-scan-trigger">
                                <option value="auto">Automatico</option>
                                <option value="manual">Manual (boton)</option>
                            </select>
                        </div>
                    </div>

                    <p id="camera-capability-status" class="scanner-help" style="margin-top:10px; min-height:20px;">Detectando soporte de camara...</p>
                    <p id="camera-permission-status" class="scanner-help" style="min-height:20px;">Permiso de camara: pendiente.</p>

                    <div class="scanner-actions">
                        <button id="camera-check-permission-btn" type="button" class="btn" style="background:#334155; color:#fff; border:1px solid #1e293b;">Revisar permiso</button>
                        <button id="camera-request-permission-btn" type="button" class="btn" style="background:#0f766e; color:#fff; border:1px solid #115e59;">Solicitar permiso</button>
                        <button id="camera-save-plan-btn" type="button" class="btn" style="background:#1f8f4f; color:#fff; border:1px solid #14663a;">Guardar preparacion</button>
                    </div>
                </section>
            </div>
        </div>
    </div>

    <script src="../js/scanner_settings.js?v=20260222p"></script>
</body>
</html>

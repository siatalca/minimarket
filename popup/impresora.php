<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Impresora</title>
    <link rel="stylesheet" href="../css/popUpStyle.css?v=20260219c">
    <style>
        .printer-shell {
            max-width: 760px;
            margin: 0 auto;
        }
        .printer-card {
            border: 1px solid #d6e0ef;
            background: #fff;
            border-radius: 12px;
            padding: 14px;
            box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
        }
        .printer-row {
            margin-top: 14px;
            display: grid;
            gap: 6px;
        }
        .printer-row label {
            font-weight: 700;
        }
        .printer-two {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        .printer-note {
            margin: 0;
            color: #475569;
            font-size: 0.88rem;
        }
        body.dark .printer-card {
            background: #111c2f;
            border-color: #263952;
            box-shadow: none;
        }
        body.dark .printer-note {
            color: #c1d0e6;
        }
        @media (max-width: 720px) {
            .printer-two {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <h2 class="h2-ext">IMPRESORA (ACTUALIZADA)</h2>
    <div class="sub">
        <div class="content printer-shell">
            <form id="printer-settings-form">
                <div class="printer-card">
                    <p class="printer-note">Configura la impresora de tickets y opciones de salida compatibles con este sistema.</p>
                    <p class="printer-note">Si ejecutas <code>iniciar_servicios_ocultos.bat</code> en el equipo cliente se listaran sus impresoras locales y se iniciara el backend. Si no, se imprimira por navegador usando la impresora predeterminada de ese equipo.</p>
                    <p class="printer-note">Para evitar el dialogo de impresion en modo navegador, abre Chrome de la caja con <code>--kiosk-printing</code>.</p>
                    <div class="printer-row">
                        <label for="ticket-printer-select">Impresora instalada:</label>
                        <div style="display:flex; gap:8px; flex-wrap:wrap;">
                            <select id="ticket-printer-select" style="min-width:320px; flex:1;"></select>
                            <button id="reload-printers-btn" type="button" class="btn">Actualizar lista</button>
                        </div>
                    </div>

                    <div class="printer-two">
                        <div class="printer-row">
                            <label for="printer-paper-width">Ancho de papel:</label>
                            <select id="printer-paper-width">
                                <option value="58">58 mm</option>
                                <option value="80">80 mm</option>
                            </select>
                        </div>
                        <div class="printer-row">
                            <label for="printer-engine">Motor de impresion:</label>
                            <select id="printer-engine">
                                <option value="auto">Auto (recomendado)</option>
                                <option value="gdi">GDI directo</option>
                                <option value="out_printer">Out-Printer</option>
                            </select>
                        </div>
                    </div>

                    <div class="printer-two">
                        <div class="printer-row">
                            <label for="printer-columns">Columnas del ticket:</label>
                            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                                <input id="printer-columns" type="number" style="width: 120px; text-align:center;" min="28" max="64" value="30">
                                <button id="apply-printer-default-btn" type="button" class="btn" style="padding:8px 12px;">Default</button>
                            </div>
                            <p id="printer-columns-hint" class="printer-note"></p>
                        </div>
                        <div class="printer-row">
                            <label for="printer-feed-lines">Lineas de avance al final:</label>
                            <input id="printer-feed-lines" type="number" style="width: 120px; text-align:center;" min="0" max="8" value="2">
                            <p class="printer-note">Ayuda a separar tickets y evitar cortes visuales.</p>
                        </div>
                    </div>

                    <div style="display:flex; gap:10px; align-items:center; margin-top:14px; flex-wrap:wrap;">
                        <button id="save-printer-btn" type="submit" class="btn" style="background:#16a34a;color:#fff;font-weight:700;">Guardar configuracion y cerrar</button>
                    </div>
                </div>
            </form>
        </div>
    </div>

    <script src="../js/ticket_settings.js?v=20260413a"></script>
</body>
</html>




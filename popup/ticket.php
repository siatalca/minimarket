<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket</title>
    <link rel="stylesheet" href="../css/root.css">
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <style>
        .ticket-preview-stage {
            background: #f8fbff;
            border: 1px solid #d6e0ef;
            border-radius: 12px;
            padding: 12px;
            min-height: 460px;
            overflow: auto;
        }

        .ticket-paper {
            margin: 0 auto;
            background: #fff;
            border: 1px solid #d4d4d8;
            border-radius: 4px;
            box-shadow: 0 8px 18px rgba(0, 0, 0, 0.14);
            width: 260px;
            max-width: 100%;
            padding: 10px 0;
        }

        .ticket-printable-area {
            margin: 0 auto;
            border: 1px dashed #94a3b8;
            background: repeating-linear-gradient(
                to bottom,
                #ffffff 0px,
                #ffffff 17px,
                #f8fafc 18px
            );
            overflow: hidden;
        }

        .ticket-paper pre {
            margin: 0;
            padding: 12px;
            white-space: pre;
            overflow-y: auto;
            overflow-x: hidden;
            background: transparent;
            border: none;
            border-radius: 0;
            min-height: 420px;
            font-family: Consolas, "Courier New", monospace;
            font-size: 12px;
            line-height: 1.18;
            width: 100%;
            box-sizing: border-box;
        }

        .ticket-preview-meta {
            margin: 8px 0 0 0;
            font-size: 0.86rem;
            color: #334155;
        }

        .ticket-font-global {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
            margin-top: 10px;
            padding: 10px;
            border: 1px solid #d6e0ef;
            border-radius: 10px;
            background: #f8fafc;
        }

        .ticket-font-global input[type="number"] {
            width: 120px;
            text-align: center;
            border: 1px solid #8a8a8a;
            background: #fff;
            padding: 6px 4px;
        }
    </style>
</head>
<body>
    <div class="popup-shell">
        <section class="popup-panel">
            <h2 class="popup-header">TICKET / COMPROBANTE</h2>
            <div class="popup-body">
                <div class="popup-card popup-main-card">
            <div style="display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap;">
                <div style="flex:1 1 420px; min-width:320px;">
                    <h3 style="margin: 0 0 8px 0;">Vista previa del ticket</h3>
                    <p style="margin: 0 0 10px 0; font-size: 0.92rem;">
                        Esta previsualizacion usa la informacion proporcionada al inicio de la configuracion del sistema.
                    </p>
                    <div class="ticket-preview-stage">
                        <div id="ticket-paper" class="ticket-paper">
                            <div id="ticket-printable-area" class="ticket-printable-area">
                                <pre id="ticket-preview"></pre>
                            </div>
                        </div>
                    </div>
                    <p id="ticket-preview-meta" class="ticket-preview-meta"></p>
                </div>

                <div style="flex:1 1 420px; min-width:320px;">
                    <form id="ticket-settings-form">
                        <p>Titulo del comprobante:</p>
                        <input id="ticket-header" type="text" style="width: 100%; border:1px solid #8a8a8a; background:#fff;" maxlength="120" placeholder="COMPROBANTE DE VENTA">

                        <p>Pie del comprobante:</p>
                        <input id="ticket-footer" type="text" style="width: 100%; border:1px solid #8a8a8a; background:#fff;" maxlength="255" placeholder="Gracias por su compra">

                        <p>Columnas del ticket (28-64, en 58mm usa ancho maximo del papel):</p>
                        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                            <input id="ticket-columns" type="number" style="width: 120px; text-align:center; border:1px solid #8a8a8a; background:#fff;" min="28" max="64" value="30">
                            <button id="apply-ticket-default-btn" type="button" class="btn" style="padding:8px 12px;">Default</button>
                        </div>
                        <div class="ticket-font-global">
                            <label for="ticket-font-global-input">Ajuste global de letra</label>
                            <button id="ticket-font-minus-btn" type="button" class="btn" style="padding:0 10px; width:auto; min-width:36px;">-</button>
                            <button id="ticket-font-plus-btn" type="button" class="btn" style="padding:0 10px; width:auto; min-width:36px;">+</button>
                            <input id="ticket-font-global-input" type="number" min="-8" max="8" step="0.1" value="0">
                            <span style="font-size:0.86rem;">px (ej: +2)</span>
                        </div>
                        <p style="margin:6px 0 0 0; font-size:0.86rem; color:#475569;">Aumenta o reduce todo el ticket manteniendo proporciones, sin salir del area imprimible.</p>

                        <br><br>
                        <label><input id="ticket-show-business" type="checkbox" checked> Mostrar datos del negocio</label><br>
                        <label><input id="ticket-show-ticket-number" type="checkbox" checked> Mostrar numero de ticket</label><br>
                        <label><input id="ticket-show-cashier" type="checkbox" checked> Mostrar cajero</label><br>
                        <label><input id="ticket-show-box" type="checkbox" checked> Mostrar caja</label><br>
                        <label><input id="ticket-show-payment" type="checkbox" checked> Mostrar metodo de pago</label><br>
                        <label><input id="ticket-include-details" type="checkbox" checked> Incluir detalle de productos por defecto</label><br>

                        <br>
                        <div style="display:flex; gap:10px; align-items:center; margin-top: 10px; flex-wrap:wrap;">
                            <button id="print-ticket-test-btn" type="button" class="btn" style="background:#0f766e; color:#fff; border:1px solid #115e59; font-weight:700; min-width:170px; padding:10px 14px;">Imprimir prueba</button>
                            <button id="save-ticket-and-close-btn" type="submit" class="btn" style="background:#1f8f4f; color:#ffffff; border:1px solid #14663a; font-weight:700; min-width:170px; padding:10px 14px;">Guardar cambios</button>
                        </div>
                    </form>
                </div>
            </div>
                </div>
            </div>
        </section>
    </div>

    <script src="../js/ticket_settings.js?v=20260413a"></script>
</body>
</html>



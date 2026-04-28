<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Corte</title>
    <link rel="stylesheet" href="../css/root.css">
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <script src="../js/functions.js?v=20260411a"></script>
    <style>
        html, body {
            height: 100%;
            overflow: hidden;
        }

        body {
            display: flex;
            flex-direction: column;
        }

        .cut-shell {
            flex: 1;
            min-height: 0;
            overflow: hidden;
        }

        .cut-content {
            height: 100%;
            display: flex;
            flex-direction: column;
            padding: 14px;
            box-sizing: border-box;
        }

        .cut-help {
            margin: 0 0 10px 0;
            color: #374151;
            font-size: 0.94rem;
            line-height: 1.35;
        }

        .cut-form {
            flex: 1;
            min-height: 0;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            align-items: stretch;
        }

        .cut-option {
            display: block;
            border: 1px solid #d6e0ef;
            border-radius: 12px;
            padding: 10px;
            background: #f8fbff;
            cursor: pointer;
            min-height: 0;
        }

        .cut-option-inner {
            display: flex;
            gap: 8px;
            align-items: flex-start;
            height: 100%;
        }

        .cut-option input[type="radio"] {
            margin-top: 2px;
        }

        .cut-option strong {
            display: block;
            margin-bottom: 4px;
            line-height: 1.25;
        }

        .cut-option p {
            margin: 0;
            color: #4b5563;
            line-height: 1.3;
            font-size: 0.9rem;
        }

        .cut-icon {
            display: block;
            width: 82px;
            max-width: 100%;
            margin-top: 8px;
            border-radius: 8px;
        }

        .cut-actions {
            display: flex;
            justify-content: flex-end;
            margin-top: 10px;
        }

        .cut-actions .btn {
            min-width: 150px;
            font-weight: 700;
            padding: 10px 14px;
        }

        body.dark .cut-option {
            background: #111827;
            border-color: #374151;
        }

        body.dark .cut-option strong {
            color: #f3f4f6;
        }

        body.dark .cut-option p {
            color: #cbd5e1;
        }

        @media (max-width: 820px) {
            html, body {
                overflow: auto;
            }

            .cut-form {
                grid-template-columns: 1fr;
            }

            .cut-content {
                height: auto;
            }
        }
    </style>
</head>
<body>
    <div class="popup-shell cut-shell" style="max-width: 1004px;">
        <section class="popup-panel">
            <h2 class="popup-header">CORTE</h2>
            <div class="popup-body">
                <div class="popup-card popup-main-card cut-content" style="max-width:none;">
            <p class="cut-help">Elige como se comporta el cierre de turno del cajero.</p>

            <form id="corte-settings-form" class="cut-form">
                <label class="cut-option">
                    <div class="cut-option-inner">
                        <input type="radio" name="corte" id="corte-ajuste-auto" value="ajuste_auto" checked>
                        <div>
                            <strong>Solicitar efectivo y ajustar diferencias</strong>
                            <p>Registra automaticamente la diferencia entre efectivo esperado y declarado al cerrar turno.</p>
                            <img src="../img/cajero-automatico.png" alt="Corte automatico" class="cut-icon">
                        </div>
                    </div>
                </label>

                <label class="cut-option">
                    <div class="cut-option-inner">
                        <input type="radio" name="corte" id="corte-sin-ajuste" value="sin_ajuste">
                        <div>
                            <strong>Cierre sin solicitud ni ajustes automaticos</strong>
                            <p>Cierra turno sin crear movimientos por diferencias de efectivo.</p>
                            <img src="../img/cajero-automatico.png" alt="Corte sin ajuste" class="cut-icon">
                        </div>
                    </div>
                </label>
            </form>

            <div class="cut-actions">
                <button id="save-cut-settings-btn" type="button" class="btn" style="background:#1f8f4f; color:#fff; border:1px solid #14663a;">Guardar</button>
            </div>
                </div>
            </div>
        </section>
    </div>
    <script src="../js/cut_settings.js?v=20260222m"></script>
</body>
</html>

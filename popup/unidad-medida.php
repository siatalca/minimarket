<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unidad de medida</title>
    <link rel="stylesheet" href="../css/root.css">
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <script src="../js/functions.js?v=20260411a"></script>
    <style>
        .unit-shell { max-width: 760px; margin: 0 auto; }
        .unit-card {
            border: 1px solid #d6e0ef;
            border-radius: 12px;
            padding: 12px;
            background: #ffffff;
        }
        .unit-help { margin: 0 0 12px; color: #4b5563; font-size: 0.95rem; }
        .unit-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 10px;
        }
        .unit-option {
            display: flex;
            gap: 8px;
            align-items: flex-start;
            border: 1px solid #d6e0ef;
            border-radius: 8px;
            padding: 10px;
            background: #f8fbff;
        }
        .unit-option strong { display: block; margin-bottom: 2px; }
        .unit-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            margin-top: 14px;
        }
        .unit-default {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }
        .unit-default select { min-width: 180px; }
        .unit-shell input[type="text"],
        .unit-shell input[type="number"],
        .unit-shell select {
            border: 1px solid #8a8a8a;
            background: #fff;
            border-radius: 6px;
            padding: 8px 10px;
            box-sizing: border-box;
        }
        .unit-shell .btn {
            font-weight: 700;
            padding: 10px 14px;
        }
        body.dark .unit-card { background: #111827; border-color: #374151; }
        body.dark .unit-help { color: #d1d5db; }
        body.dark .unit-option { background: #1f2937; border-color: #374151; color: #e5e7eb; }
    </style>
</head>
<body>
    <div class="popup-shell">
        <section class="popup-panel">
            <h2 class="popup-header">UNIDAD DE MEDIDA</h2>
            <div class="popup-body">
                <div class="popup-card popup-main-card unit-shell" style="max-width:none;">
            <p class="unit-help">Define que grupos de unidad estaran disponibles al registrar productos.</p>
            <form id="unit-settings-form">
                <section class="unit-card">
                    <div class="unit-grid">
                        <label class="unit-option"><input id="unit-time" type="checkbox"><span><strong>H / Min</strong>Servicios por tiempo</span></label>
                        <label class="unit-option"><input id="unit-weight" type="checkbox"><span><strong>KG / G</strong>Productos por peso</span></label>
                        <label class="unit-option"><input id="unit-volume" type="checkbox"><span><strong>L / ML</strong>Productos por volumen</span></label>
                        <label class="unit-option"><input id="unit-length" type="checkbox"><span><strong>M / CM</strong>Productos por longitud</span></label>
                        <label class="unit-option"><input id="unit-na" type="checkbox"><span><strong>NO APLICA</strong>Sin unidad definida</span></label>
                        <label class="unit-option"><input id="unit-piece" type="checkbox"><span><strong>PZA</strong>Unidad por pieza</span></label>
                    </div>

                    <div class="unit-actions">
                        <div class="unit-default">
                            <label for="unit-default">Unidad por defecto</label>
                            <select id="unit-default">
                                <option value="PZA">PZA</option>
                                <option value="NO_APLICA">NO APLICA</option>
                                <option value="KG_G">KG / G</option>
                                <option value="L_ML">L / ML</option>
                                <option value="M_CM">M / CM</option>
                                <option value="H_MIN">H / Min</option>
                            </select>
                        </div>
                        <button id="save-unit-settings-btn" type="submit" class="btn" style="background:#1f8f4f; color:#fff; border:1px solid #14663a; min-width:170px;">Guardar configuracion</button>
                    </div>
                </section>
            </form>
                </div>
            </div>
        </section>
    </div>

    <script src="../js/unit_settings.js?v=20260222k"></script>
</body>
</html>

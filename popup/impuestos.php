<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Impuestos</title>
    <link rel="stylesheet" href="../css/root.css">
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <script src="../js/functions.js?v=20260411a"></script>
    <style>
        .tax-shell { max-width: 760px; margin: 0 auto; }
        .tax-card {
            border: 1px solid #d6e0ef;
            border-radius: 12px;
            padding: 12px;
            background: #ffffff;
        }
        .tax-help { margin: 0 0 12px; color: #4b5563; font-size: 0.95rem; }
        .tax-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 12px;
        }
        .tax-field label { display: block; margin-bottom: 6px; font-weight: 600; }
        .tax-field input, .tax-field select { width: 100%; }
        .tax-toggle {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            margin-bottom: 12px;
        }
        .tax-actions { display: flex; justify-content: flex-end; margin-top: 14px; }
        .tax-shell input[type="text"],
        .tax-shell input[type="number"],
        .tax-shell select {
            border: 1px solid #8a8a8a;
            background: #fff;
            border-radius: 6px;
            padding: 8px 10px;
            box-sizing: border-box;
        }
        .tax-shell .btn {
            font-weight: 700;
            padding: 10px 14px;
        }
        body.dark .tax-card { background: #111827; border-color: #374151; }
        body.dark .tax-help { color: #d1d5db; }
        body.dark .tax-field label { color: #f3f4f6; }
    </style>
</head>
<body>
    <div class="popup-shell">
        <section class="popup-panel">
            <h2 class="popup-header">IMPUESTOS</h2>
            <div class="popup-body">
                <div class="popup-card popup-main-card tax-shell" style="max-width:none;">
            <p class="tax-help">Configura el impuesto general para ventas del sistema.</p>
            <form id="tax-settings-form">
                <section class="tax-card">
                    <label class="tax-toggle">
                        <input id="tax-enabled" type="checkbox">
                        <span>Mis productos manejan impuestos.</span>
                    </label>

                    <div class="tax-grid">
                        <div class="tax-field">
                            <label for="tax-name">Nombre impuesto</label>
                            <input id="tax-name" type="text" maxlength="32" value="IVA" placeholder="IVA">
                        </div>
                        <div class="tax-field">
                            <label for="tax-percent">Porcentaje (%)</label>
                            <input id="tax-percent" type="number" min="0" max="100" step="0.01" value="19">
                        </div>
                        <div class="tax-field">
                            <label for="prices-include-tax">Precios incluyen impuesto</label>
                            <select id="prices-include-tax">
                                <option value="1">Si</option>
                                <option value="0">No</option>
                            </select>
                        </div>
                    </div>
                </section>

                <div class="tax-actions">
                    <button id="save-tax-settings-btn" type="submit" class="btn" style="background:#1f8f4f; color:#fff; border:1px solid #14663a; min-width:170px;">Guardar configuracion</button>
                </div>
            </form>
                </div>
            </div>
        </section>
    </div>

    <script src="../js/tax_settings.js?v=20260222k"></script>
</body>
</html>

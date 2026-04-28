<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simbolo de moneda</title>
    <link rel="stylesheet" href="../css/root.css">
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <script src="../js/functions.js?v=20260411a"></script>
    <style>
        .money-shell { max-width: 760px; margin: 0 auto; }
        .money-card {
            border: 1px solid #d6e0ef;
            border-radius: 12px;
            padding: 12px;
            background: #ffffff;
        }
        .money-help { margin: 0 0 12px; color: #4b5563; font-size: 0.95rem; }
        .money-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 12px;
        }
        .money-field label { display: block; margin-bottom: 6px; font-weight: 600; }
        .money-field input, .money-field select { width: 100%; }
        .money-actions { display: flex; justify-content: flex-end; margin-top: 14px; }
        .money-shell input[type="text"],
        .money-shell input[type="number"],
        .money-shell select {
            border: 1px solid #8a8a8a;
            background: #fff;
            border-radius: 6px;
            padding: 8px 10px;
            box-sizing: border-box;
        }
        .money-shell .btn {
            font-weight: 700;
            padding: 10px 14px;
        }
        body.dark .money-card { background: #111827; border-color: #374151; }
        body.dark .money-help { color: #d1d5db; }
        body.dark .money-field label { color: #f3f4f6; }
    </style>
</head>
<body>
    <div class="popup-shell">
        <section class="popup-panel">
            <h2 class="popup-header">SIMBOLO MONEDA</h2>
            <div class="popup-body">
                <div class="popup-card popup-main-card money-shell" style="max-width:none;">
            <p class="money-help">Configura formato monetario para mostrar montos en el sistema.</p>
            <form id="currency-settings-form">
                <section class="money-card">
                    <div class="money-grid">
                        <div class="money-field">
                            <label for="currency-symbol">Simbolo de moneda</label>
                            <input id="currency-symbol" type="text" maxlength="4" value="$" placeholder="$">
                        </div>
                        <div class="money-field">
                            <label for="currency-code">Codigo moneda</label>
                            <input id="currency-code" type="text" maxlength="8" value="CLP" placeholder="CLP">
                        </div>
                        <div class="money-field">
                            <label for="thousands-separator">Separador de miles</label>
                            <input id="thousands-separator" type="text" maxlength="1" value="." placeholder=".">
                        </div>
                        <div class="money-field">
                            <label for="decimal-separator">Separador decimal</label>
                            <input id="decimal-separator" type="text" maxlength="1" value="," placeholder=",">
                        </div>
                        <div class="money-field">
                            <label for="currency-decimals">Decimales</label>
                            <select id="currency-decimals">
                                <option value="0">0</option>
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4">4</option>
                            </select>
                        </div>
                    </div>
                </section>

                <div class="money-actions">
                    <button id="save-currency-settings-btn" type="submit" class="btn" style="background:#1f8f4f; color:#fff; border:1px solid #14663a; min-width:170px;">Guardar configuracion</button>
                </div>
            </form>
                </div>
            </div>
        </section>
    </div>

    <script src="../js/currency_settings.js?v=20260222k"></script>
</body>
</html>

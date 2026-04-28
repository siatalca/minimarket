<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Forma de pago</title>
    <link rel="stylesheet" href="../css/root.css">
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <script src="../js/functions.js?v=20260411a"></script>
    <style>
        .settings-shell { max-width: 960px; margin: 0 auto; }
        .settings-grid { display: grid; gap: 12px; }
        .settings-card {
            border: 1px solid #d6e0ef;
            border-radius: 12px;
            padding: 12px;
            background: #ffffff;
        }
        .settings-card h3 {
            margin: 0 0 10px;
            font-size: 1rem;
        }
        .settings-line { display: flex; gap: 8px; align-items: flex-start; }
        .settings-inline { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .settings-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 14px;
        }
        .settings-help { margin: 0 0 10px; color: #4b5563; font-size: 0.95rem; }
        .settings-field { width: 220px; }
        .settings-field-small { width: 90px; }
        .settings-shell input[type="text"],
        .settings-shell input[type="number"],
        .settings-shell select {
            border: 1px solid #8a8a8a;
            background: #fff;
            border-radius: 6px;
            padding: 8px 10px;
            box-sizing: border-box;
        }
        .settings-shell .btn {
            font-weight: 700;
            padding: 10px 14px;
        }
        body.dark .settings-card { background: #111827; border-color: #374151; }
        body.dark .settings-help { color: #d1d5db; }
        body.dark .settings-card h3 { color: #f3f4f6; }
    </style>
</head>
<body>
    <div class="popup-shell">
        <section class="popup-panel">
            <h2 class="popup-header">FORMA DE PAGO</h2>
            <div class="popup-body">
                <div class="popup-card popup-main-card settings-shell" style="max-width:none;">
            <p class="settings-help">Define que metodos de cobro estaran disponibles en ventas.</p>
            <form id="payment-settings-form">
                <div class="settings-grid">
                    <section class="settings-card">
                        <h3>Efectivo</h3>
                        <label class="settings-line">
                            <input id="pay-cash-strict" type="checkbox">
                            <span>No permitir cobrar si el efectivo ingresado es menor que el total de la venta.</span>
                        </label>
                    </section>

                    <section class="settings-card">
                        <h3>Dolares americanos</h3>
                        <label class="settings-line" style="margin-bottom:8px;">
                            <input id="pay-usd-enabled" type="checkbox">
                            <span>Habilitar cobro en dolares.</span>
                        </label>
                        <label for="pay-usd-rate" style="display:block; margin-bottom:4px;">Tipo de cambio</label>
                        <input id="pay-usd-rate" class="settings-field" type="number" min="1" step="0.01" value="950">
                    </section>

                    <section class="settings-card">
                        <h3>Tarjeta credito/debito</h3>
                        <label class="settings-line" style="margin-bottom:8px;">
                            <input id="pay-card-enabled" type="checkbox">
                            <span>Habilitar cobro con tarjeta.</span>
                        </label>
                        <label class="settings-inline">
                            <input id="pay-card-fee-enabled" type="checkbox">
                            <span>Cobrar comision del</span>
                            <input id="pay-card-fee-percent" class="settings-field-small" type="number" min="0" max="100" step="0.01" value="0">
                            <span>%</span>
                        </label>
                    </section>

                    <section class="settings-card">
                        <h3>Otras formas</h3>
                        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px;">
                            <label class="settings-line"><input id="pay-transfer-enabled" type="checkbox"><span>Transferencia bancaria</span></label>
                            <label class="settings-line"><input id="pay-check-enabled" type="checkbox"><span>Cheque</span></label>
                            <label class="settings-line"><input id="pay-voucher-enabled" type="checkbox"><span>Vales promocionales</span></label>
                            <label class="settings-line"><input id="pay-mixed-enabled" type="checkbox"><span>Pago mixto</span></label>
                        </div>
                    </section>
                </div>

                <div class="settings-actions">
                    <button id="save-payment-settings-btn" type="submit" class="btn" style="background:#1f8f4f; color:#fff; border:1px solid #14663a; min-width:170px;">Guardar configuracion</button>
                </div>
            </form>
                </div>
            </div>
        </section>
    </div>

    <script src="../js/payment_settings.js?v=20260222k"></script>
</body>
</html>

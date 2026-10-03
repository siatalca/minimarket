<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Datos del negocio</title>
    <link rel="stylesheet" href="../css/root.css">
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <script src="../js/api_base.js?v=20261003a"></script>
    <script src="../js/functions.js?v=20261003c"></script>
    <style>
        .owner-shell { max-width: 820px; margin: 0 auto; }
        .owner-card {
            border: 1px solid #d6e0ef;
            border-radius: 12px;
            padding: 12px;
            background: #ffffff;
            margin-bottom: 14px;
        }
        .owner-card h3 { margin: 0 0 4px; font-size: 1.05rem; }
        .owner-help { margin: 0 0 12px; color: #4b5563; font-size: 0.95rem; }
        .owner-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 12px;
        }
        .owner-field label { display: block; margin-bottom: 6px; font-weight: 600; }
        .owner-field input { width: 100%; }
        .owner-field .req { color: #dc2626; }
        .owner-actions { display: flex; justify-content: flex-end; gap: 12px; align-items: center; margin-top: 4px; }
        .owner-status { font-weight: 600; color: #16a34a; }
        .owner-shell input[type="text"],
        .owner-shell input[type="email"],
        .owner-shell input[type="tel"] {
            border: 1px solid #8a8a8a;
            background: #fff;
            border-radius: 6px;
            padding: 8px 10px;
            box-sizing: border-box;
        }
        .owner-shell .btn { font-weight: 700; padding: 10px 14px; }
        body.dark .owner-card { background: #111827; border-color: #374151; }
        body.dark .owner-help { color: #d1d5db; }
        body.dark .owner-field label, body.dark .owner-card h3 { color: #f3f4f6; }
    </style>
</head>
<body>
    <div class="popup-shell">
        <section class="popup-panel">
            <h2 class="popup-header">DATOS DEL NEGOCIO</h2>
            <div class="popup-body">
                <div class="popup-card popup-main-card owner-shell" style="max-width:none;">
            <form id="business-owner-form" novalidate>
                <section class="owner-card">
                    <h3>Negocio</h3>
                    <p class="owner-help">Estos datos aparecen en el encabezado de los tickets.</p>
                    <div class="owner-grid">
                        <div class="owner-field">
                            <label for="biz-nombre">Nombre del local <span class="req">*</span></label>
                            <input id="biz-nombre" type="text" maxlength="255" required>
                        </div>
                        <div class="owner-field">
                            <label for="biz-tipo">Rubro <span class="req">*</span></label>
                            <input id="biz-tipo" type="text" maxlength="100" required>
                        </div>
                        <div class="owner-field">
                            <label for="biz-telefono">Teléfono <span class="req">*</span></label>
                            <input id="biz-telefono" type="tel" maxlength="20" required>
                        </div>
                        <div class="owner-field">
                            <label for="biz-mail">Correo <span class="req">*</span></label>
                            <input id="biz-mail" type="email" maxlength="255" required>
                        </div>
                        <div class="owner-field" style="grid-column: 1 / -1;">
                            <label for="biz-direccion">Dirección del local</label>
                            <input id="biz-direccion" type="text" maxlength="200">
                        </div>
                    </div>
                </section>

                <section class="owner-card">
                    <h3>Dueño del local</h3>
                    <p class="owner-help">Datos de contacto del dueño. Solo admin_sia puede verlos y modificarlos.</p>
                    <div class="owner-grid">
                        <div class="owner-field">
                            <label for="owner-nombre">Nombre completo</label>
                            <input id="owner-nombre" type="text" maxlength="120">
                        </div>
                        <div class="owner-field">
                            <label for="owner-rut">RUT</label>
                            <input id="owner-rut" type="text" maxlength="12" placeholder="12.345.678-9">
                        </div>
                        <div class="owner-field">
                            <label for="owner-telefono">Teléfono</label>
                            <input id="owner-telefono" type="tel" maxlength="20">
                        </div>
                        <div class="owner-field">
                            <label for="owner-mail">Correo</label>
                            <input id="owner-mail" type="email" maxlength="180">
                        </div>
                    </div>
                </section>

                <div class="owner-actions">
                    <span id="business-owner-status" class="owner-status" role="status"></span>
                    <button id="save-business-owner-btn" type="submit" class="btn" style="background:#1f8f4f; color:#fff; border:1px solid #14663a; min-width:170px;">Guardar cambios</button>
                </div>
            </form>
                </div>
            </div>
        </section>
    </div>

    <script src="../js/business_owner_settings.js?v=20261003a"></script>
</body>
</html>

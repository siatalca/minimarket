<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notificar por correo</title>
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <script src="../js/functions.js?v=20260411a"></script>
    <style>
        .mail-shell { max-width: 980px; margin: 0 auto; }
        .mail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }
        .mail-card { border: 1px solid #d1d5db; border-radius: 10px; padding: 14px; background: #fff; }
        .mail-card h3 { margin: 0 0 8px; font-size: 1rem; }
        .mail-help { margin: 0 0 10px; color: #4b5563; font-size: 0.94rem; line-height: 1.35; }
        .mail-row { margin-bottom: 9px; }
        .mail-row label { display: block; margin-bottom: 5px; font-weight: 600; }
        .mail-inline { display: flex; gap: 8px; flex-wrap: wrap; }
        .mail-inline > * { flex: 1 1 140px; min-width: 120px; }
        .mail-shell input[type="text"],
        .mail-shell input[type="number"],
        .mail-shell input[type="email"],
        .mail-shell input[type="password"],
        .mail-shell select,
        .mail-shell textarea {
            width: 100%;
            border: 1px solid #8a8a8a;
            border-radius: 6px;
            background: #fff;
            padding: 8px 10px;
            box-sizing: border-box;
        }
        .mail-shell textarea { min-height: 72px; resize: vertical; }
        .mail-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
        .mail-actions .btn { font-weight: 700; min-width: 170px; }
        .mail-actions .btn[disabled] { opacity: 0.65; cursor: not-allowed; }
        .mail-provider-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin: 8px 0 10px; }
        .mail-provider-btn {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            background: #f8fafc;
            padding: 8px 10px;
            text-align: left;
            cursor: pointer;
            font-size: 0.86rem;
            line-height: 1.2;
        }
        .mail-provider-btn.active {
            background: #dbeafe;
            border-color: #3b82f6;
            box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.25) inset;
        }
        .mail-advanced { margin-top: 10px; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
        .mail-result {
            margin-top: 10px;
            border: 1px dashed #94a3b8;
            border-radius: 8px;
            background: #f8fafc;
            min-height: 110px;
            padding: 10px;
            white-space: pre-wrap;
            font-family: Consolas, monospace;
            font-size: 12px;
            line-height: 1.35;
        }
        .mail-note { font-size: 0.82rem; color: #64748b; margin-top: 6px; }
        .mail-info-inline { display: inline-flex; align-items: center; gap: 6px; margin-left: 6px; vertical-align: middle; }
        .mail-info-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
            border-radius: 999px;
            border: 1px solid #60a5fa;
            background: #dbeafe;
            color: #1e3a8a;
            font-size: 11px;
            font-weight: 700;
            cursor: help;
            user-select: none;
        }
        .mail-info-link {
            font-size: 0.8rem;
            font-weight: 600;
            color: #1d4ed8;
            text-decoration: none;
        }
        .mail-info-link:hover { text-decoration: underline; }
        body.dark .mail-card { background: #111827; border-color: #374151; }
        body.dark .mail-help { color: #cbd5e1; }
        body.dark .mail-provider-btn { background: #1f2937; border-color: #475569; color: #e5e7eb; }
        body.dark .mail-provider-btn.active { background: #1e3a8a; border-color: #60a5fa; }
        body.dark .mail-result { background: #0f172a; border-color: #475569; color: #e2e8f0; }
        body.dark .mail-note { color: #94a3b8; }
        body.dark .mail-info-icon { background: #1e3a8a; border-color: #60a5fa; color: #dbeafe; }
        body.dark .mail-info-link { color: #93c5fd; }
        @media (max-width: 900px) { .mail-grid { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <h2 class="h2-ext">NOTIFICAR POR CORREO</h2>
    <div class="sub">
        <div class="content mail-shell">
            <div class="mail-grid">
                <section class="mail-card">
                    <h3>Paso 1: Configuracion rapida</h3>
                    <p class="mail-help">Elige proveedor, escribe correo y contrasena de aplicacion. El sistema completa SMTP automaticamente.</p>
                    <label class="mail-row" style="display:flex; gap:8px; align-items:flex-start;">
                        <input id="mail-enabled" type="checkbox" style="width:auto; margin-top:2px;">
                        <span>Habilitar notificaciones por correo</span>
                    </label>

                    <div class="mail-provider-grid">
                        <button type="button" class="mail-provider-btn" data-provider="gmail"><strong>Gmail</strong><br><small>Google Workspace tambien</small></button>
                        <button type="button" class="mail-provider-btn" data-provider="outlook"><strong>Outlook</strong><br><small>Hotmail / Office365</small></button>
                        <button type="button" class="mail-provider-btn" data-provider="yahoo"><strong>Yahoo</strong><br><small>SMTP oficial</small></button>
                        <button type="button" class="mail-provider-btn" data-provider="zoho"><strong>Zoho</strong><br><small>SMTP oficial</small></button>
                        <button type="button" class="mail-provider-btn" data-provider="custom"><strong>Otro</strong><br><small>Configuracion manual</small></button>
                    </div>
                    <input type="hidden" id="mail-provider" value="gmail">

                    <div class="mail-row">
                        <label for="mail-from-email">Correo que envia (sugerido desde datos del local, editable)</label>
                        <input id="mail-from-email" type="email" maxlength="180" placeholder="tu-correo@gmail.com">
                    </div>
                    <div class="mail-row">
                        <label for="mail-pass">
                            Contrasena de aplicacion
                            <span class="mail-info-inline">
                                <span class="mail-info-icon" title="Debes crear una clave de aplicacion de 16 caracteres. No es tu contrasena normal de inicio de sesion.">i</span>
                                <a class="mail-info-link" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" title="Abrir pagina oficial de Google para crear la clave de aplicacion">Crear clave</a>
                            </span>
                        </label>
                        <input id="mail-pass" type="password" maxlength="220" placeholder="No uses la contrasena principal">
                        <div class="mail-note" id="mail-provider-note">Para Gmail usa una contrasena de aplicacion de 16 caracteres.</div>
                    </div>
                    <div class="mail-row">
                        <label for="mail-from-name">Nombre visible del remitente (sugerido por usuario en sesion, editable)</label>
                        <input id="mail-from-name" type="text" maxlength="120" placeholder="Minimarket">
                    </div>

                    <details class="mail-advanced">
                        <summary><strong>Configuracion avanzada (opcional)</strong></summary>
                        <div style="margin-top:8px;">
                            <div class="mail-inline">
                                <div class="mail-row"><label for="mail-host">SMTP host</label><input id="mail-host" type="text" maxlength="120" placeholder="smtp.tudominio.cl"></div>
                                <div class="mail-row"><label for="mail-port">Puerto</label><input id="mail-port" type="number" min="1" max="65535" value="587"></div>
                            </div>
                            <div class="mail-inline">
                                <div class="mail-row">
                                    <label for="mail-secure">Cifrado</label>
                                    <select id="mail-secure">
                                        <option value="0">STARTTLS (587)</option>
                                        <option value="1">SSL/TLS directo (465)</option>
                                    </select>
                                </div>
                                <div class="mail-row"><label for="mail-user">Usuario SMTP</label><input id="mail-user" type="text" maxlength="180" placeholder="correo@dominio.cl"></div>
                            </div>
                        </div>
                    </details>
                </section>

                <section class="mail-card">
                    <h3>Paso 2: Destino y pruebas</h3>
                    <p class="mail-help">Define el correo del dueno y prueba envios antes de dejarlo activo.</p>
                    <div class="mail-row"><label for="mail-owner-email">Correo del dueno</label><input id="mail-owner-email" type="email" maxlength="180" placeholder="dueno@negocio.cl"></div>
                    <div class="mail-row"><label for="mail-cc-emails">Correos copia (opcional)</label><textarea id="mail-cc-emails" maxlength="500" placeholder="correo1@dominio.cl, correo2@dominio.cl"></textarea></div>
                    <div class="mail-row"><label for="mail-test-subject">Asunto prueba</label><input id="mail-test-subject" type="text" maxlength="180" value="Prueba de correo Minimarket"></div>
                    <div class="mail-row"><label for="mail-test-message">Mensaje prueba</label><textarea id="mail-test-message" maxlength="1200">Este es un correo de prueba del sistema Minimarket.</textarea></div>

                    <div class="mail-actions">
                        <button id="mail-edit-btn" type="button" class="btn" style="background:#1d4ed8; color:#fff; border:1px solid #1e40af;">Editar mail</button>
                        <button id="mail-cancel-edit-btn" type="button" class="btn" style="background:#64748b; color:#fff; border:1px solid #475569;">Cancelar edicion</button>
                        <button id="mail-save-btn" type="button" class="btn" style="background:#1f8f4f; color:#fff; border:1px solid #14663a;">Guardar configuracion</button>
                        <button id="mail-test-btn" type="button" class="btn" style="background:#0f766e; color:#fff; border:1px solid #115e59;">Probar envio al dueno</button>
                    </div>
                    <div id="mail-result" class="mail-result">Sin pruebas ejecutadas.</div>
                </section>
            </div>
        </div>
    </div>

    <script src="../js/email_notification_settings.js?v=20260222t"></script>
</body>
</html>

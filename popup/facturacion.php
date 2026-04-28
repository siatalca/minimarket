<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facturacion</title>
    <link rel="stylesheet" href="../css/root.css">
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <style>
        .dte-shell {
            max-width: 1120px;
            margin: 0 auto;
        }

        .dte-panel {
            border: 1px solid #dbe3ef;
            border-radius: 12px;
            overflow: hidden;
            background: #fff;
            box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
        }

        .dte-head {
            margin: 0;
            padding: 14px 16px;
            font-size: 1.08rem;
            font-weight: 700;
            border-bottom: 1px solid #dbe3ef;
            background: linear-gradient(90deg, #ecfeff 0%, #f0f9ff 100%);
        }

        .dte-body {
            padding: 10px;
        }

        .dte-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }

        .dte-card {
            border: 1px solid #d6e0ef;
            border-radius: 12px;
            background: #fff;
            padding: 12px;
        }

        .dte-card h3 {
            margin: 0 0 8px;
        }

        .dte-form {
            display: grid;
            gap: 8px;
        }

        .dte-form .row {
            display: grid;
            gap: 6px;
        }

        .dte-form .two {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }

        .label-help {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-weight: 700;
        }

        .info-icon {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 1px solid #7aa2d7;
            background: #edf5ff;
            color: #0f2f5f;
            font-size: 12px;
            font-weight: 800;
            line-height: 16px;
            text-align: center;
            cursor: help;
            user-select: none;
            display: inline-block;
        }

        .dte-note {
            font-size: 0.84rem;
            color: #475569;
            margin: 0;
        }

        .dte-msg {
            min-height: 18px;
            font-size: 0.84rem;
        }

        .dte-msg.ok { color: #166534; }
        .dte-msg.err { color: #b91c1c; }

        .dte-list {
            max-height: 220px;
            overflow: auto;
            border: 1px solid #d6e0ef;
            border-radius: 8px;
            margin-top: 8px;
        }

        .dte-list table {
            margin: 0;
            width: 100%;
        }

        .dte-list th,
        .dte-list td {
            font-size: 0.82rem;
            padding: 8px;
        }

        body.dark .dte-card {
            background: #111c2f;
            border-color: #263952;
        }

        body.dark .dte-note {
            color: #c1d0e6;
        }

        body.dark .info-icon {
            border-color: #4c6b96;
            background: #102238;
            color: #dbeafe;
        }

        body.dark .dte-list {
            border-color: #263952;
        }

        @media (max-width: 950px) {
            .dte-grid {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 650px) {
            .dte-form .two {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="dte-shell sub">
        <section class="dte-panel">
        <h2 class="dte-head">FACTURACION ELECTRONICA (PREPARACION)</h2>
        <div class="dte-body">
        <p class="dte-note">
            Este modulo prepara configuracion y borradores DTE. No reemplaza el flujo actual de venta/ticket.
        </p>

        <div class="dte-grid" style="margin-top:10px;">
            <div class="dte-card">
                <h3>Configuracion DTE</h3>
                <form id="dte-config-form" class="dte-form">
                    <div class="two">
                        <div class="row">
                            <label for="dte-ambiente" class="label-help">Ambiente <span class="info-icon" title="Certificacion para pruebas con SII. Produccion para operar en real.">i</span></label>
                            <select id="dte-ambiente">
                                <option value="certificacion">Certificacion</option>
                                <option value="produccion">Produccion</option>
                            </select>
                        </div>
                        <div class="row">
                            <label for="dte-activo" class="label-help">Activo <span class="info-icon" title="Define si la configuracion DTE queda habilitada para uso futuro.">i</span></label>
                            <select id="dte-activo">
                                <option value="0">No</option>
                                <option value="1">Si</option>
                            </select>
                        </div>
                    </div>
                    <div class="two">
                        <div class="row">
                            <label for="dte-emisor-rut" class="label-help">RUT emisor <span class="info-icon" title="RUT de la empresa emisora de DTE, con digito verificador.">i</span></label>
                            <input id="dte-emisor-rut" type="text" placeholder="76.123.456-7" maxlength="12">
                        </div>
                        <div class="row">
                            <label for="dte-punto-venta" class="label-help">Punto venta <span class="info-icon" title="Identificador interno de la caja/sucursal, por ejemplo POS-01.">i</span></label>
                            <input id="dte-punto-venta" type="text" placeholder="POS-01" maxlength="30">
                        </div>
                    </div>
                    <div class="row">
                        <label for="dte-emisor-razon" class="label-help">Razon social <span class="info-icon" title="Nombre legal de la empresa que emite la boleta/factura.">i</span></label>
                        <input id="dte-emisor-razon" type="text" maxlength="120">
                    </div>
                    <div class="row">
                        <label for="dte-emisor-giro" class="label-help">Giro <span class="info-icon" title="Actividad economica principal del emisor.">i</span></label>
                        <input id="dte-emisor-giro" type="text" maxlength="120">
                    </div>
                    <div class="row">
                        <label for="dte-emisor-direccion" class="label-help">Direccion <span class="info-icon" title="Direccion tributaria del emisor registrada para DTE.">i</span></label>
                        <input id="dte-emisor-direccion" type="text" maxlength="180">
                    </div>
                    <div class="two">
                        <div class="row">
                            <label for="dte-emisor-comuna" class="label-help">Comuna <span class="info-icon" title="Comuna tributaria del emisor.">i</span></label>
                            <input id="dte-emisor-comuna" type="text" maxlength="80">
                        </div>
                        <div class="row">
                            <label for="dte-emisor-ciudad" class="label-help">Ciudad <span class="info-icon" title="Ciudad tributaria del emisor.">i</span></label>
                            <input id="dte-emisor-ciudad" type="text" maxlength="80">
                        </div>
                    </div>
                    <div class="row">
                        <label for="dte-certificado" class="label-help">Alias certificado <span class="info-icon" title="Nombre interno para identificar el certificado digital de firma.">i</span></label>
                        <input id="dte-certificado" type="text" maxlength="120">
                    </div>
                    <div class="row">
                        <label for="dte-cert-file" class="label-help">Archivo certificado (.pfx/.p12) <span class="info-icon" title="Selecciona el certificado digital real para firma DTE.">i</span></label>
                        <input id="dte-cert-file" type="file" accept=".pfx,.p12,application/x-pkcs12">
                    </div>
                    <div class="row">
                        <label for="dte-cert-pass" class="label-help">Clave certificado <span class="info-icon" title="Clave del certificado digital para validar y preparar firma.">i</span></label>
                        <input id="dte-cert-pass" type="password" maxlength="120" placeholder="Clave del certificado">
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="btn" type="button" id="dte-cert-upload">Cargar certificado</button>
                        <button class="btn" type="button" id="dte-cert-verify">Validar clave</button>
                        <button class="btn" type="button" id="dte-cert-remove">Eliminar certificado</button>
                    </div>
                    <p id="dte-cert-msg" class="dte-msg"></p>
                    <p id="dte-cert-meta" class="dte-note"></p>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="btn" type="submit">Guardar configuracion</button>
                        <button class="btn" type="button" id="dte-config-reload">Recargar</button>
                        <button class="btn" type="button" id="dte-print-test-58">Imprimir prueba 58mm</button>
                    </div>
                    <p id="dte-config-msg" class="dte-msg"></p>
                </form>
            </div>

            <div class="dte-card">
                <h3>Borrador DTE desde venta</h3>
                <form id="dte-draft-form" class="dte-form">
                    <div class="two">
                        <div class="row">
                            <label for="dte-venta-id" class="label-help">ID venta <span class="info-icon" title="ID de la venta existente en el sistema para generar un borrador DTE.">i</span></label>
                            <input id="dte-venta-id" type="number" min="1" step="1" placeholder="Ej. 150">
                        </div>
                        <div class="row">
                            <label for="dte-tipo" class="label-help">Tipo DTE <span class="info-icon" title="39 Boleta, 33 Factura, 61 Nota de credito.">i</span></label>
                            <select id="dte-tipo">
                                <option value="39">39 - Boleta electronica</option>
                                <option value="33">33 - Factura electronica</option>
                                <option value="61">61 - Nota de credito</option>
                            </select>
                        </div>
                    </div>
                    <div class="row">
                        <label for="dte-rec-rut" class="label-help">RUT receptor (obligatorio para 33/61) <span class="info-icon" title="Para factura y nota de credito es obligatorio y debe ser RUT valido.">i</span></label>
                        <input id="dte-rec-rut" type="text" maxlength="12" placeholder="11.111.111-1">
                    </div>
                    <div class="row">
                        <label for="dte-rec-razon" class="label-help">Razon social receptor <span class="info-icon" title="Nombre legal del cliente receptor del documento.">i</span></label>
                        <input id="dte-rec-razon" type="text" maxlength="120">
                    </div>
                    <div class="two">
                        <div class="row">
                            <label for="dte-rec-giro" class="label-help">Giro receptor <span class="info-icon" title="Actividad economica del cliente receptor (opcional segun documento).">i</span></label>
                            <input id="dte-rec-giro" type="text" maxlength="120">
                        </div>
                        <div class="row">
                            <label for="dte-rec-email" class="label-help">Email receptor <span class="info-icon" title="Correo para eventual envio de representacion impresa/PDF del DTE.">i</span></label>
                            <input id="dte-rec-email" type="email" maxlength="180">
                        </div>
                    </div>
                    <div class="row">
                        <label for="dte-rec-direccion" class="label-help">Direccion receptor <span class="info-icon" title="Direccion tributaria del cliente receptor.">i</span></label>
                        <input id="dte-rec-direccion" type="text" maxlength="180">
                    </div>
                    <div class="two">
                        <div class="row">
                            <label for="dte-rec-comuna" class="label-help">Comuna receptor <span class="info-icon" title="Comuna asociada al domicilio del receptor.">i</span></label>
                            <input id="dte-rec-comuna" type="text" maxlength="80">
                        </div>
                        <div class="row">
                            <label for="dte-rec-ciudad" class="label-help">Ciudad receptor <span class="info-icon" title="Ciudad asociada al domicilio del receptor.">i</span></label>
                            <input id="dte-rec-ciudad" type="text" maxlength="80">
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="btn" type="submit">Crear borrador DTE</button>
                        <button class="btn" type="button" id="dte-drafts-reload">Listar borradores</button>
                    </div>
                    <p id="dte-draft-msg" class="dte-msg"></p>
                </form>

                <div class="dte-list">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Venta</th>
                                <th>Tipo</th>
                                <th>Estado</th>
                                <th>Folio ref</th>
                            </tr>
                        </thead>
                        <tbody id="dte-drafts-body">
                            <tr><td colspan="5" style="text-align:center;">Sin datos.</td></tr>
                        </tbody>
                    </table>
                </div>

                <div style="margin-top:10px; border-top:1px solid #d6e0ef; padding-top:10px;">
                    <h3 style="margin:0 0 8px;">Flujo envio DTE</h3>
                    <div class="dte-form">
                        <div class="row">
                            <label for="dte-flow-id" class="label-help">ID borrador DTE <span class="info-icon" title="ID del borrador para preparar XML, enviar y consultar track.">i</span></label>
                            <input id="dte-flow-id" type="number" min="1" step="1" placeholder="Ej. 25">
                        </div>
                        <div class="row">
                            <label for="dte-flow-status" class="label-help">Resultado track simulado <span class="info-icon" title="Para pruebas sin certificado: aceptado o rechazado.">i</span></label>
                            <select id="dte-flow-status">
                                <option value="aceptado">Aceptado</option>
                                <option value="rechazado">Rechazado</option>
                            </select>
                        </div>
                        <div style="display:flex; gap:8px; flex-wrap:wrap;">
                            <button class="btn" type="button" id="dte-flow-check">0) Verificar certificado + config</button>
                            <button class="btn" type="button" id="dte-flow-prepare">1) Preparar XML</button>
                            <button class="btn" type="button" id="dte-flow-submit">2) Enviar (simulado)</button>
                            <button class="btn" type="button" id="dte-flow-track">3) Consultar track</button>
                            <button class="btn" type="button" id="dte-flow-retry">4) Reintentar envio</button>
                            <button class="btn" type="button" id="dte-flow-auto">Auto 0->3</button>
                        </div>
                        <p id="dte-flow-msg" class="dte-msg"></p>
                        <p id="dte-flow-meta" class="dte-note"></p>
                    </div>
                </div>
            </div>
        </div>
        </div>
        </section>
    </div>

    <script src="../js/dte_client.js?v=20260222e"></script>
    <script src="../js/dte_setup.js?v=20260222e"></script>
</body>
</html>

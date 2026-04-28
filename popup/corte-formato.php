<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Formato Corte</title>
    <link rel="stylesheet" href="../css/root.css">
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <style>
        .cut-format-preview-stage {
            background: #f8fbff;
            border: 1px solid #d6e0ef;
            border-radius: 12px;
            padding: 12px;
            min-height: 460px;
            overflow: auto;
        }

        .cut-format-paper {
            margin: 0 auto;
            background: #fff;
            border: 1px solid #d4d4d8;
            border-radius: 4px;
            box-shadow: 0 8px 18px rgba(0, 0, 0, 0.14);
            width: 290px;
            max-width: 100%;
            padding: 10px 0;
        }

        .cut-format-printable-area {
            margin: 0 auto;
            border: 1px dashed #94a3b8;
            background: repeating-linear-gradient(
                to bottom,
                #ffffff 0px,
                #ffffff 17px,
                #f8fafc 18px
            );
            width: 98%;
            overflow: hidden;
        }

        .cut-format-preview-lines {
            margin: 0;
            padding: 12px;
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

        .cut-preview-line {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            min-height: 18px;
            white-space: nowrap;
            overflow: hidden;
        }

        .cut-preview-line.center {
            justify-content: center;
        }

        .cut-preview-left {
            flex: 1 1 auto;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .cut-preview-right {
            flex: 0 0 auto;
            white-space: nowrap;
            font-weight: 700;
        }

        .cut-preview-edit {
            display: inline-block;
            min-width: 4px;
            max-width: 100%;
            border-radius: 3px;
            outline: none;
            padding: 0 1px;
            white-space: nowrap;
        }

        .cut-preview-edit:focus {
            background: #ecfeff;
            box-shadow: 0 0 0 1px #06b6d4 inset;
        }

        .cut-preview-edit.active-target {
            background: #ccfbf1;
            box-shadow: 0 0 0 1px #14b8a6 inset;
        }

        .cut-format-meta {
            margin: 8px 0 0 0;
            font-size: 0.86rem;
            color: #334155;
        }

        .cut-format-checks {
            display: grid;
            grid-template-columns: 1fr;
            gap: 6px;
            margin-top: 8px;
        }

        .cut-style-toolbar {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
            padding: 10px;
            border: 1px solid #d6e0ef;
            border-radius: 10px;
            background: #f8fafc;
            margin: 0 0 10px 0;
        }

        .cut-style-toolbar .btn {
            width: 32px;
            height: 32px;
            padding: 0;
            min-width: auto;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 7px;
        }

        .cut-style-toolbar .btn.active {
            background: #0f766e;
            color: #fff;
            border-color: #0f766e;
        }

        .cut-style-toolbar .btn svg {
            width: 15px;
            height: 15px;
            display: block;
            fill: currentColor;
        }

        .cut-style-toolbar input[type="number"] {
            width: 86px;
            text-align: center;
            border: 1px solid #8a8a8a;
            background: #fff;
            padding: 6px 4px;
        }

        .cut-style-hint {
            margin: 0 0 10px 0;
            font-size: 0.86rem;
            color: #475569;
            line-height: 1.35;
        }

        .cut-style-global {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
            padding: 10px;
            border: 1px solid #d6e0ef;
            border-radius: 10px;
            background: #f8fafc;
            margin: 0 0 10px 0;
        }

        .cut-style-global input[type="number"] {
            width: 86px;
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
            <h2 class="popup-header">FORMATO DE CORTE</h2>
            <div class="popup-body">
                <div class="popup-card popup-main-card">
                    <div style="display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap;">
                        <div style="flex:1 1 420px; min-width:320px;">
                            <h3 style="margin: 0 0 8px 0;">Vista previa del corte</h3>
                            <p style="margin: 0 0 10px 0; font-size: 0.92rem;">
                                Activa o desactiva secciones y edita textos directamente sobre la vista previa. Los montos no son editables.
                            </p>
                            <div class="cut-format-preview-stage">
                                <div class="cut-format-paper">
                                    <div class="cut-format-printable-area">
                                        <div id="cut-format-preview" class="cut-format-preview-lines"></div>
                                    </div>
                                </div>
                            </div>
                            <p id="cut-format-preview-meta" class="cut-format-meta"></p>
                        </div>

                        <div style="flex:1 1 420px; min-width:320px;">
                            <form id="cut-format-settings-form">
                                <p style="margin-top:0;">Estilo del texto seleccionado en la previsualizacion:</p>
                                <div class="cut-style-toolbar">
                                    <button id="cut-style-normal-btn" type="button" class="btn" title="Normal" aria-label="Normal">
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M6 5h12v2h-5v10h5v2H6v-2h5V7H6z"></path>
                                        </svg>
                                    </button>
                                    <button id="cut-style-bold-btn" type="button" class="btn" title="Negrita" aria-label="Negrita">
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M7 4h7a4 4 0 0 1 0 8H7V4zm0 10h8a4 4 0 0 1 0 8H7v-8zm2 2v4h6a2 2 0 1 0 0-4H9zm0-10v4h5a2 2 0 1 0 0-4H9z"></path>
                                        </svg>
                                    </button>
                                    <button id="cut-style-italic-btn" type="button" class="btn" title="Cursiva" aria-label="Cursiva">
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M10 4h9v2h-3l-4 12h3v2H6v-2h3l4-12h-3z"></path>
                                        </svg>
                                    </button>
                                    <label for="cut-style-size-input" style="font-size:0.88rem;">Tamaño</label>
                                    <input id="cut-style-size-input" type="number" min="0.8" max="1.8" step="0.1" value="1.0">
                                    <span style="font-size:0.86rem;">x base</span>
                                </div>
                                <div class="cut-style-global">
                                    <label for="cut-style-global-step-input" style="font-size:0.88rem;">Ajuste global</label>
                                    <button id="cut-style-global-minus-btn" type="button" class="btn" style="padding:0 10px; width:auto; min-width:36px;" title="Reducir todo">-</button>
                                    <button id="cut-style-global-plus-btn" type="button" class="btn" style="padding:0 10px; width:auto; min-width:36px;" title="Aumentar todo">+</button>
                                    <input id="cut-style-global-step-input" type="number" min="-8" max="8" step="0.1" value="2">
                                    <span style="font-size:0.86rem;">px por accion</span>
                                    <button id="cut-style-global-apply-btn" type="button" class="btn" style="padding:8px 12px; width:auto;">Aplicar valor</button>
                                </div>
                                <p class="cut-style-hint">Selecciona un texto editable en la vista previa y luego aplica estilo. Se guarda con el botón "Guardar cambios".</p>

                                <p style="margin-top:0;">Items visibles en el ticket de corte:</p>
                                <div class="cut-format-checks">
                                    <label><input id="cut-format-show-business" type="checkbox" checked> Mostrar datos del negocio</label>
                                    <label><input id="cut-format-show-shift" type="checkbox" checked> Mostrar datos de turno (cajero, caja, horario)</label>
                                    <label><input id="cut-format-show-sales-overview" type="checkbox" checked> Mostrar resumen general de ventas</label>
                                    <label><input id="cut-format-show-cash-summary" type="checkbox" checked> Mostrar bloque "Dinero en caja"</label>
                                    <label><input id="cut-format-show-entries" type="checkbox" checked> Mostrar seccion de entradas de efectivo</label>
                                    <label><input id="cut-format-show-entries-detail" type="checkbox" checked> Mostrar detalle de entradas por item</label>
                                    <label><input id="cut-format-show-exits" type="checkbox" checked> Mostrar seccion de salidas de efectivo</label>
                                    <label><input id="cut-format-show-exits-detail" type="checkbox" checked> Mostrar detalle de salidas por item</label>
                                    <label><input id="cut-format-show-sales-methods" type="checkbox" checked> Mostrar ventas por metodo de pago</label>
                                    <label><input id="cut-format-show-departments" type="checkbox" checked> Mostrar ventas por departamento</label>
                                    <label><input id="cut-format-show-footer" type="checkbox" checked> Mostrar pie del ticket</label>
                                </div>

                                <div style="display:flex; gap:10px; align-items:center; margin-top: 14px; flex-wrap:wrap;">
                                    <button id="cut-format-enable-all-btn" type="button" class="btn" style="padding:8px 12px;">Mostrar todo</button>
                                    <button id="cut-format-summary-btn" type="button" class="btn" style="padding:8px 12px;">Solo resumen</button>
                                </div>

                                <div style="display:flex; gap:10px; align-items:center; margin-top: 12px; flex-wrap:wrap;">
                                    <button id="print-cut-format-btn" type="button" class="btn" style="background:#0f766e; color:#fff; border:1px solid #115e59; font-weight:700; min-width:170px; padding:10px 14px;">Imprimir prueba</button>
                                    <button id="save-cut-format-btn" type="submit" class="btn" style="background:#1f8f4f; color:#ffffff; border:1px solid #14663a; font-weight:700; min-width:170px; padding:10px 14px;">Guardar cambios</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>

    <script src="../js/cut_print_settings.js?v=20260325c"></script>
</body>
</html>

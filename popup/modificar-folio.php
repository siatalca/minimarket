<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modificar folio</title>
    <link rel="stylesheet" href="../css/root.css">
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <style>
        .folio-shell {
            max-width: 980px;
            margin: 0 auto;
        }

        .folio-panel {
            border: 1px solid #dbe3ef;
            border-radius: 12px;
            overflow: hidden;
            background: #fff;
            box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
        }

        .folio-head {
            margin: 0;
            padding: 14px 16px;
            font-size: 1.08rem;
            font-weight: 700;
            border-bottom: 1px solid #dbe3ef;
            background: linear-gradient(90deg, #ecfeff 0%, #f0f9ff 100%);
        }

        .folio-body {
            padding: 10px;
        }

        .folio-grid {
            display: grid;
            grid-template-columns: 1.1fr 1fr;
            gap: 14px;
        }

        .folio-card {
            border: 1px solid #d6e0ef;
            border-radius: 12px;
            background: #fff;
            padding: 14px;
        }

        .folio-card h3 {
            margin: 0 0 10px;
            font-size: 1.02rem;
        }

        .folio-preview-box {
            border: 1px dashed #9fb6d6;
            border-radius: 10px;
            padding: 16px;
            text-align: center;
            background: #f6fbff;
        }

        .folio-preview-value {
            font-size: 2rem;
            font-weight: 800;
            letter-spacing: 0.08em;
            color: #0f2f5f;
        }

        .folio-hint {
            margin: 8px 0 0;
            font-size: 0.85rem;
            color: #475569;
        }

        .folio-form {
            display: grid;
            gap: 10px;
        }

        .folio-form label {
            font-size: 0.86rem;
            font-weight: 700;
        }

        .folio-form input[type="text"],
        .folio-form input[type="number"] {
            width: 100%;
        }

        .folio-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 6px;
        }

        .folio-msg {
            min-height: 18px;
            font-size: 0.83rem;
        }

        .folio-msg.ok { color: #166534; }
        .folio-msg.err { color: #b91c1c; }

        body.dark .folio-card {
            background: #111c2f;
            border-color: #263952;
        }

        body.dark .folio-preview-box {
            background: #0f1c2e;
            border-color: #375680;
        }

        body.dark .folio-preview-value {
            color: #dbeafe;
        }

        body.dark .folio-hint {
            color: #c1d0e6;
        }

        @media (max-width: 860px) {
            .folio-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="folio-shell sub">
        <section class="folio-panel">
        <h2 class="folio-head">MODIFICAR FOLIO</h2>
        <div class="folio-body">
        <div class="folio-grid">
            <div class="folio-card">
                <h3>Vista previa</h3>
                <div class="folio-preview-box">
                    <div id="folio-preview" class="folio-preview-value">1</div>
                    <p class="folio-hint">Ejemplo aplicado al siguiente ticket. En pantalla de venta se mantiene numerico.</p>
                </div>
                <p class="folio-hint">Formatos posibles: <b>A000001</b>, <b>00000001</b>, <b>1</b>.</p>
            </div>

            <div class="folio-card">
                <form id="folio-form" class="folio-form">
                    <div>
                        <label for="folio-prefix">Prefijo (maximo 2 letras)</label>
                        <input id="folio-prefix" type="text" maxlength="2" placeholder="Ej: A o AB" autocomplete="off">
                    </div>
                    <div>
                        <label for="folio-digits">Largo numerico (1 a 8)</label>
                        <input id="folio-digits" type="number" min="1" max="8" step="1" value="1">
                    </div>
                    <p class="folio-hint">Si dejas prefijo vacio y largo 1, el formato sera "1".</p>
                    <div class="folio-actions">
                        <button id="folio-save-btn" class="btn" type="submit">Guardar formato</button>
                    </div>
                    <p id="folio-msg" class="folio-msg"></p>
                </form>
            </div>
        </div>
        </div>
        </section>
    </div>

    <script src="../js/folio_settings.js?v=20260222a"></script>
</body>
</html>

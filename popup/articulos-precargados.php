<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Articulos precargados</title>
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <script src="../js/functions.js"></script>
    <style>
        .preloaded-wrap {
            max-width: 820px;
            margin: 0 auto;
            padding: 10px 14px 20px;
        }
        .preloaded-card {
            background: #f9fafb;
            border: 1px solid #d1d5db;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
        }
        .preloaded-pill {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 999px;
            background: #e5e7eb;
            color: #111827;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.2px;
            margin-bottom: 10px;
        }
        .preloaded-title {
            margin: 0 0 8px;
            font-size: 1.1rem;
            font-weight: 700;
            color: #0f172a;
        }
        .preloaded-text {
            margin: 0 0 12px;
            color: #334155;
            line-height: 1.4;
        }
        .preloaded-list {
            margin: 0;
            padding-left: 18px;
            color: #1f2937;
            line-height: 1.45;
        }
        .preloaded-note {
            margin-top: 14px;
            padding: 10px 12px;
            border-radius: 8px;
            background: #eef2ff;
            color: #1e1b4b;
            font-size: 0.92rem;
        }
        body.dark .preloaded-card {
            background: #111827;
            border-color: #374151;
        }
        body.dark .preloaded-pill {
            background: #1f2937;
            color: #e5e7eb;
        }
        body.dark .preloaded-title { color: #f3f4f6; }
        body.dark .preloaded-text,
        body.dark .preloaded-list { color: #d1d5db; }
        body.dark .preloaded-note {
            background: #1f2937;
            color: #e5e7eb;
        }
    </style>
</head>
<body>
    <h2 class="h2-ext">ARTICULOS PRECARGADOS</h2>

    <div class="preloaded-wrap">
        <div class="preloaded-card">
            <span class="preloaded-pill">PROXIMAMENTE</span>
            <p class="preloaded-title">Modulo desactivado temporalmente</p>
            <p class="preloaded-text">
                Esta seccion se habilitara cuando exista una fuente de catalogo global validada
                (codigos + descripcion) para evitar datos incompletos o incorrectos.
            </p>
            <ol class="preloaded-list">
                <li>Definir fuente de datos (API externa o base propia).</li>
                <li>Validar cobertura, formato y calidad de codigos.</li>
                <li>Activar sincronizacion segura y cache local controlado.</li>
                <li>Encender busqueda automatica al crear productos.</li>
            </ol>
            <div class="preloaded-note">
                Estado actual: no afecta ventas ni inventario. Se mantiene aislado para activacion futura.
            </div>
        </div>
    </div>
</body>
</html>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Compras y proveedores</title>
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <script src="../js/functions.js?v=20260411a"></script>
    <style>
        .buy-shell { max-width: 980px; margin: 0 auto; }
        .buy-grid { display: grid; grid-template-columns: 1.05fr 1fr; gap: 12px; align-items: start; }
        .buy-card { border: 1px solid #d1d5db; border-radius: 10px; background: #fff; padding: 14px; }
        .buy-card h3 { margin: 0 0 8px; font-size: 1rem; }
        .buy-help { margin: 0 0 10px; color: #4b5563; font-size: .93rem; line-height: 1.35; }
        .buy-row { margin-bottom: 8px; }
        .buy-row label { display: block; margin-bottom: 4px; font-weight: 600; }
        .buy-inline { display: flex; gap: 8px; flex-wrap: wrap; }
        .buy-inline > * { flex: 1 1 140px; min-width: 130px; }
        .buy-shell input[type="text"],
        .buy-shell input[type="email"],
        .buy-shell select,
        .buy-shell textarea {
            width: 100%;
            border: 1px solid #8a8a8a;
            border-radius: 6px;
            background: #fff;
            padding: 8px 10px;
            box-sizing: border-box;
        }
        .buy-shell textarea { min-height: 70px; resize: vertical; }
        .buy-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
        .buy-actions .btn { min-width: 140px; font-weight: 700; }
        .buy-list {
            margin: 8px 0 0;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            max-height: 420px;
            overflow: auto;
            background: #f8fafc;
        }
        .buy-list-item {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            align-items: center;
            padding: 8px 10px;
            border-bottom: 1px solid #e5e7eb;
        }
        .buy-list-item:last-child { border-bottom: none; }
        .buy-list-item strong { text-align: left; }
        .buy-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 999px;
            border: 1px solid #93c5fd;
            background: #dbeafe;
            color: #1e3a8a;
            font-size: .72rem;
            font-weight: 700;
            margin-left: 6px;
        }
        body.dark .buy-card { background: #111827; border-color: #374151; }
        body.dark .buy-help { color: #cbd5e1; }
        body.dark .buy-list { background: #1f2937; border-color: #475569; }
        body.dark .buy-list-item { border-color: #334155; }
        body.dark .buy-badge { background: #1e3a8a; border-color: #60a5fa; color: #dbeafe; }
        @media (max-width: 900px) { .buy-grid { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <h2 class="h2-ext">COMPRAS / PROVEEDORES</h2>
    <div class="sub">
        <div class="content buy-shell">
            <div class="buy-grid">
                <section class="buy-card">
                    <h3>Formulario unico</h3>
                    <p class="buy-help">
                        Crea, modifica o elimina <b>proveedores</b> y <b>encargados de compra</b> como entidades separadas.
                        Comparten la misma estructura de datos.
                    </p>

                    <div class="buy-row">
                        <label for="entity-type">Tipo de registro</label>
                        <select id="entity-type">
                            <option value="supplier">Proveedor</option>
                            <option value="buyer">Encargado de compra</option>
                        </select>
                    </div>
                    <div class="buy-row">
                        <label for="entity-name">Nombre</label>
                        <input id="entity-name" type="text" maxlength="120" placeholder="Ej: Distribuidora Centro / Encargado turno manana">
                    </div>
                    <div class="buy-inline">
                        <div>
                            <label for="entity-contact">Contacto</label>
                            <input id="entity-contact" type="text" maxlength="120" placeholder="Ej: Juan Perez">
                        </div>
                        <div>
                            <label for="entity-phone">Telefono</label>
                            <input id="entity-phone" type="text" maxlength="40" placeholder="+56...">
                        </div>
                    </div>
                    <div class="buy-row">
                        <label for="entity-email">Correo</label>
                        <input id="entity-email" type="email" maxlength="180" placeholder="contacto@dominio.cl">
                    </div>
                    <div class="buy-row">
                        <label for="entity-note">Notas</label>
                        <textarea id="entity-note" maxlength="400" placeholder="Dias, horarios, observaciones..."></textarea>
                    </div>

                    <div class="buy-actions">
                        <button id="entity-clear-btn" type="button" class="btn">Limpiar</button>
                        <button id="entity-save-btn" type="button" class="btn" style="background:#1f8f4f; color:#fff; border:1px solid #14663a;">Guardar</button>
                    </div>
                </section>

                <section class="buy-card">
                    <h3>Registros creados</h3>
                    <p class="buy-help">Puedes editar o eliminar cada item sin relacionarlo con productos desde esta vista.</p>
                    <div id="entity-list" class="buy-list"></div>
                </section>
            </div>
        </div>
    </div>

    <script src="../js/purchase_supplier_settings.js?v=20260222u"></script>
</body>
</html>

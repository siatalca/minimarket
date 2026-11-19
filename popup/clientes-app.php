<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Clientes de la app</title>
    <link rel="stylesheet" href="../css/root.css">
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <style>
        /* Clientes de la app (M-039): solo lectura. Mismo marco que los demás popups de Configuración. */
        .ca-shell { display: flex; flex-direction: column; gap: 12px; color: #10233F; }
        .ca-help { margin: 0; color: #4b5563; font-size: 0.95rem; }
        .ca-muted { color: #4C6183; }
        /* Solo para lectores de pantalla. */
        .ca-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
            clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
        .ca-small { font-size: 0.85rem; }
        .ca-search { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px; }
        .ca-search label { display: flex; flex-direction: column; gap: 4px; font-weight: 600; flex: 1 1 260px; }
        .ca-search input[type="search"] {
            border: 1px solid #c4d2e6; border-radius: 8px; padding: 9px 10px; font-size: 1rem; width: 100%; box-sizing: border-box;
        }
        .ca-search input[type="search"]:focus-visible { outline: 3px solid #0057B8; outline-offset: 1px; }
        .ca-search .btn { margin: 0; font-weight: 700; }
        .ca-btn-light { background: #fff; color: #0F2F5F; border: 1px solid #c4d2e6; }
        .ca-btn-light:hover { background: #eef4fb; }
        .ca-btn-small { margin: 0; padding: 7px 12px; font-size: 0.9rem; white-space: nowrap; }
        .ca-summary { margin: 0; font-weight: 600; }
        .ca-loading { margin: 0; padding: 10px 12px; border-radius: 8px; background: #E8F1FC; color: #0F2F5F; border-left: 4px solid #0057B8; }
        .ca-error { margin: 0; padding: 10px 12px; border-radius: 8px; background: #FDECEC; color: #991B1B; border-left: 4px solid #DC2626;
            display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
        .ca-error p { margin: 0; }
        .ca-table { margin-top: 0; }
        .ca-table th { font-size: 0.85rem; color: #4C6183; font-weight: 700; background: #f6f9fd; }
        .ca-table td { vertical-align: top; }
        .ca-line { display: block; }
        .ca-num { text-align: right; }
        .ca-action { text-align: right; }
        .ca-tag { display: inline-block; margin-left: 6px; padding: 1px 7px; border-radius: 999px; font-size: 0.75rem; font-weight: 700;
            background: #E8F1FC; color: #0F2F5F; vertical-align: middle; }
        .ca-tag-muted { background: #eceff3; color: #4b5563; }
        .ca-empty { margin: 0; padding: 18px 12px; text-align: center; color: #4C6183; border: 1px dashed #c4d2e6; border-radius: 8px; }
        .ca-pager { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }
        .ca-pager .btn { margin: 0; }
        .ca-pager .btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .ca-detail-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
        .ca-detail-top h3 { margin: 0; font-size: 1.25rem; }
        .ca-data { display: grid; grid-template-columns: max-content 1fr; gap: 6px 14px; margin: 0;
            padding: 12px; border: 1px solid #dbe3ef; border-radius: 10px; background: #f8fbff; }
        .ca-data dt { font-weight: 700; color: #4C6183; }
        .ca-data dd { margin: 0; word-break: break-word; }
        .ca-carts-title { margin: 4px 0 0; font-size: 1.05rem; }
        .ca-carts { display: flex; flex-direction: column; gap: 10px; }
        .ca-cart { border: 1px solid #dbe3ef; border-left-width: 5px; border-radius: 10px; padding: 10px 12px; background: #fff; }
        .ca-cart-ok { border-left-color: #1f8f4f; }
        .ca-cart-warning { border-left-color: #B45309; }
        .ca-cart-info { border-left-color: #0057B8; }
        .ca-cart-muted { border-left-color: #9aa5b5; }
        .ca-cart-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
        .ca-cart-head h4 { margin: 0; font-size: 1rem; }
        .ca-cart p { margin: 4px 0; }
        .ca-state { padding: 2px 10px; border-radius: 999px; font-size: 0.8rem; font-weight: 700; }
        .ca-state-ok { background: #E3F4EA; color: #14663a; }
        .ca-state-warning { background: #FFF6E0; color: #7A4A00; }
        .ca-state-info { background: #E8F1FC; color: #0F2F5F; }
        .ca-state-muted { background: #eceff3; color: #4b5563; }
        .ca-items-wrap { overflow-x: auto; }
        .ca-items { margin-top: 6px; font-size: 0.92rem; }
        .ca-items th, .ca-items td { padding: 6px 8px; }
        .ca-items th { color: #4C6183; font-size: 0.8rem; }
        .ca-total { font-weight: 700; text-align: right; }

        @media (max-width: 640px) {
            .popup-shell { padding: 8px; }
            .popup-body { padding: 6px; }
            /* La lista pasa a fichas: cada celda muestra su título. */
            .ca-table thead { display: none; }
            .ca-table, .ca-table tbody, .ca-table tr, .ca-table td { display: block; width: 100%; box-sizing: border-box; }
            .ca-table tr { border: 1px solid #dbe3ef; border-radius: 10px; padding: 6px 10px; margin-bottom: 8px; }
            .ca-table td { border: none; padding: 4px 0; text-align: left; }
            .ca-table td[data-label]::before { content: attr(data-label); display: block; font-size: 0.75rem; font-weight: 700; color: #4C6183; }
            .ca-table td.ca-cell-name::before { display: none; }
            .ca-action .btn { width: 100%; padding: 10px 12px; }
            .ca-data { grid-template-columns: 1fr; gap: 2px; }
            .ca-data dd { margin-bottom: 6px; }
        }
    </style>
</head>
<body>
    <div class="popup-shell">
        <section class="popup-panel">
            <h2 class="popup-header">CLIENTES DE LA APP</h2>
            <div class="popup-body">
                <div class="popup-card popup-main-card ca-shell" style="max-width:none;">
                    <p class="ca-help">Clientes que se registraron en la consulta de precios por QR y los carritos que armaron. Solo lectura.</p>

                    <p id="ca-loading" class="ca-loading hidden" role="status" aria-live="polite"></p>
                    <div id="ca-error" class="ca-error hidden" role="alert">
                        <p id="ca-error-text"></p>
                        <button id="ca-retry-btn" type="button" class="btn ca-btn-small ca-btn-light hidden">Reintentar</button>
                    </div>

                    <!-- Lista -->
                    <div id="ca-list-view">
                        <form id="ca-search-form" class="ca-search" role="search">
                            <label for="ca-search-input">Buscar por nombre, teléfono o correo
                                <input id="ca-search-input" type="search" autocomplete="off" placeholder="Ej.: María, +569 o @gmail">
                            </label>
                            <button type="submit" class="btn">Buscar</button>
                            <button id="ca-clear-btn" type="button" class="btn ca-btn-light">Limpiar</button>
                        </form>
                        <div id="ca-list-content" class="hidden" style="margin-top:12px; display:flex; flex-direction:column; gap:10px;">
                            <p id="ca-summary" class="ca-summary" aria-live="polite"></p>
                            <p id="ca-empty" class="ca-empty hidden"></p>
                            <table id="ca-table" class="ca-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Cliente</th>
                                        <th scope="col">Contacto</th>
                                        <th scope="col">Registro</th>
                                        <th scope="col">Último ingreso</th>
                                        <th scope="col" class="ca-num">Carritos</th>
                                        <th scope="col"><span class="ca-sr-only">Acción</span></th>
                                    </tr>
                                </thead>
                                <tbody id="ca-list-body"></tbody>
                            </table>
                            <nav id="ca-pager" class="ca-pager hidden" aria-label="Páginas de clientes">
                                <button id="ca-prev-btn" type="button" class="btn ca-btn-light">Anterior</button>
                                <span id="ca-page-info"></span>
                                <button id="ca-next-btn" type="button" class="btn ca-btn-light">Siguiente</button>
                            </nav>
                        </div>
                    </div>

                    <!-- Detalle -->
                    <div id="ca-detail-view" class="hidden">
                        <div class="ca-detail-top">
                            <button id="ca-back-btn" type="button" class="btn ca-btn-light ca-btn-small">Volver a la lista</button>
                        </div>
                        <div id="ca-detail-content" class="hidden" style="margin-top:12px; display:flex; flex-direction:column; gap:10px;">
                            <div class="ca-detail-top"><h3 id="ca-detail-name"></h3></div>
                            <dl id="ca-detail-data" class="ca-data"></dl>
                            <h4 id="ca-carts-title" class="ca-carts-title">Carritos</h4>
                            <p class="ca-muted ca-small" style="margin:0;">Los precios de los productos son los de hoy, no los del día del carrito.</p>
                            <div id="ca-carts" class="ca-carts"></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>

    <script src="../js/api_base.js?v=20261003a"></script>
    <script src="../js/clientes_app.js?v=20261118b"></script>
</body>
</html>

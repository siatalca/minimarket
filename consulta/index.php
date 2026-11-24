<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <!--
        Política de contenido (M-037): solo recursos propios.
        - connect-src agrega http://localhost:3002 y http://127.0.0.1:3002 únicamente para el backend local de desarrollo
          (js/api_base.js solo los usa si la página se abre en localhost).
        - accounts.google.com/gsi/* se permite SOLO para «Continuar con Google» (Google Identity Services). El script
          https://accounts.google.com/gsi/client se carga desde consulta.js únicamente cuando /api/tienda/info trae
          google_client_id; sin client id no se carga nada de Google y el botón no aparece.
        - style-src lleva 'unsafe-inline' solo porque el botón de Google inserta estilos en línea (sin eso queda
          bloqueado y la consola marca errores de CSP). Los scripts siguen limitados a 'self' y al cliente de Google;
          la página nunca inserta HTML del servidor (todo va con textContent).
    -->
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client; style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self' http://localhost:3002 http://127.0.0.1:3002 https://accounts.google.com/gsi/; frame-src https://accounts.google.com/gsi/; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'">
    <meta name="referrer" content="same-origin">
    <meta name="theme-color" content="#0F2F5F">
    <meta name="description" content="Consulta precio y stock escaneando el código del producto.">
    <title>Consulta de precios</title>
    <link rel="manifest" href="./manifest.webmanifest">
    <link rel="icon" type="image/png" sizes="192x192" href="./icon-192.png">
    <link rel="apple-touch-icon" href="./icon-192.png">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="Precios">
    <link rel="stylesheet" href="./consulta.css?v=20261124a">
</head>
<body>
    <header class="top">
        <img class="top-icon" src="./icon-192.png" alt="" width="36" height="36">
        <div class="top-text">
            <p class="top-store" id="store-name">Minimarket</p>
            <p class="top-sub">Consulta de precios</p>
        </div>
        <button id="install-btn" class="btn-ghost hidden" type="button">Instalar</button>
    </header>

    <p id="ios-install-hint" class="install-hint hidden">
        Para dejar el ícono en tu iPhone: toca <strong>Compartir</strong> y luego <strong>Agregar a inicio</strong>.
    </p>

    <main class="views">
        <!-- ===== Consultar ===== -->
        <section id="view-consultar" class="view" aria-labelledby="tab-consultar">
            <button id="scan-btn" class="btn-scan" type="button">
                <span class="btn-scan-bars" aria-hidden="true"></span>
                Escanear producto
            </button>

            <form id="code-form" class="code-form" novalidate>
                <label for="code-input">O escribe el código de barras</label>
                <div class="code-row">
                    <input id="code-input" name="codigo" type="text" inputmode="numeric" autocomplete="off"
                        maxlength="64" placeholder="Ej: 7802800716345" aria-describedby="code-error">
                    <button class="btn-primary" type="submit">Consultar</button>
                </div>
                <p id="code-error" class="field-error" role="alert"></p>
            </form>

            <div id="product-result" class="result" aria-live="polite"></div>

            <p class="note">Precio referencial. En caja se cobra el precio y las promociones vigentes.</p>
        </section>

        <!-- ===== Mi carrito ===== -->
        <section id="view-carrito" class="view hidden" aria-labelledby="tab-carrito">
            <div id="cart-panel" aria-live="polite"></div>
        </section>

        <!-- ===== Cuenta ===== -->
        <section id="view-cuenta" class="view hidden" aria-labelledby="tab-cuenta">
            <div id="account-panel"></div>
        </section>
    </main>

    <footer class="legal-links">
        <a href="./privacidad.html">Privacidad</a>
        <a href="./condiciones.html">Condiciones de uso</a>
    </footer>

    <div id="toast" class="toast hidden" role="status" aria-live="polite"></div>

    <nav class="tabs" aria-label="Secciones">
        <button id="tab-consultar" class="tab active" type="button" data-view="consultar" aria-current="page">Consultar</button>
        <button id="tab-carrito" class="tab" type="button" data-view="carrito">Mi carrito <span id="cart-badge" class="badge hidden"></span></button>
        <button id="tab-cuenta" class="tab" type="button" data-view="cuenta">Cuenta</button>
    </nav>

    <script src="../js/api_base.js?v=20261003a"></script>
    <script src="../js/html_escape.js?v=20261112a"></script>
    <script src="../js/camera_barcode_scanner.js?v=20261116b"></script>
    <script src="./consulta_core.js?v=20261118c"></script>
    <script src="./consulta_ui.js?v=20261118a"></script>
    <script src="./consulta.js?v=20261124a"></script>
</body>
</html>

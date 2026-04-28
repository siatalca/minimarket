<!-- Panel de configuracion con pestanas -->
<div class="panel">
    <h1 class="config-main-title">Configuraci&oacute;n</h1>

    <!-- ===== PESTANAS ===== -->
    <div class="menu-image">
        <div class="tabs">
            <div class="tab active" data-tab="general">General</div>
            <div class="tab" data-tab="personalizacion">Personalizacion</div>
            <div class="tab" data-tab="dispositivos">Dispositivos</div>
            <div class="tab" data-tab="servicios">Servicios</div>
            <div class="tab" data-tab="mantenimiento">Mantenimiento</div>
        </div>
    </div>
    <div class="menu-no-image ">
        <div class="tabs">
            <div class="tab active" data-tab="general"><img src="./img/general.png" class="menu-img"></div>
            <div class="tab" data-tab="personalizacion"><img src="./img/personaliza.png" class="menu-img"></div>
            <div class="tab" data-tab="dispositivos"><img src="./img/dispositivo.png" class="menu-img"></div>
            <div class="tab" data-tab="servicios"><img src="./img/servicios.png" class="menu-img"></div>
            <div class="tab" data-tab="mantenimiento"><img src="./img/mantenimiento.png" class="menu-img"></div>
        </div>
    </div>


    <!-- ===== CONTENEDOR DE PESTANAS ===== -->
    <div class="div-tab">

        <!-- ---------- General ---------- -->
        <div id="general" class="tab-content active">
            <h3 class="sub">General</h3>
            <ul class="panel-grid">
                <!-- (items originales) -->
                <li class="panel-item" onclick="open_w('opciones-Habilitadas')">
                    <img src="https://cdn-icons-gif.flaticon.com/10690/10690746.gif" alt="">
                    <span>Opciones<br>Habilitadas</span>
                </li>
                <li class="panel-item" onclick="open_w('cajero')">
                    <img src="https://cdn-icons-gif.flaticon.com/11188/11188712.gif" alt="">
                    <span>Cajeros</span>
                </li>
                <li class="panel-item" onclick="open_w('base-datos')">
                    <img src="https://cdn-icons-gif.flaticon.com/9872/9872469.gif" alt="">
                    <span>Base&nbsp;de<br>datos</span>
                </li>
                <li class="panel-item" onclick="open_w('facturacion')">
                    <img src="https://cdn-icons-gif.flaticon.com/8716/8716613.gif" alt="">
                    <span>Facturacion</span>
                </li>
                <li class="panel-item" onclick="open_w('modificar-folio')">
                    <img src="https://cdn-icons-gif.flaticon.com/15309/15309792.gif" alt="">
                    <span>Modificar<br>folios</span>
                </li>
                <li class="panel-item" onclick="open_w('administrar-caja')">
                    <img src="https://cdn-icons-gif.flaticon.com/11188/11188712.gif" alt="">
                    <span>Administrar<br>cajas</span>
                </li>
                <li class="panel-item" onclick="open_w('sucursales')">
                    <img src="./img/sucursales.png" alt="">
                    <span>Administrar<br>sucursales</span>
                </li>
            </ul>
            <div class="panel-upcoming">
                <h4 class="panel-upcoming-title">Mejoras en camino</h4>
                <ul class="panel-grid panel-grid-upcoming">
                    <li class="panel-item panel-item-disabled" data-upcoming="Permitira autocompletar nombre y datos base de productos por codigo de barras usando un catalogo global validado.">
                        <img src="https://cdn-icons-gif.flaticon.com/18300/18300014.gif" alt="">
                        <span>Articulos<br>precargados<br><small>Proximamente</small></span>
                    </li>
                </ul>
            </div>
        </div>

        <!-- ---------- Personalizacion ---------- -->
        <div id="personalizacion" class="tab-content">
            <h3 class="sub">Personalizacion</h3>
            <ul class="panel-grid">
                <!-- (items originales) -->
                <li class="panel-item" onclick="open_w('logotipo-programa')">
                    <img src="https://cdn-icons-gif.flaticon.com/18549/18549235.gif" alt="">
                    <span>Logotipo</span>
                </li>
                <li class="panel-item" onclick="open_w('ticket')">
                    <img src="https://cdn-icons-gif.flaticon.com/12147/12147184.gif" alt="">
                    <span>Ticket</span>
                </li>
                <li class="panel-item" onclick="open_w('corte-formato')">
                    <img src="https://cdn-icons-gif.flaticon.com/12147/12147184.gif" alt="">
                    <span>Formato<br>corte</span>
                </li>
                <li class="panel-item" onclick="open_w('forma-pago')">
                    <img src="https://cdn-icons-gif.flaticon.com/11188/11188755.gif" alt="">
                    <span>Formas<br>de pago</span>
                </li>
                <li class="panel-item" onclick="open_w('impuestos')">
                    <img src="https://cdn-icons-gif.flaticon.com/15576/15576128.gif" alt="">
                    <span>Impuestos</span>
                </li>
                <li class="panel-item" onclick="open_w('corte')">
                    <img src="https://cdn-icons-gif.flaticon.com/15579/15579028.gif" alt="">
                    <span>Corte</span>
                </li>
                <li class="panel-item" onclick="open_w('simbolo-moneda')">
                    <img src="https://cdn-icons-gif.flaticon.com/15575/15575658.gif" alt="">
                    <span>Simbolo<br>moneda</span>
                </li>
                <li class="panel-item" onclick="open_w('unidad-medida')">
                    <img src="https://cdn-icons-gif.flaticon.com/11200/11200186.gif" alt="">
                    <span>Unidades</span>
                </li>
            </ul>
        </div>

        <!-- ---------- Dispositivos ---------- -->
        <div id="dispositivos" class="tab-content">
            <h3 class="sub">Dispositivos</h3>
            <ul class="panel-grid">
                <!-- (items originales) -->
                <li class="panel-item" onclick="open_w('impresora')">
                    <img src="https://cdn-icons-gif.flaticon.com/18255/18255118.gif" alt="">
                    <span>Impresora</span>
                </li>
                <li class="panel-item" onclick="open_w('lector-codigo')">
                    <img src="https://cdn-icons-gif.flaticon.com/11188/11188729.gif" alt="">
                    <span>Lector<br>codigos</span>
                </li>
                <li class="panel-item" onclick="open_w('cajon-dinero')">
                    <img src="https://cdn-icons-gif.flaticon.com/14099/14099172.gif" alt="">
                    <span>Cajon&nbsp;dinero</span>
                </li>
            </ul>
            <div class="panel-upcoming">
                <h4 class="panel-upcoming-title">Mejoras en camino</h4>
                <ul class="panel-grid panel-grid-upcoming">
                    <li class="panel-item panel-item-disabled" data-upcoming="Permitira usar la camara del celular para leer codigos de barras cuando abras el sistema en modo movil, con permisos y validaciones de calidad de lectura.">
                        <img src="https://cdn-icons-gif.flaticon.com/13896/13896425.gif" alt="">
                        <span>Camara<br>movil<br><small>Proximamente</small></span>
                    </li>
                </ul>
            </div>
        </div>

        <!-- ---------- Servicios ---------- -->
        <div id="servicios" class="tab-content">
            <h3 class="sub">Servicios</h3>
            <ul class="panel-grid">
                <!-- (items originales) -->
                <li class="panel-item" onclick="open_w('compra-proveedor')">
                    <img src="https://cdn-icons-gif.flaticon.com/15575/15575664.gif" alt="">
                    <span>Compras /<br>Proveedores</span>
                </li>
                <li class="panel-item" onclick="open_w('notificar-correo')">
                    <img src="https://cdn-icons-gif.flaticon.com/11237/11237480.gif" alt="">
                    <span>Notificar<br>correo</span>
                </li>
            </ul>
            <div class="panel-upcoming">
                <h4 class="panel-upcoming-title">Mejoras en camino</h4>
                <ul class="panel-grid panel-grid-upcoming">
                    <li class="panel-item panel-item-disabled" data-upcoming="Sincronizara catalogos y respaldos con la nube para alimentar articulos precargados y compartir informacion entre sucursales o equipos autorizados.">
                        <img src="https://cdn-icons-gif.flaticon.com/16678/16678265.gif" alt="">
                        <span>Sincronizar<br>nube<br><small>Proximamente</small></span>
                    </li>
                </ul>
            </div>
        </div>

        <!-- ---------- Mantenimiento ---------- -->
        <div id="mantenimiento" class="tab-content">
            <h3 class="sub">Mantenimiento</h3>
            <ul class="panel-grid">
                <!-- (items originales) -->
                <li class="panel-item" onclick="open_w('actualizacion-automatica')">
                    <img src="https://cdn-icons-gif.flaticon.com/16313/16313572.gif" alt="">
                    <span>Actualizaciones<br>automaticas</span>
                </li>
            </ul>
            <div class="panel-upcoming">
                <h4 class="panel-upcoming-title">Mejoras en camino</h4>
                <ul class="panel-grid panel-grid-upcoming">
                    <li class="panel-item panel-item-disabled" data-upcoming="Permitira programar copias de seguridad automaticas, con almacenamiento local y verificacion de integridad de respaldo.">
                        <img src="https://cdn-icons-gif.flaticon.com/16313/16313609.gif" alt="">
                        <span>Respaldo<br>automatico<br><small>Proximamente</small></span>
                    </li>
                    <li class="panel-item panel-item-disabled" data-upcoming="Permitira administrar vigencia de licencia, renovaciones y validacion de condiciones comerciales del sistema.">
                        <img src="https://cdn-icons-gif.flaticon.com/15578/15578358.gif" alt="">
                        <span>Licencia<br><small>Proximamente</small></span>
                    </li>
                </ul>
            </div>
        </div>
    </div>

    <div class="centrar" style="margin-top:2rem;">
        <a href="https://www.flaticon.es/iconos-animados-gratis/ajustes" target="_blank">
            Iconos animados creados por Freepik - Flaticon
        </a>
    </div>
</div>

<!-- Mini-script para conmutar pestanas (sin librerias externas) -->
<script>
(function () {
    if (window.__upcomingTooltipInit) return;
    window.__upcomingTooltipInit = true;

    var tooltip = document.createElement('div');
    tooltip.className = 'upcoming-tooltip-float';
    document.body.appendChild(tooltip);

    var currentTarget = null;

    function hideTooltip() {
        currentTarget = null;
        tooltip.classList.remove('visible');
        tooltip.textContent = '';
    }

    function positionTooltip(x, y) {
        var pad = 12;
        var tipWidth = tooltip.offsetWidth || 280;
        var tipHeight = tooltip.offsetHeight || 48;
        var left = x + 14;
        var top = y + 14;

        if (left + tipWidth + pad > window.innerWidth) {
            left = window.innerWidth - tipWidth - pad;
        }
        if (top + tipHeight + pad > window.innerHeight) {
            top = y - tipHeight - 14;
        }
        if (left < pad) left = pad;
        if (top < pad) top = pad;

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    }

    function showTooltip(target, x, y) {
        var msg = target.getAttribute('data-upcoming') || '';
        if (!msg) return;
        currentTarget = target;
        tooltip.textContent = msg;
        tooltip.classList.add('visible');
        positionTooltip(x, y);
    }

    document.addEventListener('mousemove', function (ev) {
        if (!currentTarget) return;
        positionTooltip(ev.clientX, ev.clientY);
    });

    document.addEventListener('mouseover', function (ev) {
        var target = ev.target.closest('.panel-item-disabled[data-upcoming]');
        if (!target) return;
        showTooltip(target, ev.clientX, ev.clientY);
    });

    document.addEventListener('mouseout', function (ev) {
        var target = ev.target.closest('.panel-item-disabled[data-upcoming]');
        if (!target) return;
        var to = ev.relatedTarget;
        if (to && target.contains(to)) return;
        hideTooltip();
    });

    document.addEventListener('scroll', hideTooltip, true);
    window.addEventListener('blur', hideTooltip);
})();
</script>

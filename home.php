<?php require('./layout/header.php'); ?>

<main class="main-content">

    <section id="sales">
        <?php require('./content/ventas.php'); ?>
    </section>
    <section id="credit" class="hidden">
        <?php require('./content/creditos.php'); ?>
    </section>
    <section id="client" class="hidden">
        <?php require('./content/clientes.php'); ?>
    </section>
    <section id="product" class="hidden">
        <?php require('./content/productos.php'); ?>
    </section>
    <section id="inventory" class="hidden">
        <?php require('./content/inventario.php'); ?>
    </section>
    <section id="shopping" class="hidden">
        <?php require('./content/compras.php'); ?>
    </section>
    <section id="configuration" class="hidden">
        <?php require('./content/configuracion.php'); ?>
    </section>
    <section id="invoice" class="hidden">
        <?php require('./content/facturas.php'); ?>
    </section>
    <section id="cut" class="hidden">
        <?php require('./content/corte.php'); ?>
    </section>
    <section id="reports" class="hidden">
        <?php require('./content/reportes.php'); ?>
    </section>    <div id="embedded-popup-overlay" class="hidden" style="position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:9999; align-items:center; justify-content:center; padding:20px;">
        <div style="position:relative; width:min(1280px, 96vw); height:min(92vh, 900px); background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 15px 40px rgba(0,0,0,.35);">
            <button type="button" onclick="closeEmbeddedPopup()" style="position:absolute; right:10px; top:10px; z-index:2; border:1px solid #374151; background:#4b5563; color:#fff; border-radius:6px; padding:6px 10px; cursor:pointer;">Cerrar</button>
            <iframe id="embedded-popup-frame" title="Popup embebido" style="width:100%; height:100%; border:0; background:#fff;"></iframe>
        </div>
    </div>
    <p id="logout-msg" style="display:none;">Cerrando sesiÃ³nâ€¦</p>
</main>

<?php require('./layout/footer.php'); ?>
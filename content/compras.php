<div id="shopping-panel" class="panel">
    <h1>Compras</h1>

    <nav class="panel-grid products-nav-grid shopping-nav-grid">
        <button class="btn" type="button" onclick="startShoppingNewOrderFlow()">Crear orden</button>
        <button class="btn" type="button" onclick="openShoppingReceiveView()">Recibir pedido</button>
        <button class="btn" type="button" onclick="openShoppingRequestsView()">Ver solicitudes</button>
    </nav>

    <section id="shopping-create-section" class="shopping-section hidden">
        <h3>Orden de compra activa</h3>
        <div id="shopping-create-empty" class="product-status-box">
            No hay orden activa. Presiona "Crear nueva orden de compra" para comenzar.
        </div>

        <div id="shopping-create-workspace" class="hidden">
            <div class="shopping-actions-top">
                <button class="btn" type="button" onclick="loadShoppingOrderActive()">Recargar lista</button>
            </div>

            <div class="form-row">
                <label for="shopping-product-input">Escanear o buscar producto</label>
                <input
                    id="shopping-product-input"
                    type="text"
                    list="shopping-product-options"
                    autocomplete="off"
                    placeholder="Escanea c&oacute;digo o escribe descripci&oacute;n y presiona Enter"
                    oninput="shoppingSuggestProducts(this.value)"
                    onkeydown="if(event.key==='Enter'){event.preventDefault();addShoppingItemFromInput();}">
            </div>
            <div id="shopping-feedback" class="product-status-box">Escanea un producto para agregarlo a la orden de compra.</div>

            <div class="shopping-layout">
                <div class="shopping-column shopping-order-column">
                    <div class="product-table-wrap">
                        <table class="venta-table product-table" style="margin:0;">
                            <thead>
                                <tr>
                                    <th>C&oacute;digo</th>
                                    <th>Descripci&oacute;n</th>
                                    <th>Solicitado</th>
                                    <th>Recibido</th>
                                    <th>Pendiente</th>
                                    <th>Solicitado por</th>
                                    <th>Acci&oacute;n</th>
                                </tr>
                            </thead>
                            <tbody id="shopping-order-body">
                                <tr><td colspan="7" style="text-align:center;">Sin productos en la orden activa.</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="shopping-column shopping-assignment-column">
                    <h4 class="panel-upcoming-title" style="margin-bottom:8px;">Asignar encargado y enviar correo</h4>
                    <div class="form-row">
                        <label for="shopping-buyer-select">Encargado de compra</label>
                        <select id="shopping-buyer-select"></select>
                    </div>
                    <div class="form-row">
                        <label for="shopping-assignment-note">Observaci&oacute;n</label>
                        <input id="shopping-assignment-note" type="text" maxlength="255" placeholder="Opcional">
                    </div>
                    <div class="form-row form-actions">
                        <button id="shopping-send-close-btn" class="btn" type="button" onclick="assignShoppingOrderAndEmail()">Enviar orden por correo y cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section id="shopping-receive-section" class="shopping-section hidden">
        <h3>Recepci&oacute;n de productos</h3>
        <div class="shopping-layout">
            <div class="shopping-column">
                <h4 class="panel-upcoming-title" style="margin-bottom:8px;">Compras pendientes</h4>
                <div class="product-table-wrap">
                    <table class="venta-table product-table" style="margin:0;">
                        <thead>
                            <tr>
                                <th>Orden</th>
                                <th>Items</th>
                                <th>Pendiente</th>
                                <th>Seleccionar</th>
                            </tr>
                        </thead>
                        <tbody id="shopping-receive-orders-body">
                            <tr><td colspan="4" style="text-align:center;">Sin compras pendientes.</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div id="shopping-receive-detail-column" class="shopping-column hidden">
                <h4 class="panel-upcoming-title" style="margin-bottom:8px;">Detalle de productos</h4>
                <div id="shopping-receive-selected-order" class="product-status-box">Sin pedido seleccionado.</div>
                <div class="form-row">
                    <label for="shopping-receive-input">Escanear c&oacute;digo o buscar producto</label>
                    <input
                        id="shopping-receive-input"
                        type="text"
                        list="shopping-product-options"
                        autocomplete="off"
                        placeholder="Escanea c&oacute;digo o escribe nombre y presiona Enter"
                        oninput="shoppingSuggestProducts(this.value)"
                        onkeydown="if(event.key==='Enter'){event.preventDefault();openShoppingReceiveFromInput();}">
                </div>
                <div id="shopping-receive-feedback" class="product-status-box">Selecciona una compra pendiente y escanea productos para recepci&oacute;n.</div>
                <div class="form-row form-actions">
                    <button class="btn" type="button" onclick="closeSelectedShoppingReceiveOrder()">Cerrar pedido seleccionado</button>
                </div>
                <div class="product-table-wrap">
                    <table class="venta-table product-table" style="margin:0;">
                        <thead>
                            <tr>
                                <th>Estado</th>
                                <th>C&oacute;digo</th>
                                <th>Descripci&oacute;n</th>
                                <th>Solicitado</th>
                                <th>Recibido</th>
                                <th>Pendiente</th>
                            </tr>
                        </thead>
                        <tbody id="shopping-receive-items-body">
                            <tr><td colspan="6" style="text-align:center;">Selecciona una compra para ver detalle.</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </section>

    <section id="shopping-requests-section" class="shopping-section hidden">
        <h3>Solicitudes de compra</h3>
        <div class="shopping-layout">
            <div class="shopping-column">
                <h4 class="panel-upcoming-title" style="margin-bottom:8px;">Cerradas y enviadas</h4>
                <div class="product-table-wrap">
                    <table class="venta-table product-table" style="margin:0;">
                        <thead>
                            <tr>
                                <th>Estado</th>
                                <th>Orden</th>
                                <th>Items</th>
                                <th>Solicitado</th>
                                <th>Recibido</th>
                                <th>Cierre recepción</th>
                                <th>Seleccionar</th>
                            </tr>
                        </thead>
                        <tbody id="shopping-requests-closed-body">
                            <tr><td colspan="7" style="text-align:center;">Sin solicitudes cerradas.</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="shopping-column">
                <h4 class="panel-upcoming-title" style="margin-bottom:8px;">Detalle de compra e ingreso</h4>
                <div id="shopping-request-detail-header" class="product-status-box">Selecciona una solicitud cerrada para ver el detalle.</div>
                <div class="product-table-wrap">
                    <table class="venta-table product-table" style="margin:0;">
                        <thead>
                            <tr>
                                <th>Estado</th>
                                <th>C&oacute;digo</th>
                                <th>Producto</th>
                                <th>Solicitado</th>
                                <th>Recibido</th>
                                <th>Pendiente</th>
                            </tr>
                        </thead>
                        <tbody id="shopping-request-detail-body">
                            <tr><td colspan="6" style="text-align:center;">Sin detalle para mostrar.</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </section>

    <datalist id="shopping-product-options"></datalist>
</div>

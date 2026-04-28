<div id="inventory-panel" class="panel">
    <h1>Inventario</h1>

    <!-- Botones Agregar, Ajustar y Movimientos -->
    <div class="form-row form-actions" style="margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
        <button class="btn" type="button" id="inventory-nuevo-btn" onclick="showInventoryNuevo()" style="min-width: 110px; width: auto;">Agregar</button>
        <button class="btn" type="button" id="inventory-ajustar-btn" onclick="showInventoryAjustar()" style="min-width: 110px; width: auto;">Ajustar</button>
        <button class="btn" type="button" id="inventory-movimientos-btn" onclick="showInventoryMovimientos()" style="min-width: 160px; width: auto; white-space: nowrap;">Movimientos</button>
    </div>

    <!-- Contenido para Nuevo -->
    <div id="inventory-nuevo-content" class="hidden">
        <section class="inventory-section">
            <h3>Consulta por c&oacute;digo</h3>
            <div class="form-row">
                <label>Escanear o ingresar c&oacute;digo</label>
                <input
                    type="text"
                    id="inventory-code-input"
                    list="inventory-search-options"
                    placeholder="Escanea c&oacute;digo o escribe nombre del producto"
                    oninput="inventorySearchSuggest(this.value)"
                    onkeydown="if(event.key==='Enter'){event.preventDefault();loadInventoryProductByCode();}"
                >
            </div>
            <div class="form-row form-actions">
                <button class="btn inv-btn-search" type="button" onclick="loadInventoryProductByCode()">Buscar</button>
                <button class="btn inv-btn-clear" type="button" onclick="clearInventoryView()">Limpiar</button>
            </div>
            <div id="inventory-feedback" class="product-status-box">Escanea un producto para consultar inventario.</div>
        </section>

        <div id="inventory-edit-panels" class="inventory-edit-panels hidden">
            <!-- Panel de edici&oacute;n para Nuevo (reposici&oacute;n) -->
            <section class="inventory-section inventory-edit-panel">
                <h3>Agregar mercanc&iacute;a</h3>
                <div class="form-row"><label>Existencia actual</label><input type="text" id="inventory-stock-current" readonly></div>
                <div class="form-row"><label>Cantidad a agregar</label><input type="number" id="inventory-restock-qty" min="0" step="1" placeholder="Cantidad positiva"></div>
                <div class="form-row"><label>Costo</label><input type="number" id="inventory-product-cost" step="1"></div>
                <div class="form-row"><label>Ganancia (%)</label><input type="number" id="inventory-product-profit" step="0.01"></div>
                <div class="form-row"><label>Precio venta</label><input type="number" id="inventory-product-sale" step="1"></div>
                <div class="form-row"><label>Stock m&iacute;nimo</label><input type="number" id="inventory-stock-min" min="0" step="1"></div>
                <div class="form-row"><label>Stock m&aacute;ximo</label><input type="number" id="inventory-stock-max" min="0" step="1"></div>
            </section>
        </div>

        <div id="inventory-footer-actions" class="form-row form-actions hidden">
            <button class="btn inv-btn-save" type="button" id="inventory-save-btn" onclick="saveInventoryChanges()" disabled>Guardar cambios</button>
            <button class="btn inv-btn-cancel" type="button" onclick="cancelInventoryEdition()">Cancelar</button>
        </div>
    </div>

    <!-- Contenido para Ajustar -->
    <div id="inventory-ajustar-content" class="hidden">
        <section class="inventory-section">
            <h3>Consulta por c&oacute;digo</h3>
            <div class="form-row">
                <label>Escanear o ingresar c&oacute;digo</label>
                <input
                    type="text"
                    id="inventory-adjust-code-input"
                    list="inventory-adjust-search-options"
                    placeholder="Escanea c&oacute;digo o escribe nombre del producto"
                    oninput="inventoryAdjustSearchSuggest(this.value)"
                    onkeydown="if(event.key==='Enter'){event.preventDefault();loadInventoryAdjustProductByCode();}"
                >
            </div>
            <div class="form-row form-actions">
                <button class="btn inv-btn-search" type="button" onclick="loadInventoryAdjustProductByCode()">Buscar</button>
                <button class="btn inv-btn-clear" type="button" onclick="clearInventoryAdjustView()">Limpiar</button>
            </div>
            <div id="inventory-adjust-feedback" class="product-status-box">Escanea un producto para ajustar inventario.</div>
        </section>

        <div id="inventory-adjust-panels" class="inventory-edit-panels hidden">
            <section class="inventory-section inventory-adjust-panel">
                <h3>Ajuste de inventario</h3>
                <div class="form-row"><label>Existencia actual</label><input type="text" id="inventory-adjust-stock-current" readonly></div>
                <div class="form-row"><label>Ajuste (positivo o negativo)</label><input type="number" id="inventory-adjust-qty" step="1" placeholder="Ej: 10 o -5"></div>
                <div class="form-row"><label>Nueva existencia</label><input type="number" id="inventory-adjust-new-stock" step="1" placeholder="Existencia final"></div>
                <div class="form-row"><label>Especificaci&oacute;n (opcional)</label><input type="text" id="inventory-adjust-note" maxlength="255" placeholder="Motivo o detalle del ajuste"></div>
                <div class="form-row"><label>Costo</label><input type="number" id="inventory-adjust-cost" step="1"></div>
                <div class="form-row"><label>Ganancia (%)</label><input type="number" id="inventory-adjust-profit" step="0.01"></div>
                <div class="form-row"><label>Precio venta</label><input type="number" id="inventory-adjust-sale" step="1"></div>
            </section>
        </div>

        <div id="inventory-adjust-footer-actions" class="form-row form-actions hidden">
            <button class="btn inv-btn-save" type="button" id="inventory-adjust-save-btn" onclick="saveInventoryAdjustChanges()" disabled>Guardar ajuste</button>
            <button class="btn inv-btn-cancel" type="button" onclick="cancelInventoryAdjustEdition()">Cancelar</button>
        </div>
    </div>

    <!-- Contenido para Movimientos -->
    <div id="inventory-movimientos-content" class="hidden">
        <section class="inventory-section">
            <h3>Movimientos de inventario</h3>
            <div class="form-row"><label>Desde</label><input type="date" id="inventory-mov-from"></div>
            <div class="form-row"><label>Hasta</label><input type="date" id="inventory-mov-to"></div>
            <div class="form-row">
                <label>Caja</label>
                <select id="inventory-mov-caja">
                    <option value="all">Todas</option>
                </select>
            </div>
            <div class="form-row">
                <label>Tipo de movimiento</label>
                <select id="inventory-mov-type">
                    <option value="all">Todos</option>
                    <option value="ajuste">Ajustes</option>
                    <option value="venta">Salidas de productos (ventas)</option>
                    <option value="modificacion">Ingreso de mercader&iacute;a (modificaci&oacute;n)</option>
                    <option value="top_sold">Productos m&aacute;s vendidos</option>
                </select>
            </div>
            <div class="form-row form-actions">
                <button class="btn inv-btn-search" type="button" onclick="loadInventoryMovements()">Buscar</button>
                <button class="btn inv-btn-clear" type="button" onclick="clearInventoryMovementsView()">Limpiar</button>
            </div>
            <div id="inventory-mov-feedback" class="product-status-box">Selecciona filtros y consulta movimientos.</div>
        </section>

        <section class="inventory-section">
            <div style="max-height: 420px; overflow: auto; border: 1px solid #d1d5db; border-radius: 8px;">
                <table class="venta-table" style="margin: 0;">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Caja</th>
                            <th>C&oacute;digo</th>
                            <th>Producto</th>
                            <th>Tipo</th>
                            <th>Anterior</th>
                            <th>Ajuste (+/-)</th>
                            <th>Nueva</th>
                            <th>Especificaci&oacute;n</th>
                            <th>Usuario</th>
                        </tr>
                    </thead>
                    <tbody id="inventory-movements-body">
                        <tr><td colspan="10" style="text-align:center;">Sin movimientos para mostrar.</td></tr>
                    </tbody>
                </table>
            </div>
        </section>
    </div>

    <datalist id="inventory-search-options"></datalist>
    <datalist id="inventory-adjust-search-options"></datalist>
</div>

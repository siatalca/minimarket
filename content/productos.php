<link rel="stylesheet" href="./css/panel.css?v=20260320k">

<div id="products-panel" class="panel">
    <h1>Productos</h1>

    <nav class="panel-grid products-nav-grid">
        <button class="btn" type="button" onclick="showSectioninventario('add')">Nuevo</button>
        <button class="btn" type="button" onclick="showSectioninventario('modify')">Modificar</button>
        <button class="btn" type="button" onclick="showSectioninventario('remove')">Eliminar</button>
        <button class="btn" type="button" onclick="showSectioninventario('dep')">Departamentos</button>
        <button class="btn" type="button" onclick="showSectioninventario('promo')">Promociones</button>
        <button class="btn" type="button" onclick="showSectioninventario('import')">Importar / Exportar</button>
        <button class="btn" type="button" onclick="showSectioninventario('catalog')">Cat&aacute;logo</button>
    </nav>

    <section id="add" class="hidden product-section">
        <h3>Nuevo producto</h3>
        <div class="promo-layout">
            <div class="promo-column">
                <h4 class="panel-upcoming-title" style="margin-bottom:8px;">Datos del producto</h4>
                <div class="form-row"><label>C&oacute;digo de barras</label><input type="text" id="product-code" placeholder="C&oacute;digo de barras"></div>
                <div class="form-row"><label>Descripci&oacute;n</label><input type="text" id="product-name" placeholder="Descripci&oacute;n"></div>
                <div class="form-row">
                    <label>Se vende</label>
                    <div class="product-radio-wrap">
                        <label><input type="radio" name="formato_venta" id="radio-unidad" value="unidad" checked> Unidad</label>
                        <label><input type="radio" name="formato_venta" id="radio-kilo" value="granel"> Granel</label>
                        <label><input type="radio" name="formato_venta" id="radio-pack" value="pack"> Pack</label>
                    </div>
                </div>
                <div class="form-row"><label>Costo</label><input type="number" id="product-costo" placeholder="Costo"></div>
                <div class="form-row"><label>Ganancia (%)</label><input type="number" id="product-ganancia" placeholder="Ganancia %"></div>
                <div class="form-row"><label>Precio venta</label><input type="number" id="product-price" placeholder="Precio venta"></div>
                <div class="form-row"><label>Departamento</label><select id="product-department-add"></select></div>
                <div class="form-row"><label>Proveedor asignado</label><select id="product-supplier"><option value="">Sin proveedor</option></select></div>
                <div class="form-row"><label><input type="checkbox" id="product-tax-exempt"> Exento de IVA</label></div>
            </div>
            <div class="promo-column">
                <h4 class="panel-upcoming-title" style="margin-bottom:8px;">Inventario</h4>
                <div class="form-row"><label><input type="checkbox" id="product-use-inventory"> Este producto utiliza inventario</label></div>
                <div class="form-row"><label>Hay</label><input type="number" id="product-quantity" placeholder="Cantidad"></div>
                <div class="form-row"><label>M&iacute;nima</label><input type="number" id="product-quantity-min" placeholder="Cantidad m&iacute;nima"></div>
                <div class="form-row"><label>M&aacute;xima</label><input type="number" id="product-quantity-max" placeholder="Cantidad m&aacute;xima"></div>
            </div>
        </div>
        <div class="form-row form-actions">
            <button class="btn" type="button" onclick="addProduct()">Guardar</button>
            <button class="btn" type="button" onclick="clearProductAddForm()">Limpiar</button>
            <button class="btn" type="button" onclick="cancelProductOperation('add')">Cancelar</button>
        </div>
        <div id="product-add-feedback" class="product-status-box hidden"></div>
    </section>

    <section id="modify" class="hidden product-section">
        <h3>Modificar producto</h3>
        <div class="form-row">
            <label>Escanear o buscar (c&oacute;digo o descripci&oacute;n)</label>
            <input type="text" id="product-modify-search" list="product-search-options" placeholder="Escanea c&oacute;digo o escribe nombre y presiona Enter" onkeydown="if(event.key==='Enter'){event.preventDefault();loadProductForModify();}">
        </div>
        <div id="product-modify-empty-state" class="product-status-box">Ingresa o escanea un c&oacute;digo para cargar el producto.</div>
        <div id="product-modify-form-body" class="hidden">
            <div class="form-row"><label>C&oacute;digo de barras</label><input type="text" id="product-edit-code" placeholder="C&oacute;digo de barras"></div>
            <div class="form-row"><label>Descripci&oacute;n</label><input type="text" id="product-edit-name"></div>
            <div class="form-row">
                <label>Se vende</label>
                <div class="product-radio-wrap">
                    <label><input type="radio" name="formato_venta_edit" id="radio-edit-unidad" value="unidad"> Unidad</label>
                    <label><input type="radio" name="formato_venta_edit" id="radio-edit-kilo" value="granel"> Granel</label>
                    <label><input type="radio" name="formato_venta_edit" id="radio-edit-pack" value="pack"> Pack</label>
                </div>
            </div>
            <div class="form-row"><label>Costo</label><input type="number" id="product-edit-cost"></div>
            <div class="form-row"><label>Ganancia (%)</label><input type="number" id="product-edit-profit"></div>
            <div class="form-row"><label>Precio venta</label><input type="number" id="product-edit-price"></div>
            <div class="form-row"><label>Departamento</label><select id="product-department-edit"></select></div>
            <div class="form-row"><label>Proveedor asignado</label><select id="product-supplier-edit"><option value="">Sin proveedor</option></select></div>
            <div class="form-row"><label><input type="checkbox" id="product-edit-tax-exempt"> Exento de IVA</label></div>
            <div class="form-row"><label><input type="checkbox" id="product-edit-use-inventory"> Habilitar inventario para este producto</label></div>
            <div class="form-row form-actions">
                <button class="btn" type="button" onclick="saveModifiedProduct()">Guardar cambios</button>
                <button class="btn" type="button" onclick="clearProductModifyForm()">Limpiar</button>
                <button class="btn" type="button" onclick="cancelProductOperation('modify')">Cancelar</button>
            </div>
        </div>
    </section>

    <section id="remove" class="hidden product-section">
        <h3>Eliminar producto</h3>
        <div class="form-row">
            <label>Escanear o buscar (c&oacute;digo o descripci&oacute;n)</label>
            <input type="text" id="product-remove-search" list="product-search-options" placeholder="Escanea c&oacute;digo o escribe nombre y presiona Enter" onkeydown="if(event.key==='Enter'){event.preventDefault();loadProductForDelete();}">
        </div>
        <div id="product-remove-info" class="product-status-box">
            Selecciona un producto para eliminar.
        </div>
        <div class="form-row form-actions">
            <button class="btn" type="button" onclick="deleteLoadedProduct()">Eliminar producto</button>
            <button class="btn" type="button" onclick="clearProductDeleteSelection()">Limpiar</button>
        </div>
    </section>

    <section id="dep" class="hidden product-section">
        <h3>Departamentos</h3>
        <div class="promo-layout">
            <div class="promo-column">
                <h4 class="panel-upcoming-title" style="margin-bottom:8px;">Crear departamento</h4>
                <div class="form-row"><label>Nombre departamento</label><input type="text" id="department-name" placeholder="Ej: ABARROTES"></div>
                <div class="form-row form-actions">
                    <button class="btn" type="button" onclick="createDepartment()">Crear departamento</button>
                </div>
            </div>
            <div class="promo-column">
                <h4 class="panel-upcoming-title" style="margin-bottom:8px;">Departamentos existentes</h4>
                <div class="form-row form-actions" style="margin:0 0 8px 0; justify-content:flex-end;">
                    <button class="btn" type="button" onclick="loadDepartmentsView()" title="Recargar departamentos" aria-label="Recargar departamentos" style="min-width:44px; width:44px; padding:0;">
                        <i class="fas fa-rotate-right"></i>
                    </button>
                </div>
                <div class="form-row section-block">
                    <ul id="department-list" class="product-list"></ul>
                </div>
            </div>
        </div>
    </section>

    <section id="promo" class="hidden product-section">
        <h3>Promociones</h3>
        <div class="promo-layout">
            <div class="promo-column">
                <h4 id="promo-form-title" class="panel-upcoming-title" style="margin-bottom:8px;">Crear promoci&oacute;n</h4>
                <div class="form-row"><label>Nombre promoci&oacute;n</label><input type="text" id="promo-name" placeholder="Ej: 3x2 Bebidas"></div>
                <div class="form-row">
                    <label>Tipo de promoci&oacute;n</label>
                    <select id="promo-type" onchange="onPromotionTypeChange()">
                        <option value="single" selected>Por cantidad del mismo producto</option>
                        <option value="combo">Combo de productos distintos</option>
                    </select>
                </div>
                <div class="form-row"><label>Cantidad m&iacute;nima para aplicar</label><input type="number" id="promo-min-qty" min="2" value="2"></div>
                <div class="form-row"><label>Monto total promoci&oacute;n</label><input type="number" id="promo-total-amount" min="1" step="1" placeholder="Ej: 2000"></div>
                <div class="form-row"><label>Descuento (%) calculado</label><input type="number" id="promo-discount" min="0" max="100" value="0" readonly></div>
                <div class="form-row hidden" id="promo-combo-price-row"><label>Precio final del combo</label><input type="number" id="promo-combo-price" min="1" placeholder="Ej: 12000"></div>
                <div class="form-row">
                    <label>Productos disponibles</label>
                    <select id="promo-products" class="product-multi-select"></select>
                </div>
                <div class="form-row section-block">
                    <label>Productos seleccionados para la promoci&oacute;n</label>
                    <ul id="promo-selected-products" class="product-list"></ul>
                </div>
                <div class="form-row form-actions promo-actions-row">
                    <button id="promo-save-btn" class="btn" type="button" onclick="createPromotion()">Guardar promoci&oacute;n</button>
                    <button class="btn" type="button" onclick="clearPromotionForm()">Limpiar formulario</button>
                    <button id="promo-cancel-edit-btn" class="btn hidden" type="button" onclick="cancelPromotionEdit()">Cancelar edici&oacute;n</button>
                </div>
            </div>
            <div class="promo-column">
                <div class="form-row form-actions" style="margin-bottom:8px;">
                    <button class="btn" type="button" onclick="loadPromotions()">Recargar</button>
                </div>
                <div class="form-row section-block">
                    <label>Promociones vigentes</label>
                    <div id="promo-list" class="product-scroll-box">Sin promociones.</div>
                </div>
            </div>
        </div>
    </section>

    <section id="import" class="hidden product-section">
        <h3>Importar / Exportar productos</h3>
        <div class="form-row"><label>Archivo (JSON o CSV)</label><input type="file" id="product-import-file" accept=".json,.csv,text/csv,application/json"></div>
        <div class="form-row form-actions">
            <button class="btn" type="button" onclick="importProductsFile()">Importar productos</button>
            <button class="btn" type="button" data-admin-sia-only="1" onclick="downloadProductsTemplate('csv')">Plantilla CSV</button>
            <button class="btn" type="button" data-admin-sia-only="1" onclick="downloadProductsTemplate('json')">Plantilla JSON</button>
            <button class="btn" type="button" onclick="exportProductsFile('xlsx')">Exportar Excel</button>
            <button class="btn" type="button" data-admin-sia-only="1" onclick="exportProductsDetailedPdf()">Listado PDF detallado</button>
            <button class="btn" type="button" data-admin-sia-only="1" onclick="exportProductsFile('csv')">Respaldo CSV</button>
            <button class="btn" type="button" data-admin-sia-only="1" onclick="exportProductsFile('json')">Respaldo JSON</button>
        </div>
        <div id="product-import-status" class="product-status-box">Sin operaciones recientes.</div>
    </section>

    <section id="catalog" class="hidden product-section">
        <h3>Cat&aacute;logo de productos</h3>
        <div class="form-row form-actions">
            <button class="btn" type="button" onclick="loadCatalogTable()">Recargar cat&aacute;logo</button>
            <button class="btn" type="button" onclick="editSelectedCatalogProduct()">Editar seleccionado</button>
        </div>
        <div class="form-row">
            <label for="catalog-search-input">Buscar por c&oacute;digo o descripci&oacute;n</label>
            <input type="text" id="catalog-search-input" placeholder="Escribe c&oacute;digo o descripci&oacute;n" oninput="filterCatalogTable(this.value)">
        </div>
        <div class="product-table-wrap">
            <table class="venta-table product-table" style="margin:0;">
                <thead>
                    <tr>
                        <th style="width:50px;">Sel.</th>
                        <th>C&oacute;digo</th>
                        <th>Descripci&oacute;n</th>
                        <th>Precio</th>
                        <th>Stock</th>
                        <th>Inventario</th>
                        <th>Proveedor</th>
                    </tr>
                </thead>
                <tbody id="catalog-table-body">
                    <tr><td colspan="7" style="text-align:center;">Sin datos.</td></tr>
                </tbody>
            </table>
        </div>
    </section>

    <datalist id="product-search-options"></datalist>
</div>




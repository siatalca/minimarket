<!-- ============  VENTA - TicketÂ 1  ============ -->

<div class="panel"><!-- hereda caja blanca con sombra -->
    <div class="sales-session-strip">
        <div class="sales-session-item"><strong>Caja:</strong> <span id="sales-status-caja">-</span></div>
        <div class="sales-session-item"><strong>Cajero:</strong> <span id="sales-status-cajero">-</span></div>
        <div class="sales-session-item"><strong>Turno:</strong> <span id="sales-status-turno">Sin iniciar</span></div>
    </div>

    <h1 class="panel-title">VENTA - Ticket <span id="nticket">1</span></h1>

    <!-- FILA: Código + botón -->
    <div class="form-row sales-scan-row">
        <label for="barcode" class="form-label">Código de producto</label>
        <input type="text" id="barcode" list="sales-barcode-suggestions" class="form-input"  autocomplete="off" oninput="if (typeof handleBarcodeInputSanitize === 'function') { handleBarcodeInputSanitize(this); } if (typeof updateSalesBarcodeSuggestions === 'function') { updateSalesBarcodeSuggestions(this.value); }" onchange="if (typeof handleSalesBarcodeSelectionChange === 'function') { handleSalesBarcodeSelectionChange(this.value); }" onkeydown="if (typeof handleBarcodeKeydown === 'function') { handleBarcodeKeydown(event, this); }" placeholder="Escanea o ingresa el código">
        <datalist id="sales-barcode-suggestions"></datalist>
        <button id="searchCode" type="button" class="btn sales-scan-btn" onclick="addToCart()">ENTER - Agregar producto</button>
        <button id="sales-camera-scan-btn" class="btn sales-scan-btn sales-mobile-camera-btn" type="button" onclick="openSalesCameraScanPopup()">Escanear cámara</button>
    </div>
    <div class="sales-pending-inline-strip hidden">
        <div id="sales-pending-ticket-strip" class="sales-pending-inline-track" aria-label="Lista de tickets pendientes"></div>
    </div>
    <!-- TABLA DE CARRITO -->
    <div style="width: 100%; ">
        <div style=" padding:0px 0px 0px 0px;">
            <table class="ventas-quick-actions">
                <tr>
                    <td class="quick-cell"><button id="sales-common-product-btn" data-permission-key="ventas_producto_comun" data-permission-mode="hide" class="btn btn2 quick-action-btn" type="button" onclick="openCommonProductPopup()">0 + ENTER Art. común</button></td>
                    <td class="quick-cell"><button id="sales-search-product-btn" data-permission-key="ventas_buscar_producto" data-permission-mode="hide" class="btn btn2 quick-action-btn" type="button" onclick="openSearchProductPopup()">F10 Buscar</button></td>
                    <td class="quick-cell"><button id="sales-pending-ticket-btn" class="btn btn2 quick-action-btn" type="button" onclick="leaveCurrentTicketAsPending()">F5 Pendiente</button></td>
                    <td class="quick-cell"><button id="sales-resume-ticket-btn" class="btn btn2 quick-action-btn" type="button" onclick="openPendingTicketsPopup()">F6 Retomar</button></td>
                    <td class="quick-cell"><button id="sales-cash-entry-btn" data-permission-key="ventas_entrada_efectivo" data-permission-mode="disable" class="btn btn2 quick-action-btn" type="button" onclick="openCashEntryPopup()">F7 Entradas</button></td>
                    <td class="quick-cell"><button id="sales-cash-exit-btn" data-permission-key="ventas_salida_efectivo" data-permission-mode="disable" class="btn btn2 quick-action-btn" type="button" onclick="openCashExitPopup()">F8 Salidas</button></td>
                    <td class="quick-cell"><button id="sales-remove-item-btn" data-permission-key="ventas_eliminar_articulo" data-permission-mode="disable" class="btn btn2 quick-action-btn" type="button" onclick="removeSelectedCartItem()">DEL Borrar</button></td>
                    <td class="quick-cell"><button id="sales-price-check-btn" class="btn btn2 quick-action-btn" type="button" onclick="openPriceCheckPopup()">F9 Verificador</button></td>
                </tr>
            </table>
        </div>
        <div>
            <div class="carrito">
                <table class="venta-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Descripción</th>
                            <th>Precio Unit.</th>
                            <th>Cant.</th>
                            <th>Monto descuento (% aprox)</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody id="cart-table-body"><!-- filas dinámicas --></tbody>
                </table>
            </div>
            <div>
                <table class="venta-table">
                    <tr>
                        <td colspan="7" class="tot-label">
                            <strong>Total:</strong>
                        </td>
                        <td style="width:300px; min-width:300px;">
                            <div class="sales-action-stack">
                                <div id="total-amount"><b>$0</b></div>
                                <div id="total-savings" class="hidden" style="font-size:12px; color:#1a7f37; margin-top:4px;"></div>
                            </div>
                        </td>
                    </tr>
                </table>
                <div class="sales-bottom-actions">
                    <button id="open-finalize-popup-btn" data-permission-key="ventas_cobrar_ticket" data-permission-mode="disable" class="btn btn2 finalize-main-btn" onclick="mostrarPopUp('miPopUp')" disabled><b>F12 - Cobrar</b></button>
                    <button id="sales-reprint-last-btn" data-permission-key="ventas_cobrar_ticket" data-permission-mode="disable" class="btn btn2 finalize-main-btn" type="button" onclick="reprintLastSaleTicketOrInvoice()">Reimprimir &uacute;ltimo</button>
                    <button id="sales-session-history-btn" data-permission-key="ventas_historial" data-permission-mode="disable" class="btn btn2 finalize-main-btn" type="button" onclick="openSalesSessionHistoryPopup()">Ultimas ventas</button>
                </div>
                <div id="sales-last-ticket-card" class="sales-last-ticket-card">
                    <span class="sales-last-ticket-title">Ultimo ticket vendido</span>
                    <div class="sales-last-ticket-inline">
                        <span class="sales-last-ticket-inline-item"><span class="sales-last-ticket-label">Ticket:</span><strong id="sales-last-ticket-folio">-</strong></span>
                        <span class="sales-last-ticket-inline-item"><span class="sales-last-ticket-label">Forma de pago:</span><strong id="sales-last-ticket-method">-</strong></span>
                        <span class="sales-last-ticket-inline-item"><span class="sales-last-ticket-label">Monto:</span><strong id="sales-last-ticket-amount">$0</strong></span>
                        <span class="sales-last-ticket-inline-item"><span class="sales-last-ticket-label">Vuelto:</span><strong id="sales-last-ticket-change">$0</strong></span>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- POPUP: Tickets pendientes -->
    <div id="pendingTicketsPopUp" class="hidden">
        <div class="contenidoPopUp pending-tickets-popup-content">
            <div class="popup-titulo">
                <p class="popup-titulo-texto">Ventas: Tickets pendientes</p>
                <button class="popup-cerrar" type="button" onclick="closePendingTicketsPopup()">
                    <p>X</p>
                </button>
            </div>
            <div class="popup-body pending-tickets-popup-body">
                <div class="popup-metodo pending-tickets-popup-panel">
                    <div class="popup-subtitulo">Selecciona un ticket para retomarlo</div>
                    <div class="product-table-wrap pending-tickets-table-wrap">
                        <table class="venta-table" style="margin:0;">
                            <thead>
                                <tr>
                                    <th>Ticket</th>
                                    <th>Productos</th>
                                    <th>Total</th>
                                    <th>Creado</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody id="pending-tickets-body">
                                <tr>
                                    <td colspan="5" style="text-align:center;">No hay tickets pendientes.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- TABLA METODO -->
    <div id="miPopUp" class="hidden">
        <div class="contenidoPopUp">
            <!--titulo-->
            <div class="popup-titulo">
                <p class="popup-titulo-texto">Venta de productos: Cobrar</p>
                <button class="popup-cerrar" onclick="cerrarPopUp('miPopUp')">
                    <p>X</p>
                </button>
            </div>

            <div class="popup-body">
                <!--frame metodo de pago-->
                <div class="popup-metodo">
                    <!--subtitulo-->
                    <div class="popup-subtitulo">
                        COBRAR
                    </div>
                    <!--monto a pagar-->
                    <div class="popup-monto">
                        <p id="montoAPagar">$0</p>
                    </div>
                    <!--seleccion de metodo de pago-->
                    <div class="popup-metodos">
                        <div class="tabss">
                            <div class="tab active" data-tab="efectivo" data-payment-method="efectivo">
                                <div class="tab-img"><img src="./img/efectivo.png"></div>
                                <div class="tab-texto"><span>Efectivo</span></div>
                            </div>
                            <div class="tab" data-tab="tarjeta" data-payment-method="tarjeta">
                                <div class="tab-img"><img src="./img/tarjeta-credito.png"></div>
                                <div class="tab-texto"><span>Tarjeta</span></div>
                            </div>
                            <div class="tab" data-tab="mixto" data-payment-method="mixto">
                                <div class="tab-img"><img src="./img/mixto.png"></div>
                                <div class="tab-texto"><span>Mixto</span></div>
                            </div>
                            <div class="tab" data-tab="dolares" data-payment-method="dolares">
                                <div class="tab-img"><img src="./img/dolar.png"></div>
                                <div class="tab-texto"><span>Dólares</span></div>
                            </div>
                            <div class="tab" data-tab="transferencia" data-payment-method="transferencia">
                                <div class="tab-img"><img src="./img/transferencia.png"></div>
                                <div class="tab-texto"><span>Transferencia</span></div>
                            </div>
                            <div class="tab" data-tab="cheque" data-payment-method="cheque">
                                <div class="tab-img"><img src="./img/cheque.png"></div>
                                <div class="tab-texto"><span>Cheque</span></div>
                            </div>
                            <div class="tab" data-tab="vale" data-payment-method="vale">
                                <div class="tab-img"><img src="./img/vale.png"></div>
                                <div class="tab-texto"><span>Vale</span></div>
                            </div>
                        </div>
                    </div>
                    <!--detalle del metodo de pago-->
                    <div class="div-tab">
                        <!--efectivo metodo de pago-->
                        <div id="efectivo" class="tab-metodo-pago-content active" data-payment-method="efectivo">
                            <div class="parent">
                                <div class="div1">Pagó con:</div>
                                <div class="div2"><input id="efectivoEfectivo" type="text" min="0" placeholder="0"></div>
                                <div class="div3">Su cambio:</div>
                                <div class="div4"><input id="cambioEfectivo" type="text" readonly></div>
                            </div>
                            <!-- <p>Pagó con: <input type="text"></p>
                            <p>Su cambio: <input type="text"></p>-->
                        </div>
                        <!--tarjeta metodo de pago-->
                        <div id="tarjeta" class="tab-metodo-pago-content" data-payment-method="tarjeta">

                            <div class="parent">
                                <div class="div1">Referencia:</div>
                                <div class="div2"><input id="referenciaTarjeta" type="text" placeholder=""></div>
                            </div>
                            <!-- <p>Referencia: <input type="text"></p>-->
                        </div>
                        <!--mixto metodo de pago-->
                        <div id="mixto" class="tab-metodo-pago-content" data-payment-method="mixto">
                            <div class="parent">
                                <div class="div3">Tarjeta:</div>
                                <div class="div4"><input id="tarjetaMixto" type="text" min="0" placeholder="0"></div>
                                <div class="div1">Efectivo:</div>
                                <div class="div2"><input id="efectivoMixto" type="text" min="0" placeholder="0"></div>
                                <div class="div5">Su cambio:</div>
                                <div class="div6"><input id="cambioMixto" type="text" readonly></div>
                            </div>
                        </div>
                        <div id="dolares" class="tab-metodo-pago-content" data-payment-method="dolares">
                            <div class="parent">
                                <div class="div1">Referencia:</div>
                                <div class="div2"><input id="referenciaDolares" type="text" placeholder=""></div>
                            </div>
                        </div>
                        <div id="transferencia" class="tab-metodo-pago-content" data-payment-method="transferencia">
                            <div class="parent">
                                <div class="div1">Referencia:</div>
                                <div class="div2"><input id="referenciaTransferencia" type="text" placeholder=""></div>
                            </div>
                        </div>
                        <div id="cheque" class="tab-metodo-pago-content" data-payment-method="cheque">
                            <div class="parent">
                                <div class="div1">Número de cheque:</div>
                                <div class="div2"><input id="referenciaCheque" type="text" placeholder=""></div>
                            </div>
                        </div>
                        <div id="vale" class="tab-metodo-pago-content" data-payment-method="vale">
                            <div class="parent">
                                <div class="div1">Folio/Referencia:</div>
                                <div class="div2"><input id="referenciaVale" type="text" placeholder=""></div>
                            </div>
                        </div>
                    </div>
                </div>
                <!--frame finalizar venta-->
                <div class="popup-finalizar">
                    <p id="payment-warning" class="payment-warning hidden"></p>
                    <button id="finalize-sale-btn" data-permission-key="ventas_cobrar_ticket" data-permission-mode="disable" class="btn2" onclick="finalizeSale(true)">F1 Finalizar + comprobante</button>
                    <button id="finalize-no-receipt-btn" data-permission-key="ventas_cobrar_ticket" data-permission-mode="disable" class="btn2" type="button" onclick="finalizeSale(false)">F2 Finalizar sin comprobante</button>
                    <button id="cancel-sale-popup-btn" class="btn2" type="button" onclick="cerrarPopUp('miPopUp')">Esc Cancelar</button>
                </div>
            </div>
        </div>
    </div>

    <div id="commonProductPopUp" class="hidden" style="position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:9999; align-items:center; justify-content:center;">
        <div class="contenidoPopUp" style="width:min(500px,90vw); max-width:500px; height:250px; margin:0; display:flex; flex-direction:column;">
            <div class="popup-titulo">
                <p class="popup-titulo-texto">Producto Común</p>
                <button class="popup-cerrar" type="button" onclick="closeCommonProductPopup()">
                    <p>X</p>
                </button>
            </div>
            <div class="popup-body" style="padding:10px 14px; display:grid; grid-template-columns:1fr 1fr; gap:10px 12px; align-items:end; flex:1;">
                <div class="form-row" style="display:flex; flex-direction:column; gap:6px; margin:0; grid-column:1 / 3; align-items:center;">
                    <label for="common-product-name">Nombre</label>
                    <input id="common-product-name" type="text" class="form-input" maxlength="60" placeholder="Producto Comun" style="height:34px; width:80%;" onkeydown="if (typeof handleCommonProductPopupKeydown === 'function') { handleCommonProductPopupKeydown(event); }">
                </div>
                <div class="form-row" style="display:flex; flex-direction:column; gap:6px; margin:0; align-items:center;">
                    <label for="common-product-price">Precio unitario</label>
                    <input id="common-product-price" type="number" min="1" step="1" class="form-input" placeholder="0" style="height:34px; width:40%;" onkeydown="if (typeof handleCommonProductPopupKeydown === 'function') { handleCommonProductPopupKeydown(event); }">
                </div>
                <div class="form-row" style="display:flex; flex-direction:column; gap:6px; margin:0; align-items:center;">
                    <label for="common-product-qty">Cantidad</label>
                    <input id="common-product-qty" type="number" min="1" step="1" class="form-input" value="1" style="height:34px; width:40%;" onkeydown="if (typeof handleCommonProductPopupKeydown === 'function') { handleCommonProductPopupKeydown(event); }">
                </div>
                <div style="display:flex; justify-content:center; gap:8px; grid-column:1 / 3; padding-top:4px;">
                    <button class="btn2" type="button" onclick="closeCommonProductPopup()" style="height:30px; padding:4px 10px; min-width:92px; font-size:12px;">Cancelar</button>
                    <button class="btn2" type="button" onclick="addCommonProductToCart()" style="height:30px; padding:4px 10px; min-width:92px; font-size:12px;">Agregar</button>
                </div>
            </div>
        </div>
    </div>

    <div id="bulkProductPopUp" class="hidden" style="position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:9999; align-items:center; justify-content:center;">
        <div class="contenidoPopUp bulk-popup-content">
            <div class="popup-titulo">
                <p class="popup-titulo-texto">Producto granel</p>
                <button class="popup-cerrar" type="button" onclick="closeBulkProductPopup()">
                    <p>X</p>
                </button>
            </div>
            <div class="popup-body bulk-popup-body">
                <div class="product-status-box bulk-popup-status">
                    <div><strong id="bulk-product-name">Producto</strong></div>
                    <div id="bulk-product-price-kg">$0 / kg</div>
                    <div id="bulk-product-stock" style="font-size:12px; color:#334155;">Stock: -</div>
                </div>
                <div class="form-row bulk-popup-inputs">
                    <div class="bulk-popup-field">
                        <label for="bulk-product-grams">Cantidad (gramos)</label>
                        <input id="bulk-product-grams" type="number" min="0" step="1" class="form-input" placeholder="Ej: 500">
                    </div>
                    <div class="bulk-popup-field">
                        <label for="bulk-product-total">Monto total</label>
                        <input id="bulk-product-total" type="text" inputmode="numeric" class="form-input" placeholder="Ej: 1200">
                    </div>
                </div>
                <div class="form-row bulk-popup-field">
                    <label for="bulk-product-kg">Cantidad equivalente (kg)</label>
                    <input id="bulk-product-kg" type="text" class="form-input" readonly style="background:#f8fafc;">
                </div>
                <div class="bulk-popup-actions">
                    <button class="btn2" type="button" onclick="closeBulkProductPopup()">Cancelar</button>
                    <button class="btn2" type="button" onclick="confirmBulkProductToCart()">Agregar</button>
                </div>
            </div>
        </div>
    </div>

    <div id="searchProductPopUp" class="hidden" style="position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:9999; align-items:center; justify-content:center;">
        <div class="contenidoPopUp" style="width:min(780px,95vw); max-width:780px; margin:0; display:flex; flex-direction:column;">
            <div class="popup-titulo">
                <p class="popup-titulo-texto">Buscar producto</p>
                <button class="popup-cerrar" type="button" onclick="closeSearchProductPopup()">
                    <p>X</p>
                </button>
            </div>
            <div class="popup-body" style="padding:12px; display:flex; gap:12px; align-items:stretch;">
                <div style="flex:1; min-width:0;">
                    <div class="form-row" style="display:flex; flex-direction:column; gap:6px; margin-bottom:10px;">
                        <label for="search-product-input">Nombre</label>
                        <input id="search-product-input" type="text" class="form-input" placeholder="Escribe para buscar..." oninput="searchProductsSuggestions(this.value)" style="width:100%; box-sizing:border-box;">
                    </div>
                    <div style="max-height:260px; overflow:auto; border:1px solid #d1d5db; border-radius:8px;">
                        <table class="venta-table" style="margin:0;">
                            <thead>
                                <tr>
                                    <th style="width:52%;">Producto</th>
                                    <th style="width:20%;">Precio</th>
                                    <th style="width:18%;">Stock</th>
                                    <th style="width:10%;">Sel.</th>
                                </tr>
                            </thead>
                            <tbody id="search-product-results-body">
                                <tr><td colspan="4" style="text-align:center;">Escribe para buscar productos.</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div style="width:190px; border-left:1px solid #e5e7eb; padding:0 12px; display:flex; flex-direction:column; justify-content:flex-start; gap:8px;">
                    <button class="btn2" type="button" onclick="addSelectedSearchedProductToCart()" style="height:30px; padding:4px 10px; font-size:12px; width:100%; min-width:0;">Agregar</button>
                    <button class="btn2" type="button" onclick="closeSearchProductPopup()" style="height:30px; padding:4px 10px; font-size:12px; width:100%; min-width:0;">Cerrar</button>
                </div>
            </div>
        </div>
    </div>

    <div id="cashEntryPopUp" class="hidden" style="position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:9999; align-items:center; justify-content:center;">
        <div class="contenidoPopUp" style="width:min(380px,92vw); max-width:380px; height:min(250px,70vh); max-height:250px; margin:0; display:flex; flex-direction:column;">
            <div class="popup-titulo">
                <p class="popup-titulo-texto">Ingreso de dinero</p>
                <button class="popup-cerrar" type="button" onclick="closeCashEntryPopup()">
                    <p>X</p>
                </button>
            </div>
            <div class="popup-body" style="padding:8px 12px; display:flex; flex-direction:column; justify-content:space-between; align-items:center; flex:1;">
                <div class="form-row" style="display:flex; flex-direction:column; gap:4px; margin:0; align-items:center; width:100%;">
                    <label for="cash-entry-amount">Monto de ingreso</label>
                    <input id="cash-entry-amount" type="text" inputmode="numeric" autocomplete="off" class="form-input" placeholder="0" style="width:80%; height:30px;" oninput="if (typeof handleBarcodeInputSanitize === 'function') { handleBarcodeInputSanitize(this); }">
                </div>
                <div class="form-row" style="display:flex; flex-direction:column; gap:4px; margin:0; align-items:center; width:100%;">
                    <label for="cash-entry-kind">Tipo de ingreso</label>
                    <select id="cash-entry-kind" class="form-input" style="width:80%; height:32px;" onchange="updateCashEntryDescriptionVisibility()">
                        <option value="sencillo">Sencillo</option>
                        <option value="otro">Otro</option>
                    </select>
                </div>
                <div id="cash-entry-description-wrapper" class="form-row hidden" style="display:flex; flex-direction:column; gap:4px; margin:0; align-items:center; width:100%;">
                    <label for="cash-entry-description">Descripcion</label>
                    <input id="cash-entry-description" type="text" maxlength="255" class="form-input" placeholder="Ej: ingreso adicional" style="width:80%; height:30px;">
                </div>
                <div style="display:flex; justify-content:center; gap:8px; width:100%;">
                    <button class="btn2" type="button" onclick="saveCashEntry()" style="height:28px; padding:4px 10px; min-width:80px; font-size:12px; width:80%;">Guardar</button>
                </div>
            </div>
        </div>
    </div>
    <div id="cashExitPopUp" class="hidden" style="position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:9999; align-items:center; justify-content:center;">
        <div class="contenidoPopUp" style="width:min(620px,94vw); max-width:620px; height:min(340px,82vh); max-height:340px; margin:0; display:flex; flex-direction:column;">
            <div class="popup-titulo">
                <p class="popup-titulo-texto">Salida de dinero</p>
                <button class="popup-cerrar" type="button" onclick="closeCashExitPopup()">
                    <p>X</p>
                </button>
            </div>
            <div class="popup-body" style="padding:8px 12px; display:flex; flex-direction:column; justify-content:space-between; align-items:center; flex:1; font-size:18px;">
                <div class="form-row" style="display:flex; flex-direction:column; gap:4px; margin:0; align-items:center; width:100%;">
                    <label for="cash-exit-amount">Monto de salida</label>
                    <input id="cash-exit-amount" type="text" inputmode="numeric" autocomplete="off" class="form-input" placeholder="Monto salida" style="width:90%; height:34px; font-size:18px;" oninput="if (typeof handleBarcodeInputSanitize === 'function') { handleBarcodeInputSanitize(this); }">
                </div>
                <div class="form-row" style="display:flex; flex-direction:column; gap:4px; margin:0; align-items:center; width:100%;">
                    <label for="cash-exit-provider">Se paga a:</label>
                    <div style="display:flex; gap:8px; width:90%;">
                        <select id="cash-exit-provider" class="form-input" style="flex:1; height:34px; font-size:18px;">
                            <option value="">Seleccione proveedor</option>
                        </select>
                        <button class="btn2" type="button" onclick="openCashExitProviderPopup()" title="Agregar proveedor" style="height:34px; padding:2px 4px; min-width:43px; width:43px; font-size:14px;">+</button>
                    </div>
                </div>
                <div class="form-row" style="display:flex; flex-direction:column; gap:4px; margin:0; align-items:center; width:100%;">
                    <label for="cash-exit-method">Metodo de pago</label>
                    <select id="cash-exit-method" class="form-input" style="width:90%; height:34px; font-size:18px;">
                        <option value="">Seleccione forma de pago</option>
                        <option value="efectivo">Efectivo</option>
                        <option value="transferencia">Transferencia</option>
                    </select>
                </div>
                <div style="display:flex; justify-content:center; gap:8px; width:100%;">
                    <button class="btn2" type="button" onclick="saveCashExit()" style="height:34px; padding:4px 10px; min-width:80px; font-size:16px; width:50%;">Guardar</button>
                </div>
            </div>
        </div>
    </div>
    <div id="cashExitProviderPopUp" class="hidden" style="position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:10000; align-items:center; justify-content:center;">
        <div class="contenidoPopUp" style="width:min(520px,92vw); max-width:520px; height:min(220px,65vh); max-height:220px; margin:0; display:flex; flex-direction:column;">
            <div class="popup-titulo">
                <p class="popup-titulo-texto">Proveedor de salidas</p>
                <button class="popup-cerrar" type="button" onclick="closeCashExitProviderPopup()">
                    <p>X</p>
                </button>
            </div>
            <div class="popup-body" style="padding:8px 12px; display:flex; flex-direction:column; justify-content:space-between; align-items:center; flex:1;">
                <div class="form-row" style="display:flex; flex-direction:column; gap:4px; margin:0; align-items:center; width:100%;">
                    <label for="cash-exit-provider-name">Agregar proveedor de pago</label>
                    <input id="cash-exit-provider-name" type="text" maxlength="120" class="form-input" placeholder="Nombre proveedor" style="width:90%; height:32px;" onkeydown="if (typeof handleCashExitProviderPopupKeydown === 'function') { handleCashExitProviderPopupKeydown(event); }">
                </div>
                <div style="display:flex; justify-content:center; gap:18px; width:90%;">
                    <button class="btn2" type="button" onclick="saveCashExitProvider()" style="height:34px; min-width:160px; font-size:14px; color:#fff; background:#16a34a; border-color:#15803d;">Guardar</button>
                    <button class="btn2" type="button" onclick="closeCashExitProviderPopup()" style="height:34px; min-width:160px; font-size:14px;">Cancelar</button>
                </div>
            </div>
        </div>
    </div>
    <div id="priceCheckPopUp" class="hidden" style="position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:9999; align-items:center; justify-content:center;">
        <div class="contenidoPopUp" style="width:min(400px,92vw); max-width:400px; height:min(220px,65vh); max-height:220px; margin:0; display:flex; flex-direction:column;">
            <div class="popup-titulo">
                <p class="popup-titulo-texto">Consulta de precio</p>
                <button class="popup-cerrar" type="button" onclick="closePriceCheckPopup()">
                    <p>X</p>
                </button>
            </div>
            <div class="popup-body" style="padding:8px 12px; display:flex; flex-direction:column; justify-content:space-between; align-items:center; flex:1;">
                <div class="form-row" style="display:flex; flex-direction:column; gap:4px; margin:0; align-items:center; width:100%;">
                    <label for="price-check-code">Codigo de producto</label>
                    <input id="price-check-code" type="text" autocomplete="off" class="form-input" placeholder="Ej: 7501234567890" style="width:80%; height:30px;" onkeydown="if (event.key === 'Enter'){ lookupProductPrice(); }">
                </div>
                <div style="width:90%; text-align:center;">
                    <div id="price-check-name" style="font-size:13px; min-height:18px;"></div>
                    <div id="price-check-value" style="font-size:30px; font-weight:700; line-height:1.1;">$0</div>
                </div>
                <div style="display:flex; justify-content:center; gap:8px; width:100%;">
                    <button class="btn2" type="button" onclick="lookupProductPrice()" style="height:28px; padding:4px 10px; min-width:80px; font-size:12px; width:80%;">Consultar</button>
                </div>
            </div>
        </div>
    </div>
    <div id="salesHistoryPopUp" class="hidden" style="position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:9999; align-items:center; justify-content:center;">
        <div class="contenidoPopUp sales-history-popup-shell">
            <div class="popup-titulo">
                <p class="popup-titulo-texto">Ultimas ventas</p>
                <button class="popup-cerrar" type="button" onclick="closeSalesSessionHistoryPopup()">
                    <p>X</p>
                </button>
            </div>
            <div class="popup-body sales-history-popup-body">
                <div id="sales-history-summary" class="sales-history-feedback">Cargando ventas...</div>
                <div class="sales-history-layout">
                    <div class="sales-history-list-panel">
                        <div class="sales-history-list-wrap">
                            <table class="venta-table sales-history-table" style="margin:0;">
                                <thead>
                                    <tr>
                                        <th>Fecha/Hora</th>
                                        <th>N&deg; Ticket</th>
                                        <th>M&eacute;todo</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody id="sales-history-body">
                                    <tr><td colspan="4" style="text-align:center;">Sin datos.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="sales-history-detail-panel">
                        <div id="sales-history-detail-empty" class="sales-history-feedback">
                            Selecciona una venta para ver el detalle y editar su forma de pago.
                        </div>
                        <div id="sales-history-detail-card" class="sales-history-detail-card hidden">
                            <div id="sales-history-modified-ribbon" class="sales-history-modified-ribbon hidden">
                                VENTA MODIFICADA
                            </div>
                            <div class="sales-history-detail-head">
                                <div class="sales-history-detail-meta"><span>Fecha/Hora</span><strong id="sales-history-detail-datetime">-</strong></div>
                                <div class="sales-history-detail-meta"><span>Ticket</span><strong id="sales-history-detail-ticket">-</strong></div>
                                <div class="sales-history-detail-meta"><span>Caja</span><strong id="sales-history-detail-caja">-</strong></div>
                                <div class="sales-history-detail-meta"><span>Cajero</span><strong id="sales-history-detail-cajero">-</strong></div>
                                <div class="sales-history-detail-meta"><span>M&eacute;todo</span><strong id="sales-history-detail-method">-</strong></div>
                                <div class="sales-history-detail-meta"><span>Total venta</span><strong id="sales-history-detail-total">$0</strong></div>
                            </div>
                            <div class="sales-history-products-wrap">
                                <table class="venta-table sales-history-products-table" style="margin:0;">
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th>Cant.</th>
                                            <th>Precio</th>
                                            <th>Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody id="sales-history-detail-products-body">
                                        <tr><td colspan="4" style="text-align:center;">Sin detalles.</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="sales-history-payments-box">
                                <p class="sales-history-section-title">Detalle de pago</p>
                                <div id="sales-history-detail-payments" class="sales-history-payments-list">
                                    <p class="sales-history-payment-item">Sin desglose de pago.</p>
                                </div>
                            </div>
                            <div id="sales-history-edit-box" class="sales-history-edit-box hidden">
                                <p class="sales-history-section-title">Editar forma de pago</p>
                                <div class="sales-history-edit-grid">
                                    <label for="sales-history-payment-method">M&eacute;todo</label>
                                    <select id="sales-history-payment-method" class="form-input" onchange="handleSalesHistoryPaymentMethodChange()">
                                        <option value="efectivo">Efectivo</option>
                                        <option value="tarjeta">Tarjeta</option>
                                        <option value="mixto">Mixto</option>
                                        <option value="dolares">D&oacute;lares</option>
                                        <option value="transferencia">Transferencia</option>
                                        <option value="cheque">Cheque</option>
                                        <option value="vale">Vale</option>
                                    </select>
                                </div>
                                <div id="sales-history-mixed-fields" class="sales-history-mixed-fields hidden">
                                    <div class="sales-history-edit-grid">
                                        <label for="sales-history-payment-card">Monto tarjeta</label>
                                        <input id="sales-history-payment-card" class="form-input" type="text" inputmode="numeric" autocomplete="off" placeholder="0" oninput="if (typeof handleBarcodeInputSanitize === 'function') { handleBarcodeInputSanitize(this); }">
                                    </div>
                                    <div class="sales-history-edit-grid">
                                        <label for="sales-history-payment-cash">Monto efectivo (pagado)</label>
                                        <input id="sales-history-payment-cash" class="form-input" type="text" inputmode="numeric" autocomplete="off" placeholder="0" oninput="if (typeof handleBarcodeInputSanitize === 'function') { handleBarcodeInputSanitize(this); }">
                                    </div>
                                </div>
                            </div>
                            <div id="sales-history-view-actions" class="sales-history-detail-actions">
                                <button id="sales-history-reprint-btn" class="btn2" type="button" onclick="reprintSalesHistorySelectedSale()">Reimprimir</button>
                                <button id="sales-history-enter-edit-btn" class="btn2" type="button" onclick="enterSalesHistoryEditMode()">Editar</button>
                            </div>
                            <div id="sales-history-edit-actions" class="sales-history-detail-actions hidden">
                                <button id="sales-history-save-payment-btn" class="btn2" type="button" onclick="saveSalesHistoryPaymentUpdate()">Guardar cambios</button>
                                <button id="sales-history-cancel-edit-btn" class="btn2" type="button" onclick="cancelSalesHistoryEditMode()">Cancelar</button>
                            </div>
                            <div id="sales-history-edit-feedback" class="sales-history-feedback hidden"></div>
                        </div>
                    </div>
                </div>
                <div class="sales-history-footer-actions">
                    <button class="btn2" type="button" onclick="closeSalesSessionHistoryPopup()" style="height:36px; min-width:130px;">Cerrar</button>
                </div>
            </div>
        </div>
    </div>
    <div id="salesCameraScanPopUp" class="hidden" style="position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:9999; align-items:center; justify-content:center;">
        <div class="contenidoPopUp" style="width:min(560px,95vw); max-width:560px; margin:0; display:flex; flex-direction:column;">
            <div class="popup-titulo">
                <p class="popup-titulo-texto">Escanear código con cámara</p>
                <button class="popup-cerrar" type="button" onclick="closeSalesCameraScanPopup()">
                    <p>X</p>
                </button>
            </div>
            <div class="popup-body" style="padding:10px; display:flex; flex-direction:column; gap:8px;">
                <video id="sales-camera-video" autoplay playsinline muted style="width:100%; max-height:56vh; background:#0b1220; border:1px solid #334155; border-radius:8px;"></video>
                <div id="sales-camera-status" class="product-status-box">Apunta al código de barras para escanear.</div>
                <div style="display:flex; justify-content:flex-end; gap:8px;">
                    <button class="btn2" type="button" onclick="closeSalesCameraScanPopup()" style="height:32px; min-width:120px;">Cerrar</button>
                </div>
            </div>
        </div>
    </div>
    <div id="salesCameraPermissionPopUp" class="hidden" style="position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:10000; align-items:center; justify-content:center;">
        <div class="contenidoPopUp" style="width:min(560px,95vw); max-width:560px; margin:0; display:flex; flex-direction:column;">
            <div class="popup-titulo">
                <p class="popup-titulo-texto">Permiso de cámara</p>
                <button class="popup-cerrar" type="button" onclick="closeSalesCameraPermissionPopup()">
                    <p>X</p>
                </button>
            </div>
            <div class="popup-body" style="padding:10px; display:flex; flex-direction:column; gap:10px;">
                <div id="sales-camera-permission-reason" class="product-status-box">
                    Se requiere permiso de cámara para escanear códigos.
                </div>
                <div id="sales-camera-permission-help" style="font-size:13px; line-height:1.45; color:#334155; background:#f8fafc; border:1px solid #dbe5f1; border-radius:8px; padding:8px 10px;">
                    Revisa permisos del sitio en tu navegador.
                </div>
                <div style="display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap;">
                    <button class="btn2" type="button" onclick="requestSalesCameraPermissionFromPopup()" style="height:32px; min-width:150px;">Solicitar permiso</button>
                    <button class="btn2" type="button" onclick="openSalesCameraScanPopup()" style="height:32px; min-width:150px;">Reintentar escáner</button>
                    <button class="btn2" type="button" onclick="closeSalesCameraPermissionPopup()" style="height:32px; min-width:110px;">Cerrar</button>
                </div>
            </div>
        </div>
    </div>
</div>
<div class="sales-bottom-hint">Punto de venta: teclee o escanee el código del producto.</div>
</div>





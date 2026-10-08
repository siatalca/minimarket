<!DOCTYPE html>
<html lang="en" data-theme="light"> <!-- nuevo atributo -->

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Login - Minimarket</title>
    <link rel="icon" href="./favicon.ico?v=20261003a" sizes="any">
    <link rel="apple-touch-icon" href="./img/cajero-automatico.png">

    <!-- Asegúrate de que root.css vaya primero -->
    <link rel="stylesheet" href="./css/root.css">
    <link rel="stylesheet" href="./css/styleslogin.css" />
</head>

<body>
    <!-- Botón modo oscuro -->
    <div id="load" class="login-container hidden">
        hola
    </div>

    <!----------mensaje de biembenida-->
    <div id="welcome-msj" class="welcome-container center ">
        <h1>Bienvenidos a tu sistema de ventas</h1>
        <img src="./img/cajero-automatico.png" alt="">
        <form id="config-form">
            <button>Configuracion del sistema</button>
        </form>
        <form id="add-form">
            <button>Agregar Caja Nueva</button>
        </form>
    </div>
    <!--fin mensaje de biembenida-->

    <!----------configurar datos del sistema-->
    <div id="data-negocio" class="welcome-container center large hidden">
        <form id="data-form">
            <h1>Datos de tu Negocio</h1>
            <p>Agrega la informacion que utilizaremos para personalizar tu experiencia</p>
            <label>Nombre</label>
            <input id="nombre-local" type="text" required>
            <label>Telefono</label>
            <input id="fono-local" type="text" required>
            <label>Mail</label>
            <input id="mail-local" type="text" required>
            <label>Tipo de Local</label>
            <select id="tipo-local">
                <option value="almacen">Almacen</option>
                <option value="botilleria">Botilleria</option>
                <option value="ferreteria">Ferreteria</option>
                <option value="almacen">Almacen</option>
                <option value="minimarket">Minimarket</option>
                <option value="otro">Otro</option>
            </select>
            <button>Continuar</button>
        </form>


    </div>
    <!--fin configuracion del sistema-->

    <!----------configurar opciones negocio-->
    <div id="config-negocio" class="welcome-container left hidden">
        <form id="option-form">
            <h1>Opciones Habilitadas</h1>
            <div class="sub">
                <div class="content">
                    <table>
                        <tr>
                            <td class="td-ext " style="padding-top: 15px;">
                                <input id="inventario" class="checkbox left" type="checkbox" name="utiliza_inv">
                                <label>

                                    <b>Utilizar inventarios para mis productos.</b>
                                </label>
                            </td>
                        </tr>
                        <tr>
                            <td class="td-ext">
                                <p style="margin-left:50px;">
                                    Si usas Inventario, tus productos tendran cantidades limitadas
                                    en venta y podrás llevar un control de cuanto tienes, cuando
                                    y cuanto se vende.
                                </p>
                                <p style="margin-left:50px;">Si actualmente no usas inventario, puedes no usarlo
                                    y posteriormente activalro.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td class="td-ext" style="padding-top: 15px;">
                                <label>
                                    <input id="credito" class="checkbox" type="checkbox" name="utiliza_inv">
                                    <b>Deseo ofrecer crédito a mis clientes.</b>
                                </label>
                            </td>
                        </tr>
                        <tr>
                            <td class="td-ext">
                                <p style="margin-left:50px;">
                                    Activa esta opcion para dar de alta clientes y poder ofrecer
                                    ventas a credito, recibir abonos y liquidar su adeudo.
                                </p>
                            </td>

                        </tr>
                        <tr>
                            <td class="td-ext" style="padding-top: 15px;">
                                <label>
                                    <input id="producto_comun" class="checkbox" type="checkbox" name="utiliza_inv">
                                    <b>Habilitar venta de producto común.</b>
                                </label>
                            </td>
                        </tr>
                        <tr>
                            <td class="td-ext">
                                <p style="margin-left:50px;">
                                    desea activar la opción de venta de "Producto Común", con
                                    la cual puedes vender articulos que NO están en la base de
                                    datos al momento de hacer una venta, por ejemplo: chicles,
                                    dulces, articulos esporadicos, etc.
                                </p>
                            </td>

                        </tr>
                        <tr>
                            <td class="td-ext" style="padding-top: 15px;">
                                <label>
                                    <input id="margen_ganancia" class="checkbox" type="checkbox" name="utiliza_inv">
                                    <b>Calcular automaticamente el precio de venta con el margen
                                        de ganancia del</b>
                                </label>
                            </td>
                        </tr>
                        <tr>
                            <td class="td-ext">
                                <label>
                                    <input style="width: 60px; margin-left:50px; margin-right:10px; text-align: center;" type="number" name="margen-ganancia" id="id-margen-ganancia" value="30">
                                    Activa esta opcion para dar de alta clientes y poder ofrecer
                                    ventas a credito, recibir abonos y liquidar su adeudo.

                                </label>
                            </td>
                        </tr>
                        <tr>
                            <td class="td-ext" style="padding-top: 15px;">
                                <label>
                                    <input id="redondeo" class="checkbox" type="checkbox" name="utiliza_inv">
                                    <b> Habilitar redondeo a cantidades cerradas.</b>
                                </label>
                            </td>
                        </tr>
                        <tr>
                            <td class="td-ext">
                                <select style="margin-left:50px; width:600px;" name="formato-cantidad-cerrada" id="id-formato-cantidad-cerrada">
                                    <option value="0">Sin redondeo</option>
                                    <option value="1">Redondeo a 1</option>
                                    <option value="5">Redondeo a 5</option>
                                    <option value="10">Redondeo a 10</option>
                                    <option value="50">Redondeo a 50</option>
                                    <option value="100">Redondeo a 100</option>
                                </select>
                            </td>

                        </tr>
                        <tr>
                            <td class="td-ext" style="padding-top: 15px;">
                                <label>
                                    <input id="mensaje" class="checkbox" type="checkbox" name="utiliza_inv">
                                    <b> Mensajes de Contingencias</b>
                                </label>
                            </td>
                        </tr>
                        <tr>
                            <td class="td-ext">
                                <label style="margin-left:50px;">
                                    Mostrar aviso:
                                    <input type="text"
                                        name="mensaje-contingencia"
                                        id="id-mensaje-contingencia"
                                        style="width: 300px;">
                                </label>
                                <label>
                                    cada:
                                    <input type="number"
                                        name="tiempo-mensaje-contingencia"
                                        id="id-tiempo-mensaje-contingencia"
                                        style="width:60px"
                                        value="5">
                                    ventas cobradas.
                                </label>
                            </td>

                        </tr>
                        <tr>
                            <td class="td-ext">
                                <button class="btn" style="width: 250px; margin-top: 20px; font-size:16px;"><b>Guardar configuración</b></button>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
        </form>
    </div>
    <!--fin configuracion datos negocio-->

    <!-----------agregar nueva caja-->
    <div id="add-caja" class="welcome-container large hidden">
        <form id="caja-form">
            <h1>agregar nueva caja</h1>
            <p>ahora configuraremos este equipo como la caja numero</p>
            <select name="" id="n_caja">
                <option id="caja_1" value="1">1</option>
                <option id="caja_2" value="2">2</option>
                <option id="caja_3" value="3">3</option>
                <option id="caja_4" value="4">4</option>
                <option id="caja_5" value="5">5</option>
                <option id="caja_6" value="6">6</option>
                <option id="caja_7" value="7">7</option>
                <option id="caja_none" class="hidden" value="8">no quedan cajas disponible contacta al proveedor para solicitar más.</option>
            </select>
            <label>Nombre (opcional)</label>
            <input id="nombre_caja" type="text" value="Caja 1">
            <button>Guardar</button>
        </form>
    </div>
    <!--fin agregar nueva caja-->

    <!------------inicio del login-->
    <div id="login" class="login-container hidden">
        <div class="login-brand">
            <img id="login-company-logo" src="./img/cajero-automatico.png" alt="Logo creador del sistema">
            <div class="login-brand-text">
                <h1 id="login-company-name">SIA</h1>
                <p id="login-company-subtitle">Creador del sistema</p>
            </div>
        </div>

        <p id="session-reservation-owner" class="hidden" role="status"></p>
        <form id="login-form">
            <input type="text" id="username" placeholder="Username" required />
            <input type="password" id="password" placeholder="Password" required />
            <button type="submit">Iniciar sesión</button>
            <label id="msj_activo" class="hidden">Hay una sesión activa. Ingresa la contraseña para continuar o cerrar el turno anterior.</label>
        </form>
        <p id="login-error" class="hidden" role="alert">Invalid username or password</p>
        <section id="reserved-session-restricted" class="hidden" aria-labelledby="reserved-session-title">
            <h2 id="reserved-session-title">Sesión local reservada</h2>
            <p id="reserved-session-restricted-owner"></p>
            <p id="reserved-session-shift-summary"></p>
            <label for="restricted-declared-cash">Efectivo declarado</label>
            <input id="restricted-declared-cash" type="number" min="0" step="1" value="0">
            <label for="restricted-declared-card">Tarjeta declarada</label>
            <input id="restricted-declared-card" type="number" min="0" step="1" value="0">
            <div class="login-actions">
                <button id="close-restricted-shift" type="button">Cerrar caja y liberar equipo</button>
                <button id="release-local-session" type="button">Cerrar y liberar sesión local</button>
                <button id="cancel-local-session-release" type="button">Cancelar</button>
            </div>
            <p id="restricted-close-error" class="hidden" role="alert"></p>
            <pre id="restricted-close-receipt" class="hidden"></pre>
            <button id="retry-restricted-print" class="hidden" type="button">Reintentar impresión</button>
        </section>
    </div>
    <!--fin login-->

    <script src="./js/session_reservation.js?v=20261007b"></script>
    <script src="./js/restricted_shift_close.js?v=20261007a"></script>
    <script src="./js/login.js?v=20261007b"></script>
    <script src="./js/api_base.js?v=20261003a"></script>
    <script src="./js/product_name_display.js?v=20260923a"></script>
    <script src="./js/ticket_print_method.js?v=20261003b"></script>
    <script src="./js/scripts.js?v=20261007c"></script>

</body>

</html>

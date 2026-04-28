<!DOCTYPE html>
<html lang="en" data-theme="light"> <!-- nuevo atributo -->

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Login - Minimarket</title>

    <!-- AsegÃƒÆ’Ã‚Âºrate de que root.css vaya primero -->
    <link rel="stylesheet" href="./css/root.css">
    <link rel="stylesheet" href="./css/styleslogin.css" />
</head>

<body>
    <!-- BotÃƒÆ’Ã‚Â³n modo oscuro -->
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
                                    en venta y podrÃƒÆ’Ã‚Â¡s llevar un control de cuanto tienes, cuando
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
                                    <b>Deseo ofrecer crÃƒÆ’Ã‚Â©dito a mis clientes.</b>
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
                                    <b>Habilitar venta de producto comÃƒÆ’Ã‚Âºn.</b>
                                </label>
                            </td>
                        </tr>
                        <tr>
                            <td class="td-ext">
                                <p style="margin-left:50px;">
                                    desea activar la opciÃƒÆ’Ã‚Â³n de venta de "Producto ComÃƒÆ’Ã‚Âºn", con
                                    la cual puedes vender articulos que NO entÃƒÆ’Ã‚Â¡n en la base de
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
                                <button class="btn" style="width: 250px; margin-top: 20px; font-size:16px;"><b>Guardar configuraciÃƒÆ’Ã‚Â³n</b></button>
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
                <option id="caja_8" value="8">8</option>
                <option id="caja_none" class="hidden" value="8">no quedan cajas disponible contacta al proveedor para solicitar mÃƒÆ’Ã‚Â¡s.</option>
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

        <form id="login-form">
            <input type="text" id="username" placeholder="Username" required />
            <input type="password" id="password" placeholder="Password" required />
            <button type="submit">Iniciar sesión</button>
            <label id="msj_activo" class="hidden">Hay una sesión activa. Ingresa la contraseña para continuar o cerrar el turno anterior.</label>
        </form>
        <p id="login-error" class="hidden" role="alert">Invalid username or password</p>
    </div>
    <!--fin login-->

    <script src="./js/login.js?v=20260327a"></script>
    <script src="./js/scripts.js?v=20260413a"></script>

</body>

</html>


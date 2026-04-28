<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Configuración</title>

    <!-- Tu plantilla de estilos para pop‑ups -->
    <link rel="stylesheet" href="../css/popUpStyle.css" />

    <script src="../js/functions.js"></script>
</head>

<body>
    <h2 class="h2-ext">CAJEROS</h2>

    <!-- ========== PESTAÑAS ========== -->
    <div class="tabs">
        <div class="tab active" data-tab="Ventas" onclick="showTab(0)">Ventas</div>
        <div class="tab" data-tab="Clientes" onclick="showTab(1)">Clientes</div>
        <div class="tab" data-tab="Productos" onclick="showTab(2)">Productos</div>
        <div class="tab" data-tab="Inventario" onclick="showTab(3)">Inventario</div>
        <div class="tab" data-tab="Otros" onclick="showTab(4)">Otros</div>
    </div>

    <!-- ========== CONTENIDO DE PESTAÑAS ========== -->
    <div class="contentTab">
        <!-- Ventas -->
        <div id="Ventas" class="tab-content active">
            <ul class="checkbox-row">
                <li class="checkbox-column">
                    <label><input type="checkbox"> Utilizar Producto Común</label>
                    <label><input type="checkbox"> Aplicar Mayoreo</label>
                    <label><input type="checkbox"> Aplicar Descuento</label>
                    <label><input type="checkbox"> Revisar el Historial de Ventas</label>
                    <label><input type="checkbox"> Registrar Entradas de Efectivo</label>
                    <label><input type="checkbox"> Registrar Salida de Efectivo</label>
                    <label><input type="checkbox"> Cobrar un Ticket</label>
                    <label><input type="checkbox"> Cobrar un Crédito</label>
                </li>
                <li class="checkbox-column">
                    <label><input type="checkbox"> Cancelar un Ticket y Devolver Artículos</label>
                    <label><input type="checkbox"> Eliminar Artículo de Venta</label>
                    <label><input type="checkbox"> Facturar / Ver Factura</label>
                    <label><input type="checkbox"> Vender un pago de servicio</label>
                    <label><input type="checkbox"> Vender Recargas Electrónicas</label>
                    <label><input type="checkbox"> Usar Buscador de productos</label>
                </li>
            </ul>
        </div>

        <!-- Clientes -->
        <div id="Clientes" class="tab-content">
            <div class="checkbox-column">
                <label><input type="checkbox"> Crear, Modificar o Eliminar Clientes</label>
                <label><input type="checkbox"> Asignar Cliente a una Venta</label>
                <label><input type="checkbox"> Asignar o Remover Crédito a Clientes</label>
                <label><input type="checkbox"> Ver Cuenta, Recibir Abonos y Reportes de Clientes a Crédito</label>
            </div>
        </div>

        <!-- Productos -->
        <div id="Productos" class="tab-content">
            <div class="checkbox-column">
                <label><input type="checkbox"> Crear nuevos Productos</label>
                <label><input type="checkbox"> Modificar Productos</label>
                <label><input type="checkbox"> Eliminar Productos</label>
                <label><input type="checkbox"> Ver Reporte de Ventas</label>
                <label><input type="checkbox"> Crear Promociones</label>
                <label><input type="checkbox"> Modificar Varios</label>
            </div>
        </div>

        <!-- Inventario -->
        <div id="Inventario" class="tab-content">
            <div class="checkbox-column">
                <label><input type="checkbox"> Agregar Mercancía</label>
                <label><input type="checkbox"> Ver Reportes de Existencia y Mínimos</label>
                <label><input type="checkbox"> Ver Movimiento de Inventarios</label>
                <label><input type="checkbox"> Ajustar el Inventario</label>
            </div>
        </div>

        <!-- Otros -->
        <div id="Otros" class="tab-content">
            <div class="checkbox-column">
                <label><input type="checkbox"> Realizar el Corte de su Turno y Ver Efectivo Esperado en Caja</label>
                <label><input type="checkbox"> Realizar el Corte de Todos los Turnos</label>
                <label><input type="checkbox"> Realizar el Corte de Día (Todos los Turnos)</label>
                <label><input type="checkbox"> Ver la Ganancia del Día</label>
                <label><input type="checkbox"> Cambiar la Configuración del Programa</label>
                <label><input type="checkbox"> Acceder a los Reportes de Ventas y Ganancias</label>
                <label><input type="checkbox"> Crear Órdenes de Compra</label>
                <label><input type="checkbox"> Recibir Órdenes de Compra</label>
            </div>
        </div>
    </div>
    <script>
        /* showTab(index)  – activa la pestaña y su contenido. 
            No depende de ningún CSS extra y funciona con este mismo HTML. */
        function showTab(index) {
            const tabs = document.querySelectorAll('.tabs .tab');
            const tabContents = document.querySelectorAll('.contentTab .tab-content');

            if (!tabs[index] || !tabContents[index]) return; // índice fuera de rango

            // Desactiva todo
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Activa el seleccionado
            tabs[index].classList.add('active');
            tabContents[index].classList.add('active');
        }
    </script>
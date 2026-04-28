<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configuración</title>
    <link rel="stylesheet" href="../css/popUpStyle.css">

    <script src="../js/functions.js"></script>
    <script src="../js/scripts.js"></script>

</head>

<body>
    <h2 class="h2-ext">LICENCIA</h2>
    <div class="sub">
        <div class="content">

            <h2 id="device-count">Equipos conectados: 0</h2>
            <button onclick="getConnectedDevices()">Actualizar</button>



            
        </div>
        <h2 id="info"></h2>


    </div>

    <script>
        document.addEventListener('DOMContentLoaded', getConnectedDevices);
        document.getElementById("info").textContent =
            `Sistema Operativo: ${getDeviceInfo().sistemaOperativo}, ` +
            `Dispositivo: ${getDeviceInfo().tipoDispositivo}, ` +
            `Navegador: ${getDeviceInfo().navegador}`;
    </script>
</body>

</html>

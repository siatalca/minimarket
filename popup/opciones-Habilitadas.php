<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Opciones Habilitadas</title>

    <link rel="stylesheet" href="../css/root.css">
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <style>
        .options-wrap {
            max-width: 980px;
            margin: 12px auto;
            padding: 0 12px 12px;
        }

        .options-panel {
            border: 1px solid #dbe3ef;
            border-radius: 12px;
            background: #fff;
            overflow: hidden;
            box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
        }

        .options-header {
            margin: 0;
            padding: 14px 16px;
            font-size: 1.08rem;
            font-weight: 700;
            border-bottom: 1px solid #dbe3ef;
            background: linear-gradient(90deg, #ecfeff 0%, #f0f9ff 100%);
        }

        .options-body {
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .option-card {
            border: 1px solid var(--clr-secondary-light);
            border-radius: 8px;
            background: #fff;
            padding: 10px 12px;
        }

        .option-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 700;
        }

        .option-help {
            margin: 8px 0 0 30px;
            line-height: 1.35;
            color: var(--clr-text-light);
        }

        .option-inline {
            margin: 8px 0 0 30px;
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        .option-inline input[type="number"] {
            width: 84px;
            text-align: center;
        }

        .option-inline select {
            min-width: 260px;
            max-width: 100%;
        }

        .option-inline input[type="text"] {
            min-width: 260px;
            max-width: 100%;
        }

        .options-footer {
            padding: 12px 14px 14px;
            display: flex;
            justify-content: flex-end;
        }

        .save-btn {
            min-width: 220px;
        }
    </style>
</head>
<body>
    <div class="options-wrap">
        <div class="options-panel">
            <h2 class="options-header">Opciones Habilitadas</h2>

            <div class="options-body">
                <div class="option-card">
                    <label class="option-title">
                        <input id="opt-inventario" class="checkbox" type="checkbox" name="utiliza_inv">
                        <span>Utilizar inventario para mis productos</span>
                    </label>
                    <p class="option-help">
                        Si usas inventario, tus productos tendrán cantidades limitadas en venta y podrás llevar control de existencias y ventas.
                    </p>
                </div>

                <div class="option-card">
                    <label class="option-title">
                        <input id="opt-credito" class="checkbox" type="checkbox" name="ofrecer_credito">
                        <span>Ofrecer crédito a mis clientes</span>
                    </label>
                    <p class="option-help">
                        Activa esta opción para dar de alta clientes, ofrecer ventas a crédito, recibir abonos y liquidar adeudos.
                    </p>
                </div>

                <div class="option-card">
                    <label class="option-title">
                        <input id="opt-producto-comun" class="checkbox" type="checkbox" name="producto_comun">
                        <span>Habilitar venta de producto común</span>
                    </label>
                    <p class="option-help">
                        Permite vender artículos que no están en la base de datos al momento de cobrar.
                    </p>
                </div>

                <div class="option-card">
                    <label class="option-title">
                        <input id="opt-margen-ganancia" class="checkbox" type="checkbox" name="calculo_precio_automatico">
                        <span>Calcular precio de venta con margen de ganancia</span>
                    </label>
                    <div class="option-inline">
                        <label for="id-margen-ganancia">Margen (%)</label>
                        <input type="number" name="margen-ganancia" id="id-margen-ganancia" value="30" min="0" step="1">
                    </div>
                </div>

                <div class="option-card">
                    <label class="option-title">
                        <input id="opt-redondeo" class="checkbox" type="checkbox" name="redondeo">
                        <span>Habilitar redondeo a cantidades cerradas</span>
                    </label>
                    <div class="option-inline">
                        <label for="id-formato-cantidad-cerrada">Formato</label>
                        <select name="formato-cantidad-cerrada" id="id-formato-cantidad-cerrada">
                            <option value="0">Sin redondeo</option>
                            <option value="1">Redondeo a 1</option>
                            <option value="5">Redondeo a 5</option>
                            <option value="10">Redondeo a 10</option>
                            <option value="50">Redondeo a 50</option>
                            <option value="100">Redondeo a 100</option>
                        </select>
                    </div>
                </div>

                <div class="option-card">
                    <label class="option-title">
                        <input id="opt-mensaje" class="checkbox" type="checkbox" name="mensajes_contingencia">
                        <span>Mensajes de contingencia</span>
                    </label>
                    <div class="option-inline">
                        <label for="id-mensaje-contingencia">Mostrar aviso</label>
                        <input type="text" name="mensaje-contingencia" id="id-mensaje-contingencia" maxlength="255">
                    </div>
                    <div class="option-inline">
                        <label for="id-tiempo-mensaje-contingencia">Cada</label>
                        <input type="number" name="tiempo-mensaje-contingencia" id="id-tiempo-mensaje-contingencia" value="5" min="1" step="1">
                        <span>ventas cobradas</span>
                    </div>
                </div>
            </div>

            <div class="options-footer">
                <button class="btn save-btn" type="button" onclick="saveEnabledOptions()"><b>Guardar configuración</b></button>
            </div>
        </div>
    </div>

    <script src="../js/functions.js"></script>
    <script>
        const API_URL = (() => {
            const override = window.localStorage.getItem('api_url');
            if (override) return override.endsWith('/') ? override : `${override}/`;
            if (window.location.port === '3002') return `${window.location.origin}/`;
            const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
            const protocol = isLocalHost ? 'http:' : window.location.protocol;
            return `${protocol}//${window.location.hostname}:3002/`;
        })();

        function buildAuthHeaders() {
            const token = sessionStorage.getItem('token') || localStorage.getItem('token');
            if (!token) return {};
            return { Authorization: `Bearer ${token}` };
        }

        function toBool(value) {
            return value === true || value === 1 || value === '1';
        }
        let currentInfoRow = null;

        async function loadEnabledOptionsFromInfo() {
            try {
                const response = await fetch(API_URL + 'api/getInfo', {
                    headers: buildAuthHeaders(),
                });
                const rows = await response.json().catch(() => []);
                if (!response.ok || !Array.isArray(rows) || rows.length === 0) {
                    return;
                }

                const current = rows.reduce((latest, row) => {
                    const latestId = Number(latest?.id_info || 0);
                    const rowId = Number(row?.id_info || 0);
                    return rowId > latestId ? row : latest;
                }, rows[0]);
                currentInfoRow = current;

                const inventario = document.getElementById('opt-inventario');
                const credito = document.getElementById('opt-credito');
                const productoComun = document.getElementById('opt-producto-comun');
                const margenGanancia = document.getElementById('opt-margen-ganancia');
                const montoGanancia = document.getElementById('id-margen-ganancia');
                const redondeo = document.getElementById('opt-redondeo');
                const montoRedondeo = document.getElementById('id-formato-cantidad-cerrada');
                const mensaje = document.getElementById('opt-mensaje');
                const dataMensaje = document.getElementById('id-mensaje-contingencia');
                const timeMensaje = document.getElementById('id-tiempo-mensaje-contingencia');

                if (inventario) inventario.checked = toBool(current.inventario);
                if (credito) credito.checked = toBool(current.credito);
                if (productoComun) productoComun.checked = toBool(current.producto_comun);
                if (margenGanancia) margenGanancia.checked = toBool(current.margen_ganancia);
                if (montoGanancia) montoGanancia.value = Number(current.monto_ganancia || 0).toFixed(0);
                if (redondeo) redondeo.checked = toBool(current.redondeo);
                if (montoRedondeo) montoRedondeo.value = String(Number(current.monto_redondeo || 0));
                if (mensaje) mensaje.checked = toBool(current.mensaje);
                if (dataMensaje) dataMensaje.value = String(current.data_mensaje || '');
                if (timeMensaje) timeMensaje.value = Number(current.time_mensaje || 0).toFixed(0);
            } catch (error) {
                console.error('Error al cargar opciones habilitadas desde info:', error);
            }
        }

        async function saveEnabledOptions() {
            try {
                if (!currentInfoRow) {
                    await loadEnabledOptionsFromInfo();
                }
                if (!currentInfoRow) {
                    alert('No se pudo cargar la información base del local.');
                    return;
                }

                const inventario = document.getElementById('opt-inventario');
                const credito = document.getElementById('opt-credito');
                const productoComun = document.getElementById('opt-producto-comun');
                const margenGanancia = document.getElementById('opt-margen-ganancia');
                const montoGanancia = document.getElementById('id-margen-ganancia');
                const redondeo = document.getElementById('opt-redondeo');
                const montoRedondeo = document.getElementById('id-formato-cantidad-cerrada');
                const mensaje = document.getElementById('opt-mensaje');
                const dataMensaje = document.getElementById('id-mensaje-contingencia');
                const timeMensaje = document.getElementById('id-tiempo-mensaje-contingencia');

                const payload = {
                    nombre_local: String(currentInfoRow.nombre || '').trim(),
                    telefono_local: String(currentInfoRow.telefono || '').trim(),
                    mail_local: String(currentInfoRow.mail || '').trim(),
                    tipo_local: String(currentInfoRow.tipo_local || '').trim(),
                    inventario: Boolean(inventario?.checked),
                    credito: toBool(currentInfoRow.credito),
                    producto_comun: Boolean(productoComun?.checked),
                    margen_ganancia: Boolean(margenGanancia?.checked),
                    monto_ganancia: Number(montoGanancia?.value || 0),
                    redondeo: Boolean(redondeo?.checked),
                    monto_redondeo: Number(montoRedondeo?.value || 0),
                    mensaje: Boolean(mensaje?.checked),
                    data_mensaje: String(dataMensaje?.value || '').trim(),
                    time_mensaje: Number(timeMensaje?.value || 0),
                };

                const response = await fetch(API_URL + 'api/addInfo', {
                    method: 'POST',
                    headers: {
                        ...buildAuthHeaders(),
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });
                const result = await response.json().catch(() => ({}));
                if (!response.ok || result?.success !== true) {
                    alert(result?.error || 'No se pudo guardar la configuración.');
                    return;
                }

                currentInfoRow = {
                    ...currentInfoRow,
                    inventario: payload.inventario ? 1 : 0,
                    credito: payload.credito ? 1 : 0,
                    producto_comun: payload.producto_comun ? 1 : 0,
                    margen_ganancia: payload.margen_ganancia ? 1 : 0,
                    monto_ganancia: payload.monto_ganancia,
                    redondeo: payload.redondeo ? 1 : 0,
                    monto_redondeo: payload.monto_redondeo,
                    mensaje: payload.mensaje ? 1 : 0,
                    data_mensaje: payload.data_mensaje,
                    time_mensaje: payload.time_mensaje,
                };
                localStorage.setItem('margen_ganancia', payload.margen_ganancia ? 'true' : 'false');
                localStorage.setItem('monto_ganancia', String(payload.monto_ganancia));
                close_w();
            } catch (error) {
                console.error('Error guardando opciones habilitadas:', error);
                alert('Error de conexión al guardar.');
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            const creditOption = document.getElementById('opt-credito');
            if (creditOption) {
                const creditCard = creditOption.closest('.option-card');
                if (creditCard) creditCard.remove();
            }
            loadEnabledOptionsFromInfo();
        });
    </script>
</body>
</html>

# Misión M-033: escanear códigos con la cámara del teléfono

- Pedido original: "podemos hacer que funcione la camara para escanear el codigo de un producto cuando se habre el sitio desde un telefono? todo esto es del sistema de minimarket"
- Tipo: cambio en sitio existente
- Carpeta: C:\SIA\htdocs\minimarket
- Nivel de riesgo máximo: 2 (laboratorio local). Desplegar a minimarket.siacore.cl es nivel 4: solo con aprobación explícita del usuario.
- Equipo: desarrollador-frontend → revisor-calidad

## Situación actual
- Ventas ya tiene el botón «Escanear cámara» (`content/ventas.php:21`, lógica en `js/scripts.js` ~6560-6800,
  `openSalesCameraScanPopup`). Usa solo `BarcodeDetector`.
- En el teléfono del usuario la cámara abre pero sale «Tu navegador no soporta lectura automática de códigos con
  cámara» (iPhone/Safari y Firefox no tienen `BarcodeDetector`).
- `content/configuracion.php:139` muestra «Cámara móvil — Próximamente» deshabilitado.
- La cámara en móvil exige HTTPS (ya hay aviso para HTTP).

## Objetivo
Escanear el código de barras de un producto con la cámara del teléfono en iPhone y Android, en las pantallas
Ventas, Productos, Inventario y Compras.

## Criterios de aceptación
- Si el navegador tiene `BarcodeDetector` se usa; si no, se usa ZXing (autorizado por el usuario) guardado dentro del
  sitio (por ejemplo `js/vendor/zxing/`), sin CDN externo. Versión fija y anotada.
- Lee EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39 e ITF.
- Ventas: el código leído se agrega a la venta como hoy (`handleSalesCameraBarcodeDetected`).
- Productos, Inventario y Compras: botón «Escanear cámara» visible en móvil junto al campo de código/búsqueda; el
  código leído llena ese campo y dispara la misma acción que al escanear con lector USB.
- Un solo componente de escaneo reutilizable (no copiar la lógica cuatro veces).
- Al cerrar el popup o leer un código se detiene la cámara (sin la luz de cámara encendida).
- Avisos claros: HTTP en móvil, permiso denegado, sin cámara.
- La opción «Cámara móvil» de Configuración deja de decir «Próximamente» (o se quita), según quede.
- Las pruebas existentes (`tests/`) siguen pasando; el lector USB/serial sigue funcionando igual.

## Factibilidad
| # | Punto | Clase | Motivo / qué falta |
|---|---|---|---|
| 1 | Cámara funcionando en iPhone (Ventas) | factible | ZXing autorizado por el usuario el 2026-11-16 |
| 2 | Escanear en Productos, Inventario y Compras | factible | Reusar el componente de Ventas |
| 3 | Probar en el teléfono real | requiere autorización | La cámara necesita HTTPS; en local se prueba en PC (localhost) y con emulación móvil. La prueba real en teléfono es en minimarket.siacore.cl, y desplegar requiere aprobación del usuario |

## Tareas
| Tarea | Rol | Qué queda hecho | Zona / archivos | Depende de |
|---|---|---|---|---|
| T1 | desarrollador-frontend | ZXing local + componente de escaneo reutilizable con respaldo, Ventas usándolo | `js/vendor/zxing/`, `js/scripts.js`, `content/ventas.php` | — |
| T2 | desarrollador-frontend | Botón y escaneo en Productos, Inventario y Compras | `content/productos.php`, `inventario.php`, `compras.php`, `js/` | T1 |
| T3 | desarrollador-frontend | Configuración: quitar «Próximamente» de Cámara móvil | `content/configuracion.php` | T1 |
| T4 | revisor-calidad | Revisión de T1-T3 (sin hallazgos graves para cerrar) | — | T1-T3 |

## Fuera de alcance
- Servidor Node, API y base de datos (no se tocan).
- Despliegue a producción sin aprobación del usuario.

## Reglas
- Trabajar solo en `C:\SIA\htdocs\minimarket`.
- Resolver solo lo pedido. Ideas nuevas a `C:\SIA\gerencia\avisos\pendientes.md` (`AAAA-MM-DD | idea | minimarket: <texto>`).
- Puertos según `C:\SIA\PUERTOS.md` (minimarket ya tiene su par).
- Comandos de servidor: uno por mensaje, esperando la salida.
- Primero se prueba en este PC en local: dejar el sistema corriendo, informar la URL y qué revisar, y esperar que el
  usuario confirme. Solo con su aprobación se hace push, PR, fusión o despliegue.
- Al terminar: informar qué se hizo, cómo se verificó y qué quedó pendiente.

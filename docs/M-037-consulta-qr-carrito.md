# Misión M-037: consulta de precio por QR y carrito del cliente

- Pedido original (2026-11-17): "para la version movil me gustaria que fuese un consulta precio e inventario no todas
  las funciones del computador y que su uso sea como de visitas para dejar un codigo qr para que la gente pueda
  escanear y se les genere el icono en su telefono y al abrirla no le pida cuenta si no que le permita escanear el
  producto para consultar el precio y stock, ademas [...] que la gente cree una cuenta y pueda ir escaneando los codigos
  para consultar el precio y agregar a un carrito de compra el cual acumulara las cosas que lleve la clienta o cliente
  el cual al finalizar le dara un codigo para darselo a la cajera y que el carrito que el cliente armo se muestre
  automaticamente al ingresar el codigo que le dio el cliente para pasar a pagar, para estos no tenemos maximo de cajas
  o dispositivos, los unicos con limite son las cajas de ventas"
- Aprobado como pedido nuevo el 2026-11-18: «Las dos juntas».
- Tipo: cambio en sitio existente. Carpeta: C:\SIA\htdocs\minimarket. Rama: agent/m-037-qr-carrito.
- Riesgo: 2 en local; 4 al desplegar (regla de horario del propietario). Primera parte pública sin clave del sistema.
- Equipo: arquitecto → desarrollador-backend + desarrollador-frontend → revisor-calidad.

## Objetivo
1. **Consulta de precio (pública):** QR en el local → página instalable en el teléfono (ícono) → sin cuenta → escanear
   con la cámara y ver nombre, precio y stock del producto.
2. **Carrito del cliente:** el cliente crea cuenta, escanea y agrega productos a un carrito; al finalizar recibe un
   código; la cajera lo ingresa en Ventas y el carrito aparece cargado para cobrar.
3. Sin límite de teléfonos ni cuentas de clientes; no consumen cajas (solo las cajas de venta tienen límite).

## Decisiones del usuario (2026-11-18)
1. **Cuenta:** teléfono + nombre + clave + correo. Entrar con teléfono y clave, o con «Continuar con Google».
   Recuperar la clave: entrando con Google. Se construye todo ya; el botón de Google se activa cuando el usuario cree
   el «ID de cliente OAuth» en Google Cloud y se configure en el servidor (`GOOGLE_CLIENT_ID`).
2. **Stock:** número exacto (además del estado disponible / pocas / sin stock).
3. **Código del carrito:** vence a las 2 horas; vencido, el cliente genera otro.
4. **Granel / sin código:** al carrito del cliente solo van productos con código. Lo que se pesa o no tiene código lo
   agrega la cajera manualmente en la caja después de cargar el carrito del cliente (sigue agregando normal).

## Diseño (arquitecto, 2026-11-18; ajustado con las decisiones)
- Sin puerto ni base nuevos (mismo Node 3015 en prod, base `minimarket`). `qrcode@1.5.4` y `bcryptjs` ya están en
  `server/package.json`: no hay descargas. Ícono 512: `img/cajero-automatico.png`.
- **PWA `consulta/`**: `index.php` (vistas Consultar | Mi carrito | Cuenta; sin `layout/` ni CDN propio; carga
  `../js/api_base.js`, `../js/html_escape.js`, `../js/camera_barcode_scanner.js`, `consulta.js`; CSP en meta
  `default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'`, ampliada SOLO para
  Google Identity Services cuando haya `GOOGLE_CLIENT_ID`), `consulta.js`, `consulta.css`, `manifest.webmanifest`
  (start_url/scope `./`, standalone, íconos 512 y `icon-192.png` generado localmente), `sw.js` (alcance
  `/consulta/`, cachea solo estructura, nunca `/api/`). iOS: texto «Compartir > Agregar a inicio» + apple-touch-icon.
- **Auth del personal** (server.js ~4629): `if (req.path.startsWith('/api/tienda/')) return next();` antes de
  `isPublicRoute`; las rutas `/api/tienda/` nunca leen `req.user`.
- **Tablas** en `ensureOperationalTables` (`CREATE TABLE IF NOT EXISTS`, prefijo `tienda_`; ya existe `clientes`
  de créditos, no se toca):
  - `tienda_cuentas`: id, telefono VARCHAR(16) UNIQUE (`+569XXXXXXXX`), nombre VARCHAR(60), correo VARCHAR(120)
    UNIQUE, google_sub VARCHAR(64) NULL UNIQUE, clave_hash, activo, created_at, last_login_at.
  - `tienda_sesiones`: id, cuenta_id, token_hash CHAR(64) UNIQUE, expires_at, revoked_at, last_used_at, created_at.
  - `tienda_carritos`: id, cuenta_id, estado ENUM('abierto','enviado','retirado'), codigo VARCHAR(8) NULL UNIQUE,
    codigo_expira, codigo_usado, retirado_at, retirado_caja_id, retirado_user_id, created_at, updated_at; índice
    (cuenta_id, estado).
  - `tienda_carrito_items`: id, carrito_id, producto_id, cantidad, UNIQUE(carrito_id, producto_id). Sin precio.
- **Ciclo del carrito**: un carrito `abierto` por cuenta → finalizar: `enviado` + código de 6 dígitos
  (`crypto.randomInt`, reintento si choca), vence en 2 h → reabrir anula el código (vencido también vuelve a
  `abierto`) → canje en caja con UPDATE atómico `WHERE codigo=? AND estado='enviado' AND codigo_expira>NOW()`;
  affectedRows=1 → `retirado`, `codigo_usado`.
- **Google** (sin dependencias nuevas): el servidor verifica el ID token de Google con `jsonwebtoken` y las llaves
  públicas de Google (JWKS `https://www.googleapis.com/oauth2/v3/certs`, en caché; `crypto.createPublicKey` formato
  jwk): RS256, `aud = GOOGLE_CLIENT_ID`, `iss` accounts.google.com, `email_verified`, `exp`. Sin `GOOGLE_CLIENT_ID`
  las rutas de Google responden 503 GOOGLE_DISABLED y el botón no aparece.
  - Registro con Google: el botón llena nombre y correo verificados y guarda `google_sub`; el cliente agrega teléfono
    y clave.
  - Login con Google: solo por `google_sub` ya vinculado (nunca por correo no verificado).
  - Cuenta creada con teléfono/clave: puede «Vincular Google» estando conectada (el correo de Google pasa a ser el de
    la cuenta si no choca con otra).
  - Recuperar clave: entrar con Google y cambiar la clave (`POST /api/tienda/cuenta/clave` con sesión).
- **Ventas**: botón «Carrito cliente» + popup de código; `loadCustomerCartByCode()` en `js/scripts.js`: exige turno;
  si el carrito de venta ya tiene productos pide F5 y no carga; empuja productos con `resolveProductSaleFormat`,
  aplica la regla de stock de `addToCart` y avisa faltantes/recortes; promociones con `getCartPricingSnapshot`. Luego
  la cajera puede seguir agregando productos (granel, sin código) y cobra normal con F12.

### Seguridad de lo público
- Expone solo código, nombre, precio_venta, formato y stock (estado + cantidad exacta). Nunca costo, ganancia,
  proveedor, departamento, mín/máx ni id (`toPublicProduct`, SELECT con columnas explícitas).
- Solo por código exacto `^[0-9A-Za-z.\-]{1,64}$`; sin búsqueda por nombre ni listado.
- Límites: consulta 120/10 min por IP y 5000/10 min global; registro 20/h por IP y 300/h global; login y Google con
  `createLoginGuard()` propio; carrito 300/10 min por cuenta; canje 30/10 min por usuario del personal. Aplicados
  antes de cualquier `await`. Generosos por la IP compartida del WiFi del local.
- Cuentas: bcryptjs costo 10, clave 6-72 bytes; sesión = token opaco de 32 bytes guardado como sha256, 60 días,
  revocable; no es JWT; no toca `usuarios`, cajas, licencia ni reservas de sesión.
- Límites: 60 líneas por carrito, cantidad entera 1-99, nombre 60, correo 120. Todo lo mostrado con
  textContent/html_escape.
- Precio referencial: en caja mandan precio y promociones vigentes (texto visible al cliente). El carrito no reserva
  ni descuenta stock. Granel no se agrega al carrito (422 BULK_NOT_ALLOWED), sí se consulta si tiene código.

### QR
`GET /api/consulta-qr.svg?url=` (personal): `require('qrcode')` dentro de la función; valida https + ruta
`/consulta/` (http solo en localhost), máx 200; 503 QR_UNAVAILABLE si falta el módulo. `popup/qr-consulta.php`
desde Configuración: QR de `location.origin + '/consulta/'`, aviso si es localhost/IP, nombre del negocio, «Escanea
para consultar precios», botón Imprimir.

### Contrato de API (errores `{message, code}`)
Públicas
- `GET /api/tienda/info` → `{nombre, google_client_id|null}`
- `GET /api/tienda/producto?codigo=X` → `{found:true, producto:{codigo, nombre, precio, formato:'unidad'|'granel',
  stock:{estado:'disponible'|'pocas'|'sin_stock'|'no_controlado', cantidad?}}}` | 404 `{found:false}` |
  400 INVALID_CODE | 429 RATE_LIMITED

Cuenta (token de cliente en `Authorization: Bearer`)
- `POST /api/tienda/cuenta/registro` `{telefono, nombre, correo, clave, google_credential?}` → 201 `{token, cuenta}`
  | 409 PHONE_TAKEN | 409 EMAIL_TAKEN | 400 INVALID_DATA
- `POST /api/tienda/cuenta/login` `{telefono, clave}` → 200 `{token, cuenta}` | 401 INVALID_CREDENTIALS | 429
- `POST /api/tienda/cuenta/google` `{credential}` → 200 `{token, cuenta}` | 404 GOOGLE_NOT_LINKED
  `{correo, nombre}` (para prellenar el registro) | 401 GOOGLE_INVALID | 503 GOOGLE_DISABLED
- `POST /api/tienda/cuenta/google/vincular` (sesión) `{credential}` → 200 `{cuenta}` | 409 GOOGLE_TAKEN / EMAIL_TAKEN
- `POST /api/tienda/cuenta/clave` (sesión) `{clave_nueva}` → 204
- `POST /api/tienda/cuenta/logout` → 204; `GET /api/tienda/cuenta` → `{cuenta}` | 401 SESSION_INVALID
- `cuenta` = `{nombre, telefono, correo, google_vinculado}`

Carrito (sesión de cliente; responden `{carrito}` = `{estado, items:[{item_id, codigo, nombre, precio, cantidad,
subtotal, stock}], total, codigo?, codigo_expira?}`)
- `GET /api/tienda/carrito`
- `POST /api/tienda/carrito/items` `{codigo, cantidad}` (suma si ya está) | 404 PRODUCT_NOT_FOUND | 409 CART_LOCKED |
  422 BULK_NOT_ALLOWED | 422 CART_LIMIT
- `PUT /api/tienda/carrito/items/:itemId` `{cantidad}` (0 = quitar); `DELETE /api/tienda/carrito/items/:itemId`
- `POST /api/tienda/carrito/finalizar` (idempotente; mismo código si sigue vigente) | 422 CART_EMPTY
- `POST /api/tienda/carrito/reabrir`

Personal (JWT normal)
- `POST /api/ventas/carrito-cliente/cargar` `{codigo}` → `{cliente:{nombre, telefono}, items:[{product:<mismas
  columnas que /api/productos/code/:code>, cantidad}], faltantes:[{nombre, motivo}]}` | 404 CODE_NOT_FOUND |
  410 CODE_EXPIRED | 409 CODE_USED | 429
- `GET /api/consulta-qr.svg?url=` → image/svg+xml | 400 INVALID_URL | 503 QR_UNAVAILABLE

## Tareas
| Tarea | Rol | Archivos | Criterios |
|---|---|---|---|
| T1 | desarrollador-backend | `server/tienda_core.js` (puro), `server/tienda_google.js` (verificación de ID token), `server/server.js`, `tests/tienda-*.test.js`; no `paquete_cliente_db/` | pruebas pasan; tablas idempotentes; `/api/tienda/producto` sin token y sin campos internos; token de cliente 401 en `/api/productos` y JWT de personal 401 en `/api/tienda/carrito`; límite 429; canje doble 200/409 y vencido 410; sin `qrcode` arranca y da 503; sin `GOOGLE_CLIENT_ID` Google da 503 |
| T2 | desarrollador-frontend | `consulta/*`, `popup/qr-consulta.php`, `js/qr_consulta.js`, `content/configuracion.php`, `content/ventas.php`, `js/scripts.js`, `layout/footer.php` (no `server/`) | consulta sin login con cámara e ingreso manual; instalable (manifest y SW); registro/login/carrito/finalizar/reabrir; botón Google solo si hay client id; Ventas carga el carrito y la cajera puede seguir agregando y cobrar F12; QR imprimible; sin errores de CSP |
| T3 | revisor-calidad | — | sin graves; foco: nada interno expuesto, tokens de cliente y personal no se cruzan, canje atómico, XSS, límites antes de `await`, verificación de Google |

## Riesgos y fuera de alcance
IP compartida del WiFi del local; limitadores en memoria; códigos internos cortos recorribles (solo datos visibles en
el local); consulta sin índice (catálogo chico); datos personales mínimos (Ley 19.628); `qrcode` debe existir en
`server/node_modules` del servidor; instalación manual en iOS; `paquete_cliente_db/` fuera; `CORS_ORIGIN="*"`
pendiente. Fuera: reservar stock, promociones visibles al cliente, administrar cuentas desde Configuración, historial
de compras, limpieza automática de carritos abandonados.

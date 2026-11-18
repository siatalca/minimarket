# Misión M-039: pantalla de clientes de la app (solo administradores)

- Pedido del usuario (2026-11-18): "como puedo revisar los clientes que has usado o registrado en la app? o en las
  cajas como administrados o super". Aprobó: "Sí, encárgala".
- Decisiones del usuario (2026-11-18):
  1. **Guardar caja y venta:** desde ahora, al cargar un carrito en caja se guarda la caja, y al cobrar se guarda el
     número de venta. Los carritos cargados antes quedan solo con fecha y cajera.
  2. **Ubicación:** Configuración (junto a «QR consulta de precios», pestaña Servicios).
- Rama `agent/m-039-clientes-app` desde main f58dae4. Equipo: backend + frontend → revisor-calidad. Despliegue según
  la regla de horario.

## Estado actual (verificado en `server/tienda_repo.js`)
`tienda_carritos` guarda `retirado_at` y `retirado_user_id` al canjear; `retirado_caja_id` queda NULL; no hay vínculo
con la venta. Cargar el carrito no significa que se cobró (la cajera puede cancelar el ticket).

## Reglas
- Solo lectura: sin editar, borrar ni exportar. Nunca exponer `clave_hash`, tokens, `token_hash` ni `google_sub`.
- Solo administradores activos (`es_administrador = 1`, incluye admin_sia), validado en el servidor con el mecanismo de
  administrador que ya existe (no solo ocultar el botón). Cajeros: 403.
- Columnas nuevas idempotentes en producción: `CREATE TABLE IF NOT EXISTS` no agrega columnas a una tabla existente;
  usar la forma de migración que ya use el proyecto (consultar INFORMATION_SCHEMA y `ALTER TABLE ... ADD COLUMN`), sin
  borrar datos.

## Contrato
### Cambios en lo existente
- `POST /api/ventas/carrito-cliente/cargar`: guarda `retirado_caja_id` (la caja de la sesión del personal o, si no se
  puede obtener del servidor, `caja_id` del cuerpo validado contra `cajas`) y la respuesta agrega `carrito_id`.
- `tienda_carritos` agrega `venta_id INT NULL`.
- `POST /api/sales`: cuerpo opcional `carrito_cliente_id`. Tras registrar la venta, si viene, hace
  `UPDATE tienda_carritos SET venta_id = ? WHERE id = ? AND estado = 'retirado' AND retirado_user_id = <usuario de la
  sesión> AND venta_id IS NULL`. Si no calza no falla la venta (solo no vincula). Ningún otro cambio en ventas.
### Nuevas (JWT de personal + administrador)
- `GET /api/admin/tienda/clientes?q=&pagina=1` → `{clientes:[{id, nombre, telefono, correo, google_vinculado,
  activo, creado, ultimo_ingreso, carritos}], total, pagina, por_pagina}`; `q` busca en nombre, teléfono y correo
  (LIKE parametrizado, máx 60 caracteres); 50 por página; orden por registro más reciente.
- `GET /api/admin/tienda/clientes/:id` → `{cliente:{...mismo formato}, carritos:[{id, estado, codigo, codigo_usado,
  creado, actualizado, codigo_expira, cargado_en_caja:{fecha, caja:{numero, nombre}|null, cajera:{nombre}|null}|null,
  venta:{id, fecha, total}|null, items:[{codigo, nombre, cantidad, precio_actual}], total_actual}]}` | 404.
- 401 sin token, 403 si no es administrador.

## Tareas
| Tarea | Rol | Archivos | Criterios |
|---|---|---|---|
| T1 | desarrollador-backend | `server/tienda_*.js` (o `server/tienda_admin.js` nuevo), `server/server.js` (ruta de ventas y registro), `tests/` | columnas idempotentes; canje guarda caja y devuelve `carrito_id`; venta vincula solo el carrito retirado por el mismo usuario; API admin con 403 a cajeros y sin datos sensibles; búsqueda parametrizada; pruebas; todas las existentes pasan |
| T2 | desarrollador-frontend | `popup/clientes-app.php` (nuevo), `js/clientes_app.js` (nuevo), `content/configuracion.php`, `js/carrito_cliente.js`, `js/scripts.js` (solo enviar `carrito_cliente_id` en la venta y limpiarlo), `layout/footer.php` | ítem «Clientes de la app» visible solo para administradores; lista con búsqueda y paginación; detalle con carritos, productos, carga en caja y venta; solo lectura; textos con textContent; el carrito cargado recuerda su `carrito_id` hasta cobrar o vaciar el ticket (si se deja pendiente con F5, conservarlo con el ticket si es simple; si no, se pierde el vínculo y se anota) |
| T3 | revisor-calidad | — | sin graves |

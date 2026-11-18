# Misión M-038: el carrito del cliente no acepta productos sin stock

- Pedido del usuario (2026-11-18): "si el producto no tiene stock no me deberia dejar agregar ese producto al carrito
  pero si consultar el precio y stock". Decisión sobre cantidades: si hay stock pero pide más de lo que hay, limitar a
  lo disponible y avisar «solo quedan N».
- Rama: `agent/m-038-stock-carrito` (desde origin/main 2e69ee9, M-037 desplegada). Equipo: backend + frontend →
  revisor-calidad. Despliegue según la regla de horario del usuario.

## Reglas
1. Consulta de precio y stock: sin cambios (se puede consultar un producto sin stock).
2. `sin_stock` (inventario controlado y cantidad ≤ 0): no se puede agregar ni subir su cantidad.
3. Inventario controlado con stock: la cantidad del carrito nunca supera la disponible; si se pide más, se limita a lo
   disponible y se avisa «Solo quedan N».
4. `no_controlado` (utiliza_inventario = 0): sin límite de stock (sigue el tope 1-99).
5. El servidor valida todo (agregar, cambiar cantidad, finalizar): el navegador no puede saltarlo.
6. Carrito guardado cuyo producto se quedó sin stock o con menos stock: se muestra al cliente marcado y «Finalizar» se
   rechaza hasta que lo quite o ajuste.
7. Carga en caja (`/api/ventas/carrito-cliente/cargar`): sin cambios (aviso de faltantes y recortes como hoy).

## Contrato (cambios sobre M-037)
- Cada ítem de `carrito.items` agrega:
  - `disponible`: número o `null` si `no_controlado`.
  - `problema`: `null` | `'sin_stock'` | `'excede_stock'` (cantidad > disponible).
- `carrito` agrega `bloqueado_por_stock: boolean` (true si algún ítem tiene `problema`).
- `POST /api/tienda/carrito/items` `{codigo, cantidad}`:
  - producto `sin_stock` → 422 `OUT_OF_STOCK` `{message, code, disponible: 0}`.
  - si la cantidad final (existente + pedida) supera lo disponible → se guarda limitada a lo disponible y responde 200
    `{carrito, aviso: {code: 'STOCK_LIMITED', disponible: N, message: 'Solo quedan N'}}`.
  - si ya tenía todo lo disponible en el carrito → 422 `STOCK_LIMIT` `{message, code, disponible: N}` (no cambia nada).
- `PUT /api/tienda/carrito/items/:itemId` `{cantidad}`:
  - cantidad > disponible → se guarda limitada, 200 con `aviso STOCK_LIMITED`.
  - producto sin stock y cantidad > 0 → 422 `OUT_OF_STOCK` (bajar a 0 / quitar siempre se permite).
- `POST /api/tienda/carrito/finalizar`: si algún ítem tiene `problema` → 422 `CART_STOCK_CHANGED`
  `{message, code, carrito}` (carrito con los ítems marcados); no genera código.
- Mensajes en español en `message`. Todo lo demás de M-037 igual.

## Tareas
| Tarea | Rol | Archivos | Criterios |
|---|---|---|---|
| T1 | desarrollador-backend | `server/tienda_core.js`, `server/tienda_repo.js`, `server/tienda_routes.js`, `tests/tienda-*.test.js`, `tests/helpers/tienda-memory-repo.js` (no `server.js` si no hace falta) | reglas 2-6 con pruebas; stock leído de la base en cada operación (no del navegador); 207 existentes pasan |
| T2 | desarrollador-frontend | `consulta/consulta.js`, `consulta/consulta_core.js`, `consulta/consulta_ui.js`, `consulta/consulta.css`, `consulta/index.php` (versiones), `tests/consulta-*.test.js` | botón agregar deshabilitado con texto claro en `sin_stock`; selector de cantidad tope = disponible; aviso «Solo quedan N»; ítems con `problema` marcados con acción (quitar o ajustar a N) y «Finalizar» deshabilitado si `bloqueado_por_stock`; maneja OUT_OF_STOCK, STOCK_LIMIT, CART_STOCK_CHANGED |
| T3 | revisor-calidad | — | sin graves |

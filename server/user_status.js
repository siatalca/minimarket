// Si un usuario puede usar el sistema. Depende SOLO de "activo" (interruptor de la ventana Cajeros).
// "estado_usuario" es el "conectado" del sistema de sesion antiguo: Salir lo pone en 0, por eso
// nunca debe decidir si alguien puede entrar (bloquearia a todo el que cerro sesion).
// Un valor NULL o ausente en la fila se considera activo (la columna se crea con DEFAULT 1
// en el arranque, antes de que el servidor atienda pedidos).
function isUserActive(row) {
  if (!row) return false;
  return Number(row.activo ?? 1) === 1;
}

module.exports = { isUserActive };

const test = require('node:test');
const assert = require('node:assert/strict');

const { isUserActive } = require('../server/user_status.js');

// Simula lo que hace el sistema con una cuenta en la base de datos.
function cuenta(campos = {}) {
  return { id: 1, user: 'ana', estado_usuario: 1, activo: 1, ...campos };
}

test('salir y volver a entrar: Salir no bloquea el siguiente ingreso', () => {
  const ana = cuenta();
  assert.equal(isUserActive(ana), true, 'entra');
  ana.estado_usuario = 0; // js/logout.js -> PUT /api/updateUser al presionar Salir
  assert.equal(isUserActive(ana), true, 'despues de Salir puede volver a entrar');
});

test('"Reiniciar base de datos" (estado_usuario = 0 para todos) no bloquea a nadie', () => {
  const todos = [cuenta({ estado_usuario: 0 }), cuenta({ user: 'admin_sia', estado_usuario: 0 })];
  assert.ok(todos.every(isUserActive));
});

test('desactivar en la ventana Cajeros si impide entrar, este o no conectado', () => {
  assert.equal(isUserActive(cuenta({ activo: 0, estado_usuario: 1 })), false);
  assert.equal(isUserActive(cuenta({ activo: 0, estado_usuario: 0 })), false);
  assert.equal(isUserActive(cuenta({ activo: '0' })), false);
});

test('activo NULL o ausente en la fila se considera activo', () => {
  const { activo, ...sinColumna } = cuenta({ estado_usuario: 0 });
  assert.equal(isUserActive(sinColumna), true);
  assert.equal(isUserActive(cuenta({ activo: null })), true);
});

test('sin fila de usuario no hay acceso', () => {
  assert.equal(isUserActive(undefined), false);
  assert.equal(isUserActive(null), false);
});

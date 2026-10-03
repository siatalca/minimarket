const test = require('node:test');
const assert = require('node:assert/strict');

let productNameUi = {};
try {
  productNameUi = require('../js/product_name_display.js');
} catch (_) {
  productNameUi = {};
}

function createNameElement() {
  const classes = new Set(['hidden']);
  return {
    textContent: '',
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      toggle: (name, force) => {
        if (force === true) classes.add(name);
        if (force === false) classes.delete(name);
        if (typeof force === 'undefined') {
          if (classes.has(name)) classes.delete(name);
          else classes.add(name);
        }
        return classes.has(name);
      },
      contains: (name) => classes.has(name),
    },
  };
}

test('muestra el nombre normalizado del producto después del escaneo', () => {
  assert.equal(typeof productNameUi.applyProductNameDisplay, 'function');
  const element = createNameElement();

  productNameUi.applyProductNameDisplay(element, '  Pan   Integral  ');

  assert.equal(element.textContent, 'Pan Integral');
  assert.equal(element.classList.contains('hidden'), false);
});

test('oculta el nombre cuando se limpia o falla la búsqueda', () => {
  assert.equal(typeof productNameUi.applyProductNameDisplay, 'function');
  const element = createNameElement();
  element.textContent = 'Pan Integral';
  element.classList.remove('hidden');

  productNameUi.applyProductNameDisplay(element, '   ');

  assert.equal(element.textContent, '');
  assert.equal(element.classList.contains('hidden'), true);
});

test('el aviso de código existente incluye el nombre del producto', () => {
  assert.equal(typeof productNameUi.buildExistingProductMessage, 'function');

  const message = productNameUi.buildExistingProductMessage('7801234567890', 'Leche Entera');

  assert.equal(message, 'El código 7801234567890 ya está registrado como "Leche Entera".');
});

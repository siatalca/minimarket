const test = require('node:test');
const assert = require('node:assert/strict');

const { createRestrictedCloseController } = require('../js/restricted_shift_close');

test('fallo de impresión muestra comprobante y reintenta sin repetir cierre', async () => {
  let closeCalls = 0;
  let printCalls = 0;
  let clears = 0;
  const rendered = [];
  const receipt = { cut_id: 42, text: 'COMPROBANTE COMPLETO' };
  const controller = createRestrictedCloseController({
    closeShift: async () => { closeCalls += 1; return receipt; },
    printReceipt: async () => {
      printCalls += 1;
      if (printCalls === 1) throw new Error('bridge caído');
    },
    clearLocalState: () => { clears += 1; },
    renderReceipt: (value, error) => rendered.push({ value, error: error?.message || '' }),
  });

  const first = await controller.close({ cash: 100, card: 0 });
  assert.equal(first.printed, false);
  assert.equal(closeCalls, 1);
  assert.equal(clears, 1);
  assert.deepEqual(rendered, [{ value: receipt, error: 'bridge caído' }]);

  const retry = await controller.retryPrint();
  assert.equal(retry.printed, true);
  assert.equal(closeCalls, 1);
  assert.equal(printCalls, 2);
});

test('doble confirmación no ejecuta dos cierres', async () => {
  let closeCalls = 0;
  let resolveClose;
  const pending = new Promise((resolve) => { resolveClose = resolve; });
  const controller = createRestrictedCloseController({
    closeShift: async () => { closeCalls += 1; return pending; },
    printReceipt: async () => {},
    clearLocalState: () => {},
    renderReceipt: () => {},
  });
  const first = controller.close({ cash: 0, card: 0 });
  const second = controller.close({ cash: 0, card: 0 });
  assert.equal(first, second);
  resolveClose({ cut_id: 10, text: 'cierre' });
  await first;
  assert.equal(closeCalls, 1);
});

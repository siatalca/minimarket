(function registerRestrictedShiftClose(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.MinimarketRestrictedShiftClose = api;
})(typeof window !== 'undefined' ? window : globalThis, function createApi() {
  function createRestrictedCloseController({ closeShift, printReceipt, clearLocalState, renderReceipt }) {
    let closePromise = null;
    let receipt = null;
    const attemptPrint = async () => {
      try {
        await printReceipt(receipt);
        return { printed: true, receipt };
      } catch (error) {
        renderReceipt(receipt, error);
        return { printed: false, receipt, error };
      }
    };
    return {
      close(input) {
        if (!closePromise) {
          closePromise = Promise.resolve()
            .then(() => closeShift(input))
            .then(async (result) => {
              receipt = result;
              clearLocalState();
              return attemptPrint();
            });
        }
        return closePromise;
      },
      retryPrint() {
        if (!receipt) return Promise.reject(new Error('No hay comprobante para reimprimir'));
        return attemptPrint();
      },
    };
  }
  return { createRestrictedCloseController };
});

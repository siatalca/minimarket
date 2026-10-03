(function registerProductNameDisplay(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.MinimarketProductNameUi = api;
    }
}(typeof window !== 'undefined' ? window : globalThis, function createProductNameDisplay() {
    function normalizeProductName(value) {
        return String(value || '').trim().replace(/\s+/g, ' ');
    }

    function applyProductNameDisplay(element, productName) {
        if (!element) return;
        const normalizedName = normalizeProductName(productName);
        element.textContent = normalizedName;
        element.classList.toggle('hidden', !normalizedName);
    }

    function buildExistingProductMessage(code, productName) {
        const normalizedCode = String(code || '').trim();
        const normalizedName = normalizeProductName(productName);
        if (!normalizedName) return `El código ${normalizedCode} ya está registrado.`;
        return `El código ${normalizedCode} ya está registrado como "${normalizedName}".`;
    }

    return {
        applyProductNameDisplay,
        buildExistingProductMessage,
    };
}));

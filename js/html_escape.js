// Escapa texto antes de insertarlo como HTML (nombres, descripciones, etc.).
// Unica definicion del sistema: se carga antes que scripts.js, functions.js y los scripts
// de las ventanas emergentes que la usan.
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { escapeHtml };
}

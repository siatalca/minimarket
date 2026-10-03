(function registerMinimarketApiBase(root, factory) {
    const api = factory(root);
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.MinimarketApi = api;
    }
})(typeof window !== 'undefined' ? window : globalThis, function createMinimarketApiBase(root) {
    const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

    function normalizeHostname(hostname) {
        return String(hostname || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
    }

    function isLoopbackHostname(hostname) {
        return LOOPBACK_HOSTS.has(normalizeHostname(hostname));
    }

    function ensureTrailingSlash(value) {
        return value.endsWith('/') ? value : `${value}/`;
    }

    function formatHostname(hostname) {
        const normalized = normalizeHostname(hostname);
        return normalized.includes(':') ? `[${normalized}]` : normalized;
    }

    function readStoredOverride() {
        try {
            return root?.localStorage?.getItem('api_url') || '';
        } catch (_) {
            return '';
        }
    }

    function resolveOverride(override, location) {
        const raw = String(override || '').trim();
        if (!raw) return null;
        try {
            const parsed = new URL(raw, location.origin);
            if (!['http:', 'https:'].includes(parsed.protocol)) return null;
            if (parsed.username || parsed.password) return null;
            if (isLoopbackHostname(parsed.hostname) && !isLoopbackHostname(location.hostname)) return null;
            parsed.hash = '';
            parsed.search = '';
            return ensureTrailingSlash(parsed.href);
        } catch (_) {
            return null;
        }
    }

    function resolveLocalApiFallback(location = root?.location) {
        if (!location || !isLoopbackHostname(location.hostname)) return null;
        return `http://${formatHostname(location.hostname)}:3002/`;
    }

    function resolveApiBase(options = {}) {
        const location = options.location || root?.location;
        if (!location?.origin || !location?.hostname) {
            throw new Error('No se pudo determinar la ubicacion actual para resolver la API.');
        }

        const override = Object.prototype.hasOwnProperty.call(options, 'override')
            ? options.override
            : readStoredOverride();
        const resolvedOverride = resolveOverride(override, location);
        if (resolvedOverride) return resolvedOverride;

        if (!isLoopbackHostname(location.hostname)) {
            return ensureTrailingSlash(location.origin);
        }
        if (String(location.port || '') === '3002') {
            return ensureTrailingSlash(location.origin);
        }
        return resolveLocalApiFallback(location);
    }

    return {
        isLoopbackHostname,
        resolveApiBase,
        resolveLocalApiFallback,
    };
});

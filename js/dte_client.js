(function initDteClientModule(globalScope) {
    const API_URL = (() => {
        const override = window.localStorage.getItem('api_url');
        if (override) {
            return override.endsWith('/') ? override : `${override}/`;
        }
        if (window.location.port === '3002') {
            return `${window.location.origin}/`;
        }
        const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
        const protocol = isLocalHost ? 'http:' : window.location.protocol;
        return `${protocol}//${window.location.hostname}:3002/`;
    })();

    function withAuthHeaders(headers = {}) {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
    }

    async function requestJson(path, options = {}) {
        const response = await fetch(API_URL + path, {
            ...options,
            headers: withAuthHeaders(options.headers || {}),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(data.message || 'Error de API DTE');
            error.status = response.status;
            error.payload = data;
            throw error;
        }
        return data;
    }

    async function fetchDteConfig() {
        return requestJson('api/dte/config');
    }

    async function saveDteConfig(payload) {
        return requestJson('api/dte/config', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload || {}),
        });
    }

    async function createDteDraftFromSale(payload) {
        return requestJson('api/dte/drafts/from-sale', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload || {}),
        });
    }

    async function listDteDrafts(params = {}) {
        const query = new URLSearchParams();
        if (params.estado) query.set('estado', String(params.estado));
        if (params.limit) query.set('limit', String(params.limit));
        const suffix = query.toString() ? `?${query.toString()}` : '';
        return requestJson(`api/dte/drafts${suffix}`);
    }

    async function fetchDteDraftDetail(dteId) {
        return requestJson(`api/dte/drafts/${Number(dteId || 0)}`);
    }

    async function prepareDteDraft(dteId, payload = {}) {
        return requestJson(`api/dte/drafts/${Number(dteId || 0)}/prepare`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload || {}),
        });
    }

    async function submitDteDraft(dteId, payload = {}) {
        return requestJson(`api/dte/drafts/${Number(dteId || 0)}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload || {}),
        });
    }

    async function pollDteTrack(dteId, payload = {}) {
        return requestJson(`api/dte/drafts/${Number(dteId || 0)}/track`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload || {}),
        });
    }

    async function retryDteDraft(dteId, payload = {}) {
        return requestJson(`api/dte/drafts/${Number(dteId || 0)}/retry`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload || {}),
        });
    }

    async function fetchCertificateMetadata() {
        return requestJson('api/dte/certificate');
    }

    async function saveCertificate(payload) {
        return requestJson('api/dte/certificate', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload || {}),
        });
    }

    async function deleteCertificate() {
        return requestJson('api/dte/certificate', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        });
    }

    async function verifyCertificatePassword(password) {
        return requestJson('api/dte/certificate/verify-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: String(password || '') }),
        });
    }

    async function printTest58mm() {
        return requestJson('api/dte/print-test-58mm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        });
    }

    globalScope.DteClient = {
        fetchDteConfig,
        saveDteConfig,
        createDteDraftFromSale,
        listDteDrafts,
        fetchDteDraftDetail,
        prepareDteDraft,
        submitDteDraft,
        pollDteTrack,
        retryDteDraft,
        fetchCertificateMetadata,
        saveCertificate,
        deleteCertificate,
        verifyCertificatePassword,
        printTest58mm,
    };
})(window);

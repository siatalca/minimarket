// Verificacion del ID token de "Continuar con Google" (M-037), sin dependencias nuevas:
// jsonwebtoken + las llaves publicas de Google (JWKS) convertidas con crypto.createPublicKey.
// Exige RS256, aud = GOOGLE_CLIENT_ID, iss de Google, exp vigente y correo verificado.

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
const CREDENTIAL_MAX_LENGTH = 4096;

class GoogleAuthError extends Error {
  // code: GOOGLE_INVALID (token malo, 401) o GOOGLE_UNAVAILABLE (no se pudo consultar a Google, 503).
  constructor(code, message) {
    super(message);
    this.code = code;
    this.status = code === 'GOOGLE_UNAVAILABLE' ? 503 : 401;
  }
}

function parseMaxAgeMs(cacheControl) {
  const match = String(cacheControl || '').match(/max-age=(\d+)/i);
  return match ? Number(match[1]) * 1000 : null;
}

async function defaultFetchJwks() {
  const response = await fetch(GOOGLE_JWKS_URL, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`JWKS HTTP ${response.status}`);
  const body = await response.json();
  return { keys: Array.isArray(body?.keys) ? body.keys : [], maxAgeMs: parseMaxAgeMs(response.headers.get('cache-control')) };
}

// fetchJwks se inyecta en las pruebas; devuelve { keys: [jwk...], maxAgeMs? }.
function createGoogleVerifier({
  clientId,
  fetchJwks = defaultFetchJwks,
  now = () => Date.now(),
  defaultCacheMs = 60 * 60 * 1000,
  minRefetchMs = 60 * 1000,
} = {}) {
  let cache = { keys: new Map(), expiresAt: 0, fetchedAt: 0 };
  let inflight = null;

  async function refresh() {
    if (!inflight) {
      inflight = (async () => {
        try {
          const { keys, maxAgeMs } = await fetchJwks();
          const map = new Map();
          for (const jwk of keys || []) {
            if (!jwk || jwk.kty !== 'RSA' || typeof jwk.kid !== 'string') continue;
            try {
              map.set(jwk.kid, crypto.createPublicKey({ key: jwk, format: 'jwk' }));
            } catch (_) {
              // llave mal formada: se ignora
            }
          }
          const t = now();
          cache = { keys: map, expiresAt: t + (maxAgeMs || defaultCacheMs), fetchedAt: t };
        } finally {
          inflight = null;
        }
      })();
    }
    return inflight;
  }

  async function getKey(kid) {
    const t = now();
    if (t >= cache.expiresAt) {
      await refresh();
    } else if (!cache.keys.has(kid) && t - cache.fetchedAt >= minRefetchMs) {
      // Google rota sus llaves: un kid nuevo fuerza una recarga (como maximo una por minuto).
      await refresh();
    }
    return cache.keys.get(kid) || null;
  }

  // Devuelve { sub, email, name } o lanza GoogleAuthError.
  async function verify(credential) {
    if (!clientId) throw new GoogleAuthError('GOOGLE_INVALID', 'Google no esta configurado');
    if (typeof credential !== 'string' || !credential || credential.length > CREDENTIAL_MAX_LENGTH) {
      throw new GoogleAuthError('GOOGLE_INVALID', 'Credencial de Google invalida');
    }
    const decoded = jwt.decode(credential, { complete: true });
    const kid = decoded?.header?.kid;
    if (!decoded || decoded.header?.alg !== 'RS256' || typeof kid !== 'string') {
      throw new GoogleAuthError('GOOGLE_INVALID', 'Credencial de Google invalida');
    }

    let key;
    try {
      key = await getKey(kid);
    } catch (_) {
      throw new GoogleAuthError('GOOGLE_UNAVAILABLE', 'No se pudo verificar con Google. Intenta de nuevo.');
    }
    if (!key) throw new GoogleAuthError('GOOGLE_INVALID', 'Credencial de Google invalida');

    let payload;
    try {
      payload = jwt.verify(credential, key, {
        algorithms: ['RS256'],
        audience: clientId,
        issuer: GOOGLE_ISSUERS,
        clockTimestamp: Math.floor(now() / 1000),
        clockTolerance: 30,
      });
    } catch (_) {
      throw new GoogleAuthError('GOOGLE_INVALID', 'Credencial de Google invalida');
    }

    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    if (!sub || sub.length > 64 || !email || !emailVerified) {
      throw new GoogleAuthError('GOOGLE_INVALID', 'La cuenta de Google no tiene un correo verificado');
    }
    return { sub, email, name: typeof payload.name === 'string' ? payload.name : '' };
  }

  return { verify };
}

module.exports = {
  GOOGLE_JWKS_URL,
  GOOGLE_ISSUERS,
  GoogleAuthError,
  createGoogleVerifier,
  parseMaxAgeMs,
};

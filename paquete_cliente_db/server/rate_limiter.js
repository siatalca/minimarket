// Limites de intentos en memoria del proceso (al reiniciar el backend parten de cero).
// Lo usan ambos backends: server/server.js y paquete_cliente_db/server/server.js.

function createRateLimiter({ max, windowMs, now = () => Date.now(), maxKeys = 10000 } = {}) {
  if (!Number.isInteger(max) || max < 1) throw new Error('max debe ser un entero positivo');
  if (!Number.isFinite(windowMs) || windowMs <= 0) throw new Error('windowMs debe ser positivo');
  const entries = new Map();

  function current(key) {
    const entry = entries.get(key);
    if (entry && now() - entry.start >= windowMs) {
      entries.delete(key);
      return null;
    }
    return entry || null;
  }

  function prune() {
    if (entries.size < maxKeys) return;
    for (const key of entries.keys()) current(key);
    // Si aun esta lleno, descarta las claves mas antiguas para acotar la memoria.
    while (entries.size >= maxKeys) entries.delete(entries.keys().next().value);
  }

  return {
    // Cuanto falta para poder intentar de nuevo (0 = permitido).
    retryAfterMs(key) {
      const entry = current(String(key));
      if (!entry || entry.count < max) return 0;
      return Math.max(0, windowMs - (now() - entry.start));
    },
    // Registra un evento y devuelve true si quedo dentro del limite.
    hit(key) {
      const k = String(key);
      prune();
      const entry = current(k) || { start: now(), count: 0 };
      entry.count += 1;
      entries.set(k, entry);
      return entry.count <= max;
    },
    // Descuenta un evento (por ejemplo, un login correcto desde una IP compartida).
    release(key) {
      const entry = current(String(key));
      if (entry && entry.count > 0) entry.count -= 1;
    },
    reset(key) {
      entries.delete(String(key));
    },
  };
}

function retryAfterSeconds(ms) {
  return Math.max(1, Math.ceil(Number(ms || 0) / 1000));
}

// IP del cliente, o null si no se conoce: sin X-Forwarded-For todo llega como 127.0.0.1,
// y limitar por esa IP bloquearia a todo el local a la vez.
function clientIpKey(req) {
  const ip = String(req?.ip || '').replace(/^::ffff:/, '');
  if (!ip || ip === '127.0.0.1' || ip === '::1') return null;
  return ip;
}

function rejectRateLimited(res, retryMs, message) {
  res.set('Retry-After', String(retryAfterSeconds(retryMs)));
  return res.status(429).json({ message, error: message, code: 'RATE_LIMITED' });
}

// Cuenta un pedido publico de registro; responde 429 y devuelve false si supera el limite.
function allowRegistrationRequest(req, res, ipLimiter, globalLimiter) {
  const ip = clientIpKey(req);
  const message = 'Demasiados registros de equipos en poco tiempo. Intenta de nuevo mas tarde.';
  if (ip && !ipLimiter.hit(ip)) {
    rejectRateLimited(res, ipLimiter.retryAfterMs(ip), message);
    return false;
  }
  if (!globalLimiter.hit('global')) {
    rejectRateLimited(res, globalLimiter.retryAfterMs('global'), message);
    return false;
  }
  return true;
}

// Limite de intentos de login. Reglas:
// - Cada intento se cuenta ANTES de esperar a la base de datos o a bcrypt, asi pedidos
//   simultaneos no pueden saltarse el limite.
// - Por IP (si se conoce): todo intento cuenta; un login correcto lo descuenta.
// - Por cuenta (id del usuario, no el texto escrito): el limite estricto es cuenta + IP, para que
//   un tercero no pueda bloquear la cuenta de otro desde su propia IP. Un umbral alto solo por
//   cuenta frena la fuerza bruta repartida en muchas IP. Sin IP conocida queda solo por cuenta.
function createLoginGuard({
  windowMs = 15 * 60 * 1000,
  perIpMax = 30,
  perAccountIpMax = 8,
  perAccountMax = 50,
  perAccountNoIpMax = 8,
  now,
} = {}) {
  const byIp = createRateLimiter({ max: perIpMax, windowMs, now });
  const byAccountIp = createRateLimiter({ max: perAccountIpMax, windowMs, now });
  const byAccount = createRateLimiter({ max: perAccountMax, windowMs, now });
  const byAccountNoIp = createRateLimiter({ max: perAccountNoIpMax, windowMs, now });

  function blocked(limiter, key) {
    return { ok: false, retryMs: Math.max(1, limiter.retryAfterMs(key)) };
  }

  return {
    // Al recibir el pedido, antes de cualquier await.
    beginAttempt(ip) {
      if (ip && !byIp.hit(ip)) return blocked(byIp, ip);
      return { ok: true, retryMs: 0 };
    },
    // Con el usuario ya identificado y antes de comparar la clave (sin await en medio).
    checkAccount(userId, ip) {
      const account = String(userId);
      if (ip) {
        const accountIp = `${account}|${ip}`;
        if (!byAccountIp.hit(accountIp)) return blocked(byAccountIp, accountIp);
        if (!byAccount.hit(account)) return blocked(byAccount, account);
      } else if (!byAccountNoIp.hit(account)) {
        return blocked(byAccountNoIp, account);
      }
      return { ok: true, retryMs: 0 };
    },
    // Login correcto: limpia los contadores de la cuenta y descuenta el intento de la IP.
    success(userId, ip) {
      const account = String(userId);
      if (ip) {
        byAccountIp.reset(`${account}|${ip}`);
        byIp.release(ip);
      }
      byAccount.release(account);
      byAccountNoIp.reset(account);
    },
  };
}

function loginBlockedMessage(retryMs) {
  const minutes = Math.max(1, Math.ceil(Number(retryMs || 0) / 60000));
  return `Demasiados intentos fallidos. Intenta de nuevo en ${minutes} minuto${minutes === 1 ? '' : 's'}.`;
}

module.exports = {
  createRateLimiter,
  retryAfterSeconds,
  clientIpKey,
  rejectRateLimited,
  allowRegistrationRequest,
  createLoginGuard,
  loginBlockedMessage,
};

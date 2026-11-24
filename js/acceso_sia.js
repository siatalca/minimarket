// Acceso SIA: ingreso de soporte (solo admin_sia) sin caja y sin turno, desde cualquier equipo.
// Lógica pura (sin DOM) más dos ayudas pequeñas de pantalla; se carga en index.php y en home.php.
(function registerAccesoSia(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.MinimarketAccesoSia = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function createAccesoSiaApi() {
  const FLAG_KEY = 'acceso_sia';
  // Si el equipo ya era una caja, su número se guarda aparte mientras dura el Acceso SIA
  // y se devuelve al salir, para que el equipo no pierda su caja.
  const PREVIOUS_CAJA_KEY = 'acceso_sia_n_caja_previa';
  const SIN_CAJA_CODE = 'ACCESO_SIA_SIN_CAJA';
  const NO_AUTORIZADO_CODE = 'ACCESO_SIA_NO_AUTORIZADO';
  const SIN_CAJA_MESSAGE = 'Esta acción requiere una caja.';
  const BADGE_TEXT = 'Acceso SIA · sin caja';
  const EXPIRED_MESSAGE = 'Tu Acceso SIA terminó (dura como máximo 8 horas). Vuelve a iniciar sesión.';

  function isAccesoSiaSession(local) {
    return String(local?.getItem(FLAG_KEY) || '') === '1';
  }

  function buildLoginBody(username, password) {
    return {
      username: String(username || '').trim(),
      password: String(password || ''),
      acceso_sia: true,
    };
  }

  // La respuesta 200 debe tener la forma del contrato; si no, se trata como error y no se guarda nada.
  function isValidLoginResponse(data) {
    if (!data || typeof data !== 'object') return false;
    if (data.acceso_sia !== true) return false;
    if (data.numero_caja !== null) return false;
    if (typeof data.token !== 'string' || !data.token.trim()) return false;
    if (typeof data.refresh_token !== 'string' || !data.refresh_token.trim()) return false;
    const id = Number(data.id);
    return Number.isInteger(id) && id > 0;
  }

  function describeLoginError(status, data) {
    const serverMessage = String(data?.message || data?.error || '').trim();
    if (status === 401) return 'Usuario o contraseña incorrecta.';
    if (status === 403 && data?.code === NO_AUTORIZADO_CODE) {
      return 'Acceso no autorizado. El Acceso SIA es solo para el usuario de soporte SIA.';
    }
    if (status === 403) return serverMessage || 'Acceso no autorizado.';
    if (status === 429) return serverMessage || 'Demasiados intentos. Espera un momento e intenta de nuevo.';
    if (status >= 500) return 'El servidor no pudo procesar el ingreso. Intenta de nuevo en un momento.';
    return serverMessage || `No se pudo iniciar el Acceso SIA (error ${status}).`;
  }

  async function requestLogin({ fetchImpl, apiUrl, username, password }) {
    const body = buildLoginBody(username, password);
    if (!body.username || !body.password) {
      return { ok: false, message: 'Debes ingresar usuario y contraseña.' };
    }
    let response;
    try {
      response = await fetchImpl(`${apiUrl}api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (_) {
      return { ok: false, message: 'No se pudo conectar con el servidor de login.' };
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return { ok: false, message: describeLoginError(response.status, data) };
    }
    if (!isValidLoginResponse(data)) {
      return { ok: false, message: 'Respuesta inesperada del servidor. No se inició el Acceso SIA.' };
    }
    return { ok: true, data };
  }

  function markSession(local) {
    const caja = String(local.getItem('n_caja') || '').trim();
    if (/^\d+$/.test(caja) && !local.getItem(PREVIOUS_CAJA_KEY)) {
      local.setItem(PREVIOUS_CAJA_KEY, caja);
    }
    local.removeItem('n_caja');
    local.setItem(FLAG_KEY, '1');
  }

  function restorePreviousCaja(local) {
    const previous = String(local?.getItem(PREVIOUS_CAJA_KEY) || '').trim();
    if (!previous) return;
    if (/^\d+$/.test(previous) && !String(local.getItem('n_caja') || '').trim()) {
      local.setItem('n_caja', previous);
    }
    local.removeItem(PREVIOUS_CAJA_KEY);
  }

  function clearSession(local) {
    if (!local) return;
    local.removeItem(FLAG_KEY);
    restorePreviousCaja(local);
  }

  function isSinCajaError(status, data) {
    return Number(status) === 403 && data?.code === SIN_CAJA_CODE;
  }

  // --- Pantalla (home) ---
  function applyHomeMode(doc) {
    if (!doc?.body) return;
    doc.body.classList.add('acceso-sia-mode');
    if (doc.getElementById('acceso-sia-badge')) return;
    const host = doc.querySelector('.header-brand') || doc.querySelector('.header');
    if (!host) return;
    const badge = doc.createElement('span');
    badge.id = 'acceso-sia-badge';
    badge.className = 'acceso-sia-badge';
    badge.title = 'Sesión de soporte SIA: sin caja ni turno. Ventas y movimientos de caja no están disponibles.';
    badge.textContent = BADGE_TEXT;
    host.appendChild(badge);
  }

  let noticeTimer = null;
  function showSinCajaNotice(doc, message) {
    if (!doc?.body) return;
    let notice = doc.getElementById('acceso-sia-notice');
    if (!notice) {
      notice = doc.createElement('p');
      notice.id = 'acceso-sia-notice';
      notice.className = 'acceso-sia-notice';
      notice.setAttribute('role', 'status');
      doc.body.appendChild(notice);
    }
    notice.textContent = `${String(message || '').trim() || SIN_CAJA_MESSAGE} El Acceso SIA no tiene caja.`;
    notice.classList.remove('hidden');
    if (noticeTimer) clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => notice.classList.add('hidden'), 6000);
  }

  return {
    FLAG_KEY,
    PREVIOUS_CAJA_KEY,
    SIN_CAJA_CODE,
    NO_AUTORIZADO_CODE,
    SIN_CAJA_MESSAGE,
    BADGE_TEXT,
    EXPIRED_MESSAGE,
    isAccesoSiaSession,
    buildLoginBody,
    isValidLoginResponse,
    describeLoginError,
    requestLogin,
    markSession,
    restorePreviousCaja,
    clearSession,
    isSinCajaError,
    applyHomeMode,
    showSinCajaNotice,
  };
});

// -------------configuraciones que se cargar al momento de cargar 
// -------------los elementos de la vista
function hasLocalBusinessInfo() {
  const requiredKeys = ['nombre_local', 'telefono_local', 'mail_local', 'tipo_local'];
  return requiredKeys.every((key) => String(localStorage.getItem(key) || '').trim() !== '');
}

function hasLocalCajaAssigned() {
  return /^\d+$/.test(String(localStorage.getItem('n_caja') || '').trim());
}

function normalizeServerBoxesList(cajas) {
  if (Array.isArray(cajas)) return cajas;
  return [];
}

let inactiveAssignedCaja = null;

function getInactiveCajaMessage(caja) {
  return `La caja numero Nro ${caja} ha sido desactivada, contactar al administrador para dar de alta la caja.`;
}

function setLoginFormEnabled(enabled) {
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const submitButton = document.querySelector('#login-form button[type="submit"]');
  if (usernameInput) usernameInput.disabled = !enabled;
  if (passwordInput) passwordInput.disabled = !enabled;
  if (submitButton) submitButton.disabled = !enabled;
}

async function validateAssignedCajaIsActive() {
  const numeroCaja = String(localStorage.getItem('n_caja') || '').trim();
  inactiveAssignedCaja = null;
  if (!/^\d+$/.test(numeroCaja)) {
    setLoginFormEnabled(true);
    return true;
  }

  try {
    const cajas = normalizeServerBoxesList(await getCajas());
    const box = cajas.find((item) => String(item?.n_caja || '').trim() === numeroCaja);
    if (!box) {
      setLoginFormEnabled(true);
      return true;
    }

    const isActive = Number(box?.estado || 0) === 1;
    if (isActive) {
      setLoginFormEnabled(true);
      return true;
    }

    inactiveAssignedCaja = numeroCaja;
    setLoginFormEnabled(false);
    return false;
  } catch (_) {
    setLoginFormEnabled(true);
    return true;
  }
}

function buildRawDeviceFingerprint() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const nav = window.navigator || {};
  const scr = window.screen || {};
  const parts = [
    'minimarket-device-v1',
    nav.userAgent || '',
    nav.platform || '',
    nav.vendor || '',
    nav.language || '',
    Array.isArray(nav.languages) ? nav.languages.join(',') : '',
    String(nav.hardwareConcurrency || ''),
    String(nav.deviceMemory || ''),
    String(nav.maxTouchPoints || ''),
    `${scr.width || ''}x${scr.height || ''}`,
    String(scr.colorDepth || ''),
    String(window.devicePixelRatio || ''),
    tz,
  ];
  return parts.join('|');
}

function fallbackHash(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

async function sha256Hex(text) {
  if (window.crypto?.subtle && typeof TextEncoder !== 'undefined') {
    const data = new TextEncoder().encode(text);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return fallbackHash(text);
}

async function getDeviceFingerprint() {
  const raw = buildRawDeviceFingerprint();
  const hash = await sha256Hex(raw);
  if (hash) {
    localStorage.setItem('device_fp', hash);
  }
  return hash;
}

async function resolveCajaFromDeviceBinding(fingerprint) {
  if (!fingerprint) return false;
  try {
    const response = await fetch(API_URL + `api/device-caja/resolve?fingerprint=${encodeURIComponent(fingerprint)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.found || !/^\d+$/.test(String(data.numero_caja || ''))) {
      return false;
    }
    localStorage.setItem('n_caja', String(data.numero_caja));
    if (String(data.nombre_caja || '').trim()) {
      localStorage.setItem('nombre_caja', String(data.nombre_caja).trim());
    } else if (!String(localStorage.getItem('nombre_caja') || '').trim()) {
      localStorage.setItem('nombre_caja', `Caja ${data.numero_caja}`);
    }
    return true;
  } catch (_) {
    return false;
  }
}

async function bindCajaToDeviceFingerprint(fingerprint, numeroCaja, nombreCaja) {
  if (!fingerprint || !/^\d+$/.test(String(numeroCaja || ''))) return;
  try {
    await fetch(API_URL + 'api/device-caja/bind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fingerprint,
        numero_caja: Number(numeroCaja),
        nombre_caja: String(nombreCaja || `Caja ${numeroCaja}`),
      }),
    });
  } catch (_) {}
}

async function syncLocalBootstrapToServer() {
  const syncStatus = {
    infoReachable: false,
    cajasReachable: false,
  };
  const authHeaders = typeof withAuthHeaders === 'function' ? withAuthHeaders() : {};
  const fingerprint = await getDeviceFingerprint();
  const hadLocalCaja = /^\d+$/.test(String(localStorage.getItem('n_caja') || '').trim());
  if (!hadLocalCaja) {
    await resolveCajaFromDeviceBinding(fingerprint);
  }

  const numeroCaja = String(localStorage.getItem('n_caja') || '').trim();
  const nombreCaja = String(localStorage.getItem('nombre_caja') || '').trim();

  try {
    const infoResponse = await fetch(API_URL + 'api/getInfo', { headers: authHeaders });
    const serverInfo = await infoResponse.json().catch(() => []);
    syncStatus.infoReachable = infoResponse.ok;
    if (infoResponse.ok) {
      const serverHasInfo = Array.isArray(serverInfo) && serverInfo.length > 0;
      if (!serverHasInfo && hasLocalBusinessInfo()) {
        await addInfo();
      }
    }
  } catch (_) {}

  if (!/^\d+$/.test(numeroCaja)) {
    return syncStatus;
  }

  try {
    const cajasResponse = await fetch(API_URL + 'api/getCajas', { headers: authHeaders });
    const cajasPayload = await cajasResponse.json().catch(() => []);
    syncStatus.cajasReachable = cajasResponse.ok;
    if (cajasResponse.ok) {
      const cajas = normalizeServerBoxesList(cajasPayload);
      const cajaExistsOnServer = cajas.some((item) => String(item?.n_caja || '').trim() === numeroCaja);
      if (!cajaExistsOnServer) {
        if (!nombreCaja) {
          localStorage.setItem('nombre_caja', `Caja ${numeroCaja}`);
        }
        await addCajaConnected();
      }
    }
  } catch (_) {}

  if (syncStatus.cajasReachable) {
    await bindCajaToDeviceFingerprint(
      fingerprint,
      numeroCaja,
      String(localStorage.getItem('nombre_caja') || '').trim() || `Caja ${numeroCaja}`
    );
  }
  return syncStatus;
}

function applyLoginBranding() {
  const logoEl = document.getElementById('login-company-logo');
  const nameEl = document.getElementById('login-company-name');
  const subtitleEl = document.getElementById('login-company-subtitle');
  if (!logoEl) return;

  // Branding del creador: fijo para la pantalla de login.
  logoEl.src = './img/cajero-automatico.png';
  logoEl.onerror = () => {
    if (!logoEl.src.includes('cajero-automatico.png')) {
      logoEl.src = './img/cajero-automatico.png';
    }
  };

  if (nameEl) {
    nameEl.textContent = 'SIA';
  }
  if (subtitleEl) {
    subtitleEl.textContent = 'Soluciones Informáticas Avanzadas · Creador del sistema';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  applyLoginBranding();
  const username = localStorage.getItem('user');
  const estadoLogin = localStorage.getItem('estado_login');
  const hadLocalBusiness = hasLocalBusinessInfo();
  const hadLocalCaja = hasLocalCajaAssigned();
  const needsServerBootstrap = !hadLocalBusiness || !hadLocalCaja;
  let bootstrapStatus = {
    infoReachable: false,
    cajasReachable: false,
  };

  if (username) {
      const inputName = document.getElementById('username');
      inputName.value = username;
    }
  if (estadoLogin === '1') {
      document.getElementById('msj_activo').classList.remove('hidden');
    }

  if (needsServerBootstrap) {
    bootstrapStatus = await syncLocalBootstrapToServer();
  }
  const numero_caja = String(localStorage.getItem('n_caja') || '').trim();
  const cajaActiva = bootstrapStatus.cajasReachable ? await validateAssignedCajaIsActive() : true;

  // Prioridad: si esta caja ya fue asignada en almacenamiento local,
  // ir directo al login sin pedir "Agregar Caja Nueva" otra vez.
  if (/^\d+$/.test(numero_caja)) {
    document.getElementById('config-form').classList.add('hidden');
    document.getElementById('welcome-msj').classList.add('hidden');
    document.getElementById('load').classList.add('hidden');
    document.getElementById('login').classList.remove('hidden');
    if (!cajaActiva) {
      const msg = document.getElementById('msj_activo');
      if (msg) {
        msg.textContent = getInactiveCajaMessage(numero_caja);
        msg.classList.remove('hidden');
      }
      return;
    }
    await refreshShiftLockMessage();
    return;
  }

  const localBusinessReady = hasLocalBusinessInfo();
  let serverInfo = [];
  if (bootstrapStatus.infoReachable) {
    try {
      serverInfo = await getInfo();
    } catch (_) {
      serverInfo = [];
    }
  }
  const serverBusinessReady = Array.isArray(serverInfo) && serverInfo.length > 0 && Boolean(serverInfo[0]?.nombre);

  // Si el negocio existe en servidor, sincronizar cache local y NO volver a pedir datos del negocio.
  if (serverBusinessReady && serverInfo[0]) {
    const row = serverInfo[0];
    if (String(row.nombre || '').trim()) localStorage.setItem('nombre_local', String(row.nombre).trim());
    if (String(row.telefono || '').trim()) localStorage.setItem('telefono_local', String(row.telefono).trim());
    if (String(row.mail || '').trim()) localStorage.setItem('mail_local', String(row.mail).trim());
    if (String(row.tipo_local || '').trim()) localStorage.setItem('tipo_local', String(row.tipo_local).trim());
  }

  const businessReady = serverBusinessReady || localBusinessReady;

  if (!businessReady) {
    document.getElementById('welcome-msj').classList.remove('hidden');
    document.getElementById('load').classList.add('hidden');
    return;
  }

  // Negocio listo: en equipo nuevo pedir SOLO caja (no datos del negocio).
  document.getElementById('load').classList.add('hidden');
  document.getElementById('welcome-msj').classList.add('hidden');
  document.getElementById('config-form').classList.add('hidden');
  document.getElementById('add-caja').classList.remove('hidden');

  // Si por alguna razon reaparece una caja local entre refrescos, entrar directo.
  if (hasLocalCajaAssigned()) {
    document.getElementById('welcome-msj').classList.add('hidden');
    document.getElementById('add-caja').classList.add('hidden');
    document.getElementById('login').classList.remove('hidden');
    const active = await validateAssignedCajaIsActive();
    if (!active) {
      const msg = document.getElementById('msj_activo');
      const caja = String(localStorage.getItem('n_caja') || '').trim();
      if (msg) {
        msg.textContent = getInactiveCajaMessage(caja);
        msg.classList.remove('hidden');
      }
      return;
    }
    await refreshShiftLockMessage();
  }

});

async function refreshShiftLockMessage() {
  const msg = document.getElementById('msj_activo');
  if (!msg) return;
  if (inactiveAssignedCaja) {
    msg.textContent = getInactiveCajaMessage(inactiveAssignedCaja);
    msg.classList.remove('hidden');
    setLoginFormEnabled(false);
    return;
  }
  const caja = String(localStorage.getItem('n_caja') || '').trim();
  const token = String(sessionStorage.getItem('token') || localStorage.getItem('token') || '').trim();
  if (!caja) {
    msg.classList.add('hidden');
    setLoginFormEnabled(true);
    return;
  }
  if (!token) {
    const ownerCaja = String(localStorage.getItem('turno_owner_caja') || '').trim();
    const ownerUser = String(localStorage.getItem('turno_owner_user') || '').trim();
    if (ownerCaja === caja && ownerUser) {
      msg.textContent = `Caja ${caja} tiene un turno abierto. Solo el cajero del turno abierto puede ingresar hasta cerrar caja.`;
      msg.classList.remove('hidden');
    } else if (localStorage.getItem('estado_login') === '1') {
      msg.textContent = 'Hay una sesión activa. Ingresa la contraseña para continuar o cerrar el turno anterior.';
      msg.classList.remove('hidden');
    } else {
      msg.classList.add('hidden');
    }
    return;
  }
  try {
    const response = await fetch(API_URL + `api/turno/abierto-caja?caja=${encodeURIComponent(caja)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.abierto) {
      if (localStorage.getItem('estado_login') === '1') {
        msg.textContent = 'Hay una sesión activa. Ingresa la contraseña para continuar o cerrar el turno anterior.';
        msg.classList.remove('hidden');
      } else {
        msg.classList.add('hidden');
      }
      return;
    }
    msg.textContent = `Caja ${caja} tiene turno abierto por ${data.cajero_nombre || 'otro cajero'}. Solo ese usuario puede ingresar hasta cerrar caja.`;
    msg.classList.remove('hidden');
  } catch (_) {
    if (localStorage.getItem('estado_login') === '1') {
      msg.textContent = 'Hay una sesión activa. Ingresa la contraseña para continuar o cerrar el turno anterior.';
      msg.classList.remove('hidden');
    }
  }
}

// -------------boton de vista de bienvenida configurar sistema
document.getElementById('config-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('welcome-msj').classList.add('hidden');
    document.getElementById('data-negocio').classList.remove('hidden');
    
});

// -------------boton de vista de bienvenida agregar caja nueva
document.getElementById('add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('welcome-msj').classList.add('hidden');
    document.getElementById('add-caja').classList.remove('hidden'); 
   
    
});

// -------------boton de vista de configuracion  Datos negocio
document.getElementById('data-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombre-local').value;
    const telefono = document.getElementById('fono-local').value;
    const mail = document.getElementById('mail-local').value;
    const local = document.getElementById('tipo-local').value;

    localStorage.setItem('nombre_local', nombre);
    localStorage.setItem('telefono_local', telefono);
    localStorage.setItem('mail_local', mail);
    localStorage.setItem('tipo_local', local);

    /*console.log(`nombre: ${nombre}`);
    console.log(`telefono: ${telefono}`);
    console.log(`mail: ${mail}`);
    console.log(`local: ${local}`);
    */
    document.getElementById('data-negocio').classList.add('hidden');
    document.getElementById('config-negocio').classList.remove('hidden');   
    
});

// -------------boton de vista de configuracion  opciones negocio
document.getElementById('option-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    let inventario = document.getElementById('inventario');
    let credito = document.getElementById('credito');
    let producto_comun = document.getElementById('producto_comun');
    let margen_ganancia = document.getElementById('margen_ganancia');
    let redondeo = document.getElementById('redondeo');
    let mensaje = document.getElementById('mensaje');

    
    if(!inventario.checked){
      inventario = false;
    }else{
      inventario = true;
    }
    if(!credito.checked){
      credito = false;
    }else{
      credito = true;
    }
    if(!producto_comun.checked){
      producto_comun = false;
    }else{
      producto_comun = true;
    }
    if(!margen_ganancia.checked){
      margen_ganancia = false;
    }else{
      margen_ganancia = true;
    }
    if(!redondeo.checked){
      redondeo = false;
    }else{
      redondeo = true;
    }
    if(!mensaje.checked){
      mensaje = false;
    }else{
      mensaje = true;
    }
    
    
    const monto_ganancia = document.getElementById('id-margen-ganancia').value;
    const monto_redondeo = document.getElementById('id-formato-cantidad-cerrada').value;
    const data_mensaje = document.getElementById('id-mensaje-contingencia').value;
    const time_mensaje = document.getElementById('id-tiempo-mensaje-contingencia').value;

    localStorage.setItem('inventario', inventario);
    localStorage.setItem('credito', credito);
    localStorage.setItem('producto_comun', producto_comun);
    localStorage.setItem('margen_ganancia', margen_ganancia);
    localStorage.setItem('monto_ganancia', monto_ganancia);
    localStorage.setItem('redondeo', redondeo);
    localStorage.setItem('monto_redondeo', monto_redondeo);
    localStorage.setItem('mensaje', mensaje);
    localStorage.setItem('data_mensaje', data_mensaje);
    localStorage.setItem('time_mensaje', time_mensaje);
    /* info = {
      inventario,
      credito ,
      producto_comun ,
      margen_ganancia,
      redondeo,
      mensaje,
      monto_ganancia,
      monto_redondeo,
      data_mensaje ,
      time_mensaje 
    }
    console.log("Estos son los datos de la vista de configuraciones habilitadas");
    console.log(info);*/
    addInfo();
    /*console.log(`inventario: ${inventario}`);
    console.log(`credito: ${credito}`);
    console.log(`producto_comun: ${producto_comun}`);
    console.log(`margen_ganancia: ${margen_ganancia}`);
    console.log(`monto_ganancia: ${monto_ganancia}`);
    console.log(`redondeo: ${redondeo}`);
    console.log(`monto_redondeo: ${monto_redondeo}`);
    console.log(`mensaje: ${mensaje}`);
    console.log(`data_mensaje: ${data_mensaje}`);
    console.log(`time_mensaje: ${time_mensaje}`);*/
    
    document.getElementById('config-negocio').classList.add('hidden');
    document.getElementById('add-caja').classList.remove('hidden');   
});

// -------------boton de vista de configuracion  agregar caja nueva
document.getElementById('caja-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    let validar_numero = false;
    let validar_caja = false;
    const n_caja = document.getElementById('n_caja').value;
    const nombre_caja = document.getElementById('nombre_caja').value;
    const cajas = await getCajas();
    const cajasList = Array.isArray(cajas) ? cajas : [];

    /*console.log("respusta del backend");
    console.log(cajas);*/

    if (cajasList.length > 0) {
      cajasList.forEach(element => {
        /*console.log(`el numero de caja existente es: `);
        console.log(element.n_caja);
        console.log(`el numero de caja que desea ingresar es: `);
        console.log(n_caja);*/
        if (nombre_caja == element.nombre_caja) {
            
            validar_caja = true;
            //console.log("Validar:true");
        }
        if (n_caja == element.n_caja) {
            
            validar_numero = true;
            //console.log("Validar:true");
        }
      });
    }

    if (validar_numero) {
      alert("la caja seleccionada ya esta en uso, seleccione otro numero")
      return
    }
    if (validar_caja) {
      alert("el nombre seleccionado ya esta en uso, seleccione otro nombre")
      return
    }

    localStorage.setItem('n_caja', n_caja);
    localStorage.setItem('nombre_caja', nombre_caja);
    await addCajaConnected();
    /*console.log(`el numero de caja: ${n_caja}`);
    console.log(`el nombre: ${nombre_caja}`);
    */
    document.getElementById('add-caja').classList.add('hidden');
    document.getElementById('login').classList.remove('hidden');   
    await refreshShiftLockMessage();
    
});

// -------------boton de vista de login para acceder al sistema
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (inactiveAssignedCaja) {
      const msg = document.getElementById('msj_activo');
      if (msg) {
        msg.textContent = getInactiveCajaMessage(inactiveAssignedCaja);
        msg.classList.remove('hidden');
      }
      return;
    }
    await login();

});


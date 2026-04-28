const PURCHASE_API_URL = (() => {
    const override = window.localStorage.getItem('api_url');
    if (override) return override.endsWith('/') ? override : `${override}/`;
    if (window.location.port === '3002') return `${window.location.origin}/`;
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    const protocol = isLocalHost ? 'http:' : window.location.protocol;
    return `${protocol}//${window.location.hostname}:3002/`;
})();

function purchaseHeaders(headers = {}) {
    const token = localStorage.getItem('token');
    return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

function cleanText(value, max = 255) {
    return String(value || '').trim().slice(0, max);
}

async function purchaseGet(path) {
    const response = await fetch(PURCHASE_API_URL + path, { headers: purchaseHeaders() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudo cargar informacion');
    return data;
}

async function purchaseSend(path, method, payload = null) {
    const options = {
        method,
        headers: purchaseHeaders({ 'Content-Type': 'application/json' }),
    };
    if (payload !== null) options.body = JSON.stringify(payload);
    const response = await fetch(PURCHASE_API_URL + path, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudo guardar');
    return data;
}

const state = {
    suppliers: [],
    buyers: [],
    editId: null,
    editType: 'supplier',
};

function notifySupplierCatalogUpdated() {
    const eventName = 'minimarket:suppliers-updated';
    const payload = { type: eventName, at: Date.now() };
    try {
        window.dispatchEvent(new CustomEvent(eventName));
    } catch (_) {
    }

    const targets = [];
    if (window.parent && window.parent !== window) targets.push(window.parent);
    if (window.opener && !window.opener.closed) targets.push(window.opener);

    targets.forEach((targetWin) => {
        try {
            if (typeof targetWin.loadProductSupplierOptions === 'function') {
                targetWin.loadProductSupplierOptions();
            }
        } catch (_) {
        }
        try {
            targetWin.postMessage(payload, window.location.origin);
        } catch (_) {
        }
    });
}

function getCurrentType() {
    return document.getElementById('entity-type')?.value === 'buyer' ? 'buyer' : 'supplier';
}

function clearForm() {
    state.editId = null;
    state.editType = getCurrentType();
    document.getElementById('entity-name').value = '';
    document.getElementById('entity-contact').value = '';
    document.getElementById('entity-phone').value = '';
    document.getElementById('entity-email').value = '';
    document.getElementById('entity-note').value = '';
}

function getPayload() {
    return {
        id: state.editId,
        name: cleanText(document.getElementById('entity-name').value, 120),
        contact_name: cleanText(document.getElementById('entity-contact').value, 120),
        phone: cleanText(document.getElementById('entity-phone').value, 40),
        email: cleanText(document.getElementById('entity-email').value, 180),
        notes: cleanText(document.getElementById('entity-note').value, 400),
    };
}

function fillForm(type, row) {
    state.editId = Number(row.id || 0) || null;
    state.editType = type;
    document.getElementById('entity-type').value = type;
    document.getElementById('entity-name').value = row.name || '';
    document.getElementById('entity-contact').value = row.contact_name || '';
    document.getElementById('entity-phone').value = row.phone || '';
    document.getElementById('entity-email').value = row.email || '';
    document.getElementById('entity-note').value = row.notes || '';
}

function buildItemHtml(type, row) {
    const badgeText = type === 'buyer' ? 'Encargado' : 'Proveedor';
    return `
        <div class="buy-list-item">
            <div>
                <strong>${row.name}<span class="buy-badge">${badgeText}</span></strong><br>
                <small>${row.contact_name || 'Sin contacto'} | ${row.phone || 'Sin telefono'}${row.email ? ` | ${row.email}` : ''}</small>
            </div>
            <div style="display:flex; gap:6px;">
                <button type="button" class="btn" data-edit-type="${type}" data-edit-id="${row.id}" style="height:28px; min-width:70px;">Editar</button>
                <button type="button" class="btn" data-del-type="${type}" data-del-id="${row.id}" style="height:28px; min-width:70px; background:#991b1b; color:#fff;">Eliminar</button>
            </div>
        </div>
    `;
}

function renderList() {
    const list = document.getElementById('entity-list');
    if (!list) return;
    const supplierRows = Array.isArray(state.suppliers) ? state.suppliers : [];
    const buyerRows = Array.isArray(state.buyers) ? state.buyers : [];
    const html = [
        ...supplierRows.map((row) => buildItemHtml('supplier', row)),
        ...buyerRows.map((row) => buildItemHtml('buyer', row)),
    ].join('');
    list.innerHTML = html || '<div class="buy-list-item"><span>Sin registros aun.</span></div>';
}

async function reloadEntities() {
    const [suppliers, buyers] = await Promise.all([
        purchaseGet('api/service-suppliers'),
        purchaseGet('api/service-buyers'),
    ]);
    state.suppliers = Array.isArray(suppliers) ? suppliers : [];
    state.buyers = Array.isArray(buyers) ? buyers : [];
    renderList();
}

async function saveCurrentEntity() {
    const type = getCurrentType();
    const payload = getPayload();
    if (!payload.name) {
        alert('Ingresa el nombre del registro.');
        return;
    }
    if (state.editId && state.editType !== type) {
        state.editId = null;
    }

    const endpoint = type === 'buyer' ? 'api/service-buyers' : 'api/service-suppliers';
    await purchaseSend(endpoint, 'POST', payload);
    clearForm();
    await reloadEntities();
    notifySupplierCatalogUpdated();
    alert(`${type === 'buyer' ? 'Encargado' : 'Proveedor'} guardado.`);
}

async function deleteEntity(type, id) {
    const endpoint = type === 'buyer' ? 'api/service-buyers' : 'api/service-suppliers';
    await purchaseSend(`${endpoint}?id=${encodeURIComponent(id)}`, 'DELETE');
    if (state.editId && Number(state.editId) === Number(id) && state.editType === type) {
        clearForm();
    }
    await reloadEntities();
    notifySupplierCatalogUpdated();
}

function bindEvents() {
    document.getElementById('entity-clear-btn')?.addEventListener('click', clearForm);
    document.getElementById('entity-save-btn')?.addEventListener('click', async () => {
        try {
            await saveCurrentEntity();
        } catch (error) {
            alert(error.message || 'No se pudo guardar el registro.');
        }
    });

    document.getElementById('entity-type')?.addEventListener('change', () => {
        if (state.editId) return;
        clearForm();
    });

    document.getElementById('entity-list')?.addEventListener('click', async (event) => {
        const editId = event.target.getAttribute('data-edit-id');
        const editType = event.target.getAttribute('data-edit-type');
        const delId = event.target.getAttribute('data-del-id');
        const delType = event.target.getAttribute('data-del-type');

        if (editId && editType) {
            const source = editType === 'buyer' ? state.buyers : state.suppliers;
            const row = source.find((item) => Number(item.id) === Number(editId));
            if (row) fillForm(editType, row);
            return;
        }

        if (delId && delType) {
            if (!confirm('Eliminar registro seleccionado?')) return;
            try {
                await deleteEntity(delType, delId);
            } catch (error) {
                alert(error.message || 'No se pudo eliminar el registro.');
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    clearForm();
    try {
        await reloadEntities();
    } catch (error) {
        alert(error.message || 'No se pudo cargar informacion de compras/proveedores.');
    }
});

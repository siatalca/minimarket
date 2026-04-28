(function initDteSetup(globalScope) {
    function setPopupTheme() {
        const saved = localStorage.getItem('theme');
        document.body.classList.toggle('dark', saved === 'dark');
    }

    function setMessage(id, message, type = '') {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = message || '';
        el.className = `dte-msg ${type}`.trim();
    }

    function valueOf(id) {
        return String(document.getElementById(id)?.value || '').trim();
    }

    function setValue(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = value === null || typeof value === 'undefined' ? '' : String(value);
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = value || '';
    }

    function defaultPointOfSaleFromCaja() {
        const boxName = String(localStorage.getItem('nombre_caja') || '').trim();
        const boxNumber = String(localStorage.getItem('n_caja') || '').trim();
        const fallback = boxName || (boxNumber ? `Caja ${boxNumber}` : 'POS-01');
        return fallback.slice(0, 30);
    }

    function normalizeRutInput(rawValue) {
        const compact = String(rawValue || '').toUpperCase().replace(/\./g, '').replace(/-/g, '').replace(/[^0-9K]/g, '');
        if (!compact) return '';
        if (compact.length === 1) return compact;
        const body = compact.slice(0, -1);
        const dv = compact.slice(-1);
        return `${body}-${dv}`;
    }

    function formatDateLabel(rawValue) {
        if (!rawValue) return '';
        const date = new Date(rawValue);
        if (Number.isNaN(date.getTime())) return String(rawValue);
        return date.toLocaleString('es-CL');
    }

    function maskFingerprint(value) {
        const text = String(value || '').trim();
        if (!text) return '';
        if (text.length <= 20) return text;
        return `${text.slice(0, 10)}...${text.slice(-8)}`;
    }

    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('Archivo no seleccionado.'));
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const result = String(reader.result || '');
                const marker = 'base64,';
                const index = result.indexOf(marker);
                if (index === -1) {
                    reject(new Error('No se pudo leer archivo.'));
                    return;
                }
                resolve(result.slice(index + marker.length));
            };
            reader.onerror = () => reject(new Error('No se pudo leer archivo.'));
            reader.readAsDataURL(file);
        });
    }

    function renderDraftRows(rows) {
        const body = document.getElementById('dte-drafts-body');
        if (!body) return;
        const list = Array.isArray(rows) ? rows : [];
        if (!list.length) {
            body.innerHTML = '<tr><td colspan="5" style="text-align:center;">Sin datos.</td></tr>';
            return;
        }
        body.innerHTML = '';
        list.forEach((row) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${Number(row.id_dte || 0)}</td>
                <td>${Number(row.venta_id || 0)}</td>
                <td>${Number(row.tipo_dte || 0)}</td>
                <td>${String(row.estado || '')}</td>
                <td>${String(row.folio_referencia || '')}</td>
            `;
            body.appendChild(tr);
        });
    }

    async function loadDteConfig() {
        const data = await globalScope.DteClient.fetchDteConfig();
        const pointOfSale = String(data.punto_venta || '').trim() || defaultPointOfSaleFromCaja();
        setValue('dte-ambiente', data.ambiente || 'certificacion');
        setValue('dte-activo', Number(data.activo || 0));
        setValue('dte-emisor-rut', data.emisor_rut || '');
        setValue('dte-emisor-razon', data.emisor_razon_social || '');
        setValue('dte-emisor-giro', data.emisor_giro || '');
        setValue('dte-emisor-direccion', data.emisor_direccion || '');
        setValue('dte-emisor-comuna', data.emisor_comuna || '');
        setValue('dte-emisor-ciudad', data.emisor_ciudad || '');
        setValue('dte-certificado', data.certificado_alias || '');
        setValue('dte-punto-venta', pointOfSale);
    }

    async function loadCertificateMetadata() {
        try {
            const cert = await globalScope.DteClient.fetchCertificateMetadata();
            if (!cert || !cert.has_certificate) {
                setText('dte-cert-meta', 'Sin certificado cargado.');
                return null;
            }
            const parts = [
                `Alias: ${cert.alias || ''}`,
                `Archivo: ${cert.file_name || ''}`,
                `Vigencia: ${formatDateLabel(cert.valid_from)} - ${formatDateLabel(cert.valid_to)}`,
                `Huella: ${maskFingerprint(cert.fingerprint_sha1)}`,
            ].filter(Boolean);
            setText('dte-cert-meta', parts.join(' | '));
            if (cert.alias) {
                setValue('dte-certificado', cert.alias);
            }
            return cert;
        } catch (error) {
            if (Number(error?.status || 0) === 404) {
                setText('dte-cert-meta', 'Sin certificado cargado.');
                return null;
            }
            throw error;
        }
    }

    function readConfigPayload() {
        const pointOfSale = valueOf('dte-punto-venta') || defaultPointOfSaleFromCaja() || 'POS-01';
        return {
            ambiente: valueOf('dte-ambiente') || 'certificacion',
            activo: Number(valueOf('dte-activo') || 0),
            emisor_rut: normalizeRutInput(valueOf('dte-emisor-rut')),
            emisor_razon_social: valueOf('dte-emisor-razon'),
            emisor_giro: valueOf('dte-emisor-giro'),
            emisor_direccion: valueOf('dte-emisor-direccion'),
            emisor_comuna: valueOf('dte-emisor-comuna'),
            emisor_ciudad: valueOf('dte-emisor-ciudad'),
            certificado_alias: valueOf('dte-certificado'),
            punto_venta: pointOfSale,
        };
    }

    function readDraftPayload() {
        return {
            venta_id: Number(valueOf('dte-venta-id') || 0),
            tipo_dte: Number(valueOf('dte-tipo') || 39),
            created_by: Number(localStorage.getItem('id_user') || 0) || null,
            receptor: {
                rut: normalizeRutInput(valueOf('dte-rec-rut')),
                razon_social: valueOf('dte-rec-razon'),
                giro: valueOf('dte-rec-giro'),
                direccion: valueOf('dte-rec-direccion'),
                comuna: valueOf('dte-rec-comuna'),
                ciudad: valueOf('dte-rec-ciudad'),
                email: valueOf('dte-rec-email'),
            },
        };
    }

    function readFlowDraftId() {
        return Number(valueOf('dte-flow-id') || 0);
    }

    function currentUserId() {
        return Number(localStorage.getItem('id_user') || 0) || null;
    }

    function setFlowSummary(detail) {
        if (!detail) {
            setText('dte-flow-meta', '');
            return;
        }
        const summary = [
            `Estado: ${String(detail.estado || '')}`,
            `Track: ${String(detail.sii_track_id || '-')}`,
            `SII: ${String(detail.sii_estado || '-')}`,
            `Error: ${String(detail.error_detalle || '-')}`,
        ].join(' | ');
        setText('dte-flow-meta', summary);
    }

    async function runFlowCheck() {
        const dteConfig = await globalScope.DteClient.fetchDteConfig();
        const cert = await globalScope.DteClient.fetchCertificateMetadata();
        if (!cert || !cert.has_certificate) {
            throw new Error('No hay certificado cargado.');
        }
        const requiredFields = [
            ['RUT emisor', dteConfig?.emisor_rut],
            ['Razon social', dteConfig?.emisor_razon_social],
            ['Giro', dteConfig?.emisor_giro],
            ['Direccion', dteConfig?.emisor_direccion],
            ['Comuna', dteConfig?.emisor_comuna],
            ['Ciudad', dteConfig?.emisor_ciudad],
            ['Punto venta', dteConfig?.punto_venta],
        ];
        const missing = requiredFields
            .filter((entry) => !String(entry[1] || '').trim())
            .map((entry) => entry[0]);
        if (missing.length) {
            throw new Error(`Faltan datos de emisor: ${missing.join(', ')}`);
        }
        if (Number(dteConfig?.activo || 0) !== 1) {
            throw new Error('Activa la configuracion DTE (Activo = Si).');
        }
        return { dteConfig, cert };
    }

    async function reloadDrafts() {
        const rows = await globalScope.DteClient.listDteDrafts({ limit: 30 });
        renderDraftRows(rows);
    }

    document.addEventListener('DOMContentLoaded', async () => {
        setPopupTheme();

        if (!globalScope.DteClient) {
            setMessage('dte-config-msg', 'Modulo DTE no disponible.', 'err');
            return;
        }

        document.getElementById('dte-emisor-rut')?.addEventListener('input', (event) => {
            event.target.value = normalizeRutInput(event.target.value);
        });
        document.getElementById('dte-rec-rut')?.addEventListener('input', (event) => {
            event.target.value = normalizeRutInput(event.target.value);
        });

        document.getElementById('dte-config-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            setMessage('dte-config-msg', 'Guardando...', '');
            try {
                await globalScope.DteClient.saveDteConfig(readConfigPayload());
                setMessage('dte-config-msg', 'Configuracion guardada.', 'ok');
                await loadDteConfig();
            } catch (error) {
                setMessage('dte-config-msg', error.message || 'No se pudo guardar configuracion.', 'err');
            }
        });

        document.getElementById('dte-config-reload')?.addEventListener('click', async () => {
            setMessage('dte-config-msg', 'Cargando...', '');
            try {
                await loadDteConfig();
                await loadCertificateMetadata();
                setMessage('dte-config-msg', 'Configuracion cargada.', 'ok');
            } catch (error) {
                setMessage('dte-config-msg', error.message || 'No se pudo cargar configuracion.', 'err');
            }
        });

        document.getElementById('dte-print-test-58')?.addEventListener('click', async () => {
            setMessage('dte-config-msg', 'Enviando prueba a impresora...', '');
            try {
                const result = await globalScope.DteClient.printTest58mm();
                const printer = String(result?.printer || '').trim();
                setMessage(
                    'dte-config-msg',
                    printer ? `Prueba 58mm enviada a: ${printer}.` : 'Prueba 58mm enviada.',
                    'ok'
                );
            } catch (error) {
                setMessage('dte-config-msg', error.message || 'No se pudo imprimir prueba 58mm.', 'err');
            }
        });

        document.getElementById('dte-cert-upload')?.addEventListener('click', async () => {
            setMessage('dte-cert-msg', 'Cargando certificado...', '');
            try {
                const fileInput = document.getElementById('dte-cert-file');
                const file = fileInput?.files?.[0];
                if (!file) {
                    setMessage('dte-cert-msg', 'Selecciona un archivo .pfx/.p12.', 'err');
                    return;
                }
                const password = valueOf('dte-cert-pass');
                if (!password) {
                    setMessage('dte-cert-msg', 'Ingresa la clave del certificado.', 'err');
                    return;
                }
                const aliasFromInput = valueOf('dte-certificado');
                const alias = aliasFromInput || String(file.name || '').replace(/\.(pfx|p12)$/i, '').trim();
                if (!alias) {
                    setMessage('dte-cert-msg', 'Ingresa un alias para el certificado.', 'err');
                    return;
                }
                const pfxBase64 = await readFileAsBase64(file);
                await globalScope.DteClient.saveCertificate({
                    alias,
                    file_name: file.name || 'certificado.pfx',
                    password,
                    pfx_base64: pfxBase64,
                });
                setValue('dte-certificado', alias);
                setValue('dte-cert-pass', '');
                if (fileInput) fileInput.value = '';
                await loadCertificateMetadata();
                setMessage('dte-cert-msg', 'Certificado cargado y validado.', 'ok');
            } catch (error) {
                setMessage('dte-cert-msg', error.message || 'No se pudo cargar el certificado.', 'err');
            }
        });

        document.getElementById('dte-cert-verify')?.addEventListener('click', async () => {
            setMessage('dte-cert-msg', 'Validando clave...', '');
            try {
                const password = valueOf('dte-cert-pass');
                if (!password) {
                    setMessage('dte-cert-msg', 'Ingresa la clave del certificado.', 'err');
                    return;
                }
                await globalScope.DteClient.verifyCertificatePassword(password);
                setMessage('dte-cert-msg', 'Clave valida para el certificado cargado.', 'ok');
            } catch (error) {
                setMessage('dte-cert-msg', error.message || 'No se pudo validar la clave.', 'err');
            }
        });

        document.getElementById('dte-cert-remove')?.addEventListener('click', async () => {
            setMessage('dte-cert-msg', 'Eliminando certificado...', '');
            try {
                await globalScope.DteClient.deleteCertificate();
                setValue('dte-cert-pass', '');
                const fileInput = document.getElementById('dte-cert-file');
                if (fileInput) fileInput.value = '';
                setText('dte-cert-meta', 'Sin certificado cargado.');
                setMessage('dte-cert-msg', 'Certificado eliminado.', 'ok');
            } catch (error) {
                setMessage('dte-cert-msg', error.message || 'No se pudo eliminar el certificado.', 'err');
            }
        });

        document.getElementById('dte-draft-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const payload = readDraftPayload();
            if (!payload.venta_id || payload.venta_id < 1) {
                setMessage('dte-draft-msg', 'Indica un ID de venta valido.', 'err');
                return;
            }
            setMessage('dte-draft-msg', 'Creando borrador...', '');
            try {
                const response = await globalScope.DteClient.createDteDraftFromSale(payload);
                const draftId = Number(response?.draft?.id_dte || 0);
                setMessage('dte-draft-msg', `Borrador creado${draftId ? ` (ID ${draftId})` : ''}.`, 'ok');
                await reloadDrafts();
            } catch (error) {
                setMessage('dte-draft-msg', error.message || 'No se pudo crear borrador.', 'err');
            }
        });

        document.getElementById('dte-drafts-reload')?.addEventListener('click', async () => {
            setMessage('dte-draft-msg', 'Cargando borradores...', '');
            try {
                await reloadDrafts();
                setMessage('dte-draft-msg', 'Listado actualizado.', 'ok');
            } catch (error) {
                setMessage('dte-draft-msg', error.message || 'No se pudo listar borradores.', 'err');
            }
        });

        document.getElementById('dte-flow-check')?.addEventListener('click', async () => {
            setMessage('dte-flow-msg', 'Paso 0: verificando certificado y configuracion...', '');
            try {
                await runFlowCheck();
                await loadCertificateMetadata();
                await loadDteConfig();
                setMessage('dte-flow-msg', 'Paso 0 completado: certificado y configuracion OK.', 'ok');
            } catch (error) {
                setMessage('dte-flow-msg', error.message || 'No se pudo validar precondiciones.', 'err');
            }
        });

        document.getElementById('dte-flow-prepare')?.addEventListener('click', async () => {
            const dteId = readFlowDraftId();
            if (!dteId || dteId < 1) {
                setMessage('dte-flow-msg', 'Ingresa un ID de borrador valido.', 'err');
                return;
            }
            setMessage('dte-flow-msg', 'Paso 1: preparando XML...', '');
            try {
                await runFlowCheck();
                const result = await globalScope.DteClient.prepareDteDraft(dteId, {
                    created_by: currentUserId(),
                });
                setFlowSummary(result?.detail || null);
                setMessage('dte-flow-msg', 'Paso 1 completado: XML preparado.', 'ok');
                await reloadDrafts();
            } catch (error) {
                setMessage('dte-flow-msg', error.message || 'No se pudo preparar XML.', 'err');
            }
        });

        document.getElementById('dte-flow-submit')?.addEventListener('click', async () => {
            const dteId = readFlowDraftId();
            if (!dteId || dteId < 1) {
                setMessage('dte-flow-msg', 'Ingresa un ID de borrador valido.', 'err');
                return;
            }
            setMessage('dte-flow-msg', 'Paso 2: enviando DTE (simulado)...', '');
            try {
                const result = await globalScope.DteClient.submitDteDraft(dteId, {
                    simulate: true,
                    created_by: currentUserId(),
                });
                setFlowSummary(result?.detail || null);
                setMessage('dte-flow-msg', 'Paso 2 completado: envio simulado registrado.', 'ok');
                await reloadDrafts();
            } catch (error) {
                setMessage('dte-flow-msg', error.message || 'No se pudo enviar DTE.', 'err');
            }
        });

        document.getElementById('dte-flow-track')?.addEventListener('click', async () => {
            const dteId = readFlowDraftId();
            if (!dteId || dteId < 1) {
                setMessage('dte-flow-msg', 'Ingresa un ID de borrador valido.', 'err');
                return;
            }
            setMessage('dte-flow-msg', 'Paso 3: consultando track...', '');
            try {
                const forceStatus = valueOf('dte-flow-status') || 'aceptado';
                const result = await globalScope.DteClient.pollDteTrack(dteId, {
                    simulate: true,
                    force_status: forceStatus,
                    created_by: currentUserId(),
                });
                setFlowSummary(result?.detail || null);
                setMessage('dte-flow-msg', `Paso 3 completado: track ${forceStatus}.`, 'ok');
                await reloadDrafts();
            } catch (error) {
                setMessage('dte-flow-msg', error.message || 'No se pudo consultar track.', 'err');
            }
        });

        document.getElementById('dte-flow-retry')?.addEventListener('click', async () => {
            const dteId = readFlowDraftId();
            if (!dteId || dteId < 1) {
                setMessage('dte-flow-msg', 'Ingresa un ID de borrador valido.', 'err');
                return;
            }
            setMessage('dte-flow-msg', 'Reintentando envio...', '');
            try {
                const result = await globalScope.DteClient.retryDteDraft(dteId, {
                    simulate: true,
                    created_by: currentUserId(),
                });
                setFlowSummary(result?.detail || null);
                setMessage('dte-flow-msg', 'Reintento ejecutado.', 'ok');
                await reloadDrafts();
            } catch (error) {
                setMessage('dte-flow-msg', error.message || 'No se pudo reintentar envio.', 'err');
            }
        });

        document.getElementById('dte-flow-auto')?.addEventListener('click', async () => {
            const dteId = readFlowDraftId();
            if (!dteId || dteId < 1) {
                setMessage('dte-flow-msg', 'Ingresa un ID de borrador valido.', 'err');
                return;
            }
            try {
                setMessage('dte-flow-msg', 'Auto 0->3: verificando...', '');
                await runFlowCheck();

                setMessage('dte-flow-msg', 'Auto 0->3: paso 1 preparando XML...', '');
                const prepared = await globalScope.DteClient.prepareDteDraft(dteId, {
                    created_by: currentUserId(),
                });
                setFlowSummary(prepared?.detail || null);

                setMessage('dte-flow-msg', 'Auto 0->3: paso 2 enviando...', '');
                const submitted = await globalScope.DteClient.submitDteDraft(dteId, {
                    simulate: true,
                    created_by: currentUserId(),
                });
                setFlowSummary(submitted?.detail || null);

                setMessage('dte-flow-msg', 'Auto 0->3: paso 3 consultando track...', '');
                const forceStatus = valueOf('dte-flow-status') || 'aceptado';
                const tracked = await globalScope.DteClient.pollDteTrack(dteId, {
                    simulate: true,
                    force_status: forceStatus,
                    created_by: currentUserId(),
                });
                setFlowSummary(tracked?.detail || null);
                await reloadDrafts();
                setMessage('dte-flow-msg', `Auto 0->3 completado (${forceStatus}).`, 'ok');
            } catch (error) {
                setMessage('dte-flow-msg', error.message || 'Fallo en flujo automatico.', 'err');
            }
        });

        try {
            await loadDteConfig();
        } catch (error) {
            setMessage('dte-config-msg', error.message || 'No se pudo cargar configuracion.', 'err');
        }

        try {
            await loadCertificateMetadata();
        } catch (error) {
            setMessage('dte-cert-msg', error.message || 'No se pudo consultar certificado.', 'err');
        }

        try {
            await reloadDrafts();
        } catch (error) {
            setMessage('dte-draft-msg', error.message || 'No se pudo listar borradores.', 'err');
        }

        setFlowSummary(null);
    });
})(window);

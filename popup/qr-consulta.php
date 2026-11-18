<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QR consulta de precios</title>
    <link rel="stylesheet" href="../css/root.css">
    <link rel="stylesheet" href="../css/popUpStyle.css">
    <style>
        .qr-shell { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
        .qr-help { margin: 0; color: #4b5563; font-size: 0.95rem; }
        .qr-warning { margin: 0; padding: 10px 12px; border-radius: 8px; background: #FFF6E0; color: #7A4A00; border-left: 4px solid #B45309; }
        .qr-error { margin: 0; padding: 10px 12px; border-radius: 8px; background: #FDECEC; color: #991B1B; border-left: 4px solid #DC2626; }
        .qr-sheet {
            border: 2px solid #0F2F5F; border-radius: 14px; background: #fff; color: #0F2F5F;
            padding: 24px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px;
        }
        .qr-store { margin: 0; font-size: 1.6rem; font-weight: 800; }
        .qr-call { margin: 0; font-size: 1.3rem; font-weight: 700; }
        .qr-image { width: min(320px, 70vw); height: auto; aspect-ratio: 1; image-rendering: pixelated; }
        .qr-placeholder { width: min(320px, 70vw); aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border: 2px dashed #D3DFEE; border-radius: 8px; color: #4C6183; padding: 12px; }
        .qr-steps { margin: 0; font-size: 1rem; color: #10233F; }
        .qr-url { margin: 0; font-size: 0.85rem; color: #4C6183; word-break: break-all; }
        .qr-actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
        .qr-actions .btn { font-weight: 700; padding: 10px 14px; min-width: 150px; }
        .hidden { display: none !important; }
        @media print {
            @page { margin: 12mm; }
            body { background: #fff !important; }
            .popup-header, .qr-help, .qr-warning, .qr-error, .qr-actions { display: none !important; }
            .qr-sheet { border-width: 3px; padding: 36px 24px; }
            .qr-store { font-size: 28pt; }
            .qr-call { font-size: 22pt; }
            .qr-image { width: 110mm; }
            .qr-steps { font-size: 14pt; }
        }
    </style>
</head>
<body>
    <div class="popup-shell">
        <section class="popup-panel">
            <h2 class="popup-header">QR CONSULTA DE PRECIOS</h2>
            <div class="popup-body">
                <div class="popup-card popup-main-card qr-shell" style="max-width:none;">
                    <p class="qr-help">Imprime este código y déjalo en el local. Los clientes lo escanean con la cámara del teléfono para ver precio y stock, y pueden armar su carrito.</p>
                    <p id="qr-warning" class="qr-warning hidden" role="status"></p>
                    <p id="qr-error" class="qr-error hidden" role="alert"></p>

                    <div class="qr-sheet">
                        <p id="qr-store" class="qr-store"></p>
                        <p class="qr-call">Escanea para consultar precios</p>
                        <img id="qr-image" class="qr-image hidden" alt="Código QR de la consulta de precios">
                        <div id="qr-placeholder" class="qr-placeholder">Generando el código QR…</div>
                        <p class="qr-steps">Apunta la cámara del teléfono al código y abre el enlace.</p>
                        <p id="qr-url" class="qr-url"></p>
                    </div>

                    <div class="qr-actions">
                        <button id="qr-retry-btn" type="button" class="btn hidden">Reintentar</button>
                        <button id="qr-print-btn" type="button" class="btn" style="background:#1f8f4f; color:#fff; border:1px solid #14663a;" disabled>Imprimir</button>
                    </div>
                </div>
            </div>
        </section>
    </div>

    <script src="../js/api_base.js?v=20261003a"></script>
    <script src="../js/qr_consulta.js?v=20261118a"></script>
</body>
</html>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configuración</title>
    <link rel="stylesheet" href="../css/root.css">
    <link rel="stylesheet" href="../css/popUpStyle.css">
    
    <script src="../js/functions.js?v=20260411a"></script>
</head>
<body>
    <div class="popup-shell" style="max-width: 944px;">
        <section class="popup-panel">
            <h2 class="popup-header">LOGOTIPO DEL PROGRAMA</h2>
            <div class="popup-body">
                <div class="popup-card popup-main-card">
            <div style="display:flex; gap:20px; flex-wrap:wrap; align-items:stretch;">
                <div style="flex:1 1 300px; min-width:280px; border:1px solid #d6e0ef; border-radius:12px; padding:12px; background:#f8fbff;">
                    <h3 style="margin:0 0 10px 0; font-size:1rem;">Vista previa</h3>
                    <div style="height:160px; border:2px dashed #9ca3af; border-radius:8px; display:flex; align-items:center; justify-content:center; background:#fff;">
                        <img id="logo-preview" src="" alt="Previsualizacion del logotipo" style="max-width:100%; max-height:100%; object-fit:contain;">
                    </div>
                    <p id="logo-preview-meta" style="margin:10px 0 0 0; font-size:.9rem; color:#4b5563;">
                        Recomendado: fondo transparente y buena resolucion para evitar distorsion en la barra superior.
                    </p>
                    <div id="logo-crop-controls" style="margin-top:10px;">
                        <label style="display:block; font-size:.9rem; margin-bottom:4px;">Zoom</label>
                        <input id="logo-zoom" type="range" min="100" max="250" value="100" style="width:100%;">

                        <label style="display:block; font-size:.9rem; margin:8px 0 4px;">Mover horizontal</label>
                        <input id="logo-offset-x" type="range" min="-100" max="100" value="0" style="width:100%;">

                        <label style="display:block; font-size:.9rem; margin:8px 0 4px;">Mover vertical</label>
                        <input id="logo-offset-y" type="range" min="-100" max="100" value="0" style="width:100%;">

                        <button id="logo-reset-crop-btn" type="button" class="btn" style="margin-top:10px; background:#6b7280; color:#fff; border:1px solid #4b5563;">Restablecer encuadre</button>
                    </div>
                </div>

                <div style="flex:2 1 420px; min-width:280px; border:1px solid #d6e0ef; border-radius:12px; padding:12px; background:#fff;">
                    <p style="margin:0 0 10px 0;">
                        Puedes cambiar el logotipo del programa (el que aparece en la barra superior) seleccionando una nueva imagen.
                    </p>

                    <label for="id-logotipo" style="display:block; margin-bottom:8px; font-weight:700;">Imagen de logotipo</label>
                    <input
                        type="file"
                        name="logotipo"
                        id="id-logotipo"
                        accept=".png,.jpg,.jpeg,.webp,.svg"
                        style="width:100%; max-width:100%; box-sizing:border-box; border:1px solid #9ca3af; border-radius:8px; padding:10px; background:#fff;"
                    >

                    <p style="margin:10px 0 14px 0; font-size:.9rem; color:#374151;">
                        El sistema adapta automaticamente el logo al espacio disponible en la barra superior.
                    </p>

                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                        <button id="save-logo-btn" type="button" class="btn" style="background:#1f8f4f; color:#fff; border:1px solid #14663a; min-width:140px;">Guardar</button>
                        <button id="remove-logo-btn" type="button" class="btn" style="background:#b91c1c; color:#fff; border:1px solid #7f1d1d; min-width:160px;">Eliminar logo</button>
                    </div>
                </div>
            </div>
            </div>
        </section>
    </div>

    <script src="../js/logo_settings.js?v=20260320a"></script>
    
</body>

</html>

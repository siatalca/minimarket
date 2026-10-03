@echo off
setlocal EnableExtensions

rem Instala el puente de impresion local en esta caja:
rem  - verifica Node.js y dependencias
rem  - lo deja iniciando solo al entrar a Windows (carpeta Inicio del usuario)
rem  - lo inicia ahora y comprueba que responda en 127.0.0.1:7357

set "DIR=%~dp0"
if "%DIR:~-1%"=="\" set "DIR=%DIR:~0,-1%"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "STARTUP_VBS=%STARTUP%\Minimarket Impresion.vbs"

echo ==========================================
echo  Minimarket - Instalar impresion local
echo ==========================================

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] No se encontro Node.js. Instala la version LTS desde https://nodejs.org y vuelve a ejecutar.
  goto :fail
)

if not exist "%DIR%\node_modules\express" (
  echo [INFO] Instalando dependencias...
  pushd "%DIR%"
  call npm install --omit=dev --no-audit --no-fund
  popd
  if not exist "%DIR%\node_modules\express" (
    echo [ERROR] No se pudieron instalar las dependencias.
    goto :fail
  )
)

echo [INFO] Configurando inicio automatico...
> "%STARTUP_VBS%" echo CreateObject("WScript.Shell").Run "wscript.exe ""%DIR%\iniciar_impresion.vbs""", 0, False
if not exist "%STARTUP_VBS%" (
  echo [ERROR] No se pudo crear "%STARTUP_VBS%".
  goto :fail
)

call "%DIR%\detener_impresion.bat" silencioso
echo [INFO] Iniciando impresion local...
wscript.exe "%DIR%\iniciar_impresion.vbs"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "for ($i = 0; $i -lt 15; $i++) { try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:7357/health' -TimeoutSec 2; if ($r.ok) { exit 0 } } catch {} ; Start-Sleep -Seconds 1 }; exit 1"
if errorlevel 1 (
  echo [ERROR] La impresion local no respondio. Revisa "%DIR%\logs\impresion.log".
  goto :fail
)

echo [OK] Impresion local funcionando en http://127.0.0.1:7357
echo [INFO] Impresoras detectadas:
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "(Invoke-RestMethod -Uri 'http://127.0.0.1:7357/api/printers' -TimeoutSec 15) | ForEach-Object { '  - ' + $_.name + $(if ($_.isDefault) { '  (predeterminada)' } else { '' }) }"
echo.
echo Listo. Abre https://minimarket.siacore.cl y, si el navegador pregunta por
echo acceso a la red local, responde "Permitir".
if /I not "%~1"=="silencioso" pause
exit /b 0

:fail
if /I not "%~1"=="silencioso" pause
exit /b 1

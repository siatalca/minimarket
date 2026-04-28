@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
set "APP_DIR=%ROOT_DIR%\server"
set "NODE_EXE=C:\Program Files\nodejs\node.exe"
set "APP_JS=%APP_DIR%\server.js"
set "PRINT_JS=%APP_DIR%\local_print_bridge.js"
set "ENV_FILE=%APP_DIR%\.env"
set "LOG_DIR=%APP_DIR%\logs"
set "OUT_LOG=%LOG_DIR%\backend-hidden-out.log"
set "ERR_LOG=%LOG_DIR%\backend-hidden-err.log"
set "PRINT_OUT_LOG=%LOG_DIR%\print-bridge-out.log"
set "PRINT_ERR_LOG=%LOG_DIR%\print-bridge-err.log"
set "TARGET_PORT=3002"
set "PRINT_PORT=7357"
set "DB_HOST=localhost"
set "DB_PORT=3306"
set "INITIAL_WAIT_SECONDS=4"
set "RETRY_DELAY_SECONDS=5"
set "STARTUP_WAIT_SECONDS=12"
set "MAX_ATTEMPTS=6"
set "PORT_PID="
set "PORT_PROC_NAME="
set "MYSQL_PID="
set "IS_LOCAL_DB_HOST=0"
set "REMOTE_DB_NOTICE_SHOWN=0"
set "ATTEMPT=0"
set "LAUNCHED_PID="
set "PRINT_PID="
set "EXIT_CODE=0"
set "BACKEND_ALREADY_RUNNING=0"

if defined MM_BACKEND_RETRY_SECONDS set "RETRY_DELAY_SECONDS=%MM_BACKEND_RETRY_SECONDS%"
if defined MM_BACKEND_WAIT_SECONDS set "STARTUP_WAIT_SECONDS=%MM_BACKEND_WAIT_SECONDS%"
if defined MM_BACKEND_MAX_ATTEMPTS set "MAX_ATTEMPTS=%MM_BACKEND_MAX_ATTEMPTS%"
if defined MM_BACKEND_INITIAL_WAIT_SECONDS set "INITIAL_WAIT_SECONDS=%MM_BACKEND_INITIAL_WAIT_SECONDS%"

if exist "%ENV_FILE%" (
  for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
    set "ENV_KEY=%%~A"
    set "ENV_VALUE=%%~B"
    if /I "!ENV_KEY!"=="PORT" set "TARGET_PORT=!ENV_VALUE!"
    if /I "!ENV_KEY!"=="LOCAL_PRINT_BRIDGE_PORT" set "PRINT_PORT=!ENV_VALUE!"
    if /I "!ENV_KEY!"=="DB_HOST" set "DB_HOST=!ENV_VALUE!"
    if /I "!ENV_KEY!"=="DB_PORT" set "DB_PORT=!ENV_VALUE!"
  )
)

call :normalizePort TARGET_PORT 3002
call :normalizePort PRINT_PORT 7357
call :normalizeHost DB_HOST localhost
call :normalizePort DB_PORT 3306
call :normalizeNonNegativeInt INITIAL_WAIT_SECONDS 4
call :normalizePositiveInt RETRY_DELAY_SECONDS 5
call :normalizePositiveInt STARTUP_WAIT_SECONDS 12
call :normalizeNonNegativeInt MAX_ATTEMPTS 6

if /I "!DB_HOST!"=="localhost" set "IS_LOCAL_DB_HOST=1"
if /I "!DB_HOST!"=="127.0.0.1" set "IS_LOCAL_DB_HOST=1"
if /I "!DB_HOST!"=="::1" set "IS_LOCAL_DB_HOST=1"

echo ==========================================
echo  Iniciar servicios ocultos
echo ==========================================
echo  Backend API: !TARGET_PORT!
echo  Print bridge: !PRINT_PORT!
echo  BD objetivo: !DB_HOST!:!DB_PORT!
echo  Pausa inicial: !INITIAL_WAIT_SECONDS!s
if "!MAX_ATTEMPTS!"=="0" (
  echo  Reintentos: ilimitados
) else (
  echo  Reintentos maximos: !MAX_ATTEMPTS!
)
echo.

if not exist "%NODE_EXE%" (
  echo [ERROR] No se encontro node.exe en: "%NODE_EXE%"
  set "EXIT_CODE=1"
  goto :finish
)

if not exist "%APP_JS%" (
  echo [ERROR] No se encontro server.js en: "%APP_JS%"
  set "EXIT_CODE=1"
  goto :finish
)

if not exist "%PRINT_JS%" (
  echo [ERROR] No se encontro local_print_bridge.js en: "%PRINT_JS%"
  set "EXIT_CODE=1"
  goto :finish
)

if not exist "%APP_DIR%\node_modules\express" (
  echo [ERROR] Faltan dependencias de Node.js en "%APP_DIR%\node_modules".
  echo         Ejecuta: cd /d "%APP_DIR%" ^&^& npm install
  set "EXIT_CODE=1"
  goto :finish
)

if not exist "%LOG_DIR%" (
  mkdir "%LOG_DIR%"
)

call :ensureFirewallRule !TARGET_PORT! "Minimarket Backend API !TARGET_PORT!"
call :ensureFirewallRule !PRINT_PORT! "Minimarket Print Bridge !PRINT_PORT!"

if !INITIAL_WAIT_SECONDS! GTR 0 (
  echo [INFO] Esperando !INITIAL_WAIT_SECONDS!s antes de validar conexiones...
  timeout /t !INITIAL_WAIT_SECONDS! /nobreak >nul
)

:retry_loop
call :getListeningPid !TARGET_PORT! PORT_PID
if defined PORT_PID (
  call :getProcessName !PORT_PID! PORT_PROC_NAME
  if /I "!PORT_PROC_NAME!"=="node" (
    echo [OK] El backend ya estaba ejecutandose en el puerto !TARGET_PORT! - PID !PORT_PID!.
    set "BACKEND_ALREADY_RUNNING=1"
  ) else (
    if not defined PORT_PROC_NAME set "PORT_PROC_NAME=desconocido"
    echo [ERROR] El puerto !TARGET_PORT! esta ocupado por "!PORT_PROC_NAME!" - PID !PORT_PID!.
    echo         Libera ese puerto o cambia PORT en "%ENV_FILE%".
    set "EXIT_CODE=1"
    goto :finish
  )
)

if "!BACKEND_ALREADY_RUNNING!"=="1" (
  call :start_print_bridge
  if errorlevel 1 set "EXIT_CODE=1"
  goto :finish
)

if "!IS_LOCAL_DB_HOST!"=="1" (
  call :getListeningPid !DB_PORT! MYSQL_PID
  if not defined MYSQL_PID (
    set /a ATTEMPT+=1
    call :validateAttempts
    if errorlevel 1 goto :finish
    echo [INFO] MySQL local aun no esta listo en !DB_PORT!. Reintentando en !RETRY_DELAY_SECONDS!s. Intento !ATTEMPT!
    timeout /t !RETRY_DELAY_SECONDS! /nobreak >nul
    goto :retry_loop
  )
) else (
  if "!REMOTE_DB_NOTICE_SHOWN!"=="0" (
    echo [INFO] DB remota detectada "!DB_HOST!". Se omite espera de MySQL local.
    set "REMOTE_DB_NOTICE_SHOWN=1"
  )
)

set /a ATTEMPT+=1
call :validateAttempts
if errorlevel 1 goto :finish

echo [INFO] Intento !ATTEMPT!: iniciando backend...
set "LAUNCHED_PID="
for /f "delims=" %%P in ('powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "$p = Start-Process -FilePath '%NODE_EXE%' -ArgumentList @('%APP_JS%') -WorkingDirectory '%APP_DIR%' -WindowStyle Hidden -RedirectStandardOutput '%OUT_LOG%' -RedirectStandardError '%ERR_LOG%' -PassThru; $p.Id" 2^>nul') do (
  set "LAUNCHED_PID=%%P"
)

if not defined LAUNCHED_PID (
  echo [WARN] No se pudo confirmar el PID de inicio. Se reintentara.
  timeout /t !RETRY_DELAY_SECONDS! /nobreak >nul
  goto :retry_loop
)

set "WAITED=0"
:wait_backend
call :getListeningPid !TARGET_PORT! PORT_PID
if defined PORT_PID goto :backend_started_ok

set /a WAITED+=1
if !WAITED! geq !STARTUP_WAIT_SECONDS! goto :startup_failed
timeout /t 1 /nobreak >nul
goto :wait_backend

:startup_failed
echo [WARN] El backend no quedo escuchando en !TARGET_PORT! tras !STARTUP_WAIT_SECONDS!s.
echo        Se intentara nuevamente cuando MySQL este disponible.
tasklist /FI "PID eq !LAUNCHED_PID!" /FO CSV /NH 2>nul | findstr /I "\"!LAUNCHED_PID!\"" >nul
if not errorlevel 1 (
  taskkill /PID !LAUNCHED_PID! /F >nul 2>&1
)
timeout /t !RETRY_DELAY_SECONDS! /nobreak >nul
goto :retry_loop

:backend_started_ok
echo [OK] Backend iniciado correctamente en modo oculto - PID !PORT_PID!.
echo [INFO] Logs backend:
echo        - %OUT_LOG%
echo        - %ERR_LOG%
echo.
call :start_print_bridge
if errorlevel 1 set "EXIT_CODE=1"
goto :finish

:start_print_bridge
call :getListeningPid !PRINT_PORT! PORT_PID
if defined PORT_PID (
  call :getProcessName !PORT_PID! PORT_PROC_NAME
  if /I "!PORT_PROC_NAME!"=="node" (
    echo [OK] Impresion local ya estaba ejecutandose en el puerto !PRINT_PORT! - PID !PORT_PID!.
    exit /b 0
  )
  if not defined PORT_PROC_NAME set "PORT_PROC_NAME=desconocido"
  echo [ERROR] El puerto !PRINT_PORT! esta ocupado por "!PORT_PROC_NAME!" - PID !PORT_PID!.
  echo         Libera ese puerto o define LOCAL_PRINT_BRIDGE_PORT en "%ENV_FILE%".
  exit /b 1
)

echo [INFO] Iniciando impresion local...
set "PRINT_PID="
for /f "delims=" %%P in ('powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "$env:LOCAL_PRINT_BRIDGE_PORT='!PRINT_PORT!'; $p = Start-Process -FilePath '%NODE_EXE%' -ArgumentList @('%PRINT_JS%') -WorkingDirectory '%APP_DIR%' -WindowStyle Hidden -RedirectStandardOutput '%PRINT_OUT_LOG%' -RedirectStandardError '%PRINT_ERR_LOG%' -PassThru; $p.Id" 2^>nul') do (
  set "PRINT_PID=%%P"
)

if not defined PRINT_PID (
  echo [ERROR] No se pudo iniciar impresion local.
  exit /b 1
)

set "WAITED_PRINT=0"
:wait_print
call :getListeningPid !PRINT_PORT! PORT_PID
if defined PORT_PID goto :print_started_ok

set /a WAITED_PRINT+=1
if !WAITED_PRINT! geq !STARTUP_WAIT_SECONDS! goto :print_failed
timeout /t 1 /nobreak >nul
goto :wait_print

:print_failed
echo [ERROR] La impresion local no quedo escuchando en !PRINT_PORT! tras !STARTUP_WAIT_SECONDS!s.
tasklist /FI "PID eq !PRINT_PID!" /FO CSV /NH 2>nul | findstr /I "\"!PRINT_PID!\"" >nul
if not errorlevel 1 (
  taskkill /PID !PRINT_PID! /F >nul 2>&1
)
exit /b 1

:print_started_ok
echo [OK] Impresion local iniciada en modo oculto - PID !PORT_PID!.
echo [INFO] Logs impresion:
echo        - %PRINT_OUT_LOG%
echo        - %PRINT_ERR_LOG%
exit /b 0

:normalizePort
setlocal EnableDelayedExpansion
set "RAW=!%~1!"
for /f "tokens=* delims= " %%A in ("!RAW!") do set "RAW=%%A"
set "RAW=!RAW:"=!"
for /f "tokens=1 delims= " %%A in ("!RAW!") do set "RAW=%%A"
set /a PORT_NUM=!RAW! >nul 2>&1
if errorlevel 1 set "PORT_NUM=%~2"
if !PORT_NUM! LEQ 0 set "PORT_NUM=%~2"
if !PORT_NUM! GTR 65535 set "PORT_NUM=%~2"
endlocal & set "%~1=%PORT_NUM%"
goto :eof

:normalizeHost
setlocal EnableDelayedExpansion
set "RAW=!%~1!"
for /f "tokens=* delims= " %%A in ("!RAW!") do set "RAW=%%A"
set "RAW=!RAW:"=!"
for /f "tokens=1 delims= " %%A in ("!RAW!") do set "RAW=%%A"
if not defined RAW set "RAW=%~2"
endlocal & set "%~1=%RAW%"
goto :eof

:normalizePositiveInt
setlocal EnableDelayedExpansion
set "RAW=!%~1!"
for /f "tokens=* delims= " %%A in ("!RAW!") do set "RAW=%%A"
set "RAW=!RAW:"=!"
for /f "tokens=1 delims= " %%A in ("!RAW!") do set "RAW=%%A"
set /a NUM=!RAW! >nul 2>&1
if errorlevel 1 set "NUM=%~2"
if !NUM! LEQ 0 set "NUM=%~2"
endlocal & set "%~1=%NUM%"
goto :eof

:normalizeNonNegativeInt
setlocal EnableDelayedExpansion
set "RAW=!%~1!"
for /f "tokens=* delims= " %%A in ("!RAW!") do set "RAW=%%A"
set "RAW=!RAW:"=!"
for /f "tokens=1 delims= " %%A in ("!RAW!") do set "RAW=%%A"
set /a NUM=!RAW! >nul 2>&1
if errorlevel 1 set "NUM=%~2"
if !NUM! LSS 0 set "NUM=%~2"
endlocal & set "%~1=%NUM%"
goto :eof

:getListeningPid
setlocal
set "LOOKUP_PORT=%~1"
set "FOUND_PID="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%LOOKUP_PORT% .*LISTENING"') do (
  set "FOUND_PID=%%P"
  goto :getListeningPid_done
)
:getListeningPid_done
endlocal & set "%~2=%FOUND_PID%"
goto :eof

:getProcessName
setlocal
set "LOOKUP_PID=%~1"
set "PROC_NAME="
for /f "delims=" %%N in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-Process -Id %LOOKUP_PID% -ErrorAction SilentlyContinue).ProcessName" 2^>nul') do (
  set "PROC_NAME=%%N"
)
endlocal & set "%~2=%PROC_NAME%"
goto :eof

:validateAttempts
if "%MAX_ATTEMPTS%"=="0" exit /b 0
if !ATTEMPT! GEQ %MAX_ATTEMPTS% (
  echo [ERROR] Se alcanzo el maximo de intentos: %MAX_ATTEMPTS%.
  echo         Revisa logs:
  echo         - %OUT_LOG%
  echo         - %ERR_LOG%
  set "EXIT_CODE=1"
  exit /b 1
)
exit /b 0

:ensureFirewallRule
setlocal
set "PORT=%~1"
set "RULE_NAME=%~2"
if not defined PORT (
  endlocal
  goto :eof
)
if not defined RULE_NAME (
  set "RULE_NAME=Minimarket Service %PORT%"
)

netsh advfirewall firewall show rule name="%RULE_NAME%" >nul 2>&1
if errorlevel 1 (
  netsh advfirewall firewall add rule name="%RULE_NAME%" dir=in action=allow protocol=TCP localport=%PORT% profile=private >nul 2>&1
  if errorlevel 1 (
    endlocal
    echo [WARN] No se pudo abrir firewall para puerto %PORT%. Ejecuta este .bat como administrador.
    goto :eof
  )
  endlocal
  echo [OK] Firewall habilitado para puerto %PORT%.
  goto :eof
)

netsh advfirewall firewall set rule name="%RULE_NAME%" new enable=Yes >nul 2>&1
if errorlevel 1 (
  endlocal
  echo [WARN] No se pudo habilitar la regla de firewall "%RULE_NAME%".
) else (
  endlocal
  echo [OK] Regla de firewall activa para puerto %PORT%.
)
goto :eof

:finish
echo.
if "%EXIT_CODE%"=="0" (
  echo [OK] Proceso finalizado.
) else (
  echo [WARN] Proceso finalizado con errores.
)
if /I "%MM_BATCH_NO_PAUSE%"=="1" exit /b %EXIT_CODE%
echo Presiona cualquier tecla para cerrar esta ventana...
pause <con >nul
exit /b %EXIT_CODE%

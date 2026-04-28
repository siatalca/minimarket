@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
set "APP_DIR=%ROOT_DIR%\server"
set "ENV_FILE=%APP_DIR%\.env"
set "TARGET_PORT=3002"
set "PRINT_PORT=7357"
set "EXIT_CODE=0"

if exist "%ENV_FILE%" (
  for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
    set "ENV_KEY=%%~A"
    set "ENV_VALUE=%%~B"
    if /I "!ENV_KEY!"=="PORT" set "TARGET_PORT=!ENV_VALUE!"
    if /I "!ENV_KEY!"=="LOCAL_PRINT_BRIDGE_PORT" set "PRINT_PORT=!ENV_VALUE!"
  )
)

call :normalizePort TARGET_PORT 3002
call :normalizePort PRINT_PORT 7357

echo ==========================================
echo  Detener servicios ocultos
echo ==========================================
echo  Backend API: !TARGET_PORT!
echo  Print bridge: !PRINT_PORT!
echo.

call :stopPortListeners !TARGET_PORT! "backend"
if errorlevel 1 set "EXIT_CODE=1"

call :stopPortListeners !PRINT_PORT! "impresion local"
if errorlevel 1 set "EXIT_CODE=1"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*\\server.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*\\local_print_bridge.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

set "POST_CHECK_FAIL=0"
call :verifyPortClosed !TARGET_PORT! "backend"
if errorlevel 1 set "POST_CHECK_FAIL=1"
call :verifyPortClosed !PRINT_PORT! "impresion local"
if errorlevel 1 set "POST_CHECK_FAIL=1"
if "!POST_CHECK_FAIL!"=="0" (
  if "!EXIT_CODE!"=="1" echo [INFO] Verificacion final: puertos cerrados correctamente.
  set "EXIT_CODE=0"
)

call :disableFirewallRule "Minimarket Backend API !TARGET_PORT!"
call :disableFirewallRule "Minimarket Print Bridge !PRINT_PORT!"

echo.
if "%EXIT_CODE%"=="0" (
  echo [OK] Servicios detenidos.
) else (
  echo [WARN] Se detectaron advertencias al detener uno o mas servicios.
)
goto :finish

:stopPortListeners
setlocal EnableDelayedExpansion
set "LOOKUP_PORT=%~1"
set "SERVICE_NAME=%~2"
set "FOUND=0"
set "REMAINING=0"
set "LOCAL_EXIT=0"
set "SEEN_PIDS=;"

for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":!LOOKUP_PORT! .*LISTENING"') do (
  if "!SEEN_PIDS:;%%P;=!"=="!SEEN_PIDS!" (
    set "SEEN_PIDS=!SEEN_PIDS!%%P;"
    set "FOUND=1"
    echo [INFO] Deteniendo !SERVICE_NAME! PID %%P en puerto !LOOKUP_PORT!...
    taskkill /PID %%P /T /F >nul 2>&1
    if errorlevel 1 (
      powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Stop-Process -Id %%P -Force -ErrorAction Stop; exit 0 } catch { exit 1 }" >nul 2>&1
      if errorlevel 1 (
        echo [WARN] No se pudo detener PID %%P.
        set "LOCAL_EXIT=1"
      ) else (
        echo [OK] PID %%P detenido (fallback PowerShell).
      )
    ) else (
      echo [OK] PID %%P detenido.
    )
  )
)

set "SEEN_PIDS=;"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":!LOOKUP_PORT! .*LISTENING"') do (
  if "!SEEN_PIDS:;%%P;=!"=="!SEEN_PIDS!" (
    set "SEEN_PIDS=!SEEN_PIDS!%%P;"
    set "REMAINING=1"
    echo [WARN] El puerto !LOOKUP_PORT! sigue activo con PID %%P.
  )
)

if "!FOUND!"=="0" (
  echo [INFO] No habia !SERVICE_NAME! activo en el puerto !LOOKUP_PORT!.
)

if "!REMAINING!"=="1" set "LOCAL_EXIT=1"
endlocal & exit /b %LOCAL_EXIT%

:verifyPortClosed
setlocal EnableDelayedExpansion
set "LOOKUP_PORT=%~1"
set "SERVICE_NAME=%~2"
set "FOUND=0"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":!LOOKUP_PORT! .*LISTENING"') do (
  if "!FOUND!"=="0" (
    set "FOUND=1"
    echo [WARN] Verificacion final: !SERVICE_NAME! sigue activo en !LOOKUP_PORT! (PID %%P).
  )
)
if "!FOUND!"=="1" (
  endlocal & exit /b 1
)
endlocal & exit /b 0

:disableFirewallRule
setlocal
set "RULE_NAME=%~1"
if not defined RULE_NAME (
  endlocal
  goto :eof
)

netsh advfirewall firewall show rule name="%RULE_NAME%" >nul 2>&1
if errorlevel 1 (
  endlocal
  echo [INFO] Regla de firewall no encontrada: "%RULE_NAME%". Se omite deshabilitar.
  goto :eof
)

netsh advfirewall firewall set rule name="%RULE_NAME%" new enable=No >nul 2>&1
if errorlevel 1 (
  net session >nul 2>&1
  if errorlevel 1 (
    endlocal
    echo [INFO] Sin permisos de administrador para deshabilitar "%RULE_NAME%". Se omite.
    goto :eof
  )
  endlocal
  echo [WARN] No se pudo deshabilitar la regla de firewall "%RULE_NAME%".
) else (
  endlocal
  echo [OK] Regla de firewall deshabilitada: "%RULE_NAME%".
)
goto :eof

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

:finish
echo.
if /I "%MM_BATCH_NO_PAUSE%"=="1" exit /b %EXIT_CODE%
echo Presiona cualquier tecla para cerrar esta ventana...
pause <con >nul
exit /b %EXIT_CODE%

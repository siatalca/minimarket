@echo off
rem Detiene el puente de impresion local (procesos node que ejecutan local_print_bridge.js).
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*local_print_bridge.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
if /I not "%~1"=="silencioso" echo [OK] Impresion local detenida.
exit /b 0

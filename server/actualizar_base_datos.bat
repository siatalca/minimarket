@echo off
setlocal
cd /d "%~dp0"
echo [DB] Actualizando estructura de base de datos...
node update_db_schema.js
set EXIT_CODE=%ERRORLEVEL%
if %EXIT_CODE% EQU 0 (
  echo [DB] Actualizacion completada.
) else (
  echo [DB] Error durante la actualizacion.
)
exit /b %EXIT_CODE%

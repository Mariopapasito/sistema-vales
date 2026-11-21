@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js LTS para Windows x64 desde https://nodejs.org/
  echo Despues cierra esta ventana y abre INICIAR-PRUEBA.cmd de nuevo.
  pause
  exit /b 1
)
node iniciar.cjs
if errorlevel 1 pause

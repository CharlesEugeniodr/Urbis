@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [URBIS] Node.js 20+ nao foi encontrado no PATH.
  pause
  exit /b 1
)
echo [URBIS] Iniciando URBIS v0.5.0-alpha.1 em modo local seguro...
start "URBIS Local Server" cmd /k "cd /d ""%~dp0"" && node tools\local-probe-server.mjs"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:3100/panel/"
echo [URBIS] Painel aberto.
echo [URBIS] Acesso local: manager@urbis.local / UrbisLocal!2026
echo [URBIS] Nao reutilize esta senha fora da prova local.
endlocal

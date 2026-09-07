@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js nao encontrado.& pause & exit /b 1)
where python >nul 2>nul || (echo Python nao encontrado.& pause & exit /b 1)
npm run test:all
pause
endlocal

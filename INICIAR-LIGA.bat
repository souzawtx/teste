@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18 ou superior nao foi encontrado.
  echo Instale o Node.js e abra este arquivo novamente.
  pause
  exit /b 1
)
set PORT=4173
start "" /B cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:4173"
node server.js
pause

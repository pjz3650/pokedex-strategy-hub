@echo off
setlocal
cd /d "%~dp0"
call "%~dp0pnpm.cmd" run db:local
if errorlevel 1 goto erro
call "%~dp0pnpm.cmd" run dev
if errorlevel 1 goto erro
exit /b 0
:erro
echo.
echo Nao foi possivel iniciar o projeto. Confira a mensagem acima.
pause
exit /b 1

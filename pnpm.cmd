@echo off
setlocal
set "POKETATICS_TOOLS=%LOCALAPPDATA%\Programs\PokeTaticsTools\node24-pnpm11"
if not exist "%POKETATICS_TOOLS%\pnpm.cmd" (
  for %%P in (pnpm.cmd) do set "POKETATICS_GLOBAL_PNPM=%%~$PATH:P"
  goto global
)
set "PATH=%POKETATICS_TOOLS%;%PATH%"
call "%POKETATICS_TOOLS%\pnpm.cmd" %*
exit /b %ERRORLEVEL%
:global
if not defined POKETATICS_GLOBAL_PNPM (
  echo Instale Node.js e pnpm 11. Depois reabra o terminal e tente novamente.
  exit /b 1
)
if /i "%POKETATICS_GLOBAL_PNPM%"=="%~f0" (
  echo O pnpm global nao foi encontrado. Instale-o e reabra o terminal.
  exit /b 1
)
call "%POKETATICS_GLOBAL_PNPM%" %*
exit /b %ERRORLEVEL%

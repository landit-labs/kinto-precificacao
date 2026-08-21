@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

rem ---------------------------------------------------------------------------
rem  Abre a versao HTML pura do painel no Google Chrome.
rem  Sem servidor, sem Python, sem Node: a pagina le o snapshot de js/dados.js.
rem ---------------------------------------------------------------------------

if not exist "%~dp0index.html" goto :sem_pagina
if not exist "%~dp0js\dados.js" goto :sem_dados

set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if not defined CHROME goto :sem_chrome
start "" "%CHROME%" --new-window "%~dp0index.html"
goto :eof

:sem_chrome
echo  [aviso] Chrome nao encontrado; abrindo o navegador padrao.
start "" "%~dp0index.html"
goto :eof

:sem_pagina
echo  [ERRO] index.html nao encontrado em "%~dp0".
echo.
pause
exit /b 1

:sem_dados
echo  [ERRO] js\dados.js nao encontrado — a pagina abriria sem dados.
echo         Gere o snapshot com o backend no ar:
echo           powershell -ExecutionPolicy Bypass -File "%~dp0gerar-dados.ps1"
echo.
pause
exit /b 1

@echo off
chcp 65001 >nul
setlocal
title Plataforma de Precificacao de Seminovos (SDP #5211)
cd /d "%~dp0"

rem ---------------------------------------------------------------------------
rem  Valida e instala as dependencias, sobe o backend (FastAPI/uvicorn) e o
rem  frontend (Vite), espera os dois responderem e abre o Google Chrome.
rem
rem  Cada servidor abre em sua propria janela; fechar a janela encerra o
rem  servidor. Na primeira execucao o script cria a venv do backend e roda o
rem  npm ci do frontend.
rem
rem  A porta da API e 8010 (e nao 8000) porque 8000 costuma estar ocupada por
rem  outros servicos nesta maquina. A porta do frontend precisa ser 5173: e a
rem  unica origem liberada no CORS do backend (backend/app/main.py).
rem ---------------------------------------------------------------------------

set "PORTA_API=8010"
set "PORTA_APP=5173"
set "URL_API=http://localhost:%PORTA_API%"
set "URL_APP=http://localhost:%PORTA_APP%"
set "URL_HEALTH=%URL_API%/health"
set "VENV_PY=%~dp0backend\.venv\Scripts\python.exe"

echo.
echo  === Plataforma de Precificacao de Seminovos - SDP #5211 ===
echo.

rem ===========================================================================
rem  1/6 - Ferramentas de base
rem ===========================================================================
echo  [1/6] Verificando Python e Node.js ...
set "PY="
py -3 --version >nul 2>&1
if not errorlevel 1 set "PY=py -3"
if defined PY goto :python_ok
python --version >nul 2>&1
if not errorlevel 1 set "PY=python"
:python_ok
if not defined PY goto :erro_python
call npm --version >nul 2>&1
if errorlevel 1 goto :erro_node
for /f "tokens=*" %%v in ('%PY% --version 2^>^&1') do echo        %%v
for /f "tokens=*" %%v in ('node --version 2^>^&1') do echo        Node.js %%v

rem ===========================================================================
rem  2/6 - Dependencias do backend
rem ===========================================================================
echo  [2/6] Validando dependencias do backend ...
if exist "%VENV_PY%" goto :venv_ok
echo        Criando ambiente virtual em backend\.venv ...
%PY% -m venv "%~dp0backend\.venv"
if errorlevel 1 goto :erro_venv
:venv_ok

"%VENV_PY%" -c "import fastapi, uvicorn, pydantic, httpx, pytest" >nul 2>&1
if not errorlevel 1 goto :deps_ok

echo        Instalando dependencias (backend\requirements.txt) ...
"%VENV_PY%" -m pip install --upgrade pip --quiet --disable-pip-version-check
"%VENV_PY%" -m pip install --only-binary=:all: --quiet --disable-pip-version-check -r "%~dp0backend\requirements.txt"
if not errorlevel 1 goto :deps_validar

rem  As versoes fixadas em requirements.txt nao publicam wheel para todo
rem  Python (ex.: pydantic 2.11.4 no Python 3.14 exige compilar Rust + MSVC).
rem  Nesse caso instalamos o mesmo stack em versoes que tenham wheel pronta.
echo        Sem wheel para este Python; instalando o mesmo stack em versoes compativeis ...
"%VENV_PY%" -m pip install --only-binary=:all: --quiet --disable-pip-version-check "fastapi>=0.116" "uvicorn[standard]>=0.34" "pydantic>=2.12" "pytest>=8.3" "httpx>=0.28"
if errorlevel 1 goto :erro_deps

:deps_validar
"%VENV_PY%" -c "import fastapi, uvicorn, pydantic, httpx, pytest" >nul 2>&1
if errorlevel 1 goto :erro_deps
:deps_ok
"%VENV_PY%" -c "import fastapi,uvicorn,pydantic;print('       ok: fastapi',fastapi.__version__,'| uvicorn',uvicorn.__version__,'| pydantic',pydantic.VERSION)"
pushd "%~dp0backend"
"%VENV_PY%" -c "import app.main" >nul 2>&1
set "RC=%ERRORLEVEL%"
popd
if not "%RC%"=="0" goto :erro_import

rem ===========================================================================
rem  3/6 - Dependencias do frontend
rem ===========================================================================
echo  [3/6] Validando dependencias do frontend ...
pushd "%~dp0frontend"
if not exist "node_modules" goto :npm_instalar
call npm ls --depth=0 --silent >nul 2>&1
if not errorlevel 1 goto :npm_validar
:npm_instalar
echo        Instalando dependencias (npm ci) ...
call npm ci --no-fund --no-audit
if not errorlevel 1 goto :npm_validar
echo        npm ci falhou; tentando npm install ...
call npm install --no-fund --no-audit
if errorlevel 1 goto :erro_npm_pop
:npm_validar
call npm ls --depth=0 --silent >nul 2>&1
if errorlevel 1 goto :erro_npm_pop
echo        ok: dependencias do frontend completas (node_modules)
popd

rem ===========================================================================
rem  4/6 - Aponta o frontend para a porta da API
rem ===========================================================================
echo  [4/6] Configurando frontend\.env.local (VITE_API_URL) ...
set "ENV_LOCAL=%~dp0frontend\.env.local"
if not exist "%ENV_LOCAL%" goto :escrever_env
findstr /c:"VITE_API_URL=%URL_API%" "%ENV_LOCAL%" >nul 2>&1
if not errorlevel 1 goto :env_ok
echo        Atualizando VITE_API_URL para %URL_API% ...
:escrever_env
>"%ENV_LOCAL%" echo # Gerado por iniciar-app.bat - aponta o frontend para a API local.
>>"%ENV_LOCAL%" echo VITE_API_URL=%URL_API%
:env_ok
echo        ok: VITE_API_URL=%URL_API%

rem ===========================================================================
rem  5/6 - Servidores
rem ===========================================================================
echo  [5/6] Iniciando os servidores ...

call :estado_api
if "%ESTADO%"=="nossa" echo        API ja esta rodando em %URL_API%; reaproveitando.
if "%ESTADO%"=="ocupada" goto :erro_porta_api
if not "%ESTADO%"=="livre" goto :api_pronta
echo        API .............. %URL_API%
start "API :%PORTA_API% - Precificacao" /d "%~dp0backend" cmd /k ".venv\Scripts\python.exe -m uvicorn app.main:app --reload --port %PORTA_API%"
:api_pronta

call :estado_app
if "%ESTADO%"=="nossa" echo        Aplicacao ja esta rodando em %URL_APP%; reaproveitando.
if not "%ESTADO%"=="livre" goto :app_pronta
echo        Aplicacao ........ %URL_APP%
start "APP :%PORTA_APP% - Precificacao" /d "%~dp0frontend" cmd /k "npm run dev -- --port %PORTA_APP% --strictPort"
:app_pronta

echo        Aguardando os servidores responderem ...
call :aguardar "%URL_HEALTH%" "API"
if errorlevel 1 goto :erro_timeout
call :aguardar "%URL_APP%/" "aplicacao"
if errorlevel 1 goto :erro_timeout

rem ===========================================================================
rem  6/6 - Chrome
rem ===========================================================================
set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if not defined CHROME goto :sem_chrome
echo  [6/6] Abrindo o Chrome em %URL_APP% ...
start "" "%CHROME%" --new-window "%URL_APP%"
goto :fim
:sem_chrome
echo  [6/6] Chrome nao encontrado; abrindo o navegador padrao ...
start "" "%URL_APP%"

:fim
echo.
echo  Tudo no ar.
echo    Aplicacao ......... %URL_APP%
echo    API ............... %URL_API%/api/inventario
echo    Swagger ........... %URL_API%/docs
echo.
echo  Para encerrar, feche as duas janelas de servidor abertas por este script.
echo.
pause
endlocal
exit /b 0

rem ===========================================================================
rem  Sub-rotinas
rem ===========================================================================

rem  Aguarda ate 60s uma URL responder 2xx. %1 = URL, %2 = nome no erro.
:aguardar
set /a _tentativa=0
:aguardar_loop
set /a _tentativa+=1
curl.exe -s -f -o nul --max-time 3 %1
if not errorlevel 1 exit /b 0
if %_tentativa% geq 60 goto :aguardar_timeout
ping -n 2 127.0.0.1 >nul
goto :aguardar_loop
:aguardar_timeout
echo  [ERRO] A %~2 nao respondeu em 60s. Veja a janela do servidor correspondente.
exit /b 1

rem  ESTADO=nossa (nossa API responde) ^| ocupada (outro servico na porta) ^| livre
:estado_api
set "ESTADO=livre"
curl.exe -s -f --max-time 3 "%URL_HEALTH%" | findstr /c:"\"status\"" >nul 2>&1
if not errorlevel 1 set "ESTADO=nossa" & exit /b 0
netstat -ano -p TCP | findstr /r /c:":%PORTA_API% .*LISTENING" >nul 2>&1
if not errorlevel 1 set "ESTADO=ocupada"
exit /b 0

rem  ESTADO=nossa (Vite respondendo) ^| livre
:estado_app
set "ESTADO=livre"
curl.exe -s -f -o nul --max-time 3 "%URL_APP%/"
if not errorlevel 1 set "ESTADO=nossa"
exit /b 0

rem ===========================================================================
rem  Erros
rem ===========================================================================
:erro_python
echo  [ERRO] Python nao encontrado no PATH. Instale o Python 3 e tente de novo.
goto :abortar

:erro_node
echo  [ERRO] Node.js/npm nao encontrado no PATH. Instale o Node.js e tente de novo.
goto :abortar

:erro_venv
echo  [ERRO] Falha ao criar o ambiente virtual em backend\.venv.
goto :abortar

:erro_deps
echo  [ERRO] Falha ao instalar/validar as dependencias do backend.
echo         Rode manualmente para ver o motivo:
echo           "%VENV_PY%" -m pip install -r backend\requirements.txt
goto :abortar

:erro_import
echo  [ERRO] As dependencias instalaram, mas "import app.main" falhou.
echo         Rode dentro de backend\: .venv\Scripts\python.exe -c "import app.main"
goto :abortar

:erro_npm_pop
popd
echo  [ERRO] Falha ao instalar/validar as dependencias do frontend.
echo         Rode manualmente em frontend\: npm install
goto :abortar

:erro_porta_api
echo  [ERRO] A porta %PORTA_API% esta ocupada por outro servico (que nao e esta API).
echo         Edite PORTA_API no topo deste arquivo e rode de novo.
goto :abortar

:erro_timeout
echo  [ERRO] Servidores nao ficaram prontos; o navegador nao foi aberto.
goto :abortar

:abortar
echo.
pause
endlocal
exit /b 1

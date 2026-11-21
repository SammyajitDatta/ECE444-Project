@echo off
setlocal
cd /d "%~dp0" || exit /b 1
set "APPLYPILOT_PYTHON=python"
if exist "..\.venv\Scripts\python.exe" set "APPLYPILOT_PYTHON=..\.venv\Scripts\python.exe"
if exist ".venv\Scripts\python.exe" set "APPLYPILOT_PYTHON=.venv\Scripts\python.exe"
set "FLASK_SKIP_DOTENV=1"
"%APPLYPILOT_PYTHON%" -m flask --app app:create_app run --host 127.0.0.1 --port 5000
exit /b %errorlevel%

@echo off
setlocal
cd /d "%~dp0app" || exit /b 1
call npm.cmd run dev
exit /b %errorlevel%

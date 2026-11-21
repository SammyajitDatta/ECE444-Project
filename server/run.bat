@echo off
setlocal
cd /d "%~dp0" || exit /b 1
call npm.cmd run dev
exit /b %errorlevel%

@echo off
setlocal

cd /d "%~dp0"
title MAPA 101

where powershell.exe >nul 2>&1
if errorlevel 1 (
  echo ERROR: Windows PowerShell is not available on this computer.
  echo The application could not be started.
  echo.
  pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows-server.ps1"
set "APP_EXIT_CODE=%ERRORLEVEL%"

if not "%APP_EXIT_CODE%"=="0" (
  echo.
  echo The MAPA 101 server stopped with an error.
  pause
)

exit /b %APP_EXIT_CODE%
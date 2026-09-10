@echo off
setlocal enabledelayedexpansion

:: Resolve project root directory
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

title PharmaGuard Shutdown

echo ===============================================================================
echo   Stopping PharmaGuard Development Servers (Backend ^& Frontend)...
echo ===============================================================================
echo.

:: 1. Terminate processes listening on port 8000 (Backend / uvicorn)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo   [+] Stopping Backend process on port 8000 [PID: %%a]
    taskkill /F /PID %%a >nul 2>&1
)

:: 2. Terminate processes listening on port 5173 (Frontend / Vite)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo   [+] Stopping Frontend process on port 5173 [PID: %%a]
    taskkill /F /PID %%a >nul 2>&1
)

:: 3. Close launcher command windows if still open
taskkill /FI "WINDOWTITLE eq PharmaGuard Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq PharmaGuard Frontend*" /T /F >nul 2>&1

echo.
echo   [OK] PharmaGuard servers successfully stopped.
echo ===============================================================================
ping -n 2 127.0.0.1 >nul 2>&1

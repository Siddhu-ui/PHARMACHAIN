@echo off
setlocal enabledelayedexpansion

:: Resolve project root directory from batch file location
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

title PharmaGuard Startup

echo ===============================================================================
echo   PHARMAGUARD - AI-Assisted Reverse Chain Compliance Platform
echo ===============================================================================
echo.
echo   [1/2] Launching FastAPI Backend on port 8000...
start "PharmaGuard Backend (Port 8000)" cmd /k "cd /d ""%PROJECT_ROOT%backend"" && set PYTHONPATH=%PROJECT_ROOT%backend && ""%PROJECT_ROOT%backend\venv\Scripts\python.exe"" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo   [2/2] Launching React / Vite Frontend on port 5173...
start "PharmaGuard Frontend (Port 5173)" cmd /k "cd /d ""%PROJECT_ROOT%frontend"" && npm run dev"

echo.
echo ===============================================================================
echo   PharmaGuard is now starting up!
echo.
echo   Backend:    http://127.0.0.1:8000
echo   API docs:   http://127.0.0.1:8000/docs
echo   Frontend:   http://localhost:5173
echo.
echo   To safely stop both servers, run:
echo     stop_pharmaguard.bat
echo ===============================================================================
echo.

:: Give servers a few seconds and offer to open the browser
ping -n 4 127.0.0.1 >nul
start "" "http://localhost:5173"

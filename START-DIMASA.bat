@echo off
title Dimasa App - Starting...
color 0A
cls

set SCRIPT_DIR=%~dp0

echo.
echo  ================================================
echo         DIMASA APP - STARTING UP
echo  ================================================
echo.

:: ── Check setup was done ──────────────────────────────────────────────────────
IF NOT EXIST "%SCRIPT_DIR%backend\.env" (
    color 0C
    echo  ERROR: Setup not done yet!
    echo  Please run SETUP.bat first.
    echo.
    pause
    exit /b 1
)
IF NOT EXIST "%SCRIPT_DIR%backend\node_modules" (
    color 0C
    echo  ERROR: Backend not installed.
    echo  Please run SETUP.bat first.
    echo.
    pause
    exit /b 1
)
IF NOT EXIST "%SCRIPT_DIR%frontend\node_modules" (
    color 0C
    echo  ERROR: Frontend not installed.
    echo  Please run SETUP.bat first.
    echo.
    pause
    exit /b 1
)

:: ── Start Backend ─────────────────────────────────────────────────────────────
echo  Starting backend server...
start "Dimasa BACKEND - Keep Open" cmd /k "color 0B && cd /d "%SCRIPT_DIR%backend" && echo. && echo  ================================ && echo   DIMASA BACKEND  (Port 5000) && echo   Keep this window open! && echo   OTP codes appear here. && echo  ================================ && echo. && npm run dev"

echo  Waiting for backend...
timeout /t 5 /nobreak >nul

:: ── Start Frontend ────────────────────────────────────────────────────────────
echo  Starting frontend...
start "Dimasa FRONTEND - Keep Open" cmd /k "color 0D && cd /d "%SCRIPT_DIR%frontend" && echo. && echo  ================================= && echo   DIMASA FRONTEND  (Port 5173) && echo   Keep this window open! && echo  ================================= && echo. && npm run dev"

echo  Waiting for frontend...
timeout /t 5 /nobreak >nul

:: ── Open browser ──────────────────────────────────────────────────────────────
echo  Opening browser...
start "" "http://localhost:5173"

:: ── Done ──────────────────────────────────────────────────────────────────────
cls
echo.
echo  ================================================
echo.
echo      DIMASA APP IS RUNNING!
echo.
echo  ================================================
echo.
echo   Open in browser:  http://localhost:5173
echo.
echo  ------------------------------------------------
echo.
echo   Two windows are open - KEEP THEM OPEN:
echo    BLUE window   = Backend server
echo    PURPLE window = Frontend server
echo.
echo   When you log in, look at the BLUE window
echo   to get your OTP code.
echo.
echo   To stop the app: run STOP-DIMASA.bat
echo.
echo  ================================================
echo.
echo  This window can be closed.
echo.
pause

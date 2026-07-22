@echo off
title Dimasa App - First Time Setup
color 0A
cls

echo.
echo  ================================================
echo        DIMASA APP - FIRST TIME SETUP
echo  ================================================
echo.
echo  No PostgreSQL needed - uses SQLite (zero install).
echo  This will take about 2-3 minutes.
echo.
pause

:: ── Check Node.js ─────────────────────────────────────────────────────────────
echo.
echo  [1/4] Checking Node.js...
node --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo  ================================================
    echo   ERROR: Node.js is not installed!
    echo  ================================================
    echo.
    echo  Please do this:
    echo.
    echo   1. Open your browser
    echo   2. Go to:  https://nodejs.org
    echo   3. Click the big LTS download button
    echo   4. Run the installer (click Next all the way)
    echo   5. Restart your computer
    echo   6. Double-click SETUP.bat again
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo  Node.js found: %NODE_VER%

:: ── Create .env file ─────────────────────────────────────────────────────────
echo.
echo  [2/4] Creating config file...
set SCRIPT_DIR=%~dp0
(
echo JWT_SECRET="dimasa-super-secret-jwt-key-2024"
echo PORT=5000
echo CLIENT_URL="http://localhost:5173"
) > "%SCRIPT_DIR%backend\.env"
echo  Config created!

:: ── Install backend packages ──────────────────────────────────────────────────
echo.
echo  [3/4] Installing backend packages...
echo  (Downloading - takes 1-2 minutes)
echo.
cd /d "%SCRIPT_DIR%backend"
call npm install
IF %ERRORLEVEL% NEQ 0 (
    color 0C
    echo  ERROR: Failed to install backend packages.
    echo  Check your internet and try again.
    pause
    exit /b 1
)
echo  Backend ready!

:: ── Install frontend packages ─────────────────────────────────────────────────
echo.
echo  [4/4] Installing frontend packages...
echo  (Downloading - takes 1-2 minutes)
echo.
cd /d "%SCRIPT_DIR%frontend"
call npm install
IF %ERRORLEVEL% NEQ 0 (
    color 0C
    echo  ERROR: Failed to install frontend packages.
    echo  Check your internet and try again.
    pause
    exit /b 1
)
echo  Frontend ready!

:: ── Create SQLite database ────────────────────────────────────────────────────
echo.
echo  Creating database (no PostgreSQL needed)...
cd /d "%SCRIPT_DIR%backend"
call npx prisma db push
IF %ERRORLEVEL% NEQ 0 (
    color 0C
    echo  ERROR: Could not create database. Run setup again.
    pause
    exit /b 1
)
echo  Database ready!

:: ── Done ─────────────────────────────────────────────────────────────────────
color 0A
cls
echo.
echo  ================================================
echo.
echo        SETUP COMPLETE!
echo.
echo  ================================================
echo.
echo  Everything installed. No PostgreSQL needed.
echo  Your data is saved in: backend\prisma\dimasa.db
echo.
echo  -----------------------------------------------
echo.
echo   Next step: double-click  START-DIMASA.bat
echo.
echo  -----------------------------------------------
echo.
pause

@echo off
title Dimasa App
color 0A
cls
set SCRIPT_DIR=%~dp0

echo.
echo  =============================================
echo          DIMASA APP
echo  =============================================
echo.

:: ════════════════════════════════════════════════
::  STEP 1 - Check Node.js
:: ════════════════════════════════════════════════
node --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    color 0C
    cls
    echo.
    echo  =============================================
    echo   Node.js is not installed!
    echo  =============================================
    echo.
    echo  Do this one time:
    echo.
    echo   1. Open your browser
    echo   2. Go to:  https://nodejs.org
    echo   3. Click the big green LTS button
    echo   4. Run the installer - click Next all the way
    echo   5. RESTART your computer
    echo   6. Double-click DIMASA.bat again
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo  Node.js %NODE_VER% found.

:: ════════════════════════════════════════════════
::  STEP 2 - First time setup (only if needed)
:: ════════════════════════════════════════════════
set NEEDS_SETUP=0

IF NOT EXIST "%SCRIPT_DIR%backend\.env"             set NEEDS_SETUP=1
IF NOT EXIST "%SCRIPT_DIR%backend\node_modules"     set NEEDS_SETUP=1
IF NOT EXIST "%SCRIPT_DIR%frontend\node_modules"    set NEEDS_SETUP=1
IF NOT EXIST "%SCRIPT_DIR%backend\prisma\dimasa.db" set NEEDS_SETUP=1

IF %NEEDS_SETUP%==1 (
    cls
    echo.
    echo  =============================================
    echo   First Time Setup  ^(takes 2-3 minutes^)
    echo  =============================================
    echo.
    echo  Please keep this window open.
    echo.

    :: ── 1/5  Create .env ────────────────────────────────────────────────
    echo  [1/5] Creating config file...
    (
        echo DATABASE_URL=file:./prisma/dimasa.db
        echo JWT_SECRET=dimasa-jwt-secret-change-before-going-live
        echo PORT=5000
        echo NODE_ENV=development
        echo CLIENT_URL=http://localhost:5173
    ) > "%SCRIPT_DIR%backend\.env"
    echo        Done!

    :: ── 2/5  Install backend packages ──────────────────────────────────
    echo.
    echo  [2/5] Installing backend packages...
    echo  ^(This downloads from internet - may take 1-2 minutes^)
    echo.
    cd /d "%SCRIPT_DIR%backend"
    call npm install
    IF %ERRORLEVEL% NEQ 0 (
        color 0C
        echo.
        echo  ERROR: Could not install backend packages.
        echo  Check your internet connection and try again.
        echo.
        pause
        exit /b 1
    )
    echo.
    echo  [2/5] Done!

    :: ── 3/5  Install frontend packages ─────────────────────────────────
    echo.
    echo  [3/5] Installing frontend packages...
    echo  ^(This downloads from internet - may take 1-2 minutes^)
    echo.
    cd /d "%SCRIPT_DIR%frontend"
    call npm install
    IF %ERRORLEVEL% NEQ 0 (
        color 0C
        echo.
        echo  ERROR: Could not install frontend packages.
        echo  Check your internet connection and try again.
        echo.
        pause
        exit /b 1
    )
    echo.
    echo  [3/5] Done!

    :: ── 4/5  Generate Prisma client ─────────────────────────────────────
    echo.
    echo  [4/5] Setting up database client...
    cd /d "%SCRIPT_DIR%backend"
    call npx prisma generate
    IF %ERRORLEVEL% NEQ 0 (
        color 0C
        echo.
        echo  ERROR: Could not generate database client.
        echo  Try running DIMASA.bat again.
        echo.
        pause
        exit /b 1
    )
    echo  [4/5] Done!

    :: ── 5/5  Create database tables + seed sample data ──────────────────
    echo.
    echo  [5/5] Creating database...
    cd /d "%SCRIPT_DIR%backend"
    call npx prisma db push
    IF %ERRORLEVEL% NEQ 0 (
        color 0C
        echo.
        echo  ERROR: Could not create database.
        echo  Try running DIMASA.bat again.
        echo.
        pause
        exit /b 1
    )
    echo        Seeding sample places...
    call npm run db:seed
    echo  [5/5] Done!

    echo.
    echo  =============================================
    echo   Setup complete! Launching app now...
    echo  =============================================
    echo.
    timeout /t 2 /nobreak >nul
)

:: ════════════════════════════════════════════════
::  STEP 3 - Kill any stale processes on those ports
:: ════════════════════════════════════════════════
echo  Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| find ":5000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| find ":5173" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: ════════════════════════════════════════════════
::  STEP 4 - Start Backend (blue window)
:: ════════════════════════════════════════════════
echo  Starting backend...
start "DIMASA BACKEND [Keep Open]" cmd /k "color 0B && cd /d %SCRIPT_DIR%backend && echo. && echo  ======================================== && echo   DIMASA BACKEND  (Port 5000) && echo   Keep this window open! && echo   OTP login codes appear here. && echo  ======================================== && echo. && npm run dev"

:: Wait until backend health check passes
echo  Waiting for backend...
:WAIT_BACKEND
timeout /t 2 /nobreak >nul
powershell -Command "try{Invoke-WebRequest http://localhost:5000/api/health -TimeoutSec 2 -UseBasicParsing|Out-Null;exit 0}catch{exit 1}" >nul 2>&1
IF %ERRORLEVEL% NEQ 0 goto WAIT_BACKEND
echo  Backend ready!

:: ════════════════════════════════════════════════
::  STEP 5 - Start Frontend (purple window)
:: ════════════════════════════════════════════════
echo  Starting frontend...
start "DIMASA FRONTEND [Keep Open]" cmd /k "color 0D && cd /d %SCRIPT_DIR%frontend && echo. && echo  ======================================== && echo   DIMASA FRONTEND  (Port 5173) && echo   Keep this window open! && echo  ======================================== && echo. && npm run dev"

echo  Waiting for frontend...
timeout /t 7 /nobreak >nul

:: ════════════════════════════════════════════════
::  STEP 6 - Open browser
:: ════════════════════════════════════════════════
echo  Opening browser...
start "" "http://localhost:5173"

:: ════════════════════════════════════════════════
::  Done
:: ════════════════════════════════════════════════
cls
echo.
echo  =============================================
echo.
echo        DIMASA APP IS RUNNING!
echo.
echo  =============================================
echo.
echo   Open in browser: http://localhost:5173
echo.
echo  ---------------------------------------------
echo.
echo   Keep these 2 windows open:
echo.
echo     BLUE window   = Backend  ^(port 5000^)
echo     PURPLE window = Frontend ^(port 5173^)
echo.
echo   OTP login codes appear in the BLUE window.
echo.
echo   To stop: close the blue + purple windows.
echo.
echo  =============================================
echo.
echo  This window can be closed now.
echo.
pause

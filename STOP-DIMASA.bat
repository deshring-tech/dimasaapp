@echo off
title Dimasa App - Stopping
color 0C
cls

echo.
echo  Stopping Dimasa App...
echo.
taskkill /F /IM node.exe >nul 2>&1
echo  All servers stopped.
echo.
pause

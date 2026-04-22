@echo off
echo ============================================
echo   ReValue - Shutdown Script
echo ============================================
echo.

REM Capture the directory where this script lives
set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%

echo Stopping all ReValue services...
cd /d "%ROOT%"
docker-compose down

echo.
echo ============================================
echo   ReValue stopped.
echo ============================================
echo.
pause

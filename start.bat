@echo off
echo ============================================
echo   ReValue - Startup Script
echo ============================================
echo.

REM Capture the directory where this script lives
set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%

REM Check Docker is running
echo [1/2] Checking Docker...
where /q docker
if %errorlevel% neq 0 (
    echo   ERROR: Docker not found. Please install Docker Desktop.
    pause
    exit /b 1
)
docker info > nul 2>&1
if %errorlevel% neq 0 (
    echo   ERROR: Docker Desktop is not running. Please start it and try again.
    pause
    exit /b 1
)
echo   Docker is running.

echo.
echo [2/2] Starting all services with Docker Compose...
cd /d "%ROOT%"
docker-compose up --build -d

echo.
echo ============================================
echo   ReValue is starting!
echo   - Web App:  http://localhost:3000
echo   - Backend:  http://localhost:8000
echo   - API Docs: http://localhost:8000/docs
echo ============================================
echo.
echo Use "docker-compose logs -f" to follow logs.
echo Use "stop.bat" to stop all services.
echo.
pause

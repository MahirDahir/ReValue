@echo off
echo ============================================
echo   RecycleBottles POC - Startup Script
echo ============================================
echo.

REM Check if databases are running
echo [1/4] Checking databases...
where /q docker
if %errorlevel% equ 0 (
    docker ps | findstr postgres
    if %errorlevel% neq 0 (
        echo Starting PostgreSQL container...
        docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=recycle_bottles --name recycle-postgres postgres:15
    )
    docker ps | findstr mongo
    if %errorlevel% neq 0 (
        echo Starting MongoDB container...
        docker run -d -p 27017:27017 --name recycle-mongo mongo:7
    )
) else (
    echo Docker not found. Please ensure PostgreSQL and MongoDB are running manually.
    echo PostgreSQL: localhost:5432
    echo MongoDB: localhost:27017
)

echo.
echo [2/4] Setting up Backend...
cd backend

if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate

echo Installing backend dependencies...
pip install -r requirements.txt -q

if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo Please edit backend\.env with your configuration
)

echo.
echo [3/4] Starting Backend Server...
start "RecycleBottles Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo Backend starting on http://localhost:8000 ...

echo.
echo [4/4] Setting up Web Frontend...
cd ..\web

if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
)

echo Starting Web Frontend...
start "RecycleBottles Web" cmd /k "cd web && npm run dev"
echo Web frontend starting on http://localhost:3000 ...

echo.
echo ============================================
echo   POC is starting!
echo   - Backend:  http://localhost:8000
echo   - API Docs: http://localhost:8000/docs
echo   - Web App:  http://localhost:3000
echo ============================================
echo.
echo Press any key to exit this window...
pause > nul

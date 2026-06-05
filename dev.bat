@echo off
echo ============================================
echo  Sportfest - Dev Mode
echo ============================================
echo  Terminal 1 (this): Python backend
echo  Terminal 2:         PostgreSQL
echo  Terminal 3:         Vite frontend
echo.
echo  Electron window: npm run electron:dev
echo ============================================
echo.

echo [1/4] Installing Node dependencies...
call npm install --fund=false
echo Done.

echo [2/4] Starting PostgreSQL...
start "Sportfest PostgreSQL" cmd /k "node scripts\dev-pg.js"

echo [3/4] Waiting 5s for PostgreSQL to be ready...
timeout /t 5 /nobreak

echo [4/4] Starting Vite frontend...
start "Sportfest Frontend" cmd /k "cd frontend && call npm install --silent && call npm run dev -- %*"

echo Starting Python backend on port 8080...
cd backend
pip install -r requirements.txt --quiet
python -m uvicorn main:app --reload --port 8080

cd ..

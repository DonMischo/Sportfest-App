@echo off
echo ============================================
echo  Sportfest - Dev Mode
echo ============================================
echo  Terminal 1 (this): Python backend
echo  Will open:         Electron window
echo.
echo  In a SECOND terminal run:
echo    cd frontend ^&^& npm run dev
echo ============================================
echo.

start "Sportfest Frontend" cmd /k "cd frontend && npm install -s && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting backend on port 8080...
cd backend
pip install -r requirements.txt -q
python -m uvicorn main:app --reload --port 8080

:: Electron opens automatically once uvicorn is up.
:: To get the Electron window, open a third terminal and run:
::   npm run electron:dev

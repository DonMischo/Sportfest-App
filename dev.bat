@echo off
echo Starting Sportfest dev servers...
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.

start "Sportfest Backend" cmd /k "cd backend && pip install -r requirements.txt -q && python -m uvicorn main:app --reload --port 8080"
timeout /t 2 /nobreak >nul
start "Sportfest Frontend" cmd /k "cd frontend && npm install -s && npm run dev"

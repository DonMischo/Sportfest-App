@echo off
setlocal EnableDelayedExpansion

echo ============================================
echo  Sportfest App - Windows Build
echo ============================================

:: Check Node
where node >nul 2>&1 || (echo [ERROR] Node.js not found. Install from https://nodejs.org && exit /b 1)
:: Check Python
where python >nul 2>&1 || (echo [ERROR] Python not found. Install from https://python.org && exit /b 1)

echo.
echo [1/5] Installing Python dependencies...
pip install -r backend\requirements.txt --quiet || exit /b 1
pip install pyinstaller --quiet || exit /b 1
set PATH=%PATH%;%APPDATA%\Python\Python314\Scripts

echo [2/5] Installing Node dependencies...
cd frontend
call npm install --silent || exit /b 1

echo [3/5] Building React frontend...
call npm run build || exit /b 1
cd ..

echo [4/5] Copying frontend build into backend\static...
if exist backend\static rmdir /s /q backend\static
xcopy /e /i /q frontend\dist backend\static || exit /b 1

echo [5/5] Bundling with PyInstaller...
pyinstaller ^
  --onefile ^
  --name Sportfest ^
  --distpath dist ^
  --workpath build_tmp ^
  --specpath build_tmp ^
  --add-data "backend\static;static" ^
  --hidden-import uvicorn.logging ^
  --hidden-import uvicorn.loops ^
  --hidden-import uvicorn.loops.auto ^
  --hidden-import uvicorn.protocols ^
  --hidden-import uvicorn.protocols.http ^
  --hidden-import uvicorn.protocols.http.auto ^
  --hidden-import uvicorn.protocols.websockets ^
  --hidden-import uvicorn.protocols.websockets.auto ^
  --hidden-import uvicorn.lifespan ^
  --hidden-import uvicorn.lifespan.on ^
  backend\main.py || exit /b 1

echo.
echo ============================================
echo  Build complete!  ->  dist\Sportfest.exe
echo ============================================
echo.
echo To run directly without building:
echo   cd backend
echo   uvicorn main:app --reload
echo   cd ..\frontend ^& npm run dev

@echo off
setlocal EnableDelayedExpansion

echo ============================================
echo  Sportfest App - Electron Build (Windows)
echo ============================================

where node   >nul 2>&1 || (echo [ERROR] Node.js not found & exit /b 1)
where python >nul 2>&1 || (echo [ERROR] Python not found  & exit /b 1)

echo.
echo [1/6] Installing Python dependencies...
pip install -r backend\requirements.txt --quiet || exit /b 1
pip install pyinstaller --quiet            || exit /b 1
pip install pillow --quiet                 || exit /b 1
set PATH=%PATH%;%APPDATA%\Python\Python314\Scripts

echo [2/6] Generating icon...
python assets\make_icon.py || exit /b 1

echo [3/6] Building React frontend...
cd frontend
call npm install --silent || exit /b 1
call npm run build        || exit /b 1
cd ..

echo [4/6] Copying frontend build into backend\static...
if exist backend\static rmdir /s /q backend\static
xcopy /e /i /q frontend\dist backend\static || exit /b 1

echo [5/6] Building Python backend (onedir)...
if exist api-dist rmdir /s /q api-dist
pyinstaller backend\sportfest.spec --distpath api-dist --workpath build_tmp --noconfirm || exit /b 1

echo [6/6] Packaging with electron-builder...
call npm install --silent || exit /b 1
call npm run dist:win     || exit /b 1

echo.
echo ============================================
echo  Build complete!  ->  dist\
echo ============================================

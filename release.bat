@echo off
setlocal EnableDelayedExpansion

:: ── Read current version ─────────────────────────────────────────────────────
set /p CURRENT_VERSION=<VERSION
set CURRENT_VERSION=%CURRENT_VERSION: =%

for /f "tokens=1,2,3 delims=." %%a in ("%CURRENT_VERSION%") do (
    set MAJOR=%%a
    set MINOR=%%b
    set PATCH=%%c
)

echo.
echo ============================================================
echo   Sportfest Release Script
echo   Current version: v%CURRENT_VERSION%
echo ============================================================
echo.
echo   [1] Patch  ^(bug fixes^)         v%MAJOR%.%MINOR%.%PATCH% → v%MAJOR%.%MINOR%.?
echo   [2] Minor  ^(new features^)      v%MAJOR%.%MINOR%.%PATCH% → v%MAJOR%.?.0
echo   [3] Major  ^(breaking changes^)  v%MAJOR%.%MINOR%.%PATCH% → v?.0.0
echo   [Q] Quit
echo.
set /p CHOICE="Choose bump type [1/2/3/Q]: "

if /i "%CHOICE%"=="Q" exit /b 0
if "%CHOICE%"=="1" goto bump_patch
if "%CHOICE%"=="2" goto bump_minor
if "%CHOICE%"=="3" goto bump_major
echo Invalid choice. & exit /b 1

:bump_patch
set /a PATCH=%PATCH%+1
goto set_version

:bump_minor
set /a MINOR=%MINOR%+1
set PATCH=0
goto set_version

:bump_major
set /a MAJOR=%MAJOR%+1
set MINOR=0
set PATCH=0
goto set_version

:set_version
set NEW_VERSION=%MAJOR%.%MINOR%.%PATCH%
echo.
echo  New version: v%NEW_VERSION%
echo.
set /p CONFIRM="Continue? [Y/N]: "
if /i not "%CONFIRM%"=="Y" exit /b 0

:: ── Optional commit message ──────────────────────────────────────────────────
set /p MSG="Commit message (leave blank for default): "
if "%MSG%"=="" set MSG=Release v%NEW_VERSION%

:: ── Check git status ─────────────────────────────────────────────────────────
echo.
echo [1/5] Checking git status...
git status --short
echo.

:: ── Build frontend ───────────────────────────────────────────────────────────
echo [2/5] Building frontend...
cd frontend
call npm run build --silent
if errorlevel 1 ( echo [ERROR] Frontend build failed & exit /b 1 )
cd ..

:: ── Write new version ────────────────────────────────────────────────────────
echo [3/5] Updating VERSION file...
echo %NEW_VERSION%> VERSION

:: Also bump version in frontend package.json via node
node -e "const fs=require('fs'),p=JSON.parse(fs.readFileSync('frontend/package.json'));p.version='%NEW_VERSION%';fs.writeFileSync('frontend/package.json',JSON.stringify(p,null,2)+'\n');" 2>nul

:: ── Git commit + tag ─────────────────────────────────────────────────────────
echo [4/5] Committing...
git add -A
git commit -m "%MSG%"
if errorlevel 1 ( echo [ERROR] Nothing to commit or git error & exit /b 1 )

git tag -a "v%NEW_VERSION%" -m "v%NEW_VERSION%"

:: ── Push ─────────────────────────────────────────────────────────────────────
echo [5/5] Pushing to remote...
git push origin main
git push origin --tags

echo.
echo ============================================================
echo   Released v%NEW_VERSION%  ✓
echo ============================================================
echo.

@echo off
setlocal EnableDelayedExpansion

:: ── Read current version from root package.json ──────────────────────────────
for /f "tokens=*" %%i in ('node -e "process.stdout.write(require('./package.json').version)"') do set CURRENT_VERSION=%%i

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
echo   [1] Patch  ^(bug fixes^)         → v%MAJOR%.%MINOR%.%PATCH%
echo   [2] Minor  ^(new features^)      → v%MAJOR%.??.0
echo   [3] Major  ^(breaking changes^)  → v??.0.0
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

set /p MSG="Commit message (leave blank for default): "
if "%MSG%"=="" set MSG=Release v%NEW_VERSION%

echo.
echo [1/4] Bumping version numbers...
node -e "const fs=require('fs'),p=JSON.parse(fs.readFileSync('package.json'));p.version='%NEW_VERSION%';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');"
node -e "const fs=require('fs'),p=JSON.parse(fs.readFileSync('frontend/package.json'));p.version='%NEW_VERSION%';fs.writeFileSync('frontend/package.json',JSON.stringify(p,null,2)+'\n');"
echo %NEW_VERSION%> VERSION

echo [2/4] Building frontend (for release validation)...
cd frontend
call npm run build --silent
if errorlevel 1 ( echo [ERROR] Build failed & exit /b 1 )
cd ..

echo [3/4] Committing...
git add -A
git commit -m "%MSG%"
if errorlevel 1 ( echo [ERROR] Nothing to commit & exit /b 1 )
git tag -a "v%NEW_VERSION%" -m "v%NEW_VERSION%"

echo [4/4] Pushing to GitHub...
git push origin main
git push origin --tags

echo.
echo ============================================================
echo   Released v%NEW_VERSION%  — GitHub Actions is now building the installer.
echo   Check: https://github.com/DonMischo/Sportfest-DLV/actions
echo ============================================================
echo.

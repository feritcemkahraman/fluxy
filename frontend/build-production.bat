@echo off
echo ========================================
echo Fluxy Production Build Script
echo ========================================
echo.

REM GitHub Token ayarla
set GH_TOKEN=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

echo [1/5] Production index.js kopyalaniyor...
copy /Y index.production.js index.js
echo ✓ index.js guncellendi
echo.

echo [2/5] React build yapiliyor...
call npm run build
if %errorlevel% neq 0 (
    echo ✗ Build hatasi!
    pause
    exit /b %errorlevel%
)
echo ✓ React build tamamlandi
echo.

echo [3/5] Electron build yapiliyor (Windows)...
call npm run dist:win -- --publish always
if %errorlevel% neq 0 (
    echo ✗ Electron build hatasi!
    pause
    exit /b %errorlevel%
)
echo ✓ Electron build tamamlandi
echo.

echo [4/5] Build dosyalari kontrol ediliyor...
dir dist\*.exe
echo.

echo [5/5] GitHub Release kontrol...
echo GitHub Releases: https://github.com/feritcemkahraman/fluxy/releases
echo.

echo ========================================
echo ✓ BUILD TAMAMLANDI!
echo ========================================
echo.
echo Dosyalar: frontend\dist\
echo GitHub: https://github.com/feritcemkahraman/fluxy/releases/latest
echo.
pause

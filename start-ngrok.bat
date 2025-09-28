@echo off
echo ===================================
echo    FLUXY NGROK BACKEND SETUP
echo ===================================
echo.

echo 1. Starting backend server...
start "Backend Server" cmd /k "cd /d %~dp0backend && npm run dev"

echo.
echo 2. Waiting for backend to start...
echo    Checking if backend is running on port 5000...

:check_backend
timeout /t 2 /nobreak > nul
netstat -an | find ":5000" > nul
if errorlevel 1 (
    echo    Backend not ready yet, waiting...
    goto check_backend
)

echo    Backend is running on port 5000!
echo.
echo 3. Checking ngrok installation...
echo    Testing ngrok command...
ngrok version
if errorlevel 1 (
    echo    HATA: ngrok bulunamadı veya çalışmıyor!
    echo    Lütfen ngrok'u indirin: https://ngrok.com/download
    echo    Ve PATH'e ekleyin veya bu klasöre koyun.
    pause
    exit /b 1
)

echo.
echo    Testing ngrok auth token...
ngrok config check
if errorlevel 1 (
    echo    UYARI: Ngrok auth token sorunu olabilir
    echo    Eğer hata alırsanız: ngrok config add-authtoken YOUR_TOKEN
)

echo    ngrok hazır!
echo.
echo 4. Starting ngrok tunnel...
echo    This will create a public URL for your backend
echo.

start "Ngrok Tunnel" cmd /k "cd /d %~dp0 && .\ngrok.exe http 5000 --log=stdout"

echo    Ngrok started in new window!
echo.
echo ===================================
echo Copy the ngrok URL from the Ngrok Tunnel window
echo and update:
echo - frontend/.env.production
echo - frontend/.env.local
echo Then deploy frontend to Netlify
echo ===================================
pause
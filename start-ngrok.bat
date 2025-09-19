@echo off
echo ===================================
echo    FLUXY NGROK BACKEND SETUP
echo ===================================
echo.

echo 1. Starting backend server...
start "Backend Server" cmd /k "cd /d %~dp0backend && npm run dev"

echo.
echo 2. Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo.
echo 3. Starting ngrok tunnel...
echo    This will create a public URL for your backend
echo.

ngrok http 3001

echo.
echo ===================================
echo Copy the ngrok URL and update:
echo - frontend/.env.production
echo - frontend/.env.local
echo Then deploy frontend to Netlify
echo ===================================
pause
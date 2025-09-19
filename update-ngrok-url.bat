@echo off
echo 🚀 Updating Ngrok URL for Fluxy Production Setup
echo.

REM Get ngrok URL from local API
for /f "tokens=*" %%i in ('curl -s http://localhost:4040/api/tunnels ^| findstr "https://"') do set NGROK_URL=%%i

REM Extract URL from JSON response
for /f "tokens=2 delims=:" %%a in ("%NGROK_URL%") do (
    for /f "tokens=1 delims=," %%b in ("%%a") do (
        set NGROK_URL=%%b
    )
)

REM Remove quotes
set NGROK_URL=%NGROK_URL:"=%

echo Found Ngrok URL: %NGROK_URL%
echo.

REM Update .env.production file
echo Updating frontend/.env.production...
(
echo # Production Environment Variables for Netlify Frontend + Ngrok Backend
echo.
echo # API Configuration - Auto-updated by update-ngrok-url.bat
echo REACT_APP_API_URL=%NGROK_URL%
echo REACT_APP_SOCKET_URL=%NGROK_URL%
echo.
echo # Build optimizations to fix Radix UI CSS issues
echo GENERATE_SOURCEMAP=false
echo DISABLE_CSS_OPTIMIZATION=true
echo CI=false
) > frontend\.env.production

echo ✅ .env.production updated
echo.

REM Update Netlify environment variables
echo Updating Netlify environment variables...
cd frontend
netlify env:set REACT_APP_API_URL %NGROK_URL%
netlify env:set REACT_APP_SOCKET_URL %NGROK_URL%
cd ..

echo ✅ Netlify environment variables updated
echo.

REM Trigger Netlify deploy
echo Triggering Netlify deploy...
netlify deploy --prod --dir=frontend\build

echo.
echo 🎉 All done! Frontend should be updated with new ngrok URL.
echo Make sure your backend is running on port 3001
pause
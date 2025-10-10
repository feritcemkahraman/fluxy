@echo off
echo ===================================
echo    FLUXY SERVEO BACKEND SETUP
echo ===================================
echo.

echo 1. Starting backend server...
start "Backend Server" cmd /k "cd /d %~dp0backend && npm start"

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
echo 3. Starting Serveo tunnel...
echo    This will create a public URL for your backend
echo.

REM Start Serveo in a new PowerShell window
start "Serveo Tunnel" powershell -NoExit -Command "cd '%~dp0'; ssh -R 1170e9012b0d93da0ab2f4f15418a5be:80:localhost:5000 serveo.net"

echo    Serveo started in new window!
echo.
echo ===================================
echo [IMPORTANT] Serveo URL:
echo Current URL: https://1170e9012b0d93da0ab2f4f15418a5be.serveo.net
echo.
echo This URL is already configured in:
echo   1. backend/.env (BACKEND_URL)
echo   2. netlify.toml (REACT_APP_API_URL, REACT_APP_SOCKET_URL)
echo.
echo Backend and frontend should work together now!
echo ===================================
pause
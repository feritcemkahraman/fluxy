param(
    [string]$NgrokUrl = ""
)

Write-Host "🚀 Updating Ngrok URL for Fluxy Production Setup" -ForegroundColor Green
Write-Host ""

# If no URL provided, try to get from ngrok local API
if (-not $NgrokUrl) {
    try {
        $tunnels = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction Stop
        $httpsTunnel = $tunnels.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
        if ($httpsTunnel) {
            $NgrokUrl = $httpsTunnel.public_url
            Write-Host "Found Ngrok URL from local API: $NgrokUrl" -ForegroundColor Yellow
        } else {
            Write-Host "❌ No HTTPS tunnel found. Make sure ngrok is running with 'ngrok http 3001'" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ Could not connect to ngrok local API. Make sure ngrok is running." -ForegroundColor Red
        Write-Host "Alternatively, provide the URL as parameter: .\update-ngrok-url.ps1 -NgrokUrl 'https://your-url.ngrok.io'" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "Using provided Ngrok URL: $NgrokUrl" -ForegroundColor Yellow
}

Write-Host ""

# Update .env.production file
Write-Host "Updating frontend/.env.production..." -ForegroundColor Cyan
$envContent = @"
# Production Environment Variables for Netlify Frontend + Ngrok Backend

# API Configuration - Auto-updated by update-ngrok-url.ps1
REACT_APP_API_URL=$NgrokUrl
REACT_APP_SOCKET_URL=$NgrokUrl

# Build optimizations to fix Radix UI CSS issues
GENERATE_SOURCEMAP=false
DISABLE_CSS_OPTIMIZATION=true
CI=false
"@

$envContent | Out-File -FilePath "frontend\.env.production" -Encoding UTF8 -Force
Write-Host "✅ .env.production updated" -ForegroundColor Green

# Update Netlify environment variables
Write-Host "Updating Netlify environment variables..." -ForegroundColor Cyan
try {
    Push-Location "frontend"
    & netlify env:set REACT_APP_API_URL $NgrokUrl
    & netlify env:set REACT_APP_SOCKET_URL $NgrokUrl
    Pop-Location
    Write-Host "✅ Netlify environment variables updated" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to update Netlify env vars. Make sure you're logged in with 'netlify login'" -ForegroundColor Red
}

# Trigger Netlify deploy
Write-Host "Triggering Netlify deploy..." -ForegroundColor Cyan
try {
    Push-Location "frontend"
    & netlify deploy --prod --dir=build
    Pop-Location
    Write-Host "✅ Netlify deploy triggered" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to trigger deploy. You may need to build first with 'npm run build'" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 All done! Frontend should be updated with new ngrok URL." -ForegroundColor Green
Write-Host "Make sure your backend is running on port 3001" -ForegroundColor Yellow
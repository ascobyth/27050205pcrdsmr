# PowerShell script to restart Next.js development server with cache clearing

Write-Host "Stopping any running Next.js processes..." -ForegroundColor Yellow

# Kill any running Next.js processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*next*" } | Stop-Process -Force

Write-Host "Clearing Next.js cache..." -ForegroundColor Yellow

# Remove .next directory to clear build cache
if (Test-Path ".\.next") {
    Remove-Item ".\.next" -Recurse -Force
    Write-Host ".next directory cleared" -ForegroundColor Green
}

# Clear npm cache (optional)
Write-Host "Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force

Write-Host "Starting development server..." -ForegroundColor Green

# Start the development server
npm run dev

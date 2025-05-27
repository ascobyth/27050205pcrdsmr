@echo off
echo Stopping any running Next.js processes...

REM Kill any running node processes (be careful with this)
taskkill /F /IM node.exe /T 2>nul

echo Clearing Next.js cache...

REM Remove .next directory to clear build cache
if exist ".next" (
    rmdir /S /Q ".next"
    echo .next directory cleared
)

echo Clearing npm cache...
npm cache clean --force

echo Starting development server...
npm run dev

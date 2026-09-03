@echo off
title PDD Platform - Public Online Deployment
echo ========================================================
echo      PDD QUIZ PLATFORM - PUBLIC ONLINE DEPLOYMENT
echo ========================================================
echo.
echo 1. Starting local server on port 3000...
start "PDD Server" /B node server.js
timeout /t 2 /nobreak >nul

echo.
echo 2. Launching Cloudflare Public HTTPS Tunnel...
echo Look for the 'https://xxxx.trycloudflare.com' link below!
echo Share that link with anyone in the world to let them use the platform!
echo.
.\cloudflared.exe tunnel --url http://localhost:3000
pause

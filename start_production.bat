@echo off
title PDD Quiz Platform Production Server
echo ========================================================
echo         PDD QUIZ PLATFORM PRODUCTION SERVER
echo ========================================================
echo.
echo Starting Node.js server on port 3000...
echo Open your browser at: http://localhost:3000
echo Admin password: ADMIN_PASSWORD in .env
echo.
node --env-file-if-exists=.env server.js
pause

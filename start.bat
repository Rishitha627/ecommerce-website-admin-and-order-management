@echo off
title TechMart Application Launcher
echo ===================================================
echo   Starting TechMart Admin and Order Management
echo ===================================================
echo.
echo Launching Unified Server on http://localhost:5000 ...
start "TechMart Application" cmd /k "cd /d %~dp0backend && npm start"

ping 127.0.0.1 -n 3 >nul
echo Opening TechMart Application in your browser...
start http://localhost:5000

echo.
echo ✅ Application Started Successfully!
echo Unified Website Link: http://localhost:5000
echo Admin Username: rishi
echo Admin Password: rishi627

@echo off
title Tradis Desktop (Cordis Runtime)
cd /d "%~dp0"
echo ======================================================
echo  TRADIS DESKTOP PLATFORM (CORDIS RUNTIME)
echo  Starting 24/7/365 Local Runtime...
echo ======================================================
if exist "gui\server.js" (
    node gui\server.js
) else (
    start "" "gui\index.html"
)

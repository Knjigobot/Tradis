@echo off
title TRADIS - Cordis Spatiotemporal Commodities Trading Engine (OxCaml)
chcp 65001 > nul
cls
echo ===============================================================================
echo   STARTING TRADIS CORDIS-OXCAML HIGH-AVAILABILITY COMMODITIES ENGINE
echo ===============================================================================
echo.
cd /d "%~dp0"
python runner.py
if %errorlevel% neq 0 (
    echo.
    echo Engine stopped. Press any key to exit...
    pause > nul
)
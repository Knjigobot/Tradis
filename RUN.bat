@echo off
title TRADIS - Cordis Spatiotemporal Commodities Engine
chcp 65001 > nul
cd /d "%~dp0"
start "" python runner.py
exit
@echo off
chcp 65001 >nul
title OmniPay Zero-Trust — Mode Demo Frontend (1-Clic)
cd /d "%~dp0"

echo ============================================================================
echo   OMNIPAY ZERO-TRUST — LANCEMENT PORTAIL WEB REACT 18 (MODE DEMO :3000)
echo ============================================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\soutenance.ps1" -Action frontend -OpenBrowser
set "ERR=%ERRORLEVEL%"

echo.
pause
exit /b %ERR%

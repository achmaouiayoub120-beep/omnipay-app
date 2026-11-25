@echo off
chcp 65001 >nul
title OmniPay Zero-Trust — Arret des Serveurs
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\soutenance.ps1" -Action stop
echo.
pause

@echo off
chcp 65001 >nul
title OmniPay Zero-Trust — Lancement Soutenance (1-Clic)
cd /d "%~dp0"

echo ============================================================================
echo   OMNIPAY ZERO-TRUST — DEMARRAGE AUTOMATIQUE DE TOUS LES SERVEURS
echo ============================================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\soutenance.ps1" -Action start -OpenBrowser
set "ERR=%ERRORLEVEL%"

echo.
if not "%ERR%"=="0" (
    echo [ATTENTION] Le demarrage complet a rencontre une erreur ^(code %ERR%^).
    echo Astuce : Pour lancer uniquement le portail UI sans Docker, double-cliquez sur Lancer-Demo-Frontend.bat
) else (
    echo [OK] Tous les serveurs OmniPay sont actifs.
)
echo.
pause
exit /b %ERR%

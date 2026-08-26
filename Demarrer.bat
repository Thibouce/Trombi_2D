@echo off
title Trombi 2D
cd /d "%~dp0"

where node >nul 2>nul || ( echo [X] Node.js manquant. Lance d'abord "Installer.bat". & pause & exit /b 1 )
if not exist "dist"  ( echo [X] Application non construite. Lance d'abord "Installer.bat". & pause & exit /b 1 )
if not exist ".env"  ( echo [X] Cle API manquante. Lance d'abord "Installer.bat". & pause & exit /b 1 )

echo ============================================
echo    Trombi 2D  -  Demarrage
echo ============================================
echo.
echo  Le navigateur va s'ouvrir sur http://localhost:5173
echo  GARDE CETTE FENETRE OUVERTE pendant l'utilisation.
echo  Ferme-la (ou Ctrl+C) pour arreter le programme.
echo.

set OPEN_BROWSER=1
node --env-file=.env server.js

echo.
echo Serveur arrete.
pause

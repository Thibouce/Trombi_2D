@echo off
title Trombi 2D - Reconstruire
cd /d "%~dp0"

echo ============================================
echo    Trombi 2D  -  Reconstruction
echo ============================================
echo.
echo  A lancer apres avoir modifie la configuration
echo  (styles, points, prompts, images).
echo.

call npm run build
if errorlevel 1 (
  echo.
  echo [X] Erreur : une modification a casse le fichier de config.
  echo     Verifie les virgules, les guillemets et les accolades.
  pause
  exit /b 1
)

echo.
echo ============================================
echo    Termine ! Relance "Demarrer.bat" pour
echo    voir tes changements.
echo ============================================
pause

@echo off
setlocal enabledelayedexpansion
title Trombi 2D - Installation
cd /d "%~dp0"

echo ============================================
echo    Trombi 2D  -  Installation
echo ============================================
echo.

REM --- Verifie la presence de Node.js -------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js n'est pas installe.
  echo     Ouverture de la page de telechargement...
  start "" https://nodejs.org/en/download
  echo.
  echo     Installe la version "LTS", puis relance ce fichier.
  echo.
  pause
  exit /b 1
)

REM --- Dependances --------------------------------------------------
echo [1/3] Installation des dependances (peut prendre 1 a 2 minutes)...
call npm install
if errorlevel 1 ( echo. & echo [X] Echec de l'installation des dependances. & pause & exit /b 1 )

REM --- Build --------------------------------------------------------
echo.
echo [2/3] Construction de l'application...
call npm run build
if errorlevel 1 ( echo. & echo [X] Echec de la construction. & pause & exit /b 1 )

REM --- Cle API ------------------------------------------------------
echo.
echo [3/3] Cle API fal.ai
if exist ".env" (
  echo     Un fichier .env existe deja - cle conservee.
  echo     Pour la changer : supprime .env puis relance cet installateur.
) else (
  echo     Recupere ta cle sur https://fal.ai/dashboard/keys
  set /p "FALKEY=    Colle ta cle puis appuie sur Entree : "
  > .env echo FAL_KEY=!FALKEY!
  >> .env echo FAL_MODEL=openai/gpt-image-2/edit
  >> .env echo FAL_IMAGE_SIZE=3840x1920
  echo     Fichier .env cree.
)

echo.
echo ============================================
echo    Installation terminee !
echo    Double-clique sur "Demarrer.bat" pour lancer.
echo ============================================
echo.
pause

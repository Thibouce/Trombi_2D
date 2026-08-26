@echo off
setlocal enabledelayedexpansion
title Trombi 2D - Telechargement et installation
cd /d "%~dp0"

REM ====== Parametres (a ajuster si besoin) ==========================
set OWNER=Thibouce
set REPO=Trombi_2D
set BRANCH=claude/immersive-photo-experience-360-pobwck
set TAG=v1
set CODE_URL=https://github.com/%OWNER%/%REPO%/archive/refs/heads/%BRANCH%.zip
set SPLAT_URL=https://github.com/%OWNER%/%REPO%/releases/download/%TAG%/locaux.ply
set DEST=Trombi_2D
REM ==================================================================

echo ============================================
echo    Trombi 2D  -  Telechargement
echo ============================================
echo.

REM --- 1) Code -------------------------------------------------------
echo [1/4] Telechargement du code...
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri '%CODE_URL%' -OutFile 'code.zip' -UseBasicParsing } catch { exit 1 }"
if errorlevel 1 ( echo [X] Echec du telechargement du code. & pause & exit /b 1 )

echo [2/4] Extraction du code...
if exist "%DEST%" rmdir /s /q "%DEST%"
powershell -NoProfile -Command "Expand-Archive -Force 'code.zip' '.'"
del code.zip >nul 2>nul
set "EXTRACTED="
for /d %%D in ("%REPO%-*") do set "EXTRACTED=%%D"
if not defined EXTRACTED ( echo [X] Dossier extrait introuvable. & pause & exit /b 1 )
move "!EXTRACTED!" "%DEST%" >nul

REM --- 2) Splat (~1 Go) ---------------------------------------------
echo [3/4] Telechargement du splat 3D (~1 Go, cela peut etre long)...
powershell -NoProfile -Command "try { Import-Module BitsTransfer -ErrorAction Stop; Start-BitsTransfer -Source '%SPLAT_URL%' -Destination '%DEST%\public\splats\locaux.ply' } catch { Invoke-WebRequest -Uri '%SPLAT_URL%' -OutFile '%DEST%\public\splats\locaux.ply' -UseBasicParsing }"
if not exist "%DEST%\public\splats\locaux.ply" (
  echo [!] Splat non telecharge - le hub 3D sera indisponible, le reste fonctionne.
)

REM --- 3) Installation ---------------------------------------------
echo [4/4] Installation (dependances, build, cle API)...
cd "%DEST%"
call Installer.bat

echo.
echo ============================================
echo   Termine. Pour relancer plus tard :
echo   ouvre le dossier "%DEST%" et double-clique "Demarrer.bat".
echo ============================================
pause

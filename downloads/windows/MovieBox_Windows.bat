@echo off
title MovieBox Cinema PC - Official Ultra HD Player
setlocal enabledelayedexpansion

echo ===================================================
echo     MOVIEBOX CINEMA PRO - DESKTOP PC APPLICATION
echo ===================================================
echo Launching standalone cinema experience...

set APP_URL=https://mbox-cinema-9182a.web.app
set FLAGS=--app=%APP_URL% --window-size=1280,720 --start-maximized --disable-features=Translate,OptimizationHints --enable-gpu-rasterization --high-dpi-support=1

REM Check Microsoft Edge (installed on 100% of modern Windows 10/11)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" %FLAGS%
    exit /b
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" %FLAGS%
    exit /b
)

REM Check Google Chrome
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" %FLAGS%
    exit /b
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" %FLAGS%
    exit /b
)

REM Fallback default browser
start "" "%APP_URL%"

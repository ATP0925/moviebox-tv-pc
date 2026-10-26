@echo off
title MovieBoxTV PC - Standalone Desktop App
color 0A
cls
echo ============================================================
echo   MovieBoxTV PC - Standalone Desktop Cinema Application
echo ============================================================
echo.

set APP_DIR=%~dp0app
cd /d "%APP_DIR%"

:: Check if server is already running on port 4567
powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort 4567 -State Listen -ErrorAction SilentlyContinue) | Measure-Object | Select-Object -ExpandProperty Count" > "%TEMP%\mb_port.tmp" 2>nul
set /p PORT_ACTIVE=<"%TEMP%\mb_port.tmp"
del /f /q "%TEMP%\mb_port.tmp" >nul 2>&1

if "%PORT_ACTIVE%"=="0" (
    echo [*] Starting MovieBoxTV Gateway Server...
    start /b node server.js
    ping -n 3 127.0.0.1 >nul
) else (
    echo [+] MovieBoxTV Gateway Server is already running.
)

echo [*] Launching Native Borderless Cinema App Window...

:: Prefer Microsoft Edge in dedicated borderless app mode
set EDGE_EXE="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not exist %EDGE_EXE% set EDGE_EXE="C:\Program Files\Microsoft\Edge\Application\msedge.exe"

if exist %EDGE_EXE% (
    start "" %EDGE_EXE% --app="http://localhost:4567" --window-size=1366,768
    goto done
)

:: Check Google Chrome in dedicated app mode
set CHROME_EXE="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_EXE% set CHROME_EXE="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_EXE% set CHROME_EXE="%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

if exist %CHROME_EXE% (
    start "" %CHROME_EXE% --app="http://localhost:4567" --window-size=1366,768
    goto done
)

:: Fallback to default browser
start http://localhost:4567

:done
echo.
echo ============================================================
echo   [SUCCESS] MovieBoxTV PC App is Active!
echo   Tip: Press F11 or F for Full Screen Cinema viewing.
echo ============================================================
ping -n 2 127.0.0.1 >nul
exit

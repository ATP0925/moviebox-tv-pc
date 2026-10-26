@echo off
title MovieBox ^& Gaming Center PC Dashboard
color 0B

set RUNTIME_DIR=C:\Users\atpad\CustomAndroidRuntime
set DASHBOARD_PY=%RUNTIME_DIR%\dashboard\server.py

:: Check if server is already responding on port 8765
powershell -NoProfile -Command "try { $client = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 8765); $client.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [*] Starting MovieBox Gaming Center Dashboard Server...
    start "" "C:\Program Files\Python314\pythonw.exe" "%DASHBOARD_PY%"
    ping -n 2 127.0.0.1 >nul
)

:: Launch Dashboard in sleek native App Mode
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="http://127.0.0.1:8765" --window-size=1280,840
    exit /b 0
)

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="http://127.0.0.1:8765" --window-size=1280,840
    exit /b 0
)

start http://127.0.0.1:8765
exit /b 0

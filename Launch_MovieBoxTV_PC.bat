@echo off
title MovieBoxTV - Personal PC Player
color 0B
cls
echo ============================================================
echo   MovieBoxTV - Personal Custom PC Runtime
echo   AMD Ryzen 7 + NVIDIA RTX 3050 GPU Accelerated
echo ============================================================
echo.

set ANDROID_HOME=C:\Users\atpad\CustomAndroidRuntime
set ANDROID_SDK_ROOT=C:\Users\atpad\CustomAndroidRuntime
set PATH=C:\Users\atpad\CustomAndroidRuntime\platform-tools;%PATH%

:: Terminate old controller instance to ensure latest updates are active
taskkill /F /IM pythonw.exe >nul 2>&1

:: Clean stale locks if any previous crash occurred
if exist "%USERPROFILE%\.android\avd\MovieBoxTV_PC.avd\multiinstance.lock" del /f /q "%USERPROFILE%\.android\avd\MovieBoxTV_PC.avd\multiinstance.lock" >nul 2>&1
if exist "%USERPROFILE%\.android\avd\MovieBoxTV_PC.avd\hardware-qemu.ini.lock" rmdir /s /q "%USERPROFILE%\.android\avd\MovieBoxTV_PC.avd\hardware-qemu.ini.lock" >nul 2>&1

:: Check if emulator runtime is already active
tasklist /FI "IMAGENAME eq qemu-system-x86_64.exe" 2>nul | findstr /i "qemu" >nul
if %ERRORLEVEL% EQU 0 (
    echo [+] MovieBoxTV Runtime is already running.
    goto launch_app
)

echo [*] Starting dedicated hardware-accelerated runtime...
start "" "C:\Users\atpad\CustomAndroidRuntime\emulator\emulator.exe" -avd MovieBoxTV_PC -accel on -gpu host -no-boot-anim -skin 1920x1080

echo [*] Connecting to device...
"C:\Users\atpad\CustomAndroidRuntime\platform-tools\adb.exe" wait-for-device

echo [*] Waiting for Android boot completion...
:wait_loop
"C:\Users\atpad\CustomAndroidRuntime\platform-tools\adb.exe" shell getprop sys.boot_completed 2>nul | findstr "1" >nul
if %ERRORLEVEL% NEQ 0 (
    ping -n 2 127.0.0.1 >nul
    goto wait_loop
)

:: Set optimal media volume
"C:\Users\atpad\CustomAndroidRuntime\platform-tools\adb.exe" shell media volume --stream 3 --set 15 >nul 2>&1

:launch_app
echo [*] Launching MovieBoxTV...
"C:\Users\atpad\CustomAndroidRuntime\platform-tools\adb.exe" shell monkey -p com.community.mbox.tv -c android.intent.category.LAUNCHER 1 >nul 2>&1

:: Restore and focus the emulator window
powershell -NoProfile -Command "(New-Object -ComObject WScript.Shell).AppActivate('Android Emulator')" >nul 2>&1

:: Start intelligent keyboard, mouse debouncer, smooth scroll & true fullscreen controller
echo [*] Starting intelligent keyboard, mouse debouncer ^& fullscreen controller...
start "" "C:\Program Files\Python314\pythonw.exe" "C:\Users\atpad\CustomAndroidRuntime\moviebox_controller.py"

echo.
echo ============================================================
echo   [SUCCESS] MovieBoxTV is now active!
echo ============================================================
echo   FULLSCREEN CONTROLS:
echo     - Auto-Fullscreen  : Automatically expands to 100%% screen
echo     - Fullscreen Toggle: F, F11, or Alt+Enter
echo.
echo   MOUSE CONTROLS:
echo     - Left Click       : Single Click (Double-click bug fixed!)
echo     - Right Click      : Instant Back button
echo     - Mouse Wheel      : Smooth Shelf Scrolling (Row-by-Row)
echo.
echo   KEYBOARD CONTROLS:
echo     - WASD / Arrows    : D-Pad Navigation
echo     - Space / Enter    : Select / Play-Pause / OK
echo     - Esc / Backspace  : Back / Close Menu
echo     - Q or P           : Video Quality Menu (480P / 720P / 1080P)
echo     - L                : Subtitles ^& Language Settings
echo     - [ and ]          : Previous / Next Episode
echo     - + / - / M        : Volume Up / Down / Mute
echo ============================================================
ping -n 3 127.0.0.1 >nul

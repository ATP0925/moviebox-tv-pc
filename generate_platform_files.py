import os
import shutil

ROOT_DIR = r"c:\Users\atpad\.gemini\antigravity-ide\scratch\moviebox-pc"
PUBLIC_DOWNLOADS = os.path.join(ROOT_DIR, "app", "public", "downloads")
ROOT_DOWNLOADS = os.path.join(ROOT_DIR, "downloads")

for base in [PUBLIC_DOWNLOADS, ROOT_DOWNLOADS]:
    os.makedirs(os.path.join(base, "windows"), exist_ok=True)
    os.makedirs(os.path.join(base, "android"), exist_ok=True)
    os.makedirs(os.path.join(base, "mac"), exist_ok=True)
    os.makedirs(os.path.join(base, "linux"), exist_ok=True)
    os.makedirs(os.path.join(base, "ios"), exist_ok=True)

# 1. WINDOWS APPLICATION FILES
win_launcher_bat = """@echo off
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
"""

win_setup_bat = """@echo off
title MovieBox Cinema - Desktop Installer
echo Installing MovieBox Cinema Desktop Shortcut...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'MovieBox Cinema.lnk')); $s.TargetPath = 'msedge.exe'; $s.Arguments = '--app=https://mbox-cinema-9182a.web.app --start-maximized'; $s.Description = 'MovieBox Cinema Ultra HD Streaming'; $s.Save()"

echo Done! A shortcut 'MovieBox Cinema' has been created on your Desktop.
timeout /t 3 >nul
exit /b
"""

# 2. MAC APPLICATION FILES
mac_command = """#!/usr/bin/env bash
# MovieBox Cinema Mac Launcher
APP_URL="https://mbox-cinema-9182a.web.app"

if [ -d "/Applications/Google Chrome.app" ]; then
    open -na "Google Chrome" --args --app="$APP_URL" --start-maximized
elif [ -d "/Applications/Microsoft Edge.app" ]; then
    open -na "Microsoft Edge" --args --app="$APP_URL" --start-maximized
elif [ -d "/Applications/Brave Browser.app" ]; then
    open -na "Brave Browser" --args --app="$APP_URL" --start-maximized
else
    open "$APP_URL"
fi
"""

# 3. LINUX APPLICATION FILES
linux_sh = """#!/usr/bin/env bash
# MovieBox Cinema Linux Launcher
APP_URL="https://mbox-cinema-9182a.web.app"
FLAGS="--app=$APP_URL --window-size=1280,720 --start-maximized"

if command -v google-chrome &> /dev/null; then
    google-chrome $FLAGS &
elif command -v chromium &> /dev/null; then
    chromium $FLAGS &
elif command -v microsoft-edge &> /dev/null; then
    microsoft-edge $FLAGS &
elif command -v xdg-open &> /dev/null; then
    xdg-open "$APP_URL" &
else
    echo "Please open $APP_URL in your web browser."
fi
"""

linux_desktop = """[Desktop Entry]
Version=1.0
Type=Application
Name=MovieBox Cinema
Comment=Watch 4K & 1080p Movies & TV Series
Exec=sh -c "google-chrome --app=https://mbox-cinema-9182a.web.app || chromium --app=https://mbox-cinema-9182a.web.app || xdg-open https://mbox-cinema-9182a.web.app"
Icon=video-display
Terminal=false
Categories=AudioVideo;Player;Network;
StartupWMClass=MovieBox
"""

# 4. IOS WEBCLIP MOBILECONFIG PROFILE
# Apple WebClip installs a standalone fullscreen web app on iPhone/iPad Home Screen without Safari address bar!
ios_mobileconfig = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>FullScreen</key>
            <true/>
            <key>Icon</key>
            <data>
            </data>
            <key>IsRemovable</key>
            <true/>
            <key>Label</key>
            <string>MovieBox Cinema</string>
            <key>PayloadDescription</key>
            <string>MovieBox Cinema Ultra HD Mobile App for iOS</string>
            <key>PayloadDisplayName</key>
            <string>MovieBox WebClip</string>
            <key>PayloadIdentifier</key>
            <string>com.moviebox.cinema.webclip</string>
            <key>PayloadType</key>
            <string>com.apple.webClip.managed</string>
            <key>PayloadUUID</key>
            <string>98D44A63-8FB9-411C-8A20-2E2458428511</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>Precomposed</key>
            <true/>
            <key>URL</key>
            <string>https://mbox-cinema-9182a.web.app</string>
        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>MovieBox Cinema</string>
    <key>PayloadIdentifier</key>
    <string>com.moviebox.cinema.profile</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>E7BD4C92-95E0-4D56-9BF6-302390F74128</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>
"""

# Write to all destinations
for base in [PUBLIC_DOWNLOADS, ROOT_DOWNLOADS]:
    # Windows
    with open(os.path.join(base, "windows", "MovieBox_Windows.bat"), "w", encoding="utf-8") as f:
        f.write(win_launcher_bat)
    with open(os.path.join(base, "windows", "Install_MovieBox_Shortcut.bat"), "w", encoding="utf-8") as f:
        f.write(win_setup_bat)
    # Mac
    with open(os.path.join(base, "mac", "MovieBox_Mac.command"), "w", encoding="utf-8") as f:
        f.write(mac_command)
    # Linux
    with open(os.path.join(base, "linux", "MovieBox_Linux.sh"), "w", encoding="utf-8") as f:
        f.write(linux_sh)
    with open(os.path.join(base, "linux", "moviebox.desktop"), "w", encoding="utf-8") as f:
        f.write(linux_desktop)
    # iOS
    with open(os.path.join(base, "ios", "MovieBox_iOS.mobileconfig"), "w", encoding="utf-8") as f:
        f.write(ios_mobileconfig)
    
    # Also ensure MovieBoxTV.apk is copied into android/ folder
    apk_src = os.path.join(ROOT_DIR, "downloads", "MovieBoxTV.apk")
    if os.path.exists(apk_src):
        shutil.copyfile(apk_src, os.path.join(base, "android", "MovieBoxTV.apk"))

print("✓ All cross-platform application files generated successfully in /downloads!")

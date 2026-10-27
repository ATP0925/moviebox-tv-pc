#!/usr/bin/env bash
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

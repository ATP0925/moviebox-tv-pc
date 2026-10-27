#!/usr/bin/env bash
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

@echo off
title MovieBox Cinema - Desktop Installer
echo Installing MovieBox Cinema Desktop Shortcut...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'MovieBox Cinema.lnk')); $s.TargetPath = 'msedge.exe'; $s.Arguments = '--app=https://mbox-cinema-9182a.web.app --start-maximized'; $s.Description = 'MovieBox Cinema Ultra HD Streaming'; $s.Save()"

echo Done! A shortcut 'MovieBox Cinema' has been created on your Desktop.
timeout /t 3 >nul
exit /b

$w = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "MovieBoxTV PC.lnk"
$s = $w.CreateShortcut($shortcutPath)
$s.TargetPath = "C:\Users\atpad\.gemini\antigravity-ide\scratch\moviebox-pc\Launch_MovieBoxTV_PC.bat"
$s.WorkingDirectory = "C:\Users\atpad\.gemini\antigravity-ide\scratch\moviebox-pc"
$s.Description = "MovieBoxTV PC Desktop App"
$s.Save()
Write-Host "Created shortcut at $shortcutPath"

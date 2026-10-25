import urllib.request

urls = [
    "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip",
    "https://dl.google.com/android/repository/commandlinetools-win-10406996_latest.zip",
    "https://dl.google.com/android/repository/commandlinetools-win-9477386_latest.zip",
    "https://dl.google.com/android/repository/platform-tools-latest-windows.zip"
]

for url in urls:
    try:
        req = urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            print(f"VALID: {url} (Size: {round(int(resp.headers.get('Content-Length', 0))/(1024*1024), 2)} MB)")
    except Exception as e:
        print(f"FAILED: {url} -> {e}")

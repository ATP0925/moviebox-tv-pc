import urllib.request

urls = [
    "https://aka.ms/download-jdk/microsoft-jdk-17.0.12-windows-x64.zip",
    "https://aka.ms/download-jdk/microsoft-jdk-17.0.11-windows-x64.zip",
    "https://aka.ms/download-jdk/microsoft-jdk-17.0.10-windows-x64.zip",
    "https://aka.ms/download-jdk/microsoft-jdk-17.0.9-windows-x64.zip"
]

for url in urls:
    try:
        req = urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            print(f"VALID: {url} -> {resp.url} (Size: {resp.headers.get('Content-Length')})")
            break
    except Exception as e:
        print(f"FAILED: {url} -> {e}")

import urllib.request
import json

url = "https://api.github.com/repos/adoptium/temurin17-binaries/releases/latest"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    for a in data.get('assets', []):
        print(a['name'])

import urllib.request
import json
import ssl
import time
import uuid

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

client_info = {
    "package_name": "com.community.mbox.tv",
    "version_name": "1.1.10.0901.03",
    "version_code": 50040016,
    "os": "android",
    "os_version": "14",
    "device_id": str(uuid.uuid4()),
    "brand": "Google",
    "model": "Android TV",
    "system_language": "en",
    "net": "WIFI",
    "region": "US",
    "timezone": "America/New_York",
    "sp_code": ""
}

headers = {
    "User-Agent": "okhttp/4.11.0",
    "X-Client-Info": json.dumps(client_info, separators=(',', ':')),
    "X-Client-Status": "0",
    "Accept": "application/json"
}

def fetch(url):
    print(f"Fetching: {url}")
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            data = resp.read().decode('utf-8')
            print(f"Status: {resp.status}")
            print(f"Response (first 500 chars): {data[:500]}")
            return json.loads(data)
    except urllib.error.HTTPError as e:
        print(f"HTTPError {e.code}: {e.read().decode('utf-8', errors='ignore')[:500]}")
    except Exception as e:
        print(f"Error: {e}")
    return None

print("=== 1. Testing Tab List ===")
tabs = fetch("https://api6.aoneroom.com/wefeed-tv-bff/tab/list")

if tabs:
    print(f"Tabs response code: {tabs.get('code')}")
    print(json.dumps(tabs, indent=2)[:800])

print("\n=== 2. Testing Home Operating ===")
home = fetch("https://api6.aoneroom.com/wefeed-tv-bff/home/operating?page=1&perPage=20")
if home:
    print(f"Home response code: {home.get('code')}")
    print(json.dumps(home, indent=2)[:800])

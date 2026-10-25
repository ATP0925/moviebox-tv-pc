import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

hosts = [
    "api.inmoviebox.com",
    "api6.aoneroom.com",
    "api5.aoneroom.com",
    "api4.aoneroom.com",
    "api3.aoneroom.com",
    "api4sg.aoneroom.com",
    "api6sg.aoneroom.com"
]

client_info = {
    "package_name": "com.community.mbox.tv",
    "version_name": "1.1.10.0901.03",
    "version_code": 50040016,
    "os": "android",
    "os_version": "14",
    "brand": "Google",
    "model": "Android TV",
    "system_language": "en",
    "region": "US"
}

headers = {
    "User-Agent": "okhttp/4.11.0",
    "X-Client-Info": json.dumps(client_info, separators=(',', ':')),
    "X-Client-Status": "0",
    "Accept": "application/json"
}

for host in hosts:
    url = f"https://{host}/wefeed-tv-bff/tab/list"
    print(f"\n--- Testing host: {host} ---")
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=5) as resp:
            data = resp.read().decode('utf-8')
            print(f"SUCCESS {resp.status}: {data[:300]}")
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='ignore')[:300]
        print(f"HTTP {e.code}: {body}")
    except Exception as e:
        print(f"Err: {e}")

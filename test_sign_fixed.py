import base64
import hashlib
import hmac
import json
import ssl
import time
import urllib.parse
import urllib.request
import uuid

SECRET = "76iRl07s0xSN9jqmEWAt79EBJZulIQIsV64FZr2O"

def format_query(query_str):
    if not query_str:
        return ""
    pairs = urllib.parse.parse_qsl(query_str, keep_blank_values=True)
    sorted_pairs = sorted(pairs, key=lambda x: x[0])
    return "&".join(f"{k}={v}" for k, v in sorted_pairs if k != "")

def generate_signature(method, url, body="", accept="", content_type="", content_length="", ts=None):
    parsed = urllib.parse.urlparse(url)
    timestamp = ts if ts is not None else int(time.time() * 1000)
    
    body_md5 = ""
    if body:
        if len(body) > 102400:
            body_md5 = hashlib.md5(body[:102400].encode('utf-8')).hexdigest()
        else:
            body_md5 = hashlib.md5(body.encode('utf-8')).hexdigest()
            
    path_with_query = parsed.path
    if parsed.query:
        formatted_q = format_query(parsed.query)
        if formatted_q:
            path_with_query += "?" + formatted_q
            
    sb = [
        method.upper(),
        accept,
        content_type,
        str(content_length) if content_length else "",
        str(timestamp),
        body_md5,
        path_with_query
    ]
    sign_str = "\n".join(sb)
    
    key_bytes = base64.b64decode(SECRET)
    mac = hmac.new(key_bytes, sign_str.encode('utf-8'), hashlib.md5)
    sig = base64.b64encode(mac.digest()).decode('utf-8')
    
    return f"{timestamp}|2|{sig}", sign_str

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

client_info = {
    "package_name": "com.community.mbox.tv",
    "version_name": "1.1.10.0901.03",
    "version_code": 50040016,
    "os": "android",
    "os_version": "14",
    "brand": "Google",
    "model": "Android TV",
    "system_language": "en",
    "country_iso_code": "US",
    "device_id": str(uuid.uuid4())
}

# Test cases
test_cases = [
    # 1. No accept header, url with ?host=tv.aoneroom.com
    {
        "url": "https://tv.aoneroom.com/wefeed-tv-bff/tab/list?host=tv.aoneroom.com",
        "accept": "",
        "send_accept": None,
    },
    # 2. No accept header, plain url
    {
        "url": "https://tv.aoneroom.com/wefeed-tv-bff/tab/list",
        "accept": "",
        "send_accept": None,
    },
    # 3. Accept application/json in both
    {
        "url": "https://tv.aoneroom.com/wefeed-tv-bff/tab/list?host=tv.aoneroom.com",
        "accept": "application/json",
        "send_accept": "application/json",
    },
    # 4. Accept */* in both
    {
        "url": "https://tv.aoneroom.com/wefeed-tv-bff/tab/list?host=tv.aoneroom.com",
        "accept": "*/*",
        "send_accept": "*/*",
    },
]

for idx, tc in enumerate(test_cases, 1):
    print(f"\n=== Test Case {idx}: {tc['url']} (accept='{tc['accept']}') ===")
    sig, sign_str = generate_signature("GET", tc["url"], accept=tc["accept"])
    print(f"Sign string:\n{repr(sign_str)}")
    print(f"Signature: {sig}")
    
    headers = {
        "User-Agent": "okhttp/4.11.0",
        "X-Client-Info": json.dumps(client_info, separators=(',', ':')),
        "X-Client-Status": "0",
        "x-tr-signature": sig,
    }
    if tc["send_accept"] is not None:
        headers["Accept"] = tc["send_accept"]
        
    req = urllib.request.Request(tc["url"], headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            print(f"SUCCESS! STATUS: {resp.status}")
            data = resp.read().decode('utf-8')
            print("Response:", data[:400])
            break
    except urllib.error.HTTPError as e:
        print(f"HTTPError {e.code}: {e.read().decode('utf-8', errors='ignore')}")
    except Exception as e:
        print("Error:", e)

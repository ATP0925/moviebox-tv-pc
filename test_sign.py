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
APP_ID = "4U01pxRu278GqCZKY9"

def format_query(query_str):
    if not query_str:
        return ""
    # parse and sort keys
    pairs = urllib.parse.parse_qsl(query_str, keep_blank_values=True)
    sorted_pairs = sorted(pairs, key=lambda x: x[0])
    return "&".join(f"{k}={v}" for k, v in sorted_pairs if k != "")

def generate_signature(method, url, body="", accept="", content_type="", content_length=""):
    parsed = urllib.parse.urlparse(url)
    timestamp = int(time.time() * 1000)
    
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
    print("Sign String:\n---\n" + sign_str + "\n---")
    
    key_bytes = base64.b64decode(SECRET)
    mac = hmac.new(key_bytes, sign_str.encode('utf-8'), hashlib.md5)
    sig = base64.b64encode(mac.digest()).decode('utf-8')
    
    return f"{timestamp}|2|{sig}"

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
    "region": "US",
    "device_id": str(uuid.uuid4())
}

url = "https://tv.aoneroom.com/wefeed-tv-bff/tab/list"
sig = generate_signature("GET", url)
print("Generated x-tr-signature:", sig)

headers = {
    "User-Agent": "okhttp/4.11.0",
    "X-Client-Info": json.dumps(client_info, separators=(',', ':')),
    "X-Client-Status": "0",
    "x-tr-signature": sig,
    "Accept": "application/json"
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
        print("SUCCESS! STATUS:", resp.status)
        data = resp.read().decode('utf-8')
        print("Response:", data[:1500])
except urllib.error.HTTPError as e:
    print(f"HTTPError {e.code}: {e.read().decode('utf-8', errors='ignore')}")
except Exception as e:
    print("Error:", e)

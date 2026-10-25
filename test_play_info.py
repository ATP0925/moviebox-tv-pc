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

def generate_client_token():
    ts = str(int(time.time() * 1000))
    reversed_ts = ts[::-1]
    token_hash = hashlib.md5(reversed_ts.encode('utf-8')).hexdigest()
    return f"{ts},{token_hash}"

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

device_id = str(uuid.uuid4()).replace("-", "")[:16]
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
    "device_id": device_id
}

def api_request(method, url, body=None, token=None):
    body_str = ""
    body_bytes = None
    ct = ""
    cl = ""
    if body is not None:
        body_str = json.dumps(body) if isinstance(body, dict) else str(body)
        body_bytes = body_str.encode('utf-8')
        ct = "application/json; charset=UTF-8"
        cl = str(len(body_bytes))
        
    sig, _ = generate_signature(method, url, body=body_str, content_type=ct, content_length=cl)
    
    headers = {
        "User-Agent": "okhttp/4.11.0",
        "X-Client-Info": json.dumps(client_info, separators=(',', ':')),
        "X-Client-Status": "0",
        "x-tr-signature": sig,
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    else:
        headers["X-Client-Token"] = generate_client_token()
        
    if ct:
        headers["Content-Type"] = ct
        
    req = urllib.request.Request(url, data=body_bytes, headers=headers, method=method)
    with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
        return json.loads(resp.read().decode('utf-8'))

login_resp = api_request("POST", "https://tv.aoneroom.com/wefeed-tv-bff/user/visitor-login?host=tv.aoneroom.com", body={})
token = login_resp["data"]["token"]

deadpool_id = "1354190728729084152"
print(f"1. Fetching Deadpool details (id={deadpool_id})...")
detail_url = f"https://tv.aoneroom.com/wefeed-tv-bff/subject/get?host=tv.aoneroom.com&subjectId={deadpool_id}"
detail_resp = api_request("GET", detail_url, token=token)
print("Detail info keys:", detail_resp.get("data", {}).keys())
print("Title:", detail_resp.get("data", {}).get("title"))
print("Desc:", detail_resp.get("data", {}).get("description")[:120])

print(f"\n2. Fetching Deadpool play-info...")
play_url = f"https://tv.aoneroom.com/wefeed-tv-bff/subject/play-info/v2?host=tv.aoneroom.com&subjectId={deadpool_id}&se=0&ep=0"
play_resp = api_request("GET", play_url, token=token)
print("Play info keys:", play_resp.get("data", {}).keys())
streams = play_resp.get("data", {}).get("streams", [])
print(f"Streams found: {len(streams)}")
for s in streams:
    print(f" - Quality: {s.get('resolution')} | Format: {s.get('format')} | URL: {s.get('url')[:80]}...")

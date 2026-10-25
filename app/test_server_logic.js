const crypto = require('crypto');
const https = require('https');

const SECRET = "76iRl07s0xSN9jqmEWAt79EBJZulIQIsV64FZr2O";

function formatQuery(queryStr) {
  if (!queryStr) return "";
  const params = new URLSearchParams(queryStr);
  const keys = Array.from(params.keys()).sort();
  return keys.map(k => `${k}=${params.get(k)}`).join('&');
}

function generateClientToken() {
  const ts = Date.now().toString();
  const reversedTs = ts.split('').reverse().join('');
  const hash = crypto.createHash('md5').update(reversedTs).digest('hex');
  return `${ts},${hash}`;
}

function generateSignature(method, urlStr, body = "", accept = "", contentType = "", contentLength = "", ts = null) {
  const parsed = new URL(urlStr);
  const timestamp = ts || Date.now();
  
  let bodyMd5 = "";
  if (body) {
    const chunk = body.length > 102400 ? body.slice(0, 102400) : body;
    bodyMd5 = crypto.createHash('md5').update(chunk, 'utf8').digest('hex');
  }

  let pathWithQuery = parsed.pathname;
  if (parsed.search && parsed.search.length > 1) {
    const formatted = formatQuery(parsed.search.slice(1));
    if (formatted) {
      pathWithQuery += '?' + formatted;
    }
  }

  const signStr = [
    method.toUpperCase(),
    accept,
    contentType,
    contentLength ? String(contentLength) : "",
    String(timestamp),
    bodyMd5,
    pathWithQuery
  ].join('\n');

  const keyBytes = Buffer.from(SECRET, 'base64');
  const mac = crypto.createHmac('md5', keyBytes).update(signStr, 'utf8').digest('base64');
  return `${timestamp}|2|${mac}`;
}

const clientInfo = {
  package_name: "com.community.mbox.tv",
  version_name: "1.1.10.0901.03",
  version_code: 50040016,
  os: "android",
  os_version: "14",
  brand: "Google",
  model: "Android TV",
  system_language: "en",
  country_iso_code: "US",
  device_id: "pc_app_" + crypto.randomBytes(8).toString('hex')
};

function httpsRequest(method, urlStr, body = null, token = null) {
  return new Promise((resolve, reject) => {
    let bodyStr = "";
    let bodyBuffer = null;
    let ct = "";
    let cl = "";

    if (body !== null) {
      bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      bodyBuffer = Buffer.from(bodyStr, 'utf8');
      ct = "application/json; charset=UTF-8";
      cl = String(bodyBuffer.length);
    }

    const sig = generateSignature(method, urlStr, bodyStr, "", ct, cl);
    const parsed = new URL(urlStr);

    const headers = {
      "User-Agent": "okhttp/4.11.0",
      "X-Client-Info": JSON.stringify(clientInfo),
      "X-Client-Status": "0",
      "x-tr-signature": sig,
      "Host": parsed.hostname
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      headers["X-Client-Token"] = generateClientToken();
    }

    if (ct) {
      headers["Content-Type"] = ct;
      headers["Content-Length"] = cl;
    }

    const options = {
      method: method.toUpperCase(),
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      headers,
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (bodyBuffer) {
      req.write(bodyBuffer);
    }
    req.end();
  });
}

async function run() {
  console.log("1. Testing Node.js Visitor Login...");
  const loginRes = await httpsRequest("POST", "https://tv.aoneroom.com/wefeed-tv-bff/user/visitor-login?host=tv.aoneroom.com", {});
  console.log("Login Success! Status:", loginRes.status, "Token:", loginRes.data.data.token.slice(0, 30) + "...");

  const token = loginRes.data.data.token;
  console.log("\n2. Testing Node.js Tabs Fetch...");
  const tabsRes = await httpsRequest("GET", "https://tv.aoneroom.com/wefeed-tv-bff/tab/list?host=tv.aoneroom.com", null, token);
  console.log("Tabs Count:", tabsRes.data.data.tabs.length);
  for (const t of tabsRes.data.data.tabs) {
    console.log(` - Tab: [${t.tabId}] ${t.name}`);
  }
}

run().catch(err => console.error("Error:", err));

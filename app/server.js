const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const https = require('https');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4567;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MovieBoxTV Gateway Signing Config
const SECRET = "76iRl07s0xSN9jqmEWAt79EBJZulIQIsV64FZr2O";
const BASE_HOST = "https://tv.aoneroom.com";

let cachedToken = null;
let tokenExpiresAt = 0;
let cachedUid = null;

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

// Token session manager
async function getAuthToken(forceRefresh = false) {
  if (!forceRefresh && cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  console.log("[Auth] Obtaining new visitor JWT token from tv.aoneroom.com...");
  const loginUrl = `${BASE_HOST}/wefeed-tv-bff/user/visitor-login?host=tv.aoneroom.com`;
  const res = await httpsRequest("POST", loginUrl, {});

  if (res.status === 200 && res.data && res.data.code === 0 && res.data.data) {
    cachedToken = res.data.data.token;
    cachedUid = res.data.data.uid;
    // Set expiry to 4 hours from now
    tokenExpiresAt = Date.now() + 4 * 3600 * 1000;
    console.log(`[Auth] Visitor token successfully acquired (uid: ${cachedUid})`);
    return cachedToken;
  } else {
    throw new Error(`Failed to acquire visitor token: ${JSON.stringify(res)}`);
  }
}

// MovieBox API Proxy wrapper
async function callApi(method, path, queryParams = {}, body = null) {
  const token = await getAuthToken();
  const params = new URLSearchParams(queryParams);
  if (!params.has("host")) {
    params.set("host", "tv.aoneroom.com");
  }

  const url = `${BASE_HOST}${path}?${params.toString()}`;
  let res = await httpsRequest(method, url, body, token);

  // If token expired, refresh once and retry
  if (res.status === 401 || (res.data && res.data.code === 401)) {
    console.log("[Auth] 401 encountered, refreshing token and retrying...");
    const freshToken = await getAuthToken(true);
    res = await httpsRequest(method, url, body, freshToken);
  }

  return res.data;
}

// ======================== REST API ROUTES ========================

// 1. Get Categories / Tabs
app.get('/api/tabs', async (req, res) => {
  try {
    const data = await callApi("GET", "/wefeed-tv-bff/tab/list");
    res.json(data);
  } catch (err) {
    console.error("Error /api/tabs:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Get Home / Operating Feed
app.get('/api/home', async (req, res) => {
  try {
    const tabId = req.query.tabId || "HOME";
    const page = req.query.page || 1;
    const data = await callApi("GET", "/wefeed-tv-bff/home/operating", { tabId, page });
    res.json(data);
  } catch (err) {
    console.error("Error /api/home:", err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Search Movies & Shows
app.get('/api/search', async (req, res) => {
  try {
    const keyword = req.query.q || "";
    const page = req.query.page || 1;
    const size = req.query.size || 20;
    if (!keyword) {
      return res.json({ code: 0, data: { items: [] } });
    }
    const data = await callApi("GET", "/wefeed-tv-bff/search/result", { keyword, page, size });
    res.json(data);
  } catch (err) {
    console.error("Error /api/search:", err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Get Subject Details
app.get('/api/subject/:id', async (req, res) => {
  try {
    const subjectId = req.params.id;
    const data = await callApi("GET", "/wefeed-tv-bff/subject/get", { subjectId });
    res.json(data);
  } catch (err) {
    console.error("Error /api/subject:", err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Get Seasons and Episodes info
app.get('/api/season/:id', async (req, res) => {
  try {
    const subjectId = req.params.id;
    const data = await callApi("GET", "/wefeed-tv-bff/subject/season-info", { subjectId });
    res.json(data);
  } catch (err) {
    console.error("Error /api/season:", err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Get Play Info (Streaming URLs + Subtitles)
app.get('/api/play/:id', async (req, res) => {
  try {
    const subjectId = req.params.id;
    const se = req.query.se || 0;
    const ep = req.query.ep || 0;
    const vipLevel = "0";

    const playData = await callApi("GET", "/wefeed-tv-bff/subject/play-info/v2", { subjectId, se, ep, vipLevel });
    
    // Also fetch captions if available
    let captions = [];
    const streams = playData?.data?.streams || [];
    if (streams.length > 0 && streams[0].id) {
      try {
        const streamId = streams[0].id;
        const captionData = await callApi("GET", "/wefeed-tv-bff/subject/stream-captions", { subjectId, streamId });
        captions = captionData?.data?.captions || [];
      } catch (capErr) {
        console.warn("Could not fetch captions:", capErr.message);
      }
    }

    if (playData && playData.data) {
      playData.data.captions = captions;
    }

    res.json(playData);
  } catch (err) {
    console.error("Error /api/play:", err);
    res.status(500).json({ error: err.message });
  }
});

// 7. Get Recommended / Similar Titles
app.get('/api/recommend/:id', async (req, res) => {
  try {
    const subjectId = req.params.id;
    const page = req.query.page || "1";
    const perPage = req.query.perPage || 12;
    const data = await callApi("GET", "/wefeed-tv-bff/subject/detail-rec", { subjectId, page, perPage });
    res.json(data);
  } catch (err) {
    console.error("Error /api/recommend:", err);
    res.status(500).json({ error: err.message });
  }
});

// 8. Subtitle WebVTT Proxy (Converts SRT from CDN to WebVTT for native video player)
app.get('/api/subtitle', (req, res) => {
  const subtitleUrl = req.query.url;
  if (!subtitleUrl) {
    return res.status(400).send("Missing url query parameter");
  }

  https.get(subtitleUrl, { rejectUnauthorized: false }, (subRes) => {
    let body = '';
    subRes.on('data', chunk => { body += chunk; });
    subRes.on('end', () => {
      // Convert SRT to WebVTT
      let vtt = "WEBVTT\n\n";
      const normalized = body
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
      vtt += normalized;

      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(vtt);
    });
  }).on('error', (err) => {
    console.error("Subtitle proxy error:", err);
    res.status(500).send("Error fetching subtitle");
  });
});

// Health check
app.get('/api/status', (req, res) => {
  res.json({
    status: "ok",
    app: "MovieBoxTV PC Desktop App",
    authenticated: Boolean(cachedToken),
    uid: cachedUid
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`\n======================================================`);
  console.log(`🎬 MovieBoxTV Desktop PC Server is running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
  try {
    await getAuthToken();
    console.log("Ready for streaming! Open http://localhost:" + PORT + " in your browser or desktop app.\n");
  } catch (e) {
    console.error("Initial auth failed:", e.message);
  }
});

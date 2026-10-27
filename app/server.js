const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const https = require('https');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4567;

// Security & Privacy Hardening
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

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

// IMDb Cache to avoid duplicate network lookups
const imdbCache = new Map();

async function resolveImdbId(title, subjectType = 1) {
  if (!title) return null;
  const cleanTitle = title.replace(/\([^)]*\)/g, '').replace(/[^\w\s:-]/g, '').trim();
  const searchType = (subjectType === 2 || subjectType === '2' || subjectType === 'series' || subjectType === 'tv') ? 'series' : 'movie';
  const cacheKey = `${cleanTitle}_${searchType}`;
  if (imdbCache.has(cacheKey)) return imdbCache.get(cacheKey);

  try {
    const cinemetaUrl = `https://v3-cinemeta.strem.io/catalog/${searchType}/top/search=${encodeURIComponent(cleanTitle)}.json`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(cinemetaUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (resp.ok) {
      const json = await resp.json();
      if (json && json.metas && json.metas.length > 0) {
        const imdbId = json.metas[0].imdb_id;
        if (imdbId) {
          imdbCache.set(cacheKey, imdbId);
          return imdbId;
        }
      }
    }
  } catch (err) {
    console.warn("[IMDb Resolver] Lookup failed for", title, err.message);
  }
  return null;
}

// 6. Get Play Info (Streaming URLs + Subtitles + Multi-Server Auto-Failover + Hindi Audio)
app.get('/api/play/:id', async (req, res) => {
  try {
    const subjectId = req.params.id;
    const se = parseInt(req.query.se, 10) || 0;
    const ep = parseInt(req.query.ep, 10) || 0;
    const titleHint = req.query.title || "";
    const subjectType = parseInt(req.query.type, 10) || (se > 0 ? 2 : 1);
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

    // Resolve Movie/Series Title
    const title = playData?.data?.title || titleHint;
    const imdbId = await resolveImdbId(title, subjectType);

    const isSeries = subjectType === 2 || se > 0;
    const seasonNum = se || 1;
    const episodeNum = ep || 1;

    // Build HiStream-Style Multi-Server Cluster for Auto-Failover
    const servers = [];

    // Server 1: MovieBox Direct CDN (Primary Ultra-Fast Direct MP4 / DASH)
    servers.push({
      id: "server-moviebox",
      name: "Server 1: MovieBox Direct CDN",
      tag: "Official Ultra-Fast CDN",
      quality: "1080p / 720p / 480p",
      type: "direct",
      audioLanguages: ["Original Audio", "English"],
      isDefault: true,
      resources: playData?.data?.resources || [],
      streams: playData?.data?.streams || []
    });

    if (imdbId) {
      // Server 2: VidLink Ultra 4K (Hindi Dubbed + Multi-Audio)
      servers.push({
        id: "server-vidlink",
        name: "Server 2: VidLink Ultra 4K (Hindi / Multi-Audio)",
        tag: "4K UHD • Hindi Dubbed / Multi-Lang",
        quality: "4K UHD / 1080p",
        type: "embed",
        audioLanguages: ["Hindi", "English", "Multi-Audio"],
        url: isSeries
          ? `https://vidlink.pro/tv/${imdbId}/${seasonNum}/${episodeNum}?primaryColor=ff8800&autoplay=false`
          : `https://vidlink.pro/movie/${imdbId}?primaryColor=ff8800&autoplay=false`
      });

      // Server 3: VidSrc Multi-Mirror Pro (1080p Auto-Buffering)
      servers.push({
        id: "server-vidsrc",
        name: "Server 3: VidSrc Multi-Mirror Pro",
        tag: "1080p Full HD • Auto-Buffering",
        quality: "1080p",
        type: "embed",
        audioLanguages: ["English", "Multi-Audio"],
        url: isSeries
          ? `https://vidsrc.cc/v2/embed/tv/${imdbId}/${seasonNum}/${episodeNum}`
          : `https://vidsrc.cc/v2/embed/movie/${imdbId}`
      });

      // Server 4: AutoEmbed VIP (Hindi Dubbed & Regional)
      servers.push({
        id: "server-autoembed",
        name: "Server 4: AutoEmbed VIP (Hindi Audio)",
        tag: "1080p HD • Hindi Dubbed",
        quality: "1080p",
        type: "embed",
        audioLanguages: ["Hindi", "English", "Multi-Audio"],
        url: isSeries
          ? `https://player.autoembed.cc/embed/tv/${imdbId}/${seasonNum}/${episodeNum}`
          : `https://player.autoembed.cc/embed/movie/${imdbId}`
      });

      // Server 5: SuperEmbed Cloud Mirror
      servers.push({
        id: "server-superembed",
        name: "Server 5: SuperEmbed Cloud Mirror",
        tag: "Fast Global Mirror",
        quality: "1080p",
        type: "embed",
        audioLanguages: ["Multi-Audio", "English"],
        url: isSeries
          ? `https://multiembed.mov/?video_id=${imdbId}&tmdb=1&s=${seasonNum}&e=${episodeNum}`
          : `https://multiembed.mov/?video_id=${imdbId}&tmdb=1`
      });
    }

    if (playData && playData.data) {
      playData.data.imdbId = imdbId;
      playData.data.servers = servers;
      playData.data.audioLanguages = [
        { code: "hin", name: "Hindi (हिंदी)", icon: "🇮🇳" },
        { code: "eng", name: "English (Original)", icon: "🇺🇸" },
        { code: "multi", name: "Multi-Audio (Auto)", icon: "🌐" }
      ];
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

// 9. Video Stream Proxy (Bypasses CDN User-Agent/CORS blocks and supports HTTP 206 Range seeking)
function proxyVideoStream(targetUrl, req, res, redirectCount = 0) {
  if (redirectCount > 5) {
    return res.status(508).send("Too many redirects from CDN");
  }

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch (e) {
    return res.status(400).send("Invalid stream URL");
  }

  const forwardHeaders = {
    'User-Agent': 'okhttp/4.11.0',
    'Host': parsed.hostname,
    'Accept': '*/*',
    'Accept-Encoding': 'identity'
  };

  if (req.headers.range) {
    forwardHeaders['Range'] = req.headers.range;
  }

  const protocol = parsed.protocol === 'http:' ? require('http') : https;

  const cdnReq = protocol.request(targetUrl, {
    method: req.method === 'HEAD' ? 'HEAD' : 'GET',
    headers: forwardHeaders,
    rejectUnauthorized: false
  }, (cdnRes) => {
    // Handle HTTP Redirects
    if (cdnRes.statusCode >= 300 && cdnRes.statusCode < 400 && cdnRes.headers.location) {
      const nextUrl = new URL(cdnRes.headers.location, targetUrl).toString();
      return proxyVideoStream(nextUrl, req, res, redirectCount + 1);
    }

    res.status(cdnRes.statusCode);

    const contentType = cdnRes.headers['content-type'] || 'video/mp4';
    res.setHeader('Content-Type', contentType);

    if (cdnRes.headers['content-length']) {
      res.setHeader('Content-Length', cdnRes.headers['content-length']);
    }
    if (cdnRes.headers['content-range']) {
      res.setHeader('Content-Range', cdnRes.headers['content-range']);
    }

    res.setHeader('Accept-Ranges', cdnRes.headers['accept-ranges'] || 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    if (req.method === 'HEAD') {
      return res.end();
    }

    cdnRes.pipe(res);
  });

  cdnReq.on('error', (err) => {
    console.error("Stream proxy error:", err.message);
    if (!res.headersSent) {
      res.status(502).send("Stream proxy failed: " + err.message);
    }
  });

  req.on('close', () => {
    cdnReq.destroy();
  });

  cdnReq.end();
}

app.all('/api/stream', (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).send("Missing 'url' query parameter");
  }
  proxyVideoStream(videoUrl, req, res);
});

// Anonymous Health check
app.get('/api/status', (req, res) => {
  res.json({
    status: "ok",
    service: "MovieBoxTV Cinema Engine",
    authenticated: Boolean(cachedToken),
    version: "1.0.0"
  });
});

// Export app for serverless platforms (Vercel / Firebase Cloud Functions)
module.exports = app;

// Start standalone server when executed directly
if (require.main === module || !process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`\n======================================================`);
    console.log(`🎬 MovieBoxTV Cinema Engine is running!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`======================================================\n`);
    try {
      await getAuthToken();
      console.log("Ready for streaming! Open http://localhost:" + PORT + " in your browser.\n");
    } catch (e) {
      console.error("Initial auth failed:", e.message);
    }
  });
}

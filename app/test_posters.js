const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const appJs = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');

const engineMatch = appJs.match(/const EmbeddedEngine = \{([\s\S]*?)\n\};/);
const EmbeddedEngine = new Function('const EmbeddedEngine = {' + engineMatch[1] + '\n}; return EmbeddedEngine;')();

const optFnMatch = appJs.match(/function optimizePosterUrl[\s\S]*?\n\}/);
const optimizePosterUrl = new Function('return ' + optFnMatch[0])();

console.log('Testing', EmbeddedEngine.subjects.length, 'subjects in EmbeddedEngine...');

EmbeddedEngine.subjects.forEach((s, idx) => {
  const originalUrl = s.cover?.url || '';
  const optUrl = optimizePosterUrl(originalUrl, 340);
  
  if (!optUrl) {
    console.log(`[EMPTY] #${idx} ${s.title}`);
    return;
  }

  const client = optUrl.startsWith('https') ? https : http;
  client.get(optUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
    if (res.statusCode !== 200) {
      console.log(`[FAIL ${res.statusCode}] #${idx} ${s.title}: ${optUrl}`);
    } else {
      console.log(`[OK ${res.statusCode}] #${idx} ${s.title} (${res.headers['content-type']}, ${res.headers['content-length']} bytes)`);
    }
  }).on('error', e => {
    console.log(`[ERR] #${idx} ${s.title}: ${e.message}`);
  });
});

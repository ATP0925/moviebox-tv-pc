const https = require('https');
const http = require('http');

const candidates = [
  "https://www.w3schools.com/html/mov_bbb.mp4",
  "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4",
  "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
  "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_5MB.mp4",
  "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_2MB.mp4",
  "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-576p.mp4",
  "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-720p.mp4",
  "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-1080p.mp4",
  "https://media.w3.org/2010/05/sintel/trailer.mp4",
  "https://vjs.zencdn.net/v/oceans.mp4",
  "https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd"
];

candidates.forEach(url => {
  const client = url.startsWith('https') ? https : http;
  const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', Range: 'bytes=0-1024' } }, res => {
    console.log(`[STATUS ${res.statusCode}] ${url} -> ${res.headers['content-type']}, ${res.headers['content-range'] || res.headers['content-length']}`);
  });
  req.on('error', e => console.log(`[ERR] ${url}: ${e.message}`));
});

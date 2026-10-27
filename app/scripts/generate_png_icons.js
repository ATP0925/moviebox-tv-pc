// Generate valid standalone PNG icons for PWA compliance without external dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createSolidPng(width, height, r, g, b, a) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // color type 6: RGBA
  ihdrData.writeUInt8(0, 10); // compression method 0
  ihdrData.writeUInt8(0, 11); // filter method 0
  ihdrData.writeUInt8(0, 12); // interlace method 0

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data: filter byte (0) + width * 4 bytes per scanline
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.45;
  const innerRadius = width * 0.25;

  for (let y = 0; y < height; y++) {
    const scanlineOffset = y * scanlineLength;
    rawData[scanlineOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = scanlineOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Check if inside play triangle: approx coordinates
      const inTriangle = (x >= cx - innerRadius * 0.5) && 
                         (x <= cx + innerRadius * 0.7) && 
                         (Math.abs(y - cy) <= (x - (cx - innerRadius * 0.5)) * 0.75);

      if (inTriangle) {
        // Pure White Play Triangle
        rawData[pxOffset] = 255;
        rawData[pxOffset + 1] = 255;
        rawData[pxOffset + 2] = 255;
        rawData[pxOffset + 3] = 255;
      } else if (dist <= innerRadius) {
        // Netflix Crimson Red Play Circle
        rawData[pxOffset] = 229;
        rawData[pxOffset + 1] = 9;
        rawData[pxOffset + 2] = 20;
        rawData[pxOffset + 3] = 255;
      } else if (dist <= radius) {
        // Dark Obsidian Ring with border accent
        if (dist >= radius - 4) {
          rawData[pxOffset] = 229;
          rawData[pxOffset + 1] = 9;
          rawData[pxOffset + 2] = 20;
          rawData[pxOffset + 3] = 200;
        } else {
          rawData[pxOffset] = 18;
          rawData[pxOffset + 1] = 18;
          rawData[pxOffset + 2] = 24;
          rawData[pxOffset + 3] = 255;
        }
      } else {
        // Rounded App Corner or Base background
        const cornerDist = Math.max(Math.abs(dx), Math.abs(dy));
        if (cornerDist <= width * 0.48) {
          rawData[pxOffset] = 10;
          rawData[pxOffset + 1] = 10;
          rawData[pxOffset + 2] = 14;
          rawData[pxOffset + 3] = 255;
        } else {
          rawData[pxOffset] = 0;
          rawData[pxOffset + 1] = 0;
          rawData[pxOffset + 2] = 0;
          rawData[pxOffset + 3] = 0;
        }
      }
    }
  }

  const deflatedData = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', deflatedData);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(12 + length);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// CRC32 table & calculation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const outDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'icon-192.png'), createSolidPng(192, 192, 229, 9, 20, 255));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), createSolidPng(512, 512, 229, 9, 20, 255));
console.log('Successfully generated icon-192.png and icon-512.png!');

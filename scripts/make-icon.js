// Draws the Eye Break pixel icon and writes the PNG files. Zero dependencies.
//
//   node scripts/make-icon.js
//
// The art is a 32 x 32 pixel grid: an eye that looks up and to the right at the
// small guide dot, which is what the app does. Two renderings of the same art:
//
//   assets/icon/eyebreak-icon-512.png   full colour, 16x blocks. For the agent icon in
//                                       AIUI Studio (Build & Review tab); Studio does not
//                                       read it from the repository.
//   agent/assets/eye.png                monochrome green on transparent, 2x blocks (64 x 64),
//                                       shown in the Page's first screen.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

export const GRID = 32;

// Colour renderings use these; the monochrome rendering maps the same keys to greens.
export const PALETTE = {
  a: { color: [10, 36, 29], mono: null }, // background, upper band
  b: { color: [15, 49, 38], mono: null }, // background, middle band
  c: { color: [20, 64, 50], mono: null }, // background, lower band
  o: { color: [64, 255, 94], mono: [64, 255, 94] }, // eyelid outline
  w: { color: [246, 255, 248], mono: [16, 61, 26] }, // sclera
  s: { color: [196, 236, 210], mono: [10, 40, 17] }, // sclera in the lid's shadow
  g: { color: [64, 255, 94], mono: [64, 255, 94] }, // iris and guide dot
  d: { color: [29, 167, 58], mono: [29, 167, 58] }, // darker iris ring and dot glow
  k: { color: [4, 19, 10], mono: [0, 0, 0] }, // pupil
  h: { color: [255, 255, 255], mono: [191, 255, 204] } // highlights and sparkles
};

function inside(x, y, cx, cy, halfW, halfH, shrink) {
  const u = (x + 0.5 - cx) / halfW;
  if (u <= -1 || u >= 1) return false;
  const h = halfH * Math.pow(1 - u * u, 0.7) - shrink;
  return Math.abs(y + 0.5 - cy) <= h;
}

function disc(grid, cx, cy, r, key, clip) {
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r * r && (!clip || clip(x, y))) grid[y][x] = key;
    }
  }
}

// The icon as a 32 x 32 array of palette keys.
export function drawArt() {
  const grid = [];
  for (let y = 0; y < GRID; y += 1) {
    const row = [];
    for (let x = 0; x < GRID; x += 1) {
      // Three flat background bands, like a horizon.
      const key = y < 11 ? 'a' : y < 23 ? 'b' : 'c';
      row.push(key);
    }
    grid.push(row);
  }

  const cx = 15.5;
  const cy = 19.5;
  const halfW = 13.5;
  const halfH = 8.5;
  const lid = (x, y) => inside(x, y, cx, cy, halfW, halfH, 1.1);

  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      if (inside(x, y, cx, cy, halfW, halfH, 0)) {
        grid[y][x] = lid(x, y) ? 'w' : 'o';
      }
    }
  }
  // The upper lid casts a shadow on the sclera.
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      if (grid[y][x] === 'w' && !inside(x, y - 2, cx, cy, halfW, halfH, 1.1) && y + 0.5 < cy) grid[y][x] = 's';
    }
  }

  // Iris, pupil and highlight, looking up and to the right (towards the dot).
  disc(grid, 18.8, 18.8, 6.4, 'd', lid);
  disc(grid, 18.8, 18.8, 5.3, 'g', lid);
  disc(grid, 19.8, 17.8, 3.1, 'k', lid);
  disc(grid, 21.3, 16.3, 1.15, 'h', lid);

  // The guide dot, with a ring of glow and two sparkles.
  disc(grid, 26, 6.5, 4.2, 'd');
  disc(grid, 26, 6.5, 2.8, 'g');
  grid[5][25] = 'h';
  [[22, 3], [29, 10]].forEach((p) => {
    grid[p[1]][p[0]] = 'h';
    grid[p[1] - 1][p[0]] = 'g';
    grid[p[1] + 1][p[0]] = 'g';
    grid[p[1]][p[0] - 1] = 'g';
    grid[p[1]][p[0] + 1] = 'g';
  });
  return grid;
}

// ---- PNG writing ------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

// RGBA 8-bit PNG from rows of [r, g, b, a].
export function encodePng(width, height, pixel) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const base = y * (width * 4 + 1);
    raw[base] = 0; // filter: none
    for (let x = 0; x < width; x += 1) {
      const p = pixel(x, y);
      raw[base + 1 + x * 4] = p[0];
      raw[base + 2 + x * 4] = p[1];
      raw[base + 3 + x * 4] = p[2];
      raw[base + 4 + x * 4] = p[3];
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// Scales the art by an integer factor with hard edges (no smoothing).
export function renderPng(grid, scale, mode) {
  const size = GRID * scale;
  return encodePng(size, size, (x, y) => {
    const key = grid[Math.floor(y / scale)][Math.floor(x / scale)];
    const entry = PALETTE[key];
    if (mode === 'mono') return entry.mono ? [entry.mono[0], entry.mono[1], entry.mono[2], 255] : [0, 0, 0, 0];
    return [entry.color[0], entry.color[1], entry.color[2], 255];
  });
}

export const OUTPUTS = [
  { path: 'assets/icon/eyebreak-icon-512.png', scale: 16, mode: 'color' },
  { path: 'assets/icon/eyebreak-icon-128.png', scale: 4, mode: 'color' },
  { path: 'agent/assets/eye.png', scale: 2, mode: 'mono' }
];

export function buildIcons() {
  const grid = drawArt();
  return OUTPUTS.map((o) => ({ path: o.path, png: renderPng(grid, o.scale, o.mode) }));
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === join(process.argv[1]).replace(/\//g, '\\') ||
  (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]);
if (invokedDirectly) {
  buildIcons().forEach((file) => {
    const target = join(root, file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.png);
    console.log('wrote ' + file.path + ' (' + file.png.length + ' bytes)');
  });
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { GRID, OUTPUTS, PALETTE, buildIcons, drawArt, encodePng } from '../scripts/make-icon.js';

const ROOT = new URL('../', import.meta.url);

function readPng(buffer) {
  assert.deepEqual([...buffer.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'PNG signature');
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  assert.equal(buffer[24], 8, 'bit depth');
  assert.equal(buffer[25], 6, 'RGBA');
  // Collect the IDAT data and unfilter (filter type 0 only, which is what the encoder writes).
  let offset = 8;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') idat.push(buffer.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4 + 1;
  const pixel = (x, y) => {
    assert.equal(raw[y * stride], 0, 'filter byte');
    const i = y * stride + 1 + x * 4;
    return [raw[i], raw[i + 1], raw[i + 2], raw[i + 3]];
  };
  return { width, height, pixel };
}

test('the art is a 32 x 32 grid that uses only palette keys', () => {
  const grid = drawArt();
  assert.equal(grid.length, GRID);
  const used = new Set();
  grid.forEach((row) => {
    assert.equal(row.length, GRID);
    row.forEach((key) => {
      assert.ok(PALETTE[key], 'unknown key ' + key);
      used.add(key);
    });
  });
  Object.keys(PALETTE).forEach((key) => assert.ok(used.has(key), 'palette key never used: ' + key));
});

test('the eye is drawn: bright lid outline, a dark pupil and a guide dot in the upper right', () => {
  const grid = drawArt();
  const count = (key) => grid.flat().filter((k) => k === key).length;
  assert.ok(count('o') > 30, 'lid outline');
  assert.ok(count('k') >= 15, 'pupil');
  assert.ok(count('h') >= 5, 'highlights');
  // The guide dot sits in the upper right quadrant, away from the eye.
  let dotPixels = 0;
  for (let y = 0; y < 12; y += 1) for (let x = 20; x < GRID; x += 1) if (grid[y][x] === 'g') dotPixels += 1;
  assert.ok(dotPixels >= 15, 'guide dot ' + dotPixels);
});

test('every output is a valid PNG of the expected size with hard pixel blocks', () => {
  const icons = buildIcons();
  assert.deepEqual(icons.map((i) => i.path), OUTPUTS.map((o) => o.path));
  const grid = drawArt();
  icons.forEach((icon, n) => {
    const spec = OUTPUTS[n];
    const png = readPng(icon.png);
    assert.equal(png.width, GRID * spec.scale);
    assert.equal(png.height, GRID * spec.scale);
    // Every scale x scale block is a single colour, and equals the art's colour.
    for (let by = 0; by < GRID; by += 3) {
      for (let bx = 0; bx < GRID; bx += 3) {
        const entry = PALETTE[grid[by][bx]];
        const expected = spec.mode === 'mono'
          ? (entry.mono ? [...entry.mono, 255] : [0, 0, 0, 0])
          : [...entry.color, 255];
        for (const [dx, dy] of [[0, 0], [spec.scale - 1, spec.scale - 1], [spec.scale >> 1, spec.scale >> 1]]) {
          assert.deepEqual(png.pixel(bx * spec.scale + dx, by * spec.scale + dy), expected, spec.path + ' block ' + bx + ',' + by);
        }
      }
    }
  });
});

test('the colour icon is fully opaque; the in-Page icon is transparent where there is no art', () => {
  const [big, , page] = buildIcons().map((i) => readPng(i.png));
  for (let y = 0; y < big.height; y += 37) for (let x = 0; x < big.width; x += 37) assert.equal(big.pixel(x, y)[3], 255);
  assert.deepEqual(page.pixel(0, 0), [0, 0, 0, 0], 'background is transparent');
  assert.equal(page.width, 64);
  // The sclera of the monochrome icon stays dim, so the outline and iris are what stand out.
  assert.ok(page.pixel(14, 40)[1] < 100);
});

test('the committed PNG files are exactly what the generator produces', () => {
  buildIcons().forEach((icon) => {
    const url = new URL(icon.path, ROOT);
    assert.ok(existsSync(url), icon.path + ' is missing: run node scripts/make-icon.js');
    assert.ok(readFileSync(url).equals(icon.png), icon.path + ' is out of date: run node scripts/make-icon.js');
  });
});

test('the Page shows the in-Page icon from a file that exists, at its pixel size', () => {
  const page = readFileSync(new URL('agent/pages/eye/index.ink', ROOT), 'utf8');
  assert.match(page, /<image class="menu-icon" src="\/assets\/eye\.png"/);
  assert.match(page, /\.menu-icon \{[^}]*width: 64px;[^}]*height: 64px;/);
  const png = readPng(readFileSync(new URL('agent/assets/eye.png', ROOT)));
  assert.equal(png.width, 64);
  assert.equal(png.height, 64);
});

test('encodePng writes a decodable image', () => {
  const png = readPng(encodePng(3, 2, (x, y) => [x * 80, y * 100, 7, 255]));
  assert.equal(png.width, 3);
  assert.deepEqual(png.pixel(2, 1), [160, 100, 7, 255]);
});

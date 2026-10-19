import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { VIDEOS } from '../agent/lib/videos.js';
import { MAX_HEIGHT, MAX_VIDEOS, MAX_WIDTH } from '../scripts/prepare-videos.js';

const ROOT = new URL('../', import.meta.url);

// Finds a box type in the first bytes of an MP4 (enough for 'ftyp', 'moov' and 'mdat' positions).
function boxes(buffer) {
  const found = [];
  let offset = 0;
  while (offset + 8 <= buffer.length) {
    let size = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    if (size === 1) size = Number(buffer.readBigUInt64BE(offset + 8));
    if (size < 8) break;
    found.push({ type, offset, size });
    offset += size;
  }
  return found;
}

test('the manifest lists one to four videos with unique ids and neutral titles', () => {
  assert.ok(VIDEOS.length >= 1 && VIDEOS.length <= MAX_VIDEOS);
  assert.equal(new Set(VIDEOS.map((v) => v.id)).size, VIDEOS.length);
  VIDEOS.forEach((v, i) => {
    assert.equal(v.id, 'relax-' + (i + 1));
    assert.equal(v.title, 'Relax ' + (i + 1), 'titles carry no claims');
    assert.equal(v.src, '/assets/videos/' + v.id + '.mp4');
    assert.ok(v.durationSec > 0);
    assert.ok(v.width > 0 && v.width <= MAX_WIDTH);
    assert.ok(v.height > 0 && v.height <= MAX_HEIGHT);
    assert.equal(v.width % 2, 0);
    assert.equal(v.height % 2, 0);
  });
});

test('every manifest entry has its file, with the recorded size, as a progressive MP4', () => {
  VIDEOS.forEach((v) => {
    const url = new URL('agent' + v.src, ROOT);
    assert.ok(existsSync(url), v.src + ' is missing: run node scripts/prepare-videos.js');
    assert.equal(statSync(url).size, v.bytes, v.src + ' differs from the manifest: run node scripts/prepare-videos.js');
    const file = readFileSync(url);
    const list = boxes(file);
    assert.equal(list[0].type, 'ftyp');
    const moov = list.find((b) => b.type === 'moov');
    const mdat = list.find((b) => b.type === 'mdat');
    assert.ok(moov && mdat, 'has moov and mdat');
    assert.ok(moov.offset < mdat.offset, v.src + ' needs the index (moov) before the data (mdat) to play while loading');
  });
});

test('no clip carries an audio track, so nothing can make a sound', () => {
  VIDEOS.forEach((v) => {
    const file = readFileSync(new URL('agent' + v.src, ROOT));
    assert.equal(file.includes(Buffer.from('soun')), false, v.src + ' has a sound handler');
    assert.equal(file.includes(Buffer.from('mp4a')), false, v.src + ' has an AAC track');
    assert.equal(file.includes(Buffer.from('vide')), true, v.src + ' has a video track');
  });
});

test('video files are not unreasonably large for the glasses bundle', () => {
  const total = VIDEOS.reduce((sum, v) => sum + v.bytes, 0);
  assert.ok(total < 60 * 1024 * 1024, 'total ' + total + ' bytes');
  VIDEOS.forEach((v) => assert.ok(v.bytes < 50 * 1024 * 1024, v.src + ' is over 50 MB'));
});

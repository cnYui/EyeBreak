import test from 'node:test';
import assert from 'node:assert/strict';
import { SLOTS, createPlayer, formatClock } from '../agent/lib/player.js';
import { HINT_SECONDS, LIST_HINT, LIST_SUB, LIST_TITLE, PAUSED_HINT, PLAY_HINT, W, buildView } from '../agent/lib/view.js';
import { textUnits } from '../agent/lib/text.js';

const VIDEOS = [
  { id: 'relax-1', title: 'Relax 1', src: '/assets/videos/relax-1.mp4', durationSec: 8 },
  { id: 'relax-2', title: 'Relax 2', src: '/assets/videos/relax-2.mp4', durationSec: 185.4 }
];

test('formatClock', () => {
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(8.9), '0:08');
  assert.equal(formatClock(185.4), '3:05');
  assert.equal(formatClock(-3), '0:00');
  assert.equal(formatClock(NaN), '0:00');
});

test('the list: focus wraps both ways and a tap opens the focused video', () => {
  const p = createPlayer(VIDEOS);
  assert.equal(p.snapshot().screen, 'list');
  assert.equal(p.snapshot().focus, 0);
  p.moveFocus(1);
  assert.equal(p.snapshot().focus, 1);
  p.moveFocus(1);
  assert.equal(p.snapshot().focus, 0);
  p.moveFocus(-1);
  assert.equal(p.snapshot().focus, 1);
  assert.equal(p.tap(), 'play');
  const s = p.snapshot();
  assert.equal(s.screen, 'player');
  assert.equal(s.current, 1);
  assert.equal(s.playing, true);
  assert.equal(s.position, 0);
});

test('the player: tap pauses and resumes, time updates, swipes do not move the list focus', () => {
  const p = createPlayer(VIDEOS);
  p.play(0);
  p.onTime(3.2);
  assert.equal(p.snapshot().position, 3.2);
  assert.equal(p.tap(), 'pause');
  assert.equal(p.snapshot().paused, true);
  assert.equal(p.snapshot().playing, false);
  assert.equal(p.tap(), 'resume');
  assert.equal(p.snapshot().playing, true);
  p.moveFocus(1);
  assert.equal(p.snapshot().focus, 0, 'focus does not move while playing');
  p.onTime(NaN);
  p.onTime(-1);
  p.onTime('x');
  assert.equal(p.snapshot().position, 3.2, 'bad times are ignored');
});

test('back returns to the list with the video you watched focused', () => {
  const p = createPlayer(VIDEOS);
  p.moveFocus(1);
  p.tap();
  p.onTime(5);
  p.back();
  const s = p.snapshot();
  assert.equal(s.screen, 'list');
  assert.equal(s.focus, 1);
  assert.equal(s.current, -1);
  assert.equal(s.position, 0);
  assert.equal(s.notice, '');
  p.back();
  assert.equal(p.snapshot().screen, 'list', 'back on the list does nothing');
});

test('the end of a video returns to the list with a notice, which the next action clears', () => {
  const p = createPlayer(VIDEOS);
  p.play(1);
  p.onEnded();
  assert.equal(p.snapshot().screen, 'list');
  assert.equal(p.snapshot().notice, 'Finished');
  assert.equal(p.snapshot().focus, 1);
  p.moveFocus(1);
  assert.equal(p.snapshot().notice, '');
});

test('a playback error returns to the list and says so; events on the list are ignored', () => {
  const p = createPlayer(VIDEOS);
  p.play(0);
  p.onError();
  assert.equal(p.snapshot().screen, 'list');
  assert.equal(p.snapshot().notice, 'This video cannot be played');
  p.onEnded();
  p.onError();
  p.onTime(4);
  assert.equal(p.snapshot().notice, 'This video cannot be played');
  assert.equal(p.snapshot().position, 0);
});

test('play() only accepts videos that exist, and at most four are shown', () => {
  const p = createPlayer(VIDEOS);
  assert.equal(p.play(2), false);
  assert.equal(p.play(-1), false);
  assert.equal(p.snapshot().screen, 'list');
  const many = [];
  for (let i = 0; i < 6; i += 1) many.push({ id: 'r' + i, title: 'Relax ' + i, src: '/x', durationSec: 1 });
  assert.equal(createPlayer(many).count(), SLOTS);
  const none = createPlayer([]);
  none.moveFocus(1);
  assert.equal(none.tap(), '');
});

test('the list view: rows, focus, durations, empty slots hidden', () => {
  const p = createPlayer(VIDEOS);
  p.moveFocus(1);
  const v = buildView(p.snapshot());
  assert.equal(v.menuClass, 'screen');
  assert.equal(v.runClass, 'screen screen-off');
  assert.equal(v.menuTitle, LIST_TITLE);
  assert.equal(v.menuSub, LIST_SUB);
  assert.equal(v.menuHint, LIST_HINT);
  assert.equal(v.r0Text, 'Relax 1');
  assert.equal(v.r0State, '0:08');
  assert.equal(v.r1Text, 'Relax 2');
  assert.equal(v.r1State, '3:05');
  assert.equal(v.r0Class, 'row row-0');
  assert.equal(v.r1Class, 'row row-1 is-focus');
  assert.equal(v.r2Class, 'row row-2 row-off');
  assert.equal(v.r3Class, 'row row-3 row-off');
  assert.equal(v.videoSrc, '', 'nothing is loaded while the list is up');
  assert.equal(v.overlayClass, 'overlay overlay-off');
});

test('the player view: the source, the controls for the first seconds, then only the video', () => {
  const p = createPlayer(VIDEOS);
  p.play(1);
  let v = buildView(p.snapshot());
  assert.equal(v.runClass, 'screen');
  assert.equal(v.menuClass, 'screen screen-off');
  assert.equal(v.videoSrc, '/assets/videos/relax-2.mp4');
  assert.equal(v.clock, '0:00 / 3:05');
  assert.equal(v.runHint, PLAY_HINT);
  assert.equal(v.overlayClass, 'overlay');
  assert.equal(v.label, '');
  p.onTime(HINT_SECONDS + 0.5);
  v = buildView(p.snapshot());
  assert.equal(v.runHint, '');
  assert.equal(v.overlayClass, 'overlay overlay-off', 'while it plays nothing is drawn over the video');
  p.tap();
  v = buildView(p.snapshot());
  assert.equal(v.label, 'PAUSED');
  assert.equal(v.runHint, PAUSED_HINT);
  assert.equal(v.overlayClass, 'overlay');
  assert.equal(v.clock, '0:04 / 3:05');
});

test('every text fits its width budget', () => {
  [LIST_TITLE, LIST_SUB, LIST_HINT, PLAY_HINT, PAUSED_HINT].forEach((t) => assert.ok(textUnits(t) <= W.hint, t));
  const p = createPlayer(VIDEOS);
  p.play(0);
  p.onEnded();
  assert.ok(textUnits(buildView(p.snapshot()).notice) <= W.notice);
  p.play(0);
  p.onError();
  assert.ok(textUnits(buildView(p.snapshot()).notice) <= W.notice);
  assert.ok(textUnits('PAUSED') <= W.label);
  assert.ok(textUnits('59:59 / 59:59') <= W.clock);
});

test('the app makes no sound: the Page mutes the video and uses no speech or audio API', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../agent/pages/eye/index.ink', import.meta.url), 'utf8');
  assert.match(page, /<video[^>]*muted="true"/);
  assert.match(page, /<video[^>]*volume="0"/);
  assert.doesNotMatch(page, /speechSynthesis|SpeechSynthesisUtterance|createAudioContext|createInnerAudioContext|AudioContext|\.volume\s*=/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoutine } from '../agent/lib/routine.js';
import { MAX_TICK_MS, RESTART_WINDOW_MS, createSession } from '../agent/lib/session.js';
import { loadSettings, saveSettings, SETTINGS_KEY } from '../agent/lib/env.js';

function make() {
  return createSession(buildRoutine('normal'));
}

test('a new session is ready and does not advance on tick', () => {
  const s = make();
  assert.equal(s.phase(), 'ready');
  assert.equal(s.tick(100), false);
  assert.equal(s.snapshot().elapsedMs, 0);
});

test('start runs, tick advances, pause freezes, resume continues', () => {
  const s = make();
  s.start();
  assert.equal(s.phase(), 'running');
  s.tick(100);
  s.tick(100);
  assert.equal(s.snapshot().elapsedMs, 200);
  s.pause();
  assert.equal(s.phase(), 'paused');
  assert.equal(s.tick(100), false);
  assert.equal(s.snapshot().elapsedMs, 200);
  s.resume();
  s.tick(50);
  assert.equal(s.snapshot().elapsedMs, 250);
});

test('toggle: running ⇄ paused, and it starts from ready or done', () => {
  const s = make();
  s.toggle();
  assert.equal(s.phase(), 'running');
  s.toggle();
  assert.equal(s.phase(), 'paused');
  s.toggle();
  assert.equal(s.phase(), 'running');
  s.next();
  s.reset();
  assert.equal(s.phase(), 'ready');
  assert.equal(s.snapshot().elapsedMs, 0);
});

test('one tick can never advance more than MAX_TICK_MS, so a stalled timer cannot make the dot jump', () => {
  const s = make();
  s.start();
  s.tick(10000);
  assert.equal(s.snapshot().elapsedMs, MAX_TICK_MS);
  s.tick(-50);
  assert.equal(s.snapshot().elapsedMs, MAX_TICK_MS);
});

test('running to the end finishes the session and stops it advancing', () => {
  const s = make();
  s.start();
  const total = s.routine().totalMs;
  let guard = 0;
  while (s.phase() === 'running' && guard < 100000) {
    s.tick(MAX_TICK_MS);
    guard += 1;
  }
  assert.equal(s.phase(), 'done');
  assert.equal(s.snapshot().elapsedMs, total);
  assert.equal(s.snapshot().frame.done, true);
  assert.equal(s.tick(100), false);
  s.toggle();
  assert.equal(s.phase(), 'running', 'Again');
  assert.equal(s.snapshot().elapsedMs, 0);
});

test('next jumps to the start of the next step, and past the last step finishes', () => {
  const s = make();
  const r = s.routine();
  s.start();
  s.next();
  assert.equal(s.snapshot().elapsedMs, r.steps[1].startMs);
  s.next();
  assert.equal(s.snapshot().frame.stepId, 'vertical');
  for (let i = 0; i < 4; i += 1) s.next();
  assert.equal(s.snapshot().frame.stepId, 'rest');
  s.next();
  assert.equal(s.phase(), 'done');
});

test('prev restarts the step when you are well into it, otherwise goes to the previous step', () => {
  const s = make();
  const r = s.routine();
  s.start();
  s.next();
  s.next();
  const third = r.steps[2];
  for (let t = 0; t < RESTART_WINDOW_MS + 300; t += 100) s.tick(100);
  s.prev();
  assert.equal(s.snapshot().elapsedMs, third.startMs, 'restarted the current step');
  s.tick(100);
  s.prev();
  assert.equal(s.snapshot().elapsedMs, r.steps[1].startMs, 'went to the previous step');
  s.prev();
  s.prev();
  assert.equal(s.snapshot().elapsedMs, 0, 'cannot go before the first step');
});

test('next and prev do nothing before the run has started or after it is done', () => {
  const s = make();
  s.next();
  s.prev();
  assert.equal(s.phase(), 'ready');
  assert.equal(s.snapshot().elapsedMs, 0);
});

test('next while paused moves the dot but keeps the session paused', () => {
  const s = make();
  s.start();
  s.pause();
  s.next();
  assert.equal(s.phase(), 'paused');
  assert.equal(s.snapshot().frame.stepId, 'horizontal');
});

test('changing the routine (a new pace) starts over from ready', () => {
  const s = make();
  s.start();
  s.tick(200);
  s.setRoutine(buildRoutine('gentle'));
  assert.equal(s.phase(), 'ready');
  assert.equal(s.snapshot().elapsedMs, 0);
  assert.equal(s.routine().pace, 'gentle');
});

test('settings: defaults, round trip, and tolerance of bad data', () => {
  const memory = {};
  const storage = { getItem: (k) => (k in memory ? memory[k] : null), setItem: (k, v) => { memory[k] = v; } };
  assert.deepEqual(loadSettings(storage), { pace: 'normal', voice: true });
  assert.equal(saveSettings(storage, { pace: 'gentle', voice: false }), true);
  assert.deepEqual(loadSettings(storage), { pace: 'gentle', voice: false });
  memory[SETTINGS_KEY] = JSON.stringify({ pace: 'warp', voice: 'yes' });
  assert.deepEqual(loadSettings(storage), { pace: 'normal', voice: true });
  memory[SETTINGS_KEY] = '{broken';
  assert.deepEqual(loadSettings(storage), { pace: 'normal', voice: true });
  assert.deepEqual(loadSettings(null), { pace: 'normal', voice: true });
  assert.equal(saveSettings(null, {}), false);
});

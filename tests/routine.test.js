import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PACES,
  approxMinutes,
  buildRoutine,
  formatClock,
  frameAt,
  locate,
  sampleTrack,
  speechBetween,
  speechFor
} from '../agent/lib/routine.js';

const STEP_IDS = ['ready', 'horizontal', 'vertical', 'diagonal', 'circles', 'depth', 'rest'];

// Arena in pixels at the full layout; only used to put the speed limit in real units.
const PX_PER_X = 206;
const PX_PER_Y = 123;
const MAX_PX_PER_SEC = 270;

function walk(routine, stepMs, fn) {
  for (let t = 0; t <= routine.totalMs; t += stepMs) fn(frameAt(routine, t), t);
}

test('the routine has the seven steps in order and is about two minutes at Normal', () => {
  const r = buildRoutine('normal');
  assert.deepEqual(r.steps.map((s) => s.id), STEP_IDS);
  assert.ok(r.totalMs > 100000 && r.totalMs < 130000, 'total ' + r.totalMs);
  assert.equal(approxMinutes(r.totalMs), 2);
  r.steps.forEach((s, i) => {
    assert.ok(s.ms > 0);
    assert.equal(s.startMs, i === 0 ? 0 : r.steps[i - 1].endMs, 'steps are back to back');
  });
  assert.equal(r.steps[r.steps.length - 1].endMs, r.totalMs);
});

test('Gentle stretches every step by the same factor', () => {
  const normal = buildRoutine('normal');
  const gentle = buildRoutine('gentle');
  assert.equal(PACES.gentle.factor, 1.4);
  assert.ok(Math.abs(gentle.totalMs / normal.totalMs - 1.4) < 0.01);
  assert.equal(approxMinutes(gentle.totalMs), 3);
  assert.equal(buildRoutine('nonsense').pace, 'normal');
});

test('the dot never leaves the arena and its scale and brightness stay in range', () => {
  ['normal', 'gentle'].forEach((pace) => {
    walk(buildRoutine(pace), 50, (f, t) => {
      const where = pace + ' at ' + t;
      assert.ok(f.x >= -1.0001 && f.x <= 1.0001, 'x ' + where);
      assert.ok(f.y >= -1.0001 && f.y <= 1.0001, 'y ' + where);
      assert.ok(f.s >= 0.4 && f.s <= 2, 's ' + where);
      assert.ok(f.a >= 0 && f.a <= 1, 'a ' + where);
    });
  });
});

test('every step starts and ends at the centre, full size and fully lit, so steps join without a jump', () => {
  const r = buildRoutine('normal');
  r.steps.forEach((step) => {
    const first = sampleTrack(step.track, 0);
    const last = sampleTrack(step.track, step.ms);
    [first, last].forEach((p) => {
      assert.ok(Math.abs(p.x) < 1e-6 && Math.abs(p.y) < 1e-6, step.id + ' centre');
      assert.ok(Math.abs(p.s - 1) < 1e-6 && Math.abs(p.a - 1) < 1e-6, step.id + ' size and brightness');
    });
  });
});

test('the dot never moves faster than a comfortable pursuit speed', () => {
  ['normal', 'gentle'].forEach((pace) => {
    const r = buildRoutine(pace);
    const dt = 20;
    let previous = frameAt(r, 0);
    let worst = 0;
    for (let t = dt; t <= r.totalMs; t += dt) {
      const f = frameAt(r, t);
      const dx = (f.x - previous.x) * PX_PER_X;
      const dy = (f.y - previous.y) * PX_PER_Y;
      worst = Math.max(worst, Math.sqrt(dx * dx + dy * dy) / (dt / 1000));
      previous = f;
    }
    assert.ok(worst <= MAX_PX_PER_SEC, pace + ' peak speed ' + Math.round(worst) + ' px/s');
    assert.ok(worst > 50, 'the dot does move');
  });
});

test('cues are announced when the movement starts, not when it ends', () => {
  const r = buildRoutine('normal');
  const step = r.steps[1];
  // The first move starts after the 1400 ms opening hold and heads left.
  assert.equal(sampleTrack(step.track, 1000).label, '');
  assert.equal(sampleTrack(step.track, 1500).label, 'LEFT');
  assert.ok(sampleTrack(step.track, 1500).x > -0.05 && sampleTrack(step.track, 1500).x <= 0);
  // At the end of the hold on the left the next move (right) has not started yet, then it has.
  const leftHoldEnd = 1400 + 1600 + 900;
  assert.equal(sampleTrack(step.track, leftHoldEnd - 50).label, 'LEFT');
  assert.equal(sampleTrack(step.track, leftHoldEnd + 50).label, 'RIGHT');
  assert.ok(sampleTrack(step.track, leftHoldEnd + 50).x < -0.99);
});

test('the horizontal step moves only along x and the vertical step only along y', () => {
  const r = buildRoutine('normal');
  [['horizontal', 'y'], ['vertical', 'x']].forEach(([id, still]) => {
    const step = r.steps.find((s) => s.id === id);
    for (let t = 0; t <= step.ms; t += 40) assert.equal(Math.abs(sampleTrack(step.track, t)[still]) < 1e-9, true, id);
  });
});

test('circles: clockwise then counter-clockwise, each at a constant radius', () => {
  const r = buildRoutine('normal');
  const step = r.steps.find((s) => s.id === 'circles');
  const cw = step.track.segments.find((s) => s.label === 'CLOCKWISE' && s.from > 0 && s.ms > 5000);
  const ccw = step.track.segments.find((s) => s.label === 'COUNTERCLOCKWISE');
  assert.ok(cw && ccw);
  for (let u = 0; u <= 1; u += 0.05) {
    const a = cw.fn(u);
    const b = ccw.fn(u);
    assert.ok(Math.abs(Math.hypot(a.x, a.y) - 1) < 1e-9);
    assert.ok(Math.abs(Math.hypot(b.x, b.y) - 1) < 1e-9);
  }
  // A quarter of the way round, clockwise heads to the right and counter-clockwise to the left.
  assert.ok(cw.fn(0.125).x > 0.5 && cw.fn(0.125).y < 0);
  assert.ok(ccw.fn(0.125).x < -0.5 && ccw.fn(0.125).y < 0);
  assert.ok(Math.abs(cw.fn(0).x) < 1e-9 && Math.abs(cw.fn(0).y + 1) < 1e-9, 'starts at the top');
});

test('near and far change the dot size and brightness, not its position', () => {
  const step = buildRoutine('normal').steps.find((s) => s.id === 'depth');
  const labels = {};
  for (let t = 0; t <= step.ms; t += 50) {
    const p = sampleTrack(step.track, t);
    labels[p.label] = labels[p.label] || [];
    labels[p.label].push(p);
    assert.ok(Math.abs(p.x) < 1e-9 && Math.abs(p.y) < 1e-9);
  }
  assert.ok(Math.max(...labels.NEAR.map((p) => p.s)) > 1.8);
  assert.ok(Math.min(...labels.FAR.map((p) => p.s)) < 0.5);
  assert.ok(Math.min(...labels.FAR.map((p) => p.a)) <= 0.5);
});

test('the rest step hides the dot for several seconds and then shows it again', () => {
  const r = buildRoutine('normal');
  const step = r.steps.find((s) => s.id === 'rest');
  let hiddenMs = 0;
  for (let t = 0; t <= step.ms; t += 50) if (sampleTrack(step.track, t).a < 0.01) hiddenMs += 50;
  assert.ok(hiddenMs >= 7000, 'hidden ' + hiddenMs);
  assert.equal(sampleTrack(step.track, step.ms).a, 1);
});

test('frameAt reports step, progress and remaining time, and clamps outside the routine', () => {
  const r = buildRoutine('normal');
  const start = frameAt(r, 0);
  assert.equal(start.stepIndex, 0);
  assert.equal(start.title, 'Get ready');
  assert.equal(start.stepCount, 7);
  assert.equal(start.progress, 0);
  assert.equal(start.done, false);
  const middle = frameAt(r, r.steps[3].startMs + 100);
  assert.equal(middle.stepId, 'diagonal');
  assert.equal(middle.remainingMs, r.totalMs - middle.elapsedMs);
  const end = frameAt(r, r.totalMs + 5000);
  assert.equal(end.done, true);
  assert.equal(end.progress, 1);
  assert.equal(end.remainingMs, 0);
  assert.equal(frameAt(r, -100).elapsedMs, 0);
  assert.equal(locate(r, r.totalMs).index, 6);
});

test('speech: the step title when a step begins, then each new cue once', () => {
  const r = buildRoutine('normal');
  assert.equal(speechBetween(null, frameAt(r, 0)), 'Get ready');
  assert.equal(speechBetween(frameAt(r, 0), frameAt(r, 100)), '');
  assert.equal(speechBetween(frameAt(r, 1300), frameAt(r, 1500)), 'Blink slowly');
  assert.equal(speechBetween(frameAt(r, 1500), frameAt(r, 1700)), '');
  const h = r.steps[1];
  assert.equal(speechBetween(frameAt(r, 4000), frameAt(r, h.startMs + 100)), 'Left and right');
  assert.equal(speechBetween(frameAt(r, h.startMs + 1300), frameAt(r, h.startMs + 1500)), 'Left');
  assert.equal(speechBetween(frameAt(r, h.startMs + 1500), frameAt(r, h.startMs + 1700)), '');
  assert.equal(speechBetween(frameAt(r, 100), frameAt(r, r.totalMs)), '', 'nothing is spoken for the done frame');
  assert.equal(speechFor('UP-LEFT'), 'Up left');
  assert.equal(speechFor('CLOSE YOUR EYES'), 'Close your eyes');
  assert.equal(speechFor(''), '');
});

test('speech: every cue in the routine produces a short spoken phrase and none repeats back to back', () => {
  const r = buildRoutine('normal');
  let previous = null;
  const spoken = [];
  walk(r, 100, (f) => {
    const phrase = speechBetween(previous, f);
    if (phrase) spoken.push(phrase);
    previous = f;
  });
  assert.ok(spoken.length > 30);
  spoken.forEach((phrase, i) => {
    assert.ok(phrase.length <= 24, phrase);
    if (i > 0) assert.notEqual(phrase, spoken[i - 1], 'repeated ' + phrase);
  });
  ['Get ready', 'Blink slowly', 'Left', 'Right', 'Up', 'Down', 'Up left', 'Down right', 'Up right', 'Down left', 'Clockwise', 'Counterclockwise', 'Near', 'Far', 'Close your eyes', 'Open'].forEach((word) => {
    assert.ok(spoken.includes(word), 'missing ' + word);
  });
});

test('formatClock rounds up so the countdown never shows 0:00 early', () => {
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(1), '0:01');
  assert.equal(formatClock(59001), '1:00');
  assert.equal(formatClock(61000), '1:01');
  assert.equal(formatClock(-5), '0:00');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { PACE_ORDER, buildRoutine, frameAt } from '../agent/lib/routine.js';
import { PAUSED_HINT, RUN_HINT, W, X_RANGE, buildView, dotStyles, menuTexts, nextPace } from '../agent/lib/view.js';
import { fitText, textUnits } from '../agent/lib/text.js';

const SETTINGS = { pace: 'normal', voice: true };

function view(phase, elapsedMs, extra) {
  const routine = buildRoutine((extra && extra.pace) || 'normal');
  return buildView(Object.assign({
    phase,
    frame: frameAt(routine, elapsedMs),
    routine,
    settings: SETTINGS,
    focusIndex: 0
  }, extra || {}));
}

test('every text the routine can show fits its width budget', () => {
  ['normal', 'gentle'].forEach((pace) => {
    const routine = buildRoutine(pace);
    routine.steps.forEach((step) => {
      assert.ok(textUnits(step.title) <= W.title, 'title ' + step.title);
      assert.ok(textUnits(step.hint) <= W.hint, 'hint ' + step.hint);
      step.track.segments.forEach((seg) => assert.ok(textUnits(seg.label) <= W.label, 'label ' + seg.label));
    });
    ['ready', 'done'].forEach((phase) => {
      const t = menuTexts(phase, routine);
      assert.ok(textUnits(t.title) <= 20, t.title);
      assert.ok(textUnits(t.sub) <= W.sub, t.sub);
      assert.ok(textUnits(t.note) <= W.note, t.note);
      assert.ok(textUnits(t.hint) <= W.hint, t.hint);
    });
  });
  assert.ok(textUnits(RUN_HINT) <= W.hint);
  assert.ok(textUnits(PAUSED_HINT) <= W.hint);
  // The longest counter: step 7 of 7 with a long countdown.
  assert.ok(textUnits('7/7 · 10:00 left') <= W.counter);
});

test('dotStyles puts the middle at 50 % and keeps the dot centred on its anchor', () => {
  const mid = dotStyles({ x: 0, y: 0, s: 1, a: 1 });
  assert.equal(mid.anchorStyle, 'left: 50%; top: 50%;');
  assert.match(mid.dotStyle, /width: 22px; height: 22px; left: -11px; top: -11px; border-radius: 11px;/);
  assert.match(mid.dotStyle, /rgba\(64, 255, 94, 1\)/);
  const corner = dotStyles({ x: -1, y: 1, s: 1, a: 1 });
  assert.equal(corner.anchorStyle, 'left: ' + (50 - X_RANGE) + '%; top: 96%;');
  const near = dotStyles({ x: 0, y: 0, s: 1.9, a: 1 });
  assert.match(near.dotStyle, /width: 42px/);
  const far = dotStyles({ x: 0, y: 0, s: 0.45, a: 0.5 });
  assert.match(far.dotStyle, /width: 10px/);
  assert.match(far.dotStyle, /rgba\(64, 255, 94, 0\.5\)/);
  const hidden = dotStyles({ x: 0, y: 0, s: 1, a: 0 });
  assert.match(hidden.dotStyle, /rgba\(64, 255, 94, 0\)/);
});

test('dot sizes are always even, so the half-size offset is a whole number of pixels', () => {
  for (let s = 0.4; s <= 2; s += 0.013) {
    const m = dotStyles({ x: 0, y: 0, s, a: 1 }).dotStyle.match(/width: (\d+)px; height: (\d+)px; left: -(\S+)px;/);
    const size = Number(m[1]);
    assert.equal(size % 2, 0, 'size ' + size);
    assert.equal(Number(m[3]) * 2, size);
  }
});

test('the ready screen: menu visible, run screen hidden, rows and focus', () => {
  const v = view('ready', 0, { focusIndex: 1 });
  assert.equal(v.menuClass, 'screen');
  assert.equal(v.runClass, 'screen screen-off');
  assert.equal(v.menuTitle, 'Rest your eyes');
  assert.match(v.menuSub, /^About 2 min · 7 steps/);
  assert.equal(v.r0Text, 'Start');
  assert.equal(v.r0State, 'about 2 min');
  assert.equal(v.r1Text, 'Pace');
  assert.equal(v.r1State, 'Normal');
  assert.equal(v.r2State, 'On');
  assert.equal(v.r0Class, 'row row-0');
  assert.equal(v.r1Class, 'row row-1 is-focus');
  assert.equal(v.dotStyle, undefined, 'no dot data while the menu is up');
  assert.match(v.menuNote, /dizzy/);
});

test('the done screen says well done and offers Again', () => {
  const routine = buildRoutine('normal');
  const v = view('done', routine.totalMs);
  assert.equal(v.menuTitle, 'Well done');
  assert.equal(v.r0Text, 'Again');
  assert.equal(v.menuNote, '');
  assert.match(v.menuSub, /look far away/);
});

test('Gentle shows about three minutes and the pace label', () => {
  const v = view('ready', 0, { pace: 'gentle', settings: { pace: 'gentle', voice: false } });
  assert.match(v.menuSub, /^About 3 min/);
  assert.equal(v.r1State, 'Gentle');
  assert.equal(v.r2State, 'Off');
});

test('the run screen: dot position, label, counter, title, progress', () => {
  const routine = buildRoutine('normal');
  const h = routine.steps[1];
  const t = h.startMs + 1400 + 1600 + 900 + 1600; // halfway from left to right
  const v = view('running', t);
  assert.equal(v.runClass, 'screen');
  assert.equal(v.menuClass, 'screen screen-off');
  assert.equal(v.label, 'RIGHT');
  assert.equal(v.title, 'Left and right');
  assert.equal(v.stepHint, 'Move only your eyes, not your head');
  assert.match(v.counter, /^2\/7 · \d:\d\d left$/);
  assert.equal(v.anchorStyle, 'left: 50%; top: 50%;');
  assert.match(v.progressStyle, /^width: \d+(\.\d)?%;$/);
  const progress = Number(v.progressStyle.match(/[\d.]+/)[0]);
  assert.ok(progress > 5 && progress < 15, 'progress ' + progress);
});

test('paused: the label says PAUSED and the hint explains the controls', () => {
  const v = view('paused', 30000);
  assert.equal(v.label, 'PAUSED');
  assert.equal(v.stepHint, PAUSED_HINT);
  assert.equal(view('running', 30000).stepHint === PAUSED_HINT, false);
});

test('the dot follows the frame: left at the far left, size and brightness during near and far', () => {
  const routine = buildRoutine('normal');
  const h = routine.steps[1];
  const atLeft = view('running', h.startMs + 1400 + 1600 + 100);
  assert.equal(atLeft.anchorStyle, 'left: ' + (50 - X_RANGE) + '%; top: 50%;');
  const d = routine.steps.find((s) => s.id === 'depth');
  const far = view('running', d.startMs + 1000 + 800 + 3000 + 1200 + 500);
  assert.equal(far.label, 'FAR');
  assert.match(far.dotStyle, /width: 10px/);
});

test('nextPace cycles through the paces', () => {
  assert.deepEqual(PACE_ORDER, ['normal', 'gentle']);
  assert.equal(nextPace('normal'), 'gentle');
  assert.equal(nextPace('gentle'), 'normal');
  assert.equal(nextPace('unknown'), 'normal');
});

test('fitText cuts long text with an ellipsis and leaves short text alone', () => {
  assert.equal(fitText('short', 10), 'short');
  assert.equal(fitText('abcdefghij', 6), 'abcde…');
  assert.equal(textUnits(fitText(String.fromCharCode(0x6d4b, 0x8bd5, 0x6d4b, 0x8bd5, 0x6d4b, 0x8bd5, 0x6d4b, 0x8bd5), 9)) <= 9, true);
});

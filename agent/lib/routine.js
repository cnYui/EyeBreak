// The eye-exercise routine as data: seven steps, each a track of timed motions
// for one dot. Everything here is a pure function of elapsed time.
//
// Coordinates: x runs left (-1) to right (+1), y runs up (-1) to down (+1),
// (0, 0) is the middle of the arena. `s` is the dot's scale (1 = normal size)
// and `a` its brightness (1 = full, 0 = hidden).
//
// A step is a list of segments. `move` eases from where the dot is to a new
// pose, `hold` keeps it still, `circle` runs round the arena at constant speed.
// A segment's `cue` is announced when the segment STARTS and stays until the
// next cue, so "LEFT" appears as the dot sets off to the left, not after it
// arrives.

export const PACES = {
  normal: { label: 'Normal', factor: 1 },
  gentle: { label: 'Gentle', factor: 1.4 }
};
export const PACE_ORDER = ['normal', 'gentle'];

const NEAR = { s: 1.9, a: 1 };
const FAR = { s: 0.45, a: 0.5 };

function pose(x, y, s, a) {
  return { x, y, s: s === undefined ? 1 : s, a: a === undefined ? 1 : a };
}

function ease(u) {
  return (1 - Math.cos(Math.PI * u)) / 2;
}

function clamp01(u) {
  return u < 0 ? 0 : u > 1 ? 1 : u;
}

function lerpPose(from, to, u) {
  return {
    x: from.x + (to.x - from.x) * u,
    y: from.y + (to.y - from.y) * u,
    s: from.s + (to.s - from.s) * u,
    a: from.a + (to.a - from.a) * u
  };
}

const hold = (ms, cue) => ({ kind: 'hold', ms, cue });
const move = (ms, to, cue) => ({ kind: 'move', ms, to, cue });
// `rounds` full turns, clockwise when dir is 1 and counter-clockwise when -1; starts and ends at the top.
const circle = (ms, dir, cue, rounds) => ({ kind: 'circle', ms, dir, cue, rounds });

// Builds a track: segments with absolute start times and a pose function each.
function buildTrack(start, specs, factor) {
  const segments = [];
  let cursor = start;
  let label = '';
  let at = 0;
  specs.forEach((spec) => {
    const ms = Math.round(spec.ms * factor);
    if (spec.cue) label = spec.cue;
    const from = cursor;
    let fn;
    if (spec.kind === 'circle') {
      const turns = (spec.rounds || 1) * 2 * Math.PI * spec.dir;
      const s = from.s;
      const a = from.a;
      fn = (u) => pose(Math.sin(turns * u), -Math.cos(turns * u), s, a);
      cursor = fn(1);
      cursor.x = Math.round(cursor.x * 1e9) / 1e9;
    } else if (spec.kind === 'move') {
      const to = Object.assign({}, from, spec.to);
      fn = (u) => lerpPose(from, to, ease(u));
      cursor = to;
    } else {
      fn = () => from;
    }
    segments.push({ from: at, ms, label, fn });
    at += ms;
  });
  return { segments, ms: at };
}

const CENTER = pose(0, 0);

// Scaled by the pace factor when the routine is built. Times are for "Normal".
const STEP_SPECS = [
  {
    id: 'ready',
    title: 'Get ready',
    hint: 'Sit back, keep your head still, blink slowly',
    specs: [hold(1400), hold(3600, 'BLINK SLOWLY')]
  },
  {
    id: 'horizontal',
    title: 'Left and right',
    hint: 'Move only your eyes, not your head',
    specs: [
      hold(1400),
      move(1600, { x: -1, y: 0 }, 'LEFT'), hold(900),
      move(3200, { x: 1, y: 0 }, 'RIGHT'), hold(900),
      move(3200, { x: -1, y: 0 }, 'LEFT'), hold(900),
      move(3200, { x: 1, y: 0 }, 'RIGHT'), hold(900),
      move(1600, { x: 0, y: 0 }, 'CENTER'), hold(700)
    ]
  },
  {
    id: 'vertical',
    title: 'Up and down',
    hint: 'Keep your head still, follow the dot',
    specs: [
      hold(1400),
      move(1600, { x: 0, y: -1 }, 'UP'), hold(900),
      move(3200, { x: 0, y: 1 }, 'DOWN'), hold(900),
      move(3200, { x: 0, y: -1 }, 'UP'), hold(900),
      move(3200, { x: 0, y: 1 }, 'DOWN'), hold(900),
      move(1600, { x: 0, y: 0 }, 'CENTER'), hold(700)
    ]
  },
  {
    id: 'diagonal',
    title: 'Diagonals',
    hint: 'Slow and smooth, no need to strain',
    specs: [
      hold(1400),
      move(1600, { x: -1, y: -1 }, 'UP-LEFT'), hold(700),
      move(3000, { x: 1, y: 1 }, 'DOWN-RIGHT'), hold(700),
      move(1600, { x: 0, y: 0 }, 'CENTER'), hold(400),
      move(1600, { x: 1, y: -1 }, 'UP-RIGHT'), hold(700),
      move(3000, { x: -1, y: 1 }, 'DOWN-LEFT'), hold(700),
      move(1600, { x: 0, y: 0 }, 'CENTER'), hold(700)
    ]
  },
  {
    id: 'circles',
    title: 'Circles',
    hint: 'Trace the circle with your eyes, two rounds each way',
    specs: [
      hold(1400),
      move(1400, { x: 0, y: -1 }, 'CLOCKWISE'),
      circle(11000, 1, 'CLOCKWISE', 2),
      circle(11000, -1, 'COUNTERCLOCKWISE', 2),
      move(1400, { x: 0, y: 0 }, 'CENTER'), hold(700)
    ]
  },
  {
    id: 'depth',
    title: 'Near and far',
    hint: 'Near: the dot. Far: look past it, far away',
    specs: [
      hold(1000),
      move(800, NEAR, 'NEAR'), hold(3000),
      move(1200, FAR, 'FAR'), hold(4000),
      move(1200, NEAR, 'NEAR'), hold(3000),
      move(1200, FAR, 'FAR'), hold(4000),
      move(1200, NEAR, 'NEAR'), hold(3000),
      move(800, { s: 1, a: 1 }, 'CENTER'), hold(600)
    ]
  },
  {
    id: 'rest',
    title: 'Rest',
    hint: 'Close your eyes gently and relax',
    specs: [
      hold(700),
      move(600, { a: 0 }, 'CLOSE YOUR EYES'), hold(7400),
      move(800, { a: 1 }, 'OPEN'), hold(900)
    ]
  }
];

export function buildRoutine(paceKey) {
  const pace = PACES[paceKey] ? paceKey : 'normal';
  const factor = PACES[pace].factor;
  const steps = [];
  let at = 0;
  STEP_SPECS.forEach((def) => {
    const track = buildTrack(CENTER, def.specs, factor);
    steps.push({
      id: def.id,
      title: def.title,
      hint: def.hint,
      startMs: at,
      ms: track.ms,
      endMs: at + track.ms,
      track
    });
    at += track.ms;
  });
  return { pace, factor, steps, totalMs: at };
}

// The step containing `elapsedMs` (clamped to the routine) and the time inside it.
export function locate(routine, elapsedMs) {
  const t = Math.max(0, Math.min(elapsedMs, routine.totalMs));
  for (let i = 0; i < routine.steps.length; i += 1) {
    const step = routine.steps[i];
    if (t < step.endMs || i === routine.steps.length - 1) {
      return { index: i, step, tInStep: Math.min(t - step.startMs, step.ms) };
    }
  }
  return { index: 0, step: routine.steps[0], tInStep: 0 };
}

export function sampleTrack(track, t) {
  const segs = track.segments;
  let seg = segs[segs.length - 1];
  for (let i = 0; i < segs.length; i += 1) {
    if (t < segs[i].from + segs[i].ms) {
      seg = segs[i];
      break;
    }
  }
  const u = seg.ms > 0 ? clamp01((t - seg.from) / seg.ms) : 1;
  const p = seg.fn(u);
  return { x: p.x, y: p.y, s: p.s, a: p.a, label: seg.label };
}

// Everything the screen needs for one instant.
export function frameAt(routine, elapsedMs) {
  const at = locate(routine, elapsedMs);
  const p = sampleTrack(at.step.track, at.tInStep);
  const elapsed = Math.max(0, Math.min(elapsedMs, routine.totalMs));
  return {
    done: elapsed >= routine.totalMs,
    stepIndex: at.index,
    stepCount: routine.steps.length,
    stepId: at.step.id,
    title: at.step.title,
    hint: at.step.hint,
    label: p.label,
    x: p.x,
    y: p.y,
    s: p.s,
    a: p.a,
    tInStepMs: at.tInStep,
    stepMs: at.step.ms,
    elapsedMs: elapsed,
    remainingMs: routine.totalMs - elapsed,
    totalMs: routine.totalMs,
    progress: routine.totalMs > 0 ? elapsed / routine.totalMs : 0
  };
}

// "Left", "Up left", "Close your eyes": what is spoken for an on-screen cue.
export function speechFor(label) {
  const words = String(label || '').toLowerCase().replace(/-/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// What to say between two frames: the step title when a step begins, otherwise
// the new cue. Returns '' when nothing changed.
export function speechBetween(previous, frame) {
  if (!frame || frame.done) return '';
  if (!previous || previous.stepIndex !== frame.stepIndex) return frame.title;
  if (frame.label !== '' && frame.label !== previous.label) return speechFor(frame.label);
  return '';
}

export function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

export function approxMinutes(ms) {
  return Math.max(1, Math.round(ms / 60000));
}

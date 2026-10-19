// Controller for one run of the routine: ready → running ⇄ paused → done.
// Time only advances through tick(), and a single tick can never advance more
// than MAX_TICK_MS, so a stalled timer cannot make the dot jump.

import { frameAt, locate } from './routine.js';

export const MAX_TICK_MS = 250;
// Going back inside this window restarts the current step; later than that jumps to the previous one.
export const RESTART_WINDOW_MS = 2500;

export function createSession(initialRoutine) {
  let routine = initialRoutine;
  let phase = 'ready';
  let elapsed = 0;

  function finish() {
    phase = 'done';
    elapsed = routine.totalMs;
  }

  return {
    // Only for ready or done: swapping the routine (a new pace) starts over.
    setRoutine(next) {
      routine = next;
      elapsed = 0;
      phase = 'ready';
    },
    start() {
      elapsed = 0;
      phase = 'running';
    },
    pause() {
      if (phase === 'running') phase = 'paused';
    },
    resume() {
      if (phase === 'paused') phase = 'running';
    },
    // Tap: pause or resume while a run is in progress, start from ready or done.
    toggle() {
      if (phase === 'running') phase = 'paused';
      else if (phase === 'paused') phase = 'running';
      else {
        elapsed = 0;
        phase = 'running';
      }
    },
    reset() {
      elapsed = 0;
      phase = 'ready';
    },
    // Returns true while the run advanced.
    tick(dtMs) {
      if (phase !== 'running') return false;
      elapsed += Math.max(0, Math.min(dtMs, MAX_TICK_MS));
      if (elapsed >= routine.totalMs) finish();
      return true;
    },
    next() {
      if (phase !== 'running' && phase !== 'paused') return;
      const at = locate(routine, elapsed);
      if (at.index >= routine.steps.length - 1) finish();
      else elapsed = routine.steps[at.index + 1].startMs;
    },
    prev() {
      if (phase !== 'running' && phase !== 'paused') return;
      const at = locate(routine, elapsed);
      if (at.tInStep > RESTART_WINDOW_MS || at.index === 0) elapsed = at.step.startMs;
      else elapsed = routine.steps[at.index - 1].startMs;
    },
    phase: () => phase,
    routine: () => routine,
    snapshot() {
      return { phase, elapsedMs: elapsed, frame: frameAt(routine, elapsed), totalMs: routine.totalMs };
    }
  };
}

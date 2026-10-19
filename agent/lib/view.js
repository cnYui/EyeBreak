// View model: turns the session snapshot and the settings into the flat
// strings the Page pushes to setData(). No state, no timers.

import { PACES, PACE_ORDER, approxMinutes, formatClock } from './routine.js';
import { fitText } from './text.js';

// Width budgets in text units (see text.js).
export const W = { title: 28, hint: 56, label: 24, counter: 20, sub: 56, note: 56, row: 26, state: 14 };

// The dot moves inside the arena box; these are the percentages it may travel from the middle.
export const X_RANGE = 46;
export const Y_RANGE = 46;
export const DOT_PX = 22;

export const MENU_ROWS = 3; // start / again, pace, voice

function round1(n) {
  return Math.round(n * 10) / 10;
}

export function dotStyles(frame) {
  const size = Math.max(2, 2 * Math.round((DOT_PX * frame.s) / 2));
  const half = size / 2;
  const alpha = Math.round(frame.a * 100) / 100;
  return {
    anchorStyle: 'left: ' + round1(50 + X_RANGE * frame.x) + '%; top: ' + round1(50 + Y_RANGE * frame.y) + '%;',
    dotStyle: 'width: ' + size + 'px; height: ' + size + 'px; left: -' + half + 'px; top: -' + half +
      'px; border-radius: ' + half + 'px; background-color: rgba(64, 255, 94, ' + alpha + ');'
  };
}

export function nextPace(pace) {
  const index = PACE_ORDER.indexOf(pace);
  return PACE_ORDER[(index + 1) % PACE_ORDER.length];
}

// Static screen texts, also checked against the width budgets by the tests.
export function menuTexts(phase, routine) {
  const done = phase === 'done';
  const minutes = approxMinutes(routine.totalMs);
  return {
    title: done ? 'Well done' : 'Rest your eyes',
    sub: done
      ? 'Blink slowly a few times, then look far away for 20 s'
      : 'About ' + minutes + ' min · ' + routine.steps.length + ' steps · keep your head still',
    note: done ? '' : 'Sit still. Stop if you feel dizzy or your eyes hurt.',
    start: done ? 'Again' : 'Start',
    hint: 'Tap: choose · Swipe: move · Double tap: exit'
  };
}

export const RUN_HINT = 'Tap: pause · Swipe: change step · Double tap: exit';
export const PAUSED_HINT = 'Tap: resume · Swipe: change step · Double tap: exit';

function rowClass(index, focus) {
  return 'row row-' + index + (index === focus ? ' is-focus' : '');
}

// input: { phase, frame, routine, settings: { pace, voice }, focusIndex }
export function buildView(input) {
  const phase = input.phase;
  const frame = input.frame;
  const settings = input.settings;
  const menu = phase === 'ready' || phase === 'done';
  const texts = menuTexts(phase, input.routine);
  const startState = menu ? 'about ' + approxMinutes(input.routine.totalMs) + ' min' : '';

  const data = {
    menuClass: menu ? 'screen' : 'screen screen-off',
    runClass: menu ? 'screen screen-off' : 'screen',
    menuTitle: texts.title,
    menuSub: fitText(texts.sub, W.sub),
    menuNote: fitText(texts.note, W.note),
    menuHint: fitText(texts.hint, W.hint),
    r0Class: rowClass(0, input.focusIndex),
    r0Text: texts.start,
    r0State: startState,
    r1Class: rowClass(1, input.focusIndex),
    r1Text: 'Pace',
    r1State: PACES[settings.pace].label,
    r2Class: rowClass(2, input.focusIndex),
    r2Text: 'Voice cues',
    r2State: settings.voice ? 'On' : 'Off'
  };

  if (!menu) {
    const paused = phase === 'paused';
    Object.assign(data, dotStyles(frame));
    data.label = fitText(paused ? 'PAUSED' : frame.label, W.label);
    data.counter = fitText((frame.stepIndex + 1) + '/' + frame.stepCount + ' · ' + formatClock(frame.remainingMs) + ' left', W.counter);
    data.title = fitText(frame.title, W.title);
    data.stepHint = fitText(paused ? PAUSED_HINT : frame.hint, W.hint);
    data.progressStyle = 'width: ' + round1(frame.progress * 100) + '%;';
  }
  return data;
}

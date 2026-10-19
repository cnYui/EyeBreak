// View model: the player snapshot as the flat strings the Page pushes to setData().

import { SLOTS, formatClock } from './player.js';
import { fitText } from './text.js';

// Width budgets in text units (see text.js).
export const W = { title: 24, state: 14, label: 24, clock: 20, sub: 56, hint: 56, notice: 40 };

export const LIST_TITLE = 'Pick a video';
export const LIST_SUB = 'Plays silently. No sound.';
export const LIST_HINT = 'Tap: play · Swipe: move · Double tap: exit';
export const PLAY_HINT = 'Tap: pause · Swipe: back to list · Double tap: exit';
export const PAUSED_HINT = 'Tap: resume · Swipe: back to list · Double tap: exit';
// The controls are shown for this long at the start of a video, and whenever it is paused.
export const HINT_SECONDS = 4;

function rowClass(index, focus) {
  return 'row row-' + index + (index === focus ? ' is-focus' : '');
}

export function buildView(snap) {
  const list = snap.screen === 'list';
  const data = {
    menuClass: list ? 'screen' : 'screen screen-off',
    runClass: list ? 'screen screen-off' : 'screen',
    menuTitle: LIST_TITLE,
    menuSub: LIST_SUB,
    notice: fitText(snap.notice, W.notice),
    menuHint: LIST_HINT
  };

  for (let i = 0; i < SLOTS; i += 1) {
    const video = snap.videos[i];
    data['r' + i + 'Class'] = video ? rowClass(i, snap.focus) : 'row row-' + i + ' row-off';
    data['r' + i + 'Text'] = video ? fitText(video.title, W.title) : '';
    data['r' + i + 'State'] = video ? fitText(formatClock(video.durationSec), W.state) : '';
  }

  if (list) {
    data.videoSrc = '';
    data.label = '';
    data.clock = '';
    data.runHint = '';
    data.overlayClass = 'overlay overlay-off';
    return data;
  }

  const video = snap.videos[snap.current];
  const showControls = snap.paused || snap.position < HINT_SECONDS;
  data.videoSrc = video ? video.src : '';
  data.label = snap.paused ? 'PAUSED' : '';
  data.clock = formatClock(snap.position) + ' / ' + formatClock(video ? video.durationSec : 0);
  data.runHint = snap.paused ? PAUSED_HINT : showControls ? PLAY_HINT : '';
  // While it plays the screen is the video and nothing else, except the controls at the start and on pause.
  data.overlayClass = showControls ? 'overlay' : 'overlay overlay-off';
  return data;
}

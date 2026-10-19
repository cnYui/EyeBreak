// Controller for the two screens: the list of videos and the player.
// Pure state; the Page feeds it taps, swipes and the video component's events.

export const SLOTS = 4;

export function formatClock(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

export function createPlayer(videos) {
  const items = videos.slice(0, SLOTS);
  let screen = 'list';
  let focus = 0;
  let current = -1;
  let paused = false;
  let position = 0;
  let notice = '';

  function toList(message) {
    screen = 'list';
    paused = false;
    position = 0;
    if (current >= 0) focus = current;
    current = -1;
    notice = message || '';
  }

  return {
    count: () => items.length,
    // Start a given video (0-based); ignored when it does not exist.
    play(index) {
      if (index < 0 || index >= items.length) return false;
      screen = 'player';
      focus = index;
      current = index;
      paused = false;
      position = 0;
      notice = '';
      return true;
    },
    moveFocus(delta) {
      if (screen !== 'list' || items.length === 0) return;
      focus = (focus + delta + items.length) % items.length;
      notice = '';
    },
    // Tap: open the focused video on the list, pause or resume in the player.
    // Returns 'play', 'pause', 'resume' or ''.
    tap() {
      if (screen === 'list') return this.play(focus) ? 'play' : '';
      paused = !paused;
      return paused ? 'pause' : 'resume';
    },
    back() {
      if (screen === 'player') toList('');
    },
    onTime(seconds) {
      if (screen === 'player' && typeof seconds === 'number' && isFinite(seconds) && seconds >= 0) position = seconds;
    },
    onEnded() {
      if (screen === 'player') toList('Finished');
    },
    onError() {
      if (screen === 'player') toList('This video cannot be played');
    },
    snapshot() {
      return {
        screen,
        videos: items,
        focus,
        current,
        playing: screen === 'player' && !paused,
        paused,
        position,
        notice
      };
    }
  };
}

<script def>
{
  "navigationBarTitleText": "Eye Break",
  "description": "Open the Eye Break guided eye exercise: a dot moves on the display and the wearer follows it with their eyes (left and right, up and down, diagonals, circles, near and far, then a short rest). Invoke when the user says things like: my eyes are tired, eye break, eye exercise, rest my eyes, eye massage routine, 眼保健操. Pass autostart=true to begin right away. Pass pace=gentle for a slower routine.",
  "schema": {
    "data": {
      "type": "object",
      "properties": {
        "autostart": {
          "type": "boolean",
          "description": "When true, start the routine immediately instead of waiting for a tap."
        },
        "pace": {
          "type": "string",
          "enum": ["normal", "gentle"],
          "description": "Normal takes about two minutes; gentle is about 40 percent slower."
        }
      }
    }
  }
}
</script>

<script setup>
import { buildRoutine, speechBetween } from '../../lib/routine.js';
import { createSession } from '../../lib/session.js';
import { MENU_ROWS, buildView, nextPace } from '../../lib/view.js';
import { createTempleInput } from '../../lib/temple.js';
import { loadSettings, saveSettings, storageOrNull } from '../../lib/env.js';

const TICK_MS = 33;

function parseQuery(query) {
  const input = query && typeof query === 'object' && !Array.isArray(query) ? query : {};
  return {
    autostart: input.autostart === true,
    pace: input.pace === 'gentle' || input.pace === 'normal' ? input.pace : ''
  };
}

export default {
  data: {
    menuClass: 'screen',
    runClass: 'screen screen-off',
    menuTitle: '',
    menuSub: '',
    menuNote: '',
    menuHint: '',
    r0Class: 'row row-0 is-focus',
    r0Text: '',
    r0State: '',
    r1Class: 'row row-1',
    r1Text: '',
    r1State: '',
    r2Class: 'row row-2',
    r2Text: '',
    r2State: '',
    anchorStyle: 'left: 50%; top: 50%;',
    dotStyle: 'width: 22px; height: 22px; left: -11px; top: -11px; border-radius: 11px; background-color: rgba(64, 255, 94, 1);',
    label: '',
    counter: '',
    title: '',
    stepHint: '',
    progressStyle: 'width: 0%;'
  },

  onLoad(query) {
    const parsed = parseQuery(query);
    this._storage = storageOrNull();
    this._settings = loadSettings(this._storage);
    if (parsed.pace !== '' && parsed.pace !== this._settings.pace) {
      this._settings.pace = parsed.pace;
      saveSettings(this._storage, this._settings);
    }
    this._session = createSession(buildRoutine(this._settings.pace));
    this._temple = createTempleInput({
      now: () => Date.now(),
      schedule: (fn, ms) => setTimeout(fn, ms),
      cancel: (id) => clearTimeout(id),
      onLoneGlobalHook: () => this._primaryAction()
    });
    this._view = {};
    this._focus = 0;
    this._timer = null;
    this._lastTickAt = 0;
    this._lastFrame = null;
    this._visible = false;
    if (parsed.autostart) this._begin();
    this._render();
  },

  onShow() {
    this._visible = true;
    if (this._session.phase() === 'running') this._startTimer();
    this._render();
  },

  // Leaving the Page pauses the routine: the dot must never run on unseen.
  onHide() {
    this._visible = false;
    this._stopTimer();
    this._session.pause();
    this._render();
  },

  onUnload() {
    this._visible = false;
    this._stopTimer();
    if (this._temple) this._temple.dispose();
  },

  onKeyDown(event) {
    const code = event && event.code;
    if (code === 'Enter' || code === 'ArrowUp' || code === 'ArrowDown') this._temple.gestureKeyDown();
  },

  onKeyUp(event) {
    if (!event) return;
    const code = event.code;
    if (code === 'Enter') {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      this._temple.gestureKeyUp();
      this._primaryAction();
    } else if (code === 'ArrowUp') {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      this._temple.gestureKeyUp();
      this._swipe(-1);
    } else if (code === 'ArrowDown') {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      this._temple.gestureKeyUp();
      this._swipe(1);
    } else if (code === 'GlobalHook') {
      this._temple.globalHookUp();
    }
    // Backspace keeps the host default: go back / close the agent.
  },

  // ---- run control ---------------------------------------------------------------

  _begin() {
    this._session.start();
    this._lastFrame = null;
    if (this._visible) this._startTimer();
  },

  _startTimer() {
    if (this._timer !== null) return;
    this._lastTickAt = Date.now();
    this._timer = setInterval(() => this._tick(), TICK_MS);
  },

  _stopTimer() {
    if (this._timer === null) return;
    clearInterval(this._timer);
    this._timer = null;
  },

  _tick() {
    const now = Date.now();
    const dt = now - this._lastTickAt;
    this._lastTickAt = now;
    this._session.tick(dt);
    const snap = this._session.snapshot();
    if (snap.phase === 'running') {
      this._cue(speechBetween(this._lastFrame, snap.frame));
      this._lastFrame = snap.frame;
    } else if (snap.phase === 'done') {
      this._stopTimer();
      this._cue('Well done. Blink slowly, then look far away.');
    }
    this._render();
  },

  // ---- input ---------------------------------------------------------------------

  _primaryAction() {
    const phase = this._session.phase();
    if (phase === 'running' || phase === 'paused') {
      this._session.toggle();
      if (this._session.phase() === 'running') {
        if (this._visible) this._startTimer();
      } else {
        this._stopTimer();
      }
      this._render();
      return;
    }
    if (this._focus === 0) {
      this._begin();
    } else if (this._focus === 1) {
      this._settings.pace = nextPace(this._settings.pace);
      saveSettings(this._storage, this._settings);
      this._session.setRoutine(buildRoutine(this._settings.pace));
    } else {
      this._settings.voice = !this._settings.voice;
      saveSettings(this._storage, this._settings);
      if (this._settings.voice) this._speak('Voice cues on');
    }
    this._render();
  },

  // delta -1 is the forward swipe (ArrowUp), +1 the backward swipe (ArrowDown).
  _swipe(delta) {
    const phase = this._session.phase();
    if (phase === 'running' || phase === 'paused') {
      if (delta > 0) this._session.next();
      else this._session.prev();
      this._lastFrame = null;
      if (this._session.phase() === 'done') {
        this._stopTimer();
        this._cue('Well done. Blink slowly, then look far away.');
      }
    } else {
      this._focus = (this._focus + delta + MENU_ROWS) % MENU_ROWS;
    }
    this._render();
  },

  // ---- feedback ------------------------------------------------------------------

  _cue(text) {
    if (text !== '') this._speak(text);
  },

  _speak(text) {
    if (!this._settings.voice) return;
    try {
      if (typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance === 'function') {
        speechSynthesis.speak(new SpeechSynthesisUtterance(text), 'immediate');
      }
    } catch (_) {}
  },

  // ---- view ----------------------------------------------------------------------

  // Sends only the keys whose value changed since the last push.
  _push(patch) {
    const changed = {};
    let any = false;
    Object.keys(patch).forEach((key) => {
      if (this._view[key] !== patch[key]) {
        this._view[key] = patch[key];
        changed[key] = patch[key];
        any = true;
      }
    });
    if (any) this.setData(changed);
  },

  _render() {
    const snap = this._session.snapshot();
    this._push(buildView({
      phase: snap.phase,
      frame: snap.frame,
      routine: this._session.routine(),
      settings: this._settings,
      focusIndex: this._focus
    }));
  }
};
</script>

<page class="page">
  <view class="shell">
    <view class="{{menuClass}}">
      <image class="menu-icon" src="/assets/eye.png" mode="aspectFit"></image>
      <text class="eyebrow">EYE BREAK</text>
      <text class="menu-title">{{menuTitle}}</text>
      <text class="menu-sub">{{menuSub}}</text>
      <text class="menu-note">{{menuNote}}</text>
      <view class="rows">
        <view class="{{r0Class}}">
          <text class="row-text">{{r0Text}}</text>
          <text class="row-state">{{r0State}}</text>
        </view>
        <view class="{{r1Class}}">
          <text class="row-text">{{r1Text}}</text>
          <text class="row-state">{{r1State}}</text>
        </view>
        <view class="{{r2Class}}">
          <text class="row-text">{{r2Text}}</text>
          <text class="row-state">{{r2State}}</text>
        </view>
      </view>
      <text class="menu-hint">{{menuHint}}</text>
    </view>

    <view class="{{runClass}}">
      <view class="top">
        <text class="label">{{label}}</text>
        <text class="counter">{{counter}}</text>
      </view>
      <view class="arena">
        <view class="anchor" style="{{anchorStyle}}">
          <view class="dot" style="{{dotStyle}}"></view>
        </view>
      </view>
      <view class="bottom">
        <view class="bar">
          <view class="bar-fill" style="{{progressStyle}}"></view>
        </view>
        <text class="step-title">{{title}}</text>
        <text class="step-hint">{{stepHint}}</text>
      </view>
    </view>
  </view>
</page>

<style>
.page {
  width: 100%;
  height: 100%;
  color: rgba(64, 255, 94, 0.72);
  background-color: #000000;
}

.shell {
  position: relative;
  width: 100%;
  height: 100%;
}

.screen {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  box-sizing: border-box;
}

.screen-off {
  display: none;
}

.menu-icon {
  position: absolute;
  right: 16px;
  top: 4px;
  width: 64px;
  height: 64px;
}

.eyebrow {
  font-size: 12px;
  line-height: 16px;
  letter-spacing: 0.08em;
  color: rgba(64, 255, 94, 0.48);
}

.menu-title {
  margin-top: 6px;
  font-size: 26px;
  line-height: 32px;
  font-weight: 500;
  color: #40ff5e;
}

.menu-sub {
  margin-top: 2px;
  font-size: 12px;
  line-height: 16px;
  color: rgba(64, 255, 94, 0.72);
}

.menu-note {
  margin-top: 2px;
  font-size: 12px;
  line-height: 16px;
  color: rgba(64, 255, 94, 0.48);
}

.rows {
  display: flex;
  flex-direction: column;
  margin-top: 12px;
}

.row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  padding: 7px 10px;
  border: 1px solid rgba(64, 255, 94, 0.32);
  border-radius: 6px;
  box-sizing: border-box;
}

.row.is-focus {
  border-color: #40ff5e;
  box-shadow: inset 0 0 0 1px #40ff5e;
  background-color: rgba(64, 255, 94, 0.1);
}

.row-text {
  font-size: 16px;
  line-height: 20px;
  color: #40ff5e;
}

.row-state {
  font-size: 13px;
  line-height: 20px;
  color: rgba(64, 255, 94, 0.72);
}

.menu-hint {
  margin-top: 4px;
  font-size: 11px;
  line-height: 14px;
  color: rgba(64, 255, 94, 0.48);
}

.top {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  height: 22px;
}

.label {
  font-size: 16px;
  line-height: 22px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: #40ff5e;
}

.counter {
  font-size: 12px;
  line-height: 16px;
  color: rgba(64, 255, 94, 0.48);
}

.arena {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
}

.anchor {
  position: absolute;
  width: 0px;
  height: 0px;
}

.dot {
  position: absolute;
  background-color: #40ff5e;
}

.bottom {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.bar {
  height: 2px;
  background-color: rgba(64, 255, 94, 0.24);
}

.bar-fill {
  height: 2px;
  background-color: #40ff5e;
}

.step-title {
  margin-top: 4px;
  font-size: 15px;
  line-height: 20px;
  font-weight: 500;
  color: #40ff5e;
}

.step-hint {
  font-size: 12px;
  line-height: 16px;
  color: rgba(64, 255, 94, 0.48);
}

@media (max-height: 240px) {
  .screen {
    padding: 6px 10px;
  }
  .menu-title {
    margin-top: 2px;
    font-size: 20px;
    line-height: 24px;
  }
  .menu-icon {
    display: none;
  }
  .menu-sub {
    display: none;
  }
  .menu-note {
    display: none;
  }
  .menu-hint {
    display: none;
  }
  .rows {
    margin-top: 6px;
  }
  .row-1 {
    display: none;
  }
  .row-2 {
    display: none;
  }
  .step-hint {
    display: none;
  }
  .step-title {
    margin-top: 2px;
  }
}
</style>

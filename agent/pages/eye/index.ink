<script def>
{
  "navigationBarTitleText": "Eye Break",
  "description": "Open Eye Break, a short list of silent relaxation videos to watch when the eyes feel tired after long screen time. The wearer picks a video and it plays without sound. Invoke when the user says things like: my eyes are tired, eye break, rest my eyes, show me a relaxation video. Pass video=2 to play the second video right away.",
  "schema": {
    "data": {
      "type": "object",
      "properties": {
        "video": {
          "type": "integer",
          "minimum": 1,
          "maximum": 4,
          "description": "Number of the video to play right away (1 is the first in the list). Leave out to show the list."
        }
      }
    }
  }
}
</script>

<script setup>
import wx from 'wx';
import { VIDEOS } from '../../lib/videos.js';
import { createPlayer } from '../../lib/player.js';
import { buildView } from '../../lib/view.js';
import { createTempleInput } from '../../lib/temple.js';

function parseQuery(query) {
  const input = query && typeof query === 'object' && !Array.isArray(query) ? query : {};
  const video = Number(input.video);
  return { video: Number.isInteger(video) && video >= 1 && video <= 4 ? video : 0 };
}

// The video component reports { currentTime } directly or inside `detail`, depending on the host.
function readTime(event) {
  if (!event) return NaN;
  if (typeof event.currentTime === 'number') return event.currentTime;
  if (event.detail && typeof event.detail.currentTime === 'number') return event.detail.currentTime;
  return NaN;
}

export default {
  data: {
    menuClass: 'screen',
    runClass: 'screen screen-off',
    menuTitle: '',
    menuSub: '',
    notice: '',
    menuHint: '',
    r0Class: 'row row-0 is-focus', r0Text: '', r0State: '',
    r1Class: 'row row-1', r1Text: '', r1State: '',
    r2Class: 'row row-2 row-off', r2Text: '', r2State: '',
    r3Class: 'row row-3 row-off', r3Text: '', r3State: '',
    videoSrc: '',
    label: '',
    clock: '',
    runHint: '',
    overlayClass: 'overlay overlay-off'
  },

  onLoad(query) {
    const parsed = parseQuery(query);
    this._player = createPlayer(VIDEOS);
    this._temple = createTempleInput({
      now: () => Date.now(),
      schedule: (fn, ms) => setTimeout(fn, ms),
      cancel: (id) => clearTimeout(id),
      onLoneGlobalHook: () => this._primaryAction()
    });
    this._view = {};
    if (parsed.video > 0) this._player.play(parsed.video - 1);
    this._render();
  },

  onUnload() {
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
    } else if (code === 'ArrowUp' || code === 'ArrowDown') {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      this._temple.gestureKeyUp();
      this._swipe(code === 'ArrowUp' ? -1 : 1);
    } else if (code === 'GlobalHook') {
      this._temple.globalHookUp();
    }
    // Backspace keeps the host default: go back / close the agent.
  },

  // ---- video component events ----------------------------------------------------

  handleTime(event) {
    const seconds = readTime(event);
    if (!isNaN(seconds)) {
      this._player.onTime(seconds);
      this._render();
    }
  },

  handleEnded() {
    this._player.onEnded();
    this._render();
  },

  handleError() {
    this._player.onError();
    this._render();
  },

  // ---- input -----------------------------------------------------------------------

  _primaryAction() {
    const action = this._player.tap();
    if (action === 'pause') this._withVideo((video) => video.pause());
    else if (action === 'resume') this._withVideo((video) => video.play());
    this._render();
  },

  // The video context is looked up when it is needed, like AIUI's own video sample does.
  _withVideo(action) {
    const video = typeof wx.createVideoContext === 'function' ? wx.createVideoContext('player') : null;
    if (video) action(video);
  },

  // delta -1 is the forward swipe (ArrowUp), +1 the backward swipe (ArrowDown).
  _swipe(delta) {
    const snap = this._player.snapshot();
    if (snap.screen === 'player') {
      this._withVideo((video) => video.pause());
      this._player.back();
    } else {
      this._player.moveFocus(delta);
    }
    this._render();
  },

  // ---- view ------------------------------------------------------------------------

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
    this._push(buildView(this._player.snapshot()));
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
      <text class="menu-notice">{{notice}}</text>
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
        <view class="{{r3Class}}">
          <text class="row-text">{{r3Text}}</text>
          <text class="row-state">{{r3State}}</text>
        </view>
      </view>
      <text class="menu-hint">{{menuHint}}</text>
    </view>

    <view class="{{runClass}}">
      <video
        id="player"
        class="video"
        src="{{videoSrc}}"
        autoplay="true"
        muted="true"
        volume="0"
        object-fit="contain"
        bindtimeupdate="handleTime"
        bindended="handleEnded"
        binderror="handleError"
      ></video>
      <view class="{{overlayClass}}">
        <view class="overlay-top">
          <text class="label">{{label}}</text>
          <text class="clock">{{clock}}</text>
        </view>
        <text class="run-hint">{{runHint}}</text>
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

.menu-notice {
  margin-top: 2px;
  min-height: 16px;
  font-size: 12px;
  line-height: 16px;
  color: #40ff5e;
}

.rows {
  display: flex;
  flex-direction: column;
  margin-top: 8px;
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

.row-off {
  display: none;
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
  font-family: monospace;
  color: rgba(64, 255, 94, 0.72);
}

.menu-hint {
  margin-top: 4px;
  font-size: 11px;
  line-height: 14px;
  color: rgba(64, 255, 94, 0.48);
}

.video {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}

.overlay {
  position: absolute;
  left: 16px;
  right: 16px;
  top: 12px;
  bottom: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.overlay-off {
  display: none;
}

.overlay-top {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-size: 16px;
  line-height: 22px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: #40ff5e;
}

.clock {
  font-size: 12px;
  line-height: 16px;
  font-family: monospace;
  color: rgba(64, 255, 94, 0.72);
}

.run-hint {
  font-size: 11px;
  line-height: 14px;
  color: rgba(64, 255, 94, 0.72);
}

@media (max-height: 240px) {
  .screen {
    padding: 6px 10px;
  }
  .menu-icon {
    display: none;
  }
  .menu-title {
    margin-top: 2px;
    font-size: 20px;
    line-height: 24px;
  }
  .menu-sub {
    display: none;
  }
  .menu-hint {
    display: none;
  }
  .rows {
    margin-top: 6px;
  }
  .row-2 {
    display: none;
  }
  .row-3 {
    display: none;
  }
  .run-hint {
    display: none;
  }
}
</style>

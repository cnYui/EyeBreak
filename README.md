# Eye Break

A guided eye break for Rokid Glasses (AIUI 0.17, monochrome green, 480 × 352). A small dot moves on the display and you follow it with your eyes: left and right, up and down, diagonals, circles, near and far, then a short rest. It is the glasses version of a simple eye-exercise routine for the moment your eyes feel tired after a long time at a screen.

Status: **built, imported into AIUI Studio (international version) and run in its glasses simulator, in the AIX browser preview and with unit tests. It has not been run on glasses.** See [Verified](#verified) and [Not verified](#not-verified).

> This is a relaxation routine, not a medical treatment. It does not diagnose, treat or prevent any eye condition. Sit still while you use it; do not use it while walking or driving. Stop if you feel dizzy, nauseous or any pain, and see an eye-care professional if discomfort persists.

## How to use it

Open the agent (say "my eyes are tired" or "start the eye break" once the agent is installed). The first screen has three rows:

| Row | Tap |
| --- | --- |
| **Start** | Begins the routine (about 2 minutes) |
| **Pace** | Switches Normal ⇄ Gentle (40 % slower, about 3 minutes) |
| **Voice cues** | Switches the spoken cues on or off |

Temple controls (the key mapping comes from measurements in the sibling WorkHealthier project and is unverified on glasses here):

| Action | Before and after a run | During a run |
| --- | --- | --- |
| Tap (`GlobalHook` then `Enter`) | Choose the focused row | Pause or resume |
| Swipe forward (`ArrowUp`) | Focus up | Previous step (restarts the current step if you are more than 2.5 s into it) |
| Swipe back (`ArrowDown`) | Focus down | Next step; past the last step it finishes |
| Double tap | Host default: exit | Host default: exit |

During a run the top line shows the direction cue (`LEFT`, `RIGHT`, `UP`, `CLOCKWISE`, `NEAR`, `FAR`, …) and `step/7 · time left`; the bottom shows a progress bar, the step name and a one-line instruction. When paused the cue line says `PAUSED` and the controls are listed. Leaving the Page (hide) pauses the routine so the dot never runs on while you are not looking.

Optional parameters when the agent is opened: `autostart: true` begins at once, `pace: "gentle"` selects the slower pace (remembered).

## The routine

Times are for Normal; Gentle multiplies every step by 1.4. The dot starts and ends every step in the middle.

| # | Step | Time | What the dot does |
| --- | --- | --- | --- |
| 1 | Get ready | 5 s | Stays in the middle: "Blink slowly" |
| 2 | Left and right | 18.5 s | Middle → left → right → left → right → middle, pausing about 1 s at each end |
| 3 | Up and down | 18.5 s | The same, vertically |
| 4 | Diagonals | 17.7 s | Up-left ⇄ down-right, then up-right ⇄ down-left |
| 5 | Circles | 26.9 s | Two rounds clockwise, two rounds counter-clockwise, at constant speed |
| 6 | Near and far | 25 s | The dot grows and brightens (**NEAR**: focus on the dot), then shrinks and dims (**FAR**: look past it at the farthest thing you can see), three near and two far phases |
| 7 | Rest | 10.4 s | The dot disappears: "Close your eyes", then "Open" |

Total 2:02 at Normal and 2:51 at Gentle (the menu rounds these to "about 2 min" and "about 3 min").

The cue for a movement is announced (on screen and by voice) when the dot **starts** to move that way, so your eyes lead rather than chase. Motion is eased at both ends. The peak speed is about 250 px/s at Normal (the diagonal sweep) and 180 px/s at Gentle, measured on a 448 × 268 px arena; a unit test fails above 270 px/s. How many degrees per second that is on the glasses depends on their field of view and has not been measured.

An honest note on "near and far": the display shows its image at one fixed optical distance, so the dot cannot make your eyes focus nearer or farther by itself. The size and brightness change is a cue; the actual change of focus comes from looking past the dot at something far away. The finish screen suggests looking at something far away for 20 seconds, in line with the commonly recommended 20-20-20 habit; the app does not remind you to do so (see Limits).

## Try it without glasses

Needs Node 20+ and nothing to install.

```bash
npm test
npx --yes --package @yodaos-pkg/aix-cli@0.8.2 aix preview agent --html-out artifacts/preview.html
python -m http.server 8767 --directory artifacts      # then open http://127.0.0.1:8767/preview.html
```

In the preview use the on-page buttons or the keyboard: Enter = tap, ↑ / ↓ = swipes. Keep the browser tab in the foreground: a hidden tab throttles timers and the dot stalls (a hidden run measured one frame per second).

## Icon

A pixel-art eye that looks up and to the right at a glowing guide dot, which is what the app does. It is drawn in code on a 32 × 32 grid (`scripts/make-icon.js`) and written in three sizes; `node scripts/make-icon.js` regenerates them and a test fails if the committed files drift from the script.

| File | Use |
| --- | --- |
| `assets/icon/eyebreak-icon-512.png` | **The agent icon for AIUI Studio.** Full colour, square, fully opaque, 16 × 16 px blocks. |
| `assets/icon/eyebreak-icon-128.png` | The same at 128 × 128 for small previews. |
| `agent/assets/eye.png` | Shown top right on the Page's first screen. Monochrome green on a transparent background (the display is green-only and black is see-through), 64 × 64 so each art pixel is exactly 2 × 2 and nothing is scaled. Hidden in the compact chat-card layout. |

Studio does **not** read the agent icon from the repository; it is uploaded in Studio. In the international Studio it is on the **Real-device debug** tab, section **Basic information**: *Agent icon* → *Change icon*, a 1:1 image is recommended. The same tab asks for the agent name, the app category (required), an intent description, and has the **Package and save** button. The review documentation requires a custom icon that is clear, correctly oriented and not a plain colour or a colour with text. Upload `assets/icon/eyebreak-icon-512.png` there; that has not been done yet.

## Test on the glasses

From the AIUI documentation (`craft.en-US.md`, "Debug on Glasses"); these steps have not been carried out for this project yet.

1. In Studio, open the **Real-device debug** tab for the imported project and fill in *Agent name* (20 characters at most; the default is `cnYui/EyeBreak`, `Eye Break` is shorter), *App category* (required) and *Intent description*; change the icon; then **Package and save**. Real-device debugging is only available after the project is bound to an agent and has been packaged and uploaded.
2. In the Rokid AI app on the phone: **Settings > Developer**, update the glasses resource package, and wait for "Agent resource package downloaded successfully".
3. Say to the glasses: "Leqi, open the Eye Break agent."
4. What to look at: the pixel eye at the top right of the first screen, whether the dot is comfortable to follow (size, speed, travel range), the cue labels, the spoken cues, tap / swipe / double tap, and how the green dot looks against the real scene.

## Try it in AIUI Studio

Use the international Studio, **https://aiui-global.rokid.com/** (sign in with your Rokid account first).

1. Top left, the **New Agent** menu → **GitHub import** (the fourth item).
2. Enter `https://github.com/cnYui/EyeBreak/tree/main/agent` and confirm. The import root is the repository's `agent/` folder. The project opens as a draft marked "pending upload"; the remote source is read-only and nothing is written back to GitHub. Importing the same URL again updates it.
3. On the **AIUI CODING** tab send `/debug run pages/eye/index`, then open the **Simulator** tab. The Page starts in the glasses simulator.
4. The temple buttons on the right drive it: Tap, Double tap, Swipe forward and Swipe back. Wait two seconds between presses.

Spoken cues show up in the simulator as a "TTS" banner (for example `Left`).

## Layout

```text
agent/                      AIUI Studio import root
  app.json, AGENTS.md       manifest (no permissions), agent identity and safety wording
  pages/eye/index.ink       the only Page: menu screen and run screen, timer, input, speech
  lib/routine.js            the routine as data: tracks of timed moves, holds and circles
  lib/session.js            ready → running ⇄ paused → done controller
  lib/view.js, text.js      view model and width budgets (long text is cut in JS, not by CSS)
  lib/env.js, temple.js     remembered settings, temple input arbitration
  assets/eye.png            the pixel eye shown on the first screen (monochrome green, 64 x 64)
assets/icon/                the colour agent icon for AIUI Studio (512 x 512 and 128 x 128)
scripts/make-icon.js        draws the pixel art and writes all three PNG files (no dependencies)
tests/                      47 Node tests (npm test)
```

## Verified

2026-10-19, Windows 11, Node 24, `@yodaos-pkg/aix-cli` 0.8.2, AIUI 0.17.0 target:

- `npm test`: 47 passing: the icon (grid, palette, valid PNGs, committed files match the generator), the routine (seven steps, about 2 minutes, Gentle ×1.4, the dot stays inside the arena, every step joins at the centre, speed limit, cue timing, circle direction and radius, near/far size and brightness, the rest step hides the dot, speech phrases), the session controller (pause, resume, skip, restart, the 250 ms tick cap, finish), the view model and every text against its width budget.
- `validate_aiui_project.py agent --repository-root . --target-version 0.17.0 --strict`: exit 0. `aix pack`: 25 KB bundle.
- AIX browser preview (web runtime): menu, a run through the steps with the dot at the expected places (centre, far left, far right, a diagonal, a point on the circle, large "near" dot, small "far" dot, hidden during rest), the label and `step/7 · time left` counter, progress bar, pause and resume, skipping steps, the "Well done" screen, switching to Gentle (menu then says about 3 min). Dynamic `style` binding with percentage positions and border-radius circles works; `setData` at about 30 fps with a worst gap of 34–58 ms in the preview.
- Voice cues reach `speechSynthesis` (the web preview reports `speech.speak is not configured on Web host`, so nothing is audible there).
- **AIUI Studio, international version (2026-10-19)**: the GitHub import of `…/EyeBreak/tree/main/agent` worked; `/debug run pages/eye/index` started the Page in the simulator. Through the simulator's temple buttons: Tap started the routine, Get ready and then Left and right ran by themselves with the dot, cue, counter and progress bar updating; Tap paused (`PAUSED`, controls listed) and resumed; Swipe back stepped through Diagonals, Circles, Near and far (large dot) and Rest (dot hidden, `CLOSE YOUR EYES`) and past the end to the "Well done" screen; Swipe back plus Tap switched Pace to Gentle ("about 3 min"); Double tap exited to the glasses home screen. The simulator showed the spoken cues as a "TTS" banner (`Left`, and `Well done. Blink slowly, then look far away.`). The Page is laid out by percentages, so it adapts to the simulator's portrait frame (roughly 4:5), which is not the 480 × 352 of the browser preview.

## Not verified

- **Rokid Glasses hardware**: nothing. Open questions: how large the dot looks (22 px at scale 1 is a guess in degrees), whether the travel range is comfortable, real frame rate and smoothness with `setInterval` at 33 ms (AIUI 0.17 has no `requestAnimationFrame`), whether the dot over the real scene is easy to see in daylight, temple mapping, and the speech cues.
- Speech audio: Studio only shows the cues as text banners; whether they are audible, and how they sound, is untested.
- The compact 448 × 150 chat-card layout (`@media (max-height: 240px)`): written, never viewed.
- `autostart` and `pace` parameters, and "pause when hidden", are covered by code and unit tests of the controller but were not exercised through the host.
- **Saving the agent to the Studio cloud fails when the form has content (2026-10-19).** "Package and save" builds the AIX in the browser and then calls `updateThirdAgent`. With the name `Eye Break`, category Life, a 431-447 character intent description and the colour icon filled in, the call answers HTTP 200 with `{"code":10001,"msg":"<system exception, in Chinese>","data":null}` (a "system exception" toast); removing the apostrophe and double quotes from the description did not help. With a blank form (default name, empty description, default icon) the same call answered `{"code":1,"msg":"success"}` and set the cloud version to 1.0.3, so the AIX itself uploads fine and the failing part is the metadata: icon, name or description (not isolated yet). Two request ids for support: `f011941563944a4b893418ff11eab58e` and `6c8d6e5f693946cdbddc9307559eb414`. The cloud agent `115a4b9d689843a78a08badeb7d98505` is currently named `cnYui/BreakTime` with no description and the default icon, and real-device debugging has not been tried.
- The first-screen icon was seen in the AIX browser preview and in the Studio simulator (after re-importing the same URL, which updated the project in place); not on glasses, where its brightness against the real scene is unknown.
- Whether the routine actually relieves eye discomfort. Nothing in this project tests that, and it makes no such claim.

## Limits

- No reminders: AIUI 0.17 pages only run while they are shown, so Eye Break cannot nudge you after 20 minutes of screen time. You start it yourself.
- It does not measure your eyes or gaze; the glasses have no eye tracking, so it cannot tell whether you are actually following the dot.
- Near/far is a visual cue, as explained above.

## Ideas for later

Gaze-free but useful additions: a configurable length (one-minute version), a "20-20-20" countdown screen, a shortcut that starts from the WorkHealthier session reminder, a left-handed swipe mapping, and an optional Chinese UI (this project is English-only by request).

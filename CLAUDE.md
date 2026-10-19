# EyeBreak — workspace notes for Claude

> **Everything in this project is English-only** (on-glasses UI strings, docs, comments) by the user's standing request for Rokid AIUI projects, even though the user writes in Chinese. Reply to the user in Chinese, keep every file in English.

## What this is

A Rokid Glasses (AIUI 0.17) guided eye break: a dot moves on the display and the wearer follows it with their eyes (left/right, up/down, diagonals, circles, near/far, rest). Requested on 2026-10-19: "show a small dot on the screen, my eyes follow it, like eye exercises, guiding looking far/near, left/right, up/down". Read `README.md` for the routine, controls, what was verified and what was not. Do not describe it as tested in Studio or on glasses: it has been checked only by unit tests and in the AIX browser preview.

## Where things live

| Location | What it is |
| --- | --- |
| `agent/` | AIUI Studio import root (contains `app.json`); one Page `pages/eye/index`; pure logic in `agent/lib/` |
| `agent/lib/routine.js` | The routine as data (tracks of `move` / `hold` / `circle` segments, scaled by the pace); change timings and cues here |
| `agent/lib/session.js` | Run controller; time advances only through `tick()`, capped at 250 ms |
| `scripts/make-icon.js` | Draws the pixel eye (32 × 32 grid) and writes `assets/icon/*.png` (colour, for the Studio agent icon) and `agent/assets/eye.png` (monochrome, shown in the Page). Edit the art there and run it; `tests/icon.test.js` fails if the PNGs are stale |
| `tests/` | `npm test` (Node 20+, `node --test`) |
| `artifacts/` | Ignored by git: `aix pack` output and the preview page |
| `D:\CodeWorkSpace\WorkHealthier`, `D:\CodeWorkSpace\ClaudeCodeGlasses` | Sibling AIUI projects (Studio import loop, simulator facts, more platform notes in their `CLAUDE.md`) |
| `C:\Users\yui\.claude\skills\rokid-aiui-agent` | The Skill with the validators; AIUI docs clone at `D:\CodeWorkSpace\AIUI` |

## Change → check loop

1. `npm test` and
   `python C:/Users/yui/.claude/skills/rokid-aiui-agent/scripts/validate_aiui_project.py agent --repository-root . --target-version 0.17.0 --strict` (silent, exit 0 = pass).
2. `npx --yes --package @yodaos-pkg/aix-cli@0.8.2 aix pack agent -o artifacts/eye-break.aix`, then `aix preview agent --html-out artifacts/preview.html`, serve `artifacts/` with `python -m http.server <port> --directory artifacts` and open it in the browser pane. Keep that tab **in the foreground**. Stop the server afterwards.
3. Studio: **always the international version `https://aiui-global.rokid.com/`, never the domestic `aiui.rokid.com`** (the user's rule, 2026-10-19; also in Claude memory). The repository is `https://github.com/cnYui/EyeBreak` (public, `main`); import `https://github.com/cnYui/EyeBreak/tree/main/agent` via the New Agent menu → GitHub import (fourth item), then on the AIUI CODING tab send `/debug run pages/eye/index` and open the Simulator tab. Re-importing the same URL updates the project. The steps are also in `README.md`.
4. Sign-in: the built-in browser pane could not sign in to Rokid; the user's real Chrome is signed in, so drive Studio with Claude in Chrome. Never enter credentials.

## Facts learned while building (2026-10-19)

- Dynamic inline `style="{{expr}}"` works in the Ink runtime (as a whole string or mixed with literal text), and so do percentage `left`/`top` on an absolutely positioned view inside a flex-grown parent, and `border-radius` circles. The dot is a zero-size anchor at `left/top: x%` with the circle inside at negative offsets, which avoids `transform`.
- `setData` at 33 ms ran at about 30 fps in the web preview (worst gap 34–58 ms). A **hidden** browser pane throttles timers: the first prototype run reported 1 fps with a 7,979 ms gap until the tab was fronted. `requestAnimationFrame` is 0.18 only, so the Page uses `setInterval` and computes positions from elapsed time, not from frame counts.
- Long single-line text is not clipped by `text-overflow: ellipsis` (see ClaudeCodeGlasses); every string here is held to a width budget in `agent/lib/text.js` and the tests check all texts.
- The preview has no way to show the compact 448 × 150 card layout.
- `<image src="/assets/eye.png">` works in the web runtime and Studio simulator, and `aix pack` includes it. The agent icon itself is **not** part of the source: it is uploaded in Studio on the Real-device debug tab (Basic information → Agent icon → Change icon; the docs in `0-guide/bundle/publish.en-US.md` call the review form "Build & Review"), where name, category, intent description and Package and save also live; icons must not be blurry, stretched, inverted, black, watermarked, or a plain colour (with or without text).
- Studio simulator (international, 2026-10-19): the Page ran in a portrait frame (about 4:5), not 480 × 352, and the percentage-based layout adapted. The `/debug` chat message shows no reply bubble, but opening the Simulator tab shows the Page already running. The temple buttons (Tap, Double tap, Swipe forward, Swipe back) map to `Enter`, host exit, `ArrowUp`, `ArrowDown` as in the sibling projects; wait about two seconds between presses. `speechSynthesis.speak` shows as a green "TTS" banner. A glasses home screen ("say Leqi") appears after Double tap.
- Studio "Package and save" (real-device debug tab) builds the AIX in the browser, then uploads it; on 2026-10-19 the upload failed twice with a "system exception" toast (HTTP 200 from `.../metis/agent/updateThirdAgent`, error inside the body) and the project stayed "pending upload". Two tries were made and it was not retried further; the cause is unknown. The Chrome tool's `file_upload` works for the hidden icon input (find the "change icon" file input, then upload by ref).
- The imported project is a draft held in the Studio page ("pending upload"); keep that Chrome tab open if you still need it. The dot passes close to the top-left cue label at the corners (Y_RANGE 46 %); pulling `X_RANGE`/`Y_RANGE` in to about 44/42 would add margin (update the corner expectations in `tests/view.test.js` if you do).
- Voice: `speechSynthesis.speak` is called, the web host answers `speech.speak is not configured` (info-level, harmless).
- A safety hook in this environment blocks `rm -rf`; use new names instead of deleting.
- Ink conventions inherited from the sibling projects: no `ink:for`, static class on the `<page>` root, dynamic classes on views, `@media` rules are single-class selectors, QuickJS (`Date.now()` only, no `?.` / `??` in `agent/`).

## Safety rules for this project

- It is a relaxation routine, never a treatment: no wording in the UI, AGENTS.md or README may claim it cures, prevents, diagnoses or improves an eye condition, or give medical advice.
- Keep the routine slow and short: the dot's speed is capped by a test (270 px/s), steps start and end at the centre, and the first screen keeps the "sit still, stop if dizzy" note.
- The routine only starts from a tap or an explicit `autostart`, and pauses whenever the Page is hidden.
- Never add flashing, rapid movement or high-contrast strobing.
- The Page is offline: no permissions, no network, nothing leaves the glasses.

# EyeBreak — workspace notes for Claude

> **Everything in this project is English-only** (on-glasses UI strings, docs, comments) by the user's standing request for Rokid AIUI projects, even though the user writes in Chinese. Reply to the user in Chinese, keep every file in English.

## What this is

A Rokid Glasses (AIUI 0.17) player of **silent relaxation videos** for tired eyes: a list of up to four videos, pick one, it plays muted until the end. **No sound and no background music anywhere** (the user's explicit requirement, 2026-10-19). The first version (2026-10-19, earlier the same day) was a guided dot-following routine; the user dropped it ("do not use the dot any more, use these videos, they are the standard") and it was removed (it is in the git history up to commit `b9c5344`).

Where the videos come from: the user supplied two Bilibili links (BV1424y1B7w8 and BV1NJ411t7aj; a third was meant but the same link was pasted twice) and will provide the MP4 files themselves in `D:\CodeWorkSpace\EyeBreak\videos\`. They are other people's works: the app does not download from Bilibili, and the user was told public-repo and store distribution needs the authors' permission. Until the files arrive the committed clips are **synthetic test patterns** (`placeholder: true` in `agent/lib/videos.js`). When they arrive, run `node scripts/prepare-videos.js 1=videos/<first>.mp4 2=videos/<second>.mp4` (ask which file is which), run the tests, commit, push, re-import in Studio and save the agent again. List titles are neutral (`Relax 1`, `Relax 2`, …): the user agreed not to copy the videos' titles, which make medical claims.

Read `README.md` for usage, what was verified and what was not. Do not describe the video version as tested in Studio or on glasses: only unit tests and the AIX browser preview have seen it.

## Where things live

| Location | What it is |
| --- | --- |
| `agent/` | AIUI Studio import root (contains `app.json`); one Page `pages/eye/index`; pure logic in `agent/lib/` |
| `agent/lib/player.js` | List / player state: focus, play, pause, position, end, error |
| `agent/lib/view.js`, `text.js` | View model and width budgets for every string |
| `agent/lib/videos.js`, `agent/assets/videos/` | **Generated** by `scripts/prepare-videos.js`: the clip list and the silent MP4 files |
| `scripts/prepare-videos.js` | ffmpeg wrapper: source video → silent H.264 progressive MP4, at most 480 × 352, plus the list. `--placeholder N [--seconds S]` makes synthetic test clips |
| `scripts/make-icon.js` | Draws the pixel eye (32 × 32 grid) and writes `assets/icon/*.png` (colour, for the Studio agent icon) and `agent/assets/eye.png` (monochrome, shown in the Page). `tests/icon.test.js` fails if the PNGs are stale |
| `videos/` | The user's source videos, **git-ignored**, never committed |
| `tests/` | `npm test` (Node 20+, `node --test`) |
| `artifacts/` | Ignored by git: `aix pack` output and the preview page |
| `D:\CodeWorkSpace\WorkHealthier`, `D:\CodeWorkSpace\ClaudeCodeGlasses` | Sibling AIUI projects (Studio import loop, simulator facts, more platform notes in their `CLAUDE.md`) |
| `C:\Users\yui\.claude\skills\rokid-aiui-agent` | The Skill with the validators; AIUI docs clone at `D:\CodeWorkSpace\AIUI` |

## Change → check loop

1. `npm test` and
   `python C:/Users/yui/.claude/skills/rokid-aiui-agent/scripts/validate_aiui_project.py agent --repository-root . --target-version 0.17.0 --strict` (silent, exit 0 = pass).
2. `npx --yes --package @yodaos-pkg/aix-cli@0.8.2 aix pack agent -o artifacts/eye-break.aix`, then `aix preview agent --html-out artifacts/preview.html`, serve `artifacts/` with `python -m http.server <port> --directory artifacts` and open it in the browser pane. Keep that tab **in the foreground**. Stop the server afterwards. Manual pause tests with 8-second clips are unreliable because tool latency exceeds the clip: use `node scripts/prepare-videos.js --placeholder 2 --seconds 45` for testing and regenerate the 8-second ones before committing.
3. Studio: **always the international version `https://aiui-global.rokid.com/`, never the domestic `aiui.rokid.com`** (the user's rule, 2026-10-19; also in Claude memory). The repository is `https://github.com/cnYui/EyeBreak` (public, `main`); import `https://github.com/cnYui/EyeBreak/tree/main/agent` via the New Agent menu → GitHub import (fourth item), then on the AIUI CODING tab send `/debug run pages/eye/index` and open the Simulator tab. Re-importing the same URL updates the project. The steps are also in `README.md`.
4. Sign-in: the built-in browser pane could not sign in to Rokid; the user's real Chrome is signed in, so drive Studio with Claude in Chrome. Never enter credentials.

## Facts learned while building (2026-10-19)

- AIUI's `<video>` plays only progressive MP4 with H.264 (and optional AAC): no HLS or DASH, no streaming-site links. Properties used: `src` (a bundled path such as `/assets/videos/relax-1.mp4`, or an HTTPS URL), `autoplay`, `muted`, `volume="0"`, `object-fit`; events `bindtimeupdate`, `bindended`, `binderror`. It pauses and resumes by itself with page visibility. The `timeupdate` payload is read from `event.currentTime` or `event.detail.currentTime` (the official sample uses `detail`).
- **Look up the video control when you use it**: `wx.createVideoContext('player')` inside the handler, as AIUI's own sample does. A context cached once at start-up was `null` in the web preview (and `onReady` logged nothing there), so "pause" only changed the label while the video kept playing.
- In the web preview a bundled clip plays, pauses, resumes and ends; setting `src` to `''` unloads it, which the Page does on the list screen.
- Dynamic inline `style="{{expr}}"` and percentage positions work in the Ink runtime; long single-line text is not clipped by `text-overflow: ellipsis`, so every string is held to a width budget in `agent/lib/text.js` and the tests check all texts.
- The preview cannot show the compact 448 × 150 card layout.
- `<image src="/assets/eye.png">` works in the web runtime and Studio simulator, and `aix pack` includes it. The agent icon itself is **not** part of the source: it is uploaded in Studio on the Real-device debug tab (Basic information → Agent icon → Change icon), where name, category, intent description and Package and save also live; icons must not be blurry, stretched, inverted, black, watermarked, or a plain colour (with or without text).
- Studio simulator (international): the Page runs in a portrait frame (about 4:5), not 480 × 352. The `/debug` chat message shows no reply bubble, but opening the Simulator tab shows the Page already running. The temple buttons (Tap, Double tap, Swipe forward, Swipe back) map to `Enter`, host exit, `ArrowUp`, `ArrowDown` as in the sibling projects; wait about two seconds between presses.
- Studio "Package and save" (real-device debug tab) builds the AIX in the browser, then calls `.../metis/agent/updateThirdAgent`. Read the real result by wrapping `XMLHttpRequest` in the page with the Chrome tool (the HTTP status is always 200; the business code is in the body; code 1 = success, 10001 = system exception). **The intent description must be 248 characters or fewer** (246 and 248 saved; 295, 431, 438 and 447 failed with 10001, whatever the characters, although the box shows a 500 limit). Name and custom icon were fine. The agent is saved as `Eye Break`, category Life, cloud version 1.0.9, with a 220-character intent description about silent relaxation videos (the earlier dot-routine description was replaced); after the real clips are added, re-import, check the description still fits and save again. Lessons: Studio can silently reload the form from the cloud (name became `cnYui/BreakTime`, description and icon went blank), so check the form (DOM values via JS plus a screenshot) in a separate step right before pressing Save and never batch the check with the click; each save bumps the cloud version and one click can fire two saves. The Chrome tool's `file_upload` works for the hidden icon input (find the "change icon" file input, then upload by ref).
- The imported project is a draft held in the Studio page ("pending upload") until saved; keep that Chrome tab open if you still need it.
- A safety hook in this environment blocks `rm -rf`; use new names instead of deleting.
- Ink conventions inherited from the sibling projects: no `ink:for`, static class on the `<page>` root, dynamic classes on views, `@media` rules are single-class selectors, QuickJS (`Date.now()` only, no `?.` / `??` in `agent/`).

## Safety rules for this project

- It is a relaxation aid, never a treatment: no wording in the UI, AGENTS.md, README or the Studio form may claim it cures, prevents, diagnoses or improves an eye condition or eyesight, or give medical advice. Do not copy the source videos' titles or descriptions.
- **Silent by design**: no speech, no audio API, no background music. `tests/player.test.js` fails if the Page uses `speechSynthesis` or any audio API or drops `muted` / `volume="0"`, and `tests/videos.test.js` fails if a clip has an audio track.
- Never commit the user's unprocessed source videos (`videos/` is git-ignored), and only commit clips the user has said they may redistribute. Mention the rights issue again whenever real clips are added.
- Before adding real clips, look at them for flashing or strobing content; never add such content.
- The Page is offline: no permissions, no network, nothing leaves the glasses.

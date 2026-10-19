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
| `tests/` | `npm test` (Node 20+, `node --test`) |
| `artifacts/` | Ignored by git: `aix pack` output and the preview page |
| `D:\CodeWorkSpace\WorkHealthier`, `D:\CodeWorkSpace\ClaudeCodeGlasses` | Sibling AIUI projects (Studio import loop, simulator facts, more platform notes in their `CLAUDE.md`) |
| `C:\Users\yui\.claude\skills\rokid-aiui-agent` | The Skill with the validators; AIUI docs clone at `D:\CodeWorkSpace\AIUI` |

## Change → check loop

1. `npm test` and
   `python C:/Users/yui/.claude/skills/rokid-aiui-agent/scripts/validate_aiui_project.py agent --repository-root . --target-version 0.17.0 --strict` (silent, exit 0 = pass).
2. `npx --yes --package @yodaos-pkg/aix-cli@0.8.2 aix pack agent -o artifacts/eye-break.aix`, then `aix preview agent --html-out artifacts/preview.html`, serve `artifacts/` with `python -m http.server <port> --directory artifacts` and open it in the browser pane. Keep that tab **in the foreground**. Stop the server afterwards.
3. Studio import needs its own GitHub repository (`https://github.com/<owner>/<repo>/tree/main/agent`); this folder is not a git repository yet. The import loop is in the WorkHealthier `CLAUDE.md`.

## Facts learned while building (2026-10-19)

- Dynamic inline `style="{{expr}}"` works in the Ink runtime (as a whole string or mixed with literal text), and so do percentage `left`/`top` on an absolutely positioned view inside a flex-grown parent, and `border-radius` circles. The dot is a zero-size anchor at `left/top: x%` with the circle inside at negative offsets, which avoids `transform`.
- `setData` at 33 ms ran at about 30 fps in the web preview (worst gap 34–58 ms). A **hidden** browser pane throttles timers: the first prototype run reported 1 fps with a 7,979 ms gap until the tab was fronted. `requestAnimationFrame` is 0.18 only, so the Page uses `setInterval` and computes positions from elapsed time, not from frame counts.
- Long single-line text is not clipped by `text-overflow: ellipsis` (see ClaudeCodeGlasses); every string here is held to a width budget in `agent/lib/text.js` and the tests check all texts.
- The preview has no way to show the compact 448 × 150 card layout.
- Voice: `speechSynthesis.speak` is called, the web host answers `speech.speak is not configured` (info-level, harmless).
- A safety hook in this environment blocks `rm -rf`; use new names instead of deleting.
- Ink conventions inherited from the sibling projects: no `ink:for`, static class on the `<page>` root, dynamic classes on views, `@media` rules are single-class selectors, QuickJS (`Date.now()` only, no `?.` / `??` in `agent/`).

## Safety rules for this project

- It is a relaxation routine, never a treatment: no wording in the UI, AGENTS.md or README may claim it cures, prevents, diagnoses or improves an eye condition, or give medical advice.
- Keep the routine slow and short: the dot's speed is capped by a test (270 px/s), steps start and end at the centre, and the first screen keeps the "sit still, stop if dizzy" note.
- The routine only starts from a tap or an explicit `autostart`, and pauses whenever the Page is hidden.
- Never add flashing, rapid movement or high-contrast strobing.
- The Page is offline: no permissions, no network, nothing leaves the glasses.

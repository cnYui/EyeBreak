# Eye Break

A small player of **silent relaxation videos** for Rokid Glasses (AIUI 0.17, monochrome green, 480 × 352), for the moment your eyes feel tired after a long time at a screen. The first screen lists the videos; pick one and it plays, muted, until it ends. There is no sound and no background music anywhere in the app.

> This is a relaxation aid, not a medical treatment. It does not diagnose, treat or prevent any eye condition and makes no claim about eyesight. Sit still while you use it; do not use it while walking or driving. Stop if you feel dizzy, nauseous or any pain, and see an eye-care professional if discomfort persists.

Status: **the player is built and was checked in unit tests, the AIX browser preview and (for the earlier dot version only) the Studio simulator. The two clips that ship right now are synthetic test patterns, not the real videos.** The real clips are added with `scripts/prepare-videos.js` (see [Adding the videos](#adding-the-videos)). Nothing has been run on glasses.

History: the first version of this project was a guided dot-following routine. It was dropped on request; the video player replaced it (its code is in the git history).

## How to use it

| Where | Tap | Swipe (either way) | Double tap |
| --- | --- | --- | --- |
| List | Play the focused video | Move the focus (wraps around) | Exit (host default) |
| Playing | Pause / resume | Back to the list | Exit (host default) |

The key mapping (tap = `GlobalHook` then `Enter`, swipes = `ArrowUp` / `ArrowDown`) comes from measurements in the sibling WorkHealthier project and was confirmed for this project in the Studio simulator for the earlier version; it is unverified on glasses.

While a video plays, nothing is drawn over it except, for the first four seconds and whenever it is paused, a one-line control hint and the position (`0:12 / 3:05`); a paused video also shows `PAUSED`. When the video ends the app returns to the list and says `Finished`. If a video cannot be played it returns to the list and says so. Leaving the Page (hide) pauses the video (the `<video>` component does this by itself).

Optional parameter when the agent is opened: `video: 2` plays the second video right away.

## Adding the videos

The Page plays what is listed in `agent/lib/videos.js`, which is generated. `<video>` in AIUI plays only progressive MP4 with H.264 (no HLS, no streaming sites), so source videos have to be converted. Needs `ffmpeg` and `ffprobe` on the PATH.

```bash
# real videos: put the source files in videos/ (git-ignored) and name which is which
node scripts/prepare-videos.js 1=videos/first.mp4 2=videos/second.mp4

# synthetic test clips instead (what is committed now)
node scripts/prepare-videos.js --placeholder 2 --seconds 8
```

Each clip is re-encoded to `agent/assets/videos/relax-N.mp4`: **no audio track at all**, H.264 Main profile, progressive with the index at the front, at most 480 × 352 and 30 fps. The list titles are the neutral `Relax 1`, `Relax 2`, … (up to four videos); no claims are made in the app. `npm test` checks that every listed file exists with the recorded size, is a progressive MP4 and has no sound track.

**Rights:** the videos you add belong to their authors. This repository is public, and a package submitted to the agent store is distributed to users, so only add videos you are allowed to redistribute; the unprocessed sources in `videos/` are never committed.

## Icon

A pixel-art eye that looks up and to the right at a glowing guide dot, drawn in code on a 32 × 32 grid (`scripts/make-icon.js`) and written in three sizes; `node scripts/make-icon.js` regenerates them and a test fails if the committed files drift from the script.

| File | Use |
| --- | --- |
| `assets/icon/eyebreak-icon-512.png` | **The agent icon for AIUI Studio.** Full colour, square, fully opaque, 16 × 16 px blocks. |
| `assets/icon/eyebreak-icon-128.png` | The same at 128 × 128 for small previews. |
| `agent/assets/eye.png` | Shown top right on the Page's first screen. Monochrome green on a transparent background (the display is green-only and black is see-through), 64 × 64 so each art pixel is exactly 2 × 2. Hidden in the compact chat-card layout. |

Studio does not read the agent icon from the repository; it is uploaded on the **Real-device debug** tab, section **Basic information**: *Agent icon* → *Change icon*, a 1:1 image is recommended.

## Test on the glasses

From the AIUI documentation (`craft.en-US.md`, "Debug on Glasses"); these steps have not been carried out for this project yet.

1. In Studio (the international version, https://aiui-global.rokid.com/), open the **Real-device debug** tab for the imported project and fill in *Agent name* (20 characters at most; `Eye Break`), *App category* (required) and *Intent description* (**keep it at 248 characters or fewer**: longer text is rejected by the save call even though the box allows 500); change the icon; then **Package and save**. Real-device debugging is only available after the project is bound to an agent and has been packaged and uploaded.
2. In the Rokid AI app on the phone: **Settings > Developer**, update the glasses resource package, and wait for "Agent resource package downloaded successfully".
3. Say to the glasses: "Leqi, open the Eye Break agent."
4. What to look at: that the list and the pixel eye show, that a video starts by itself, is silent, and looks right on the display (size, brightness against the real scene), tap / swipe / double tap, and that the end of a video returns to the list.

## Try it in AIUI Studio

Use the international Studio, **https://aiui-global.rokid.com/** (sign in with your Rokid account first).

1. Top left, the **New Agent** menu → **GitHub import** (the fourth item).
2. Enter `https://github.com/cnYui/EyeBreak/tree/main/agent` and confirm. The import root is the repository's `agent/` folder. The project opens as a draft marked "pending upload"; the remote source is read-only and nothing is written back to GitHub. Importing the same URL again updates it.
3. On the **AIUI CODING** tab send `/debug run pages/eye/index`, then open the **Simulator** tab. The Page starts in the glasses simulator.
4. The temple buttons on the right drive it: Tap, Double tap, Swipe forward and Swipe back. Wait two seconds between presses.

## Try it without glasses

Needs Node 20+ and nothing to install.

```bash
npm test
npx --yes --package @yodaos-pkg/aix-cli@0.8.2 aix preview agent --html-out artifacts/preview.html
python -m http.server 8767 --directory artifacts      # then open http://127.0.0.1:8767/preview.html
```

In the preview use the on-page buttons or the keyboard: Enter = tap, ↑ / ↓ = swipes. Keep the browser tab in the foreground.

## Layout

```text
agent/                      AIUI Studio import root
  app.json, AGENTS.md       manifest (no permissions), agent identity and safety wording
  pages/eye/index.ink       the only Page: video list and silent player
  lib/player.js             list / player state (focus, pause, position, end, error)
  lib/view.js, text.js      view model and width budgets (long text is cut in JS, not by CSS)
  lib/videos.js             GENERATED list of the bundled clips
  lib/temple.js             temple input arbitration
  assets/videos/            GENERATED silent MP4 clips
  assets/eye.png            the pixel eye shown on the first screen (64 x 64)
assets/icon/                the colour agent icon for AIUI Studio
scripts/prepare-videos.js   converts source videos into the clips and writes the list
scripts/make-icon.js        draws the pixel art and writes the PNG files
tests/                      Node tests (npm test)
videos/                     your source videos (git-ignored, created by you)
```

## Verified

2026-10-19, Windows 11, Node 24, ffmpeg 8.0, `@yodaos-pkg/aix-cli` 0.8.2, AIUI 0.17.0 target:

- `npm test`: passing: the list / player state machine, the view model and every text against its width budget, that the Page mutes the video and uses no speech or audio API, the video manifest (files exist with the recorded size, progressive MP4, no sound track), the icon files, the temple input.
- Strict project validation (`validate_aiui_project.py … --strict`) exit 0; `aix pack` works.
- AIX browser preview (web runtime), with synthetic test clips: the list with the pixel eye; Tap starts a clip and it plays in the 480 × 352 screen; Tap pauses it (the video really stops, `PAUSED` and the hint show) and resumes it; Swipe in the player returns to the list with that video focused; a clip that ends returns to the list with `Finished`. The first attempt at pausing only changed the label and the video kept playing, because the video control was looked up once at start-up; it is now looked up when used, as AIUI's own video sample does.
- Earlier, for the dot version, the Page ran in the international Studio simulator and the agent was saved to the Studio cloud (see `CLAUDE.md` for the save problem and its cause).

## Not verified

- **Real videos**: none have been added yet. Their size, length, picture quality on the display and whether H.264 at 480 × 352 plays smoothly on the glasses are unknown; so is the size limit for a package with videos in it.
- **The video version in AIUI Studio's simulator**, and the agent's Studio cloud record still describes the dot routine until it is updated and saved again.
- **Rokid Glasses hardware**: nothing.
- Muted autoplay on the glasses: the `<video>` tag is `autoplay`, `muted` and `volume="0"` and the clips have no audio, but the host's autoplay behaviour was only seen in the web preview.
- The compact 448 × 150 chat-card layout: written, never viewed.
- Whether watching any video relieves eye discomfort. Nothing here tests that, and the app makes no such claim.

## Limits

- Updates only while the Page is shown: AIUI 0.17 pages do not run in the background, so there are no reminders.
- Up to four videos; progressive MP4 (H.264) only; the package size grows with the clips.

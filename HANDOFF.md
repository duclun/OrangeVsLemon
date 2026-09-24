# HANDOFF: read this first

This is the lead's running handoff. If you are picking this up, follow the vision below and the full design in [PLAN.md](PLAN.md). Keep this file current as you work.

## Vision in one paragraph
A roughly 60-second film on a kitchen counter at sunset. Zest, a small, stubborn lemon, challenges El Naranjo, a loud luchador orange who is the reigning champion. The film starts as **flat cut-paper 2D**, deepens into **2.5D parallax paper layers**, then opens into **outlined toon-shaded 3D**. The final camera move settles behind Zest and becomes a **playable boss fight** with no cut, set in a tiled kitchen with a wooden-counter ring. It should feel warm, handmade, funny and juicy.

## v1.5: reference-inspired look (current work)
Alan asked for v1.5 to take its look, music feel and aesthetics from a reference clip on his machine (`orangevslemon-ref.mp4`, another creator's model test). **The clip is reference only: it is git-ignored and must never be committed, and no frames, audio, melodies, character designs or names from it are reused.** What was learned is written up in our own words in [REFERENCE-NOTES.md](REFERENCE-NOTES.md).

What v1.5 changed (all original, made in code):
- **Look:** soft "vinyl toy" shading instead of hard toon bands (smooth lifted ramp, citrus peel as a physical material with sheen and clearcoat), outlines 40% thinner, neutral tone mapping (fixes the olive lemon), stronger soft bloom, and a display-space grade pass (`GradeShader` in `world3d.js`: lifted warm shadows, window-light haze, vignette).
- **Palette:** high key and pastel. Seafoam square tiles, cream window with washed peach sky, coral curtains, pale birch ring on a dark teal confetti-terrazzo counter, mint gingham jar caps. Acts 1 and 2 were repainted to match.
- **2D→3D:** at the handoff the act 2 drawings become paper standees (white sticker edge) in the 3D room; the camera swings round to show they are flat, then each one pop-inflates into its 3D rig (`paperCard`, `paperToRig` in `game.js`). The rigs sit in world-aligned wrappers (`flatZ`, `flatN`) whose z-scale does the inflate.
- **UI:** comic lettering (`.comic`: italic, lemon-to-orange fill, ink edge, extrude) for FIGHT and the end card; starburst hit words projected from 3D (`ui.pop`, word lists in `game.js`); key-prompt pills that float over the prop (`ui.hint({key,text,x,y})`); pill buttons. Lose card now reads **PULPED…**.
- **Juice:** `fx.burst()` glossy blob splash at the stomp (act 3) and at the K.O.; K.O. now has 1.8 s of slow motion and an orbiting camera round the cheering Zest.
- **Music:** a new original score (A major / F# minor, marimba, pizzicato, glockenspiel, whistle lead, brass stabs, timpani, claps). New `lift` cue: a 4-bar dominant build that lands on the FIGHT bell. Per-section loudness trims. `tools/render-music.mjs` renders every mode to WAV offline for checking.

## Mobile fixes (after v1.5)
Alan saw a WebGL error and a cut-off view on his Pixel 10. Changes:
- **Renderer (`createWorld` in `world3d.js`):** `MOBILE` (coarse pointer or small screen) caps pixel ratio at 1.5 and the shadow map at 1024. The canvas no longer asks for MSAA (it was wasted under the composer); desktop gets 4× MSAA on the composer target instead. Renderer creation retries with softer options and throws a readable message. `halfFloatOK()` probes whether half-float targets are renderable; if not, bloom and the PMREM environment are skipped and the composer uses 8-bit targets (`?lowgl` forces this path). Context loss is handled (`preventDefault`, rendering pauses until restore).
- **Shader:** `GradeShader` had `smoothstep(1.25, 0.0, …)`, which is undefined in GLSL and misbehaves on some phone GPUs. Now `1.0 - smoothstep(0.0, 1.25, …)`.
- **Framing:** `fitCamera()` widens the vertical FOV on screens narrower than 16:9 (capped at 82°), so a phone held upright still sees the fighters. The 2D film letterboxes (contain) below 1.3:1 instead of cropping.
- **Layout:** `100vh` → `100%`, `viewport-fit=cover` with safe-area insets on HUD, top bar and touch controls, tighter controls under 500px height, touch controls only during the fight, a "best played sideways" note on the start card in portrait, and fullscreen + landscape lock on Play for touch devices (refused inside some frames; harmless).
- **Errors on screen:** `#err` now also shows unhandled rejections and three.js WebGL/shader `console.error`s, so a phone user can read out the real message.
- Tested with Chromium Pixel emulation (SwiftShader), portrait 412×915 and landscape 915×360. **Not yet tested on a real Pixel 10**; the original error text is unknown.

## Style rules (non-negotiable)
- **Original designs only.** Zest wears a peel scarf, goggles on the forehead, a band-aid and red sneakers. El Naranjo wears a purple luchador mask with gold flame trim, a champion belt and purple boots. Don't use a headband lemon, and don't give the orange a crown, mustache or monocle. Those belong to the reference video.
- **Palette:** lemon `#ffdc3f` / `#e9b41e`; orange `#ff8f24` / `#dc6a10`; mask purple `#8e2fa6`; gold `#ffd24a`; warm kitchen creams; sage and mint tiles; honey wood.
- **2D:** flat cut-paper shapes, thin warm-brown edges (`#5a3a24`), soft drop shadows between paper layers, and a paper-grain overlay.
- **3D (v1.5):** soft lifted shading (8-step linear toon ramp, peel material on the fruit) plus thin inverted-hull outlines in the same warm brown. High key: lifted warm shadows, soft bloom. Glossy, glass and chrome go only on props, jars, appliances and juice.
- **v1.5 palette additions:** seafoam tile `#cfeae0`, coral `#f0605a`, teal terrazzo `#1f3a3c` with confetti chips, birch `#dcb784`, caramel rail `#c07a3c`, cream `#fbf1e0`.
- The same proportions in every style.
- Juice splats stay on the floor. Hits should feel crunchy: hit-stop, shake, flash.

## How to run
It's static files, with no build step. Serve the repo root and open `index.html`:
```
python3 -m http.server 8000   # then open http://localhost:8000
```
- Three.js 0.170 loads from jsdelivr through an import map, and fonts come from Google Fonts.
- Audio needs one click, which the start screen provides.
- Playable build (private to Alan): https://claude.ai/artifact/AXPEtbGtLBwok1SAHCgJdR

**Debug hooks:**
- `?t=42` starts the film at 42 s.
- `?fight=1` goes straight into the fight.
- `?touch` forces the touch controls on.
- `window.GAME` exposes `{ game, world, sound, T }` (for example `GAME.game.S.boss.hp = 50`).

**Headless screenshots** (Playwright):
```
python3 -m http.server 8765 &
npm i three@0.170.0 playwright-core     # in some scratch dir, then copy tools/shoot.mjs next to its node_modules
node shoot.mjs "index.html?t=30" shots/t30.png "GAME.T > 30.5" ["optional JS to run once GAME exists"]
```
- Cloud container: defaults to SwiftShader (slow, ~5 fps) and serves jsdelivr from `THREE_DIR` because jsdelivr is blocked.
- Alan's Windows machine (fast, real GPU): `THREE_DIR= GPU=1 CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe" node shoot.mjs ...`
- A bot for fight shots: pass JS like `setInterval(()=>{const g=GAME.game; g.input.my=1; g.press('light')},120)` as the 4th argument.
- `node render-music.mjs shots/music` (same setup) writes one WAV per music mode and prints peak/RMS levels.

**Publishing as a claude.ai artifact:** run `python3 tools/build-artifact.py`. It writes `dist/index.html` (the page minus `<!doctype>`/`<html>`/`<head>`/`<body>`, which the artifact adds) and copies `src/*.js` to `dist/src/`. Publish `dist/index.html` with `dist/src/*.js` as supporting files. `dist/` in git always matches the live artifact; rebuild and commit it whenever you republish.

## Code map
| File | What it does |
|---|---|
| `index.html` | DOM overlays and CSS: start card, subtitles, title card, HUD (boss and player bars), banners, end card, touch controls, error box |
| `src/main.js` | Timeline driver: narration and music cues, 2D→3D crossfade (`T_3D`, `T_FADE`), `T_FIGHT = 60`, skip-to-fight (`T_SKIP = 55.6`), input, touch |
| `src/film2d.js` | Acts 1 and 2 on a canvas in a 1600×900 design space. `drawZest` / `drawNaranjo` are the 2D model sheets; `act1` is flat cut-paper, `act2` is the parallax layer system (`layer(d)` with dolly `cam.z`) |
| `src/audio.js` | `Sound`: step sequencer (modes `film1`, `film2`, `film3`, `lift`, `battle`, `boss3`, `win`, `lose`; chord tables in `PROG`, melodies `TUNE_A/B/C`, level `TRIM`), `sfx(name)`, `say(text)` via speechSynthesis with music ducking |
| `src/world3d.js` | Renderer and post-processing, toon ramp, inverted-hull `outline()`, canvas textures (the orange's mask and belt are painted into an equirect map, face at u=0.25), `makeZest()` / `makeNaranjo()` (rig: root → sq (squash) → spin (roll) → body), arena, `FX` (instanced juice, persistent splats, rings, sparks) |
| `src/game.js` | Act 3 camera shots (`shots[]`, blend, anti-clip), `poseZest` / `poseBoss` procedural animation, player controller, boss state machine, props and seeds, hit-stop and shake, lock-on camera |

## Status
- [x] PLAN.md
- [x] Act 1 (flat cut-paper 2D) and act 2 (2.5D parallax). Screenshot-tested at 3, 14, 15 and 30 s.
- [x] Audio engine: music modes, SFX, narration and subtitles. The code runs; the actual sound hasn't been listened to or reviewed.
- [x] 3D world, toon characters with outlines, kitchen arena (subway tiles, butcher-block ring, cinnamon posts, jars, kettle), juice and splats. Screenshot-tested.
- [x] Act 3 shots and a seamless handoff into gameplay. Screenshot-tested at 40, 42, 49 and 56 s.
- [x] Gameplay: player move, jump, dodge, 3-hit combo, spin, grab and throw; boss idle, bash, rolling charge (stuns on the ropes), seed barrage, leap slam with shockwave, phase roars; props restock. Bot-tested: damage lands both ways with no errors.
- [x] HUD, banners, win and lose cards, retry, replay, mute, skip, touch controls (joystick and buttons appear on coarse pointers).
- [x] Focus pause: when the page loses keyboard focus mid-fight (for example when keys go to the chat around the artifact), the fight pauses and shows "Click the game to keep playing" (`setPaused` in `src/main.js`). Smoke-tested headless; not tested on a phone.
- [ ] A full fight played to K.O. The headless sim is too slow, so phase 2 and 3 transitions and the win and lose cards are unverified in a real run.
- [x] v1.5 look, palette, paper-to-3D handoff, comic UI, juice bursts, K.O. slow-mo, new score. Screenshot-tested on Alan's machine at 3, 7, 15, 30, 39, 41.5, 43.2, 44, 47, 48, 59 s, in the fight (bot), on the lose card and at the K.O. The score was rendered offline without errors (levels checked), **but no human has listened to it yet**.
- [x] `dist/` rebuilt and the artifact republished as v1.5 (version 3 of the same link).

## Next up (priority order)
0. **v1.5 review with Alan:** listen to the new score (film1 tempo and the whistle tune are the most subjective), and check the paper-standee inflate reads well at full speed (41–44 s).
1. **Play-test a full fight in a real browser.** Tune boss HP (420), damage numbers and cooldowns so a first win takes about 2–3 minutes. Confirm the phase 2 and 3 banners and music switch, and the win and lose cards.
2. **Act 2→3 transition.** Today it is a crossfade onto a matching 3D frame. The vision is for the paper layers to peel or fly apart into the 3D scene. Try rendering the 2D layers as textured planes in the 3D scene for the last 2 s.
3. **K.O. moment.** Slow-motion final hit, a big juice fountain, and the camera orbiting Zest cheering.
4. **3D Zest polish.** Mouth shapes (grit, O), a stronger rubber-hose stretch on punches, and a clearer goggles silhouette. The lemon still reads slightly olive under the toon ramp.
5. **Mobile.** Confirm the mobile fixes on Alan's Pixel 10 (see above). If the WebGL error persists, get its exact text from the on-screen error box.
6. **Optional Blender pass on Alan's device:** Mantaflow juice splash for the K.O. and the act 3 geysers, rendered to a transparent video and layered in.

## Known bugs / rough edges
- v1.5: the 2D act 2 end frame and the 3D standee frame don't line up exactly, so the 38.3–39.7 s crossfade shows two compositions briefly.
- v1.5: in the fight camera the chrome kettle on the back counter looms large on the left; consider moving it further back.
- The act 3 handoff camera briefly sits close behind Zest (around 55.5–57 s) before the gameplay camera settles. The anti-clip keeps it outside him, but it could frame better.
- `sfx('warn')` in `bashWind` uses a timing check (`B.st < dt*1.5`) that can fire twice or not at all at odd frame rates. It should be a flag.
- Seeds that land become props (capped at 12). If the ring fills up, the hints may point at pips more often than at better props.
- Speech-synthesis voices differ by OS. On some systems there is no voice, and only subtitles show.

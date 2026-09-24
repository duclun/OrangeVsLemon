# HANDOFF: read this first

This is the lead's running handoff. If you are picking this up, follow the vision below and the full design in [PLAN.md](PLAN.md). Keep this file current as you work.

## Vision in one paragraph
A roughly 60-second film on a kitchen counter at sunset. Zest, a small, stubborn lemon, challenges El Naranjo, a loud luchador orange who is the reigning champion. The film starts as **flat cut-paper 2D**, deepens into **2.5D parallax paper layers**, then opens into **outlined toon-shaded 3D**. The final camera move settles behind Zest and becomes a **playable boss fight** with no cut, set in a tiled kitchen with a wooden-counter ring. It should feel warm, handmade, funny and juicy.

## Style rules (non-negotiable)
- **Original designs only.** Zest wears a peel scarf, goggles on the forehead, a band-aid and red sneakers. El Naranjo wears a purple luchador mask with gold flame trim, a champion belt and purple boots. Don't use a headband lemon, and don't give the orange a crown, mustache or monocle. Those belong to the reference video.
- **Palette:** lemon `#ffdc3f` / `#e9b41e`; orange `#ff8f24` / `#dc6a10`; mask purple `#8e2fa6`; gold `#ffd24a`; warm kitchen creams; sage and mint tiles; honey wood.
- **2D:** flat cut-paper shapes, thin warm-brown edges (`#5a3a24`), soft drop shadows between paper layers, and a paper-grain overlay.
- **3D:** toon ramp (4 steps) plus inverted-hull outlines in the same warm brown. Glossy and glass materials go only on props, jars and juice.
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

**Headless screenshots** (Playwright with SwiftShader; slow, about 5 fps):
```
python3 -m http.server 8765 &
npm i three@0.170.0 playwright-core     # in some scratch dir; set THREE_DIR in tools/shoot.mjs
node tools/shoot.mjs "index.html?t=30" shots/t30.png "GAME.T > 30.5"
```
The harness serves jsdelivr requests from the local `node_modules/three`, because the cloud container blocks jsdelivr.

**Publishing as a claude.ai artifact:** run `python3 tools/build-artifact.py`. It writes `dist/index.html` (the page minus `<!doctype>`/`<html>`/`<head>`/`<body>`, which the artifact adds) and copies `src/*.js` to `dist/src/`. Publish `dist/index.html` with `dist/src/*.js` as supporting files. `dist/` in git always matches the live artifact; rebuild and commit it whenever you republish.

## Code map
| File | What it does |
|---|---|
| `index.html` | DOM overlays and CSS: start card, subtitles, title card, HUD (boss and player bars), banners, end card, touch controls, error box |
| `src/main.js` | Timeline driver: narration and music cues, 2D→3D crossfade (`T_3D`, `T_FADE`), `T_FIGHT = 60`, skip-to-fight (`T_SKIP = 55.6`), input, touch |
| `src/film2d.js` | Acts 1 and 2 on a canvas in a 1600×900 design space. `drawZest` / `drawNaranjo` are the 2D model sheets; `act1` is flat cut-paper, `act2` is the parallax layer system (`layer(d)` with dolly `cam.z`) |
| `src/audio.js` | `Sound`: step sequencer (modes `film1`, `film2`, `film3`, `battle`, `boss3`, `win`, `lose`), `sfx(name)`, `say(text)` via speechSynthesis with music ducking |
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
- [x] A full fight played to K.O. Headless-verified on v2 2026-09-24 (playwright + swiftshader, file:// build): fight starts at 420/100 HP with 10 props incl. 2 blueberry + 1 chocolate chunk; phase 2 banner "ROUND 2: PIP STORM" and phase 3 banner "FINAL ROUND: PULP SPLASH" both fire with the `roar` state; music switches battle → boss3 → win; K.O. lands mode `won`, 1.4 s of 0.22x slow-mo, big `fx.burst` + juice fountain; win card "K.O.!" and lose card "SQUEEZED!" render with stats; R-key retry resets to 420/100; touch layout on coarse-pointer mobile shows joystick + GRAB/SPIN/DODGE/JUMP/PUNCH. Zero JS errors across all runs. (Headless swiftshader runs ~10x slow, so timings were verified via game-state, not wall clock.)

## Next up (priority order)
1. **Real-device play-test.** Headless verification is done (see above); still untested on a physical phone: touch feel, performance (consider shadows to 1024 and bloom off on coarse pointers), and a full organic fight to K.O. in a real browser at full speed.
2. **Act 2→3 transition.** Today it is a crossfade onto a matching 3D frame. The vision is for the paper layers to peel or fly apart into the 3D scene. Try rendering the 2D layers as textured planes in the 3D scene for the last 2 s.
3. **K.O. camera orbit.** Slow-mo, fountain, burst and stinger are in and verified; the camera orbit around cheering Zest is still open.
4. **3D Zest polish.** Mouth shapes (grit, O), a stronger rubber-hose stretch on punches, and a clearer goggles silhouette. The lemon still reads slightly olive under the toon ramp.
5. **Optional Blender pass on Alan's device:** Mantaflow juice splash for the K.O. and the act 3 geysers, rendered to a transparent video and layered in.

## v2 (branch `build/v2`, started 2026-09-24)
Reference: the Opus Lemon vs Orange clip Alan shared — local copy `~/workspace/orange-vs-lemon/ref/orangevslemon-ref.mp4` (87 s, pulled from his Drive; from https://www.youtube.com/watch?v=2WyFHZ6lkWE). Used for technique, mood, assets and music direction only — character designs stay original per the style rules above (no headband, no mustache/monocle/crown). The clip is effectively silent, so the v2 battle theme is an original composition in a bouncy cartoon-fight spirit.
v2 changes so far:
- Red-gingham jar lids on the background jars (reference kitchen signature).
- New props: blueberry (pops with blue juice) and chocolate chunk (stuns); 10 props at fight start, both in the restock pool.
- `fx.burst`: big white impact flash + shock ring + juice on every hit (reference's crunchy hit feel).
- K.O.: 1.4 s of 0.22x slow-motion, juice fountain, big burst, and a `ko` stinger (descending boom + splash + bell). Camera orbit around cheering Zest still open.
- New `battle`/`boss3` arrangement: marimba-ish triangle lead playing an original 4-bar melody over a walking bass (148/164 BPM kept).

### v2 verification (2026-09-24, headless playwright + swiftshader, file:// build of this branch)
- Fight start: mode `fight`, boss 420 HP / player 100 HP, 10 props (2 blueberry, 1 chocolate chunk in the mix), `battle` music, red-gingham lids visible. Screenshot-verified.
- Phase 2 at 277 HP: banner "ROUND 2: PIP STORM" + "He spits seeds now. Throw them back!", boss `roar` state, music stays `battle`.
- Phase 3 at 138 HP: banner "FINAL ROUND: PULP SPLASH", music switches to `boss3`. Impact flash (`fx.burst` starburst + shock ring + juice) screenshot-verified.
- K.O.: final hit → mode `won`, boss `dead`, slowmo 1.4 s at 0.22x, big burst + 6× juice fountain, `win` music, juice fountain continues while `endT < 1.6`. Screenshots of the slow-mo hit and fountain look right.
- End cards: "K.O.!" with stats (time, hits, HP left) and "SQUEEZED!" both render; "Fight again"/"Watch the film" buttons present; R key retries to a fresh 420/100 fight.
- Touch: coarse-pointer mobile emulation shows the joystick + GRAB/SPIN/DODGE/JUMP/PUNCH buttons; `#keys` legend hidden; portrait layout screenshot-verified.
- Zero JS errors across the full run. Note: swiftshader runs ~10x slow, so slow-mo/fountain/card timings were asserted on game state, not wall clock.

## Known bugs / rough edges
- The act 3 handoff camera briefly sits close behind Zest (around 55.5–57 s) before the gameplay camera settles. The anti-clip keeps it outside him, but it could frame better.
- `sfx('warn')` in `bashWind` uses a timing check (`B.st < dt*1.5`) that can fire twice or not at all at odd frame rates. It should be a flag.
- Seeds that land become props (capped at 12). If the ring fills up, the hints may point at pips more often than at better props.
- Speech-synthesis voices differ by OS. On some systems there is no voice, and only subtitles show.

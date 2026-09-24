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
Three.js loads from jsdelivr through an import map. Audio needs one click, which the start screen provides.

Headless test: `node tools/shoot.mjs` (Playwright) saves screenshots of each act and of gameplay to `shots/`.

## Status
See the checklist below. It's updated as work lands.

- [x] PLAN.md
- [x] `src/film2d.js`: acts 1 and 2 (2D and 2.5D)
- [x] `src/audio.js`: synthesized music, SFX and narration
- [ ] `src/game3d.js`: 3D scene, characters, arena
- [ ] Act 3 camera shots and the handoff blend
- [ ] Gameplay: player, boss phases, props, juice, splats
- [ ] `index.html` and `src/main.js`: timeline, subtitles, HUD, skip, mute, touch controls
- [ ] Headless test pass

## Next up (priority order)
1. Finish everything above to a playable, tested first version.

## Known bugs
None recorded yet.

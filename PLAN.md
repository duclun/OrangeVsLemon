# Orange vs Lemon: plan

This is a short animated film that turns straight into a playable 3D boss fight. It starts as flat 2D cartoon, deepens into 2.5D parallax, and opens into toon-shaded 3D. At the end the film camera settles behind the hero and you take control with no cut.

The screenshots from the reference video were used only for technique and mood: outlined toon 3D, a kitchen arena, splats that stay on the floor, and props you can grab. All characters, names and assets here are original.

---

## 1. Characters

### Zest (the player): a small, scrappy lemon
- **Silhouette:** an upright lemon, taller than wide, with a tip nub on top and one leaf that works like a cowlick.
- **Costume:** a peel-strip scarf in yellow-green with a fluttering tail, aviator goggles pushed up on the forehead, a band-aid on one cheek, and red sneakers.
- **Limbs:** rubber-hose arms and legs in the 1930s cartoon style, with white gloves.
- **Personality:** small, sour and stubbornly brave. Default faces are happy, fierce (angled brows, gritted teeth) and shocked.
- **3D build:** a lathe-profile body, with the radius profile `0.52 * (1 - u²)^0.6` plus a nub. The skin uses a toon material with a pore bump map. Eyes, goggles, scarf and limbs are primitives, and every part gets an inverted-hull ink outline.

### El Naranjo (the boss): a luchador orange
- **Silhouette:** a big round orange, about 1.7 times Zest's height, with short thick legs and big gloved fists.
- **Costume:** a purple luchador mask over the top half, with gold flame trim, a gold forehead stripe and white-rimmed eye holes. The stem and leaves poke through the top. He wears a championship belt with a gold plate and a citrus-segment emblem, taped wrists and purple wrestling boots.
- **Personality:** undefeated, unpeeled and unbearably loud. Faces are smug (half-lidded), roaring (mouth wide) and dizzy (when stunned).
- **3D build:** a sphere body whose color map is painted on a 1024×512 canvas: mask, trim, eye holes and belt band, placed with equirect UVs so the face centers at u = 0.25. Eyeballs, purple eyelids, a crescent grin, the belt plate, stem, leaves and limbs are separate meshes, all outlined.
- **Title bar:** "EL NARANJO — Undefeated Heavyweight of the Juicer Ring"

---

## 2. Story and timeline (about 60 s, then gameplay)

| Time | Act and style | What happens | Narration |
|---|---|---|---|
| 0–4 s | Act 1, flat 2D | A kitchen at sunset: window, hanging pans, a wooden counter. Zest walks in along the counter. | "Every evening, when the kitchen goes quiet, the fruit bowl holds its championship." |
| 4–9 s | Act 1 | The camera pushes in. Zest hops and waves. | "This is Zest. Small. Sour. Stubbornly brave." |
| 9–13 s | Act 1 | The room darkens and a shadow falls. | "And this… is the champion." |
| 13–17 s | Act 1 | El Naranjo drops from the fruit bowl with a squash landing, dust puffs and screen shake. Zest recoils. He flexes and roars. | "El Naranjo. Undefeated. Unpeeled. Unbearably loud." |
| 17–22 s | Act 1 | Standoff with speed lines. He points and Zest raises fists. An iris wipe leads to act 2. | |
| 22–31 s | Act 2, 2.5D | The same kitchen is split into depth layers: sky and hills, the wall and window, back-counter jars and kettle, the ring floor with cinnamon-stick posts and twine ropes, the characters, and blurred foreground herbs. The camera dollies and pans for real parallax, and the fighters circle each other in depth. | "Nobody had ever lasted a round with him." / "But Zest had trained all summer, and wasn't here to last." |
| 31–36 s | Act 2 | First clash: they dash in, a flash, a juice burst, both knocked back. | |
| 36–40 s | Act 2 to 3 | The dolly speeds up, the layers fly past, and the 2D canvas fades over a matching 3D frame. | |
| 40–45 s | Act 3, 3D | The same composition in toon 3D. The camera pulls back to show the glass juicer ring on the counter. | "Tonight, the counter becomes the ring." |
| 45–51 s | Act 3 | The camera orbits El Naranjo. He roars and slams the floor, and juice geysers erupt around the ring. | "Only one fruit walks away unsqueezed." |
| 51–57 s | Act 3 | A push-in on Zest's face, then the camera swings behind Zest. | "Your move, Zest." |
| 57–60 s | Handoff | The film camera blends into the gameplay follow-camera. The HUD fades in, "FIGHT!" appears, and input is enabled. | |

A **Skip** button (or Enter) jumps to the handoff.

**Style rules that keep it cohesive:**
- One ink color (`#2b1a10`) is used for 2D outlines and for the 3D inverted hulls.
- One palette across all three acts: lemon `#ffdc3f` / `#e9b41e`, orange `#ff8f24` / `#dc6a10`, mask purple `#8e2fa6`, gold `#ffd24a`, and sunset wall tones.
- Proportions and costume details match exactly between the 2D drawings and the 3D models.
- Act 1 has a paper-grain overlay. Act 2 adds depth fog, soft gradients on the characters, and foreground blur. Act 3 uses toon shading with a 4-step gradient ramp, light bloom and a vignette.

---

## 3. The boss fight

**Arena:** a round glass juicer ring about 25 m across in game units, sitting on a marble kitchen counter. Eight cinnamon-stick posts hold red-and-white baker's-twine ropes. The background is the kitchen wall and a window with an emissive sunset, glossy glass jars with gingham lids, copper pans and a chrome kettle, all lit by an environment map.

**Camera:** a lock-on third-person view. It sits behind Zest on the line from the boss through Zest and looks at a point between the two. Movement is relative to that line, so strafing circles the boss.

**Controls:**
| Action | Keyboard / mouse | Touch |
|---|---|---|
| Move | WASD | Left virtual stick |
| Jump | Space | A button |
| Light attack (3-hit rubber-hose combo) | Left click / J | Punch button |
| Heavy attack (spin) | Right click / K | Spin button |
| Dodge roll (brief invulnerability) | Shift | Dodge button |
| Grab or throw a prop | E | Grab button |

**Player:** 100 HP. The light combo does 8, 8, then 14 damage. The heavy spin does 22. Throws use an auto-aimed ballistic arc toward the boss. Zest can pick up props and kick them around by running into them.

**Props:** sugar cubes (14 damage and a short stun), coffee beans (9), raspberries (11, with red splats), ice cubes (16 and slow the boss). Seeds from the boss's barrage land and become props you can throw back. New props drop from above whenever fewer than six are left.

**El Naranjo:** 420 HP, three phases, with a roar transition at 66% and 33% (a banner, geysers, and a music change).
1. **Phase 1, "The Champ":** a waddling approach, a **Clothesline** overhead smash up close, and the **Rind Roll**, a telegraphed rolling charge. If the charge hits the ropes he bounces off and is stunned for 2 s and takes 1.5 times damage.
2. **Phase 2, "Pip Storm":** adds the **Pip Barrage**, where he hops back and fires three fans of seeds. The seeds that land become ammo.
3. **Phase 3, "Pulp Splash":** adds a flying elbow drop. A ring marks where he will land, he leaps, and the landing sends out an expanding juice shockwave you must jump over. Afterwards he is stuck for a moment. He also moves faster and chains two Rind Rolls.

**Feel:** hit-stop of 60 to 90 ms, camera shake, white hit flashes, starburst sprites, juice particles in the fruit's color, and splats that stay on the floor (up to about 160). Rubber-hose limbs stretch on punches, with squash and stretch on jumps and landings.

**UI:** a chunky boss bar at the top with name, title and phase notches. Zest's bar is bottom-left, and control hints bottom-right fade out after a few seconds. There are win ("K.O.! Zest is the new champ", with time and hits) and lose ("SQUEEZED", with retry) screens, and a mute toggle.

**Music (synthesized):** a pizzicato cartoon cue for act 1, strings and bass for act 2, and a slow pulse for act 3. The battle loop runs at 148 bpm and rises to 164 bpm in phase 3. There are also win and lose cues.

---

## 4. Assets and how each is made

Everything is generated in code or made fresh; nothing is copied from the reference video.

| Asset | How it's made (browser build) | Upgrade path |
|---|---|---|
| Zest and El Naranjo in 2D | Procedural canvas vector drawing (**built**, `src/film2d.js`) | Hand-drawn in Krita or Inkscape, or animated in Blender Grease Pencil |
| Zest and El Naranjo in 3D | Three.js primitives and a lathe, toon material, inverted-hull outlines | Sculpt in Blender, bake pore normals, export glTF |
| Citrus skin | Canvas-generated pore bump map, plus the painted mask and belt color map | Blender Principled BSDF with subsurface, Voronoi bump and a waxy clearcoat |
| Kitchen (2D and 2.5D layers) | Procedural canvas (**built**) | Painted layers |
| Arena, counter, jars, pans, kettle | Three.js geometry, canvas marble and gingham textures, a RoomEnvironment reflection map | CC0 models from Poly Haven or Kenney, CC0 HDRIs from Poly Haven |
| Props (sugar, bean, raspberry, ice, seed) | Three.js primitives with physical materials | Blender models |
| Juice particles and splats | Instanced spheres with physics; splats are decals from a canvas blob texture | **Prerendered Mantaflow liquid** in Blender for the act 3 geysers and the K.O. splash, played as video or an image sequence |
| Music and SFX | Web Audio synthesis: sequencer, pads, drums, whooshes, splashes, roars (**built**, `src/audio.js`) | CC0 packs from freesound.org (check each license), or a composer |
| Narration | Browser speech synthesis with subtitles (**built**) | A recorded voice actor, or a TTS service whose license allows it |
| Paper grain and vignette | Procedural canvas (**built**) | |
| Fonts | Google Fonts (a display font for banners, a rounded sans for the UI) | |

---

## 5. Tools

- **In the browser (works in the cloud):** plain HTML plus ES modules, three.js 0.170 from jsdelivr (with EffectComposer, UnrealBloomPass, OutputPass and RoomEnvironment), Canvas 2D, Web Audio and the Speech Synthesis API. There is no build step.
- **Testing:** headless Chromium with Playwright (available in the cloud container), used to screenshot each act and to check that the handoff into gameplay works.
- **Needs Blender on your own device** (via Remote Control in a local folder, with Blender and Blender MCP installed):
  - Mantaflow liquid sims for the juice geysers and the K.O. splash, rendered to video.
  - Hero character renders and sculpted glTF upgrades.
  - Optional Grease Pencil versions of the 2D acts.
- **Also better done locally:** recording narration and choosing licensed audio.

---

## 6. Build steps

1. ✅ Write the character model sheets in code, so 2D and 3D share proportions and palette.
2. ✅ Build the 2D acts (`src/film2d.js`): the flat Flash-style act 1 and the layered 2.5D act 2 with a dolly camera, depth fog, particles, iris wipe and paper grain.
3. ✅ Build the audio engine (`src/audio.js`): per-act music modes, SFX, and narration with music ducking.
4. ⬜ Build the 3D scene and character models (`src/game3d.js`): toon materials, outlines, the arena and lighting.
5. ⬜ Build the act 3 camera shots and the film-to-gameplay camera blend.
6. ⬜ Build gameplay: player controller, boss state machine, props, particles, splats, hit-stop and shake.
7. ⬜ Build the shell (`index.html`, `src/main.js`): start screen (needed to unlock audio), timeline driver, subtitles, HUD, skip, mute, touch controls, win and lose screens.
8. ⬜ Test with headless screenshots at key times, tune colors and timings, then publish as a page.
9. ⬜ Optional Blender pass on your own device: prerendered liquid and hero renders, swapped in as video layers.

## 7. Current state of the repo

- `src/film2d.js` (about 440 lines): acts 1 and 2 are written but have **not been run or tested yet**.
- `src/audio.js` (about 150 lines): music, SFX and narration are written but **not tested yet**.
- Not started: the 3D act, gameplay, the page shell and testing. The build was stopped at Alan's request.

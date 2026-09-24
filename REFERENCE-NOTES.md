# Reference notes for v1.5

These are my observations from a reference clip Alan keeps on his machine (`orangevslemon-ref.mp4`, about 87 s, 1328×530, a screen capture of another creator's model test). **The clip is not in this repo and must never be committed.** Nothing from it is reused: no frames, sprites, audio, stems, melodies, character designs or names. This file describes qualities in my own words so we can aim for the same *feel* with our own cast (Zest and El Naranjo) and our own code-drawn art and synthesized music.

What we deliberately do **not** take: its lemon's headband and its orange's crown, mustache and monocle, its boss's name, its end-card wording, and any tune.

## Structure and pacing (what happens when)
| Time | What the clip does | Takeaway for us |
|---|---|---|
| 0–17 s | Flat, side-on 2D. Characters stand at opposite ends of a long cutting board; the camera is locked orthographic, with quick push-ins and radiating speed lines on the dramatic beats. | Our act 1 already does flat cut-paper. Add speed-line push-ins on the big reveal beats. |
| 17–30 s | The camera starts to **tilt and orbit**, revealing that the flat world has depth: the board is a real slab on a dark speckled counter, and jars stand in space. The characters stay **flat cutouts** standing in 3D for a while. | This is the best idea in the clip. Our 2D→3D should be a *camera* move first (flat cards in a real 3D room), and only then do the characters gain volume. |
| 30–46 s | The characters **inflate** into soft 3D bodies (pebbly citrus skin, bright soft light). Camera sweeps low and wide, with a shallow depth of field and a slow push. | Inflate our paper cards into the 3D rigs on camera, with a soft squash. |
| 46–50 s | A single huge, glossy juice burst (a blobby metaball-like splash), then juice spots stay on the board. | Our K.O. / reveal beat: one oversized, slow juice bloom; splats persist. |
| 50–70 s | Standoff shots from the player-side angle, then a chunky comic **"FIGHT!"** word pops in over the ring. | Keep our seamless handoff; restyle the FIGHT banner. |
| 70–87 s | Gameplay: third-person over-the-shoulder, very wide lens, bloom haze, comic starburst hit words, floor telegraph rings, small key-prompt pills near props, and a big comic lose card with a pill-shaped retry button. | Restyle our HUD and hit FX in this comic direction. |

## Palette (sampled by eye, then rounded; our own values)
- **Walls:** pale mint/seafoam tile grid with thin white grout, very desaturated (around `#cfe6df` to `#b9dcd3`).
- **Window:** creamy peach sky with soft terracotta hills; everything behind glass is washed out and hazy.
- **Accent:** one strong coral/watermelon red (a curtain) is the only saturated cool-scene colour.
- **Counter surround:** near-black teal stone with multicolour confetti speckles (terrazzo). This dark field makes the pale board pop.
- **Ring surface:** pale honey/birch wood with a darker caramel rail framing it.
- **Characters:** the only fully saturated objects in frame. Everything else is pastel or high-key.
- Overall grade: **high key, low contrast, warm whites, lifted shadows**, a light bloom haze that makes bright areas glow.

## Lighting and materials
- 2D section: flat fills, thick dark outlines on characters only, background has no outlines at all.
- 3D section: **soft, bright, almost studio lighting**, big soft shadows, no hard toon bands. Citrus skin has a visible pore bump and a gentle sheen; the look is closer to soft vinyl toys than cel shading.
- Glass jars with a striped fabric lid, one mirror-chrome appliance that reflects the room, a knife block, a potted plant. Glass and chrome are the "expensive" materials; everything else is matte.
- Constant light bloom and a slight lens haze in the gameplay camera; light leaks from the window side.

## Camera language
- Orthographic side-on for 2D, **then a continuous tilt/orbit** that reveals depth (no cut) for the transition.
- Low, wide, slightly fish-eye framing in 3D, with speed lines on fast moves.
- Gameplay camera sits high behind the player and looks down across the ring, so the whole arena reads.

## UI
- Big chunky italic comic words with a yellow-to-orange gradient fill, a thick dark outline and a drop "extrude". Used for FIGHT and the end card.
- Hit feedback: white/yellow starburst with a short comic word inside, popping and fading fast.
- Small rounded "pill" prompts with a key cap icon next to grabbable props.
- End card: huge headline, one line of flavour text, one rounded pill button with the key in brackets.

## Music and sound
The clip's game audio is **very quiet** (peaks around −43 dBFS) under a live stream, so these notes are a rough read from spectrum analysis, not a transcription:
- **Intro (0–35 s):** sparse, light, mostly plucked or percussive tones; slow pulse; plenty of silence around sound effects.
- **3D reveal (35–58 s):** sustained, warm, pad-like chords appear; minor-leaning harmony that **lifts to a brighter, tense dominant** right before the FIGHT word. Pulse around 120 BPM.
- **Gameplay (58 s on):** busier, higher and brighter; the audio here is mostly effects and speech, so the tempo can't be read reliably.
- Mood arc: playful and small → warm and swelling → tense lift → energetic.

**Our approach (original):** keep the same *arc*, but with our own keys, progressions, rhythms and instruments, all synthesized in `src/audio.js`. No melody, chord loop or rhythm from the clip is transcribed.

## What v1.5 changes because of this
See the v1.5 section in [HANDOFF.md](HANDOFF.md) for the implementation status.

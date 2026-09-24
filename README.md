# Orange vs Lemon

A 2D to 2.5D to 3D animated short that turns into a playable boss fight in the browser. See [PLAN.md](PLAN.md).

## Play it on your machine
```
git clone https://github.com/duclun/OrangeVsLemon.git
cd OrangeVsLemon
git checkout build/playable-v1        # until PR #1 is merged into main
python3 -m http.server 8000           # any static server works, e.g. npx serve
# open http://localhost:8000 and click Play (or add ?fight=1 to jump straight into the fight)
```
- **It needs a local server.** Double-clicking `index.html` (a `file://` URL) doesn't work, because browsers block ES module scripts loaded from `file://`.
- **It needs internet access** for three.js (cdn.jsdelivr.net) and Google Fonts. Nothing needs installing, and there is no build step.
- Open the root `index.html`. `dist/` is the artifact copy with no `<html>`/`<head>` wrapper, so it is not meant to be opened directly.
- Click inside the page before using the keys. Controls: WASD move, Space jump, click/J punch, right-click/K spin, Shift dodge, E grab/throw.
- Online version: https://claude.ai/artifact/AXPEtbGtLBwok1SAHCgJdR (private to the owner until shared).
- Version 1.5 takes its look and music feel from a private reference clip; see [REFERENCE-NOTES.md](REFERENCE-NOTES.md). Video files are git-ignored and must not be committed.
- `dist/` holds the exact files published as the artifact (still v1 until it is republished). Rebuild it with `python3 tools/build-artifact.py`.

# Orange vs Lemon

A 2D to 2.5D to 3D animated short that turns into a playable boss fight in the browser. See [PLAN.md](PLAN.md).

## Play it
- **Online:** https://claude.ai/artifact/AXPEtbGtLBwok1SAHCgJdR (private to the owner until shared). Click inside the game before using the keys.
- **Locally:** run `python3 -m http.server 8000` in the repo root and open http://localhost:8000. It needs internet access for three.js and the fonts.
- **`dist/`** holds the exact files published as the artifact. Run `python3 tools/build-artifact.py` to rebuild it from `index.html` and `src/`. It has no `<html>`/`<head>` wrapper because the artifact host adds one, so open the root `index.html` locally, not `dist/`.

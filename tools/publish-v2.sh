#!/bin/bash
# Publish v2 with cache-busting: every local module URL gets ?v=<git-sha> so
# browsers never run a stale cached build after an update.
set -e
REPO=~/workspace/orange-vs-lemon
PUB=~/workspace/orange-vs-lemon-v2-pub
cd "$REPO"
SHA=$(git rev-parse --short HEAD)
BUILD=$(mktemp -d)
cp -r "$PUB"/. "$BUILD"/   # keep .herenow/state.json so version tracking continues
# version every relative module specifier: './x.js' -> './x.js?v=SHA'
for f in "$BUILD"/src/*.js; do
  sed -i -E "s#(from '(\./[^']+\.js)')#from '\2?v=$SHA'#g; s#(from \"(\./[^\"]+\.js)\")#from \"\2?v=$SHA\"#g" "$f"
done
sed -i -E "s#src=\"src/main\.js\"#src=\"src/main.js?v=$SHA\"#" "$BUILD"/index.html
echo "publishing v2 @ $SHA (cache-busted)"
cd ~/workspace/skills/here-now
./scripts/publish.sh "$BUILD" --slug azure-maple-6ykt
rm -rf "$BUILD"

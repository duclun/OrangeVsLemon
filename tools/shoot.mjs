import { chromium } from 'playwright-core';
import fs from 'fs'; import path from 'path';
const [,, page = 'tools/preview.html', out = 'shots/out.png', wait = 'window.READY', act = ''] = process.argv;
// THREE_DIR: serve three.js from a local node_modules (cloud containers block jsdelivr). Leave unset to load from the CDN.
// CHROME: browser binary. On a desktop with a GPU, point it at Chrome and set GPU=1 to skip SwiftShader.
const THREE_DIR = process.env.THREE_DIR ?? '/tmp/claude-0/wk/node_modules/three';
const PORT = process.env.PORT || 8765;
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: process.env.GPU ? ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = []; p.on('console', m => { if (m.type() !== 'log' || /ERR|err/.test(m.text())) logs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
if (THREE_DIR) await p.route(/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.*)/, r => { const rel = r.request().url().replace(/.*three@[^/]+\//, ''); const f = path.join(THREE_DIR, rel);
  fs.existsSync(f) ? r.fulfill({ path: f, contentType: 'application/javascript' }) : r.fulfill({ status: 404 }); });
if (THREE_DIR) await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, body: '', contentType: 'text/css' }));
await p.goto(`http://localhost:${PORT}/` + page);
if (act) { await p.waitForFunction('window.GAME', null, { timeout: 60000 }); await p.evaluate(act); }
try { await p.waitForFunction(wait, null, { timeout: 150000, polling: 200 }); } catch (e) { logs.push('WAIT TIMEOUT'); }
fs.mkdirSync(path.dirname(out), { recursive: true });
await p.screenshot({ path: out });
const st = await p.evaluate(() => window.GAME ? JSON.stringify({ T: GAME.T, mode: GAME.game.S.mode, boss: GAME.game.S.boss.state, bhp: GAME.game.S.boss.hp, php: GAME.game.S.player.hp, props: GAME.game.S.props.length }) : 'nogame');
console.log(out, st); console.log(logs.slice(0, 20).join('\n'));
await browser.close();

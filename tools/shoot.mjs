// Headless screenshot harness. Usage: node tools/shoot.mjs <page> <out.png> [waitExpr] [w] [h]
// CDN requests for three.js are served from a local node_modules if NODE_THREE is set.
import { chromium } from 'playwright-core';
import fs from 'fs'; import path from 'path';
const [,, page = 'tools/preview.html', out = 'shots/out.png', wait = 'window.READY', W = 1280, H = 720] = process.argv;
const THREE_DIR = process.env.NODE_THREE || '/tmp/claude-0/wk/node_modules/three';
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await browser.newPage({ viewport: { width: +W, height: +H } });
const logs = []; p.on('console', m => logs.push(m.type() + ': ' + m.text())); p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
await p.route(/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.*)/, r => { const rel = r.request().url().replace(/.*three@[^/]+\//, ''); const f = path.join(THREE_DIR, rel);
  fs.existsSync(f) ? r.fulfill({ path: f, contentType: 'application/javascript' }) : r.fulfill({ status: 404 }); });
await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, body: '', contentType: 'text/css' }));
await p.goto('http://localhost:8765/' + page);
try { await p.waitForFunction(wait, null, { timeout: 90000 }); } catch (e) { logs.push('WAIT TIMEOUT'); }
fs.mkdirSync(path.dirname(out), { recursive: true });
await p.screenshot({ path: out });
console.log(logs.slice(0, 30).join('\n'));
await browser.close();

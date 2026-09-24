// Renders each music mode offline (OfflineAudioContext in headless Chrome) to WAV files, so the score can be
// checked for errors and levels, or listened to, without playing the film.
//   python3 -m http.server 8765 &   then:   node tools/render-music.mjs shots/music
// Needs playwright-core; set CHROME to a browser binary (see tools/shoot.mjs).
import { chromium } from 'playwright-core';
import fs from 'fs'; import path from 'path';
const out = process.argv[2] || 'shots/music', PORT = process.env.PORT || 8765;
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await browser.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${PORT}/tools/preview.html`).catch(() => {});
const res = await p.evaluate(async () => {
  const { Sound } = await import('/src/audio.js');
  const modes = { film1: 8, film2: 8, film3: 8, lift: 4, battle: 8, boss3: 4, win: 4, lose: 4 }, outRes = {};
  for (const [mode, bars] of Object.entries(modes)) {
    const s = new Sound(); s.mode = mode; const dur = bars * 16 * s.stepDur() + 2, SR = 44100;
    window.AudioContext = function () { return new OfflineAudioContext(2, Math.ceil(dur * SR), SR); };
    const real = window.setInterval; window.setInterval = () => 0; s.init(); window.setInterval = real; s.mode = mode;
    for (let i = 0, t = 0.05; i < bars * 16; i++, t += s.stepDur()) s.playStep(i, t);
    const buf = await s.ctx.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1);
    let peak = 0, sum = 0; const pcm = new Int16Array(L.length * 2);
    for (let i = 0; i < L.length; i++) { const a = L[i], b = R[i]; peak = Math.max(peak, Math.abs(a), Math.abs(b)); sum += a * a;
      pcm[2 * i] = Math.max(-1, Math.min(1, a)) * 32767; pcm[2 * i + 1] = Math.max(-1, Math.min(1, b)) * 32767; }
    let bin = ''; const bytes = new Uint8Array(pcm.buffer); for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode(...bytes.subarray(i, i + 32768));
    outRes[mode] = { peakDb: 20 * Math.log10(peak + 1e-9), rmsDb: 10 * Math.log10(sum / L.length + 1e-12), sr: SR, pcm: btoa(bin) };
  }
  return outRes;
});
fs.mkdirSync(out, { recursive: true });
for (const [mode, r] of Object.entries(res)) {
  const data = Buffer.from(r.pcm, 'base64'), h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(r.sr, 24); h.writeUInt32LE(r.sr * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(out, mode + '.wav'), Buffer.concat([h, data]));
  console.log(mode.padEnd(7), 'peak', r.peakDb.toFixed(1), 'dBFS  rms', r.rmsDb.toFixed(1), 'dBFS');
}
if (errs.length) console.log('ERRORS:', errs.join('\n'));
await browser.close();

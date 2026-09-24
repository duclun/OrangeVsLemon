// All sound is synthesized live with Web Audio: music sequencer, SFX, and narration via speech synthesis.

// Original melodies for v1.5: [step in a 4-bar phrase, semitones above A3, length in steps].
const TUNE_A = [[0, 7, 2], [2, 4, 2], [4, 0, 2], [8, 2, 1], [9, 4, 1], [10, 7, 4], [16, 9, 2], [18, 7, 2], [20, 4, 4], [26, 2, 2],
  [32, 2, 2], [34, 5, 2], [36, 9, 2], [40, 14, 3], [43, 12, 1], [44, 9, 4], [48, 11, 2], [50, 7, 2], [52, 4, 2], [54, 2, 2], [56, -1, 6]];
const TUNE_B = [[0, 9, 2], [6, 12, 2], [12, 16, 2], [16, 14, 2], [22, 12, 2], [28, 9, 2], [32, 12, 2], [38, 16, 2], [44, 19, 2], [48, 16, 2], [54, 14, 2], [60, 11, 2]];
const TUNE_C = [[0, 9, 3], [3, 12, 3], [6, 16, 2], [8, 14, 2], [10, 12, 2], [12, 9, 4], [16, 17, 3], [19, 16, 3], [22, 14, 2], [24, 12, 4], [28, 14, 4],
  [32, 19, 3], [35, 16, 3], [38, 11, 2], [40, 14, 2], [42, 16, 2], [44, 19, 4], [48, 20, 4], [52, 16, 4], [56, 11, 4], [60, 8, 4]];

// Loudness trims so the quiet film sections sit closer to the battle theme (measured with tools/render-music.mjs).
const TRIM = { film1: 2.2, film2: 2.6, film3: 1.3, lift: 1.1, battle: 1, boss3: 1, win: 1.2, lose: 2.6 };

export class Sound {
  constructor() { this.ctx = null; this.mode = null; this.step = 0; this.nextT = 0; this.voice = null; this.muted = false; }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = 0.8;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp).connect(c.destination);
    this.music = c.createGain(); this.music.gain.value = 0.42;
    this.trim = c.createGain(); this.music.connect(this.trim).connect(this.master);   // per-section level trim (see TRIM)
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = 0.9; this.sfxBus.connect(this.master);
    // small room reverb
    const len = c.sampleRate * 1.6, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    this.verb = c.createConvolver(); this.verb.buffer = ir;
    const vg = c.createGain(); vg.gain.value = 0.25; this.verb.connect(vg).connect(this.master);
    this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const nd = this.noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.nextT = c.currentTime + 0.1;
    setInterval(() => this.schedule(), 25);
    const pick = () => { const vs = speechSynthesis.getVoices();
      this.voice = vs.find(v => /en-GB/.test(v.lang) && /male|Daniel|Arthur|George/i.test(v.name)) || vs.find(v => /^en/.test(v.lang)) || null; };
    if ('speechSynthesis' in window) { pick(); speechSynthesis.onvoiceschanged = pick; }
  }

  setMute(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.8; if (m) this.hush(); }

  // ---- music (v1.5 score, all original) ----
  // Arc: playful A-major marimba (film1) -> warm F#-minor strings (film2) -> swelling timpani and arps (film3)
  // -> 4-bar dominant lift into the FIGHT bell (lift) -> driving F#-minor battle theme (battle, boss3 up a semitone).
  setMusic(mode) { if (mode !== this.mode) { this.mode = mode; this.step = 0; if (this.trim) this.trim.gain.setTargetAtTime(TRIM[mode] ?? 1, this.ctx.currentTime, 0.3); } }
  schedule() {
    const c = this.ctx; if (!c) return;
    while (this.nextT < c.currentTime + 0.15) { if (this.mode) this.playStep(this.step, this.nextT); this.nextT += this.stepDur(); this.step++; }
  }
  stepDur() { const bpm = { film1: 104, film2: 96, film3: 112, lift: 112, battle: 150, boss3: 162, win: 126, lose: 70 }[this.mode] || 120; return 60 / bpm / 4; }
  playStep(s, t) {
    const m = this.mode, bar = Math.floor(s / 16), b4 = bar % 4, st = s % 16, sd = this.stepDur();
    const f = n => 440 * Math.pow(2, (n - 69) / 12);
    const MAJ = [0, 4, 7], MIN = [0, 3, 7];
    // chord tables: [root midi, triad]
    const PROG = {
      film1: [[57, MAJ], [54, MIN], [59, MIN], [52, MAJ]],          // A  F#m  Bm  E
      film2: [[54, MIN], [50, MAJ], [57, MAJ], [52, MAJ]],          // F#m D   A   E
      film3: [[54, MIN], [50, MAJ], [57, MAJ], [52, MAJ]],
      lift: [[52, MAJ], [52, MAJ], [52, MAJ], [52, MAJ]],           // E pedal (dominant of A)
      battle: [[54, MIN], [50, MAJ], [52, MAJ], [49, MAJ]],         // F#m D   E   C#
      boss3: [[55, MIN], [51, MAJ], [53, MAJ], [50, MAJ]],          // same, a semitone up
      win: [[57, MAJ], [50, MAJ], [52, MAJ], [57, MAJ]],            // A  D   E   A
      lose: [[54, MIN], [52, MAJ], [50, MAJ], [49, MAJ]],           // F#m E  D   C#
    }[m];
    const [root, q] = PROG[b4];
    const tone = i => root + q[((i % 3) + 3) % 3] + 12 * Math.floor(i / 3);   // i-th chord tone going up

    if (m === 'lose') {
      if (st === 0) this.pad(f(root), t, sd * 16, 0.07, q);
      if (st % 4 === 0) this.marimba(f(tone(6 - st / 4)), t, 0.1);
      return;
    }
    if (m === 'film1') { // playful: marimba arpeggios, plucked bass, a whistled tune every other phrase
      if (st === 0 || st === 8) this.pizz(f(root - 12), t, 0.22); if (st === 6 || st === 14) this.pizz(f(root - 5), t, 0.14);
      const arp = [0, 1, 2, 3, 2, 1, 2, 4];
      if (st % 2 === 0) this.marimba(f(tone(arp[(st / 2) % 8]) + 12), t, st % 4 === 0 ? 0.13 : 0.09);
      if (st % 4 === 2) this.tick(t, 0.035);
      if (Math.floor(bar / 4) % 2 === 1) this.tune(s % 64, t, TUNE_A, 12);
      return;
    }
    if (m === 'film2') { // warmer: string pad, soft pulse bass, glockenspiel counter-line
      if (st === 0) this.pad(f(root), t, sd * 16, 0.07, q);
      if (st % 4 === 0) this.bass(f(root - 12), t, 0.35, 0.14);
      if (st % 4 === 2) this.tick(t, 0.03);
      if (st % 2 === 0) this.marimba(f(tone([0, 2, 1, 2, 3, 2, 1, 2][(st / 2) % 8]) + 12), t, 0.06);
      this.tune(s % 64, t, TUNE_B, 24, 'glock');
      return;
    }
    if (m === 'film3') { // swell: timpani, 16th-note string arps, kick on 1 and 3
      if (st === 0) { this.pad(f(root), t, sd * 16, 0.1, q); this.timpani(f(root - 24), t, 0.5); }
      if (st === 8) this.timpani(f(root - 17), t, 0.3);
      if (st === 0 || st === 8) this.kick(t, 0.45);
      this.pizz(f(tone([0, 1, 2, 3, 4, 3, 2, 1][st % 8]) + 12), t, 0.05 + 0.02 * (bar % 8) / 8);
      if (st % 4 === 2) this.tick(t, 0.04);
      return;
    }
    if (m === 'lift') { // 4 bars on E: rising arpeggio and a snare roll that tightens into the bell
      const k = Math.min(1, s / 64);
      if (st === 0) { this.pad(f(52), t, sd * 16, 0.08 + 0.05 * k, [0, 7, 12]); this.timpani(f(28), t, 0.5); }
      const every = bar === 0 ? 4 : bar === 1 ? 2 : 1;
      if (st % every === 0) this.snare(t, 0.08 + 0.22 * k);
      if (st % 4 === 0) this.kick(t, 0.4 + 0.3 * k);
      this.pizz(f(52 + [0, 4, 7, 11, 12, 16, 19, 23][Math.floor(s / 2) % 8] + 12 * Math.min(1, bar >> 1)), t, 0.05 + 0.05 * k);
      return;
    }
    if (m === 'win') { // fanfare: brass on the downbeats, glock arpeggios, claps
      if (st === 0) { this.pad(f(root), t, sd * 16, 0.08, q); this.brass(f(tone(3)), t, sd * 6, 0.12); }
      if (st === 6 || st === 10) this.brass(f(tone(4)), t, sd * 2, 0.08);
      if (st % 2 === 0) this.glock(f(tone(st / 2 % 6) + 12), t, 0.05);
      if (st % 4 === 0) this.kick(t, 0.6); if (st % 8 === 4) this.clap(t, 0.25);
      return;
    }
    // battle / boss3: four-on-the-floor with a skip, claps on 2 and 4, octave bass, marimba riff, brass stabs, whistled hook
    const hot = m === 'boss3';
    if (st % 4 === 0 || st === 11 || (hot && st === 14)) this.kick(t, st === 11 ? 0.5 : 0.8);
    if (st === 4 || st === 12) { this.clap(t, 0.3); this.snare(t, 0.12); }
    if (st % 2 === 1 || hot) this.tick(t, st % 4 === 2 ? 0.06 : 0.035);
    if (st % 2 === 0) this.bass(f(root - 12 + (st % 4 === 2 ? 12 : 0)), t, 0.11, 0.2);
    const riff = [0, -1, 2, -1, 1, 2, -1, 3, 0, -1, 2, -1, 4, 3, 2, -1];
    if (riff[st] >= 0) this.marimba(f(tone(riff[st]) + 12), t, hot ? 0.1 : 0.08);
    if ((st === 3 || st === 10) && b4 % 2 === 1) this.brass(f(tone(1) + 12), t, sd * 1.5, 0.07);
    if (Math.floor(bar / 4) % 2 === 1 || hot) this.tune(s % 64, t, TUNE_C, hot ? 13 : 12);
  }
  // Play the note of a melody that starts on this step. Melodies are [step, semitones above A3, length in steps] over 4 bars.
  tune(s64, t, notes, shift = 12, voice = 'whistle') {
    for (const [at, n, len] of notes) if (at === s64) {
      const fr = 440 * Math.pow(2, (57 + n + shift - 69) / 12), d = len * this.stepDur();
      if (voice === 'glock') this.glock(fr, t, 0.05); else this.whistle(fr, t, d, 0.06);
    }
  }

  // ---- instruments ----
  marimba(fr, t, v) { this.osc('sine', fr, t, 0.35, v); this.osc('sine', fr * 4, t, 0.06, v * 0.35); this.osc('triangle', fr * 2, t, 0.12, v * 0.2); }
  pizz(fr, t, v) { const c = this.ctx, o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = fr; fl.type = 'lowpass'; fl.frequency.setValueAtTime(fr * 6, t); fl.frequency.exponentialRampToValueAtTime(fr * 1.2, t + 0.12);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o.connect(fl).connect(g).connect(this.music); o.start(t); o.stop(t + 0.3); }
  glock(fr, t, v) { this.osc('sine', fr, t, 0.9, v); this.osc('sine', fr * 2.76, t, 0.25, v * 0.4); const { g } = this.osc('sine', fr, t, 0.9, v * 0.5, this.verb); }
  whistle(fr, t, d, v) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(fr * 0.97, t); o.frequency.exponentialRampToValueAtTime(fr, t + 0.04);
    lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(fr * 0.012, t + Math.min(0.25, d)); lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.03); g.gain.setValueAtTime(v, t + Math.max(0.04, d - 0.05)); g.gain.linearRampToValueAtTime(0, t + d + 0.08);
    o.connect(g); g.connect(this.music); g.connect(this.verb); o.start(t); lfo.start(t); o.stop(t + d + 0.1); lfo.stop(t + d + 0.1); }
  brass(fr, t, d, v) { for (const det of [-9, 9]) { const c = this.ctx, o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = det; fl.type = 'lowpass'; fl.Q.value = 2;
    fl.frequency.setValueAtTime(400, t); fl.frequency.linearRampToValueAtTime(2600, t + 0.05); fl.frequency.exponentialRampToValueAtTime(900, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.08);
    o.connect(fl).connect(g); g.connect(this.music); o.start(t); o.stop(t + d + 0.1); } }
  timpani(fr, t, v) { const { o } = this.osc('sine', fr * 1.5, t, 1.2, v); o.frequency.exponentialRampToValueAtTime(fr, t + 0.08); this.noiseHit(t, 0.25, v * 0.25, 'lowpass', 300); }
  clap(t, v) { for (let i = 0; i < 3; i++) this.noiseHit(t + i * 0.011, 0.09, v, 'bandpass', 1300, 1.2); this.noiseHit(t + 0.03, 0.2, v * 0.4, 'bandpass', 1100, 0.8, this.verb); }
  tick(t, v) { this.noiseHit(t, 0.03, v, 'highpass', 8000); }
  osc(type, freq, t, dur, vol, dest = this.music, attack = 0.005) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05); return { o, g };
  }
  pluck(fr, t, d, v, type = 'triangle') { this.osc(type, fr, t, d, v); }
  lead(fr, t, d, v) { const { o } = this.osc('sawtooth', fr, t, d, v, this.music, 0.03); o.detune.setValueAtTime(0, t); o.detune.linearRampToValueAtTime(20, t + d); const s = this.osc('sine', fr * 2, t, d, v * 0.5, this.verb, 0.03); }
  bass(fr, t, d, v) {
    const c = this.ctx, o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = fr; fl.type = 'lowpass'; fl.frequency.setValueAtTime(900, t); fl.frequency.exponentialRampToValueAtTime(160, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.05);
    o.connect(fl).connect(g).connect(this.music); o.start(t); o.stop(t + d + 0.1);
  }
  pad(fr, t, d, v, q = [0, 3, 7]) {
    for (const iv of q) for (const det of [-7, 7]) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = fr * Math.pow(2, iv / 12); o.detune.value = det; fl.type = 'lowpass'; fl.frequency.value = 1100;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v / 3, t + d * 0.3); g.gain.linearRampToValueAtTime(0, t + d);
      o.connect(fl).connect(g); g.connect(this.music); g.connect(this.verb); o.start(t); o.stop(t + d + 0.1);
    }
  }
  noiseHit(t, d, v, ftype, ff, q = 1, dest = this.music) {
    const c = this.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; fl.type = ftype; fl.frequency.value = ff; fl.Q.value = q;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl).connect(g).connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.05); return { fl, g };
  }
  kick(t, v) { const { o } = this.osc('sine', 150, t, 0.35, v); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.3); }
  boom(t, v) { const { o } = this.osc('sine', 90, t, 0.9, v); o.frequency.exponentialRampToValueAtTime(30, t + 0.8); this.noiseHit(t, 0.5, v * 0.3, 'lowpass', 400); }
  snare(t, v) { this.noiseHit(t, 0.18, v, 'highpass', 1500); this.osc('triangle', 190, t, 0.1, v * 0.5); }
  hat(t, v) { this.noiseHit(t, 0.05, v, 'highpass', 7000); }

  // ---- SFX ----
  sfx(name, vol = 1) {
    const c = this.ctx; if (!c || this.muted) return; const t = c.currentTime, B = this.sfxBus;
    const r = (a, b) => a + Math.random() * (b - a);
    switch (name) {
      case 'jump': { const { o } = this.osc('sine', 300, t, 0.25, 0.25 * vol, B); o.frequency.exponentialRampToValueAtTime(900, t + 0.18); break; }
      case 'land': this.noiseHit(t, 0.12, 0.2 * vol, 'lowpass', 500, 1, B); break;
      case 'whoosh': { const { fl } = this.noiseHit(t, 0.25, 0.35 * vol, 'bandpass', 600, 2, B); fl.frequency.exponentialRampToValueAtTime(3000, t + 0.2); break; }
      case 'hit': { const { o } = this.osc('square', 180, t, 0.12, 0.25 * vol, B); o.frequency.exponentialRampToValueAtTime(60, t + 0.1);
        this.noiseHit(t, 0.08, 0.5 * vol, 'bandpass', 2500, 1, B); this.kickSfx(t, 0.6 * vol); break; }
      case 'heavy': this.sfx('hit', 1.2); this.boomSfx(t, 0.5 * vol); break;
      case 'hurt': { const { o } = this.osc('sawtooth', 500, t, 0.3, 0.18 * vol, B); o.frequency.exponentialRampToValueAtTime(150, t + 0.3); this.noiseHit(t, 0.1, 0.4, 'bandpass', 1800, 1, B); break; }
      case 'splash': for (let i = 0; i < 6; i++) { const tt = t + i * r(0.02, 0.05); const { o } = this.osc('sine', r(500, 1400), tt, 0.08, 0.12 * vol, B); o.frequency.exponentialRampToValueAtTime(r(1500, 2600), tt + 0.06); }
        this.noiseHit(t, 0.3, 0.25 * vol, 'lowpass', 1200, 1, B); break;
      case 'slam': this.boomSfx(t, 1 * vol); this.noiseHit(t, 0.6, 0.5 * vol, 'lowpass', 300, 1, B); break;
      case 'roar': { for (const fr of [80, 83, 120]) { const { o } = this.osc('sawtooth', fr, t, 1.2, 0.12 * vol, B, 0.05); o.frequency.linearRampToValueAtTime(fr * 0.8, t + 1.1); }
        const { fl } = this.noiseHit(t, 1.1, 0.3 * vol, 'bandpass', 400, 3, B); fl.frequency.linearRampToValueAtTime(900, t + 0.5); break; }
      case 'pickup': { const { o } = this.osc('triangle', 600, t, 0.12, 0.2 * vol, B); o.frequency.setValueAtTime(900, t + 0.06); break; }
      case 'throw': this.sfx('whoosh', 0.8); break;
      case 'warn': { const { o } = this.osc('square', 400, t, 0.5, 0.08 * vol, B); o.frequency.linearRampToValueAtTime(900, t + 0.45); break; }
      case 'seed': { const { o } = this.osc('triangle', 1200, t, 0.06, 0.08 * vol, B); o.frequency.exponentialRampToValueAtTime(400, t + 0.05); break; }
      case 'bell': for (const [fr, d] of [[880, 0], [1320, 0.0]]) this.osc('sine', fr, t + d, 1.4, 0.2 * vol, B); this.osc('sine', 660, t + 0.35, 1.4, 0.2 * vol, B); break;
      case 'ui': this.osc('triangle', 1000, t, 0.06, 0.12 * vol, B); break;
      case 'pop': { // paper standee inflating: a rising cork-pop plus a sparkle
        const { o } = this.osc('sine', 220, t, 0.18, 0.35 * vol, B); o.frequency.exponentialRampToValueAtTime(880, t + 0.12);
        this.noiseHit(t, 0.06, 0.25 * vol, 'bandpass', 3000, 2, B);
        for (let i = 0; i < 3; i++) this.osc('triangle', 1760 * Math.pow(1.26, i), t + 0.08 + i * 0.05, 0.2, 0.06 * vol, B); break; }
      case 'dodge': { const { fl } = this.noiseHit(t, 0.18, 0.25 * vol, 'bandpass', 2000, 3, B); fl.frequency.exponentialRampToValueAtTime(500, t + 0.15); break; }
      case 'stun': for (let i = 0; i < 4; i++) this.osc('sine', 1400 + i * 300, t + i * 0.07, 0.15, 0.08 * vol, B); break;
    }
  }
  kickSfx(t, v) { const { o } = this.osc('sine', 160, t, 0.2, v, this.sfxBus); o.frequency.exponentialRampToValueAtTime(45, t + 0.18); }
  boomSfx(t, v) { const { o } = this.osc('sine', 110, t, 0.9, v, this.sfxBus); o.frequency.exponentialRampToValueAtTime(28, t + 0.8); }

  // ---- narration ----
  // Speech synthesis where the browser has it (with at least one voice). Some embedded viewers, like the Android app's
  // WebView, have no speech API or no voices; there the narrator "babbles" instead: a warm, wordless murmur with one
  // syllable-ish blip per word, cartoon style, while the subtitle carries the words.
  hasSpeech() { try { return 'speechSynthesis' in window && speechSynthesis.getVoices().length > 0; } catch (e) { return false; } }
  hush() { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { } }
  say(text) {
    if (this.muted) return;
    if (!this.hasSpeech()) return this.babble(text);
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); if (this.voice) u.voice = this.voice; u.rate = 0.98; u.pitch = 0.9;
      if (this.music) { const g = this.music.gain; g.setTargetAtTime(0.2, this.ctx.currentTime, 0.1); u.onend = () => g.setTargetAtTime(0.42, this.ctx.currentTime, 0.3); }
      speechSynthesis.speak(u); } catch (e) { this.babble(text); }
  }
  babble(text) {
    const c = this.ctx; if (!c) return;
    const words = text.split(/\s+/).filter(w => /\w/.test(w)); if (!words.length) return;
    const bus = c.createGain(); bus.gain.value = 4; bus.connect(this.master); bus.connect(this.verb);   // narrow formant filters eat most of the energy
    let t = c.currentTime + 0.05; const t0 = t;
    const VOW = { a: [730, 1090], e: [530, 1840], i: [390, 1990], o: [570, 840], u: [440, 1020], y: [390, 1990] };
    words.forEach((w, i) => {
      const v = (w.toLowerCase().match(/[aeiouy]/g) || ['a']);
      const syl = Math.min(3, Math.max(1, Math.round(v.length / 1.6)));
      for (let k = 0; k < syl; k++) {
        const d = 0.09 + Math.random() * 0.05, [f1, f2] = VOW[v[k % v.length]] || VOW.a;
        const p = 118 * (1 + 0.12 * Math.sin(i * 1.7 + k)) * (/[?!]/.test(w) && k === syl - 1 ? 1.25 : 1) * (i === words.length - 1 ? 0.85 : 1);
        const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(p * 1.08, t); o.frequency.linearRampToValueAtTime(p * 0.94, t + d);
        const env = c.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(0.22, t + 0.015); env.gain.setTargetAtTime(0, t + d * 0.7, 0.025);
        o.connect(env);
        for (const [f, q, g] of [[f1, 6, 1], [f2, 9, 0.5]]) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
          const gg = c.createGain(); gg.gain.value = g; env.connect(bp).connect(gg).connect(bus); }
        o.start(t); o.stop(t + d + 0.15); t += d + 0.02;
      }
      t += /[.,…]$/.test(w) ? 0.22 : 0.05;
    });
    if (this.music) { const g = this.music.gain; g.setTargetAtTime(0.28, t0, 0.1); g.setTargetAtTime(0.42, t, 0.3); }
  }
}

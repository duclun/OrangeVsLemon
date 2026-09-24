// All sound is synthesized live with Web Audio: music sequencer, SFX, and narration via speech synthesis.

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
    this.music = c.createGain(); this.music.gain.value = 0.42; this.music.connect(this.master);
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

  setMute(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.8; if (m && 'speechSynthesis' in window) speechSynthesis.cancel(); }

  // ---- music ----
  setMusic(mode) { this.mode = mode; }
  schedule() {
    const c = this.ctx; if (!c) return;
    while (this.nextT < c.currentTime + 0.15) { if (this.mode) this.playStep(this.step, this.nextT); this.nextT += this.stepDur(); this.step++; }
  }
  stepDur() { const bpm = { film1: 118, film2: 112, film3: 96, battle: 148, boss3: 164, win: 120, lose: 80 }[this.mode] || 120; return 60 / bpm / 4; }
  playStep(s, t) {
    const m = this.mode, bar = Math.floor(s / 16) % 4, st = s % 16;
    const roots = m === 'win' ? [48, 53, 55, 48] : [50, 46, 53, 48];      // Dm Bb F C  (win: C F G C)
    const quals = m === 'win' ? [[0, 4, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]] : [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]];
    const root = roots[bar], q = quals[bar];
    const f = n => 440 * Math.pow(2, (n - 69) / 12);
    if (m === 'lose') { if (st === 0 && bar % 2 === 0) this.pad(f(root), t, 2.4, 0.08); if (st === 0) this.pluck(f(root + 12 + q[s % 3]), t, 0.5, 0.1); return; }
    if (m === 'film1') { // pizzicato cartoon
      if (st % 4 === 0) this.pluck(f(root - 12), t, 0.25, 0.22);
      if ([2, 6, 10, 14].includes(st)) this.pluck(f(root + q[(st >> 1) % 3]), t, 0.15, 0.13);
      if (st === 7 || st === 15) this.pluck(f(root + 12 + q[st % 3]), t, 0.12, 0.08, 'square');
      if (st % 8 === 4) this.hat(t, 0.04);
      return;
    }
    if (st === 0) this.pad(f(root), t, this.stepDur() * 16, m === 'film3' ? 0.09 : 0.06, q);
    if (m === 'film2') {
      if (st % 4 === 0) this.bass(f(root - 12), t, 0.3, 0.2);
      if (st % 3 === 0) this.pluck(f(root + 12 + q[(s / 3 | 0) % 3]), t, 0.2, 0.08);
      if (st % 4 === 2) this.hat(t, 0.04);
      return;
    }
    if (m === 'film3') {
      if (st === 0 || st === 10) this.kick(t, 0.6);
      if (st % 8 === 4) this.boom(t, 0.25);
      if (st % 2 === 0) this.pluck(f(root + 24 + q[(s / 2 | 0) % 3]), t, 0.18, 0.05);
      return;
    }
    // battle / boss3
    const hot = m === 'boss3';
    if (st % 4 === 0 || (hot && st === 14)) this.kick(t, 0.8);
    if (st % 8 === 4) this.snare(t, 0.35);
    if (st % 2 === 1) this.hat(t, 0.05);
    const bl = [0, 0, 12, 0, 7, 0, 12, 10];
    if (st % 2 === 0) this.bass(f(root - 12 + bl[(st >> 1) % 8]), t, 0.12, 0.22);
    const arp = [0, 1, 2, 1, 2, 0, 2, 1];
    if (hot || st % 2 === 0) this.pluck(f(root + 12 + q[arp[st % 8]] + (st >= 8 ? 12 : 0)), t, 0.1, hot ? 0.06 : 0.07, 'square');
    if (st === 0 && bar % 2 === 0) this.lead(f(root + 24 + q[bar % 3]), t, this.stepDur() * 6, 0.05);
  }

  // ---- instruments ----
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
  say(text) {
    if (this.muted || !('speechSynthesis' in window)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); if (this.voice) u.voice = this.voice; u.rate = 0.98; u.pitch = 0.9;
      if (this.music) { const g = this.music.gain; g.setTargetAtTime(0.2, this.ctx.currentTime, 0.1); u.onend = () => g.setTargetAtTime(0.42, this.ctx.currentTime, 0.3); }
      speechSynthesis.speak(u); } catch (e) { }
  }
}

// Timeline driver: film (acts 1-3) -> seamless handoff -> boss fight. Also HUD, subtitles, input and touch controls.
import { Sound } from './audio.js';
import { createFilm2D } from './film2d.js';
import { createWorld } from './world3d.js';
import { createGame } from './game.js';

const $ = s => document.querySelector(s);
const qs = new URLSearchParams(location.search);
const sound = new Sound();

// ---------- UI ----------
const ui = {
  bossBar(f) { $('#boss .fill').style.transform = `scaleX(${f})`; $('#boss .lag').style.transform = `scaleX(${f})`; },
  playerBar(f) { $('#me .fill').style.transform = `scaleX(${f})`; $('#me .lag').style.transform = `scaleX(${f})`; },
  banner(h, p = '') { const b = $('#banner .in'); b.querySelector('h2').textContent = h; b.querySelector('p').textContent = p; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); },
  // prompt pill that floats over the prop it refers to: h = { key, text, x, y } in CSS pixels, or null to hide
  hint(h) { const el = $('#hint'); if (!h) { el.style.opacity = 0; return; }
    const html = `<kbd>${h.key}</kbd>${h.text}`; if (el.dataset.html !== html) { el.dataset.html = html; el.innerHTML = html; }
    el.style.left = h.x + 'px'; el.style.top = h.y + 'px'; el.style.opacity = 1; },
  // comic hit word with a starburst at a screen point; kind: 'hit' | 'big' | 'ouch'
  pop(word, x, y, kind = 'hit') {
    const box = $('#hits'); if (box.children.length > 6) box.firstChild.remove();
    const d = document.createElement('div'); d.className = 'hitw ' + kind; d.style.left = x + 'px'; d.style.top = y + 'px';
    d.style.rotate = (Math.random() * 16 - 8) + 'deg';
    d.innerHTML = '<div class="burst"></div><div class="burst i"></div><b class="comic"></b>'; d.querySelector('b').textContent = word;
    box.appendChild(d); setTimeout(() => d.remove(), 800); },
  hud(on) { $('#hud').classList.toggle('on', on); },
  end(won, st) {
    const e = $('#end'); e.style.display = 'grid';
    const h = e.querySelector('h2'); h.textContent = won ? 'K.O.!' : 'PULPED…'; h.classList.toggle('lose', !won);
    h.style.animation = 'none'; void h.offsetWidth; h.style.animation = '';
    e.querySelector('p').textContent = won ? `Zest is the new champ. ${st.time.toFixed(1)} s, ${st.hits} hits landed, ${Math.round(st.hp)} HP left.` : `El Naranjo keeps the belt… for now. ${st.hits} hits landed.`;
  },
};
let subTimer;
function subtitle(text) { const s = $('#subs'); s.textContent = text; s.style.opacity = 1; clearTimeout(subTimer); subTimer = setTimeout(() => s.style.opacity = 0, 4200); }

// ---------- timeline ----------
const NARR = [
  [0.6, 'Every evening, when the kitchen goes quiet, the fruit bowl holds its championship.'],
  [5.6, 'This is Zest. Small. Sour. Stubbornly brave.'],
  [9.6, 'And this… is the champion.'],
  [13.8, 'El Naranjo. Undefeated. Unpeeled. Unbearably loud.'],
  [22.8, 'Nobody had ever lasted a round with him.'],
  [27.5, 'But Zest had trained all summer. And Zest wasn’t here to last.'],
  [40.6, 'Tonight, the counter becomes the ring.'],
  [46.5, 'Only one fruit walks away unsqueezed.'],
  [52.5, 'Your move, Zest.'],
];
const MUSIC = [[0, 'film1'], [22, 'film2'], [38, 'film3'], [51.43, 'lift']];   // lift = 4 bars at 112 BPM, landing on the FIGHT bell
const T_3D = 36, T_FADE = [38.3, 39.7], T_ACT3 = 40, T_FIGHT = 60, T_SKIP = 55.6;

let world, film, game, T = 0, phase = 'menu', last = performance.now(), fired = new Set(), frames = 0;
const c2d = $('#c2d');

function boot() {
  world = createWorld($('#c3d'));
  film = createFilm2D(c2d, n => sound.sfx(n));
  game = createGame(world, sound, ui);
  window.GAME = { game, world, sound, get T() { return T; }, set T(v) { T = v; } };
  requestAnimationFrame(loop);
}

function start(at = 0) {
  window.focus(); if (isTouch && navigator.userActivation?.isActive) goLandscape(); $('#touch').classList.remove('on'); sound.init(); $('#start').style.display = 'none'; $('#end').style.display = 'none';
  film.reset(); game.reset(); fired = new Set(); T = at; phase = 'film'; ui.hud(false);
  for (const [t] of NARR) if (t < at) fired.add('n' + t);
  const m = [...MUSIC].reverse().find(([t]) => t <= at); if (m) sound.setMusic(m[1]);
  $('#skip').style.display = 'block';
}
function skipToFight() { if (phase !== 'film') return; if (T < T_SKIP) { for (const [t] of NARR) if (t < T_SKIP) fired.add('n' + t); T = T_SKIP; sound.setMusic('lift'); speechSynthesis?.cancel(); } }
function beginFight() {
  phase = 'fight'; if (isTouch) $('#touch').classList.add('on'); $('#skip').style.display = 'none'; c2d.style.display = 'none';
  game.startFight(); ui.hud(true); setTimeout(() => $('#keys').style.opacity = 0.0, 14000);
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now; frames++;
  if (phase === 'menu') { if (frames === 2) { film.render(0, 0); } return; }
  if (phase === 'film') {
    T += dt;
    for (const [t, text] of NARR) if (T >= t && !fired.has('n' + t)) { fired.add('n' + t); subtitle(text); sound.say(text); }
    for (const [t, m] of MUSIC) if (T >= t && !fired.has('m' + t)) { fired.add('m' + t); sound.setMusic(m); }
    if (T >= 17.4 && T < 21.4) $('#title').style.opacity = 1; else $('#title').style.opacity = 0;
    if (T < T_FADE[1]) { c2d.style.display = 'block'; film.render(Math.min(T, 39.99), dt); c2d.style.opacity = T < T_FADE[0] ? 1 : 1 - (T - T_FADE[0]) / (T_FADE[1] - T_FADE[0]); }
    else c2d.style.display = 'none';
    if (T >= T_3D) { game.filmUpdate(Math.max(0, T - T_ACT3), T >= T_ACT3 ? dt : 0); world.render(); }
    if (T >= T_FIGHT - 1.4 && !fired.has('fight')) { fired.add('fight'); ui.hud(true); ui.banner('FIGHT!', 'Knock the belt off El Naranjo'); sound.sfx('bell'); }
    if (T >= T_FIGHT) beginFight();
    return;
  }
  if (!paused) game.update(dt); world.render();
}

// ---------- input ----------
const keys = {};
const KEYMAP = { Space: 'jump', KeyJ: 'light', KeyK: 'heavy', ShiftLeft: 'dodge', ShiftRight: 'dodge', KeyL: 'dodge', KeyE: 'grab' };
function syncMove() { if (!game) return; game.input.mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0); game.input.my = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0); }
addEventListener('keydown', e => {
  if (e.repeat) return; keys[e.code] = true; syncMove(); if (paused) setPaused(false);
  if (KEYMAP[e.code] && phase === 'fight') { game.press(KEYMAP[e.code]); e.preventDefault(); }
  if (e.code === 'Enter') { if (phase === 'menu') start(); else skipToFight(); }
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'KeyR' && phase === 'fight' && (game.S.mode === 'won' || game.S.mode === 'lost')) retry();
});
addEventListener('keyup', e => { keys[e.code] = false; syncMove(); });
// Keys only reach the page while it has focus (inside an embedded frame this matters), so pause and say so when focus leaves.
let paused = false;
function setPaused(p) { paused = p && phase === 'fight' && game?.S.mode === 'fight'; $('#focus').style.display = paused ? 'grid' : 'none'; }
addEventListener('blur', () => { for (const k in keys) keys[k] = false; syncMove(); setPaused(true); });
addEventListener('focus', () => setPaused(false));
$('#focus').addEventListener('pointerdown', () => { window.focus(); setPaused(false); });
addEventListener('pointerdown', () => window.focus());
$('#c3d').addEventListener('mousedown', e => { if (phase !== 'fight') return; game.press(e.button === 2 ? 'heavy' : 'light'); });
addEventListener('contextmenu', e => e.preventDefault());

function toggleMute() { sound.setMute(!sound.muted); $('#mute').textContent = 'Sound: ' + (sound.muted ? 'off' : 'on'); }
function retry() { $('#end').style.display = 'none'; ui.hud(true); ui.bossBar(1); ui.playerBar(1); game.restart(); ui.banner('ROUND 1', 'FIGHT!'); sound.sfx('bell'); }
$('#mute').onclick = toggleMute;
$('#skip').onclick = skipToFight;
$('#play').onclick = () => start(0);
$('#fightnow').onclick = () => { start(T_SKIP); };
$('#retry').onclick = retry;
$('#replay').onclick = () => { $('#end').style.display = 'none'; start(0); };

// touch controls (shown once the fight starts)
const isTouch = matchMedia('(pointer: coarse)').matches || qs.has('touch');
// On phones, try fullscreen + landscape when play starts (needs the tap's user gesture). Inside an embedded frame this
// may be refused; the layout still fits either way.
function goLandscape() {
  const d = document.documentElement;
  if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
}
if (isTouch) {
  $('#keys').style.display = 'none';
  const stick = $('#stick'), knob = $('#knob'); let sid = null;
  const moveStick = e => { const r = stick.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } knob.style.transform = `translate(${x * 40}px,${y * 40}px)`; if (game) { game.input.mx = x; game.input.my = -y; } };
  stick.addEventListener('pointerdown', e => { sid = e.pointerId; stick.setPointerCapture(sid); moveStick(e); });
  stick.addEventListener('pointermove', e => { if (e.pointerId === sid) moveStick(e); });
  const end = e => { if (e.pointerId !== sid) return; sid = null; knob.style.transform = ''; if (game) { game.input.mx = 0; game.input.my = 0; } };
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
  for (const b of document.querySelectorAll('#tbtns button')) b.addEventListener('pointerdown', e => { e.preventDefault(); if (phase === 'fight') game.press(b.dataset.a); });
}

boot();
// test hooks: ?t=SECONDS starts the film at that time without the menu; ?fight=1 jumps straight into the fight
if (qs.has('t')) start(parseFloat(qs.get('t')));
if (qs.has('fight')) { start(T_FIGHT - 0.01); }

// Acts 1 and 2 of the film: flat Flash-style 2D, then layered 2.5D parallax.
// Everything is drawn procedurally on a canvas in a 1600x900 design space.

const W = 1600, H = 900;
const INK = '#5a3a24';

// ---------- small helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const easeOutBack = t => { t = clamp(t, 0, 1); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mix(c1, c2, t) {
  if (t <= 0) return c1;
  const a = hex(c1), b = hex(c2);
  return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(',')})`;
}
function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// Fog tint applied to every fill in a layer (2.5D depth cue).
let FOG = 0, FOGC = '#f6eee0';
const C = c => mix(c, FOGC, FOG);

function ell(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2); }
function fillStroke(ctx, fill, lw = 5, stroke = INK) {
  ctx.fillStyle = C(fill); ctx.fill();
  if (lw) { const sh = ctx.shadowColor; ctx.shadowColor = 'transparent'; ctx.lineWidth = lw * 0.55; ctx.strokeStyle = C(stroke); ctx.stroke(); ctx.shadowColor = sh; }
}
function hose(ctx, x1, y1, x2, y2, bend, lw, col = INK) {
  const mx = (x1 + x2) / 2 + bend, my = (y1 + y2) / 2;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2);
  ctx.lineCap = 'round'; ctx.lineWidth = lw + 3; ctx.strokeStyle = C(INK); ctx.stroke();
  ctx.lineWidth = lw; ctx.strokeStyle = C(col); ctx.stroke();
}

// Cut-paper look: every shape casts a small soft shadow onto the layer beneath it.
function paperShadow(ctx, k = 1) { ctx.shadowColor = 'rgba(70,35,10,0.35)'; ctx.shadowOffsetX = 2 * k; ctx.shadowOffsetY = 3 * k; ctx.shadowBlur = 3 * k; }

// ---------- ZEST the lemon ----------
// p: x,y feet position, s scale, face (1 right / -1 left), sq squash, t time,
// walk phase, blink 0..1, look -1..1, mood happy|fierce|shock, arms idle|fists|wave|point, shade 0..1
export function drawZest(ctx, p) {
  const t = p.t || 0, sq = p.sq || 1, walk = p.walk ?? null;
  ctx.save();
  paperShadow(ctx);
  ctx.translate(p.x, p.y);
  ctx.scale((p.s || 1) / Math.sqrt(sq) * (p.face || 1), (p.s || 1) * sq);
  const cy = -98, rx = 56, ry = 70;
  // legs
  const sw = walk !== null ? Math.sin(walk) * 16 : 0;
  const lift = walk !== null ? Math.max(0, Math.cos(walk)) * 8 : 0, lift2 = walk !== null ? Math.max(0, -Math.cos(walk)) * 8 : 0;
  hose(ctx, -16, -36, -20 + sw, -4 - lift, -6, 7, '#e7b52a');
  hose(ctx, 16, -36, 18 - sw, -4 - lift2, 6, 7, '#e7b52a');
  for (const [fx, ly] of [[-20 + sw, lift], [18 - sw, lift2]]) {
    ell(ctx, fx + 7, -6 - ly, 17, 9); fillStroke(ctx, '#e0413a', 4);
    ell(ctx, fx + 12, -9 - ly, 5, 3); ctx.fillStyle = C('#ffffff'); ctx.fill();
  }
  // back arm (behind body)
  const arm = p.arms || 'idle';
  const armSw = walk !== null ? Math.sin(walk) * 0.5 : Math.sin(t * 2) * 0.1;
  const handB = arm === 'fists' ? [-30, -120] : [-62 - Math.sin(armSw) * 20, -60 + Math.cos(armSw) * 4];
  hose(ctx, -44, -92, handB[0], handB[1], -10, 6, '#e7b52a');
  ell(ctx, handB[0], handB[1], 11, 11); fillStroke(ctx, '#ffffff', 4);
  // tip nub + leaf
  ell(ctx, 4, cy - ry + 4, 14, 16); fillStroke(ctx, '#f5cd2b', 5);
  ctx.save(); ctx.translate(10, cy - ry - 6); ctx.rotate(-0.7 + Math.sin(t * 3) * 0.12);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(18, -22, 44, -8); ctx.quadraticCurveTo(22, 8, 0, 0);
  fillStroke(ctx, '#6cbf3c', 4);
  ctx.beginPath(); ctx.moveTo(4, -1); ctx.lineTo(36, -8); ctx.lineWidth = 2; ctx.strokeStyle = C('#3f8a22'); ctx.stroke();
  ctx.restore();
  // body with cel shading
  ell(ctx, 0, cy, rx, ry);
  ctx.save(); ctx.clip();
  ctx.fillStyle = C('#e9b41e'); ctx.fillRect(-rx, cy - ry, rx * 2, ry * 2);
  ell(ctx, -10, cy - 12, rx * 0.93, ry * 0.9); ctx.fillStyle = C('#ffdc3f'); ctx.fill();
  const r = rnd(7); ctx.fillStyle = C('#d8a312');
  for (let i = 0; i < 40; i++) { ell(ctx, (r() - 0.5) * rx * 1.8, cy + (r() - 0.5) * ry * 1.8, 1.6, 1.6); ctx.fill(); }
  if (p.shade) { // 2.5D: soft gradient pass
    const g = ctx.createRadialGradient(-20, cy - 30, 10, 0, cy, ry * 1.2);
    g.addColorStop(0, 'rgba(255,255,230,0.35)'); g.addColorStop(0.6, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(150,80,0,${0.35 * p.shade})`);
    ctx.fillStyle = g; ctx.fillRect(-rx, cy - ry, rx * 2, ry * 2);
  }
  ctx.restore();
  ell(ctx, 0, cy, rx, ry); ctx.lineWidth = 6; ctx.strokeStyle = C(INK); ctx.stroke();
  ell(ctx, -24, cy - 38, 13, 7, -0.6); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
  // goggles pushed up on forehead
  ctx.beginPath(); ctx.moveTo(-rx + 3, cy - 44); ctx.quadraticCurveTo(0, cy - 60, rx - 3, cy - 44);
  ctx.lineWidth = 9; ctx.strokeStyle = C(INK); ctx.stroke(); ctx.lineWidth = 5; ctx.strokeStyle = C('#7a4a26'); ctx.stroke();
  for (const gx of [-4, 26]) { ell(ctx, gx, cy - 54, 13, 12); fillStroke(ctx, '#9ad7e8', 4); ell(ctx, gx - 4, cy - 58, 4, 3); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill(); }
  // face
  const look = (p.look || 0) * 4, blink = p.blink || 0, mood = p.mood || 'happy';
  for (const ex of [0, 30]) {
    const sy = mood === 'shock' ? 1.2 : 1;
    ell(ctx, ex + 4, cy - 18, 11, 15 * sy * (1 - blink * 0.92)); fillStroke(ctx, '#ffffff', 3.5);
    if (blink < 0.6) {
      ell(ctx, ex + 6 + look, cy - 15, 5.5, 8 * sy * (1 - blink)); ctx.fillStyle = C('#1d120b'); ctx.fill();
      ell(ctx, ex + 8 + look, cy - 20, 2.2, 2.2); ctx.fillStyle = '#fff'; ctx.fill();
    }
  }
  if (mood === 'fierce') {
    ctx.lineWidth = 5; ctx.strokeStyle = C(INK); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-8, cy - 40); ctx.lineTo(14, cy - 32); ctx.moveTo(24, cy - 32); ctx.lineTo(44, cy - 40); ctx.stroke();
  }
  ell(ctx, -16, cy + 4, 9, 5); ctx.fillStyle = 'rgba(255,120,110,0.45)'; ctx.fill();
  ell(ctx, 46, cy + 4, 7, 5); ctx.fill();
  // band-aid
  ctx.save(); ctx.translate(-22, cy - 4); ctx.rotate(0.5);
  ctx.fillStyle = C('#f2c6a0'); ctx.strokeStyle = C(INK); ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(-11, -4, 22, 8, 4); ctx.fill(); ctx.stroke(); ctx.restore();
  // mouth
  ctx.lineWidth = 4; ctx.strokeStyle = C(INK); ctx.lineCap = 'round';
  if (mood === 'happy') { ctx.beginPath(); ctx.arc(20, cy + 8, 11, 0.2, Math.PI - 0.2); ctx.stroke(); }
  else if (mood === 'fierce') { ctx.beginPath(); ctx.roundRect(8, cy + 8, 24, 10, 4); fillStroke(ctx, '#ffffff', 3.5);
    ctx.beginPath(); ctx.moveTo(8, cy + 13); ctx.lineTo(32, cy + 13); ctx.lineWidth = 2; ctx.stroke(); }
  else { ell(ctx, 20, cy + 14, 7, 9); fillStroke(ctx, '#5a1a12', 3.5); }
  // scarf (peel strip) with fluttering tail
  const sy0 = cy + 36, half = rx * Math.sqrt(1 - Math.pow(36 / ry, 2));
  ctx.beginPath(); ctx.moveTo(-half, sy0 - 6); ctx.quadraticCurveTo(0, sy0 + 14, half, sy0 - 6);
  ctx.lineWidth = 20; ctx.strokeStyle = C(INK); ctx.stroke(); ctx.lineWidth = 13; ctx.strokeStyle = C('#b9d93b'); ctx.stroke();
  const fl = Math.sin(t * 9) * 8, fl2 = Math.sin(t * 9 + 1.3) * 10;
  ctx.beginPath(); ctx.moveTo(-half + 6, sy0); ctx.bezierCurveTo(-half - 30, sy0 + fl, -half - 50, sy0 - 10 + fl2, -half - 78, sy0 + 4 + fl2);
  ctx.lineWidth = 17; ctx.strokeStyle = C(INK); ctx.stroke(); ctx.lineWidth = 10; ctx.strokeStyle = C('#b9d93b'); ctx.stroke();
  // front arm
  let handF;
  if (arm === 'fists') handF = [70, -112 + Math.sin(t * 10) * 3];
  else if (arm === 'wave') handF = [58, -178 + Math.sin(t * 14) * 8];
  else if (arm === 'point') handF = [100, -120];
  else handF = [58 + Math.sin(armSw) * 20, -60 + Math.cos(armSw) * 4];
  hose(ctx, 44, -92, handF[0], handF[1], 8, 6, '#e7b52a');
  ell(ctx, handF[0], handF[1], 12, 12); fillStroke(ctx, '#ffffff', 4);
  if (arm === 'fists') { ctx.beginPath(); ctx.moveTo(handF[0] - 4, handF[1] - 6); ctx.lineTo(handF[0] - 4, handF[1] + 6); ctx.lineWidth = 2.5; ctx.stroke(); }
  ctx.restore();
}

// ---------- EL NARANJO the luchador orange ----------
export function drawNaranjo(ctx, p) {
  const t = p.t || 0, sq = p.sq || 1, walk = p.walk ?? null;
  ctx.save();
  paperShadow(ctx);
  ctx.translate(p.x, p.y);
  ctx.scale((p.s || 1) / Math.sqrt(sq) * (p.face || 1), (p.s || 1) * sq);
  const R = 112, cy = -52 - R;
  const sw = walk !== null ? Math.sin(walk) * 18 : 0;
  // legs + boots
  hose(ctx, -38, -60, -40 + sw, -16, -8, 16, '#f0891c');
  hose(ctx, 38, -60, 40 - sw, -16, 8, 16, '#f0891c');
  for (const bx of [-40 + sw, 40 - sw]) {
    ctx.beginPath(); ctx.roundRect(bx - 20, -34, 40, 28, 8); fillStroke(ctx, '#7b2a8c', 5);
    ell(ctx, bx + 6, -6, 28, 11); fillStroke(ctx, '#56196a', 5);
    ctx.beginPath(); ctx.moveTo(bx - 16, -24); ctx.lineTo(bx + 16, -24); ctx.lineWidth = 4; ctx.strokeStyle = C('#ffd24a'); ctx.stroke();
  }
  // back arm
  const arm = p.arms || 'idle';
  const flex = arm === 'flex';
  const bh = flex ? [-150, -250] : arm === 'grab' ? [-100, -170] : [-140 + Math.sin(t * 2) * 5, -110];
  hose(ctx, -96, -160, bh[0], bh[1], flex ? -40 : -20, 22, '#f0891c');
  ell(ctx, bh[0], bh[1], 22, 20); fillStroke(ctx, '#ffffff', 5);
  // stem through mask
  ctx.beginPath(); ctx.roundRect(-6, cy - R - 22, 12, 26, 4); fillStroke(ctx, '#6b8d2a', 4);
  ctx.save(); ctx.translate(4, cy - R - 16); ctx.rotate(-0.3 + Math.sin(t * 2.5) * 0.1);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(26, -30, 56, -12); ctx.quadraticCurveTo(26, 8, 0, 0); fillStroke(ctx, '#5fb336', 4);
  ctx.rotate(2.6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(20, -22, 40, -8); ctx.quadraticCurveTo(20, 6, 0, 0); fillStroke(ctx, '#4d9a2a', 4);
  ctx.restore();
  // body
  ell(ctx, 0, cy, R, R);
  ctx.save(); ctx.clip();
  ctx.fillStyle = C('#dc6a10'); ctx.fillRect(-R, cy - R, R * 2, R * 2);
  ell(ctx, -14, cy - 14, R * 0.94, R * 0.92); ctx.fillStyle = C('#ff8f24'); ctx.fill();
  const r = rnd(3); ctx.fillStyle = C('#d9690f');
  for (let i = 0; i < 90; i++) { ell(ctx, (r() - 0.5) * R * 2, cy + (r() - 0.5) * R * 2, 2.2, 2.2); ctx.fill(); }
  // luchador mask over upper half
  ctx.beginPath(); ctx.moveTo(-R, cy + 4); ctx.bezierCurveTo(-R * 0.6, cy + 22, R * 0.6, cy + 22, R, cy + 4); ctx.lineTo(R, cy - R); ctx.lineTo(-R, cy - R); ctx.closePath();
  ctx.fillStyle = C('#8e2fa6'); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = C(INK); ctx.stroke();
  // flame trim
  ctx.fillStyle = C('#ffd24a');
  for (let i = -3; i <= 3; i++) {
    const bx = i * 30, by = cy + 12 - Math.abs(i) * 2;
    ctx.beginPath(); ctx.moveTo(bx - 12, by); ctx.quadraticCurveTo(bx - 4, by - 24, bx, by - 34); ctx.quadraticCurveTo(bx + 6, by - 20, bx + 12, by); ctx.closePath(); ctx.fill();
  }
  // center stripe
  ctx.beginPath(); ctx.moveTo(-10, cy - R); ctx.lineTo(10, cy - R); ctx.lineTo(4, cy - 40); ctx.lineTo(-4, cy - 40); ctx.closePath(); ctx.fillStyle = C('#ffd24a'); ctx.fill();
  if (p.shade) {
    const g = ctx.createRadialGradient(-30, cy - 40, 10, 0, cy, R * 1.2);
    g.addColorStop(0, 'rgba(255,255,230,0.3)'); g.addColorStop(0.6, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(120,30,0,${0.4 * p.shade})`);
    ctx.fillStyle = g; ctx.fillRect(-R, cy - R, R * 2, R * 2);
  }
  ctx.restore();
  ell(ctx, 0, cy, R, R); ctx.lineWidth = 6; ctx.strokeStyle = C(INK); ctx.stroke();
  ell(ctx, -44, cy - 60, 20, 10, -0.7); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
  // eye holes (white trim) + eyes
  const look = (p.look || 0) * 5, blink = p.blink || 0, mood = p.mood || 'smug';
  for (const ex of [-6, 50]) {
    ctx.beginPath(); ctx.moveTo(ex - 30, cy - 22); ctx.quadraticCurveTo(ex, cy - 58, ex + 26, cy - 30); ctx.quadraticCurveTo(ex, cy + 2, ex - 30, cy - 22);
    fillStroke(ctx, '#ffffff', 4);
    const lid = mood === 'smug' ? 0.45 : mood === 'roar' ? 0.1 : 0.25;
    ell(ctx, ex, cy - 24, 12, 13 * (1 - blink * 0.9)); fillStroke(ctx, '#ffffff', 3);
    if (blink < 0.6) { ell(ctx, ex + 3 + look, cy - 22, 6, 7); ctx.fillStyle = C('#1d120b'); ctx.fill(); }
    ctx.beginPath(); ctx.rect(ex - 14, cy - 40, 28, 16 * lid + 2); ctx.fillStyle = C('#8e2fa6'); ctx.fill();
    ctx.beginPath(); ctx.moveTo(ex - 14, cy - 38 + 16 * lid + 2); ctx.lineTo(ex + 14, cy - 38 + 16 * lid + 2 + (ex < 20 ? 4 : -4));
    ctx.lineWidth = 4; ctx.strokeStyle = C(INK); ctx.stroke();
  }
  // grin
  if (mood === 'roar') { ell(ctx, 26, cy + 50, 30, 26); fillStroke(ctx, '#5a1a12', 5); ell(ctx, 26, cy + 64, 16, 8); ctx.fillStyle = C('#e0413a'); ctx.fill(); }
  else { ctx.beginPath(); ctx.moveTo(-8, cy + 40); ctx.quadraticCurveTo(26, cy + 76, 66, cy + 34); ctx.quadraticCurveTo(28, cy + 54, -8, cy + 40); fillStroke(ctx, '#ffffff', 5);
    ctx.beginPath(); ctx.moveTo(26, cy + 48); ctx.lineTo(26, cy + 58); ctx.lineWidth = 3; ctx.stroke(); }
  // champion belt
  ctx.save(); ell(ctx, 0, cy, R, R); ctx.clip();
  ctx.beginPath(); ctx.moveTo(-R, cy + 64); ctx.quadraticCurveTo(0, cy + 88, R, cy + 64); ctx.lineTo(R, cy + 92); ctx.quadraticCurveTo(0, cy + 116, -R, cy + 92); ctx.closePath();
  fillStroke(ctx, '#3b2416', 5); ctx.restore();
  ell(ctx, 10, cy + 90, 34, 24); fillStroke(ctx, '#ffcf3a', 5);
  ell(ctx, 10, cy + 90, 18, 12); fillStroke(ctx, '#ff8f24', 3);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(10, cy + 90); ctx.lineTo(10 + Math.cos(a) * 17, cy + 90 + Math.sin(a) * 11); ctx.lineWidth = 2; ctx.strokeStyle = C('#b04d06'); ctx.stroke(); }
  // front arm
  const fh = flex ? [150, -250] : arm === 'point' ? [190, -170] : arm === 'grab' ? [120, -150] : [140 - Math.sin(t * 2) * 5, -104];
  hose(ctx, 96, -160, fh[0], fh[1], flex ? 40 : 18, 22, '#f0891c');
  ell(ctx, fh[0], fh[1], 23, 21); fillStroke(ctx, '#ffffff', 5);
  // wrist tape
  ctx.beginPath(); ctx.moveTo(fh[0] - 22, fh[1] + 16); ctx.lineTo(fh[0] + 6, fh[1] + 26); ctx.lineWidth = 6; ctx.strokeStyle = C('#ffd24a'); ctx.stroke();
  ctx.restore();
}

// ---------- scenery ----------
function kitchenFlat(ctx, t, dark) {
  // v1.5 palette: cream wall, pale peach window with coral curtains, seafoam square tiles, birch counter over a teal terrazzo front.
  // Fills run past the 1600-wide frame so camera pans never show the letterbox.
  const X0 = -500, XW = W + 1000;
  ctx.fillStyle = mix('#fbf1e0', '#5a4b62', dark); ctx.fillRect(X0, -200, XW, H + 400);
  // window with a washed-out sunset
  const wx = 520, wy = 90, ww = 640, wh = 360;
  const g = ctx.createLinearGradient(0, wy, 0, wy + wh);
  g.addColorStop(0, mix('#fbe6c8', '#3a2f58', dark)); g.addColorStop(1, mix('#ffe2b4', '#ff8a5c', dark));
  ctx.fillStyle = g; ctx.fillRect(wx, wy, ww, wh);
  ell(ctx, wx + ww * 0.66, wy + wh * 0.66, 60, 60); ctx.fillStyle = mix('#fff8e6', '#ffb070', dark); ctx.fill();
  ctx.fillStyle = mix('#eab196', '#46345a', dark);
  ctx.beginPath(); ctx.moveTo(wx, wy + wh); ctx.lineTo(wx, wy + wh * 0.74); ctx.quadraticCurveTo(wx + 180, wy + wh * 0.55, wx + 330, wy + wh * 0.8); ctx.quadraticCurveTo(wx + 480, wy + wh * 0.62, wx + ww, wy + wh * 0.77); ctx.lineTo(wx + ww, wy + wh); ctx.fill();
  ctx.lineWidth = 16; ctx.strokeStyle = INK; ctx.strokeRect(wx, wy, ww, wh);
  ctx.lineWidth = 10; ctx.strokeStyle = '#fffaf0'; ctx.strokeRect(wx, wy, ww, wh);
  ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.stroke();
  // coral curtains, pleated
  for (const cx of [wx - 70, wx + ww - 10]) {
    ctx.beginPath(); ctx.moveTo(cx, wy - 40); ctx.lineTo(cx + 80, wy - 40); ctx.quadraticCurveTo(cx + 95, wy + wh * 0.6, cx + 70, wy + wh + 40); ctx.lineTo(cx + 5, wy + wh + 40); ctx.quadraticCurveTo(cx - 12, wy + wh * 0.6, cx, wy - 40);
    fillStroke(ctx, mix('#f0605a', '#6a3044', dark), 5);
    ctx.strokeStyle = 'rgba(150,30,30,0.3)'; ctx.lineWidth = 4; for (const k of [22, 44, 62]) { ctx.beginPath(); ctx.moveTo(cx + k, wy - 36); ctx.lineTo(cx + k + 2, wy + wh + 36); ctx.stroke(); }
  }
  ctx.fillStyle = mix('#c07a3c', '#5e3a35', dark); ctx.fillRect(wx - 110, wy - 52, ww + 220, 14);
  // hanging pans
  for (const [px, pr] of [[240, 70], [380, 52], [1320, 60]]) {
    ctx.beginPath(); ctx.moveTo(px, -200); ctx.lineTo(px, 150 - pr); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    ell(ctx, px, 150, pr, pr); ctx.fillStyle = mix('#d9824a', '#6a3b3a', dark); ctx.fill(); ctx.lineWidth = 6; ctx.stroke();
    ell(ctx, px - pr * 0.3, 150 - pr * 0.3, pr * 0.35, pr * 0.2, -0.6); ctx.fillStyle = 'rgba(255,240,220,0.55)'; ctx.fill();
  }
  // seafoam square-tile backsplash with white grout
  ctx.fillStyle = mix('#fbfdfb', '#4a5a5e', dark); ctx.fillRect(X0, 470, XW, 145);
  ctx.fillStyle = mix('#cfeae0', '#3f5256', dark);
  for (let y = 474; y < 612; y += 48) for (let x = X0; x < X0 + XW; x += 48) ctx.fillRect(x + 3, y, 42, Math.min(42, 610 - y));
  // birch counter top, caramel edge, teal terrazzo front
  ctx.fillStyle = mix('#ecc990', '#744a3f', dark); ctx.fillRect(X0, 610, XW, 40);
  ctx.fillStyle = mix('#dcae72', '#5e3a35', dark); ctx.fillRect(X0, 650, XW, 80);     // birch board front
  ctx.strokeStyle = 'rgba(120,70,20,0.18)'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(X0, 672 + i * 20); ctx.lineTo(X0 + XW, 668 + i * 21); ctx.stroke(); }
  ctx.fillStyle = mix('#2c4b4c', '#1a2224', dark); ctx.fillRect(X0, 730, XW, H + 200);   // terrazzo counter below the board
  const r = rnd(7), chips = ['#f4efe2', '#f4efe2', '#ff8a7a', '#ffc85a', '#9fd8c8', '#8fb8e8'];
  for (let i = 0; i < 520; i++) { ctx.fillStyle = mix(chips[Math.floor(r() * chips.length)], '#2a3436', dark); const x = X0 + r() * XW, y = 736 + r() * 190, s = 2 + r() * r() * 9; ctx.fillRect(x, y, s, s * (0.6 + r() * 0.6)); }
  ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(X0, 730); ctx.lineTo(X0 + XW, 730); ctx.stroke();
  ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(X0, 610); ctx.lineTo(X0 + XW, 610); ctx.moveTo(X0, 650); ctx.lineTo(X0 + XW, 650); ctx.stroke();
  ctx.fillStyle = mix('#c07a3c', '#5e3a35', dark); ctx.fillRect(X0, 646, XW, 8);
  // fruit bowl on a shelf
  ctx.fillStyle = mix('#fffaf0', '#3e5a6a', dark); ctx.fillRect(1180, 520, 360, 16); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.strokeRect(1180, 520, 360, 16);
  ctx.beginPath(); ctx.moveTo(1240, 520); ctx.quadraticCurveTo(1360, 600, 1480, 520); ctx.closePath(); ctx.fillStyle = mix('#8fd3bd', '#2f4d5a', dark); ctx.fill(); ctx.stroke();
}

function speedLines(ctx, t, a) {
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, H / 2);
  const r = rnd(Math.floor(t * 20));
  ctx.strokeStyle = '#fff6d8';
  for (let i = 0; i < 60; i++) { const ang = r() * Math.PI * 2, r0 = 300 + r() * 200; ctx.lineWidth = 2 + r() * 8;
    ctx.beginPath(); ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0); ctx.lineTo(Math.cos(ang) * 1400, Math.sin(ang) * 1400); ctx.stroke(); }
  ctx.restore();
}

// 2D particle pool (dust + juice)
const parts = [];
function puff(x, y, n, col, spd = 200, depth = 1) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = spd * (0.4 + Math.random());
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.5, r: 8 + Math.random() * 14, life: 0, max: 0.6 + Math.random() * 0.6, col, depth, g: col === '#fff' ? 0 : 900 }); }
}
function stepParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.life += dt; if (q.life > q.max) { parts.splice(i, 1); continue; }
    q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.col === '#fff') { q.vx *= 0.92; q.vy *= 0.92; } }
}
function drawParts(ctx) {
  for (const q of parts) { const k = 1 - q.life / q.max; const rr = q.col === '#fff' ? q.r * (1 + (1 - k) * 1.5) : q.r * 0.6;
    ell(ctx, q.x, q.y, rr, rr); ctx.globalAlpha = q.col === '#fff' ? k * 0.55 : k; fillStroke(ctx, q.col === '#fff' ? '#fff6e2' : q.col, q.col === '#fff' ? 0 : 3); ctx.globalAlpha = 1; }
}

// paper grain overlay
let grain;
function makeGrain() {
  grain = document.createElement('canvas'); grain.width = grain.height = 256;
  const g = grain.getContext('2d'), id = g.createImageData(256, 256);
  for (let i = 0; i < id.data.length; i += 4) { const v = 200 + Math.random() * 55; id.data[i] = v; id.data[i + 1] = v * 0.96; id.data[i + 2] = v * 0.88; id.data[i + 3] = 40; }
  g.putImageData(id, 0, 0);
}

// ---------- ACT 1: flat 2D (0..22s) ----------
function act1(ctx, t, dt, fx) {
  const dark = ease(seg(t, 9, 12)) * 0.45 - ease(seg(t, 15, 18)) * 0.2;
  let camS = 1 + ease(seg(t, 4.5, 6)) * 0.12 - ease(seg(t, 9, 10)) * 0.12 + ease(seg(t, 19.5, 22)) * 0.5;
  let camX = ease(seg(t, 4.5, 6)) * -120 + ease(seg(t, 9, 10)) * 120;
  ctx.save();
  ctx.translate(W / 2 + fx.shake * (Math.random() - 0.5), H / 2 + fx.shake * (Math.random() - 0.5));
  ctx.scale(camS, camS); ctx.translate(-W / 2 + camX, -H / 2);
  kitchenFlat(ctx, t, dark);
  if (t > 16) speedLines(ctx, t, ease(seg(t, 16, 17)) * 0.5);
  // Zest walks in
  const zx = lerp(-140, 470, ease(seg(t, 0.3, 4)));
  const walking = t > 0.3 && t < 4;
  let zsq = 1 + (walking ? Math.abs(Math.sin(t * 10)) * 0.05 : Math.sin(t * 3) * 0.02);
  let zy = 640 - (walking ? Math.abs(Math.sin(t * 10)) * 10 : 0);
  let zmood = 'happy', zarms = 'idle', zx2 = zx;
  if (t > 5 && t < 8) { const h = seg(t, 5.5, 6.4); zy -= Math.sin(h * Math.PI) * 90; zsq = h > 0 && h < 1 ? 1.12 : 1; zarms = h >= 1 ? 'wave' : 'fists'; }
  if (t > 13.2) { const k = seg(t, 13.2, 13.7); zx2 = zx - easeOutBack(k) * 70; zmood = t < 16 ? 'shock' : 'fierce'; zarms = t < 16 ? 'idle' : 'fists';
    if (t < 13.8) zsq = 0.8 + k * 0.2; }
  // El Naranjo drops in
  const land = 13.2;
  let ny = t < 12.4 ? -400 : t < land ? lerp(-400, 640, Math.pow(seg(t, 12.4, land), 2)) : 640;
  let nsq = 1;
  if (t >= land) { const k = seg(t, land, land + 0.7); nsq = 1 - 0.35 * Math.sin(Math.min(1, k * 2) * Math.PI) * (1 - k) - (k < 0.2 ? 0.1 : 0); }
  if (t < land && t > 12.4) nsq = 1.2;
  const narms = t > 14.5 && t < 17.5 ? 'flex' : t > 17.5 ? 'point' : 'idle';
  const nmood = t > 14.5 && t < 16 ? 'roar' : 'smug';
  if (!fx.landed && t >= land) { fx.landed = true; fx.shake = 40; puff(1080, 640, 18, '#fff', 380); fx.sfx('slam'); }
  if (!fx.hop && t >= 5.5) { fx.hop = true; fx.sfx('jump'); }
  if (!fx.roar && t >= 14.5) { fx.roar = true; fx.sfx('roar'); fx.shake = 18; }
  const blink = (t % 3.1 < 0.12) ? 1 : 0;
  // shadows
  ctx.fillStyle = 'rgba(60,20,0,0.25)';
  ell(ctx, zx2, 648, 60, 12); ctx.fill();
  ell(ctx, 1080, 648, 140 * clamp((ny + 400) / 1040, 0.2, 1), 18); ctx.fill();
  drawNaranjo(ctx, { x: 1080, y: ny, s: 1, face: -1, sq: nsq, t, mood: nmood, arms: narms, blink, look: 1 });
  drawZest(ctx, { x: zx2, y: zy, s: 1, face: 1, sq: zsq, t, walk: walking ? t * 10 : null, mood: zmood, arms: zarms, blink, look: t > 9 ? 1 : 0.3 });
  stepParts(dt); drawParts(ctx);
  ctx.restore();
  fx.shake *= Math.pow(0.02, dt);
}

// ---------- ACT 2: 2.5D parallax (22..40s) ----------
function layer(ctx, d, cam, fog, fn) {
  const k = 1 / Math.max(0.08, d - cam.z);
  ctx.save();
  ctx.translate(W / 2, 620);
  ctx.scale(k * cam.zoom, k * cam.zoom);
  ctx.translate(-cam.x, -cam.y);
  FOG = fog; fn(); FOG = 0;
  ctx.restore();
}

function act2(ctx, t, dt, fx) {
  const lt = t - 22;
  const cam = { x: Math.sin(lt * 0.35) * 160 + lerp(0, 60, seg(lt, 0, 18)), y: -120 + ease(seg(lt, 12, 18)) * 60, z: ease(seg(lt, 0, 14)) * 0.28 + ease(seg(lt, 14, 18)) * 0.5, zoom: 1 };
  // sky/window light
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#f7e2c6'); g.addColorStop(0.55, '#ffd2a4'); g.addColorStop(1, '#ffe6bf');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // far: window + sunset hills (d=10)
  layer(ctx, 10, cam, 0.2, () => {
    ell(ctx, 300, -700, 220, 220); ctx.fillStyle = C('#fff8e6'); ctx.fill();
    ctx.fillStyle = C('#e9a98a'); ctx.beginPath(); ctx.moveTo(-3000, -200); ctx.quadraticCurveTo(-800, -900, 200, -350); ctx.quadraticCurveTo(1200, -800, 3000, -250); ctx.lineTo(3000, 200); ctx.lineTo(-3000, 200); ctx.fill();
  });
  // wall with window frame (d=5)
  layer(ctx, 5, cam, 0.3, () => {
    ctx.fillStyle = C('#fbf1e0');
    ctx.beginPath(); ctx.rect(-4000, -6000, 8000, 6200); ctx.rect(1100, -1500, -2200, 1100); ctx.fill('evenodd');
    ctx.fillStyle = C('#cfeae0'); ctx.fillRect(-4000, -380, 8000, 380); ctx.strokeStyle = C('#fbfdfb'); ctx.lineWidth = 8;
    for (let y = -380; y < 0; y += 76) for (let x = -4000; x < 4000; x += 76) ctx.strokeRect(x, y, 76, 76);
    for (const cx of [-1330, 1110]) { ctx.beginPath(); ctx.roundRect(cx, -1640, 220, 1320, 30); fillStroke(ctx, '#f0605a', 10); }
    ctx.lineWidth = 30; ctx.strokeStyle = C('#fffaf0'); ctx.strokeRect(-1100, -1500, 2200, 1100);
    ctx.beginPath(); ctx.moveTo(0, -1500); ctx.lineTo(0, -400); ctx.stroke();
    for (const px of [-1600, -1350, 1500]) { ctx.beginPath(); ctx.moveTo(px, -6000); ctx.lineTo(px, -900); ctx.lineWidth = 8; ctx.strokeStyle = C(INK); ctx.stroke();
      ell(ctx, px, -800, 110, 110); fillStroke(ctx, '#c9713e', 10); }
  });
  // back counter items (d=2.5): kettle, jars, fruit bowl
  layer(ctx, 2.5, cam, 0.15, () => {
    ctx.fillStyle = C('#1f3a3c'); ctx.fillRect(-4000, -60, 8000, 400);
    for (const [jx, jh, col] of [[-1100, 260, '#ffcf6a'], [-960, 200, '#e05a4a'], [-830, 230, '#9bc86a']]) {
      ctx.beginPath(); ctx.roundRect(jx - 60, -60 - jh, 120, jh, 18); fillStroke(ctx, '#d8f0f0', 8);
      ctx.beginPath(); ctx.roundRect(jx - 50, -60 - jh * 0.7, 100, jh * 0.7 - 8, 12); ctx.fillStyle = C(col); ctx.fill();
      ctx.beginPath(); ctx.rect(jx - 66, -80 - jh, 132, 30); fillStroke(ctx, '#8fd3bd', 8);
    }
    ctx.beginPath(); ctx.moveTo(900, -60); ctx.quadraticCurveTo(1050, 80, 1200, -60); ell(ctx, 1050, -200, 150, 150); fillStroke(ctx, '#8aa0b0', 10);
    ell(ctx, 1000, -250, 40, 60, -0.5); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();
  });
  // ring floor (d=1): counter surface + cinnamon-stick posts with twine
  const circ = lt * 0.55;
  const zD = 1 + Math.sin(circ) * 0.18, nD = 1 - Math.sin(circ) * 0.18;
  const clashK = seg(lt, 8.6, 9.2);
  const zx = lerp(-300 - 70 * Math.cos(circ), -70, ease(clashK)) - (lt > 9.2 ? easeOutBack(seg(lt, 9.2, 9.8)) * 220 : 0);
  const nx = lerp(320 + 70 * Math.cos(circ), 90, ease(clashK)) + (lt > 9.2 ? easeOutBack(seg(lt, 9.2, 9.8)) * 160 : 0);
  if (!fx.clash && lt >= 9.2) { fx.clash = true; fx.flash = 1; fx.shake = 30; fx.sfx('hit'); fx.sfx('splash');
    for (let i = 0; i < 26; i++) parts.push({ x: 0, y: -170, vx: (Math.random() - 0.5) * 900, vy: -Math.random() * 700 - 200, r: 10 + Math.random() * 16, life: 0, max: 1.2, col: i % 2 ? '#ffd83a' : '#ff9a2e', g: 1400 }); }
  const posts = (front) => {
    for (const [px, pd] of [[-760, 1.35], [760, 1.35], [-600, 0.75], [600, 0.75]]) {
      if ((pd < 1) !== front) continue;
      layer(ctx, pd, cam, 0, () => { ctx.beginPath(); ctx.roundRect(px - 16, -300, 32, 300, 10); fillStroke(ctx, '#8a4a22', 5);
        for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(px - 16, -280 + i * 50); ctx.lineTo(px + 16, -270 + i * 50); ctx.lineWidth = 3; ctx.strokeStyle = C('#5a2c10'); ctx.stroke(); } });
    }
  };
  layer(ctx, 1.35, cam, 0.05, () => {
    ctx.fillStyle = C('#e9c690'); ctx.fillRect(-4000, 0, 8000, 1200);
    for (const ry of [-220, -150]) { ctx.beginPath(); ctx.moveTo(-760, ry); ctx.lineTo(760, ry); ctx.lineWidth = 7; ctx.strokeStyle = C('#e0413a'); ctx.setLineDash([22, 18]); ctx.stroke();
      ctx.strokeStyle = C('#ffffff'); ctx.lineDashOffset = 20; ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0; }
  });
  posts(false);
  layer(ctx, 1, cam, 0, () => { ctx.fillStyle = 'rgba(80,30,0,0.18)'; ell(ctx, 0, 30, 900, 90); ctx.fill(); });
  const chars = [
    { d: zD, draw: () => { ctx.fillStyle = 'rgba(60,20,0,0.3)'; ell(ctx, zx, 6, 60, 12); ctx.fill();
      drawZest(ctx, { x: zx, y: 0, face: zx < nx ? 1 : -1, t, walk: lt < 8.6 ? lt * 7 : null, mood: 'fierce', arms: 'fists', shade: 1, sq: 1 + Math.sin(lt * 7) * 0.03, look: 1, blink: (t % 2.7 < 0.1) ? 1 : 0 }); } },
    { d: nD, draw: () => { ctx.fillStyle = 'rgba(60,20,0,0.3)'; ell(ctx, nx, 6, 140, 20); ctx.fill();
      drawNaranjo(ctx, { x: nx, y: 0, face: nx < zx ? 1 : -1, t, walk: lt < 8.6 ? lt * 5 : null, mood: lt > 9.2 && lt < 11 ? 'roar' : 'smug', arms: lt > 8 && lt < 9.4 ? 'grab' : 'idle', shade: 1, look: 1 }); } }
  ].sort((a, b) => b.d - a.d);
  for (const c of chars) layer(ctx, c.d, cam, 0, c.draw);
  layer(ctx, 1, cam, 0, () => { stepParts(dt); drawParts(ctx); });
  posts(true);
  // foreground herbs (blurred)
  layer(ctx, 0.55, cam, 0, () => {
    ctx.filter = 'blur(6px)';
    for (const [hx, s] of [[-700, 1], [640, 1.2]]) { for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(hx + i * 30, 120); ctx.rotate(-0.6 + i * 0.3 + Math.sin(t + i) * 0.05);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(40 * s, -120 * s, 0, -260 * s); ctx.quadraticCurveTo(-40 * s, -120 * s, 0, 0); ctx.fillStyle = '#3f8a3a'; ctx.fill(); ctx.restore(); } }
    ctx.filter = 'none';
  });
}

// ---------- public API ----------
export function createFilm2D(canvas, sfx) {
  const ctx = canvas.getContext('2d');
  makeGrain();
  const fx = { shake: 0, flash: 0, sfx };
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), d = document.documentElement;
    canvas.width = (d.clientWidth || innerWidth) * dpr; canvas.height = (d.clientHeight || innerHeight) * dpr;
  }
  resize(); addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(document.documentElement);
  return {
    render(t, dt) {
      // Wide screens fill (cover); narrow ones, like a phone held upright, show the whole 16:9 frame (contain) so nobody gets cut off.
      const cw = canvas.width, ch = canvas.height, fit = cw / ch < 1.3, s = fit ? Math.min(cw / W, ch / H) : Math.max(cw / W, ch / H);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#1a0f1f'; ctx.fillRect(0, 0, cw, ch);
      ctx.setTransform(s, 0, 0, s, (cw - W * s) / 2, (ch - H * s) / 2);
      ctx.save(); if (fit) { ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); }
      if (t < 22) act1(ctx, t, dt, fx);
      else { ctx.save(); ctx.translate(fx.shake * (Math.random() - 0.5), fx.shake * (Math.random() - 0.5)); act2(ctx, t, dt, fx); ctx.restore(); fx.shake *= Math.pow(0.02, dt); }
      // Flash-style act transition: iris wipe into act 2
      if (t > 21 && t < 23) { const k = t < 22 ? ease(seg(t, 21, 22)) : 1 - ease(seg(t, 22, 23));
        ctx.save(); ctx.beginPath(); ctx.rect(-W, -H, W * 3, H * 3); ell(ctx, W * 0.4, H * 0.55, 1200 * (1 - k) + 1, 1200 * (1 - k) + 1); ctx.fillStyle = '#1a0f1f'; ctx.fill('evenodd'); ctx.restore(); }
      if (fx.flash > 0) { ctx.fillStyle = `rgba(255,250,220,${fx.flash})`; ctx.fillRect(0, 0, W, H); fx.flash = Math.max(0, fx.flash - dt * 3); }
      // paper grain (stronger in act 1)
      ctx.save(); ctx.globalAlpha = t < 22 ? 0.7 : 0.4; ctx.fillStyle = ctx.createPattern(grain, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
      // vignette
      const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.0);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,30,20,0.25)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    },
    reset() { fx.landed = fx.hop = fx.roar = fx.clash = false; fx.shake = 0; parts.length = 0; }
  };
}

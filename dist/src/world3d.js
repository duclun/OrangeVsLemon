// 3D world: renderer, toon materials with ink outlines, the kitchen arena, both characters, and FX pools.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export const ARENA_R = 12;            // playable radius of the butcher-block ring
const INK = 0x5a3a24;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- shared materials ----------
// v1.5 "soft toy" look: a smooth, lifted ramp instead of hard 4-step bands, so shadows stay light and warm (high key).
const toonRamp = (() => {
  const t = new THREE.DataTexture(new Uint8Array([150, 178, 204, 226, 242, 252, 255, 255]), 8, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
})();
export const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
export function toon(color, extra = {}) { return new THREE.MeshToonMaterial({ color, gradientMap: toonRamp, ...extra }); }
// Citrus peel: soft sheen and a light clearcoat so the pores catch the light like a vinyl toy.
function peel(extra) { return new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.6, sheenRoughness: 0.5, sheenColor: 0xfff2c0, ...extra }); }

// Inverted-hull outline: a back-faced, slightly scaled copy as a child. Thinner in v1.5 so the soft shading leads.
const OUT_K = 0.6;
export function outline(mesh, k = 0.06) {
  const o = new THREE.Mesh(mesh.geometry, inkMat);
  o.scale.setScalar(1 + k * OUT_K); o.castShadow = false; o.userData.isOutline = true;
  mesh.add(o); return mesh;
}
function M(geo, mat, { out = 0.06, shadow = true } = {}) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true;
  if (out) outline(m, out); return m;
}

// ---------- canvas textures ----------
function canvasTex(w, h, draw, { repeat, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t;
}
const poreTex = canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 5000; i++) { const r = 0.6 + Math.random() * 1.8; g.fillStyle = `rgba(40,40,40,${0.25 + Math.random() * 0.4})`;
    g.beginPath(); g.arc(Math.random() * w, Math.random() * h, r, 0, 7); g.fill(); }
}, { srgb: false });

// El Naranjo's skin: luchador mask + belt painted into an equirect color map (face centered at u=0.25).
const naranjoTex = canvasTex(1024, 512, (g, w, h) => {
  g.fillStyle = '#ff8f24'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(220,100,10,${Math.random() * 0.25})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 5, 0, 7); g.fill(); }
  const edge = x => h * 0.45 + Math.sin((x / w) * Math.PI * 8) * 6 + (Math.abs(x - w * 0.25) < w * 0.08 ? h * 0.03 * Math.cos((x - w * 0.25) / (w * 0.08) * Math.PI / 2) : 0);
  // mask
  g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); for (let x = w; x >= 0; x -= 8) g.lineTo(x, edge(x)); g.closePath();
  g.fillStyle = '#8e2fa6'; g.fill();
  // flame trim
  g.fillStyle = '#ffd24a';
  for (let x = 12; x < w; x += 34) { const y = edge(x); g.beginPath(); g.moveTo(x - 13, y); g.quadraticCurveTo(x - 5, y - 26, x + 2, y - 40); g.quadraticCurveTo(x + 6, y - 20, x + 13, y); g.fill(); }
  g.strokeStyle = '#5a3a24'; g.lineWidth = 5; g.beginPath(); for (let x = 0; x <= w; x += 8) g[x ? 'lineTo' : 'moveTo'](x, edge(x)); g.stroke();
  // forehead stripe
  g.fillStyle = '#ffd24a'; g.beginPath(); g.moveTo(w * 0.25 - 22, 0); g.lineTo(w * 0.25 + 22, 0); g.lineTo(w * 0.25 + 7, h * 0.27); g.lineTo(w * 0.25 - 7, h * 0.27); g.fill();
  // eye holes: white trims
  for (const du of [-0.062, 0.062]) {
    const x = w * (0.25 + du), y = h * 0.345;
    g.fillStyle = '#fff8ea'; g.beginPath(); g.ellipse(x, y, w * 0.042, h * 0.07, du > 0 ? 0.35 : -0.35, 0, 7); g.fill();
    g.strokeStyle = '#5a3a24'; g.lineWidth = 4; g.stroke();
  }
  // belt band
  g.fillStyle = '#4a2c1a'; g.fillRect(0, h * 0.66, w, h * 0.075);
  g.fillStyle = '#ffd24a'; for (let x = 0; x < w; x += 24) { g.beginPath(); g.arc(x, h * 0.6975, 3, 0, 7); g.fill(); }
});

const lemonTex = canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = '#ffdc3f'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${235 + Math.random() * 20},${200 + Math.random() * 30},40,${Math.random() * 0.18})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 8, 0, 7); g.fill(); }
});

// ---------- characters ----------
function eye(r, x, y, z, pupilCol = 0x1d120b) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const white = M(new THREE.SphereGeometry(r, 20, 14), toon(0xffffff), { out: 0.12, shadow: false });
  white.scale.set(1, 1.25, 0.6); g.add(white);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(r * 0.5, 14, 10), new THREE.MeshBasicMaterial({ color: pupilCol }));
  pupil.position.set(0, -r * 0.05, r * 0.5); pupil.scale.set(1, 1.3, 0.5); g.add(pupil);
  const hi = new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  hi.position.set(r * 0.18, r * 0.25, r * 0.78); g.add(hi);
  g.userData = { white, pupil, hi }; return g;
}
function limb(r, len, mat, out = 0.12) {
  const pivot = new THREE.Group();
  const m = M(new THREE.CapsuleGeometry(r, len, 4, 10), mat, { out });
  m.position.y = -len / 2 - r * 0.5; pivot.add(m); pivot.userData.seg = m; return pivot;
}
function collectMats(root) { const s = new Set(); root.traverse(o => { if (o.isMesh && !o.userData.isOutline && o.material.emissive) s.add(o.material); }); return [...s]; }

function rig(cy) {
  const root = new THREE.Group(), sq = new THREE.Group(), spin = new THREE.Group(), body = new THREE.Group();
  root.add(sq); sq.add(spin); spin.position.y = cy; spin.add(body); body.position.y = -cy;
  return { root, sq, spin, body };
}

export function makeZest() {
  const { root, sq, spin, body } = rig(1.0);
  const skin = peel({ map: lemonTex, bumpMap: poreTex, bumpScale: 1.2 });
  // lathe body: center at y=1.05, half-height .65
  const pts = [];
  for (let i = 0; i <= 40; i++) { const u = -1 + (2.08 * i) / 40;
    let r = u <= 0.93 ? 0.52 * Math.pow(Math.max(0, 1 - u * u), 0.6) : 0.157 * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.93) / 0.15, 2)));
    pts.push(new THREE.Vector2(Math.max(0.001, r), u * 0.65)); }
  const torso = M(new THREE.LatheGeometry(pts, 40), skin, { out: 0.05 }); torso.position.y = 1.05; body.add(torso);
  // leaf
  const leaf = M(new THREE.SphereGeometry(0.2, 12, 8), toon(0x6cbf3c), { out: 0.15 }); leaf.scale.set(1, 0.12, 0.45);
  leaf.position.set(0.14, 1.78, 0); leaf.rotation.z = 0.5; body.add(leaf);
  // goggles on forehead
  const strap = M(new THREE.TorusGeometry(0.41, 0.04, 8, 40), toon(0x7a4a26), { out: 0.015 }); strap.position.y = 1.43; strap.rotation.x = Math.PI / 2 - 0.12; body.add(strap);
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x9ad7e8, roughness: 0.05, metalness: 0.1, clearcoat: 1 });
  for (const x of [-0.14, 0.14]) {
    const l = M(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 20), lensMat, { out: 0.15 }); l.rotation.x = Math.PI / 2 - 0.35; l.position.set(x, 1.46, 0.37); body.add(l);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 20), toon(0xb07a3a)); rim.position.set(x, 1.475, 0.405); rim.rotation.x = -0.35; body.add(rim);
  }
  // eyes, mouth, blush, band-aid
  const eL = eye(0.12, -0.16, 1.13, 0.46), eR = eye(0.12, 0.16, 1.13, 0.46); body.add(eL, eR);
  const brows = [-0.16, 0.16].map(x => { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.12, 3, 6), new THREE.MeshBasicMaterial({ color: INK }));
    b.rotation.z = Math.PI / 2; b.position.set(x, 1.33, 0.46); body.add(b); return b; });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: INK }));
  mouth.rotation.z = Math.PI; mouth.position.set(0, 0.97, 0.505); body.add(mouth);
  for (const x of [-0.3, 0.3]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff8a7a, transparent: true, opacity: 0.55 }));
    b.scale.set(1, 0.6, 0.3); b.position.set(x, 1.0, 0.43); body.add(b); }
  const aid = M(new THREE.BoxGeometry(0.17, 0.06, 0.02), toon(0xf2c6a0), { out: 0.2 }); aid.position.set(-0.3, 1.07, 0.42); aid.rotation.set(0, -0.6, 0.5); body.add(aid);
  // scarf + tail
  const scarfMat = toon(0xb9d93b);
  const scarf = M(new THREE.TorusGeometry(0.47, 0.1, 10, 40), scarfMat, { out: 0.02 }); scarf.rotation.x = Math.PI / 2; scarf.scale.set(1, 1, 0.75); scarf.position.y = 0.8; body.add(scarf);
  const tail = new THREE.Group(); tail.position.set(-0.35, 0.8, -0.35); body.add(tail);
  const t1 = M(new THREE.BoxGeometry(0.1, 0.05, 0.4), scarfMat, { out: 0.1 }); t1.position.z = -0.2; tail.add(t1);
  const tail2 = new THREE.Group(); tail2.position.z = -0.4; tail.add(tail2);
  const t2 = M(new THREE.BoxGeometry(0.1, 0.05, 0.35), scarfMat, { out: 0.1 }); t2.position.z = -0.17; tail2.add(t2);
  // arms + gloves
  const limbMat = toon(0xe7b52a), glove = toon(0xffffff);
  const arms = [-1, 1].map(s => { const p = limb(0.05, 0.3, limbMat); p.position.set(s * 0.47, 0.95, 0.02);
    const h = M(new THREE.SphereGeometry(0.11, 14, 10), glove, { out: 0.12 }); h.position.y = -0.45; p.add(h); p.userData.hand = h; body.add(p); return p; });
  // legs + sneakers
  const legs = [-1, 1].map(s => { const p = limb(0.055, 0.28, limbMat); p.position.set(s * 0.17, 0.45, 0);
    const shoe = M(new THREE.SphereGeometry(0.12, 14, 10), toon(0xe0413a), { out: 0.12 }); shoe.scale.set(1, 0.65, 1.5); shoe.position.set(0, -0.44, 0.06); p.add(shoe);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), toon(0xffffff)); toe.scale.set(1, 0.6, 1); toe.position.set(0, -0.42, 0.22); p.add(toe);
    body.add(p); return p; });
  root.userData = { sq, spin, body, torso, eyes: [eL, eR], brows, mouth, arms, legs, tail, tail2, leaf, mats: null, kind: 'zest' };
  root.userData.mats = collectMats(root);
  return root;
}

export function makeNaranjo() {
  const R = 1.25, cy = 1.72;
  const { root, sq, spin, body } = rig(cy);
  const skin = peel({ map: naranjoTex, bumpMap: poreTex, bumpScale: 2 });
  const torso = M(new THREE.SphereGeometry(R, 64, 40), skin, { out: 0.035 }); torso.position.y = cy; body.add(torso);
  // eyes placed in the painted eye holes
  const dir = (u, v) => { const phi = u * Math.PI * 2, th = v * Math.PI; return new THREE.Vector3(-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th)); };
  const eyes = [-0.062, 0.062].map(du => { const d = dir(0.25 + du, 0.345); const e = eye(0.17, d.x * R * 0.93, cy + d.y * R * 0.93, d.z * R * 0.93);
    e.lookAt(e.position.clone().add(V3(d.x * 0.6, 0.15, 1))); body.add(e);
    const lid = M(new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x8e2fa6), { out: 0.1 });
    lid.scale.set(1, 1.25, 0.7); lid.rotation.x = 0.25; e.add(lid); e.userData.lid = lid; return e; });
  // grin
  const grinShape = new THREE.Shape(); grinShape.moveTo(-0.42, 0.05); grinShape.quadraticCurveTo(0, -0.42, 0.42, 0.08); grinShape.quadraticCurveTo(0, -0.14, -0.42, 0.05);
  const grinG = new THREE.ShapeGeometry(grinShape, 16);
  const grinBack = new THREE.Mesh(grinG, new THREE.MeshBasicMaterial({ color: INK })); grinBack.scale.setScalar(1.12);
  const grin = new THREE.Mesh(grinG, new THREE.MeshBasicMaterial({ color: 0xfff8ea }));
  const gd = dir(0.25, 0.56), grinG2 = new THREE.Group(); grinG2.position.copy(gd.clone().multiplyScalar(R + 0.03)).add(new THREE.Vector3(0, cy, 0));
  grinG2.lookAt(grinG2.position.clone().add(gd)); grin.position.z = 0.005; grinG2.add(grinBack, grin); body.add(grinG2);
  const roarMouth = M(new THREE.SphereGeometry(0.3, 16, 12), new THREE.MeshBasicMaterial({ color: 0x5a1a12 }), { out: 0.08, shadow: false });
  roarMouth.scale.set(1, 0.9, 0.3); roarMouth.position.copy(grinG2.position); roarMouth.visible = false; body.add(roarMouth);
  // belt plate
  const bd = dir(0.25, 0.70);
  const plate = M(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 28), new THREE.MeshStandardMaterial({ color: 0xffcf3a, metalness: 0.9, roughness: 0.25 }), { out: 0.1 });
  plate.position.copy(bd.clone().multiplyScalar(R + 0.02)).add(new THREE.Vector3(0, cy, 0)); plate.lookAt(plate.position.clone().add(bd)); plate.rotateX(Math.PI / 2); plate.scale.set(1.3, 1, 0.9); body.add(plate);
  const gem = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 6), toon(0xff8f24)); gem.position.y = 0.03; plate.add(gem);
  // stem + leaves through the mask
  const stem = M(new THREE.CylinderGeometry(0.06, 0.08, 0.28, 8), toon(0x6b8d2a), { out: 0.2 }); stem.position.y = cy + R + 0.08; body.add(stem);
  for (const [rz, ry] of [[0.8, 0.4], [-0.9, 2.4]]) { const l = M(new THREE.SphereGeometry(0.28, 12, 8), toon(0x5fb336), { out: 0.12 });
    l.scale.set(1, 0.12, 0.45); l.position.set(Math.cos(ry) * 0.24, cy + R + 0.2, Math.sin(ry) * 0.24); l.rotation.set(0, -ry, rz * 0.5); body.add(l); }
  // arms with gloves + wrist tape
  const armMat = toon(0xf0891c), glove = toon(0xffffff), tape = toon(0xffd24a);
  const arms = [-1, 1].map(s => { const p = limb(0.22, 0.55, armMat, 0.07); p.position.set(s * 1.18, cy + 0.05, 0.1); p.rotation.z = s * 0.35;
    const h = M(new THREE.SphereGeometry(0.34, 18, 12), glove, { out: 0.07 }); h.position.y = -1.0; p.add(h);
    const tp = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 8, 18), tape); tp.rotation.x = Math.PI / 2; tp.position.y = -0.72; p.add(tp);
    p.userData.hand = h; body.add(p); return p; });
  // legs + wrestling boots
  const bootMat = toon(0x7b2a8c);
  const legs = [-1, 1].map(s => { const p = limb(0.2, 0.12, armMat, 0.1); p.position.set(s * 0.5, 0.62, 0);
    const boot = M(new THREE.CylinderGeometry(0.27, 0.3, 0.38, 16), bootMat, { out: 0.08 }); boot.position.y = -0.4; p.add(boot);
    const sole = M(new THREE.SphereGeometry(0.3, 14, 8), toon(0x56196a), { out: 0.08 }); sole.scale.set(1, 0.4, 1.4); sole.position.set(0, -0.57, 0.08); p.add(sole);
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.035, 6, 20), tape); stripe.rotation.x = Math.PI / 2; stripe.position.y = -0.3; p.add(stripe);
    body.add(p); return p; });
  // dizzy stars
  const stars = new THREE.Group(); stars.position.y = cy + R + 0.6; stars.visible = false; body.add(stars);
  for (let i = 0; i < 4; i++) { const s = M(new THREE.OctahedronGeometry(0.14), toon(0xffe45a, { emissive: 0x664400 }), { out: 0.15 }); stars.add(s); }
  root.userData = { sq, spin, body, torso, eyes, arms, legs, grin: grinG2, roarMouth, stars, R, cy, kind: 'naranjo' };
  root.userData.mats = collectMats(root);
  return root;
}

// ---------- arena ----------
function buildArena(scene) {
  const g = new THREE.Group(); scene.add(g);
  // v1.5 ring top: pale birch planks framed by a caramel rail, sitting on a dark confetti-terrazzo counter.
  const wood = canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = '#dcb784'; c.fillRect(0, 0, w, h);
    const n = 9, s = w / n;
    for (let i = 0; i < n; i++) { const l = 70 + Math.random() * 6, hue = 32 + Math.random() * 6;
      c.fillStyle = `hsl(${hue},58%,${l}%)`; c.fillRect(i * s + 2, 0, s - 4, h);
      c.strokeStyle = `hsla(${hue},45%,${l - 16}%,0.45)`; c.lineWidth = 1.6;
      for (let k = 0; k < 7; k++) { const x0 = i * s + s * (0.1 + Math.random() * 0.8); c.beginPath(); c.moveTo(x0, 0);
        for (let y = 0; y <= h; y += 32) c.lineTo(x0 + Math.sin(y * 0.01 + k) * 5 + Math.sin(y * 0.043 + i) * 2, y); c.stroke(); }
      const off = Math.random() * h; c.fillStyle = `hsla(${hue},40%,${l - 20}%,0.5)`; c.fillRect(i * s, off, s, 2); }
  });
  const block = new THREE.Mesh(new THREE.CylinderGeometry(ARENA_R + 0.8, ARENA_R + 1.0, 0.8, 72),
    [new THREE.MeshStandardMaterial({ color: 0xd9a86a, roughness: 0.6 }), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.5 }), new THREE.MeshStandardMaterial({ color: 0xa8743e })]);
  block.position.y = -0.4; block.receiveShadow = true; g.add(block);
  const rail = new THREE.Mesh(new THREE.TorusGeometry(ARENA_R + 0.72, 0.2, 12, 120), toon(0xc07a3c)); rail.rotation.x = Math.PI / 2; rail.position.y = 0.04; rail.receiveShadow = true; rail.castShadow = true; g.add(rail);
  // juice groove
  const groove = new THREE.Mesh(new THREE.RingGeometry(ARENA_R + 0.15, ARENA_R + 0.45, 90), new THREE.MeshStandardMaterial({ color: 0xd4a066, roughness: 0.3 }));
  groove.rotation.x = -Math.PI / 2; groove.position.y = 0.005; g.add(groove);
  // countertop: deep teal terrazzo with confetti chips
  const terrazzo = canvasTex(1024, 1024, (c, w, h) => { c.fillStyle = '#1f3a3c'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(10,30,32,${Math.random() * 0.5})`; c.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    const chips = ['#f4efe2', '#f4efe2', '#f4efe2', '#ff8a7a', '#ffc85a', '#9fd8c8', '#8fb8e8', '#f7a64a'];
    for (let i = 0; i < 2600; i++) { const x = Math.random() * w, y = Math.random() * h, r = 1.2 + Math.pow(Math.random(), 3) * 7;
      c.fillStyle = chips[Math.floor(Math.random() * chips.length)]; c.beginPath();
      for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283 + Math.random(); c.lineTo(x + Math.cos(a) * r * (0.6 + Math.random() * 0.6), y + Math.sin(a) * r * (0.6 + Math.random() * 0.6)); } c.fill(); } }, { repeat: [10, 10] });
  const counter = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ map: terrazzo, roughness: 0.28, metalness: 0 }));
  counter.rotation.x = -Math.PI / 2; counter.position.y = -0.8; counter.receiveShadow = true; g.add(counter);
  // cinnamon posts + twine ropes
  const cinn = toon(0x8a4a22, { bumpMap: poreTex, bumpScale: 3 });
  const postPos = [];
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; const p = new THREE.Vector3(Math.cos(a) * (ARENA_R + 0.5), 0, Math.sin(a) * (ARENA_R + 0.5)); postPos.push(p);
    const post = M(new THREE.CylinderGeometry(0.22, 0.24, 2.6, 12), cinn, { out: 0.08 }); post.position.copy(p).setY(1.2); g.add(post);
    const cap = M(new THREE.SphereGeometry(0.26, 12, 8), toon(0xe0413a), { out: 0.08 }); cap.position.copy(p).setY(2.55); g.add(cap); }
  const twine = canvasTex(64, 16, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#e0413a'; c.fillRect(i * 8, 0, 8, h); } }, { repeat: [20, 1] });
  const ropeMat = toon(0xffffff, { map: twine });
  for (let i = 0; i < 8; i++) { const a = postPos[i], b = postPos[(i + 1) % 8], len = a.distanceTo(b);
    for (const y of [0.9, 1.6, 2.3]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, len, 6), ropeMat);
      r.position.copy(a).add(b).multiplyScalar(0.5).setY(y); r.lookAt(b.clone().setY(y)); r.rotateX(Math.PI / 2); r.castShadow = true; g.add(r); } }
  // back walls: pale seafoam square tiles with white grout; a washed-out window flanked by coral curtains
  const tilesTex = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#f7fbf8'; c.fillRect(0, 0, w, h); const n = 6, s = w / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = i * s, y = j * s, l = 84 + Math.random() * 3;
      const gr = c.createLinearGradient(x, y, x + s, y + s); gr.addColorStop(0, `hsl(158,34%,${l + 3}%)`); gr.addColorStop(1, `hsl(162,30%,${l - 2}%)`);
      c.fillStyle = gr; c.fillRect(x + 3, y + 3, s - 6, s - 6); c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(x + 7, y + 6, s * 0.5, 4); } }, { repeat: [16, 7] });
  const wallMat = new THREE.MeshStandardMaterial({ map: tilesTex, roughness: 0.22 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(120, 40), wallMat); back.position.set(0, 19, -32); g.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(120, 40), wallMat); left.position.set(-34, 19, 0); left.rotation.y = Math.PI / 2; g.add(left);
  const right = left.clone(); right.position.x = 34; right.rotation.y = -Math.PI / 2; g.add(right);
  const front = back.clone(); front.position.z = 32; front.rotation.y = Math.PI; g.add(front);
  const sunset = canvasTex(512, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fbe9cf'); gr.addColorStop(0.6, '#ffd9a8'); gr.addColorStop(1, '#ffe9c4');
    c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#fff8e6'; c.beginPath(); c.arc(w * 0.7, h * 0.6, 34, 0, 7); c.fill();
    c.fillStyle = '#e9a98a'; c.beginPath(); c.moveTo(0, h); c.lineTo(0, h * 0.78); c.quadraticCurveTo(w * 0.28, h * 0.6, w * 0.52, h * 0.82); c.quadraticCurveTo(w * 0.78, h * 0.66, w, h * 0.8); c.lineTo(w, h); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)'; for (const [x, y, r] of [[0.2, 0.25, 26], [0.26, 0.22, 20], [0.55, 0.18, 22]]) { c.beginPath(); c.arc(w * x, h * y, r, 0, 7); c.fill(); } });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(26, 13), new THREE.MeshBasicMaterial({ map: sunset })); win.position.set(0, 14, -31.9); g.add(win);
  const frameMat = toon(0xfffaf0);
  for (const [w, h, x, y] of [[27, 0.8, 0, 20.5], [27, 0.8, 0, 7.5], [0.8, 13.8, -13.1, 14], [0.8, 13.8, 13.1, 14], [0.6, 13, 0, 14]]) {
    const f = M(new THREE.BoxGeometry(w, h, 0.6), frameMat, { out: 0.03 }); f.position.set(x, y, -31.6); g.add(f); }
  // coral curtains: a pleated plane on each side of the window
  const curtainMat = new THREE.MeshStandardMaterial({ color: 0xf0605a, roughness: 0.85, side: THREE.DoubleSide });
  for (const x of [-15.2, 15.2]) { const geo = new THREE.PlaneGeometry(4.6, 15, 24, 1), pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) pa.setZ(i, Math.sin(pa.getX(i) * 4.2) * 0.35); geo.computeVertexNormals();
    const cur = new THREE.Mesh(geo, curtainMat); cur.position.set(x, 13.6, -31.1); g.add(cur); }
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 36, 10), toon(0xc07a3c)); rod.rotation.z = Math.PI / 2; rod.position.set(0, 21.3, -31.1); g.add(rod);
  // props on the back counter: jars with mint gingham cloth caps, kettle, basil pot, pans
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xf2fbf8, roughness: 0.04, transparent: true, opacity: 0.3, clearcoat: 1, envMapIntensity: 1.8 });
  const gingham = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#fbfaf2'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(95,190,160,0.55)';
    for (let i = 0; i < 8; i += 2) { c.fillRect(i * 16, 0, 16, h); c.fillRect(0, i * 16, w, 16); } }, { repeat: [6, 1] });
  const jars = [[-20, -22, 3, 7, 0xffc04a], [-15.5, -23, 2.4, 5.5, 0xf07a6a], [-11.5, -24, 2.2, 6.5, 0xa9d87a], [17, -21, 2.8, 6, 0xffe38a]];
  for (const [x, z, r, h, col] of jars) {
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32), glass); jar.position.set(x, h / 2 - 0.8, z); g.add(jar);
    const fill = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, h * 0.7, 24), toon(col)); fill.position.set(x, h * 0.35 - 0.7, z); g.add(fill);
    const cloth = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.2, 1.1, 32, 1, true), toon(0xffffff, { map: gingham, side: THREE.DoubleSide })); cloth.position.set(x, h - 0.5, z); g.add(cloth);
    const top = new THREE.Mesh(new THREE.CircleGeometry(r * 1.02, 32), toon(0xffffff, { map: gingham })); top.rotation.x = -Math.PI / 2; top.position.set(x, h + 0.05, z); g.add(top);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(r * 1.03, 0.08, 6, 32), toon(0xc07a3c)); tie.rotation.x = Math.PI / 2; tie.position.set(x, h - 0.35, z); g.add(tie);
  }
  const chrome = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.12 });
  const kettle = new THREE.Mesh(new THREE.SphereGeometry(4.5, 40, 30), chrome); kettle.scale.set(1, 0.85, 1); kettle.position.set(24, 3, -14); g.add(kettle);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 5, 16), chrome); spout.position.set(19.5, 4.5, -12); spout.rotation.z = 0.9; g.add(spout);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.3, 10, 24, Math.PI), toon(0x2b2b2b)); handle.position.set(24, 6.5, -14); g.add(handle);
  const pot = M(new THREE.CylinderGeometry(2.6, 2.0, 4, 20), toon(0xc8643c), { out: 0.03 }); pot.position.set(-24, 1.2, -10); g.add(pot);
  for (let i = 0; i < 9; i++) { const l = M(new THREE.SphereGeometry(1.1, 10, 8), toon(0x3f9a3a), { out: 0.06 }); l.scale.set(1, 0.4, 0.7);
    l.position.set(-24 + Math.cos(i * 0.7) * 1.6, 4 + Math.random() * 3, -10 + Math.sin(i * 0.7) * 1.6); l.rotation.set(Math.random(), Math.random() * 6, Math.random()); g.add(l); }
  const copper = new THREE.MeshStandardMaterial({ color: 0xd9824a, metalness: 1, roughness: 0.25 });
  for (const [x, r] of [[-22, 3], [-16, 2.3], [21, 2.6]]) { const pan = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, 0.8, 30), copper); pan.rotation.x = Math.PI / 2; pan.position.set(x, 24, -31); g.add(pan);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 3, 8), copper); h.position.set(x, 24 + r + 1.3, -31.2); g.add(h); }
  return g;
}

// ---------- FX: juice particles, splats, shockwave, sparks ----------
export class FX {
  constructor(scene) {
    this.scene = scene;
    const N = this.N = 700;
    this.parts = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.92, emissive: 0x553300 }), N);
    this.parts.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.parts.frustumCulled = false; scene.add(this.parts);
    this.p = Array.from({ length: N }, () => ({ alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), s: 0, life: 0, col: new THREE.Color() }));
    this.cursor = 0; this.dummy = new THREE.Object3D();
    for (let i = 0; i < N; i++) { this.dummy.scale.setScalar(0); this.dummy.updateMatrix(); this.parts.setMatrixAt(i, this.dummy.matrix); this.parts.setColorAt(i, new THREE.Color(1, 1, 1)); }
    // splats
    this.splatTex = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#fff';
      for (let i = 0; i < 14; i++) { const a = Math.random() * 7, d = i ? 30 + Math.random() * 70 : 0, r = i ? 10 + Math.random() * 26 : 70;
        c.beginPath(); c.arc(w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d, r, 0, 7); c.fill(); } }, { srgb: false });
    this.splats = []; this.splatGeo = new THREE.PlaneGeometry(1, 1);
    // shockwaves + telegraphs
    this.rings = [];
    this.blobs = [];
    // impact sparks
    const starTex = canvasTex(128, 128, (c, w, h) => { c.translate(64, 64); c.fillStyle = '#fff';
      c.beginPath(); for (let i = 0; i < 16; i++) { const r = i % 2 ? 18 : 60, a = i / 16 * Math.PI * 2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.fill(); });
    this.sparks = Array.from({ length: 8 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: 0xfff6c0, transparent: true, depthTest: false, blending: THREE.AdditiveBlending }));
      s.visible = false; s.userData.t = 1; scene.add(s); return s; });
  }
  juice(pos, color, n = 20, spd = 5, up = 4) {
    for (let i = 0; i < n; i++) { const q = this.p[this.cursor]; this.cursor = (this.cursor + 1) % this.N;
      q.alive = true; q.pos.copy(pos); q.vel.set((Math.random() - 0.5) * spd * 2, Math.random() * up + 1, (Math.random() - 0.5) * spd * 2);
      q.s = 0.035 + Math.random() * 0.075; q.life = 0; q.col.set(color); q.col.offsetHSL((Math.random() - 0.5) * 0.03, 0, (Math.random() - 0.5) * 0.1); }
  }
  splat(x, z, color, size = 1) {
    if (Math.hypot(x, z) > ARENA_R + 0.7) return;
    const m = new THREE.Mesh(this.splatGeo, new THREE.MeshStandardMaterial({ color, alphaMap: this.splatTex, transparent: true, roughness: 0.08, metalness: 0, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
    m.rotation.set(-Math.PI / 2, 0, Math.random() * 7); m.position.set(x, 0.01 + this.splats.length * 0.0002, z); m.userData = { target: size * (0.6 + Math.random() * 0.8), t: 0 };
    m.scale.setScalar(0.01); m.receiveShadow = true; this.scene.add(m); this.splats.push(m);
    if (this.splats.length > 160) { const old = this.splats.shift(); this.scene.remove(old); old.material.dispose(); }
  }
  // v1.5 hero splash: a cluster of glossy juice blobs that swell, wobble and burst into droplets and floor splats.
  burst(pos, color, scale = 1) {
    this.blobGeo ??= new THREE.IcosahedronGeometry(1, 3);
    const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.4, emissive: color, emissiveIntensity: 0.12 });
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(this.blobGeo, mat), d = new THREE.Vector3().randomDirection().multiplyScalar((0.3 + Math.random()) * 1.3 * scale);
      d.y = Math.abs(d.y) * 1.3 + 0.3 * scale; m.position.copy(pos).add(d); m.scale.setScalar(0.001); m.castShadow = true; this.scene.add(m);
      this.blobs.push({ m, t: -i * 0.012, r: (0.22 + Math.random() * 0.3) * scale, vel: d.clone().multiplyScalar(1.6), color, popped: false, ph: Math.random() * 6 });
    }
  }
  spark(pos, size = 1.4) { const s = this.sparks.find(s => s.userData.t >= 1) || this.sparks[0]; s.position.copy(pos); s.userData.t = 0; s.userData.size = size; s.visible = true; s.material.rotation = Math.random() * 6; }
  ring(pos, { color = 0xff8f24, speed = 10, max = ARENA_R + 1, width = 0.6, telegraph = false, life = 1 } = {}) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: telegraph ? 0.5 : 0.9, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(pos.x, 0.05, pos.z); this.scene.add(m);
    const r = { mesh: m, r: telegraph ? max : 0.5, speed, max, width, telegraph, life, t: 0, hit: false }; this.rings.push(r); return r;
  }
  update(dt, onLand) {
    const d = this.dummy;
    for (let i = 0; i < this.N; i++) { const q = this.p[i]; if (!q.alive) continue;
      q.life += dt; q.vel.y -= 18 * dt; q.pos.addScaledVector(q.vel, dt);
      if (q.pos.y < 0.02) { q.alive = false; if (Math.random() < 0.18) onLand?.(q); }
      if (q.life > 2.5) q.alive = false;
      d.position.copy(q.pos); const st = Math.min(1.8, 1 + q.vel.length() * 0.04); d.scale.set(q.s, q.s * st, q.s); d.lookAt(q.pos.clone().add(q.vel)); d.rotateX(Math.PI / 2);
      if (!q.alive) d.scale.setScalar(0); d.updateMatrix(); this.parts.setMatrixAt(i, d.matrix); this.parts.setColorAt(i, q.col); }
    this.parts.instanceMatrix.needsUpdate = true; this.parts.instanceColor.needsUpdate = true;
    for (const s of this.splats) { const u = s.userData; if (u.t < 1) { u.t = Math.min(1, u.t + dt * 5); s.scale.setScalar(u.target * (1 - Math.pow(1 - u.t, 3))); } }
    for (const s of this.sparks) { if (s.userData.t >= 1) continue; s.userData.t += dt * 6; const k = s.userData.t; s.scale.setScalar(s.userData.size * (0.5 + k)); s.material.opacity = 1 - k; if (k >= 1) s.visible = false; }
    for (let i = this.blobs.length - 1; i >= 0; i--) { const b = this.blobs[i]; b.t += dt; if (b.t < 0) continue;
      const k = b.t / 0.95, grow = k < 0.2 ? 1 - Math.pow(1 - k / 0.2, 3) : 1, shrink = k > 0.55 ? Math.max(0, 1 - (k - 0.55) / 0.45) : 1;
      b.m.position.addScaledVector(b.vel, dt * (1 - k)); const w = 1 + Math.sin(b.t * 22 + b.ph) * 0.12 * shrink;
      b.m.scale.set(b.r * grow * shrink * w, b.r * grow * shrink / w, b.r * grow * shrink * w);
      if (k > 0.55 && !b.popped) { b.popped = true; this.juice(b.m.position, b.color, 6, 5, 4); this.splat(b.m.position.x + (Math.random() - 0.5) * 2, b.m.position.z + (Math.random() - 0.5) * 2, b.color, 1.2 + b.r * 2); }
      if (k >= 1) { this.scene.remove(b.m); this.blobs.splice(i, 1); } }
    for (let i = this.rings.length - 1; i >= 0; i--) { const r = this.rings[i]; r.t += dt;
      if (r.telegraph) { const k = Math.min(1, r.t / r.life); r.mesh.scale.setScalar(r.max * k); r.mesh.material.opacity = 0.3 + 0.4 * Math.abs(Math.sin(r.t * 14)); }
      else { r.r += r.speed * dt; r.mesh.scale.setScalar(r.r); r.mesh.material.opacity = 0.9 * (1 - r.r / r.max); }
      if ((r.telegraph && r.t > r.life) || (!r.telegraph && r.r > r.max) || r.dead) { this.scene.remove(r.mesh); r.mesh.geometry.dispose(); this.rings.splice(i, 1); } }
  }
  clearSplats() { for (const s of this.splats) this.scene.remove(s); this.splats.length = 0; }
}

// ---------- colour grade (runs after tone mapping, in display space) ----------
// High-key look: lift the blacks toward warm cream, warm the highlights, add a soft light haze from the window side
// (upper left) and a gentle vignette. `haze` and `lift` can be animated (e.g. brighter during the reveal).
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, lift: { value: 0.045 }, haze: { value: 0.12 }, vig: { value: 0.22 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, lift, haze, vig; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      c = mix(vec3(0.16, 0.12, 0.10), vec3(1.0), c) * (1.0 - lift) + lift * vec3(1.0, 0.95, 0.86);   // lifted, warm shadows
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c += vec3(0.035, 0.018, -0.02) * smoothstep(0.55, 1.0, l);                                         // warm highlights
      float h = haze * (1.0 - smoothstep(0.0, 1.25, distance(vUv, vec2(0.18, 1.05))))   // edge0 < edge1: reversed edges are undefined in GLSL and break on some phone GPUs
               * (0.92 + 0.08 * sin(time * 0.7));
      c = mix(c, vec3(1.0, 0.97, 0.9), h);                                                                // window light haze
      float v = smoothstep(0.35, 0.95, distance(vUv, vec2(0.5)));
      c *= 1.0 - vig * v;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

// ---------- world ----------
// Phones (coarse pointer or a small screen) get a lighter setup: lower pixel ratio, smaller shadow map, no MSAA.
export const MOBILE = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 600;
// Try the fast GPU first, then whatever the browser will give us. Throws a readable error when WebGL is unavailable.
function makeRenderer(canvas) {
  const tries = [{ powerPreference: 'high-performance' }, {}, { failIfMajorPerformanceCaveat: false }];
  let last;
  for (const o of tries) { try { return new THREE.WebGLRenderer({ canvas, antialias: false, ...o }); } catch (e) { last = e; } }
  throw new Error('WebGL could not start on this device (' + (last?.message || 'unknown') + '). Try closing other tabs, or turn on hardware acceleration.');
}
// Some phone GPUs cannot render into half-float targets, which bloom, the composer and the environment map all use.
function halfFloatOK(renderer) {
  const gl = renderer.getContext();
  if (!renderer.capabilities.isWebGL2 && !gl.getExtension('EXT_color_buffer_half_float')) return false;
  if (renderer.capabilities.isWebGL2 && !gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) return false;
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
  renderer.setRenderTarget(rt); const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  renderer.setRenderTarget(null); rt.dispose(); return ok;
}
// The film is framed for 16:9. On narrower screens (a phone held upright) widen the vertical FOV so more of the
// horizontal framing survives, capped so it doesn't turn into a fisheye.
const BASE_FOV = 50, BASE_ASPECT = 16 / 9, MAX_FOV = 82;
export function fitCamera(camera, w, h) {
  const a = w / h; camera.aspect = a;
  camera.fov = a >= BASE_ASPECT ? BASE_FOV : Math.min(MAX_FOV, 2 * Math.atan(Math.tan(BASE_FOV * Math.PI / 360) * BASE_ASPECT / a) * 180 / Math.PI);
  camera.updateProjectionMatrix();
}
// The real layout box (the frame in embedded viewers), not the window's idea of it.
export function viewSize() { const d = document.documentElement; return [d.clientWidth || innerWidth, d.clientHeight || innerHeight]; }
export function createWorld(canvas) {
  const renderer = makeRenderer(canvas);
  renderer.setPixelRatio(Math.min(MOBILE ? 1.5 : 2, devicePixelRatio)); renderer.setSize(...viewSize());
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Neutral tone mapping keeps the lemon a clean yellow (ACES pushed it olive).
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 0.92;
  const qp = new URLSearchParams(location.search);
  const hf = !qp.has('lowgl') && halfFloatOK(renderer);   // ?lowgl forces the 8-bit path for testing
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeef3ea);
  scene.fog = new THREE.Fog(0xf1efe4, 42, 120);
  if (hf) { const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.6; pmrem.dispose(); }
  const camera = new THREE.PerspectiveCamera(BASE_FOV, 16 / 9, 0.1, 300);
  fitCamera(camera, ...viewSize());
  camera.position.set(0, 1.6, 9);
  // lights (v1.5 high key): big soft sky fill with lifted shadows, a warm window key, a mint bounce rim
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0xcdb89c, hf ? 1.05 : 1.35));
  const sun = new THREE.DirectionalLight(0xffe2bc, 1.8); sun.position.set(8, 18, -16); sun.castShadow = true;
  const sm = MOBILE ? 1024 : 2048;
  sun.shadow.mapSize.set(sm, sm); const sc = sun.shadow.camera; sc.left = sc.bottom = -16; sc.right = sc.top = 16; sc.near = 1; sc.far = 60; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xc8f0e0, 1.0); rim.position.set(-10, 8, 14); scene.add(rim);
  buildArena(scene);
  const fx = new FX(scene);
  // Post chain: RenderPass -> bloom (half float only) -> OutputPass -> grade. Target is half float where the GPU can
  // render to it (MSAA on desktop only), plain 8-bit otherwise.
  const grade = new ShaderPass(GradeShader);
  const [vw, vh] = viewSize();
  function buildComposer(half) {
    const pr = renderer.getPixelRatio();
    const rt = new THREE.WebGLRenderTarget(vw * pr, vh * pr, { type: half ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: MOBILE || !renderer.capabilities.isWebGL2 ? 0 : 4 });
    const c = new EffectComposer(renderer, rt);
    c.addPass(new RenderPass(scene, camera));
    if (half) c.addPass(new UnrealBloomPass(new THREE.Vector2(vw, vh), 0.22, 0.6, 0.93));
    c.addPass(new OutputPass()); c.addPass(grade);
    return c;
  }
  // Self-test: some phone GPUs and WebViews (seen in the Claude Android app) accept every call but draw nothing except the
  // clear colour. Render a small red test scene through each pipeline, read one pixel back, and use the first that
  // really draws: full post chain -> 8-bit post chain without bloom/env -> plain direct render. ?safe forces direct.
  function drawsRed(render) {
    const ts = new THREE.Scene(); ts.background = scene.background; ts.fog = scene.fog; ts.environment = scene.environment;
    const tc = new THREE.PerspectiveCamera(50, vw / vh, 0.1, 100);
    const l = new THREE.DirectionalLight(0xffffff, 2); l.position.set(2, 5, 3); l.castShadow = true; ts.add(l, new THREE.HemisphereLight(0xffffff, 0x888888, 1));
    const box = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 1), toon(0xff2010)); box.position.z = -8; box.castShadow = box.receiveShadow = true; ts.add(box);
    const out = new Uint8Array(4), gl = renderer.getContext();
    try { render(ts, tc); gl.readPixels(Math.floor(gl.drawingBufferWidth / 2), Math.floor(gl.drawingBufferHeight / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out); }
    catch (e) { return false; } finally { box.geometry.dispose(); box.material.dispose(); l.dispose(); }
    return out[0] > out[1] + 60 && out[0] > out[2] + 60;
  }
  // Without bloom, grade and the env map the image reads darker and chrome goes black: open up and soften metals.
  const env = scene.environment, bright = () => { scene.environment = null; renderer.toneMappingExposure = 1.15;
    scene.traverse(o => { const m = o.material; if (m && m.metalness > 0.4) { m.metalness = 0.25; m.roughness = Math.max(m.roughness, 0.35); } }); };
  const viaComposer = c => (ts, tc) => { const p = c.passes[0]; p.scene = ts; p.camera = tc; try { c.render(); } finally { p.scene = scene; p.camera = camera; } };
  const direct = (ts, tc) => { renderer.setRenderTarget(null); renderer.render(ts, tc); };
  let composer = null, mode = 'direct';
  if (!qp.has('safe')) {
    if (hf) { const c = buildComposer(true); if (drawsRed(viaComposer(c))) { composer = c; mode = 'post'; } else c.dispose(); }
    if (!composer) { if (env) { scene.environment = null; } const c = buildComposer(false); if (drawsRed(viaComposer(c))) { composer = c; mode = 'post8'; bright(); } else c.dispose(); }
  }
  if (!composer) { bright(); if (!qp.has('safe') && !drawsRed(direct)) console.error('WebGL self-test: this device drew nothing in any render mode.'); }
  renderer.setRenderTarget(null); renderer.clear();
  const resize = () => { const [w, h] = viewSize(); renderer.setSize(w, h); composer?.setSize(w, h); fitCamera(camera, w, h); };
  addEventListener('resize', resize);
  // The Android app's viewer resizes its frame without always firing a window resize; watch the root box too.
  if (window.ResizeObserver) new ResizeObserver(resize).observe(document.documentElement);
  // Phones drop the GL context under memory pressure or when the tab goes to the background. Ask the browser to give it
  // back instead of leaving a dead canvas; three.js rebuilds its state on restore.
  let lost = false;
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; });
  canvas.addEventListener('webglcontextrestored', () => { lost = false; resize(); });
  return { THREE, renderer, scene, camera, fx, composer, grade, mode, render: () => {
    if (lost) return; grade.uniforms.time.value = performance.now() / 1000;
    if (composer) composer.render(); else { renderer.setRenderTarget(null); renderer.render(scene, camera); } } };
}

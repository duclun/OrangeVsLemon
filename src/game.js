// Act 3 (3D film shots) and the playable boss fight. Both run in the same scene so the handoff has no cut.
import * as THREE from 'three';
import { makeZest, makeNaranjo, ARENA_R, toon, outline } from './world3d.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const damp = (a, b, s, dt) => a + (b - a) * (1 - Math.exp(-s * dt));
const angDamp = (a, b, s, dt) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * (1 - Math.exp(-s * dt)); };
const yawTo = v => Math.atan2(v.x, v.z);

const LEMON = 0xffd83a, ORANGE = 0xff8a1c;
const PROPS = {
  sugar: { name: 'Sugar cube', dmg: 14, stun: 0.8, r: 0.25, col: 0xffffff },
  bean: { name: 'Coffee bean', dmg: 9, r: 0.2, col: 0x4a2a16 },
  berry: { name: 'Raspberry', dmg: 11, r: 0.24, col: 0xd8264a, juice: 0xd8264a },
  ice: { name: 'Ice cube', dmg: 16, slow: 3, r: 0.27, col: 0xcfefff },
  seed: { name: 'Pip', dmg: 7, r: 0.15, col: 0xf6ecc8 },
};

export function createGame(world, sound, ui) {
  const { scene, camera, fx } = world;
  const zest = makeZest(), nar = makeNaranjo();
  zest.scale.setScalar(1.2); scene.add(zest, nar);
  const Z = zest.userData, N = nar.userData;

  // ---------- prop meshes ----------
  const propGeo = {
    sugar: new THREE.BoxGeometry(0.44, 0.44, 0.44), bean: new THREE.SphereGeometry(1, 14, 10), berry: new THREE.IcosahedronGeometry(0.24, 1),
    ice: new THREE.BoxGeometry(0.5, 0.5, 0.5), seed: new THREE.SphereGeometry(1, 12, 8),
  };
  const propMat = {
    sugar: new THREE.MeshPhysicalMaterial({ color: 0xfffdf5, roughness: 0.7, sheen: 1, sheenColor: 0xffffff, clearcoat: 0.2 }),
    bean: toon(0x5a321a), berry: new THREE.MeshStandardMaterial({ color: 0xd8264a, flatShading: true, roughness: 0.35 }),
    ice: new THREE.MeshPhysicalMaterial({ color: 0xdff4ff, roughness: 0.02, transparent: true, opacity: 0.55, clearcoat: 1, envMapIntensity: 2 }),
    seed: toon(0xf6ecc8),
  };
  function makePropMesh(type) {
    const m = new THREE.Mesh(propGeo[type], propMat[type]); m.castShadow = true;
    if (type === 'bean') m.scale.set(0.17, 0.12, 0.25); if (type === 'seed') m.scale.set(0.1, 0.07, 0.17);
    if (type !== 'ice') outline(m, type === 'bean' || type === 'seed' ? 0.15 : 0.08);
    if (type === 'bean') { const g = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.02, 1.6), new THREE.MeshBasicMaterial({ color: 0x2a160a })); g.position.y = 0.2; m.add(g); }
    if (type === 'berry') { const l = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.08, 5), toon(0x4d9a2a)); l.position.y = 0.24; m.add(l); }
    scene.add(m); return m;
  }

  // ---------- state ----------
  const S = {};
  const input = { mx: 0, my: 0, buf: {} };
  function press(a) { input.buf[a] = 0.15; }
  function consume(a) { if (input.buf[a] > 0) { input.buf[a] = 0; return true; } return false; }

  function reset() {
    for (const p of S.props || []) scene.remove(p.mesh);
    for (const p of S.proj || []) scene.remove(p.mesh);
    fx.clearSplats();
    Object.assign(S, {
      mode: 'film', t: 0, hitstop: 0, shake: 0, camLook: V(0, 1.4, 0), camDir: V(-1, 0, 0), elapsed: 0,
      player: { pos: V(-3, 0, 0), vel: V(), yaw: Math.PI / 2, hp: 100, grounded: true, action: null, combo: 0, comboT: 0, iframes: 0, dodgeCd: 0, carry: null, hits: 0, flash: 0, runPh: 0 },
      boss: { pos: V(3.5, 0, 0), vel: V(), yaw: -Math.PI / 2, hp: 420, max: 420, state: 'intro', st: 0, cd: 1.6, phase: 1, chargeDir: V(), bounces: 0, flash: 0, stun: 0, slow: 0, leapFrom: V(), target: V(), volleys: 0, telegraph: null, shock: null, walkPh: 0 },
      props: [], proj: [], dropT: 0,
    });
    const types = ['sugar', 'sugar', 'bean', 'bean', 'berry', 'berry', 'ice', 'sugar'];
    types.forEach((ty, i) => { const a = i / types.length * Math.PI * 2 + 0.3, r = 6 + (i % 3) * 1.8; spawnProp(ty, V(Math.cos(a) * r, 0, Math.sin(a) * r)); });
    placeChars();
  }
  function spawnProp(type, pos, vel = V()) {
    const p = { type, mesh: makePropMesh(type), pos: pos.clone(), vel: vel.clone(), state: vel.lengthSq() ? 'fly' : 'rest', spin: V(Math.random() * 6, Math.random() * 6, 0), thrown: false };
    p.pos.y = Math.max(p.pos.y, PROPS[type].r); S.props.push(p); return p;
  }
  function placeChars() {
    zest.position.copy(S.player.pos); zest.rotation.y = S.player.yaw;
    nar.position.copy(S.boss.pos); nar.rotation.y = S.boss.yaw;
  }

  // ---------- posing ----------
  function poseZest(mode, dt, o = {}) {
    const t = S.t, u = Z, L = (obj, k, v, s = 14) => obj[k] = damp(obj[k], v, s, dt);
    let ax = [-1.2, -1.2], az = [-0.25, 0.25], as = [1, 1], lx = [0, 0], sq = 1 + Math.sin(t * 4) * 0.025, tilt = 0, spinX = 0;
    if (mode === 'run') { const ph = S.player.runPh; lx = [Math.sin(ph) * 0.9, -Math.sin(ph) * 0.9]; ax = [-0.6 - Math.sin(ph) * 0.7, -0.6 + Math.sin(ph) * 0.7]; sq = 1 + Math.abs(Math.sin(ph)) * 0.05; tilt = 0.15; }
    if (mode === 'punch') { const i = o.arm; ax[i] = -1.57; as[i] = 1.9; ax[1 - i] = -1.6; az[i] = i ? -0.15 : 0.15; tilt = 0.2; }
    if (mode === 'upper') { ax = [-2.8, -2.8]; as = [1.6, 1.6]; sq = 1.15; }
    if (mode === 'spin') { ax = [-1.57, -1.57]; az = [-1.5, 1.5]; as = [1.7, 1.7]; }
    if (mode === 'windup') { ax = [0.6, 0.6]; az = [-0.6, 0.6]; sq = 0.85; }
    if (mode === 'carry') { ax = [-3.0, -3.0]; az = [0.25, -0.25]; }
    if (mode === 'throw') { ax = [-1.2, -1.2]; as = [1.5, 1.5]; tilt = 0.3; }
    if (mode === 'air') { lx = [-0.6, 0.4]; ax = [-2.4, -0.8]; sq = S.player.vel.y > 0 ? 1.12 : 0.95; }
    if (mode === 'dodge') { spinX = o.k * Math.PI * 2; sq = 0.8; ax = [-2, -2]; lx = [-1, -1]; }
    if (mode === 'hurt') { tilt = -0.5; ax = [-2.2, -2.2]; az = [-0.9, 0.9]; sq = 0.85; }
    if (mode === 'cheer') { ax = [-2.9 + Math.sin(t * 12) * 0.2, -2.9 - Math.sin(t * 12) * 0.2]; az = [-0.4, 0.4]; sq = 1 + Math.abs(Math.sin(t * 6)) * 0.12; }
    if (mode === 'ko') { tilt = -1.4; ax = [-3, -3]; az = [-1.2, 1.2]; sq = 0.7; }
    for (let i = 0; i < 2; i++) { L(u.arms[i].rotation, 'x', ax[i], 18); L(u.arms[i].rotation, 'z', az[i], 18); L(u.arms[i].scale, 'y', as[i], 22); L(u.legs[i].rotation, 'x', lx[i], 16); }
    const s = damp(u.sq.scale.y, sq, 16, dt); u.sq.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
    L(u.spin.rotation, 'x', tilt, 10); if (mode === 'dodge') u.spin.rotation.x = spinX + tilt;
    if (mode === 'spin') u.spin.rotation.y = o.k * Math.PI * 2; else u.spin.rotation.y = 0;
    u.tail.rotation.y = Math.sin(t * 11) * 0.35; u.tail2.rotation.y = Math.sin(t * 11 + 1.2) * 0.6; u.tail.rotation.x = -0.3 - Math.min(1, S.player.vel.length() / 8) * 0.8;
    const blink = (t % 3.3) < 0.1 ? 0.1 : 1; for (const e of u.eyes) e.scale.y = damp(e.scale.y, blink, 30, dt);
    const fierce = o.fierce ?? true; u.brows[0].rotation.z = Math.PI / 2 + (fierce ? -0.35 : 0.1); u.brows[1].rotation.z = Math.PI / 2 + (fierce ? 0.35 : -0.1);
    const fl = S.player.flash; for (const m of u.mats) m.emissive.setRGB(fl, fl * 0.3, fl * 0.2);
  }
  function poseBoss(mode, dt, o = {}) {
    const t = S.t, u = N, L = (obj, k, v, s = 12) => obj[k] = damp(obj[k], v, s, dt);
    let ax = [0, 0], az = [-0.35, 0.35], lx = [0, 0], sq = 1 + Math.sin(t * 3) * 0.02, roll = null, waddle = 0, limbS = 1, roar = false, puff = 1;
    if (mode === 'walk') { const ph = S.boss.walkPh; lx = [Math.sin(ph) * 0.6, -Math.sin(ph) * 0.6]; waddle = Math.sin(ph) * 0.1; ax = [-0.4 + Math.sin(ph) * 0.4, -0.4 - Math.sin(ph) * 0.4]; }
    if (mode === 'flex') { ax = [-1.6, -1.6]; az = [-1.4, 1.4]; sq = 1.05; }
    if (mode === 'roar') { ax = [-2.8, -2.8]; az = [-0.9, 0.9]; roar = true; sq = 1.08 + Math.sin(t * 40) * 0.02; }
    if (mode === 'bashWind') { ax = [-0.3, -3.1]; az = [-0.35, 0.2]; sq = 1.08; }
    if (mode === 'bash') { ax = [-0.3, -0.9]; az = [-0.35, -0.2]; sq = 0.9; }
    if (mode === 'chargeWind') { ax = [0.9, 0.9]; sq = 0.8; roll = S.boss.st * 14; }
    if (mode === 'charge') { limbS = 0.2; roll = o.roll; }
    if (mode === 'barrage') { roar = true; puff = 1.12; ax = [-1, -1]; az = [-1.1, 1.1]; }
    if (mode === 'air') { ax = [-2.9, -2.9]; az = [-0.5, 0.5]; lx = [-0.5, 0.5]; sq = 1.1; }
    if (mode === 'stuck') { ax = [-1.5, -1.5]; az = [-1.3, 1.3]; sq = 0.8; waddle = Math.sin(t * 20) * 0.08; }
    if (mode === 'stunned') { ax = [0.2, 0.2]; az = [-0.9, 0.9]; waddle = Math.sin(t * 5) * 0.25; }
    if (mode === 'hurt') { sq = 0.88; ax = [0.4, 0.4]; }
    if (mode === 'dead') { sq = 0.45; az = [-1.5, 1.5]; lx = [-1.4, -1.4]; }
    for (let i = 0; i < 2; i++) { L(u.arms[i].rotation, 'x', ax[i]); L(u.arms[i].rotation, 'z', az[i]); L(u.legs[i].rotation, 'x', lx[i]);
      L(u.arms[i].scale, 'x', limbS, 20); L(u.arms[i].scale, 'y', limbS, 20); L(u.arms[i].scale, 'z', limbS, 20); L(u.legs[i].scale, 'y', limbS, 20); }
    const s = damp(u.sq.scale.y, sq, 14, dt), p = damp(u.sq.scale.x * Math.sqrt(s), puff, 10, dt); u.sq.scale.set(p / Math.sqrt(s), s, p / Math.sqrt(s));
    if (roll !== null) u.spin.rotation.x = roll; else u.spin.rotation.x = damp(u.spin.rotation.x % (Math.PI * 2), 0, 10, dt);
    u.spin.rotation.z = damp(u.spin.rotation.z, waddle, 10, dt);
    u.grin.visible = !roar; u.roarMouth.visible = roar;
    const lid = mode === 'stunned' ? -0.6 : roar ? 0.9 : 0.25; for (const e of u.eyes) e.userData.lid.rotation.x = damp(e.userData.lid.rotation.x, lid, 10, dt);
    u.stars.visible = mode === 'stunned'; if (u.stars.visible) { u.stars.rotation.y += dt * 5; u.stars.children.forEach((st, i) => st.position.set(Math.cos(i / 4 * 6.28) * 0.9, Math.sin(t * 6 + i) * 0.1, Math.sin(i / 4 * 6.28) * 0.9)); }
    const fl = S.boss.flash, rage = S.boss.phase === 3 ? 0.12 + Math.sin(t * 6) * 0.05 : 0;
    for (const m of u.mats) m.emissive.setRGB(fl + rage, fl * 0.6, fl * 0.5);
  }

  // ---------- film act 3 ----------
  const postsXZ = Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2 + Math.PI / 8; return V(Math.cos(a) * (ARENA_R + 0.5), 0, Math.sin(a) * (ARENA_R + 0.5)); });
  function gameCamIdeal() {
    const P = S.player.pos, B = S.boss.pos, d = V(P.x - B.x, 0, P.z - B.z);
    if (d.length() > 1.6) S.camDir.lerp(d.normalize(), 0.12).normalize();
    const pos = P.clone().addScaledVector(S.camDir, 7.5).add(V(0, 3.6 + P.y * 0.4, 0));
    const look = P.clone().add(V(0, 1.2, 0)).lerp(B.clone().add(V(0, 1.8, 0)), 0.38);
    return { pos, look };
  }
  const shots = [
    { at: 0, f: ft => { const k = ease(ft / 5); return { pos: V(0, 1.9, 8.5).lerp(V(2, 9, 22), k), look: V(0, 1.5, 0).lerp(V(0, 0.5, 0), k) }; } },
    { at: 5, f: ft => { const a = Math.PI - 0.9 + (ft - 5) * 0.22, B = S.boss.pos; return { pos: V(B.x + Math.cos(a) * 7, 2.4, B.z + Math.sin(a) * 7), look: B.clone().add(V(0, 1.9, 0)) }; } },
    { at: 11, f: ft => { const k = ease((ft - 11) / 5), P = S.player.pos; return { pos: P.clone().add(V(2.6, 1.8, 2.6).lerp(V(2.2, 1.7, 2.3), k)), look: P.clone().add(V(0, 1.5, 0)) }; } },
    { at: 15.6, f: () => gameCamIdeal() },
  ];
  function filmCam(ft) {
    let i = 0; while (i + 1 < shots.length && ft >= shots[i + 1].at) i++;
    const cur = shots[i].f(ft);
    const bl = i > 0 ? ease((ft - shots[i].at) / (i === 3 ? 3.2 : 1.4)) : 1;
    if (bl < 1) { const prev = shots[i - 1].f(ft); cur.pos = prev.pos.lerp(cur.pos, bl); cur.look = prev.look.lerp(cur.look, bl); }
    // never let a blended camera pass through Zest: keep it outside a 3.2-unit cylinder around him
    const P = S.player.pos, off = V(cur.pos.x - P.x, 0, cur.pos.z - P.z), d = off.length();
    if (ft > 11 && d < 3.2) { off.multiplyScalar((d > 0.01 ? 1 / d : 0) * 3.2); cur.pos.x = P.x + off.x; cur.pos.z = P.z + off.z; }
    return cur;
  }
  const events = new Set();
  function once(name, cond, fn) { if (cond && !events.has(name)) { events.add(name); fn(); } }
  function filmUpdate(ft, dt) {
    S.t += dt;
    once('roar', ft >= 6, () => { sound.sfx('roar'); S.shake = 0.35; });
    once('slam', ft >= 8.2, () => { sound.sfx('slam'); S.shake = 0.8; fx.ring(S.boss.pos, { speed: 14 }); for (let i = 0; i < 20; i++) fx.juice(S.boss.pos.clone().add(V(0, 0.3, 0)), ORANGE, 2, 7, 5); });
    if (ft > 8.2 && ft < 10.5) for (const p of postsXZ) if (Math.random() < 0.5) fx.juice(p.clone().multiplyScalar(0.94).setY(0.2), Math.random() < 0.5 ? LEMON : ORANGE, 2, 1.2, 12);
    S.player.yaw = Math.PI / 2 - 0.55 * (1 - ease((ft - 12) / 4)); S.boss.yaw = -Math.PI / 2 + 0.55 * (1 - ease((ft - 12) / 4)) - (ft > 5 && ft < 11 ? 0.3 : 0);
    zest.rotation.y = S.player.yaw; nar.rotation.y = S.boss.yaw;
    const bmode = ft < 4 ? 'idle' : ft < 6 ? 'flex' : ft < 8.2 ? 'roar' : ft < 9 ? 'bash' : 'idle';
    poseBoss(bmode, dt);
    poseZest(ft < 11 ? 'idle' : 'idle', dt, { fierce: ft > 9 });
    if (ft > 7.5 && ft < 8.2) { N.sq.position.y = Math.sin((ft - 7.5) / 0.7 * Math.PI) * 1.5; } else N.sq.position.y = 0;
    fx.update(dt, q => fx.splat(q.pos.x, q.pos.z, q.col.getHex(), 0.5 + Math.random() * 0.5));
    const c = filmCam(ft);
    S.shake = Math.max(0, S.shake - dt * 1.5);
    camera.position.copy(c.pos).add(V((Math.random() - 0.5) * S.shake, (Math.random() - 0.5) * S.shake, 0));
    S.camLook.copy(c.look); camera.lookAt(S.camLook);
  }

  // ---------- combat helpers ----------
  const flatDist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  function hitstop(s) { S.hitstop = Math.max(S.hitstop, s); }
  function shake(s) { S.shake = Math.max(S.shake, s); }
  function hurtBoss(dmg, point, kind = 'hit') {
    const B = S.boss; if (B.state === 'roar' || B.state === 'dead' || B.state === 'intro') return false;
    if (B.state === 'stunned') dmg = Math.round(dmg * 1.5);
    B.hp = Math.max(0, B.hp - dmg); B.flash = 1; S.player.hits++;
    fx.juice(point, ORANGE, kind === 'heavy' ? 34 : 18, kind === 'heavy' ? 6 : 4.5, 5); fx.spark(point, kind === 'heavy' ? 2.4 : 1.6);
    sound.sfx(kind === 'heavy' ? 'heavy' : 'hit'); sound.sfx('splash', 0.5); hitstop(kind === 'heavy' ? 0.11 : 0.065); shake(kind === 'heavy' ? 0.45 : 0.2);
    ui.bossBar(B.hp / B.max, B.phase);
    if (B.hp <= 0) { setBoss('dead'); return true; }
    const nextPhase = B.hp / B.max <= 0.33 ? 3 : B.hp / B.max <= 0.66 ? 2 : 1;
    if (nextPhase > B.phase) { B.phase = nextPhase; setBoss('roar'); return true; }
    if ((kind === 'heavy' || kind === 'finisher') && (B.state === 'idle' || B.state === 'recover')) setBoss('flinch');
    return true;
  }
  function hurtPlayer(dmg, from, knock = 8) {
    const P = S.player; if (P.iframes > 0 || S.mode !== 'fight') return;
    P.hp = Math.max(0, P.hp - dmg); P.iframes = 0.9; P.flash = 1; P.action = { type: 'hurt', t: 0, dur: 0.35 };
    const away = V(P.pos.x - from.x, 0, P.pos.z - from.z).normalize(); P.vel.copy(away.multiplyScalar(knock)).setY(5); P.grounded = false;
    if (P.carry) { P.carry.state = 'fly'; P.carry.vel.set(0, 3, 0); P.carry = null; }
    fx.juice(P.pos.clone().add(V(0, 1.2, 0)), LEMON, 22, 4, 4); sound.sfx('hurt'); shake(0.4); hitstop(0.08);
    ui.playerBar(P.hp / 100);
    if (P.hp <= 0) { S.mode = 'lost'; S.endT = 0; sound.setMusic('lose'); sound.sfx('slam'); ui.hint(null); }
  }
  function setBoss(state) {
    const B = S.boss; B.state = state; B.st = 0;
    if (B.telegraph) { B.telegraph.dead = true; B.telegraph = null; }
    if (state === 'roar') { sound.sfx('roar'); shake(0.6); B.flash = 0;
      ui.banner(B.phase === 2 ? 'ROUND 2: PIP STORM' : 'FINAL ROUND: PULP SPLASH', B.phase === 2 ? 'He spits seeds now. Throw them back!' : 'Jump the shockwaves!');
      sound.setMusic(B.phase === 3 ? 'boss3' : 'battle'); }
    if (state === 'dead') { sound.sfx('slam'); sound.sfx('splash'); shake(1); hitstop(0.25); S.mode = 'won'; S.endT = 0; sound.setMusic('win'); ui.hint(null);
      for (let i = 0; i < 6; i++) fx.juice(B.pos.clone().add(V(0, 1.6, 0)), ORANGE, 30, 8, 10); }
    if (state === 'stunned') { sound.sfx('stun'); }
  }

  // ---------- player ----------
  function tryPlayerHit(range, arc, dmg, kind) {
    const P = S.player, B = S.boss, d = flatDist(P.pos, B.pos);
    if (d > range + 1.3) return false;
    const toB = Math.atan2(B.pos.x - P.pos.x, B.pos.z - P.pos.z); let da = Math.abs(((toB - P.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
    if (da > arc) return false;
    const point = P.pos.clone().lerp(B.pos, 0.6).setY(1.3 + P.pos.y);
    return hurtBoss(dmg, point, kind);
  }
  function nearestProp() { let best = null, bd = 1.8; for (const p of S.props) { if (p.state !== 'rest') continue; const d = flatDist(p.pos, S.player.pos); if (d < bd) { bd = d; best = p; } } return best; }
  function throwProp() {
    const P = S.player, p = P.carry; if (!p) return; P.carry = null;
    const target = S.boss.pos.clone().add(V(0, 1.7, 0)), from = p.pos.clone(), dist = flatDist(from, target), spd = 17, T = Math.max(0.25, dist / spd);
    const dir = V(target.x - from.x, 0, target.z - from.z).normalize();
    if (dist > 20) { dir.set(Math.sin(P.yaw), 0, Math.cos(P.yaw)); }
    p.vel.copy(dir.multiplyScalar(dist > 20 ? spd : dist / T)); p.vel.y = dist > 20 ? 4 : (target.y - from.y + 0.5 * 22 * T * T) / T;
    p.state = 'fly'; p.thrown = true; P.action = { type: 'throw', t: 0, dur: 0.25 }; sound.sfx('throw');
  }
  function updatePlayer(dt) {
    const P = S.player, B = S.boss;
    for (const k in input.buf) input.buf[k] -= dt;
    P.iframes -= dt; P.dodgeCd -= dt; P.comboT -= dt; P.flash = Math.max(0, P.flash - dt * 5);
    const toB = V(B.pos.x - P.pos.x, 0, B.pos.z - P.pos.z), dist = toB.length();
    const fwd = S.camDir.clone().negate(), right = V(-fwd.z, 0, fwd.x);
    const wish = fwd.multiplyScalar(input.my).add(right.multiplyScalar(input.mx)); if (wish.length() > 1) wish.normalize();
    const A = P.action; if (A) { A.t += dt; if (A.t >= A.dur) P.action = null; }
    const busy = P.action && P.action.type !== 'throw';
    // actions
    if (!busy || (P.action.type === 'light' && P.action.t > 0.2)) {
      if (P.carry && (consume('light') || consume('grab'))) throwProp();
      else if (!P.carry && consume('light')) { P.combo = P.comboT > 0 ? (P.combo + 1) % 3 : 0; P.comboT = 0.7; P.action = { type: 'light', t: 0, dur: P.combo === 2 ? 0.42 : 0.3, arm: P.combo % 2, hit: false }; sound.sfx('whoosh', 0.6); }
      else if (!P.carry && !busy && consume('heavy')) { P.action = { type: 'heavy', t: 0, dur: 0.75, hit: false }; }
      else if (!P.carry && !busy && consume('grab')) { const p = nearestProp(); if (p) { P.carry = p; p.state = 'held'; sound.sfx('pickup'); } }
    }
    if (consume('dodge') && P.dodgeCd <= 0 && (!P.action || P.action.type !== 'hurt')) {
      const dir = wish.length() > 0.1 ? wish.clone().normalize() : S.camDir.clone();
      P.action = { type: 'dodge', t: 0, dur: 0.36, dir }; P.iframes = Math.max(P.iframes, 0.36); P.dodgeCd = 0.55; sound.sfx('dodge');
    }
    if (consume('jump') && P.grounded && (!P.action || P.action.type === 'light' || P.action.type === 'throw')) { P.vel.y = 9.5; P.grounded = false; sound.sfx('jump'); }
    // attack resolution
    const a = P.action;
    if (a?.type === 'light' && !a.hit && a.t > 0.09) { a.hit = true; tryPlayerHit(1.0, 1.2, P.combo === 2 ? 14 : 8, P.combo === 2 ? 'finisher' : 'hit'); }
    if (a?.type === 'heavy' && !a.hit && a.t > 0.38) { a.hit = true; sound.sfx('whoosh', 1.2); tryPlayerHit(1.5, Math.PI, 22, 'heavy'); }
    // movement
    let speed = P.carry ? 5.2 : 6.8;
    if (a?.type === 'heavy' && a.t < 0.38) speed = 1; if (a?.type === 'hurt') speed = 0;
    if (a?.type === 'dodge') { P.vel.x = a.dir.x * 15; P.vel.z = a.dir.z * 15; }
    else if (a?.type !== 'hurt') { P.vel.x = damp(P.vel.x, wish.x * speed, P.grounded ? 14 : 5, dt); P.vel.z = damp(P.vel.z, wish.z * speed, P.grounded ? 14 : 5, dt); }
    else { P.vel.x = damp(P.vel.x, 0, 3, dt); P.vel.z = damp(P.vel.z, 0, 3, dt); }
    P.vel.y -= 26 * dt; P.pos.addScaledVector(P.vel, dt);
    if (P.pos.y <= 0) { if (!P.grounded && P.vel.y < -6) { sound.sfx('land'); fx.juice(P.pos.clone(), 0xffffff, 0); } P.pos.y = 0; P.vel.y = 0; P.grounded = true; }
    const r = Math.hypot(P.pos.x, P.pos.z), lim = ARENA_R - 0.4; if (r > lim) { P.pos.x *= lim / r; P.pos.z *= lim / r; }
    const bd = flatDist(P.pos, B.pos), minD = 0.65 + 1.3; if (bd < minD && B.state !== 'dead') { const push = V(P.pos.x - B.pos.x, 0, P.pos.z - B.pos.z).normalize().multiplyScalar(minD - bd); P.pos.add(push); }
    // facing
    const hs = Math.hypot(P.vel.x, P.vel.z);
    if (a && (a.type === 'light' || a.type === 'heavy' || a.type === 'throw') && dist < 9) P.yaw = angDamp(P.yaw, yawTo(toB), 25, dt);
    else if (hs > 0.5) P.yaw = angDamp(P.yaw, Math.atan2(P.vel.x, P.vel.z), 14, dt);
    P.runPh += hs * dt * 2.2;
    // kick props by running into them
    for (const p of S.props) if (p.state === 'rest' && flatDist(p.pos, P.pos) < 0.7 && hs > 3) { p.state = 'fly'; p.vel.set(P.vel.x * 0.9, 3, P.vel.z * 0.9); }
    zest.position.copy(P.pos); zest.rotation.y = P.yaw;
    let mode = 'idle', o = {};
    if (!P.grounded) mode = 'air'; else if (hs > 0.8) mode = 'run';
    if (P.carry) mode = 'carry';
    if (a?.type === 'light') { mode = P.combo === 2 ? 'upper' : 'punch'; o.arm = a.arm; }
    if (a?.type === 'heavy') { mode = a.t < 0.3 ? 'windup' : 'spin'; o.k = clamp((a.t - 0.3) / 0.4, 0, 1); }
    if (a?.type === 'throw') mode = 'throw';
    if (a?.type === 'dodge') { mode = 'dodge'; o.k = a.t / a.dur; }
    if (a?.type === 'hurt') mode = 'hurt';
    poseZest(mode, dt, o);
    zest.visible = P.iframes > 0 && !(a?.type === 'dodge') ? Math.floor(S.t * 20) % 2 === 0 : true;
    // hint
    const np = !P.carry && nearestProp();
    ui.hint(P.carry ? `Throw the ${PROPS[P.carry.type].name.toLowerCase()} (E or click)` : np ? `Grab the ${PROPS[np.type].name.toLowerCase()} (E)` : null);
  }

  // ---------- boss AI ----------
  function updateBoss(dt) {
    const B = S.boss, P = S.player;
    B.st += dt; B.flash = Math.max(0, B.flash - dt * 6); B.slow = Math.max(0, B.slow - dt);
    const sl = B.slow > 0 ? 0.6 : 1, toP = V(P.pos.x - B.pos.x, 0, P.pos.z - B.pos.z), dist = toP.length(), dirP = toP.clone().normalize();
    let mode = 'idle', o = {};
    const face = (s = 5) => { B.yaw = angDamp(B.yaw, yawTo(toP), s * sl, dt); };
    switch (B.state) {
      case 'intro': if (B.st > 0.3) setBoss('idle'); break;
      case 'idle': {
        face(); const spd = (B.phase === 3 ? 3.4 : B.phase === 2 ? 2.9 : 2.4) * sl;
        if (dist > 3.2) { B.pos.addScaledVector(dirP, spd * dt); mode = 'walk'; B.walkPh += dt * 7; }
        B.cd -= dt;
        if (B.cd <= 0) {
          const pool = [];
          if (dist < 3.8) pool.push('bashWind', 'bashWind');
          pool.push('chargeWind'); if (dist > 5) pool.push('chargeWind');
          if (B.phase >= 2) pool.push('barrageWind', 'barrageWind');
          if (B.phase >= 3) pool.push('leapWind', 'leapWind');
          setBoss(pool[Math.floor(Math.random() * pool.length)]); B.cd = B.phase === 1 ? 1.5 : B.phase === 2 ? 1.1 : 0.8;
        }
        break; }
      case 'flinch': mode = 'hurt'; if (B.st > 0.35) setBoss('idle'); break;
      case 'bashWind': face(8); mode = 'bashWind'; if (B.st === dt || B.st < dt * 1.5) sound.sfx('warn', 0.6); if (B.st > 0.55 / sl) setBoss('bash'); break;
      case 'bash': mode = 'bash';
        if (!B.didBash) { B.didBash = true; sound.sfx('whoosh', 1.4); const ang = Math.abs(((yawTo(toP) - B.yaw + Math.PI) % 6.283 + 6.283) % 6.283 - Math.PI);
          if (dist < 3.5 && ang < 1.3 && P.pos.y < 1.5) hurtPlayer(12, B.pos, 9); shake(0.25); fx.juice(B.pos.clone().addScaledVector(V(Math.sin(B.yaw), 0, Math.cos(B.yaw)), 2).setY(0.2), 0xffffff, 0); }
        if (B.st > 0.2) { B.didBash = false; setBoss('recover'); } break;
      case 'recover': mode = 'idle'; face(2); if (B.st > (B.phase === 3 ? 0.35 : 0.55)) setBoss('idle'); break;
      case 'chargeWind': {
        mode = 'chargeWind'; const wind = (B.phase === 3 ? 0.7 : 0.95) / sl;
        if (B.st < 0.6 * wind) { face(10); B.chargeDir.copy(dirP); }
        if (!B.telegraph) { sound.sfx('warn'); B.telegraph = fx.ring(B.pos, { telegraph: true, max: 1.6, life: wind, color: 0xe0413a }); }
        if (B.st > wind) { B.bounces = 0; setBoss('charge'); B.roll = 0; sound.sfx('whoosh', 1.5); }
        break; }
      case 'charge': {
        const spd = (B.phase === 3 ? 17 : 14) * sl; B.pos.addScaledVector(B.chargeDir, spd * dt); B.yaw = yawTo(B.chargeDir);
        B.roll = (B.roll || 0) + spd * dt / 1.25; mode = 'charge'; o.roll = B.roll;
        if (Math.random() < 0.6) fx.juice(B.pos.clone().setY(0.1), ORANGE, 1, 1.5, 1.5);
        if (dist < 1.9 && P.pos.y < 1.6) hurtPlayer(16, B.pos, 12);
        for (const p of S.props) if (p.state === 'rest' && flatDist(p.pos, B.pos) < 1.8) { p.state = 'fly'; p.vel.copy(B.chargeDir).multiplyScalar(8).add(V((Math.random() - 0.5) * 6, 5, (Math.random() - 0.5) * 6)); }
        const r = Math.hypot(B.pos.x, B.pos.z);
        if (r > ARENA_R - 1.3) {
          B.pos.multiplyScalar((ARENA_R - 1.3) / r); sound.sfx('slam', 0.6); shake(0.5); fx.juice(B.pos.clone().setY(1.5), ORANGE, 20, 5, 4);
          if (B.phase === 3 && B.bounces < 1) { B.bounces++; B.chargeDir.copy(V(P.pos.x - B.pos.x, 0, P.pos.z - B.pos.z).normalize()); B.st = 0; }
          else { setBoss('stunned'); }
        } else if (B.st > 1.9) setBoss('recover');
        break; }
      case 'stunned': mode = 'stunned'; if (B.st > 2.1) setBoss('recover'); break;
      case 'barrageWind': {
        mode = 'barrage'; face(8);
        if (B.st < 0.35) { B.pos.addScaledVector(dirP, -7 * dt); N.sq.position.y = Math.sin(B.st / 0.35 * Math.PI) * 0.8; } else N.sq.position.y = 0;
        if (B.st > 0.6 / sl) { setBoss('barrage'); B.volleys = 0; }
        break; }
      case 'barrage': {
        mode = 'barrage'; face(6);
        if (B.st > B.volleys * 0.36 && B.volleys < 3) { B.volleys++; sound.sfx('seed'); sound.sfx('whoosh', 0.5);
          const mouth = B.pos.clone().add(V(Math.sin(B.yaw) * 1.3, 1.5, Math.cos(B.yaw) * 1.3));
          for (let i = -3; i <= 3; i++) { const a = yawTo(toP) + i * 0.18 + (B.volleys % 2 ? 0.09 : 0), sp = 10 + Math.random() * 2;
            const m = makePropMesh('seed'); m.position.copy(mouth); S.proj.push({ mesh: m, pos: mouth.clone(), vel: V(Math.sin(a) * sp, 3 + Math.random(), Math.cos(a) * sp) }); } }
        if (B.st > 1.3) setBoss('recover');
        break; }
      case 'leapWind': mode = 'chargeWind'; face(10); if (B.st > 0.35) { setBoss('leap'); B.leapFrom.copy(B.pos);
        B.target.copy(P.pos).addScaledVector(P.vel.clone().setY(0), 0.35); const r = Math.hypot(B.target.x, B.target.z); if (r > ARENA_R - 1.6) B.target.multiplyScalar((ARENA_R - 1.6) / r);
        B.telegraph = fx.ring(B.target, { telegraph: true, max: 2.8, life: 1.05, color: 0xe0413a }); sound.sfx('jump'); sound.sfx('warn'); } break;
      case 'leap': {
        mode = 'air'; const k = clamp(B.st / 1.05, 0, 1);
        B.pos.lerpVectors(B.leapFrom, B.target, ease(k)); N.sq.position.y = Math.sin(k * Math.PI) * 7;
        if (k >= 1) { N.sq.position.y = 0; B.telegraph = null; setBoss('stuck'); sound.sfx('slam'); shake(1); hitstop(0.08);
          if (flatDist(P.pos, B.pos) < 2.8 && P.pos.y < 0.8) hurtPlayer(24, B.pos, 12);
          B.shock = fx.ring(B.pos, { speed: 9, max: ARENA_R + 1, color: 0xff9a2e }); B.shock.hitDone = false;
          for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; fx.juice(B.pos.clone().add(V(Math.cos(a) * 1.5, 0.3, Math.sin(a) * 1.5)), ORANGE, 3, 4, 6); } }
        break; }
      case 'stuck': mode = 'stuck'; if (B.st > 1.3) setBoss('recover'); break;
      case 'roar': mode = 'roar'; if (dist < 4.5) { P.vel.addScaledVector(dirP, 30 * dt); }
        if (Math.random() < 0.6) fx.juice(postsXZ[Math.floor(Math.random() * 8)].clone().multiplyScalar(0.94).setY(0.2), ORANGE, 3, 1.2, 12);
        if (B.st > 1.9) setBoss('idle'); break;
      case 'dead': mode = 'dead'; if (Math.random() < 0.3) fx.juice(B.pos.clone().add(V(0, 1.4, 0)), ORANGE, 3, 3, 7); break;
    }
    // shockwave vs player (jump over it)
    if (B.shock) { const s = B.shock; const dP = flatDist(P.pos, s.mesh.position);
      if (!s.hitDone && Math.abs(dP - s.r) < 0.55 && P.pos.y < 0.45) { s.hitDone = true; hurtPlayer(14, s.mesh.position, 7); }
      if (s.r > s.max) B.shock = null; }
    const r = Math.hypot(B.pos.x, B.pos.z); if (r > ARENA_R - 1.2) B.pos.multiplyScalar((ARENA_R - 1.2) / r);
    nar.position.copy(B.pos).setY(0); nar.position.y = 0; nar.rotation.y = B.yaw;
    poseBoss(mode, dt, o);
  }

  // ---------- props + projectiles ----------
  function updateProps(dt) {
    const P = S.player, B = S.boss;
    for (let i = S.props.length - 1; i >= 0; i--) {
      const p = S.props[i], def = PROPS[p.type];
      if (p.state === 'held') { p.pos.copy(P.pos).add(V(0, 2.55, 0)); p.mesh.rotation.y += dt * 2; }
      else if (p.state === 'fly') {
        p.vel.y -= 22 * dt; p.pos.addScaledVector(p.vel, dt); p.mesh.rotation.x += p.spin.x * dt; p.mesh.rotation.z += p.spin.y * dt;
        if (p.thrown) { const c = B.pos.clone().add(V(0, 1.7, 0)); if (p.pos.distanceTo(c) < 1.35 + def.r) {
          if (hurtBoss(def.dmg, p.pos.clone(), 'hit')) { if (def.stun && B.state !== 'dead' && B.state !== 'roar') setBoss('stunned'); if (def.slow) B.slow = def.slow;
            if (def.juice) fx.juice(p.pos, def.juice, 14, 4, 3); if (p.type === 'ice' || p.type === 'sugar') fx.juice(p.pos, 0xffffff, 12, 4, 3); }
          p.vel.set(-p.vel.x * 0.25, 4, -p.vel.z * 0.25); p.thrown = false;
          if (p.type === 'berry' || p.type === 'seed') { scene.remove(p.mesh); S.props.splice(i, 1); continue; } } }
        if (p.pos.y < def.r) { p.pos.y = def.r; if (Math.abs(p.vel.y) > 2) { p.vel.y *= -0.35; p.vel.x *= 0.6; p.vel.z *= 0.6; } else { p.vel.set(0, 0, 0); p.state = 'rest'; p.thrown = false; } }
        const r = Math.hypot(p.pos.x, p.pos.z), lim = ARENA_R - 0.3; if (r > lim) { p.pos.x *= lim / r; p.pos.z *= lim / r; p.vel.x *= -0.5; p.vel.z *= -0.5; }
      }
      p.mesh.position.copy(p.pos);
    }
    // seeds in flight
    for (let i = S.proj.length - 1; i >= 0; i--) { const q = S.proj[i];
      q.vel.y -= 14 * dt; q.pos.addScaledVector(q.vel, dt); q.mesh.position.copy(q.pos); q.mesh.rotation.x += dt * 12;
      if (q.pos.distanceTo(P.pos.clone().add(V(0, 0.9, 0))) < 0.75) { hurtPlayer(7, q.pos, 5); scene.remove(q.mesh); S.proj.splice(i, 1); continue; }
      if (q.pos.y < 0.15) { S.proj.splice(i, 1); const seeds = S.props.filter(p => p.type === 'seed').length;
        if (seeds < 12 && Math.hypot(q.pos.x, q.pos.z) < ARENA_R - 0.5) { scene.remove(q.mesh); spawnProp('seed', q.pos.setY(0.15)); } else scene.remove(q.mesh); } }
    // restock falling props
    S.dropT -= dt; const kinds = S.props.filter(p => p.type !== 'seed').length;
    if (S.dropT <= 0 && kinds < 6) { S.dropT = 4; const a = Math.random() * 6.283, r = 3 + Math.random() * 7, ty = ['sugar', 'bean', 'berry', 'ice'][Math.floor(Math.random() * 4)];
      spawnProp(ty, V(Math.cos(a) * r, 12, Math.sin(a) * r), V(0, -1, 0)); }
  }

  // ---------- camera ----------
  function updateCam(rdt) {
    const c = gameCamIdeal();
    camera.position.x = damp(camera.position.x, c.pos.x, 5, rdt); camera.position.y = damp(camera.position.y, c.pos.y, 5, rdt); camera.position.z = damp(camera.position.z, c.pos.z, 5, rdt);
    S.camLook.x = damp(S.camLook.x, c.look.x, 8, rdt); S.camLook.y = damp(S.camLook.y, c.look.y, 8, rdt); S.camLook.z = damp(S.camLook.z, c.look.z, 8, rdt);
    S.shake = Math.max(0, S.shake - rdt * 2);
    const sh = V((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(S.shake);
    camera.position.add(sh); camera.lookAt(S.camLook);
  }

  function update(rdt) {
    let dt = Math.min(rdt, 1 / 30);
    if (S.hitstop > 0) { S.hitstop -= rdt; dt = 0; }
    S.t += dt;
    if (S.mode === 'fight') { S.elapsed += dt; updatePlayer(dt); updateBoss(dt); updateProps(dt); }
    else if (S.mode === 'won' || S.mode === 'lost') {
      S.endT += rdt; updateBoss(dt); updateProps(dt);
      poseZest(S.mode === 'won' ? 'cheer' : 'ko', dt); zest.visible = true;
      if (S.mode === 'lost') { S.player.pos.y = 0; zest.position.copy(S.player.pos); }
      if (S.endT > 2.2 && !S.endShown) { S.endShown = true; ui.end(S.mode === 'won', { time: S.elapsed, hits: S.player.hits, hp: S.player.hp }); }
    }
    fx.update(dt, q => fx.splat(q.pos.x, q.pos.z, q.col.getHex(), 0.35 + Math.random() * 0.6));
    updateCam(rdt);
  }

  function startFight() {
    S.mode = 'fight'; S.elapsed = 0; S.boss.state = 'intro'; S.boss.st = 0; S.boss.cd = 1.8; S.endShown = false;
    ui.bossBar(1, 1); ui.playerBar(1); sound.setMusic('battle');
  }
  function restart() { reset(); events.clear(); const c = gameCamIdeal(); camera.position.copy(c.pos); S.camLook.copy(c.look); startFight(); }

  reset();
  return { S, input, press, filmUpdate, update, startFight, restart, reset: () => { reset(); events.clear(); } };
}

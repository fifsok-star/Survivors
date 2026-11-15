// Survivors - giant skeletons: they roam a patch of the island, chase whoever comes close, grab them and throw them.
// Beat them together: punches (a shovel hits harder), flares burn them, and a grabbed player can wriggle free with E.
'use strict';
const SK_HP = 8, SK_SCALE = 1.55;
const SKV = [];          // client visuals: { g, P, x, y, z, ry, st, vic, tx, ty, tz, tr }
const SK_ST = ['idle', 'chase', 'grab', 'stun', 'flee', 'dead'];

// ---------------------------------------------------------------- model (built in code, jointed like the survivors)
function makeSkeleton() {
  if (GFX.models.skel) {                        // the Blender model (tools/blender/build_skel_plane.py)
    const root = new THREE.Group(), o = GFX.models.skel.clone(true), P = {}; o.position.set(0, 0, 0); root.add(o);
    const glow = new THREE.MeshBasicMaterial({ color: 0xff3a1a });
    o.traverse(m => { if (m.isMesh) { m.material = m.material.name === 'eye_glow' ? glow : toon(m.material.color); m.castShadow = true; } if (m.name.startsWith('sk_')) P[m.name.slice(3)] = m; });
    P.body.scale.setScalar(SK_SCALE);
    const pile = GFX.models.skel_pile.clone(true); pile.position.set(0, 0, 0); pile.traverse(m => { if (m.isMesh) m.material = toon(m.material.color); }); pile.scale.setScalar(SK_SCALE * .9); pile.visible = false; root.add(pile); P.pile = pile;
    root.userData.P = P; root.userData.ph = Math.random() * 6; return root;
  }
  const col = h => new THREE.Color(h).convertSRGBToLinear(), BONE = toon(col('#efe7d2')), DARK = toon(col('#3b3530')), EYE = new THREE.MeshBasicMaterial({ color: 0xff3a1a });
  const part = (parent, x, y, z) => { const o = new THREE.Group(); o.position.set(x, y, z); parent.add(o); return o; };
  const bone = (parent, len, r, x, y, z, rx, rz) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * .85, len, 7), BONE); m.position.set(x || 0, (y == null ? -len / 2 : y), z || 0); m.rotation.set(rx || 0, 0, rz || 0); m.castShadow = true; parent.add(m); return m; };
  const knob = (parent, r, x, y, z, mat) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat || BONE); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const root = new THREE.Group(), body = part(root, 0, 0, 0); body.scale.setScalar(SK_SCALE);
  const hips = part(body, 0, .98, 0); knob(hips, .17, 0, 0, 0); bone(hips, .34, .07, 0, 0, 0, 0, Math.PI / 2);
  const torso = part(hips, 0, .06, 0); bone(torso, .62, .045, 0, .31, .02);
  for (let k = 0; k < 4; k++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(.18 - k * .015, .025, 5, 12, Math.PI * 1.6), BONE); rib.rotation.set(Math.PI / 2, 0, Math.PI * .7); rib.position.set(0, .22 + k * .09, -.02); rib.scale.set(1.15, 1, .85); torso.add(rib); }
  bone(torso, .52, .04, 0, .58, 0, 0, Math.PI / 2);
  const head = part(torso, 0, .7, 0); knob(head, .2, 0, .14, 0); const jaw = new THREE.Mesh(new THREE.BoxGeometry(.2, .07, .15), BONE); jaw.position.set(0, -.02, .07); head.add(jaw);
  for (const s of [-1, 1]) { knob(head, .055, s * .075, .15, .16, DARK); knob(head, .025, s * .075, .15, .2, EYE); }
  knob(head, .03, 0, .07, .19, DARK);
  const P = { body, hips, torso, head, jaw };
  for (const [s, n] of [[-1, 'L'], [1, 'R']]) {
    const arm = part(torso, s * .27, .56, 0); knob(arm, .055, 0, 0, 0); bone(arm, .36, .035);
    const fore = part(arm, 0, -.36, 0); knob(fore, .045, 0, 0, 0); bone(fore, .34, .03);
    for (let k = -1; k <= 1; k++) bone(fore, .14, .012, k * .03, -.4, 0, 0, k * .25);
    const leg = part(hips, s * .12, -.04, 0); knob(leg, .06, 0, 0, 0); bone(leg, .46, .045);
    const shin = part(leg, 0, -.46, 0); knob(shin, .05, 0, 0, 0); bone(shin, .44, .038);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(.1, .05, .22), BONE); foot.position.set(0, -.47, .06); shin.add(foot);
    P['arm' + n] = arm; P['fore' + n] = fore; P['leg' + n] = leg; P['shin' + n] = shin;
  }
  // pile of bones shown when it is defeated
  const pile = new THREE.Group(); for (let k = 0; k < 9; k++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.05, .045, .5 + (k % 3) * .2, 6), BONE); m.position.set((Math.random() - .5) * 1.2, .06, (Math.random() - .5) * 1.2); m.rotation.set(Math.PI / 2, Math.random() * 3, 0); pile.add(m); }
  knob(pile, .3, .3, .25, .1); pile.visible = false; root.add(pile); P.pile = pile;
  root.userData.P = P; root.userData.ph = Math.random() * 6;
  return root;
}
function buildSkeletons() {
  for (const v of SKV) worldG.remove(v.g); SKV.length = 0;
  L.skels.forEach(s => { const g = makeSkeleton(); g.position.set(s.x, s.y, s.z); g.visible = false; worldG.add(g); SKV.push({ g, P: g.userData.P, x: s.x, y: s.y, z: s.z, ry: 0, st: 0, vic: '', tx: s.x, ty: s.y, tz: s.z, tr: 0, alive: false }); });
}
function animSkeleton(v, dt) {
  const P = v.P, u = v.g.userData, st = SK_ST[v.st] || 'idle', k = Math.min(1, dt * 10), moving = v.spd > .3;
  u.ph += dt * (st === 'chase' || st === 'flee' ? 8 : moving ? 5 : 1.5);
  const s = Math.sin(u.ph), c = Math.cos(u.ph), R = (o, x, z) => { o.rotation.x += (x - o.rotation.x) * k; o.rotation.z += ((z || 0) - o.rotation.z) * k; };
  let aL = 0, aR = 0, fL = -.2, fR = -.2, lL = 0, lR = 0, sL = 0, sR = 0, tor = .05, hd = 0, jaw = 0, zL = .15, zR = -.15;
  if (moving) { lL = s * .7; lR = -s * .7; sL = Math.max(0, -c) * .9; sR = Math.max(0, c) * .9; }
  if (st === 'idle') { aL = -s * .4 * (moving ? 1 : .1); aR = s * .4 * (moving ? 1 : .1); hd = Math.sin(u.ph * .5) * .2; }
  if (st === 'chase') { aL = -1.5 + s * .3; aR = -1.5 - s * .3; fL = fR = -.3; tor = .25; jaw = .25 + Math.abs(s) * .2; }
  if (st === 'grab') { aL = aR = -2.7; fL = fR = -.9; zL = .5; zR = -.5; tor = -.1; hd = -.2; jaw = .35 + Math.abs(Math.sin(u.ph * 3)) * .15; }
  if (st === 'stun') { tor = -.35; hd = .5; aL = .3; aR = -.6; zL = .9; zR = -.9; }
  if (st === 'flee') { aL = -2.4; aR = -2.4; zL = .7; zR = -.7; tor = .35; }
  R(P.torso, tor); R(P.head, hd); P.jaw.rotation.x = jaw; R(P.armL, aL, zL); R(P.armR, aR, zR); R(P.foreL, fL); R(P.foreR, fR); R(P.legL, lL); R(P.legR, lR); R(P.shinL, sL); R(P.shinR, sR);
  P.body.position.y = moving ? Math.abs(c) * .06 : 0; P.body.rotation.z = st === 'stun' ? Math.sin(GFX.t * 18) * .08 : 0;
}
// hand position (where a grabbed player hangs)
function skelHand(v) { return { x: v.x + Math.sin(v.ry) * 1.0, y: v.y + 2.55, z: v.z + Math.cos(v.ry) * 1.0 }; }
function onSkelStates(list) {
  if (!list) return;
  list.forEach((s, i) => { const v = SKV[i]; if (!v) return; if (!s) { v.alive = false; return; } v.alive = true; v.tx = s[0]; v.ty = s[1]; v.tz = s[2]; v.tr = s[3]; v.st = s[4]; v.vic = s[5] || ''; });
}
let skRattle = 0;
function updateSkeletons(dt) {
  const k = Math.min(1, dt * 10);
  SKV.forEach((v, i) => {
    const dead = WS && WS.skel && WS.skel[i] && WS.skel[i].dead, on = WS && WS.skel && WS.skel[i] && WS.skel[i].on;
    v.g.visible = !!on && Math.abs(v.z - camera.position.z) < 160;
    if (!on) return;
    v.P.pile.visible = !!dead; v.P.body.visible = !dead; if (dead) return;
    const px = v.x, pz = v.z; v.x += (v.tx - v.x) * k; v.y += (v.ty - v.y) * k; v.z += (v.tz - v.z) * k; v.spd = Math.hypot(v.x - px, v.z - pz) / Math.max(dt, 1e-3);
    let d = v.tr - v.ry; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283; v.ry += d * k;
    v.g.position.set(v.x, v.y, v.z); v.g.rotation.y = v.ry; animSkeleton(v, dt);
    if (SK_ST[v.st] === 'chase' && AC && Math.hypot(v.x - ME.x, v.z - ME.z) < 22) { skRattle -= dt; if (skRattle <= 0) { skRattle = .22; tone(1400 + Math.random() * 900, .03, 'square', .025); } }
  });
}
function skelNear(x, y, z, r) { for (let i = 0; i < SKV.length; i++) { const v = SKV[i]; if (!v.alive || !(WS && WS.skel[i] && WS.skel[i].on) || WS.skel[i].dead) continue; if (Math.hypot(v.x - x, v.z - z) < r && Math.abs(v.y - y) < 3) return i; } return -1; }

// ---------------------------------------------------------------- host: skeleton brains
function skelHostInit() {
  Host.SK = L.skels.map(s => ({ x: s.x, y: s.y, z: s.z, hx: s.x, hz: s.z, ry: 0, st: 0, t: 0, vic: '', cd: 0, wx: s.x, wz: s.z, wt: 0, str: 0, seen: false, fx: 0, fz: 0 }));
}
function skelHostTick(dt, P) {
  const W = Host.W; if (!Host.SK || !W.skel) return;
  Host.SK.forEach((s, i) => {
    const w = W.skel[i]; if (!w || !w.on || w.dead) return;
    s.t += dt; s.cd = Math.max(0, s.cd - dt);
    const vic = s.vic && P.find(p => p.i === s.vic);
    const targets = P.filter(p => !p.k && p.i !== s.vic && Math.abs(p.y - s.y) < 5);
    let near = null, nd = 1e9; for (const p of targets) { const d = Math.hypot(p.x - s.x, p.z - s.z); if (d < nd) { nd = d; near = p; } }
    const step = (tx, tz, sp) => {
      const dx = tx - s.x, dz = tz - s.z, d = Math.hypot(dx, dz); if (d < .05) return; const m = Math.min(d, sp * dt), nx = s.x + dx / d * m, nz = s.z + dz / d * m;
      s.ry = Math.atan2(dx, dz);
      if (slopeAt(nx, nz).ang < .72 && getH(nx, nz) > .2 && !LAVA.some(o => dist2(o.x, o.z, nx, nz) < o.r + 1)) { s.x = nx; s.z = nz; s.y = getH(nx, nz); }
    };
    const st = SK_ST[s.st];
    if (st === 'grab') {
      if (!vic) { s.st = 0; s.vic = ''; return; }
      if (s.t > 2.6) skelThrow(s, i, 9, 11);
    } else if (st === 'stun') { if (s.t > (s.stunT || .8)) { s.st = 0; s.t = 0; } }
    else if (st === 'flee') { const dx = s.x - s.fx, dz = s.z - s.fz, d = Math.hypot(dx, dz) || 1; step(s.x + dx / d * 5, s.z + dz / d * 5, 3.6); if (s.t > 4.5) { s.st = 0; s.t = 0; } }
    else {
      const home = Math.hypot(s.x - s.hx, s.z - s.hz);
      if (near && nd < 13 && home < 34 && s.cd <= 0) {
        if (s.st !== 1) { s.st = 1; s.t = 0; if (!s.seen) { s.seen = true; hostToast('t_skel'); } hostEv('*', { k: 'sfx', s: 'roar' }); }
        step(near.x, near.z, 3.35);
        if (nd < 1.45) { s.st = 2; s.t = 0; s.vic = near.i; s.str = 0; hostEv(near.i, { k: 'grab', sk: i }); }
      } else {
        if (s.st === 1) { s.st = 0; s.t = 0; }
        if (home > 9 || s.t > s.wt) { if (home > 9) { s.wx = s.hx; s.wz = s.hz; } else { const a = Math.random() * 6.28, r = Math.random() * 8; s.wx = s.hx + Math.cos(a) * r; s.wz = s.hz + Math.sin(a) * r; } s.t = 0; s.wt = 4 + Math.random() * 4; }
        if (Math.hypot(s.wx - s.x, s.wz - s.z) > .5) step(s.wx, s.wz, home > 9 ? 2.4 : 1.1);
      }
    }
  });
}
function skelThrow(s, i, sp, up) {
  if (!s.vic) return; const a = s.ry + (Math.random() - .5) * 1.6;
  hostEv(s.vic, { k: 'throw', sk: i, vx: Math.sin(a) * sp, vy: up, vz: Math.cos(a) * sp }); hostEv('*', { k: 'sfx', s: 'thud' });
  s.vic = ''; s.st = 3; s.t = 0; s.stunT = .9; s.cd = 3.5;
}
function skelHostAct(pid, a, st) {
  const W = Host.W, s = Host.SK && Host.SK[a.i], w = W.skel && W.skel[a.i]; if (!s || !w || !w.on || w.dead) return false;
  if (a.k === 'hit') {
    if (Math.hypot(st.x - s.x, st.z - s.z) > 3.2) return false;
    w.hp -= a.sh ? 2 : 1; hostEv('*', { k: 'sfx', s: 'bonk' });
    if (s.vic) skelThrow(s, a.i, 3, 5);
    s.st = 3; s.t = 0; s.stunT = .7; s.cd = Math.max(s.cd, 1.2);
    if (w.hp <= 0) skelDie(a.i);
    return true;
  }
  if (a.k === 'struggle' && s.vic === pid) { if (++s.str >= 7) skelThrow(s, a.i, 2.5, 4); return false; }
  return false;
}
function skelFlare(x, z) {                     // a flare lit near a skeleton burns it and sends it running
  if (!Host.SK) return; Host.SK.forEach((s, i) => { const w = Host.W.skel[i]; if (!w || !w.on || w.dead || Math.hypot(s.x - x, s.z - z) > 7) return; w.hp -= 3; if (s.vic) skelThrow(s, i, 3, 5); s.st = 4; s.t = 0; s.fx = x; s.fz = z; if (w.hp <= 0) skelDie(i); });
}
function skelDie(i) {
  const W = Host.W, s = Host.SK[i]; W.skel[i].dead = 1; hostToast('t_skel_dead'); hostEv('*', { k: 'sfx', s: 'win' });
  const pool = ['idol', 'medkit', 'drink', 'can', 'piton', 'rope', 'tea'], n = 2 + (Math.random() < .5 ? 1 : 0);
  for (let k = 0; k < n; k++) { const a = k * 2.1; spawnItem(k === 0 && Math.random() < .5 ? 'idol' : pool[(Math.random() * pool.length) | 0], s.x + Math.sin(a) * 1.4, s.z + Math.cos(a) * 1.4, s.y + 1.5); }
  Host.dirty = true;
}
function skelStates() { return Host.SK ? Host.SK.map((s, i) => { const w = Host.W.skel[i]; return !w || !w.on || w.dead ? null : [+s.x.toFixed(2), +s.y.toFixed(2), +s.z.toFixed(2), +s.ry.toFixed(2), s.st, s.vic || 0]; }) : null; }

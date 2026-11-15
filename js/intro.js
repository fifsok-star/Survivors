// Survivors - 20 second intro: a charter flight, a storm, an engine on fire and a crash landing on the island's beach.
'use strict';
const INTRO = { t: 0, on: false, g: null, plane: null, smoke: [], dust: [], shake: 0, crashed: false, beep: 0, sub: -1, eng: null, done: null };
const INTRO_LEN = 20, INTRO_HIT = 15.4;

function buildIntroPlane() {
  if (GFX.models.plane_fly) { const g = new THREE.Group(), o = GFX.models.plane_fly.clone(true); o.position.set(0, 0, 0); o.traverse(m => { if (m.isMesh) { m.material = toon(m.material.color); m.castShadow = true; } }); g.add(o); return g; }
  const g = new THREE.Group(), col = h => new THREE.Color(h).convertSRGBToLinear();
  const M = (h, side) => toon(col(h), side), W = M('#f4f1ea'), B = M('#2e6fc4'), D = M('#59616b'), K = M('#1b1b22'), G = M('#5fb4d9');
  const add = (geo, mat, x, y, z, rx, ry, rz, sx, sy, sz) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.rotation.set(rx || 0, ry || 0, rz || 0); if (sx) m.scale.set(sx, sy || sx, sz || sx); m.castShadow = true; g.add(m); return m; };
  const R = Math.PI / 2;
  add(new THREE.CylinderGeometry(1.7, 1.7, 18, 16), W, 0, 0, 0, R);                       // fuselage along +z (nose at +z)
  add(new THREE.CylinderGeometry(1.72, 1.72, 18, 16, 1, true), B, 0, -.35, 0, R, 0, 0, 1, 1, .18);
  add(new THREE.SphereGeometry(1.7, 16, 10), W, 0, 0, 9, 0, 0, 0, 1, 1, 1.6);            // nose
  add(new THREE.SphereGeometry(1.25, 12, 8), K, 0, .55, 10.2, 0, 0, 0, 1.05, .55, 1);     // cockpit glass
  add(new THREE.CylinderGeometry(1.7, .5, 7, 16), W, 0, .35, -12.4, -R);                   // tail cone
  add(new THREE.BoxGeometry(.25, 4.2, 3.2), B, 0, 2.6, -14, .45);                           // fin
  add(new THREE.BoxGeometry(8, .2, 2.2), W, 0, .8, -14.2);                                  // stabiliser
  add(new THREE.BoxGeometry(22, .32, 3.6), W, 0, -.6, .8, 0, 0, 0);                         // wings
  for (const s of [-1, 1]) { add(new THREE.BoxGeometry(1.4, .34, 3.65), B, s * 10.4, -.6, .8); }
  const engs = [-1, 1].map(s => { const e = add(new THREE.CylinderGeometry(.75, .62, 3.4, 12), D, s * 5.2, -1.4, 1.6, R); add(new THREE.CylinderGeometry(.6, .6, .1, 12), K, s * 5.2, -1.4, 3.32, R); return e; });
  for (let i = 0; i < 9; i++) for (const s of [-1, 1]) add(new THREE.SphereGeometry(.22, 8, 6), G, s * 1.66, .45, -6 + i * 1.5, 0, 0, 0, .25, 1, 1.2);
  g.userData.eng = engs[1];
  return g;
}
// smooth flight path from far out at sea down onto the beach
function introPath(u, C) {
  const P = [[C.x + 140, C.y + 250, C.z - 950], [C.x + 70, C.y + 190, C.z - 520], [C.x + 12, C.y + 18, C.z - 170], [C.x, C.y + 1.6, C.z]];
  const v = 1 - u, b = [v * v * v, 3 * v * v * u, 3 * v * u * u, u * u * u];
  return new THREE.Vector3(P[0][0] * b[0] + P[1][0] * b[1] + P[2][0] * b[2] + P[3][0] * b[3], P[0][1] * b[0] + P[1][1] * b[1] + P[2][1] * b[2] + P[3][1] * b[3], P[0][2] * b[0] + P[1][2] * b[1] + P[2][2] * b[2] + P[3][2] * b[3]);
}
function puff(list, pos, color, size, life, vel) {
  let p = list.find(q => !q.visible);
  if (!p) { if (list.length > 90) return; p = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false })); INTRO.g.add(p); list.push(p); }
  p.material.color.setHex(color); p.position.copy(pos); p.visible = true; p.userData = { t: 0, life, size, vel: vel || new THREE.Vector3() }; p.scale.setScalar(size * .4);
}
function startIntro(done) {
  INTRO.done = done; INTRO.t = 0; INTRO.on = true; INTRO.crashed = false; INTRO.sub = -1; INTRO.shake = 0; INTRO.smoke = []; INTRO.dust = [];
  INTRO.g = new THREE.Group(); scene.add(INTRO.g);
  INTRO.plane = buildIntroPlane(); INTRO.g.add(INTRO.plane);
  const fire = new THREE.Mesh(new THREE.ConeGeometry(.7, 3.2, 8), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: .9 })); fire.rotation.x = -Math.PI / 2; fire.position.set(5.2, -1.4, -.8); fire.visible = false; INTRO.plane.add(fire); INTRO.fire = fire;
  for (const w of GFX.wreck || []) w.visible = false;
  $('intro').style.display = 'block'; $('introFade').style.opacity = 1; $('introSub').textContent = '';
  phase = 'intro'; ui.show('none');
  if (AC) {                                   // engine drone
    const o = AC.createOscillator(), f = AC.createBiquadFilter(), g = AC.createGain(); o.type = 'sawtooth'; o.frequency.value = 62; f.type = 'lowpass'; f.frequency.value = 320; g.gain.value = .07; o.connect(f); f.connect(g); g.connect(master); o.start(); INTRO.eng = { o, g };
  }
}
function crashSound() {
  if (!AC) return; const len = 2.6, b = AC.createBuffer(1, AC.sampleRate * len, AC.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.6);
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); f.type = 'lowpass'; f.frequency.value = 700; g.gain.value = .9; s.buffer = b; s.connect(f); f.connect(g); g.connect(master); s.start();
  tone(70, 1.2, 'sine', .6, 30);
}
const INTRO_SUBS = [[.6, 4.6, 'intro_1'], [5.4, 9.6, 'intro_2'], [10.2, 14.4, 'intro_3'], [16.8, 19.6, 'intro_4']];
function updateIntro(dt) {
  const I = INTRO; I.t += dt; const t = I.t, C = { x: L.plane.x, y: L.plane.y, z: L.plane.z };
  // subtitles + fades
  const sub = INTRO_SUBS.findIndex(s => t >= s[0] && t < s[1]); if (sub !== I.sub) { I.sub = sub; $('introSub').textContent = sub >= 0 ? T(INTRO_SUBS[sub][2]) : ''; }
  $('introFade').style.opacity = t < 1.2 ? 1 - t / 1.2 : t > INTRO_LEN - 1.4 ? Math.min(1, (t - (INTRO_LEN - 1.4)) / 1.2) : 0;
  const P = I.plane;
  if (!I.crashed) {
    const u = Math.min(1, t / INTRO_HIT), e = u < .5 ? u * (1.3 - .6 * u) : u, pos = introPath(e, C), nxt = introPath(Math.min(1, e + .004), C);
    P.position.copy(pos); P.lookAt(nxt);
    const fireOn = t > 5.2; P.rotateZ(fireOn ? Math.sin(t * 2.3) * .22 + .12 : Math.sin(t * .8) * .05);
    if (fireOn) { I.fire.visible = true; I.fire.scale.set(1, 1 + Math.sin(t * 30) * .25, 1); const ep = new THREE.Vector3(5.2, -1.4, -2.2); P.localToWorld(ep); if (Math.random() < .8) puff(I.smoke, ep, Math.random() < .3 ? 0x2b2622 : 0x5b5552, 1.3, 2.6); }
    if (fireOn && AC) { I.beep -= dt; if (I.beep <= 0) { I.beep = .55; tone(920, .18, 'square', .06); } }
    if (t > 5.2 && t < 5.4 || t > 8.1 && t < 8.25 || t > 11.6 && t < 11.7) GFX.flash = 1;
    if (I.eng) I.eng.o.frequency.value = fireOn ? 62 + Math.sin(t * 9) * 8 : 62;
    // cameras
    let cp, look = P.position.clone();
    if (t < 5.2) { cp = new THREE.Vector3(-22, 7, -34); P.localToWorld(cp); }
    else if (t < 10.2) { cp = new THREE.Vector3(19, 1.5, 7); P.localToWorld(cp); look = new THREE.Vector3(5.2, -1.4, 0); P.localToWorld(look); }
    else { cp = new THREE.Vector3(C.x + 26, C.y + 6.5, C.z + 26); }
    camera.position.copy(cp); camera.lookAt(look);
    if (t >= INTRO_HIT) {                      // impact
      I.crashed = true; P.visible = false; I.shake = 1.4; crashSound(); if (I.eng) { I.eng.o.stop(); I.eng = null; }
      for (const w of GFX.wreck || []) w.visible = true;
      for (let k = 0; k < 40; k++) puff(I.dust, new THREE.Vector3(C.x + (Math.random() - .5) * 16, C.y + Math.random() * 2, C.z + (Math.random() - .5) * 16), Math.random() < .5 ? 0xd9c08a : 0xb8a070, 2 + Math.random() * 2, 3, new THREE.Vector3((Math.random() - .5) * 8, 2 + Math.random() * 5, (Math.random() - .5) * 8));
      for (let k = 0; k < 10; k++) puff(I.smoke, new THREE.Vector3(C.x + (Math.random() - .5) * 6, C.y + 2, C.z + (Math.random() - .5) * 6), 0xff8a3a, 2, .9, new THREE.Vector3(0, 6, 0));
    }
  } else {
    const a = (t - INTRO_HIT) * .16 + .6, r = 24 - (t - INTRO_HIT) * 1.2;
    camera.position.set(C.x + Math.sin(a) * r, C.y + 7 + (t - INTRO_HIT) * .6, C.z + Math.cos(a) * r); camera.lookAt(C.x, C.y + 2.5, C.z);
    if (Math.random() < .5) puff(I.smoke, new THREE.Vector3(C.x + (Math.random() - .5) * 3, C.y + 3, C.z + (Math.random() - .5) * 3), 0x4a4542, 2, 3.5, new THREE.Vector3(.6, 3.2, 0));
  }
  if (I.shake > 0) { camera.position.x += (Math.random() - .5) * I.shake; camera.position.y += (Math.random() - .5) * I.shake; I.shake = Math.max(0, I.shake - dt * 1.1); }
  for (const p of [...I.smoke, ...I.dust]) if (p.visible) { const u = p.userData; u.t += dt; const k = u.t / u.life; if (k >= 1) { p.visible = false; continue; } p.position.addScaledVector(u.vel, dt); u.vel.multiplyScalar(1 - dt * .8); p.position.y += dt * .8; p.scale.setScalar(u.size * (.4 + k * 1.4)); p.material.opacity = (1 - k) * .75; }
  updateMood(C.z - 20, dt, C.x, C.y, C.z); updateHazards(dt, -50, GFX.t);
  if (t >= INTRO_LEN) endIntro();
}
function endIntro() {
  if (!INTRO.on) return; INTRO.on = false;
  if (INTRO.eng) { try { INTRO.eng.o.stop(); } catch (e) { } INTRO.eng = null; }
  if (INTRO.g) { scene.remove(INTRO.g); INTRO.g = null; }
  for (const w of GFX.wreck || []) w.visible = true;
  $('intro').style.display = 'none';
  const d = INTRO.done; INTRO.done = null; if (d) d();
}

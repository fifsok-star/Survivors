// Survivors - first-person view: you see only your own hands and feet.
// On a wall the hands work independently: left / right mouse button reaches with that hand where you look,
// the hand grips the rock and the body pulls up to it. Alternating hands is fastest and cheapest.
'use strict';
const VM = { g: null, feet: null, ci: -1, hand: {}, foot: {}, last: '', auto: 0, bob: 0, held: '', heldM: null };
const FP = () => SET.view !== 1;                // 0 = first person (default), 1 = third person

function vmPart(ci, name) {                     // clone one jointed part of the chosen survivor (sleeve + hand, or shin + shoe)
  const src = GFX.models['char' + ci]; let p = null; src.traverse(o => { if (o.name === 'c' + ci + '_' + name) p = o; });
  const c = p.clone(true); c.position.set(0, 0, 0); c.rotation.set(0, 0, 0);
  const g = new THREE.Group(); g.add(c); c.traverse(m => { if (m.isMesh) { m.material = toon(m.material.color); m.castShadow = false; } }); return g;
}
function buildViewmodel(ci) {
  if (VM.g) { camera.remove(VM.g); scene.remove(VM.feet); }
  if (!camera.parent) scene.add(camera);
  VM.ci = ci; VM.g = new THREE.Group(); camera.add(VM.g); VM.feet = new THREE.Group(); scene.add(VM.feet);
  for (const s of ['L', 'R']) {
    const h = vmPart(ci, 'fore' + s); h.scale.setScalar(.8); VM.g.add(h);
    VM.hand[s] = { m: h, reach: 0, grip: null, from: new THREE.Vector3(), pos: new THREE.Vector3() };
    const f = vmPart(ci, 'shin' + s); VM.feet.add(f); VM.foot[s] = { m: f, lift: 0 };
  }
  VM.held = ''; VM.heldM = null;
}
const HAND_REST = { L: new THREE.Vector3(-.36, -.44, -.62), R: new THREE.Vector3(.36, -.44, -.62) };
const HAND_WALL = { L: new THREE.Vector3(-.32, -.06, -.62), R: new THREE.Vector3(.32, -.06, -.62) };
const _fv = new THREE.Vector3(), _fw = new THREE.Vector3();

// LMB / RMB on a wall: reach with that hand
function handGrab(side) {
  const me = ME; if (!FP() || !me.steep || me.slide || me.air || me.ko || me.held >= 0) return false;
  const H = VM.hand[side]; if (!H || H.reach > 0) return true;
  if (me.sta < 2) { hint('t_tired'); return true; }
  H.reach = .2; H.from.copy(H.m.position); H.grip = null; H.manual = true; return true;
}
// called by the climbing code when a manual reach finishes: move the body along the wall towards where you look
function handStep(side, sl, ca, rx, rz) {
  const me = ME, same = VM.last === side; VM.last = side;
  const up = clamp(.9 - CAM.pitch * 1.6, -1, 1);                   // look up = climb up, look down = climb down
  let rel = CAM.yaw - Math.atan2(sl.gx, sl.gz); rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  const lat = clamp(-Math.sin(rel) * 1.7, -1, 1), d = same ? .3 : .62, rope = ropeNear(me.x, me.z);
  const n = { x: me.x + (sl.gx * up * ca + rx * lat * .9) * d * (rope ? 1.4 : 1), z: me.z + (sl.gz * up * ca + rz * lat * .9) * d * (rope ? 1.4 : 1) };
  constrain(me.z, n); me.x = n.x; me.z = n.z; me.y = groundAt(me.x, me.z);
  if (me.boost <= 0) me.sta -= (up < 0 ? .6 : same ? 2.6 : 1.5) * (rope ? .4 : 1) * (me.bio === B_SNOW || me.bio === B_STORM ? 1.2 : 1);
  sfx('step');
}
function updateViewmodel(dt) {
  const fp = FP() && phase === 'play'; if (!VM.g) return;
  VM.g.visible = fp && ME.held < 0 && ME.anim !== 'ko' && ME.anim !== 'swim'; VM.feet.visible = fp && ME.anim !== 'ko' && ME.anim !== 'tree';
  if (ME.g) ME.g.visible = !fp;
  if (!fp) return;
  const climb = ME.anim === 'climb' || ME.anim === 'tree', moving = ME.moving, k = Math.min(1, dt * 12);
  VM.bob += dt * (ME.anim === 'run' ? 11 : moving ? 7.5 : 1.5);
  // auto climbing (W/S) swaps hands by itself
  if (climb && moving && !VM.hand.L.reach && !VM.hand.R.reach) { VM.auto -= dt; if (VM.auto <= 0) { VM.auto = .32; const s = VM.last === 'L' ? 'R' : 'L'; VM.last = s; const H = VM.hand[s]; H.reach = .18; H.from.copy(H.m.position); H.grip = null; H.manual = false; } }
  for (const s of ['L', 'R']) {
    const H = VM.hand[s], m = H.m, sg = s === 'L' ? -1 : 1;
    let target, rx;
    if (climb) {
      if (H.reach > 0) {                         // reaching up to a new hold
        H.reach -= dt; const t = 1 - Math.max(0, H.reach) / .2, up = clamp(.9 - CAM.pitch * 1.6, -1, 1);
        target = _fv.copy(HAND_WALL[s]); target.y += .32 * up * Math.sin(t * Math.PI * .5) + Math.sin(t * Math.PI) * .08; target.z -= .12 * t;
        m.position.lerpVectors(H.from, target, Math.min(1, t * 1.1));
        if (H.reach <= 0) { H.grip = m.position.clone(); camera.localToWorld(H.grip); H.ready = H.manual; }
      } else if (H.grip) {                       // gripping: the hand stays on the rock while the body moves
        _fw.copy(H.grip); camera.worldToLocal(_fw);
        if (_fw.y < -.7 || _fw.length() > 1.2 || _fw.z > -.3) H.grip = null; else m.position.lerp(_fw, Math.min(1, dt * 30));
      } else m.position.lerp(_fv.copy(HAND_WALL[s]).setY(HAND_WALL[s].y - .1), k);
      rx = Math.PI / 2 + .55; m.rotation.set(rx, 0, sg * -.25);
    } else {
      H.reach = 0; H.grip = null;
      target = _fv.copy(HAND_REST[s]);
      if (moving) { target.y += Math.sin(VM.bob + (s === 'L' ? 0 : Math.PI)) * .035; target.z += Math.cos(VM.bob + (s === 'L' ? 0 : Math.PI)) * .05; }
      else target.y += Math.sin(VM.bob) * .008;
      if (ME.anim === 'carry') { target.y += .45; target.z -= .05; }
      if (ME.punch > 0 && s === 'R') { target.set(.12, -.18, -.78); }
      if (ME.sawing && ME.anim === 'saw') { target.z += Math.sin(GFX.t * 18) * .12; target.x -= sg * .08; }
      if (ME.anim === 'pull') { target.y += .1; target.z -= .1; }
      m.position.lerp(target, k);
      m.rotation.x += (Math.PI / 2 - .3 - (ME.anim === 'carry' ? .9 : 0) - m.rotation.x) * k; m.rotation.y = 0; m.rotation.z += (sg * -.18 - m.rotation.z) * k;
    }
  }
  // item in the right hand
  const want = climb || ME.anim === 'carry' || ME.anim === 'swim' ? '' : (ME.quick[ME.sel] || '');
  if (want !== VM.held) { const h = VM.hand.R.m; if (VM.heldM) h.remove(VM.heldM); VM.heldM = null; VM.held = want; if (want) { const def = ITEMS[want], it = new THREE.Mesh(baked('it_' + (def.model || want)), vcMat); it.position.set(0, -.3, .09); it.rotation.set(want === 'saw' ? 0 : 1.57, 0, want === 'saw' ? 1.57 : 0); if (want === 'shovel') it.rotation.set(3.14, 0, 0); h.add(it); VM.heldM = it; } }
  // feet: below you, facing where you walk; on a wall they push up one after the other
  const ry = ME.g ? ME.g.rotation.y : ME.ry; VM.feet.position.set(ME.x, ME.y, ME.z); VM.feet.rotation.y = ry;
  for (const s of ['L', 'R']) {
    const F = VM.foot[s], m = F.m, sg = s === 'L' ? -1 : 1, ph = VM.bob + (s === 'L' ? 0 : Math.PI);
    let y = .24, z = 0, rx = 0;
    if (climb) { y = .3 + Math.max(0, Math.sin(ph)) * (moving ? .22 : 0); z = -.18; rx = -.5 + (moving ? Math.sin(ph) * .4 : 0); }
    else if (moving) { z = Math.sin(ph) * .22; y = .24 + Math.max(0, Math.cos(ph)) * .06; rx = Math.sin(ph) * .35; }
    m.position.set(sg * .13, y, z + .05); m.rotation.set(rx, 0, 0);
  }
}
function updateCameraFP(dt) {
  const me = ME, fx = Math.sin(CAM.yaw), fz = Math.cos(CAM.yaw), p = clamp(CAM.pitch, -1.4, 1.4);
  let eh = 1.62, ox = 0, oz = 0;
  if (me.anim === 'climb' || me.anim === 'slide') { const sl = slopeAt(me.x, me.z); ox = -sl.gx * .5; oz = -sl.gz * .5; eh = 1.45; }
  else if (me.anim === 'ko') eh = .45; else if (me.anim === 'sit') eh = 1.05; else if (me.anim === 'swim') eh = .55;
  else if (me.moving && !me.air) eh += Math.abs(Math.sin(VM.bob)) * .045;
  const x = me.x + ox, y = Math.max(me.y + eh, getH(me.x + ox, me.z + oz) + .35), z = me.z + oz;
  camera.position.set(x, y, z);
  camera.lookAt(x + fx * Math.cos(p), y - Math.sin(p), z + fz * Math.cos(p));
}

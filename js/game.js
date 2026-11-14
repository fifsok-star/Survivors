// Survivors - client: player, camera, interactions, HUD, menus, main loop.
'use strict';
const $ = id => document.getElementById(id);
const SET = Object.assign({ sens: 50, invY: 0, fov: 70, shadows: 2, bright: 50, quality: 2, dist: 2, vol: 70, fps: 0 }, JSON.parse(localStorage.getItem('survivors-set') || '{}'));
const SAVE = Object.assign({ name: '', ch: 0, lang: '', code: '' }, JSON.parse(localStorage.getItem('survivors') || '{}'));
const saveAll = () => { try { localStorage.setItem('survivors-set', JSON.stringify(SET)); localStorage.setItem('survivors', JSON.stringify(SAVE)); } catch (e) { } };
let WS = null, phase = 'load', lobby = { players: [], started: false }, myIdx = 0;
const ME = { id: '', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, ry: 0, air: false, peak: 0, slide: false, slideTop: 0, sta: 100, inj: 0, hun: 0, ko: false, koT: 0, mode: '', treeH: 0, quick: [null, null, null], pack: [null, null, null, null, null, null], sel: 0, boost: 0, side: [-1, -1], washT: 0, anim: 'idle', moving: false, sawing: false, falls: 0, g: null, steep: false, sit: false };
const OTH = new Map(), KEY = {}, CAM = { yaw: Math.PI, pitch: .28, dist: 5.4 };
const maxSta = () => clamp(100 - ME.inj - ME.hun, 0, 100);
const has = t => ME.quick.includes(t) || ME.pack.includes(t);
function takeItem(t) { let i = ME.quick.indexOf(t); if (i >= 0) { ME.quick[i] = null; return true; } i = ME.pack.indexOf(t); if (i >= 0) { ME.pack[i] = null; return true; } return false; }
function giveItem(t) { let i = ME.quick.indexOf(null); if (i >= 0) { ME.quick[i] = t; drawInv(); return true; } i = ME.pack.indexOf(null); if (i >= 0) { ME.pack[i] = t; drawInv(); return true; } return false; }
const invFull = () => !ME.quick.includes(null) && !ME.pack.includes(null);
function act(a) { a.t = 'a'; if (Net.isHost) hostAct(Net.id, a); else Net.toHost(a); }

function lockPointer() { try { const p = $('game').requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
// ---------------------------------------------------------------- audio
let AC = null, master = null, ambG = null, ambF = null;
function audioInit() {
  if (AC) return; try {
    AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = SET.vol / 100; master.connect(AC.destination);
    const b = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = AC.createBufferSource(); s.buffer = b; s.loop = true; ambF = AC.createBiquadFilter(); ambF.type = 'lowpass'; ambF.frequency.value = 500; ambG = AC.createGain(); ambG.gain.value = .05; s.connect(ambF); ambF.connect(ambG); ambG.connect(master); s.start();
  } catch (e) { AC = null; }
}
function tone(f, d, type, v, slide, when) { if (!AC) return; const t = AC.currentTime + (when || 0), o = AC.createOscillator(), g = AC.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d); g.gain.setValueAtTime(v || .15, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .02); }
function sfx(n) {
  if (n === 'ok') { tone(660, .12, 'triangle', .14); tone(880, .18, 'triangle', .14, 0, .1); }
  else if (n === 'bad') tone(180, .4, 'sawtooth', .12, 90);
  else if (n === 'win') [523, 659, 784, 1047].forEach((f, i) => tone(f, .25, 'triangle', .14, 0, i * .11));
  else if (n === 'click') tone(300, .06, 'square', .08);
  else if (n === 'pick') tone(720, .09, 'sine', .12, 1100);
  else if (n === 'chest') { tone(200, .2, 'triangle', .15, 400); tone(800, .3, 'sine', .1, 0, .15); }
  else if (n === 'thud') tone(90, .25, 'sine', .3, 40);
  else if (n === 'hurt') tone(240, .3, 'sawtooth', .14, 80);
  else if (n === 'step') tone(70 + Math.random() * 40, .05, 'triangle', .05);
  else if (n === 'bird') { const f = 1800 + Math.random() * 1400; tone(f, .08, 'sine', .03, f * 1.3); tone(f * 1.2, .1, 'sine', .03, f, .12); }
  else if (n === 'eat') { tone(400, .06, 'square', .06); tone(330, .06, 'square', .06, 0, .1); }
}

// ---------------------------------------------------------------- toasts / HUD helpers
function toast(msg, cls) { const d = document.createElement('div'); d.className = 'toast ' + (cls || ''); d.textContent = msg; $('toasts').appendChild(d); setTimeout(() => d.classList.add('out'), 4200); setTimeout(() => d.remove(), 4800); while ($('toasts').children.length > 5) $('toasts').firstChild.remove(); }
let lastHint = {};
function hint(key) { const n = performance.now(); if (lastHint[key] && n - lastHint[key] < 3500) return; lastHint[key] = n; toast(T(key), 'hint'); }
function drawInv() {
  let h = '';
  ME.quick.forEach((t, i) => { h += `<div class="slot q${i === ME.sel ? ' sel' : ''}${invSel === 'q' + i ? ' pick' : ''}" data-s="q${i}"><b>${i + 1}</b>${t ? ITEMS[t].ic : ''}<i>${t ? T('it_' + t) : ''}</i></div>`; });
  $('quick').innerHTML = h;
  h = ''; ME.pack.forEach((t, i) => { h += `<div class="slot${invSel === 'p' + i ? ' pick' : ''}" data-s="p${i}">${t ? ITEMS[t].ic : ''}<i>${t ? T('it_' + t) : ''}</i></div>`; });
  $('packslots').innerHTML = h;
}
let invSel = null, invOpen = false;
function slotRef(s) { return [s[0] === 'q' ? ME.quick : ME.pack, +s.slice(1)]; }
function invClick(s, right) {
  if (right) { const [a, i] = slotRef(s); if (a[i]) dropItem(a, i); return; }
  if (!invOpen) { if (s[0] === 'q') { ME.sel = +s.slice(1); drawInv(); } return; }
  if (!invSel) invSel = s; else { const [a, i] = slotRef(invSel), [b, j] = slotRef(s); const t = a[i]; a[i] = b[j]; b[j] = t; invSel = null; }
  drawInv();
}
function dropItem(arr, i) { const t = arr[i]; if (!t) return; arr[i] = null; act({ k: 'drop', it: t, x: ME.x + Math.sin(ME.ry) * .8, z: ME.z + Math.cos(ME.ry) * .8, y: ME.y + 1 }); drawInv(); }
function toggleInv(v) { invOpen = v == null ? !invOpen : v; invSel = null; $('pack').style.display = invOpen ? 'block' : 'none'; if (invOpen) document.exitPointerLock(); drawInv(); }

// ---------------------------------------------------------------- world state -> scene
const OBJ = { items: new Map(), logs: [], totems: [], plates: [], levers: [], chests: {}, ropes: [], pitons: [], flares: [], x: [], gate: null, tree: null, heli: null };
function buildDynamic() {
  OBJ.gate = prop('gate', L.gate.x, L.gate.y - .4, L.gate.z, 0, 1.6); worldG.add(OBJ.gate);
  OBJ.tree = prop('fallen_tree', L.tree.x, L.tree.y - .3, L.tree.z, 0, 1.5); worldG.add(OBJ.tree);
  OBJ.sawBar = labelSprite('', '#fff'); OBJ.sawBar.position.set(L.tree.x, L.tree.y + 4, L.tree.z); worldG.add(OBJ.sawBar); OBJ.sawBar.visible = false;
  L.totems.forEach((p, i) => {
    const g = new THREE.Group(); g.add(prop('totem', 0, 0, 0, 0, 1)); g.position.set(p.x, p.y - .1, p.z); g.rotation.y = Math.atan2(L.gate.x - p.x, (L.gate.z - 16) - p.z) + Math.PI;
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(.5, .5), new THREE.MeshBasicMaterial({ transparent: false })); pl.position.set(0, 1.15, .44); g.add(pl);
    const gl = new THREE.Mesh(new THREE.TorusGeometry(.6, .07, 6, 20), new THREE.MeshBasicMaterial({ color: 0x66ff88, fog: false })); gl.rotation.x = Math.PI / 2; gl.position.y = 2.75; g.add(gl);
    worldG.add(g); addCol(p.x, p.z, .55); OBJ.totems.push({ g, pl, gl, sym: -1 });
  });
  L.plates.forEach(p => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.78, .78, .06, 16), new THREE.MeshBasicMaterial({ color: 0x55ff77, transparent: true, opacity: .8 })); m.position.set(p.x, p.y + .2, p.z); worldG.add(m); OBJ.plates.push(m); });
  L.levers.forEach(p => { const m = prop('lever_arm', p.x, p.y + .45, p.z, 0, 1); worldG.add(m); OBJ.levers.push(m); });
  const chest = (id, p, crate) => {
    const g = new THREE.Group(); g.position.set(p.x, p.y, p.z); g.rotation.y = p.x * 1.3;
    if (crate) g.add(prop('crate', 0, 0, 0, 0, 1)); else { g.add(prop('chest_base', 0, 0, 0, 0, 1)); const lid = prop('chest_lid', 0, .5, -.31, 0, 1); g.add(lid); g.userData.lid = lid; }
    worldG.add(g); OBJ.chests[id] = g; addCol(p.x, p.z, .6);
  };
  L.crates.forEach((p, i) => chest('crate' + i, p, true)); chest('vault', L.vault); chest('lever', L.leverChest); L.pitChests.forEach((p, i) => chest('pit' + i, p)); L.digs.forEach((p, i) => { chest('dig' + i, p); const x = prop('xmark', p.x, p.y + .03, p.z, i, 1); worldG.add(x); OBJ.x.push(x); });
  L.stakes.forEach((s, i) => {
    const g = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ color: 0xd8b56a });
    if (s.wall != null) { for (let z = s.baseZ; z < s.z; z += 1.2) { const a = new THREE.Vector3(s.x, getH(s.x, z) + .25, z), b = new THREE.Vector3(s.x, getH(s.x, Math.min(z + 1.2, s.z)) + .25, Math.min(z + 1.2, s.z)); const m = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, a.distanceTo(b) + .05, 5), mat); m.position.copy(a).lerp(b, .5); m.lookAt(b); m.rotateX(Math.PI / 2); g.add(m); } }
    else { const p = L.pits[s.pit], n = 9; for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n, f = t => new THREE.Vector3(lerp(s.x, p.x + p.r - .6, Math.min(1, t * 2.5)), lerp(s.y + .6, p.y + .2, sstep(.25, 1, t)), s.z); const a = f(t0), b = f(t1); const m = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, a.distanceTo(b) + .05, 5), mat); m.position.copy(a).lerp(b, .5); m.lookAt(b); m.rotateX(Math.PI / 2); g.add(m); } }
    g.visible = false; worldG.add(g); OBJ.ropes.push(g);
  });
  L.logs.forEach(() => { const m = new THREE.Mesh(baked('log'), vcMat); m.castShadow = true; worldG.add(m); OBJ.logs.push(m); });
  const hg = new THREE.Group(); const hb = prop('heli_body', 0, 0, 0, 0, 1), hr = prop('heli_rotor', 0, 1.8, 0, 0, 1); hg.add(hb); hg.add(hr); hg.userData.rotor = hr; hg.visible = false; worldG.add(hg); OBJ.heli = hg;
}
function onWorld(W) {
  WS = W; if (!OBJ.gate) return;
  // items
  const seen = new Set();
  for (const it of W.items) {
    seen.add(it.id); let m = OBJ.items.get(it.id);
    if (!m) { const def = ITEMS[it.t]; m = new THREE.Mesh(baked('it_' + (def.model || it.t)), vcMat); m.castShadow = true; m.scale.setScalar(1.25); m.userData = { it, fy: it.fy != null ? it.fy : it.y, ph: Math.random() * 6 }; m.position.set(it.x, m.userData.fy, it.z); worldG.add(m); OBJ.items.set(it.id, m); }
  }
  for (const [id, m] of OBJ.items) if (!seen.has(id)) { worldG.remove(m); OBJ.items.delete(id); }
  W.totems.sym.forEach((s, i) => { const o = OBJ.totems[i]; if (o.sym !== s) { o.sym = s; o.pl.material.map = symbolTex(SYMS[s]); o.pl.material.needsUpdate = true; } o.gl.visible = W.totems.hit.includes(i) || W.totems.open; });
  OBJ.plates.forEach((m, i) => { m.visible = i < W.plates.n; m.material.color.setHex(W.plates.open || W.plates.on[i] ? 0x55ff77 : 0xff5544); });
  for (const id in OBJ.chests) { const g = OBJ.chests[id]; if (id.startsWith('dig')) g.visible = !!W.digs[+id.slice(3)]; if (g.userData.lid) g.userData.open = !!W.chests[id]; else if (W.chests[id]) g.rotation.z = .5; }
  OBJ.x.forEach((m, i) => m.visible = !W.digs[i]);
  OBJ.ropes.forEach((g, i) => g.visible = !!W.ropes[i]);
  while (OBJ.pitons.length < W.pitons.length) { const p = W.pitons[OBJ.pitons.length], m = prop('it_piton', p.x, p.y + .1, p.z, 0, 1.6); m.rotation.x = -1.2; worldG.add(m); OBJ.pitons.push(m); }
  while (OBJ.flares.length) worldG.remove(OBJ.flares.pop());
  for (const f of W.flares) { const b = beacon(0xff3322); b.position.set(f.x, f.y, f.z); worldG.add(b); OBJ.flares.push(b); }
  if (W.won && phase === 'play') showWin();
  if (phase === 'play') drawObjective();
}
function updateDynamic(dt) {
  const W = WS; if (!W) return;
  for (const m of OBJ.items.values()) { const u = m.userData; u.ph += dt; if (u.fy > u.it.y) u.fy = Math.max(u.it.y, u.fy - dt * 9); m.position.y = u.fy + .25 + Math.sin(u.ph * 2) * .07; m.rotation.y = u.ph * .9; }
  const gy = W.totems.open ? L.gate.y - 7.2 : L.gate.y - .4; OBJ.gate.position.y += (gy - OBJ.gate.position.y) * Math.min(1, dt * 1.2);
  OBJ.tree.visible = !W.saw.done;
  OBJ.levers.forEach((m, i) => { const t = W.levers.st[i] ? -.75 : .75; m.rotation.x += (t - m.rotation.x) * Math.min(1, dt * 10); });
  for (const id in OBJ.chests) { const g = OBJ.chests[id], l = g.userData.lid; if (l) l.rotation.x += ((g.userData.open ? -1.9 : 0) - l.rotation.x) * Math.min(1, dt * 6); }
  W.logs.forEach((g, i) => {
    const m = OBJ.logs[i]; let x = g.x, z = g.z, y, ry = g.ry, len = g.len;
    if (g.br >= 0) { const b = L.bridges[g.br]; x = b.x + (g.slot - (STREAMS[g.br].logs - 1) / 2) * .62; z = b.z; y = b.y - .2; ry = Math.PI / 2; len = b.w + 4; }
    else if (g.car.length >= g.need) { let hy = 0, n = 0; for (const c of g.car) { const p = c === ME.id ? ME : OTH.get(c); if (p) { hy += p.y; n++; } } y = (n ? hy / n : getH(x, z)) + 1.75; }
    else y = getH(x, z) + .3;
    const k = Math.min(1, dt * 12); m.position.x += (x - m.position.x) * k; m.position.z += (z - m.position.z) * k; m.position.y += (y - m.position.y) * k; m.rotation.y = ry; m.scale.set(len, 1.25, 1.25);
  });
  for (const t of OBJ.totems) t.gl.rotation.z += dt * 2;
  if (W.totems.bad && W.time - W.totems.bad < 1) for (const t of OBJ.totems) { t.gl.visible = true; t.gl.material.color.setHex(0xff3322); } else for (const t of OBJ.totems) t.gl.material.color.setHex(0x66ff88);
  for (const b of OBJ.flares) b.children[0].material.opacity = .35 + Math.sin(GFX.t * 8) * .15;
  const H = OBJ.heli;
  if (W.radio.t) { const t = W.time - W.radio.t; H.visible = t > 8; const k = sstep(8, 26, t), tx = L.heli.x, tz = L.heli.z; H.position.set(lerp(tx + 260, tx, k), lerp(L.heli.y + 110, L.heli.y + 2.0, sstep(.7, 1, k)), lerp(tz - 300, tz, k)); H.rotation.y = lerp(-.8, .6, k); H.userData.rotor.rotation.y += dt * 30; H.scale.setScalar(1.3); if (AC && H.visible && Math.random() < .3) tone(55, .09, 'square', .05 * k + .01); }
}

// ---------------------------------------------------------------- ground rules
function groundAt(x, z) {
  let h = getH(x, z);
  if (WS) for (let i = 0; i < L.bridges.length; i++) { const b = L.bridges[i]; if (WS.bridges[i].done && Math.abs(z - b.z) < b.w / 2 + 2.6 && Math.abs(x - b.x) < 1.5) h = Math.max(h, b.y + .1); }
  return h;
}
function onBridge(x, z) { if (WS) for (let i = 0; i < L.bridges.length; i++) { const b = L.bridges[i]; if (WS.bridges[i].done && Math.abs(z - b.z) < b.w / 2 + 2.6 && Math.abs(x - b.x) < 1.5) return true; } return false; }
function constrain(pz, n) {
  const c = pathX(n.z), hw = halfW(n.z) + 5; n.x = clamp(n.x, Math.max(c - hw, -128), Math.min(c + hw, 128)); n.z = clamp(n.z, -88, Z_MAX);
  if (WS) {
    if (!WS.totems.open && pz <= GATE_Z - 1.2 && n.z > GATE_Z - 1.2) n.z = GATE_Z - 1.2;
    if (!WS.totems.open && pz >= GATE_Z + 1.2 && n.z < GATE_Z + 1.2) n.z = GATE_Z + 1.2;
    if (!WS.saw.done && pz <= TREE_Z - 1.6 && n.z > TREE_Z - 1.6) n.z = TREE_Z - 1.6;
    if (!WS.saw.done && pz >= TREE_Z + 1.6 && n.z < TREE_Z + 1.6) n.z = TREE_Z + 1.6;
  }
  collide(n, .38);
}
function ropeNear(x, z) { if (!WS) return false; for (let i = 2; i < L.stakes.length; i++) { const s = L.stakes[i]; if (WS.ropes[i] && Math.abs(x - s.x) < 1.7 && z > s.baseZ - 2 && z < s.z + 1) return true; } return false; }
function pitonNear(x, y, z) { if (!WS) return false; for (const p of WS.pitons) if (Math.abs(p.x - x) < 1.4 && Math.abs(p.z - z) < 1.4 && Math.abs(p.y - y) < 1.8) return true; return false; }
function inPit(x, y, z) { for (let i = 0; i < L.pits.length; i++) { const p = L.pits[i]; if (dist2(x, z, p.x, p.z) < p.r + 2.6 && y < p.top - 1.5) return i; } return -1; }
function hurt(eff) {
  if (eff < 4) return; ME.falls++; act({ k: 'fall' }); sfx('hurt'); $('vign').classList.add('hit'); setTimeout(() => $('vign').classList.remove('hit'), 500);
  ME.inj = Math.min(95, ME.inj + (eff - 4) * 3.2);
  if (eff > 24 || maxSta() <= 5) knockOut();
}
function knockOut() { if (ME.ko) return; ME.ko = true; ME.koT = 0; ME.sta = 0; ME.mode = ''; toast(T('t_ko'), 'bad'); }
function respawn() { const c = L.camps[WS ? WS.cp : 0]; ME.x = c.x + 2 + myIdx * .7; ME.z = c.z - 2; ME.y = getH(ME.x, ME.z); ME.ko = false; ME.air = false; ME.slide = false; ME.mode = ''; ME.inj = Math.min(ME.inj, 45); ME.hun = Math.min(ME.hun, 30); ME.sta = maxSta(); ME.vx = ME.vy = ME.vz = 0; }

// ---------------------------------------------------------------- my movement
function updateMe(dt) {
  const me = ME, mx = maxSta();
  me.hun = Math.min(60, me.hun + dt / 11); if (me.boost > 0) me.boost -= dt;
  if (me.ko) { me.koT += dt; me.anim = 'ko'; me.y += (getH(me.x, me.z) - me.y) * Math.min(1, dt * 8); return; }
  if (mx <= 5) { knockOut(); return; }
  let ix = 0, iz = 0;
  if (!invOpen && phase === 'play' && !ui.paused) { if (KEY.KeyW || KEY.ArrowUp) iz += 1; if (KEY.KeyS || KEY.ArrowDown) iz -= 1; if (KEY.KeyD || KEY.ArrowRight) ix += 1; if (KEY.KeyA || KEY.ArrowLeft) ix -= 1; }
  const il = Math.hypot(ix, iz); if (il) { ix /= il; iz /= il; }
  const fx = Math.sin(CAM.yaw), fz = Math.cos(CAM.yaw);
  let wx = fx * iz - fz * ix, wz = fz * iz + fx * ix;
  const moving = il > 0, drain = v => { if (me.boost <= 0) me.sta -= v * dt; };
  me.moving = moving; me.sawing = false; me.sit = false;
  // --- lookout tree
  if (me.mode === 'tree') {
    const t = L.lookout; me.treeH += iz * 2.1 * dt; if (moving) drain(5); else drain(.8);
    const a = me.treeH * .5; me.x = t.x + Math.sin(a) * 1.3; me.z = t.z + Math.cos(a) * 1.3; me.y = t.y + me.treeH; me.ry = a + Math.PI; me.anim = 'climb';
    if (me.treeH >= 13.6) { me.mode = 'plat'; me.x = t.x + 1.2; me.z = t.z; me.y = t.y + 13.85; toast(T('t_plat')); }
    else if (me.treeH <= 0) { me.mode = ''; me.x = t.x; me.z = t.z - 2.2; }
    else if (me.sta <= 0) { me.mode = ''; me.air = true; me.peak = me.y; me.vx = Math.sin(a) * 2; me.vz = Math.cos(a) * 2; me.vy = 0; }
    return;
  }
  if (me.mode === 'plat') {
    const t = L.lookout; me.x += wx * 3 * dt; me.z += wz * 3 * dt; const d = dist2(me.x, me.z, t.x, t.z);
    if (d > 2.25) { me.x = t.x + (me.x - t.x) / d * 2.25; me.z = t.z + (me.z - t.z) / d * 2.25; } if (d < .95) { me.x = t.x + (me.x - t.x) / (d || 1) * .95; me.z = t.z + (me.z - t.z) / (d || 1) * .95; }
    me.y = t.y + 13.85; if (moving) me.ry = Math.atan2(wx, wz); me.anim = moving ? 'walk' : 'idle'; me.sta = Math.min(mx, me.sta + (moving ? 3 : 16) * dt); return;
  }
  const prevZ = me.z, n = { x: me.x, z: me.z };
  if (me.air) {
    me.vy -= 23 * dt; n.x += me.vx * dt; n.z += me.vz * dt; constrain(prevZ, n); me.x = n.x; me.z = n.z; me.y += me.vy * dt; me.peak = Math.max(me.peak, me.y); me.anim = 'air';
    const g = groundAt(me.x, me.z);
    if (me.y <= g) { me.y = g; me.air = false; const sea = g < -.6; if (!sea) hurt(me.peak - g); if (me.peak - g > 1.5) sfx('thud'); me.vx = me.vz = 0; }
    return;
  }
  const sl = slopeAt(me.x, me.z), brd = onBridge(me.x, me.z), g0 = groundAt(me.x, me.z);
  const swim = g0 < -1.05, steep = sl.ang > .73 && !brd && !swim; me.steep = steep;
  if (me.slide && (!steep || (me.sta > 12 && pitonNear(me.x, me.y, me.z)))) { me.slide = false; hurt((me.slideTop - me.y) * .55); }
  if (steep && (me.sta <= 0 || me.slide)) {                     // out of stamina: slide down
    if (!me.slide) { me.slide = true; me.slideTop = me.y; toast(T('t_slip'), 'bad'); }
    const v = 9; n.x -= sl.gx * v * dt; n.z -= sl.gz * v * dt; constrain(prevZ, n); me.x = n.x; me.z = n.z; me.y = groundAt(me.x, me.z); me.anim = 'slide'; me.ry = Math.atan2(sl.gx, sl.gz); me.sta = Math.min(mx, me.sta + 4 * dt);
    return;
  }
  if (steep) {                                                  // climbing
    const rope = ropeNear(me.x, me.z), pit = inPit(me.x, me.y, me.z) >= 0, pin = pitonNear(me.x, me.y, me.z);
    const along = Math.abs(wx * sl.gx + wz * sl.gz), sp = 2.0 * (rope ? 1.5 : 1) * lerp(1, Math.cos(sl.ang) * 1.15, along);
    if (moving) { n.x += wx * sp * dt; n.z += wz * sp * dt; drain(5.2 * (rope ? .32 : 1) * (pit ? 9 : 1) * (wx * sl.gx + wz * sl.gz < -.3 ? .4 : 1)); }
    else if (pin || rope) me.sta = Math.min(mx, me.sta + 9 * dt); else drain(1.1);
    constrain(prevZ, n); me.x = n.x; me.z = n.z; me.y = groundAt(me.x, me.z); me.anim = 'climb'; me.ry = Math.atan2(sl.gx, sl.gz);
    if (KEY.Space && !KEY._jl) { KEY._jl = true; me.air = true; me.peak = me.y; me.vy = 4.5; me.vx = -sl.gx * 3.5 + wx * 2; me.vz = -sl.gz * 3.5 + wz * 2; drain(0); me.sta -= 6; }
    return;
  }
  // walking
  const carry = WS && WS.logs.find(l => l.car.includes(me.id) && l.car.length >= l.need), holding = WS && WS.logs.some(l => l.car.includes(me.id));
  const sprint = KEY.ShiftLeft && moving && me.sta > 1 && !holding && !swim;
  let sp = swim ? 2.1 : carry ? 2.5 : holding ? 0 : sprint ? 6.9 : 4.1; if (g0 < -.3 && !swim) sp *= .7;
  if (moving) { n.x += wx * sp * dt; n.z += wz * sp * dt; me.ry = Math.atan2(wx, wz); }
  constrain(prevZ, n);
  const ns = slopeAt(n.x, n.z);
  me.x = n.x; me.z = n.z; me.y = Math.max(groundAt(me.x, me.z), swim ? -1.15 : -99);
  if (swim) { drain(moving ? 7 : 3); me.anim = 'swim'; if (me.sta <= 0) { toast(T('t_drown'), 'bad'); me.inj = Math.min(90, me.inj + 12); respawn(); } return; }
  if (sprint) drain(8.5); else if (carry) drain(moving ? 3.2 : .6); else if (!moving) me.sta += 17 * dt; else me.sta += 2.6 * dt;
  me.sta = clamp(me.sta, 0, mx);
  me.anim = carry || holding ? 'carry' : moving ? (sprint ? 'run' : 'walk') : 'idle';
  if (KEY.Space && !KEY._jl && me.sta > 5 && !holding) { KEY._jl = true; me.air = true; me.peak = me.y; me.vy = 7.2; me.vx = wx * sp; me.vz = wz * sp; me.sta -= 5; }
  // streams wash you back unless there is a bridge
  for (let i = 0; i < STREAMS.length; i++) {
    const s = STREAMS[i], dz = me.z - s.z;
    if (Math.abs(dz) > s.w / 2 + 1.5) me.side[i] = dz < 0 ? -1 : 1;
    else if (Math.abs(dz) < s.w / 2 - 1 && !brd && me.y < L.bridges[i].level + .1) { me.washT += dt; if (me.washT > .45) { me.washT = 0; me.z = s.z + me.side[i] * (s.w / 2 + 3); me.x += 3; me.y = groundAt(me.x, me.z); me.sta = Math.max(0, me.sta - 22); toast(T('t_wash'), 'bad'); sfx('hurt'); } }
  }
  // campfire rest
  if (!moving) for (const c of L.camps) if (dist2(me.x, me.z, c.x, c.z) < 4.5 && Math.abs(me.y - c.y) < 3) { me.inj = Math.max(0, me.inj - dt * 2.2); me.sit = true; me.anim = 'sit'; }
}
function myState() { const h = ME.quick[ME.sel]; return { i: ME.id, x: +ME.x.toFixed(2), y: +ME.y.toFixed(2), z: +ME.z.toFixed(2), r: +ME.ry.toFixed(2), a: ME.anim, m: ME.moving ? 1 : 0, s: Math.round(ME.sta), mx: Math.round(maxSta()), k: ME.ko ? 1 : 0, h: h || '', f: (ME.sawing ? 1 : 0) | (has('saw') ? 2 : 0) }; }
function onStates(m) {
  for (const s of m.l) {
    if (s.i === ME.id) continue; let o = OTH.get(s.i);
    if (!o) { const lp = lobby.players.find(p => p.id === s.i) || { n: '?', c: 0 }; o = { g: makeChar(lp.c, lp.n), x: s.x, y: s.y, z: s.z, ry: s.r, c: lp.c, n: lp.n }; scene.add(o.g); OTH.set(s.i, o); }
    o.tx = s.x; o.ty = s.y; o.tz = s.z; o.tr = s.r; o.a = s.a; o.m = s.m; o.s = s.s; o.mx = s.mx; o.k = s.k; o.h = s.h; o.f = s.f; o.seen = performance.now();
  }
  for (const [id, o] of OTH) if (!m.l.some(s => s.i === id)) { scene.remove(o.g); OTH.delete(id); }
}
function updateOthers(dt) {
  const k = Math.min(1, dt * 11);
  for (const o of OTH.values()) {
    if (o.tx == null) continue;
    if (Math.abs(o.tx - o.x) + Math.abs(o.tz - o.z) + Math.abs(o.ty - o.y) > 14) { o.x = o.tx; o.y = o.ty; o.z = o.tz; }
    o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k; o.z += (o.tz - o.z) * k; let d = o.tr - o.ry; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283; o.ry += d * k;
    o.g.position.set(o.x, o.y, o.z); o.g.rotation.y = o.ry; animChar(o.g, o.a, dt, 0, o.m); setHeld(o.g, o.a === 'carry' || o.a === 'climb' ? '' : o.h);
  }
}

// ---------------------------------------------------------------- interactions
let curI = null, holdT = 0, mapOpen = -1;
function teammates() { return [...OTH.entries()].map(([id, o]) => ({ id, o })); }
function findInteract() {
  const me = ME, W = WS; if (!W || me.ko) return null; let best = null, bd = 1e9;
  const C = (d, o) => { if (d < bd) { bd = d; best = o; } }, D = p => Math.hypot(p.x - me.x, p.z - me.z) + Math.abs((p.y == null ? me.y : p.y) - me.y) * .5;
  if (me.mode === 'plat') return { label: T('i_down'), go: () => { me.mode = 'tree'; me.treeH = 13.4; } };
  if (me.mode === 'tree') return null;
  const myLog = W.logs.find(l => l.car.includes(me.id));
  if (myLog) return { label: T('i_droplog') + (myLog.car.length < myLog.need ? '  (' + myLog.car.length + '/' + myLog.need + ' ' + T('i_carriers') + ')' : ''), go: () => act({ k: 'log', id: myLog.id }) };
  for (const m of OBJ.items.values()) { const it = m.userData.it, d = D(it); if (d < 2.3) C(d - .5, { label: T('i_pick') + ' ' + ITEMS[it.t].ic + ' ' + T('it_' + it.t), go: () => { if (invFull()) return hint('t_full'); act({ k: 'pick', id: it.id }); } }); }
  for (const g of W.logs) if (g.br < 0) { const m = OBJ.logs[g.id], d = Math.hypot(m.position.x - me.x, m.position.z - me.z); if (d < g.len / 2 + 1) C(1.2, { label: T('i_log') + ' (' + g.car.length + '/' + g.need + ')', go: () => act({ k: 'log', id: g.id }) }); }
  if (!W.totems.open) L.totems.forEach((p, i) => { const d = D(p); if (d < 2.6 && !W.totems.hit.includes(i)) C(d, { label: T('i_totem') + ' ' + SYMS[W.totems.sym[i]], go: () => act({ k: 'totem', i }) }); });
  if (!W.levers.open) L.levers.forEach((p, i) => { const d = D(p); if (d < 2) C(d, { label: T('i_lever'), go: () => act({ k: 'lever', i }) }); });
  for (const id in OBJ.chests) {
    if (W.chests[id]) continue; if (id.startsWith('dig') && !W.digs[+id.slice(3)]) continue;
    const p = chestPos(id), d = D(p); if (d > 2.4) continue;
    if (id === 'vault' && !W.plates.open) C(d, { label: T('i_locked_plates') + ' (' + W.plates.on.slice(0, W.plates.n).filter(v => v).length + '/' + W.plates.n + ')', go: () => hint('h_plates') });
    else if (id === 'lever' && !W.levers.open) C(d, { label: T('i_locked_levers'), go: () => hint('h_levers') });
    else C(d, { label: T('i_open'), go: () => act({ k: 'chest', id }) });
  }
  L.digs.forEach((p, i) => { if (W.digs[i]) return; const d = D(p); if (d < 2.2) C(d, has('shovel') ? { label: T('i_dig'), hold: 2.6, anim: 'saw', go: () => act({ k: 'dig', i }) } : { label: T('i_need_shovel'), go: () => hint('i_need_shovel') }); });
  { const d = D(L.lookout); if (d < 3.6 && Math.abs(me.y - L.lookout.y) < 2) C(d, { label: T('i_tree'), go: () => { me.mode = 'tree'; me.treeH = .3; } }); }
  if (!W.saw.done) { const d = Math.abs(me.z - L.tree.z) + Math.max(0, Math.abs(me.x - L.tree.x) - 5); if (d < 3.2) { const any = has('saw') || teammates().some(t => (t.o.f & 2) && dist2(t.o.x, t.o.z, L.tree.x, L.tree.z) < 9); C(d, any ? { label: T('i_saw') + ' ' + Math.round(W.saw.p * 100) + '%', hold: 999, anim: 'saw', sawing: true, go: () => { } } : { label: T('i_need_saw'), go: () => hint('h_saw') }); } }
  L.bridges.forEach((b, i) => { const bs = W.bridges[i], d = dist2(me.x, me.z, b.x, b.z - b.w / 2 - 2); if (!bs.done && d < 5) { if (bs.logs >= STREAMS[i].logs && STREAMS[i].rope && !bs.rope) C(2, has('rope') ? { label: T('i_lash'), hold: 2, anim: 'saw', go: () => { if (takeItem('rope')) { drawInv(); act({ k: 'lash', b: i }); } } } : { label: T('i_need_rope'), go: () => hint('i_need_rope') }); else if (bs.logs < STREAMS[i].logs) C(4.5, { label: T('i_bridge') + ' ' + bs.logs + '/' + STREAMS[i].logs, go: () => hint('h_bridge') }); } });
  L.stakes.forEach((s, i) => {
    const d = D(s);
    if (d < 2.4) {
      if (!W.ropes[i]) C(d, has('rope') ? { label: T('i_rope'), hold: 1.2, anim: 'saw', go: () => { if (takeItem('rope')) { drawInv(); act({ k: 'rope', s: i }); } } } : { label: T('i_need_rope'), go: () => hint('i_need_rope') });
      else {
        const stuck = s.pit != null && teammates().find(t => inPit(t.o.x, t.o.y, t.o.z) === s.pit);
        if (stuck) C(d - 1, { label: T('i_haul') + ' ' + stuck.o.n, hold: 1.4, anim: 'pull', go: () => { ME.sta = Math.max(0, ME.sta - 15); act({ k: 'haul', to: stuck.id, x: s.x + 1.2, z: s.z, y: s.y }); } });
        else C(d, { label: T('i_unrope'), hold: 1, go: () => { if (invFull()) return hint('t_full'); act({ k: 'unrope', s: i }); } });
      }
    }
  });
  { const pi = inPit(me.x, me.y, me.z); if (pi >= 0 && !me.steep) { if (W.ropes[pi]) C(0, { label: T('i_ropeup'), hold: 1.6, anim: 'climb', go: () => { if (me.sta < 30) return hint('t_tired'); me.sta -= 30; const s = L.stakes[pi]; me.x = s.x + 1.2; me.z = s.z; me.y = getH(me.x, me.z); } }); else C(3, { label: T('i_pit_stuck'), go: () => hint('h_pit') }); } }
  { const d = D(L.tablet); if (d < 3.2) C(d, { label: T('i_tablet') + '  ' + W.levers.target.map(v => v ? '↓' : '↑').join(' '), go: () => hint('h_tablet') }); }
  { const d = D(L.radio); if (d < 4.5 && !W.radio.t) C(d, { label: T('i_radio'), hold: 3.5, anim: 'saw', go: () => act({ k: 'radio' }) }); }
  for (const { id, o } of teammates()) {
    const d3 = Math.hypot(o.x - me.x, o.y - me.y, o.z - me.z);
    if (o.k) { if (d3 < 2.6) C(-1, { label: T('i_revive') + ' ' + o.n, hold: 2.5, anim: 'saw', go: () => act({ k: 'revive', to: id }) }); continue; }
    if (me.steep || me.air) continue;
    if (d3 < 5.6 && o.y < me.y - 1 && (o.a === 'climb' || o.a === 'idle' || o.a === 'walk')) C(-.5, { label: T('i_pull') + ' ' + o.n, hold: .8, anim: 'pull', go: () => { if (me.sta < 18) return hint('t_tired'); me.sta -= 18; act({ k: 'pull', to: id, x: me.x - Math.sin(me.ry) * .9, z: me.z - Math.cos(me.ry) * .9, y: me.y }); } });
    else if (d3 < 3 && o.a === 'climb' && o.y >= me.y - 1) C(-.5, { label: T('i_boost') + ' ' + o.n, hold: .5, anim: 'pull', go: () => { if (me.sta < 22) return hint('t_tired'); me.sta -= 22; act({ k: 'boost', to: id }); } });
  }
  return best;
}
function updateInteract(dt) {
  if (phase !== 'play' || ui.paused || invOpen) { $('prompt').style.display = 'none'; return; }
  const it = findInteract(); curI = it;
  if (!it) { $('prompt').style.display = 'none'; holdT = 0; return; }
  $('prompt').style.display = 'block'; let pr = 0;
  if (it.hold && KEY.KeyE && !ME.steep && !ME.air) { holdT += dt; pr = Math.min(1, holdT / it.hold); if (it.anim) ME.anim = it.anim; if (it.sawing) { ME.sawing = true; if (ME.boost <= 0) ME.sta = Math.max(0, ME.sta - 2.5 * dt); } if (holdT >= it.hold) { holdT = 0; KEY.KeyE = false; it.go(); } }
  else holdT = 0;
  $('prompt').innerHTML = `<b>E</b> ${it.label}${it.hold ? `<span class="holdbar"><span style="width:${it.sawing ? WS.saw.p * 100 : pr * 100}%"></span></span>` : ''}`;
}
function pressE() { if (curI && !curI.hold) curI.go(); }
function useItem() {
  const t = ME.quick[ME.sel]; if (!t || ME.ko) return; const d = ITEMS[t];
  if (d.food) { ME.hun = Math.max(0, ME.hun - d.food); ME.quick[ME.sel] = null; sfx('eat'); toast(T('t_ate')); }
  else if (t === 'medkit') { if (ME.inj < 3) return hint('t_healthy'); ME.inj = Math.max(0, ME.inj - 55); ME.quick[ME.sel] = null; sfx('ok'); }
  else if (t === 'drink') { ME.boost = 16; ME.sta = maxSta(); ME.quick[ME.sel] = null; sfx('ok'); toast(T('t_boost')); }
  else if (t === 'flare') { ME.quick[ME.sel] = null; act({ k: 'flare', x: ME.x, y: ME.y, z: ME.z }); }
  else if (t === 'piton') { if (!ME.steep) return hint('h_piton'); ME.quick[ME.sel] = null; act({ k: 'piton', x: +ME.x.toFixed(2), y: +ME.y.toFixed(2), z: +ME.z.toFixed(2) }); sfx('click'); toast(T('t_piton')); }
  else if (t === 'map' || t === 'map2') { showMap(t === 'map' ? 0 : 1); return; }
  else hint('h_' + t);
  drawInv();
}
function showMap(i) {
  if (mapOpen === i) { mapOpen = -1; $('mapview').style.display = 'none'; return; } mapOpen = i;
  const c = $('mapcv'), x = c.getContext('2d'), p = L.digs[i], R = 44, N = 110, cs = c.width / N;
  for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
    const wx = p.x - 8 + (a / N - .5) * 2 * R, wz = p.z - 6 - (b / N - .5) * 2 * R, h = getH(wx, wz), s = slopeAt(wx, wz).ang;
    let col = h < 0 ? '#9fc4c9' : s > .7 ? '#a08b62' : '#e2cf9a'; for (const st of STREAMS) if (Math.abs(wz - st.z) < st.w / 2 && Math.abs(wx - pathX(wz)) < halfW(wz) + 4) col = '#9fc4c9';
    if ((Math.floor(h / 4) + a + b) % 9 === 0 && h > 0) col = '#cdb880';
    x.fillStyle = col; x.fillRect(a * cs, b * cs, cs + 1, cs + 1);
  }
  const M = (wx, wz) => [((wx - (p.x - 8)) / (2 * R) + .5) * c.width, (.5 - (wz - (p.z - 6)) / (2 * R)) * c.height];
  x.font = '26px serif'; x.textAlign = 'center';
  for (const cp of L.camps) { const [a, b] = M(cp.x, cp.z); x.fillText('🔥', a, b); }
  { const [a, b] = M(L.plane.x, L.plane.z); x.fillText('✈️', a, b); } { const [a, b] = M(L.lookout.x, L.lookout.z); x.fillText('🌳', a, b); }
  const [a, b] = M(p.x, p.z); x.strokeStyle = '#b3261e'; x.lineWidth = 6; x.beginPath(); x.moveTo(a - 12, b - 12); x.lineTo(a + 12, b + 12); x.moveTo(a + 12, b - 12); x.lineTo(a - 12, b + 12); x.stroke();
  x.fillStyle = '#5a3a1a'; x.font = 'bold 20px serif'; x.fillText('N ↑', c.width - 34, 28);
  $('mapview').style.display = 'block';
}
function onEv(e) {
  if (e.k === 'toast') toast(T(e.key, e.a), 'ev');
  else if (e.k === 'sfx') sfx(e.s);
  else if (e.k === 'got') { if (!giveItem(e.it)) act({ k: 'drop', it: e.it, x: ME.x, z: ME.z, y: ME.y + 1 }); else sfx('pick'); }
  else if (e.k === 'pull' || e.k === 'haul') { ME.x = e.x; ME.z = e.z; ME.y = getH(e.x, e.z); ME.air = false; ME.slide = false; ME.sta = Math.min(maxSta(), ME.sta + 10); toast(T('t_pulled', [e.by]), 'ev'); sfx('ok'); }
  else if (e.k === 'boost') { let gained = 0; for (let i = 0; i < 60 && gained < 4.2; i++) { const s = slopeAt(ME.x, ME.z), y0 = getH(ME.x, ME.z); if (s.ang < .5 && i > 3) break; ME.x += s.gx * .25; ME.z += s.gz * .25; gained += getH(ME.x, ME.z) - y0; } ME.y = getH(ME.x, ME.z); toast(T('t_boosted', [e.by]), 'ev'); sfx('ok'); }
  else if (e.k === 'revive') { if (ME.ko) { ME.ko = false; ME.inj = Math.min(ME.inj, 60); ME.hun = Math.min(ME.hun, 25); ME.sta = maxSta() * .5; toast(T('t_revived', [e.by]), 'ev'); sfx('ok'); } }
}

// ---------------------------------------------------------------- camera
const _v = new THREE.Vector3();
function updateCamera(dt) {
  const me = ME, ty = me.y + 1.55, cp = Math.cos(CAM.pitch), sp = Math.sin(CAM.pitch), fx = Math.sin(CAM.yaw), fz = Math.cos(CAM.yaw);
  let d = CAM.dist;
  for (let k = 1; k <= 8; k++) { const t = k / 8 * CAM.dist, x = me.x - fx * cp * t, z = me.z - fz * cp * t, y = ty + sp * t; if (y < getH(x, z) + .35) { d = Math.max(.9, (k - 1) / 8 * CAM.dist); break; } }
  CAM.cd = CAM.cd == null ? d : CAM.cd + (d - CAM.cd) * Math.min(1, dt * (d < CAM.cd ? 20 : 4));
  const x = me.x - fx * cp * CAM.cd, z = me.z - fz * cp * CAM.cd; let y = ty + sp * CAM.cd; y = Math.max(y, getH(x, z) + .4, .35);
  camera.position.set(x, y, z); camera.lookAt(me.x + fx * 1.2, ty + .15, me.z + fz * 1.2);
}
function menuCamera(t) { const a = t * .06, r = 26; camera.position.set(L.plane.x + Math.sin(a) * r, 7 + Math.sin(t * .1) * 2, L.plane.z + Math.cos(a) * r - 4); camera.lookAt(L.plane.x, 3.5, L.plane.z + 8); }

// ---------------------------------------------------------------- HUD
function drawObjective() {
  const W = WS; if (!W) return; let k = 'o_climb';
  if (W.radio.t) k = 'o_heli'; else if (ME.z > L.radio.z - 22 && ME.y > 235) k = 'o_radio'; else if (ME.z > JUNGLE_END - 30) k = 'o_climb';
  else if (!W.bridges[0].done) k = ME.z < 40 ? 'o_wreck' : 'o_bridge1'; else if (!W.totems.open) k = 'o_gate'; else if (!W.saw.done) k = 'o_tree'; else if (!W.bridges[1].done) k = 'o_bridge2'; else k = 'o_camp';
  $('objective').textContent = T(k);
}
let hudAcc = 0, stepAcc = 0, fpsN = 0, fpsT = 0, cmpEls = null;
// compass strip: north is the mountain side of the island (+Z), east is -X
function drawCompass() {
  const el = $('compass'), w = el.clientWidth, span = Math.PI * .9, head = -CAM.yaw;
  if (!cmpEls) { cmpEls = []; ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].forEach((t, i) => { const d = document.createElement('i'); d.textContent = t; if (i % 2 === 0) d.className = 'c'; el.appendChild(d); cmpEls.push({ d, b: i * Math.PI / 4 }); }); for (let i = 0; i < 24; i++) if (i % 3) { const d = document.createElement('i'); d.textContent = '|'; d.className = 't'; el.appendChild(d); cmpEls.push({ d, b: i * Math.PI / 12 }); } el.insertAdjacentHTML('beforeend', '<i class="p" id="cmpPeak">⛰️</i>'); }
  const put = (d, b) => { let r = b - head; r = Math.atan2(Math.sin(r), Math.cos(r)); if (Math.abs(r) > span / 2 + .1) { d.style.display = 'none'; return; } d.style.display = 'block'; d.style.left = (w / 2 + r / span * w) + 'px'; };
  for (const c of cmpEls) put(c.d, c.b);
  const to = (x, z) => Math.atan2(-(x - ME.x), z - ME.z), pk = $('cmpPeak');
  if (has('compass') && dist2(ME.x, ME.z, L.radio.x, L.radio.z) > 12) put(pk, to(L.radio.x, L.radio.z)); else pk.style.display = 'none';
  const ids = new Set();
  for (const [id, o] of OTH) { ids.add('cm_' + id); let d = document.getElementById('cm_' + id); if (!d) { d = document.createElement('i'); d.className = 'm'; d.id = 'cm_' + id; d.innerHTML = `<b style="background-image:url(${ui.thumbs[o.c] || ''})"></b>`; el.appendChild(d); } put(d, to(o.x, o.z)); }
  el.querySelectorAll('i.m').forEach(d => { if (!ids.has(d.id)) d.remove(); });
}
function updateHud(dt) {
  const mx = maxSta(); $('staFill').style.width = clamp(ME.sta, 0, 100) + '%'; $('staHun').style.width = ME.hun + '%'; $('staInj').style.width = ME.inj + '%'; $('staHun').style.right = ME.inj + '%';
  $('staFill').className = ME.boost > 0 ? 'boost' : ME.sta < 18 ? 'low' : '';
  drawCompass();
  hudAcc += dt; if (hudAcc < .25) return; hudAcc = 0;
  $('alt').textContent = Math.max(0, Math.round(ME.y)) + ' m';
  const row = (n, c, sta, mxs, ko, me, extra) => `<div class="mate${ko ? ' ko' : ''}${me ? ' me' : ''}"><div class="ph" style="background-image:url(${ui.thumbs[c] || ''})"></div><div class="inf"><div class="nm"><span>${ko ? '💀 ' : ''}${esc(n)}</span><em>${extra}</em></div><div class="mbar"><div style="width:${clamp(sta || 0, 0, 100)}%"></div><i style="width:${100 - (mxs == null ? 100 : mxs)}%"></i></div></div></div>`;
  const mine = lobby.players.find(p => p.id === ME.id) || { n: SAVE.name || T('char' + SAVE.ch), c: SAVE.ch };
  let h = row(mine.n, mine.c, ME.sta, mx, ME.ko, true, Math.round(ME.sta) + '%');
  for (const o of OTH.values()) { const dd = Math.round(Math.hypot(o.x - ME.x, o.y - ME.y, o.z - ME.z)), up = o.y - ME.y; h += row(o.n, o.c, o.s, o.mx, o.k, false, dd + ' m' + (up > 3 ? ' ▲' : up < -3 ? ' ▼' : '')); }
  $('mates').innerHTML = h;
  $('koBox').style.display = ME.ko ? 'block' : 'none'; if (ME.ko) $('koBox').textContent = T('t_ko_wait') + (ME.koT > 8 || !OTH.size ? '  [R] ' + T('t_respawn') : '  ' + Math.ceil(8 - ME.koT) + ' s');
  $('board').style.display = ME.mode === 'plat' && WS && !WS.totems.open ? 'block' : 'none';
  if (ME.mode === 'plat' && WS) $('boardSyms').textContent = WS.totems.order.map(i => SYMS[WS.totems.sym[i]]).join('  →  ');
  drawObjective();
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- main loop
let lastT = 0, sendAcc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - lastT) / 1000 || .016); lastT = now; GFX.t += dt;
  if (phase === 'play') {
    updateMe(dt); updateInteract(dt);
    if (ME.g) { ME.g.position.set(ME.x, ME.y, ME.z); let d = ME.ry - ME.g.rotation.y; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283; ME.g.rotation.y += d * Math.min(1, dt * 14); animChar(ME.g, ME.anim, dt, 0, ME.moving); setHeld(ME.g, ME.anim === 'climb' || ME.anim === 'carry' || ME.anim === 'swim' ? '' : ME.quick[ME.sel]); }
    updateOthers(dt); updateDynamic(dt);
    if (!Net.isHost) { sendAcc += dt; if (sendAcc > .075) { sendAcc = 0; Net.toHost({ t: 'p', s: myState() }); } }
    updateCamera(dt); updateHud(dt);
    updateMood(ME.z, dt, ME.x, ME.y, ME.z);
    if (AC) { const jung = sstep(40, 70, ME.z) * (1 - sstep(320, 350, ME.z)); ambF.frequency.value = lerp(lerp(520, 900, sstep(300, 500, ME.z)), 300, jung); ambG.gain.value = lerp(.06, .025, jung) + sstep(380, 520, ME.z) * .05; if (jung > .5 && Math.random() < dt * .5) sfx('bird'); if ((ME.anim === 'walk' || ME.anim === 'run' || ME.anim === 'climb' && ME.moving)) { stepAcc += dt * (ME.anim === 'run' ? 1.6 : 1); if (stepAcc > .38) { stepAcc = 0; sfx('step'); } } }
    updateAnimals(dt, [ME, ...OTH.values()]);
  } else {
    menuCamera(GFX.t); updateMood(-20, dt, L.plane.x, L.plane.y, L.plane.z); updateAnimals(dt, []);
  }
  cullChunks();
  renderer.render(scene, camera);
  if (SET.fps) { fpsN++; fpsT += dt; if (fpsT > .5) { $('fps').textContent = Math.round(fpsN / fpsT) + ' FPS'; fpsN = 0; fpsT = 0; } }
}
function onStart(m) {
  myIdx = m.idx; ME.id = Net.id; OTH.forEach(o => scene.remove(o.g)); OTH.clear();
  Object.assign(ME, { sta: 100, inj: 0, hun: 0, ko: false, air: false, slide: false, mode: '', quick: [null, null, null], pack: [null, null, null, null, null, null], sel: 0, boost: 0, falls: 0 });
  if (ME.g) scene.remove(ME.g); ME.g = makeChar(SAVE.ch); scene.add(ME.g);
  const sp = m.late ? L.camps[m.W.cp] : L.spawn; ME.x = sp.x + (m.idx % 3) * 1.6 - 1.6; ME.z = sp.z - 2 - Math.floor(m.idx / 3) * 1.6; ME.y = getH(ME.x, ME.z); ME.ry = 0; CAM.yaw = 0; CAM.pitch = .25;
  phase = 'play'; ui.show('hud'); onWorld(m.W); drawInv(); toast(T('t_start'), 'ev'); audioInit(); setTimeout(lockPointer, 50);
}
function showWin() {
  phase = 'won'; document.exitPointerLock(); const W = WS, t = Math.round(W.time);
  $('winStats').innerHTML = `${T('w_time')}: <b>${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</b><br>${T('w_falls')}: <b>${W.falls}</b><br>${T('w_team')}: <b>${lobby.players.map(p => esc(p.n)).join(', ')}</b>`;
  ui.show('win'); sfx('win');
}

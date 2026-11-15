// Survivors - host-side authority over the shared world.
'use strict';
const Host = { W: null, roster: new Map(), S: new Map(), started: false, dirty: false, acc: 0, accP: 0 };
function hostLobby() { const l = { t: 'lobby', players: [...Host.roster].map(([id, p]) => ({ id, n: p.n, c: p.c })), started: Host.started, code: Net.code }; Net.all(l); onLobby(l); }
function hostEv(to, ev) { ev.t = 'ev'; if (to === '*') { Net.all(ev); onEv(ev); } else if (to === Net.id) onEv(ev); else Net.send(to, ev); }
function hostToast(key, a) { hostEv('*', { k: 'toast', key, a }); }
let hostWorker = null, hostLast = 0;
function hostLoop() {            // ticks from a worker so the world keeps running when the host's tab is in the background
  if (hostWorker) return; hostLast = performance.now();
  try { hostWorker = new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),50)']))); hostWorker.onmessage = hostPulse; } catch (e) { hostWorker = setInterval(hostPulse, 50); }
}
function hostPulse() { const n = performance.now(), dt = Math.min(.25, (n - hostLast) / 1000); hostLast = n; if (Net.isHost && Host.started) hostTick(dt); }
// what other players get to see: no puzzle answers and no suitcase contents (they're revealed only when earned)
function pubW(W) { return Object.assign({}, W, { totems: Object.assign({}, W.totems, { order: null }), levers: Object.assign({}, W.levers, { target: null }), bags: (W.bags || []).map(() => ({})) }); }
function hostBegin() {
  hostLoop();
  genWorld(((Math.random() * 2147483000) | 0) + 2);            // a brand new island every game
  Host.W = newWorld(Host.roster.size); Host.started = true; Host.dirty = false; skelHostInit();
  const m = { t: 'start', W: Host.W, idx: 0 }; let i = 0;
  for (const id of Host.roster.keys()) { m.idx = i++; if (id === Net.id) onStart(JSON.parse(JSON.stringify(m))); else Net.send(id, { t: 'start', W: pubW(Host.W), idx: m.idx }); }
  hostLobby();
}
function hostMsg(from, m) {
  if (m.t === 'hi') {
    if (Host.roster.size >= 6 && !Host.roster.has(from)) { Net.send(from, { t: 'full' }); return; }
    Host.roster.set(from, { n: String(m.n || 'Player').slice(0, 14), c: clamp(m.c | 0, 0, 5) });
    Net.send(from, { t: 'wel', id: from });
    if (Host.started) { Host.W.n = Host.roster.size; Net.send(from, { t: 'start', W: pubW(Host.W), idx: Host.roster.size - 1, late: 1 }); hostToast('t_joined', [Host.roster.get(from).n]); }
    hostLobby();
  } else if (m.t === 'c') { const p = Host.roster.get(from); if (p) { p.c = clamp(m.c | 0, 0, 5); if (m.n) p.n = String(m.n).slice(0, 14); hostLobby(); } }
  else if (m.t === 'p') { if (Host.roster.has(from)) { m.s.i = from; Host.S.set(from, m.s); } }
  else if (m.t === 'a') hostAct(from, m);
}
function hostLeave(id) { const p = Host.roster.get(id); Host.roster.delete(id); Host.S.delete(id); if (Host.W) { for (const g of Host.W.logs) g.car = g.car.filter(c => c !== id); Host.dirty = true; if (p) hostToast('t_left', [p.n]); } hostLobby(); }
function restPos(x, z) {                        // where a dropped thing comes to rest (slides down steep ground)
  for (let i = 0; i < 260; i++) { const s = slopeAt(x, z); if (s.ang < .62) break; x -= s.gx * .6; z -= s.gz * .6; }
  return { x, z, y: getH(x, z) };
}
function spawnItem(t, x, z, fromY) { const W = Host.W, p = restPos(x, z); let id = 1; for (const it of W.items) id = Math.max(id, it.id + 1); W.items.push({ id, t, x: p.x, z: p.z, y: p.y, fy: fromY }); Host.dirty = true; }
function hostAct(pid, a) {
  const W = Host.W; if (!W) return; const st = Host.S.get(pid) || {};
  switch (a.k) {
    case 'pick': { const i = W.items.findIndex(it => it.id === a.id); if (i < 0) return; const it = W.items[i]; W.items.splice(i, 1); hostEv(pid, { k: 'got', it: it.t }); break; }
    case 'drop': spawnItem(a.it, a.x, a.z, a.y); break;
    case 'log': {
      const g = W.logs.find(l => l.id === a.id); if (!g || g.br >= 0) return;
      if (g.car.includes(pid)) g.car = g.car.filter(c => c !== pid);
      else if (g.car.length < 4) { for (const o of W.logs) o.car = o.car.filter(c => c !== pid); g.car.push(pid); }
      if (!g.car.length) settleLog(g);
      break;
    }
    case 'totem': {
      const T = W.totems; if (T.open || T.hit.includes(a.i)) return;
      if (T.order[T.hit.length] === a.i) { T.hit.push(a.i); hostEv('*', { k: 'sfx', s: 'ok' }); if (T.hit.length === 4) { T.open = true; hostToast('t_gate'); hostEv('*', { k: 'sfx', s: 'win' }); } }
      else { T.hit = []; T.bad = W.time; hostEv('*', { k: 'sfx', s: 'bad' }); hostToast('t_totem_bad'); }
      break;
    }
    case 'lever': { const V = W.levers; if (V.open) return; V.st[a.i] ^= 1; hostEv('*', { k: 'sfx', s: 'click' }); if (V.st.every((v, i) => v === V.target[i])) { V.open = true; hostToast('t_levers'); hostEv('*', { k: 'sfx', s: 'win' }); } break; }
    case 'chest': {
      const loot = a.id.startsWith('bag') ? (W.bags[+a.id.slice(3)] || {}).loot : CHEST_LOOT[a.id];
      if (W.chests[a.id] || !loot) return;
      if (a.id === 'vault' && !W.plates.open || a.id === 'lever' && !W.levers.open) return;
      W.chests[a.id] = 1; const p = chestPos(a.id);
      loot.forEach((t, i) => { const an = i * 1.9 + 1, rr = a.id.startsWith('bag') ? 1.1 : 1.5; spawnItem(t, p.x + Math.sin(an) * rr, p.z + Math.cos(an) * rr, p.y + 1); });
      if (a.id.startsWith('bag')) hostToast('t_bag', [name(pid)]);
      hostEv('*', { k: 'sfx', s: 'chest' }); break;
    }
    case 'rope': if (W.ropes[a.s]) { hostEv(pid, { k: 'got', it: 'rope' }); return; } W.ropes[a.s] = 1; hostToast('t_rope_set', [name(pid)]); break;
    case 'unrope': if (!W.ropes[a.s]) return; W.ropes[a.s] = 0; hostEv(pid, { k: 'got', it: 'rope' }); break;
    case 'lash': { const b = W.bridges[a.b]; if (b.rope || b.done) { hostEv(pid, { k: 'got', it: 'rope' }); return; } b.rope = true; checkBridge(a.b); break; }
    case 'piton': if (W.pitons.length < 60) W.pitons.push({ x: a.x, y: a.y, z: a.z }); break;
    case 'hit': case 'struggle': if (!skelHostAct(pid, a, st)) return; break;
    case 'flare': skelFlare(a.x, a.z); W.flares.push({ x: a.x, y: a.y, z: a.z, t: W.time }); if (W.flares.length > 6) W.flares.shift(); break;
    case 'dig': if (W.digs[a.i]) return; W.digs[a.i] = 1; hostToast('t_dug', [name(pid)]); hostEv('*', { k: 'sfx', s: 'chest' }); break;
    case 'radio': if (W.radio.t) return; W.radio.t = W.time; hostToast('t_radio'); hostEv('*', { k: 'sfx', s: 'win' }); break;
    case 'peek': {                               // reveal a puzzle answer only to a player standing where the clue is
      if (a.w === 'tot' && st.y > L.lookout.y + 11 && dist2(st.x, st.z, L.lookout.x, L.lookout.z) < 4) hostEv(pid, { k: 'reveal', w: 'tot', v: W.totems.order });
      if (a.w === 'lev' && dist2(st.x, st.z, L.tablet.x, L.tablet.z) < 4.5) hostEv(pid, { k: 'reveal', w: 'lev', v: W.levers.target });
      return;
    }
    case 'pull': case 'boost': case 'revive': case 'haul': hostEv(a.to, { k: a.k, x: a.x, y: a.y, z: a.z, by: name(pid) }); return;
    case 'fall': W.falls++; return;
    default: return;
  }
  Host.dirty = true;
}
function name(pid) { const p = Host.roster.get(pid); return p ? p.n : '?'; }
function chestPos(id) {
  if (id.startsWith('crate')) return L.crates[+id.slice(5)]; if (id === 'vault') return L.vault; if (id === 'lever') return L.leverChest;
  if (id.startsWith('pit')) return L.pitChests[+id.slice(3)]; if (id.startsWith('dig')) return L.digs[+id.slice(3)]; if (id.startsWith('bag')) return L.bags[+id.slice(3)]; return L.spawn;
}
function checkBridge(i) { const W = Host.W, b = W.bridges[i], s = STREAMS[i]; if (!b.done && b.logs >= s.logs && (!s.rope || b.rope)) { b.done = true; hostToast('t_bridge'); hostEv('*', { k: 'sfx', s: 'win' }); } else if (b.logs >= s.logs && s.rope && !b.rope) hostToast('t_need_rope'); }
function settleLog(g) {
  const W = Host.W;
  for (let i = 0; i < L.bridges.length; i++) {
    const b = L.bridges[i], bs = W.bridges[i];
    if (!bs.done && bs.logs < STREAMS[i].logs && dist2(g.x, g.z, b.x, b.z - b.w / 2 - 2) < 7.5) { g.br = i; g.slot = bs.logs++; g.car = []; hostEv('*', { k: 'sfx', s: 'thud' }); checkBridge(i); return; }
  }
  const p = restPos(g.x, g.z); g.x = p.x; g.z = p.z;
}
function hostTick(dt) {
  const W = Host.W; if (!W || !Host.started) return;
  W.time += dt;
  Host.S.set(Net.id, myState());
  const P = [...Host.S.values()].filter(s => Host.roster.has(s.i));
  // pressure plates
  if (!W.plates.open) {
    let all = true;
    for (let i = 0; i < W.plates.n; i++) { const pl = L.plates[i], on = P.some(s => !s.k && dist2(s.x, s.z, pl.x, pl.z) < 1.25) ? 1 : 0; if (on !== W.plates.on[i]) { W.plates.on[i] = on; Host.dirty = true; hostEv('*', { k: 'sfx', s: 'click' }); } if (!on) all = false; }
    if (all) { W.plates.open = true; Host.dirty = true; hostToast('t_vault'); hostEv('*', { k: 'sfx', s: 'win' }); }
  }
  // carried logs
  for (const g of W.logs) {
    if (!g.car.length) continue;
    const before = g.car.length;
    g.car = g.car.filter(c => { const s = Host.S.get(c); return s && !s.k && dist2(s.x, s.z, g.x, g.z) < g.len / 2 + 3; });
    if (g.car.length !== before) { Host.dirty = true; if (!g.car.length) { settleLog(g); continue; } }
    if (g.car.length >= g.need) {
      let cx = 0, cz = 0; const cs = g.car.map(c => Host.S.get(c)); cs.forEach(s => { cx += s.x; cz += s.z; }); cx /= cs.length; cz /= cs.length;
      if (Math.abs(cx - g.x) + Math.abs(cz - g.z) > .02) { g.x = cx; g.z = cz; if (cs.length > 1) g.ry = Math.atan2(cs[1].z - cs[0].z, -(cs[1].x - cs[0].x)); else g.ry = -cs[0].r; Host.dirty = true; }
    }
  }
  skelHostTick(dt, P);
  // sawing the fallen tree
  if (!W.saw.done) {
    const sw = P.filter(s => (s.f & 1) && dist2(s.x, s.z, L.tree.x, L.tree.z) < 9);
    if (sw.length && sw.some(s => s.f & 2)) { W.saw.p += dt * (sw.length >= 2 ? 1 / 7 : W.n <= 1 ? 1 / 10 : 1 / 45); Host.dirty = true; if (W.saw.p >= 1) { W.saw.done = true; hostToast('t_sawn'); hostEv('*', { k: 'sfx', s: 'win' }); } }
  }
  // checkpoints
  for (let i = W.cp + 1; i < L.camps.length; i++) if (P.some(s => dist2(s.x, s.z, L.camps[i].x, L.camps[i].z) < 7 && Math.abs(s.y - L.camps[i].y) < 5)) { W.cp = i; Host.dirty = true; hostToast('t_checkpoint'); hostEv('*', { k: 'sfx', s: 'ok' }); }
  if (W.radio.t && !W.radio.heli && W.time - W.radio.t > 26) { W.radio.heli = 1; Host.dirty = true; }
  if (W.radio.t && !W.won && W.time - W.radio.t > 36) { W.won = 1; Host.dirty = true; }
  if (W.flares.length && W.time - W.flares[0].t > 45) { W.flares.shift(); Host.dirty = true; }
  Host.acc += dt; Host.accP += dt;
  if (Host.accP > .075) { Host.accP = 0; const m = { t: 'ps', l: P, tm: W.time, sk: skelStates() }; Net.all(m); onStates(m); }
  if (Host.dirty && Host.acc > .09) { Host.acc = 0; Host.dirty = false; W.rev++; Net.all({ t: 'W', W: pubW(W) }); onWorld(W); }
}

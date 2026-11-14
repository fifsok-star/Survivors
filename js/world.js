// Survivors - world definition: terrain maths, static layout, shared helpers.
'use strict';
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash2(ix, iz, s) { let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(s, 982451653); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
function vnoise(x, z, s) { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz); return lerp(lerp(hash2(ix, iz, s), hash2(ix + 1, iz, s), u), lerp(hash2(ix, iz + 1, s), hash2(ix + 1, iz + 1, s), u), v); }
function fbm(x, z, s) { return vnoise(x, z, s) * .55 + vnoise(x * 2.1, z * 2.1, s + 7) * .3 + vnoise(x * 4.3, z * 4.3, s + 13) * .15; }

const WB = { x0: -150, x1: 150, z0: -100, z1: 820, c: 2 };
const JUNGLE_END = 335;
// everything below is regenerated from a seed by genWorld(): every game gets a new jungle, new tasks order and a new mountain
let SEED = -1, NS = 0, PA = [26, 52, 10, 21, 1.3, 0], HWP = 0, STREAMS = [], GATE_Z = 132, TREE_Z = 196, Z_MAX = 545, WALLS = [], WX = [], PITS = [], OBST = [], L = null;

function pathX(z) { const a = sstep(45, 80, z) * (1 - sstep(300, 335, z)); return a * (PA[0] * Math.sin(z / PA[1] + PA[5]) + PA[2] * Math.sin(z / PA[3] + PA[4])); }
function halfW(z) {
  let w = 20 + 5 * Math.sin(z / 29 + HWP);
  for (const zb of [GATE_Z, TREE_Z]) w = lerp(5, w, sstep(3, 16, Math.abs(z - zb)));
  if (z > JUNGLE_END - 20) w = lerp(w, 26, sstep(JUNGLE_END - 20, JUNGLE_END + 10, z));
  if (z > JUNGLE_END) w = lerp(w, 44 + 7 * Math.sin(z / 41 + HWP), sstep(JUNGLE_END, JUNGLE_END + 30, z));   // the mountain is wide: plateaus, not a corridor
  return lerp(92, w, sstep(38, 64, z));
}
// ---- mountain walls. Each wall: [start z, run, rise] in WALLS and its shape in WX:
// a wavy, ribbed face; rock shelves part-way up (rest + traverse); on some walls a long scree ramp up to the first shelf.
function bandOf(b, x) { return sstep(b.x0 - 3, b.x0, x) * (1 - sstep(b.x1, b.x1 + 3, x)); }
function wallOff(i, x) { const W = WX[i]; return W.a1 * Math.sin(x / W.f1 + W.p1) + 1.1 * Math.sin(x / 2.7 + W.p2) + .6 * Math.sin(x / 1.3 + W.p1 * 2); }
function wallFrac(i, x, u) {                    // 0..1 of the wall's rise at distance u past its foot
  const W = WX[i], run = WALLS[i][1], rb = W.ramp ? bandOf(W.ramp, x) : 0; let prev = 0;
  for (let k = 0; k <= W.sh.length; k++) {
    const sh = W.sh[k], t = sh ? sh.t : 1; let seg = (t - prev) * run;
    if (k === 0 && rb) seg = lerp(seg, W.ramp.len, rb);
    if (u < seg) return prev + (t - prev) * sstep(0, seg, u);
    u -= seg; prev = t; if (!sh) return 1;
    const d = sh.d * bandOf(sh, x); if (u < d) return t; u -= d;
  }
  return 1;
}
function wallLen(i, x) {                        // horizontal length of the wall incl. shelves and ramp at x
  const W = WX[i], run = WALLS[i][1], rb = W.ramp ? bandOf(W.ramp, x) : 0; let L0 = 0, prev = 0;
  for (let k = 0; k <= W.sh.length; k++) { const sh = W.sh[k], t = sh ? sh.t : 1; let seg = (t - prev) * run; if (k === 0 && rb) seg = lerp(seg, W.ramp.len, rb); L0 += seg; prev = t; if (sh) L0 += sh.d * bandOf(sh, x); }
  return L0;
}
function wallH(z, x) {
  let h = 0; if (!WALLS.length || z < WALLS[0][0] - 9) return 0;
  for (let i = 0; i < WALLS.length; i++) {
    const z0 = WALLS[i][0] + wallOff(i, x); if (z < z0) break;
    h += WALLS[i][2] * wallFrac(i, x, z - z0);
  }
  return h;
}
function wallEnd(i, x) { return WALLS[i][0] + wallOff(i, x) + wallLen(i, x); }
function rawH(x, z) {
  const px = pathX(z), d = Math.abs(x - px), hw = halfW(z);
  let h = -5 + 7.5 * sstep(-78, -22, z);
  if (z > 40) h += (Math.min(z, JUNGLE_END) - 40) * .042;
  const mt = sstep(JUNGLE_END, JUNGLE_END + 14, z), top = sstep(WALLS[3][0] + 10, WALLS[6][0], z);
  h += wallH(z, x);
  const jn = sstep(40, 60, z) * (1 - mt);
  if (jn > 0 && d > 2) h += (fbm(x / 17, z / 17, 3 + NS) - .5) * 3.4 * jn * sstep(2, 9, d);
  h += (fbm(x / 6, z / 6, 9 + NS) - .5) * .5;
  if (mt > 0) h += ((fbm(x / 7, z / 7, 21 + NS) - .5) * 1.3 + (fbm(x / 24, z / 24, 33 + NS) - .5) * 4.5) * mt;   // rolling plateaus
  // ridges around the valley / couloir
  if (d > hw && z > 42) {
    if (top < 1) h += sstep(hw, hw + 13, d) * (sstep(42, 70, z) * (38 + 10 * fbm(x / 30, z / 30, 5 + NS)) + mt * 12) * (1 - top);
    h -= sstep(hw, hw + 34, d) * 130 * top;
  }                              // near the top the mountain becomes a real peak
  for (const s of STREAMS) h -= 3.4 * (1 - sstep(s.w / 2 - 1.6, s.w / 2 + 1.4, Math.abs(z - s.z))) * (1 - sstep(hw + 2, hw + 9, d));
  for (const p of PITS) h -= p.d * (1 - sstep(p.r, p.r + 2.4, dist2(x, z, p.x, p.z)));
  if (z < 64) h = lerp(h, -6, sstep(62, 104, Math.abs(x)) * (1 - sstep(40, 64, z)));
  h = lerp(h, -7, sstep(122, 147, Math.abs(x)));
  h -= 320 * sstep(Z_MAX + 4, Z_MAX + 70, z);
  return Math.max(h, -8);
}
const GW = Math.round((WB.x1 - WB.x0) / WB.c) + 1, GH = Math.round((WB.z1 - WB.z0) / WB.c) + 1;
const HG = new Float32Array(GW * GH);
function getH(x, z) {
  let fx = (x - WB.x0) / WB.c, fz = (z - WB.z0) / WB.c;
  fx = clamp(fx, 0, GW - 1.001); fz = clamp(fz, 0, GH - 1.001);
  const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, k = j * GW + i;
  return lerp(lerp(HG[k], HG[k + 1], u), lerp(HG[k + GW], HG[k + GW + 1], u), v);
}
const _sl = { ang: 0, gx: 0, gz: 0 };
function slopeAt(x, z) {                        // angle (rad) + unit uphill direction
  const e = 1.0, dx = (getH(x + e, z) - getH(x - e, z)) / (2 * e), dz = (getH(x, z + e) - getH(x, z - e)) / (2 * e), m = Math.hypot(dx, dz);
  _sl.ang = Math.atan(m); _sl.gx = m > 1e-5 ? dx / m : 0; _sl.gz = m > 1e-5 ? dz / m : 1; return _sl;
}
function streamLevel(i) { const s = STREAMS[i]; return getH(pathX(s.z), s.z - s.w / 2 - 3) - 1.0; }
function ledgeZ(i, x) { return wallEnd(i, x || 0) + 4; }                  // a safe spot on the plateau above wall i

const SYMS = ['▲', '●', '■', '✚', '★', '◆'];
function genWorld(seed) {                    // tries nearby variants until the island passes the sanity checks (same result on every client)
  seed = (seed >>> 0) || 1;
  for (let k = 0; k < 40; k++) { genTry(seed, k); if (worldOK()) break; }
  SEED = seed;
}
function genTry(seed, k) {
  const r = rng(seed * 7919 + 13 + k * 104729), sg = () => r() < .5 ? -1 : 1;
  NS = ((seed + k * 131) % 997) * 31;
  PA = [18 + r() * 12, 44 + r() * 20, 6 + r() * 7, 17 + r() * 9, r() * 6.28, r() * 6.28]; HWP = r() * 6.28;
  // jungle: four obstacles in a random order
  const slots = [82, 132, 196, 252].map(z => z + (r() * 2 - 1) * 3), kinds = ['s0', 'gate', 'tree', 's1'];
  for (let i = 3; i > 0; i--) { const j = (r() * (i + 1)) | 0, t = kinds[i]; kinds[i] = kinds[j]; kinds[j] = t; }
  OBST = kinds.map((k, i) => ({ k, z: slots[i] }));
  const zOf = k => OBST.find(o => o.k === k).z;
  STREAMS = [{ z: zOf('s0'), w: 9, logs: 2, rope: false }, { z: zOf('s1'), w: 11, logs: 3, rope: true }]; GATE_Z = zOf('gate'); TREE_Z = zOf('tree');
  // mountain: seven walls of random height, shelves and ramps, separated by wide rolling plateaus
  const base = [10, 20, 28, 34, 40, 46, 50]; let z = 350 + r() * 5; WALLS = []; WX = [];
  for (let i = 0; i < 7; i++) {
    const rise = base[i] * (.8 + r() * .42), run = Math.max(5, rise / Math.min(4.3, 2 + i * .33 + r() * .45));
    const W = { a1: 2.5 + r() * 4, f1: 7 + r() * 8, p1: r() * 6.28, p2: r() * 6.28, sh: [], ramp: null };
    const nsh = i === 0 ? 0 : rise > 30 && r() < .6 ? 2 : 1;
    for (let k = 0; k < nsh; k++) {
      const t = nsh === 1 ? .38 + r() * .3 : k ? .62 + r() * .14 : .3 + r() * .14, w = 14 + r() * 26, c = (r() * 2 - 1) * 26;
      W.sh.push({ t, d: 2.6 + r() * 2.2, x0: c - w / 2, x1: c + w / 2 });
    }
    if (nsh && i <= 5 && r() < .55) {                              // scree ramp to the first shelf: walkable, longer, costs stamina
      const s0 = W.sh[0], rw = 6 + r() * 4, rx = r() < .5 ? s0.x0 + 1 : s0.x1 - 1 - rw;
      s0.t = Math.max(.22, Math.min(s0.t, 26 * .45 / rise));
      W.ramp = { x0: rx, x1: rx + rw, len: rise * s0.t / .45 };
    }
    WALLS.push([z, run, rise]); WX.push(W);
    const longest = run + W.sh.reduce((a, b) => a + b.d, 0) + (W.ramp ? W.ramp.len : 0) + 7;
    z += Math.max(longest + 10, run + 20 + r() * 12);
  }
  Z_MAX = Math.max(...[-30, -15, 0, 15, 30].map(x => wallEnd(6, x))) + 34;
  const pitLedge = 1 + ((r() * 2) | 0), leverLedge = pitLedge + 1, campLedge = leverLedge === 3 ? 4 : 3;
  const pitSide = sg(), pz = OBST[2].z + 16, pEnd = wallEnd(pitLedge, -14);
  PITS = [{ x: pathX(pz) + 10 * pitSide, z: pz, r: 3.6, d: 8 }, { x: -14, z: (pEnd + WALLS[pitLedge + 1][0] + wallOff(pitLedge + 1, -14)) / 2, r: 3.6, d: 8 }];
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) HG[j * GW + i] = rawH(WB.x0 + i * WB.c, WB.z0 + j * WB.c);
  // ---- static layout
  const P = (x, z) => ({ x, z, y: getH(x, z) }), o = {};
  o.spawn = P(6, -6); o.plane = P(0, 2); o.tail = P(-24, -16); o.wing = P(19, 14);
  const c1 = Math.max(OBST[0].z + 9, OBST[1].z - 40), lookSide = -pitSide;
  o.camps = [P(8, 10), P(pathX(c1) - 6, c1), P(pathX(300), 300), P(6, 342), P(8, ledgeZ(campLedge, 8) + 3), P(-8, ledgeZ(5, -8) + 2), P(-9, Z_MAX - 23)];
  o.lookout = P(pathX(GATE_Z - 34) + 11 * lookSide, GATE_Z - 34);
  o.gate = P(pathX(GATE_Z), GATE_Z);
  o.totems = [[-11, -11], [11, -15], [-8, -22], [13, -25]].map(([dx, dz]) => P(pathX(GATE_Z + dz) + dx, GATE_Z + dz));
  o.plates = [[13 * pitSide, -28], [-12 * pitSide, -33], [0, -18]].map(([dx, dz]) => P(pathX(TREE_Z + dz) + dx, TREE_Z + dz));
  o.vault = P(pathX(TREE_Z - 24) + 2, TREE_Z - 24);
  o.tree = P(pathX(TREE_Z), TREE_Z);
  o.bridges = STREAMS.map((s, i) => { const x = pathX(s.z); return { x, z: s.z, w: s.w, y: getH(x, s.z - s.w / 2 - 2.5) + .15, level: streamLevel(i) }; });
  const s0 = STREAMS[0].z, s1 = STREAMS[1].z;
  o.logs = [[-9, s0 - 16, 8, 2], [10, s0 - 12, 8, 2], [-12, s1 - 16, 9, 2], [9, s1 - 20, 9, 2], [2, s1 - 26, 10, 3]].map(([dx, z, len, need]) => ({ ...P(pathX(z) + dx, z), len, need }));
  o.pits = PITS.map(p => ({ x: p.x, z: p.z, r: p.r, y: getH(p.x, p.z), top: getH(p.x + (p.x > pathX(p.z) ? -1 : 1) * (p.r + 4), p.z) }));
  o.stakes = [];                              // rope anchors: 0,1 pits; 2.. tops of walls 2..6
  o.pits.forEach((p, i) => { const side = i === 0 && p.x > pathX(p.z) ? -1 : 1; o.stakes.push({ ...P(p.x + side * (p.r + 3.4), p.z), pit: i }); });
  const offRamp = (wi, x) => { const rp = WX[wi].ramp; return !rp || x < rp.x0 - 6 || x > rp.x1 + 6; };
  for (let wi = 2; wi <= 6; wi++) { let x = 0; for (let q = 0; q < 30; q++) { x = (wi === pitLedge || wi === 5 ? 1 : wi === leverLedge || wi === campLedge ? -1 : sg()) * (3 + r() * (wi === 5 ? 4 : 11)); if (offRamp(wi, x)) break; } const z = wallEnd(wi, x) + 6.5; o.stakes.push({ ...P(x, z), wall: wi, baseZ: WALLS[wi][0] + wallOff(wi, x) - 4 }); }
  o.levers = [-6, -2, 2, 6].map(dx => P(dx + 8, Math.max(...[2, 6, 10, 14].map(x => ledgeZ(leverLedge, x))) + 6));
  o.leverChest = P(8, o.levers[0].z + 3.5);
  o.tablet = P(o.pits[1].x - 1.5, o.pits[1].z + 1.5);
  o.pitChests = [P(o.pits[0].x + 1, o.pits[0].z - 1), P(o.pits[1].x + 1.2, o.pits[1].z - 1)];
  o.digs = [P(pathX(50) - 15 * lookSide, 50), P(16, ledgeZ(5, 16) + 4)];
  o.radio = P(4, Z_MAX - 13); o.heli = P(-10, Z_MAX - 11);
  const ca = OBST[1].z + 12, cb = OBST[3].z + 14;
  o.crates = [P(-18 * sg(), 20), P(pathX(ca) + 9 * sg(), ca), P(pathX(cb) + 9 * sg(), cb), (x => P(x, ledgeZ(0, x) + 2))(-16 * sg()), P(-14, ledgeZ(4, -14) + 2)];
  L = o;
}
function worldOK() {
  const pts = [], flat = (p, m) => slopeAt(p.x, p.z).ang <= m && p.y > .3; let ok = true;
  const add = (p, m, inside) => { pts.push(p); if (!flat(p, m) || (inside && p.z > 64 && Math.abs(p.x - pathX(p.z)) > halfW(p.z) + 1)) ok = false; };
  L.camps.forEach(p => add(p, .55, true)); add(L.lookout, .6, true); L.totems.forEach(p => add(p, .6, true)); L.plates.forEach(p => add(p, .6, true)); add(L.vault, .6, true);
  L.logs.forEach(p => add(p, .7, true)); L.stakes.forEach(p => add(p, .7, true)); L.levers.forEach(p => add(p, .6, true)); add(L.leverChest, .6, true); L.digs.forEach(p => add(p, .6, true));
  add(L.radio, .6, true); add(L.heli, .6, true); L.crates.forEach(p => add(p, .7, true));
  if (!ok) return false;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (dist2(pts[i].x, pts[i].z, pts[j].x, pts[j].z) < 2.6 && !(L.levers.includes(pts[i]) && L.levers.includes(pts[j]))) return false;
  for (const p of L.pits) { if (p.top - p.y < 6) return false; for (const q of pts) if (!L.stakes.includes(q) && dist2(q.x, q.z, p.x, p.z) < p.r + 3.2) return false; }
  for (let z = 46; z < JUNGLE_END; z += 1) {
    const x = pathX(z); let skip = false; for (const s of STREAMS) if (Math.abs(z - s.z) < s.w / 2 + 2.5) skip = true;
    for (const p of PITS) if (dist2(x, z, p.x, p.z) < p.r + 2.8) return false;
    if (!skip && slopeAt(x, z).ang > .68) return false;
  }
  for (let i = 0; i < 7; i++) for (const x of [-20, 0, 20]) { let f = 0; const z0 = wallEnd(i, x), z1 = i < 6 ? WALLS[i + 1][0] + wallOff(i + 1, x) : Z_MAX; for (let z = z0; z < z1; z += .5) if (slopeAt(x, z).ang < .6) f += .5; if (f < 8) return false; }
  if (Z_MAX > WB.z1 - 75) return false;
  return true;
}
genWorld(1);
function ropeBottom(st) { return st.wall != null ? { x: st.x, z: st.baseZ, y: getH(st.x, st.baseZ) } : null; }

// items: type -> { icon, kind }
const ITEMS = {
  rope: { ic: '🪢' }, saw: { ic: '🪚' }, shovel: { ic: '⛏️' }, map: { ic: '🗺️' }, map2: { ic: '🗺️', model: 'map' }, piton: { ic: '📌' }, medkit: { ic: '🩹' },
  coconut: { ic: '🥥', food: 15 }, banana: { ic: '🍌', food: 20 }, can: { ic: '🥫', food: 38 }, drink: { ic: '🥤' }, flare: { ic: '🧨' }, compass: { ic: '🧭' }, idol: { ic: '🗿' }
};
// initial world state (host only)
function newWorld(nPlayers) {
  const r = rng((Math.random() * 1e9) | 0);
  let id = 1;
  const W = { rev: 1, seed: SEED, n: nPlayers, items: [], logs: [], pitons: [], flares: [] };
  const it = (t, x, z, y) => W.items.push({ id: id++, t, x, z, y: y == null ? getH(x, z) : y });
  it('rope', 3, 6); it('map', -2, 9); it('medkit', 5, 3); it('can', -4, 4); it('can', 9, 0); it('compass', 2, 12); it('flare', -6, 0);
  it('shovel', L.tail.x + 3, L.tail.z - 2); it('drink', L.tail.x - 2, L.tail.z + 3); it('flare', L.wing.x, L.wing.z + 3);
  for (let i = 0; i < 7; i++) it('coconut', -60 + r() * 120, -18 + r() * 40);
  for (let z = 60; z < 320; z += 17) { const s = r() < .5 ? -1 : 1; it(r() < .5 ? 'banana' : 'coconut', pathX(z) + s * (5 + r() * 10), z + r() * 8); }
  it('piton', -5, 342); it('piton', 9, 341); it('piton', -8, ledgeZ(1, -8)); it('piton', 12, ledgeZ(2, 12) - 1); it('can', 3, ledgeZ(1, 3) + 2); it('banana', -11, ledgeZ(4, -11)); it('drink', 9, ledgeZ(5, 9));
  it('piton', -3, ledgeZ(4, -3) + 1); it('piton', 6, ledgeZ(5, 6) + 1); it('medkit', -5, ledgeZ(3, -5) + 1);
  WX.forEach((w, i) => w.sh.forEach((sh, k) => { if ((i + k) % 2) return; const x = (sh.x0 + sh.x1) / 2, u = WALLS[i][1] * sh.t; let zz = WALLS[i][0] + wallOff(i, x); for (let q = 0; q < 200 && wallH(zz, x) - wallH(WALLS[i][0] - 9, x) < WALLS[i][2] * sh.t - .05; q++) zz += .25; it(['banana', 'piton', 'drink', 'can'][(i + k) % 4], x, zz + Math.min(1.2, sh.d / 3)); }));
  W.logs = L.logs.map((g, i) => ({ id: i, x: g.x, z: g.z, ry: r() * 3, len: g.len, need: Math.min(g.need, Math.max(1, nPlayers)), car: [], br: -1, slot: 0 }));
  W.bridges = STREAMS.map(() => ({ logs: 0, rope: false, done: false }));
  const ord = [0, 1, 2, 3].sort(() => r() - .5), sym = [0, 1, 2, 3, 4, 5].sort(() => r() - .5).slice(0, 4);
  W.totems = { order: ord, sym, hit: [], open: false, bad: 0 };
  W.plates = { n: clamp(nPlayers, 1, 3), on: [0, 0, 0], open: false };
  const tg = [0, 0, 0, 0].map(() => r() < .5 ? 1 : 0); if (tg.every(v => !v)) tg[1] = 1;
  W.levers = { st: [0, 0, 0, 0], target: tg, open: false };
  W.saw = { p: 0, done: false };
  W.ropes = L.stakes.map(() => 0);
  W.chests = {};          // id -> opened
  W.digs = [0, 0];
  W.radio = { t: 0, heli: 0 };
  W.cp = 0; W.won = 0; W.time = 0; W.falls = 0;
  return W;
}
const CHEST_LOOT = {
  crate0: ['banana', 'piton'], crate1: ['can', 'flare'], crate2: ['drink', 'medkit'], crate3: ['piton', 'coconut'], crate4: ['drink', 'piton'],
  vault: ['saw', 'can'], pit0: ['rope', 'piton', 'piton', 'can'], pit1: ['map2', 'piton', 'piton', 'medkit'], lever: ['rope', 'piton', 'piton', 'drink'],
  dig0: ['idol', 'drink', 'piton', 'piton'], dig1: ['idol', 'drink', 'drink', 'medkit']
};

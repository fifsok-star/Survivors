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

const WB = { x0: -150, x1: 150, z0: -100, z1: 660, c: 2 };
const STREAMS = [{ z: 82, w: 9, logs: 2, rope: false }, { z: 252, w: 11, logs: 3, rope: true }];
const GATE_Z = 132, TREE_Z = 196, Z_MAX = 545, JUNGLE_END = 335;
// mountain walls: [start z, horizontal run, rise]
const WALLS = [[352, 5, 10], [375, 7, 20], [402, 8, 28], [428, 9, 34], [452, 10, 40], [476, 11, 46], [500, 12, 50]];
const PITS = [{ x: 0, z: 215, r: 3.6, d: 8 }, { x: -14, z: 392, r: 3.6, d: 8 }];

function pathX(z) { const a = sstep(45, 80, z) * (1 - sstep(300, 335, z)); return a * (26 * Math.sin(z / 52) + 10 * Math.sin(z / 21 + 1.3)); }
function halfW(z) {
  let w = 20 + 5 * Math.sin(z / 29);
  for (const zb of [GATE_Z, TREE_Z]) w = lerp(5, w, sstep(3, 16, Math.abs(z - zb)));
  if (z > JUNGLE_END - 20) w = lerp(w, 26, sstep(JUNGLE_END - 20, JUNGLE_END + 10, z));
  return lerp(92, w, sstep(38, 64, z));
}
PITS[0].x = pathX(215) + 12;
function wallH(z, x) {
  let h = 0;
  for (let i = 0; i < WALLS.length; i++) {
    const [wz, run, rise] = WALLS[i];
    const off = 2.5 * Math.sin(x / 9 + i * 1.7);                       // walls are not perfectly straight
    if (i >= 4) {                                                      // upper walls: a resting shelf in one band
      const sx = [-12, 11, -6][i - 4], band = 1 - sstep(5, 8, Math.abs(x - sx));
      const a = sstep(wz + off, wz + off + run * .42, z), b = sstep(wz + off + run * .42 + 4.5 * band, wz + off + run + 4.5 * band, z);
      h += rise * (a * .5 + b * .5);
    } else h += rise * sstep(wz + off, wz + off + run, z);
  }
  return h;
}
function rawH(x, z) {
  const px = pathX(z), d = Math.abs(x - px), hw = halfW(z);
  let h = -5 + 7.5 * sstep(-78, -22, z);
  if (z > 40) h += (Math.min(z, JUNGLE_END) - 40) * .042;
  const mt = sstep(JUNGLE_END, JUNGLE_END + 14, z);
  h += wallH(z, x);
  // noise
  const jn = sstep(40, 60, z) * (1 - mt);
  h += (fbm(x / 17, z / 17, 3) - .5) * 3.4 * jn * sstep(2, 9, d) + (fbm(x / 6, z / 6, 9) - .5) * .5;
  h += (fbm(x / 7, z / 7, 21) - .5) * 1.3 * mt;
  // ridges around the valley / couloir
  const rH = sstep(42, 70, z) * (38 + 10 * fbm(x / 30, z / 30, 5)) * (1 - .0 * mt) * (1 - sstep(440, 505, z)) + mt * 12 * (1 - sstep(440, 505, z));
  h += sstep(hw, hw + 13, d) * rH;
  h -= sstep(hw, hw + 34, d) * 130 * sstep(440, 505, z);                // near the top the mountain becomes a real peak
  // streams
  for (const s of STREAMS) h -= 3.4 * (1 - sstep(s.w / 2 - 1.6, s.w / 2 + 1.4, Math.abs(z - s.z))) * (1 - sstep(hw + 2, hw + 9, d));
  for (const p of PITS) h -= p.d * (1 - sstep(p.r, p.r + 2.4, dist2(x, z, p.x, p.z)));
  // island edges into the sea
  if (z < 64) h = lerp(h, -6, sstep(62, 104, Math.abs(x)) * (1 - sstep(40, 64, z)));
  h = lerp(h, -7, sstep(122, 147, Math.abs(x)));
  h -= 320 * sstep(Z_MAX + 4, Z_MAX + 70, z);
  return Math.max(h, -8);
}
const GW = Math.round((WB.x1 - WB.x0) / WB.c) + 1, GH = Math.round((WB.z1 - WB.z0) / WB.c) + 1;
const HG = new Float32Array(GW * GH);
(function () { for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) HG[j * GW + i] = rawH(WB.x0 + i * WB.c, WB.z0 + j * WB.c); })();
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
function ledgeZ(i) { return WALLS[i][0] + WALLS[i][1] + 4; }               // a safe spot on the ledge above wall i

// ---------------------------------------------------------------- static layout
const SYMS = ['▲', '●', '■', '✚', '★', '◆'];
const L = (function () {
  const P = (x, z) => ({ x, z, y: getH(x, z) });
  const o = {};
  o.spawn = P(6, -6);
  o.plane = P(0, 2); o.tail = P(-24, -16); o.wing = P(19, 14);
  o.camps = [P(8, 10), P(pathX(104) - 6, 104), P(pathX(300), 300), P(6, 342), P(8, ledgeZ(3) + 3), P(-8, ledgeZ(5) + 2), P(-9, 522)];
  o.lookout = P(pathX(98) + 13, 98);
  o.gate = P(pathX(GATE_Z), GATE_Z);
  o.totems = [[-13, -11], [11, -15], [-8, -22], [14, -24]].map(([dx, dz]) => P(pathX(GATE_Z + dz) + dx, GATE_Z + dz));
  o.plates = [[-13, 168], [12, 163], [0, 178]].map(([dx, z]) => P(pathX(z) + dx, z));
  o.vault = P(pathX(172) + 2, 172);                                      // chest with the two-man saw
  o.tree = P(pathX(TREE_Z), TREE_Z);
  o.bridges = STREAMS.map((s, i) => { const x = pathX(s.z); return { x, z: s.z, w: s.w, y: getH(x, s.z - s.w / 2 - 2.5) + .15, level: streamLevel(i) }; });
  o.logs = [[-9, 66, 8, 2], [10, 70, 8, 2], [-12, 236, 9, 2], [9, 232, 9, 2], [2, 226, 10, 3]].map(([dx, z, len, need]) => ({ ...P(pathX(z) + dx, z), len, need }));
  o.pits = PITS.map(p => ({ x: p.x, z: p.z, r: p.r, y: getH(p.x, p.z), top: getH(p.x + p.r + 4, p.z) }));
  // rope anchors: 0,1 pits; 2.. tops of walls 2..6
  o.stakes = [];
  o.pits.forEach(p => o.stakes.push({ ...P(p.x + p.r + 3.4, p.z), pit: o.stakes.length }));
  [[2, 6], [3, -5], [4, 3], [5, -10], [6, 5]].forEach(([wi, x]) => { const z = WALLS[wi][0] + WALLS[wi][1] + 6.5; o.stakes.push({ ...P(x, z), wall: wi, baseZ: WALLS[wi][0] - 4 }); });
  o.levers = [-6, -2, 2, 6].map(dx => P(dx + 8, ledgeZ(2) + 6));
  o.leverChest = P(8, ledgeZ(2) + 9.5);
  o.tablet = P(o.pits[1].x - 1.5, o.pits[1].z + 1.5);
  o.pitChests = [P(o.pits[0].x + 1, o.pits[0].z - 1), P(o.pits[1].x + 1.2, o.pits[1].z - 1)];
  o.digs = [P(pathX(58) + 15, 58), P(-15, ledgeZ(3) + 5)];
  o.radio = P(4, 532);
  o.heli = P(-10, 534);
  o.crates = [P(-18, 20), P(pathX(150) - 12, 150), P(pathX(275) + 13, 275), P(-16, ledgeZ(0) + 2), P(14, ledgeZ(4) + 2)];
  return o;
})();
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
  const W = { rev: 1, n: nPlayers, items: [], logs: [], pitons: [], flares: [] };
  const it = (t, x, z, y) => W.items.push({ id: id++, t, x, z, y: y == null ? getH(x, z) : y });
  it('rope', 3, 6); it('map', -2, 9); it('medkit', 5, 3); it('can', -4, 4); it('can', 9, 0); it('compass', 2, 12); it('flare', -6, 0);
  it('shovel', L.tail.x + 3, L.tail.z - 2); it('drink', L.tail.x - 2, L.tail.z + 3); it('flare', L.wing.x, L.wing.z + 3);
  for (let i = 0; i < 7; i++) it('coconut', -60 + r() * 120, -18 + r() * 40);
  for (let z = 60; z < 320; z += 17) { const s = r() < .5 ? -1 : 1; it(r() < .5 ? 'banana' : 'coconut', pathX(z) + s * (5 + r() * 10), z + r() * 8); }
  it('piton', -5, 348); it('piton', 9, 346); it('piton', -8, ledgeZ(1)); it('piton', 12, ledgeZ(2) - 1); it('can', 3, ledgeZ(1) + 2); it('banana', -11, ledgeZ(4)); it('drink', 9, ledgeZ(5));
  it('piton', -3, ledgeZ(4) + 1); it('piton', 6, ledgeZ(5) + 1); it('medkit', -5, ledgeZ(3) + 1);
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

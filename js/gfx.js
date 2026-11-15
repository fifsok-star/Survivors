// Survivors - rendering: models, terrain, water, sky, vegetation, character rigs.
'use strict';
const GFX = { models: {}, baked: {}, col: [], colGrid: new Map(), mixers: [], animals: [], fires: [], t: 0 };
let renderer, scene, camera, sun, hemi, amb, skyMat, waterMat, streamMats = [], gradMap, terrainMesh, worldG;

function initRenderer(canvas) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xbfe3f5, .004);
  camera = new THREE.PerspectiveCamera(70, 1, .15, 1800);
  hemi = new THREE.HemisphereLight(0xcfeaff, 0x8a8f5a, .62); scene.add(hemi);
  amb = new THREE.AmbientLight(0xffffff, .18); scene.add(amb);
  sun = new THREE.DirectionalLight(0xfff2d8, 1.25); scene.add(sun); scene.add(sun.target);
  const sc = sun.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 260; sun.shadow.bias = -.0005; sun.shadow.normalBias = .06;
  gradMap = new THREE.DataTexture(new Uint8Array([105, 165, 215, 255]), 4, 1, THREE.LuminanceFormat);
  gradMap.minFilter = gradMap.magFilter = THREE.NearestFilter; gradMap.needsUpdate = true;
  worldG = new THREE.Group(); scene.add(worldG);
  resizeRenderer();
  window.addEventListener('resize', resizeRenderer);
}
function resizeRenderer() {
  const q = [.6, .8, 1, 1.25][SET.quality] || 1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * q);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight; camera.fov = SET.fov; camera.updateProjectionMatrix();
}
function applyGfxSettings() {
  renderer.shadowMap.enabled = SET.shadows > 0; sun.castShadow = SET.shadows > 0;
  const ms = SET.shadows > 1 ? 2048 : 1024;
  if (sun.shadow.mapSize.x !== ms) { sun.shadow.mapSize.set(ms, ms); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  renderer.toneMappingExposure = .55 + SET.bright / 100 * .9;
  camera.far = [500, 800, 1200, 1800][SET.dist] || 1200;
  scene.traverse(o => { if (o.material && o.material.needsUpdate !== undefined) o.material.needsUpdate = true; });
  resizeRenderer();
}

// ---------------------------------------------------------------- models
const _toon = new Map();
function toon(color, side) {
  const k = color.getHexString() + (side || 0);
  if (!_toon.has(k)) _toon.set(k, new THREE.MeshToonMaterial({ color: color.clone(), gradientMap: gradMap, side: side || THREE.FrontSide }));
  return _toon.get(k);
}
let vcMat, vcMat2;
function loadModels(url, onProgress) {
  return new Promise((res, rej) => {
    new THREE.GLTFLoader().load(url, g => {
      g.scene.children.slice().forEach(c => { GFX.models[c.name] = c; });
      vcMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradMap });
      vcMat2 = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradMap, side: THREE.DoubleSide });
      res();
    }, e => onProgress && onProgress(e.total ? e.loaded / e.total : .5), rej);
  });
}
// clone a jointed model, swapping in toon materials
function rig(name, shadow) {
  const src = GFX.models[name]; if (!src) { console.warn('no model', name); return new THREE.Group(); }
  const o = src.clone(true);
  o.position.set(0, 0, 0);
  o.traverse(m => { if (m.isMesh) { m.material = toon(m.material.color); if (shadow !== false) m.castShadow = true; } });
  const parts = {}; o.traverse(m => { parts[m.name] = m; }); o.userData.parts = parts;
  return o;
}
// merge a model into a single vertex-coloured geometry (for instancing)
function baked(name) {
  if (GFX.baked[name]) return GFX.baked[name];
  const src = GFX.models[name]; if (!src) { console.warn('no model', name); return new THREE.BoxGeometry(1, 1, 1); }
  src.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(src.matrixWorld).invert(), P = [], N = [], C = [], m4 = new THREE.Matrix4();
  src.traverse(m => {
    if (!m.isMesh) return;
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    m4.multiplyMatrices(inv, m.matrixWorld); g.applyMatrix4(m4);
    const p = g.attributes.position.array, n = g.attributes.normal.array, c = m.material.color;
    for (let i = 0; i < p.length; i += 3) { P.push(p[i], p[i + 1], p[i + 2]); N.push(n[i], n[i + 1], n[i + 2]); C.push(c.r, c.g, c.b); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.computeBoundingSphere();
  return GFX.baked[name] = g;
}
function prop(name, x, y, z, ry, s, dbl) {
  const m = new THREE.Mesh(baked(name), dbl ? vcMat2 : vcMat);
  m.position.set(x, y, z); m.rotation.y = ry || 0; if (s) m.scale.setScalar(s);
  m.castShadow = true; m.receiveShadow = true; return m;
}
// colliders: upright cylinders [x, z, radius, top y] in a spatial grid
function addCol(x, z, r, top) { const k = Math.floor(x / 8) + ',' + Math.floor(z / 8); let a = GFX.colGrid.get(k); if (!a) GFX.colGrid.set(k, a = []); a.push([x, z, r, top == null ? 1e9 : top]); }
function collide(p, rad, y) {                   // push a point out of nearby cylinders
  const cx = Math.floor(p.x / 8), cz = Math.floor(p.z / 8);
  for (let i = cx - 1; i <= cx + 1; i++) for (let j = cz - 1; j <= cz + 1; j++) {
    const a = GFX.colGrid.get(i + ',' + j); if (!a) continue;
    for (const c of a) { if (y != null && y > c[3] - .15) continue; const dx = p.x - c[0], dz = p.z - c[1], d = Math.hypot(dx, dz), m = c[2] + rad; if (d < m) { if (d < 1e-4) { p.x += m; continue; } p.x = c[0] + dx / d * m; p.z = c[1] + dz / d * m; } }
  }
}
function insideCol(x, y, z, pad) {
  const cx = Math.floor(x / 8), cz = Math.floor(z / 8);
  for (let i = cx - 1; i <= cx + 1; i++) for (let j = cz - 1; j <= cz + 1; j++) {
    const a = GFX.colGrid.get(i + ',' + j); if (!a) continue;
    for (const c of a) if (y < c[3] + pad && Math.hypot(x - c[0], z - c[1]) < c[2] + pad) return true;
  }
  return false;
}
const COLR = { mush_giant: .45, cactus: .42, pine_snow: .42, rock_red_a: 1.1, rock_red_b: 1.25, rock_basalt: 1.1, rock_ice: 1.05, palm_a: .34, palm_b: .34, jtree_a: .64, jtree_b: .6, jtree_c: .5, rock_a: 1.1, rock_b: 1.2, rock_c: 1.0, rock_moss: 1.3, bush: .8, banana_plant: .22, stump: .64, pine: .42, deadtree: .32 };
const COLH = { rock_red_a: 1.6, rock_red_b: 1.4, rock_basalt: 1.4, rock_ice: 1.4, rock_a: 1.5, rock_b: 1.3, rock_c: 2.2, rock_moss: 1.5, bush: 1.15, stump: .75 };

// ---------------------------------------------------------------- terrain
function terrainColor(x, z, h, out) {
  const s = slopeAt(x, z).ang, n = fbm(x / 9, z / 9, 40), d = Math.abs(x - pathX(z));
  let r, g, b;
  const sand = [.93, .84, .6], grass = [.32 + n * .1, .62 + n * .12, .22], dirt = [.55, .42, .27], st = .5 + .5 * Math.sin(h * .55 + n * 3), rock = [.52 + n * .08 + st * .1, .47 + n * .07 + st * .06, .44 + n * .06], snow = [.95, .97, 1], jung = [.2 + n * .08, .5 + n * .12, .2];
  let c = sand;
  const mix = (a, b2, t) => [lerp(a[0], b2[0], t), lerp(a[1], b2[1], t), lerp(a[2], b2[2], t)];
  if (h < .4) c = mix([.78, .72, .5], sand, sstep(-1.5, .4, h));
  const gz = sstep(24, 46, z + n * 12);
  c = mix(c, grass, gz * (h > 1.5 ? 1 : 0));
  c = mix(c, jung, sstep(60, 90, z) * (1 - sstep(JUNGLE_END - 10, JUNGLE_END + 20, z)));
  if (z > 44 && z < JUNGLE_END + 14) c = mix(c, dirt, (1 - sstep(1.2, 3.4, d + n * 2)) * .85);
  const mt = sstep(JUNGLE_END, JUNGLE_END + 30, z);
  c = mix(c, [.45 + n * .1, .55 + n * .1, .3], mt * .8);
  c = mix(c, rock, sstep(.52, .78, s));
  for (const st of STREAMS) c = mix(c, [.45, .4, .32], (1 - sstep(st.w / 2 - 1, st.w / 2 + 2, Math.abs(z - st.z))) * (d < halfW(z) + 6 ? 1 : 0));
  if (z > Z_MAX - 30) c = mix(c, snow, sstep(Z_MAX - 30, Z_MAX - 18, z) * (1 - sstep(.9, 1.15, s) * .7));
  if (z > BIO_Z[1] - 12) {                     // the upper biomes repaint the alpine colours
    const flat = 1 - sstep(.5, .78, s), wR = biomeW(z, B_ROOT), wM = biomeW(z, B_MESA), wS = biomeW(z, B_SNOW), wT = biomeW(z, B_STORM), wV = biomeW(z, B_VOLC);
    if (wR > 0) c = mix(c, mix([.3 + n * .08, .25 + n * .06, .18], [.16 + n * .06, .3 + n * .1, .14], flat), wR);   // dark roots: moss and wet bark
    if (wM > 0) {                               // red canyon: banded sandstone, orange sand
      const band = Math.sin(h * .85 + n * 2.2), strata = band > .45 ? [.62, .27, .17] : band > -.2 ? [.82, .47, .28] : band > -.7 ? [.9, .66, .43] : [.7, .36, .22];
      c = mix(c, mix(strata, [.88 + n * .06, .63 + n * .06, .38], flat), wM);
      for (const o of OASES) c = mix(c, [.38, .6, .25], wM * (1 - sstep(o.r + 1, o.r + 5, dist2(x, z, o.x, o.z))));
    }
    if (wS > 0) c = mix(c, mix([.55 + n * .1, .6 + n * .1, .7 + n * .08], [.93 + n * .04, .96 + n * .03, 1], flat), wS);   // icy slopes
    if (wT > 0) c = mix(c, mix([.3 + n * .06, .33 + n * .06, .4 + n * .06], n > .55 ? [.86, .9, .95] : [.5 + n * .1, .53 + n * .1, .58 + n * .08], flat), wT);   // storm ridge: slate and old snow
    if (wV > 0) {                               // volcano: ash and basalt, glowing near lava
      c = mix(c, mix([.24 + n * .08, .2 + n * .06, .21 + n * .06], [.36 + n * .08, .33 + n * .07, .33 + n * .06], flat), wV);
      for (const o of LAVA) c = mix(c, [1, .42, .1], (1 - sstep(o.r - .5, o.r + 2.2, dist2(x, z, o.x, o.z))) * wV);
    }
  }
  out[0] = Math.pow(c[0], 2.2); out[1] = Math.pow(c[1], 2.2); out[2] = Math.pow(c[2], 2.2);
}
function buildTerrain() {
  const P = new Float32Array(GW * GH * 3), C = new Float32Array(GW * GH * 3), I = [], col = [0, 0, 0];
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const k = (j * GW + i) * 3, x = WB.x0 + i * WB.c, z = WB.z0 + j * WB.c, h = HG[j * GW + i];
    P[k] = x; P[k + 1] = h; P[k + 2] = z; terrainColor(x, z, h, col); C[k] = col[0]; C[k + 1] = col[1]; C[k + 2] = col[2];
  }
  for (let j = 0; j < GH - 1; j++) for (let i = 0; i < GW - 1; i++) { const a = j * GW + i, b = a + 1, c = a + GW, d = c + 1; I.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.setIndex(I); g.computeVertexNormals();
  terrainMesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  terrainMesh.receiveShadow = true; worldG.add(terrainMesh);
}

// ---------------------------------------------------------------- water + sky
const WATER_VS = `uniform float uT; varying vec3 vW; void main(){ vec3 p=position; vec4 w=modelMatrix*vec4(p,1.); w.y+=sin(w.x*.12+uT*1.1)*.16+cos(w.z*.1+uT*.9)*.14; vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const WATER_FS = `uniform float uT; uniform sampler2D uD; uniform vec3 uA; uniform vec3 uB; uniform vec3 uFog; uniform float uFogD; uniform vec2 uFlow; uniform float uUseD; varying vec3 vW;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){ vec2 uv=(vW.xz-vec2(${WB.x0.toFixed(1)},${WB.z0.toFixed(1)}))/vec2(${(WB.x1 - WB.x0).toFixed(1)},${(WB.z1 - WB.z0).toFixed(1)}); float d=1.; if(uUseD>.5 && uv.x>0.&&uv.x<1.&&uv.y>0.&&uv.y<1.) d=texture2D(uD,uv).r;
 vec2 q=vW.xz*.35+uFlow*uT; float w=n(q+uT*.25)+n(q*2.3-uT*.3)*.5; vec3 c=mix(uA,uB,smoothstep(.0,.75,d));
 float sp=smoothstep(1.02,1.12,w); c+=sp*.35; float foam=smoothstep(.16,.02,d+ (w-.7)*.07+sin(uT*1.5+vW.x*.3)*.02)*step(.5,uUseD); c=mix(c,vec3(1.),clamp(foam,0.,1.)*.85);
 float streak=smoothstep(.8,1.,n(vec2(vW.x*.9, vW.z*.15)+uFlow*uT*2.))*(1.-step(.5,uUseD)); c=mix(c,vec3(1.),streak*.5);
 float fd=length(vW-cameraPosition); float f=1.-exp(-uFogD*uFogD*fd*fd); c=mix(c,uFog,f); gl_FragColor=vec4(c, mix(.9,.72,foam)*mix(.62,.93,smoothstep(0.,.5,d)) + sp*.1); }`;
function buildWater() {
  const D = new Uint8Array(GW * GH);
  for (let i = 0; i < GW * GH; i++) D[i] = clamp(-HG[i] / 5, 0, 1) * 255;
  const dt = new THREE.DataTexture(D, GW, GH, THREE.LuminanceFormat); dt.minFilter = dt.magFilter = THREE.LinearFilter; dt.needsUpdate = true;
  const mk = (a, b, flow, useD) => new THREE.ShaderMaterial({ vertexShader: WATER_VS, fragmentShader: WATER_FS, transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uD: { value: dt }, uA: { value: new THREE.Color(a) }, uB: { value: new THREE.Color(b) }, uFog: { value: new THREE.Color(0xbfe3f5) }, uFogD: { value: .004 }, uFlow: { value: new THREE.Vector2(flow[0], flow[1]) }, uUseD: { value: useD } } });
  GFX.mkWater = mk; waterMat = mk(0x3fe0d0, 0x1273c4, [.2, .1], 1);
  const g = new THREE.PlaneGeometry(2600, 2600, 90, 90); g.rotateX(-Math.PI / 2);
  const sea = new THREE.Mesh(g, waterMat); sea.position.set(0, 0, 250); sea.renderOrder = 2; worldG.add(sea);
  L.bridges.forEach((b, i) => {
    const m = mk(0x6fe8e0, 0x2f9fd0, [1.2, 0], 0), hw = halfW(b.z) + 12;
    const sg = new THREE.PlaneGeometry(hw * 2, b.w + 2, 24, 4); sg.rotateX(-Math.PI / 2);
    const s = new THREE.Mesh(sg, m); s.position.set(b.x, b.level, b.z); s.renderOrder = 2; worldG.add(s); streamMats.push(m);
  });
}
let MOODS = [   // z, sky top, horizon, fog, fog density, sun colour, sun intensity, hemi sky, sun dir
  { z: -40, top: 0x2a86e0, hor: 0xbfe8ff, fog: 0xbfe3f5, fd: .0032, sun: 0xfff4dc, si: 1.3, dir: [.45, .8, -.35] },
  { z: 150, top: 0x2f93d0, hor: 0xd4f2d2, fog: 0xa9d9ba, fd: .0085, sun: 0xfff0c8, si: 1.05, dir: [.5, .75, -.3] },
  { z: 340, top: 0x3f86d8, hor: 0xffe2b0, fog: 0xe6d2ae, fd: .0036, sun: 0xffdca0, si: 1.25, dir: [.6, .55, -.45] },
  { z: 520, top: 0x2b3a86, hor: 0xff9a6a, fog: 0xe0a892, fd: .0022, sun: 0xff9a55, si: 1.2, dir: [.7, .26, -.6] }];
const SKY_FS = `uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uSun; uniform vec3 uSunC; varying vec3 vD;
void main(){ vec3 d=normalize(vD); float t=pow(clamp(d.y*1.15+.08,0.,1.),.55); vec3 c=mix(uHor,uTop,t); c=mix(c,uHor*.92,smoothstep(.0,-.25,d.y)); float s=max(dot(d,normalize(uSun)),0.); c+=uSunC*(pow(s,350.)*1.6+pow(s,14.)*.22); gl_FragColor=vec4(c,1.); }`;
let skyMesh, clouds = [];
function buildSky() {
  skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, vertexShader: `varying vec3 vD; void main(){ vD=position; vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=p.xyww; }`, fragmentShader: SKY_FS,
    uniforms: { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3(.4, .8, -.3) }, uSunC: { value: new THREE.Color() } } });
  skyMesh = new THREE.Mesh(new THREE.SphereGeometry(1200, 24, 14), skyMat); skyMesh.renderOrder = -10; skyMesh.frustumCulled = false; scene.add(skyMesh);
  const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: .9 }), sg = new THREE.IcosahedronGeometry(1, 1), r = rng(77);
  for (let i = 0; i < 22; i++) {
    const g = new THREE.Group();
    for (let k = 0; k < 4 + r() * 3; k++) { const m = new THREE.Mesh(sg, cm); m.position.set((r() - .5) * 60, (r() - .5) * 6, (r() - .5) * 26); m.scale.set(18 + r() * 16, 7 + r() * 5, 14 + r() * 10); g.add(m); }
    g.position.set((r() - .5) * 1500, 190 + r() * 150, (r() - .5) * 1500 + 250); g.userData.v = 1.5 + r() * 2.5; scene.add(g); clouds.push(g);
  }
}
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function updateMood(z, dt, px, py, pz) {
  let i = 0; while (i < MOODS.length - 2 && z > MOODS[i + 1].z) i++;
  const a = MOODS[i], b = MOODS[i + 1], t = clamp((z - a.z) / (b.z - a.z), 0, 1);
  const lc = (x, y, o) => o.copy(_c1.setHex(x)).lerp(_c2.setHex(y), t);
  lc(a.top, b.top, skyMat.uniforms.uTop.value); lc(a.hor, b.hor, skyMat.uniforms.uHor.value); lc(a.fog, b.fog, scene.fog.color); lc(a.sun, b.sun, sun.color);
  skyMat.uniforms.uSunC.value.copy(sun.color);
  scene.fog.density = lerp(a.fd, b.fd, t) * [1.5, 1.15, 1, .85][SET.dist];
  sun.intensity = lerp(a.si, b.si, t); hemi.color.copy(skyMat.uniforms.uHor.value); hemi.intensity = .62;
  const d = skyMat.uniforms.uSun.value.set(lerp(a.dir[0], b.dir[0], t), lerp(a.dir[1], b.dir[1], t), lerp(a.dir[2], b.dir[2], t)).normalize();
  sun.target.position.set(px, py, pz); sun.position.set(px + d.x * 120, py + d.y * 120, pz + d.z * 120);
  skyMesh.position.copy(camera.position);
  for (const m of [waterMat, ...streamMats]) { m.uniforms.uT.value = GFX.t; m.uniforms.uFog.value.copy(scene.fog.color); m.uniforms.uFogD.value = scene.fog.density; }
  for (const c of clouds) { c.position.x += c.userData.v * dt; if (c.position.x > 800) c.position.x = -800; }
}

// ---------------------------------------------------------------- vegetation + static props
function instanced(name, list, dbl) {            // list: [x,y,z,ry,s]
  if (!list.length) return;
  const chunks = new Map();
  for (const it of list) { const k = Math.floor(it[2] / 70); if (!chunks.has(k)) chunks.set(k, []); chunks.get(k).push(it); }
  const d = new THREE.Object3D();
  for (const arr of chunks.values()) {
    const m = new THREE.InstancedMesh(baked(name), dbl ? vcMat2 : vcMat, arr.length);
    arr.forEach((it, i) => { d.position.set(it[0], it[1], it[2]); d.rotation.set(it[5] || 0, it[3], 0); d.scale.setScalar(it[4]); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
    m.castShadow = name !== 'grass' && name.indexOf('flower') < 0; m.receiveShadow = true;
    m.geometry.computeBoundingSphere(); m.frustumCulled = false; worldG.add(m);
    // manual chunk culling sphere
    let cx = 0, cy = 0, cz = 0; arr.forEach(it => { cx += it[0]; cy += it[1]; cz += it[2]; }); cx /= arr.length; cy /= arr.length; cz /= arr.length;
    let rr = 0; arr.forEach(it => rr = Math.max(rr, Math.hypot(it[0] - cx, it[1] - cy, it[2] - cz))); m.userData.cs = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), rr + 14);
    GFX.chunks.push(m);
  }
}
GFX.chunks = [];
const _fr = new THREE.Frustum(), _pm = new THREE.Matrix4();
function cullChunks() { _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _fr.setFromProjectionMatrix(_pm); for (const m of GFX.chunks) m.visible = _fr.intersectsSphere(m.userData.cs); }
function nearHazard(x, z, m) { for (const o of LAVA) if (dist2(x, z, o.x, o.z) < o.r + m) return true; for (const o of OASES) if (dist2(x, z, o.x, o.z) < o.r + m) return true; for (const v of VENTS) if (dist2(x, z, v.x, v.z) < 2 + m) return true; for (const b of L.bags) if (dist2(x, z, b.x, b.z) < 1.2 + m * .4) return true; return false; }
function nearStation(x, z, r) {
  const pts = [L.plane, L.tail, L.wing, L.lookout, L.gate, L.vault, L.tree, L.radio, L.heli, L.leverChest, L.tablet, ...L.camps, ...L.totems, ...L.plates, ...L.logs, ...L.stakes, ...L.levers, ...L.digs, ...L.crates, ...L.pitChests];
  for (const p of pts) if (dist2(x, z, p.x, p.z) < r) return true;
  for (const p of L.pits) if (dist2(x, z, p.x, p.z) < p.r + 4) return true;
  for (const s of STREAMS) if (Math.abs(z - s.z) < s.w / 2 + 2.5) return true;
  return false;
}
function buildVegetation() {
  const r = rng(4242 + SEED), dens = [.45, .7, 1, 1.25][SET.quality] || 1;
  const lists = {}; const put = (n, x, z, s, rad, tilt) => { (lists[n] = lists[n] || []).push([x, getH(x, z) - .08, z, r() * 6.28, s, tilt || 0]); if (COLR[n]) { const y = getH(x, z); addCol(x, z, COLR[n] * s, COLH[n] ? y + COLH[n] * s : y + 60); } };
  // beach palms
  for (let i = 0; i < 46 * dens; i++) { const x = -78 + r() * 156, z = -14 + r() * 58; if (getH(x, z) < 1.6 || nearStation(x, z, 7) || Math.abs(x) < 7 && z < 40) continue; put(r() < .5 ? 'palm_a' : 'palm_b', x, z, .8 + r() * .5, .35); }
  for (let i = 0; i < 60 * dens; i++) { const x = -80 + r() * 160, z = -40 + r() * 80; if (getH(x, z) < .3 || nearStation(x, z, 4)) continue; put(['rock_a', 'rock_b', 'rock_c'][i % 3], x, z, .3 + r() * .7, r() < .3 ? .9 : 0); }
  // jungle valley + ridges
  for (let z = 44; z < JUNGLE_END + 6; z += 1.0 / dens) {
    for (let k = 0; k < 7; k++) {
      const px = pathX(z), hw = halfW(z), x = px + (r() * 2 - 1) * (k < 5 ? hw + 5 : hw + 36), d = Math.abs(x - px), zz = z + r() * 2;
      if (d < 3.4 || nearStation(x, zz, 5.5)) continue;
      const sl = slopeAt(x, zz).ang; if (sl > .95) continue;
      const q = r(), edge = d > hw * .45;
      if (q < (edge ? .2 : .07)) put(['jtree_a', 'jtree_b', 'jtree_c'][(r() * 3) | 0], x, zz, .85 + r() * .7, d < hw + 3 ? .6 : 0);
      else if (q < .26) put(r() < .5 ? 'palm_a' : 'palm_b', x, zz, .8 + r() * .5, d < hw + 3 ? .35 : 0);
      else if (q < .5) put('fern', x, zz, .8 + r() * .9);
      else if (q < .62) put('bush', x, zz, .7 + r() * .8, d < hw && r() < .4 ? .6 : 0);
      else if (q < .72) put('banana_plant', x, zz, .7 + r() * .6, .15);
      else if (q < .82) put(['flower_a', 'flower_b', 'flower_c'][(r() * 3) | 0], x, zz, 1 + r() * .8);
      else if (q < .86) put(['rock_a', 'rock_b', 'rock_moss', 'rock_c'][(r() * 4) | 0], x, zz, .5 + r() * 1.1, .95);
      else if (q < .885) put('mushroom', x, zz, 1 + r());
      else if (q < .9) put('stump', x, zz, .8 + r() * .5, .6);
    }
  }
  for (let i = 0; i < 2600 * dens; i++) { const z = 30 + r() * 310, x = pathX(z) + (r() * 2 - 1) * (halfW(z) + 4); if (getH(x, z) < 1.5 || nearStation(x, z, 2) || slopeAt(x, z).ang > .7) continue; put('grass', x, z, .9 + r() * 1.3); }
  // mountain: every biome has its own plants and rocks
  for (let i = 0; i < 2300 * dens; i++) {
    const z = JUNGLE_END + r() * (Z_MAX - JUNGLE_END), x = (r() * 2 - 1) * (halfW(z) + 18), h = getH(x, z), sl = slopeAt(x, z).ang;
    if (nearStation(x, z, 4.5) || sl > .6 || nearHazard(x, z, 2.5)) continue;
    const q = r(), b0 = biomeAt(z), big = r() < .2 ? 1.6 + r() * 1.4 : .4 + r() * 1.1;
    if (b0 === B_ROOT) { if (q < .17) put('jtree_b', x, z, 1.9 + r() * 1.3); else if (q < .32) put('mush_giant', x, z, .8 + r() * .9); else if (q < .4) put('root_arch', x, z, 1 + r() * .6); else if (q < .62) put('fern', x, z, 1.1 + r()); else if (q < .74) put('mushroom', x, z, 1.4 + r() * 1.5); else if (q < .84) put('rock_moss', x, z, big); continue; }
    if (b0 === B_STORM) { if (q < .45) put(['rock_b', 'rock_c', 'rock_ice'][(r() * 3) | 0], x, z, big); else if (q < .55) put('deadtree', x, z, .6 + r() * .5); else if (q < .62) put('pine_snow', x, z, .6 + r() * .4); continue; }
    const b = [0, 0, 1, 2, 2, 3][b0];
    if (b === 0) { if (q < .4) put('pine', x, z, .7 + r() * .7); else if (q < .72) put(['rock_a', 'rock_b', 'rock_c', 'rock_moss'][(r() * 4) | 0], x, z, big); else if (q < .8) put('deadtree', x, z, .7 + r() * .6, .3); else if (q < .9) put(['flower_a', 'flower_b', 'flower_c'][(r() * 3) | 0], x, z, 1.2 + r()); else put('grass', x, z, 1 + r()); }
    else if (b === 1) { if (q < .26) put('cactus', x, z, .7 + r() * .7); else if (q < .72) put(r() < .5 ? 'rock_red_a' : 'rock_red_b', x, z, big); else if (q < .82) put('deadtree', x, z, .6 + r() * .5); else if (q < .9) put('bush', x, z, .5 + r() * .4); }
    else if (b === 2) { if (q < .4) put('pine_snow', x, z, .7 + r() * .8); else if (q < .72) put(r() < .6 ? 'rock_ice' : 'rock_b', x, z, big); else if (q < .78) put('deadtree', x, z, .6 + r() * .5); }
    else { if (q < .55) put('rock_basalt', x, z, big); else if (q < .66) put('deadtree', x, z, .6 + r() * .5); }
  }
  for (const o of OASES) for (let k = 0; k < 9; k++) { const a = k / 9 * 6.28 + r(), d = o.r + 1.2 + r() * 2.5, x = o.x + Math.cos(a) * d, z = o.z + Math.sin(a) * d; put(k % 3 ? (k % 3 === 1 ? 'bush' : 'grass') : (r() < .5 ? 'palm_a' : 'palm_b'), x, z, .7 + r() * .4); }
  for (const n in lists) instanced(n, lists[n]);
}
function buildProps() {
  const add = (m) => { worldG.add(m); return m; };
  const pf = add(prop('plane_front', L.plane.x, L.plane.y - .45, L.plane.z, 2.5, 1, true)); pf.rotation.z = .1; GFX.wreck = [pf];
  for (let k = -3; k <= 3.2; k += .5) { addCol(L.plane.x + Math.sin(2.5) * k * 1.9, L.plane.z + Math.cos(2.5) * k * 1.9, 1.8, L.plane.y + 4); }
  const tl = add(prop('plane_tail', L.tail.x, L.tail.y - .5, L.tail.z, .9, 1, true)); tl.rotation.z = -.25; GFX.wreck.push(tl); for (let k = -1.5; k <= 1.6; k += .5) addCol(L.tail.x + Math.sin(.9) * k * 1.8, L.tail.z + Math.cos(.9) * k * 1.8, 1.7 - Math.max(0, k) * .4, L.tail.y + 5);
  const wg = add(prop('plane_wing', L.wing.x, L.wing.y + .1, L.wing.z, 1.2, 1)); wg.rotation.z = .12; GFX.wreck.push(wg); for (let k = -3.5; k <= 3.6; k += 1) addCol(L.wing.x + Math.cos(1.2) * k, L.wing.z - Math.sin(1.2) * k, 1.35, L.wing.y + 1.3);
  const r = rng(9);
  for (let i = 0; i < 5; i++) { const x = -10 + r() * 22, z = -8 + r() * 20; if (dist2(x, z, L.plane.x, L.plane.z) < 4) continue; add(prop(i % 2 ? 'seat' : 'suitcase', x, getH(x, z), z, r() * 6, 1)).rotation.z = i % 2 ? 1.2 : 0; addCol(x, z, .5, getH(x, z) + .9); }
  L.camps.forEach((c, i) => { add(prop('campfire', c.x, c.y, c.z, i, 1)); addFire(c.x, c.y + .3, c.z); addCol(c.x, c.z, .7, c.y + .8); addCol(c.x - 1.8, c.z + .6, .55, c.y + .7); if (i) { add(prop('tent', c.x + 3.4, getH(c.x + 3.4, c.z + 1.5), c.z + 1.5, -1 + i, 1)); addCol(c.x + 3.4, c.z + 1.5, 1.45, c.y + 2); } add(prop('log', c.x - 1.8, getH(c.x - 1.8, c.z) + .25, c.z + .6, 1.2, 1)).scale.set(1.8, 1, 1); });
  add(prop('lookout', L.lookout.x, L.lookout.y - .2, L.lookout.z, 0, 1)); addCol(L.lookout.x, L.lookout.z, 1.15, L.lookout.y + 30);
  add(prop('sign', L.lookout.x - 3, getH(L.lookout.x - 3, L.lookout.z - 2), L.lookout.z - 2, .6, 1));
  for (const s of [-1, 1]) { add(prop('pillar', L.gate.x + s * 4.9, L.gate.y - .3, L.gate.z, 0, 1.25)); addCol(L.gate.x + s * 4.9, L.gate.z, 1.1, L.gate.y + 8); }
  L.plates.forEach(p => add(prop('plate', p.x, p.y - .02, p.z, 0, 1)));
  L.levers.forEach(p => { add(prop('lever_base', p.x, p.y, p.z, 0, 1)); addCol(p.x, p.z, .42, p.y + 1.2); });
  L.stakes.forEach(p => { add(prop('stake', p.x, p.y, p.z, 0, 1.2)); addCol(p.x, p.z, .18, p.y + 1.1); });
  add(prop('antenna', L.radio.x, L.radio.y - .1, L.radio.z, -.4, 1.2)); addCol(L.radio.x, L.radio.z, 1.05, L.radio.y + 12); addCol(L.radio.x + 1.75, L.radio.z + .75, 1.0, L.radio.y + 1.6);
  // stone tablet with the lever clue
  add(prop('pillar', L.tablet.x, L.tablet.y - .2, L.tablet.z, .5, .32)); addCol(L.tablet.x, L.tablet.z, .4, L.tablet.y + 1.8);
  add(prop('sign', L.plane.x + 9, getH(L.plane.x + 9, 36), 36, -1.57, 1.2));
}
function addFire(x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const mk = (c, s) => { const m = new THREE.Mesh(new THREE.ConeGeometry(.3, .9, 6), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .9, fog: false })); m.scale.setScalar(s); g.add(m); return m; };
  mk(0xff7a1a, 1); mk(0xffd23a, .65); mk(0xfff3b0, .35);
    worldG.add(g); GFX.fires.push(g);
}
function symbolTex(ch, bg, fg) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = bg || '#e6cf98'; x.fillRect(0, 0, 128, 128); x.fillStyle = fg || '#5a2a1a'; x.font = 'bold 92px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 64, 70);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}
function labelSprite(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.75)'; x.strokeText(text, 128, 34); x.fillStyle = color || '#fff'; x.fillText(text, 128, 34);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, fog: false })); s.scale.set(2.4, .6, 1); s.renderOrder = 20; return s;
}
function beacon(color) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 60, 8, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .45, fog: false, side: THREE.DoubleSide, depthWrite: false }));
  m.position.y = 30; const g = new THREE.Group(); g.add(m); return g;
}

// ---------------------------------------------------------------- characters
function makeChar(ci, name) {
  const o = rig('char' + ci); const g = new THREE.Group(); g.add(o);
  const P = o.userData.parts, pre = 'c' + ci + '_', p = {};
  for (const k of ['hips', 'torso', 'head', 'armL', 'armR', 'foreL', 'foreR', 'legL', 'legR', 'shinL', 'shinR']) p[k] = P[pre + k];
  g.userData = { p, body: o, hipY: p.hips.position.y, ph: Math.random() * 6, held: null, heldType: '', lab: null };
  if (name) { const s = labelSprite(name); s.position.y = 2.2; g.add(s); g.userData.lab = s; }
  return g;
}
function setHeld(g, type) {
  const u = g.userData; if (u.heldType === type) return; u.heldType = type;
  if (u.held) { u.held.parent.remove(u.held); u.held = null; }
  if (!type) return;
  const def = ITEMS[type], m = new THREE.Mesh(baked('it_' + (def.model || type)), vcMat); m.castShadow = true;
  m.position.set(0, -.3, .09); m.rotation.set(type === 'saw' ? 0 : 1.57, 0, type === 'saw' ? 1.57 : 0); if (type === 'shovel') m.rotation.set(3.14, 0, 0);
  u.p.foreR.add(m); u.held = m;
}
const _R = (o, x, y, z, k) => { o.rotation.x += (x - o.rotation.x) * k; o.rotation.y += ((y || 0) - o.rotation.y) * k; o.rotation.z += ((z || 0) - o.rotation.z) * k; };
// state: idle walk run climb air slide carry saw ko swim sit pull
function animChar(g, st, dt, speed, moving) {
  const u = g.userData, p = u.p, k = Math.min(1, dt * 12);
  const tree = st === 'tree'; if (tree) st = 'climb';
  u.ph += dt * (st === 'run' ? 11 : st === 'climb' ? (moving ? 6.5 : .6) : st === 'walk' || st === 'carry' ? 8 : st === 'saw' ? 9 : st === 'swim' ? 6 : 2);
  const s = Math.sin(u.ph), c = Math.cos(u.ph);
  let bx = 0, bz = 0, off = 0, hip = u.hipY, tor = 0, head = 0;
  let aL = [0, 0, .08], aR = [0, 0, -.08], fL = -.1, fR = -.1, lL = 0, lR = 0, sL = 0, sR = 0;
  if (st === 'walk' || st === 'run' || st === 'carry') {
    const A = st === 'run' ? 1.0 : .6;
    lL = -s * A; lR = s * A; sL = Math.max(0, c) * A * 1.1; sR = Math.max(0, -c) * A * 1.1;
    aL = [s * A * .9, 0, .1]; aR = [-s * A * .9, 0, -.1]; fL = fR = st === 'run' ? -1.1 : -.35; tor = st === 'run' ? .22 : .06; hip += Math.abs(c) * .05 * A;
    if (st === 'carry') { aL = [-2.7, 0, .25]; aR = [-2.7, 0, -.25]; fL = fR = -.5; tor = .05; }
  } else if (st === 'climb') {
    // body lies against the rock: lean by the wall angle, one arm reaches while the opposite leg pushes
    const ang = tree ? 1.45 : slopeAt(g.position.x, g.position.z).ang, m = moving ? 1 : .12;
    bx = clamp(Math.PI / 2 - ang, 0, .75) * .95; off = tree ? 0 : -.2 - bx * .25;
    aL = [-2.55 - s * .5 * m, 0, .38 + c * .12 * m]; aR = [-2.55 + s * .5 * m, 0, -.38 + c * .12 * m]; fL = -.55 + s * .45 * m; fR = -.55 - s * .45 * m;
    lL = -1.0 + s * .55 * m; lR = -1.0 - s * .55 * m; sL = 1.45 - s * .5 * m; sR = 1.45 + s * .5 * m; tor = -.12 + Math.abs(c) * .06 * m; head = -.5;
    hip = u.hipY + Math.abs(s) * .05 * m;
    if (u.tired) { bz = Math.sin(GFX.t * 31) * .05; aL[2] += Math.sin(GFX.t * 37) * .08; aR[2] += Math.sin(GFX.t * 29) * .08; }
  } else if (st === 'air' || st === 'slide') {
    aL = [-2.6 + s * .5, 0, .9]; aR = [-2.6 - s * .5, 0, -.9]; lL = -.5 + s * .4; lR = .3 - s * .4; sL = .9; sR = .6; if (st === 'slide') { bx = -.9; tor = .2; }
  } else if (st === 'saw') { aL = [-1.3 + s * .3, 0, -.2]; aR = [-1.3 - s * .3, 0, .2]; fL = fR = -.6 - s * .5; tor = .35 + s * .12; lL = -.3; lR = .35; }
  else if (st === 'ko') { bx = -1.5; aL = [-.4, 0, 1.3]; aR = [-.3, 0, -1.3]; lL = .1; lR = -.15; }
  else if (st === 'swim') { bx = 1.15; aL = [-2.9 + s * .9, 0, .5]; aR = [-2.9 - s * .9, 0, -.5]; lL = s * .5; lR = -s * .5; head = -.7; }
  else if (st === 'sit') { hip = u.hipY - .27; lL = lR = -1.5; sL = sR = 1.45; aL = [-.5, 0, .15]; aR = [-.5, 0, -.15]; fL = fR = -.8; tor = .12; }
  else if (st === 'punch') { aR = [-1.6 + Math.sin(u.ph * 2) * .4, 0, -.1]; fR = -.1; aL = [-.9, 0, .2]; fL = -1.4; tor = .3; lL = -.4; lR = .3; }
  else if (st === 'pull') { aL = [-1.2, 0, .1]; aR = [-1.2, 0, -.1]; fL = fR = -.3; tor = .6; lL = -.5; lR = .4; sL = .5; }
  else { tor = Math.sin(u.ph) * .02; aL = [Math.sin(u.ph) * .04, 0, .1]; aR = [-Math.sin(u.ph) * .04, 0, -.1]; head = Math.sin(u.ph * .5) * .05; }
  u.body.rotation.x += (bx - u.body.rotation.x) * k * .6; u.body.rotation.z = bz; u.body.position.z += (off - u.body.position.z) * k * .6;
  p.hips.position.y += (hip - p.hips.position.y) * k;
  _R(p.torso, tor, 0, 0, k); _R(p.head, head, 0, 0, k);
  _R(p.armL, aL[0], aL[1], -aL[2], k); _R(p.armR, aR[0], aR[1], -aR[2], k); _R(p.foreL, fL, 0, 0, k); _R(p.foreR, fR, 0, 0, k);
  _R(p.legL, lL, 0, 0, k); _R(p.legR, lR, 0, 0, k); _R(p.shinL, sL, 0, 0, k); _R(p.shinR, sR, 0, 0, k);
}
function charThumb(ci) {
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, .75, .1, 20), g = makeChar(ci);
  sc.add(g); sc.add(new THREE.HemisphereLight(0xffffff, 0x777777, 1.0)); const d = new THREE.DirectionalLight(0xffffff, .9); d.position.set(2, 4, 5); sc.add(d);
  g.rotation.y = .35; cam.position.set(0, 1.1, 4.5); cam.lookAt(0, .93, 0);
  const rt = new THREE.WebGLRenderTarget(240, 320), buf = new Uint8Array(240 * 320 * 4);
  const tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping;
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, cam); renderer.readRenderTargetPixels(rt, 0, 0, 240, 320, buf); renderer.setRenderTarget(null); renderer.toneMapping = tm;
  const c = document.createElement('canvas'); c.width = 240; c.height = 320; const x = c.getContext('2d'), im = x.createImageData(240, 320);
  for (let y = 0; y < 320; y++) for (let i = 0; i < 240 * 4; i++) { let v = buf[(319 - y) * 960 + i]; if (i % 4 !== 3) v = Math.pow(v / 255, 1 / 2.2) * 255; im.data[y * 960 + i] = v; }
  x.putImageData(im, 0, 0); rt.dispose(); return c.toDataURL();
}

// ---------------------------------------------------------------- ambient animals (local only)
function buildAnimals() {
  const r = rng(555 + SEED), A = (kind, model, x, y, z, extra) => { const o = rig(model, false); o.position.set(x, y, z); worldG.add(o); GFX.animals.push(Object.assign({ kind, o, x, y, z, hx: x, hz: z, t: r() * 10, ry: r() * 6, P: o.userData.parts }, extra || {})); };
  for (let i = 0; i < 12; i++) { const x = -60 + r() * 120, z = -30 + r() * 26; if (getH(x, z) > .3) A('crab', 'crab', x, getH(x, z), z); }
  for (let i = 0; i < 4; i++) { const x = -50 + r() * 100, z = -34 + r() * 14; if (getH(x, z) > .2) A('turtle', 'turtle', x, getH(x, z), z); }
  for (let i = 0; i < 9; i++) A('gull', 'gull', 0, 0, 0, { cx: -60 + r() * 120, cz: -50 + r() * 70, rad: 14 + r() * 22, h: 16 + r() * 16, sp: .25 + r() * .25 });
  for (let i = 0; i < 16; i++) { const z = 60 + r() * 260; A('parrot', 'parrot', 0, 0, 0, { cx: pathX(z) + (r() - .5) * 30, cz: z, rad: 6 + r() * 12, h: 9 + r() * 6, sp: .5 + r() * .5 }); }
  for (let i = 0; i < 40; i++) { const z = 30 + r() * 300, x = pathX(z) + (r() - .5) * 30; A('butterfly', 'butterfly', x, getH(x, z) + 1, z); }
  for (let i = 0; i < 12; i++) { const z = 60 + r() * 260, x = pathX(z) + (r() < .5 ? -1 : 1) * (6 + r() * 12); if (!nearStation(x, z, 4) && slopeAt(x, z).ang < .5) A('monkey', 'monkey', x, getH(x, z), z); }
  for (let i = 0; i < 10; i++) { const wi = 1 + (i % 6), x = -25 + r() * 50, z = ledgeZ(wi, x) + r() * 12; if (slopeAt(x, z).ang < .5) A('goat', 'goat', x, getH(x, z), z); }
  for (let i = 0; i < 14; i++) { const a = r() * 6.28, d = 95 + r() * 60; A('fish', 'fish', Math.sin(a) * d, -1, -50 + Math.cos(a) * 30 - 30, { jt: r() * 8 }); }
}
function updateAnimals(dt, players) {
  for (const a of GFX.animals) {
    a.t += dt; const o = a.o;
    if (Math.abs(a.z - camera.position.z) > 170 && a.kind !== 'gull') { o.visible = false; continue; } o.visible = true;
    if (a.kind === 'gull' || a.kind === 'parrot') {
      const ang = a.t * a.sp; a.x = a.cx + Math.sin(ang) * a.rad; a.z = a.cz + Math.cos(ang) * a.rad * .7; a.y = getH(a.cx, a.cz) + a.h + Math.sin(a.t * .7) * 2;
      o.position.set(a.x, Math.max(a.y, 6), a.z); o.rotation.y = ang + Math.PI / 2 + (a.kind === 'parrot' ? 0 : 0); const f = Math.sin(a.t * (a.kind === 'gull' ? 5 : 14)) * .7;
      const n = a.kind; if (a.P[n + '_wingL']) { a.P[n + '_wingL'].rotation.z = -f; a.P[n + '_wingR'].rotation.z = f; } o.scale.setScalar(a.kind === 'gull' ? 2.2 : 1.6);
    } else if (a.kind === 'butterfly') {
      o.position.set(a.hx + Math.sin(a.t * .6) * 3, a.y + Math.sin(a.t * 1.7) * .5, a.hz + Math.cos(a.t * .45) * 3); o.rotation.y = a.t * .6; const f = Math.sin(a.t * 18) * 1.1; a.P.butterfly_wingL.rotation.z = -f; a.P.butterfly_wingR.rotation.z = f; o.scale.setScalar(1.6);
    } else if (a.kind === 'fish') {
      const j = (a.t + a.jt) % 9; if (j < 1) { o.visible = true; o.position.set(a.x + j * 2, -0.4 + Math.sin(j * Math.PI) * 1.6, a.z); o.rotation.z = (0.5 - j) * 2; o.rotation.y = 1.57; o.scale.setScalar(2.5); } else o.visible = false;
    } else {
      // ground critters: wander around home, flee from players
      let fx = 0, fz = 0, near = 99;
      for (const p of players) { const d = dist2(p.x, p.z, a.x, a.z); if (d < near) { near = d; fx = a.x - p.x; fz = a.z - p.z; } }
      const flee = a.kind === 'crab' ? 5 : a.kind === 'monkey' ? 4 : a.kind === 'goat' ? 6 : 0;
      let sp = 0;
      if (near < flee) { a.ry = Math.atan2(fx, fz); sp = a.kind === 'crab' ? 3.2 : 4.5; }
      else if ((a.t % 7) < 2.5 && a.kind !== 'monkey') { sp = a.kind === 'turtle' ? .25 : .9; if (dist2(a.x, a.z, a.hx, a.hz) > 7) a.ry = Math.atan2(a.hx - a.x, a.hz - a.z); else a.ry += Math.sin(a.t) * dt; }
      if (sp) { const nx = a.x + Math.sin(a.ry) * sp * dt, nz = a.z + Math.cos(a.ry) * sp * dt, h = getH(nx, nz); if (h > .15 && slopeAt(nx, nz).ang < .75 && dist2(nx, nz, a.hx, a.hz) < 16) { a.x = nx; a.z = nz; a.y = h; } else a.ry += 2; }
      o.position.set(a.x, a.y + (a.kind === 'monkey' && !sp ? Math.abs(Math.sin(a.t * 3)) * .06 : sp ? Math.abs(Math.sin(a.t * 12)) * .08 : 0), a.z);
      o.rotation.y = a.kind === 'crab' ? a.ry + 1.57 : a.ry + Math.PI;
      if (a.kind === 'crab') { a.P.crab_clawL.rotation.x = Math.sin(a.t * 6) * .3; a.P.crab_clawR.rotation.x = -Math.sin(a.t * 6) * .3; }
      if (a.kind === 'monkey') { a.P.monkey_armL.rotation.x = sp ? Math.sin(a.t * 14) : -2.6 + Math.sin(a.t * 5) * .3; a.P.monkey_armR.rotation.x = sp ? -Math.sin(a.t * 14) : Math.sin(a.t * 2) * .2; }
    }
  }
  for (const f of GFX.fires) { const k = GFX.t * 9 + f.position.x; f.children[0].scale.set(1 + Math.sin(k) * .15, 1 + Math.sin(k * 1.3) * .25, 1 + Math.cos(k) * .15); f.children[1].scale.setScalar(.65 + Math.sin(k * 1.7) * .12); f.children[1].position.y = .05 + Math.sin(k * 2) * .05; }
  if (!GFX.fireLight) { GFX.fireLight = new THREE.PointLight(0xff8a3a, 1.2, 18, 2); scene.add(GFX.fireLight); }
  let bf = null, bd = 1e9; for (const f of GFX.fires) { const d = f.position.distanceToSquared(camera.position); if (d < bd) { bd = d; bf = f; } }
  if (bf) { GFX.fireLight.position.set(bf.position.x, bf.position.y + .8, bf.position.z); GFX.fireLight.intensity = bd < 3600 ? 1.2 + Math.sin(GFX.t * 20) * .3 : 0; }
}

// ---------------------------------------------------------------- rebuilding the island for a new seed
let waterTex = null;
function clearWorld() {
  for (const c of worldG.children.slice()) { worldG.remove(c); if (c.isInstancedMesh) c.dispose(); }
  if (terrainMesh) { terrainMesh.geometry.dispose(); terrainMesh = null; }
  GFX.colGrid.clear(); GFX.chunks.length = 0; GFX.animals.length = 0; GFX.fires.length = 0; streamMats.length = 0;
}
function buildWorldScene() {
  clearWorld(); procModels();
  MOODS = [MOODS[0], MOODS[1], MOODS[2],
    { z: BIO_Z[1] + 20, top: 0x2f5446, hor: 0x9cc8a2, fog: 0x6c9a7a, fd: .0095, sun: 0xd8f0c0, si: .8, dir: [.4, .8, -.3] },
    { z: BIO_Z[2] + 25, top: 0x3b7fd0, hor: 0xffd29c, fog: 0xebbd8c, fd: .003, sun: 0xffd48a, si: 1.45, dir: [.55, .7, -.3] },
    { z: BIO_Z[3] + 25, top: 0x6f8fb8, hor: 0xe8eef6, fog: 0xdce6f0, fd: .0065, sun: 0xeef4ff, si: .95, dir: [.4, .6, -.5] },
    { z: BIO_Z[4] + 15, top: 0x353c48, hor: 0x8794a6, fog: 0x76818f, fd: .0078, sun: 0xcfd8e6, si: .7, dir: [.3, .6, -.6] },
    { z: BIO_Z[5] + 25, top: 0x3a2632, hor: 0xd06a46, fog: 0x8c5a4c, fd: .005, sun: 0xff8a50, si: 1.0, dir: [.6, .45, -.5] },
    { z: Z_MAX - 25, top: 0x2b3a86, hor: 0xff9a6a, fog: 0xe0a892, fd: .0022, sun: 0xff9a55, si: 1.2, dir: [.7, .26, -.6] }];
  MOODS[2].z = JUNGLE_END + 10;
  buildTerrain(); buildWater(); buildProps(); buildHazards(); buildDynamic(); buildSkeletons(); buildVegetation(); buildAnimals();
}
// ---------------------------------------------------------------- biome hazards: lava pools, oases, steam vents, weather
const LAVA_FS = `uniform float uT; varying vec3 vW; float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){ vec2 q=vW.xz*.45; float w=n(q+uT*.12)*.6+n(q*2.7-uT*.2)*.4; float crust=smoothstep(.62,.72,w); vec3 c=mix(vec3(1.,.82,.25),vec3(1.,.36,.05),smoothstep(.2,.6,w)); c=mix(c,vec3(.18,.1,.09),crust*.85); c*=1.0+.25*sin(uT*2.+vW.x); gl_FragColor=vec4(c,1.); }`;
const VENT_CYCLE = 7, VENT_ON = 2.4;
function ventOn(i, t) { return ((t + i * 2.3) % VENT_CYCLE) < VENT_ON; }
function buildHazards() {
  GFX.lavaMat = new THREE.ShaderMaterial({ vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`, fragmentShader: LAVA_FS, uniforms: { uT: { value: 0 } } });
  for (const o of LAVA) { const g = new THREE.CircleGeometry(o.r + 1.2, 28); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, GFX.lavaMat); m.position.set(o.x, o.y, o.z); worldG.add(m); }
  for (const o of OASES) { const g = new THREE.CircleGeometry(o.r + 1.4, 28, 0, 6.2832); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, GFX.mkWater(0x6fe8e0, 0x2a9fd0, [.3, .2], 0)); m.position.set(o.x, o.y, o.z); m.renderOrder = 2; worldG.add(m); streamMats.push(m.material); }
  GFX.spores = SPORES.map(o => { const g = new THREE.Group(); g.position.set(o.x, getH(o.x, o.z) + 1.2, o.z); for (let k = 0; k < 7; k++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: k % 2 ? 0x5fcf2a : 0x8fe03a, transparent: true, opacity: .32, depthWrite: false })); const a = k * .9; m.position.set(Math.cos(a) * o.r * .45, .3 + (k % 3) * .5, Math.sin(a) * o.r * .45); m.scale.setScalar(o.r * (.45 + (k % 3) * .12)); m.userData.ph = k; g.add(m); } worldG.add(g); return g; });
  GFX.vents = VENTS.map((v, i) => {
    const g = new THREE.Group(); g.position.set(v.x, v.y, v.z); g.add(prop('vent', 0, 0, 0, i, 1));
    const st = new THREE.Mesh(new THREE.CylinderGeometry(.55, 1.4, 1, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .5, depthWrite: false, side: THREE.DoubleSide }));
    st.position.y = .5; g.add(st); g.userData.st = st; worldG.add(g); return g;
  });
  if (!GFX.wx) {                                // falling snow / volcanic ash around the camera
    const N = 1600, P = new Float32Array(N * 3); for (let i = 0; i < N * 3; i++) P[i] = (Math.random() - .5) * 60;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    GFX.wx = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: .16, transparent: true, opacity: 0, depthWrite: false })); GFX.wx.frustumCulled = false; scene.add(GFX.wx);
  }
}
function updateHazards(dt, z, tWorld) {
  if (GFX.lavaMat) GFX.lavaMat.uniforms.uT.value = GFX.t;
  (GFX.vents || []).forEach((g, i) => { const on = ventOn(i, tWorld), st = g.userData.st, k = Math.min(1, dt * 6); const hT = on ? 15 : 1.2; st.scale.y += (hT - st.scale.y) * k; st.position.y = st.scale.y / 2; st.material.opacity = on ? .55 + Math.sin(GFX.t * 20) * .08 : .28; st.rotation.y += dt * 2; });
  // lightning on the storm ridge
  if (z > BIO_Z[4] - 10 && biomeW(z, B_STORM) > .5 && Math.random() < dt * .09) { GFX.flash = 1; setTimeout(() => sfx('thunder'), 300 + Math.random() * 900); }
  if (GFX.flash > 0) { hemi.intensity += GFX.flash * 1.6; skyMat.uniforms.uHor.value.offsetHSL(0, 0, GFX.flash * .25); GFX.flash = Math.max(0, GFX.flash - dt * 5); }
  const w = GFX.wx; if (!w) return;
  (GFX.spores || []).forEach(g => g.children.forEach(m => { const k = m.userData.ph; m.position.y = .3 + (k % 3) * .5 + Math.sin(GFX.t * .7 + k) * .35; m.rotation.y += dt * .2; m.material.opacity = .28 + Math.sin(GFX.t + k) * .06; }));
  // weather: roots = drifting spores, snow = snowfall, storm = slanted rain, volcano = ash
  const up = z > BIO_Z[1] - 12, wt = up ? [0, biomeW(z, B_ROOT) * .6, 0, biomeW(z, B_SNOW), biomeW(z, B_STORM), biomeW(z, B_VOLC)] : [0, 0, 0, 0, 0, 0];
  let kind = 0; for (let k = 1; k < 6; k++) if (wt[k] > wt[kind]) kind = k; const a = wt[kind];
  w.material.opacity = a * .9; w.visible = a > .01; if (!w.visible) return;
  const WX_ = { 1: [0xb8f06a, .12, -.35], 3: [0xffffff, .16, 2.2], 4: [0xb8c6d8, .09, 14], 5: [0x4a4044, .11, 1.1] }[kind] || [0xffffff, .1, 1];
  w.material.color.setHex(WX_[0]); w.material.size = WX_[1];
  const gust = kind === 4 && tWorld != null ? gustAt(tWorld) : null, drift = kind === 4 ? (gust && gust.on ? gust.dir * 9 : 3) : .4;
  const p = w.geometry.attributes.position.array, sp = WX_[2], cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
  for (let i = 0; i < p.length; i += 3) {
    p[i + 1] -= sp * dt * (1 + (i % 7) * .08); p[i] += (kind === 4 ? drift : Math.sin(GFX.t + i) * drift) * dt;
    if (p[i + 1] < cy - 20) p[i + 1] += 40; if (p[i + 1] > cy + 20) p[i + 1] -= 40;
    if (p[i] < cx - 30) p[i] += 60; if (p[i] > cx + 30) p[i] -= 60; if (p[i + 2] < cz - 30) p[i + 2] += 60; if (p[i + 2] > cz + 30) p[i + 2] -= 60;
  }
  w.geometry.attributes.position.needsUpdate = true;
}
// ---------------------------------------------------------------- models made in code for the upper biomes, suitcases and the thermos
function procModels() {
  if (GFX.models.cactus) return;
  const col = h => new THREE.Color(h).convertSRGBToLinear(), mats = {}, M = h => mats[h] || (mats[h] = new THREE.MeshStandardMaterial({ color: col(h) }));
  const grp = (name, parts) => { const g = new THREE.Group(); g.name = name; for (const [geo, hex, x, y, z, rx, ry, rz, sx, sy, sz] of parts) { const m = new THREE.Mesh(geo, M(hex)); m.position.set(x || 0, y || 0, z || 0); m.rotation.set(rx || 0, ry || 0, rz || 0); if (sx) m.scale.set(sx, sy || sx, sz || sx); g.add(m); } GFX.models[name] = g; return g; };
  const cyl = (r1, r2, h, n) => new THREE.CylinderGeometry(r1, r2, h, n || 8), sph = (r, a, b) => new THREE.SphereGeometry(r, a || 10, b || 7), cone = (r, h, n) => new THREE.ConeGeometry(r, h, n || 8);
  const rock = (r, seed, det) => { const g = new THREE.IcosahedronGeometry(r, det || 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (hash2(Math.round(p.getX(i) * 97), Math.round(p.getY(i) * 89) + Math.round(p.getZ(i) * 83) * 131, seed) - .5) * .34; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } g.computeVertexNormals(); return g; };
  const G = '#4f9a4a', G2 = '#3d7f3a';
  grp('cactus', [[cyl(.32, .36, 3.2, 10), G, 0, 1.6], [sph(.32, 10, 6), G, 0, 3.2], [cyl(.2, .22, .9, 8), G2, .5, 1.35, 0, 0, 0, 1.57], [cyl(.2, .2, 1.1, 8), G2, .92, 1.85], [sph(.2), G2, .92, 2.4], [cyl(.18, .2, .7, 8), G2, -.45, 1.9, 0, 0, 0, -1.57], [cyl(.18, .18, .9, 8), G2, -.78, 2.3], [sph(.18), G2, -.78, 2.75], [sph(.11, 6, 4), '#ff6fa2', 0, 3.5], [sph(.09, 6, 4), '#ffd84a', .92, 2.6]]);
  grp('pine_snow', [[cyl(.28, .34, 2.2, 7), '#5a3b26', 0, 1.1], [cone(2.0, 2.3), '#2c6b4c', 0, 3.3], [cone(1.25, 1.1), '#f4f8ff', 0, 3.95], [cone(1.6, 2.1), '#2c6b4c', 0, 4.6], [cone(1.0, 1.0), '#f4f8ff', 0, 5.2], [cone(1.15, 1.8), '#2c6b4c', 0, 5.8], [cone(.72, .9), '#f4f8ff', 0, 6.35]]);
  grp('rock_red_a', [[rock(1, 3), '#c45a36', 0, .7, 0, 0, 0, 0, 1.25, .95, 1.1], [rock(.55, 4), '#e09058', .8, .35, .3]]);
  grp('rock_red_b', [[rock(1, 5), '#b8502f', 0, 1.0, 0, 0, 0, 0, .9, 1.35, .9], [rock(.7, 6), '#d9824a', 0, 2.1, 0, 0, 0, 0, 1.2, .5, 1.1]]);
  grp('rock_basalt', [[rock(1, 7, 0), '#3d3639', 0, .65, 0, 0, 0, 0, 1.2, .9, 1.05], [rock(.5, 8, 0), '#2a2527', .75, .3, .35]]);
  grp('rock_ice', [[rock(1, 9), '#cfe6f6', 0, .65, 0, 0, 0, 0, 1.2, .85, 1.1], [rock(.6, 10), '#9fc2dd', .7, .35, .2], [rock(.75, 11), '#ffffff', -.1, 1.15, 0, 0, 0, 0, 1.1, .35, 1]]);
  grp('vent', [[cyl(1.15, 1.4, .35, 14), '#2a2527', 0, .1], [cyl(.75, .75, .38, 14), '#d8c34a', 0, .12], [cyl(.55, .55, .4, 12), '#141012', 0, .13], ...[0, 1, 2, 3, 4, 5].map(k => [rock(.4, 20 + k, 0), '#3d3639', Math.cos(k) * 1.45, .2, Math.sin(k) * 1.45])]);
  grp('mush_giant', [[cyl(.32, .45, 2.6, 10), '#efe6d6', 0, 1.3], [new THREE.SphereGeometry(1.5, 14, 8, 0, 6.2832, 0, 1.45), '#8a4fc2', 0, 2.25, 0, 0, 0, 0, 1, .62, 1], [cyl(1.38, 1.38, .1, 14), '#d8c8f0', 0, 2.3], ...[0, 1, 2, 3, 4].map(k => [sph(.16, 6, 4), '#f4e66a', Math.cos(k * 1.3) * .9, 2.95 - (k % 2) * .2, Math.sin(k * 1.3) * .9])]);
  grp('root_arch', [[new THREE.TorusGeometry(1.8, .32, 7, 14, Math.PI), '#4a3424', 0, 0, 0, 0, 0, 0], [new THREE.TorusGeometry(1.2, .22, 6, 12, Math.PI), '#5a3b26', .9, 0, .7, 0, .6, 0], [sph(.42, 8, 6), '#2f5a2a', -1.8, .2, 0, 0, 0, 0, 1.3, .6, 1.2]]);
  grp('it_tea', [[cyl(.08, .08, .3, 10), '#c9d2da', 0, .15], [cyl(.085, .085, .1, 10), '#d8403a', 0, .34], [cyl(.084, .084, .06, 10), '#2e6fc4', 0, .12]]);
  ['#c0353a', '#2e6fc4', '#3f9a4a', '#e0a020'].forEach((c, k) => {
    grp('bag_base_' + k, [[new THREE.BoxGeometry(.9, .24, .6), c, 0, .12], [new THREE.BoxGeometry(.92, .03, .62), '#59616b', 0, .24], [new THREE.BoxGeometry(.06, .25, .62), '#3a2a22', -.3, .125], [new THREE.BoxGeometry(.06, .25, .62), '#3a2a22', .3, .125]]);
    grp('bag_lid_' + k, [[new THREE.BoxGeometry(.9, .12, .6), c, 0, .06, .3], [new THREE.BoxGeometry(.24, .05, .06), '#1b1b22', 0, .05, .63], [new THREE.BoxGeometry(.06, .125, .62), '#3a2a22', -.3, .06, .3], [new THREE.BoxGeometry(.06, .125, .62), '#3a2a22', .3, .06, .3]]);
  });
}

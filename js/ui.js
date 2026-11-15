// Survivors - menus, lobby, settings, input, boot.
'use strict';
// private links (Discord invite) are not in the source code: tools/build.js injects them, scrambled, into the packed game
// from secrets.local.json (kept out of git). In dev mode the file is read from the local server.
const SECRETS = { d: typeof __SECRETS__ !== 'undefined' ? __SECRETS__.d : null };
function unveil(v) { if (!v) return null; const b = atob(v); let k = 0x5c, o = ''; for (let i = 0; i < b.length; i++) { o += String.fromCharCode(b.charCodeAt(i) ^ k); k = (k * 31 + 7) & 255; } return o; }
function openDiscord() { const u = unveil(SECRETS.d); if (u) window.open(u, '_blank', 'noopener'); }
function loadDevSecrets() { if (SECRETS.d) return Promise.resolve(); return fetch('secrets.local.json').then(r => r.ok ? r.json() : null).then(j => { if (j && j.discord) SECRETS.d = veil(j.discord); }).catch(() => { }); }
function veil(t) { let k = 0x5c, o = ''; for (let i = 0; i < t.length; i++) { o += String.fromCharCode(t.charCodeAt(i) ^ k); k = (k * 31 + 7) & 255; } return btoa(o); }
const ui = { paused: false, cur: 'loading', thumbs: [],
  show(n) { ui.cur = n; document.body.classList.toggle('playing', n === 'hud'); for (const s of ['loading', 'menu', 'lobby', 'hud', 'win']) $(s).style.display = s === n ? (s === 'hud' ? 'block' : 'flex') : 'none'; ui.pause(false); $('logoBg').style.display = n === 'hud' ? 'none' : 'block'; },
  pause(v) { ui.paused = v; $('pause').style.display = v ? 'flex' : 'none'; if (!v) $('settings').style.display = 'none'; },
  err(k) { $('menuErr').textContent = k ? T(k) : ''; }
};
function charGrid(el) {
  el.innerHTML = ui.thumbs.map((src, i) => `<div class="chr${i === SAVE.ch ? ' sel' : ''}" data-c="${i}"><img src="${src}" alt=""><span>${T('char' + i)}</span></div>`).join('');
  el.querySelectorAll('.chr').forEach(d => d.onclick = () => { SAVE.ch = +d.dataset.c; saveAll(); charGrid($('charsMenu')); charGrid($('charsLobby')); sendMe(); });
}
function sendMe() {
  if (ui.cur !== 'lobby') return;
  if (Net.isHost) { const p = Host.roster.get(Net.id); if (p) { p.c = SAVE.ch; hostLobby(); } } else Net.toHost({ t: 'c', c: SAVE.ch, n: SAVE.name });
}
function onLobby(l) {
  lobby = l; $('roomCode').textContent = l.code || Net.code;
  $('playerList').innerHTML = l.players.map(p => `<div class="pl"><img src="${ui.thumbs[p.c] || ''}" alt=""><b>${esc(p.n)}</b><span>${T('char' + p.c)}${p.id === 'h' ? ' ★' : ''}</span></div>`).join('') + '<div class="pl empty">+</div>'.repeat(Math.max(0, 6 - l.players.length));
  $('btnStart').style.display = Net.isHost ? 'inline-block' : 'none'; $('lobbyWait').style.display = Net.isHost ? 'none' : 'block';
  $('lobbySolo').style.display = Net.isHost && l.players.length < 2 ? 'block' : 'none';
  for (const p of l.players) { const o = OTH.get(p.id); if (o && (o.c !== p.c || o.n !== p.n)) { scene.remove(o.g); OTH.delete(p.id); } }
}
function myName() { let n = $('name').value.trim().slice(0, 14); if (!n) n = T('char' + SAVE.ch); SAVE.name = $('name').value.trim().slice(0, 14); saveAll(); return n; }
function createRoom(tries) {
  ui.err(''); audioInit();
  const code = (/[?&]room=(\w+)/.exec(location.search) || [])[1] || Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[(Math.random() * 24) | 0]).join('');
  Net.onMsg = (from, m) => hostMsg(from, m); Net.onLeave = id => hostLeave(id); Net.onJoin = null;
  Net.host(code, e => {
    if (e === 'taken' && (tries || 0) < 4 && !/[?&]room=/.test(location.search)) return createRoom((tries || 0) + 1);
    if (e) return ui.err(e === 'taken' ? 'e_taken' : 'e_net');
    Host.roster = new Map([[Net.id, { n: myName(), c: SAVE.ch }]]); Host.S = new Map(); Host.started = false; Host.W = null; ME.id = Net.id;
    phase = 'lobby'; ui.show('lobby'); hostLobby();
  });
}
function joinRoom() {
  ui.err(''); audioInit(); const code = $('code').value.trim().toUpperCase(); if (code.length < 3) return ui.err('e_noroom');
  SAVE.code = code; saveAll();
  Net.onMsg = (from, m) => { if (m.t === 'lobby') onLobby(m); else if (m.t === 'start') onStart(m); else if (m.t === 'ps') onStates(m); else if (m.t === 'W') onWorld(m.W); else if (m.t === 'ev') onEv(m); else if (m.t === 'full') { leave(); ui.err('e_full'); } };
  Net.onLeave = () => { if (phase !== 'menu') { leave(); ui.err('t_hostlost'); } };
  Net.join(code, e => { if (e) return ui.err(e === 'noroom' ? 'e_noroom' : e === 'timeout' ? 'e_timeout' : 'e_net'); ME.id = Net.id; Net.toHost({ t: 'hi', n: myName(), c: SAVE.ch }); phase = 'lobby'; ui.show('lobby'); $('roomCode').textContent = code; });
}
function leave() { Net.close(); phase = 'menu'; WS = null; OTH.forEach(o => scene.remove(o.g)); OTH.clear(); if (ME.g) { scene.remove(ME.g); ME.g = null; } document.exitPointerLock(); ui.show('menu'); }
function bindSettings() {
  const R = (id, key, after) => { const el = $(id); if (el.type === 'checkbox') el.checked = !!SET[key]; else el.value = SET[key]; el.oninput = el.onchange = () => { SET[key] = el.type === 'checkbox' ? (el.checked ? 1 : 0) : +el.value; saveAll(); after && after(); }; };
  R('s_sens', 'sens'); R('s_inv', 'invY'); R('s_fov', 'fov', applyGfxSettings); R('s_shadows', 'shadows', applyGfxSettings); R('s_bright', 'bright', applyGfxSettings); R('s_quality', 'quality', applyGfxSettings); R('s_dist', 'dist', applyGfxSettings);
  R('s_vol', 'vol', () => { if (master) master.gain.value = SET.vol / 100; }); R('s_fps', 'fps', () => { $('fps').style.display = SET.fps ? 'block' : 'none'; });
  $('fps').style.display = SET.fps ? 'block' : 'none';
  const ls = $('lang'); ls.innerHTML = Object.keys(LANGS).map(k => `<option value="${k}">${LANGS[k]}</option>`).join(''); ls.value = LANG;
  ls.onchange = () => { SAVE.lang = ls.value; saveAll(); setLang(ls.value); charGrid($('charsMenu')); charGrid($('charsLobby')); if (lobby.players.length) onLobby(lobby); drawInv(); $('howText').textContent = T('how_text'); };
}
function bindInput() {
  const cv = $('game');
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (phase === 'intro') { if (['Space', 'Enter', 'Escape'].includes(e.code)) { e.preventDefault(); endIntro(); } return; }
    if (phase !== 'play') return;
    if (e.code === 'Tab') { e.preventDefault(); if (!e.repeat) toggleInv(); return; }
    if (e.code === 'Escape') { if (invOpen) toggleInv(false); else if (mapOpen >= 0) showMap(mapOpen); return; }
    if (e.code === 'Space') e.preventDefault();
    KEY[e.code] = true; if (e.repeat || ui.paused) return;
    if (e.code === 'KeyE') pressE(); else if (e.code === 'KeyF') useItem(); else if (e.code === 'KeyG') dropItem(ME.quick, ME.sel);
    else if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') { ME.sel = +e.code.slice(5) - 1; drawInv(); }
    else if (e.code === 'KeyR' && ME.ko && (ME.koT > 8 || !OTH.size)) respawn();
    else if (e.code === 'KeyP') ui.pause(!ui.paused);
  });
  addEventListener('keyup', e => { KEY[e.code] = false; if (e.code === 'Space') KEY._jl = false; });
  addEventListener('blur', () => { for (const k in KEY) KEY[k] = false; });
  cv.addEventListener('mousedown', e => { if (phase !== 'play' || ui.paused) return; audioInit(); if (document.pointerLockElement !== cv) { if (!invOpen) lockPointer(); } else if (e.button === 0) useItem(); });
  addEventListener('mousemove', e => { if (document.pointerLockElement !== cv || phase !== 'play') return; const s = .0006 + SET.sens / 100 * .005; CAM.yaw -= e.movementX * s; CAM.pitch = clamp(CAM.pitch + e.movementY * s * (SET.invY ? -1 : 1), -.75, 1.35); });
  addEventListener('wheel', e => { if (phase !== 'play' || invOpen) return; ME.sel = (ME.sel + (e.deltaY > 0 ? 1 : 2)) % 3; drawInv(); }, { passive: true });
  let hadLock = false;
  document.addEventListener('pointerlockchange', () => { const l = document.pointerLockElement === cv; if (!l && hadLock && phase === 'play' && !invOpen) ui.pause(true); hadLock = l; });
  const slotH = e => { const s = e.target.closest('.slot'); if (!s) return; e.preventDefault(); invClick(s.dataset.s, e.type === 'contextmenu'); };
  for (const id of ['quick', 'packslots']) { $(id).addEventListener('click', slotH); $(id).addEventListener('contextmenu', slotH); }
  $('btnCreate').onclick = () => createRoom(); $('btnJoin').onclick = joinRoom; $('code').addEventListener('keydown', e => { if (e.code === 'Enter') joinRoom(); });
  $('btnStart').onclick = () => { if (Net.isHost) hostBegin(); };
  $('btnLeaveLobby').onclick = leave; $('btnLeave').onclick = leave;
  $('btnCopy').onclick = () => { try { navigator.clipboard.writeText(Net.code); toast(T('t_copied')); } catch (e) { } };
  for (const b of document.querySelectorAll('.btnSettings')) b.onclick = () => { $('settings').style.display = 'flex'; };
  $('btnSetClose').onclick = () => { $('settings').style.display = 'none'; };
  for (const b of document.querySelectorAll('.btnDiscord')) { b.onclick = openDiscord; b.style.display = SECRETS.d ? '' : 'none'; }
  $('btnHow').onclick = () => { $('how').style.display = 'flex'; }; $('btnHowClose').onclick = () => { $('how').style.display = 'none'; };
  $('btnResume').onclick = () => { ui.pause(false); lockPointer(); };
  $('btnRespawn').onclick = () => { ME.inj = Math.min(90, ME.inj + 10); respawn(); ui.pause(false); };
  $('btnAgain').onclick = () => { phase = 'lobby'; if (Net.isHost) { Host.started = false; hostLobby(); } ui.show('lobby'); };
  $('introSkip').onclick = () => endIntro();
  $('mapview').onclick = () => { if (mapOpen >= 0) showMap(mapOpen); };
}
async function boot() {
  await loadDevSecrets();
  LANG = SAVE.lang || detectLang(); setLang(LANG); $('howText').textContent = T('how_text');
  $('name').value = SAVE.name; $('code').value = (/[?&]join=(\w+)/.exec(location.search) || [])[1] || SAVE.code || '';
  const bar = v => { $('loadFill').style.width = Math.round(v * 100) + '%'; }, tick = () => new Promise(r => setTimeout(r, 15));
  try {
    initRenderer($('game')); bar(.1);
    await loadModels('assets/models.glb', p => bar(.1 + p * .4)); bar(.5); await tick();
    buildSky(); bar(.6); await tick(); buildWorldScene(); bar(.92); await tick();
    for (let i = 0; i < 6; i++) ui.thumbs.push(charThumb(i));
    applyGfxSettings(); bindSettings(); bindInput(); charGrid($('charsMenu')); charGrid($('charsLobby')); drawInv();
    phase = 'menu'; ui.show('menu'); requestAnimationFrame(frame);
    if (/[?&]auto=host/.test(location.search)) createRoom(); else if (/[?&]join=/.test(location.search) && /[?&]auto=1/.test(location.search)) joinRoom();
  } catch (e) { console.error(e); $('loadText').textContent = 'Error: ' + (e && e.message || e); }
}
if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot);

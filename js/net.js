// Survivors - rooms over PeerJS (host is the authority). ?local=1 uses BroadcastChannel (same-browser testing).
'use strict';
const Net = { isHost: false, id: '', peers: new Map(), peer: null, hostConn: null, onMsg: null, onJoin: null, onLeave: null, code: '' };
const NET_PREFIX = 'survivors-coop-v1-', LOCAL_NET = /[?&]local=1/.test(location.search);
Net.close = function () { try { if (Net.peer) Net.peer.destroy(); } catch (e) { } try { if (Net.bc) Net.bc.close(); } catch (e) { } Net.peer = null; Net.bc = null; Net.peers.clear(); Net.hostConn = null; };
Net.host = function (code, cb) {
  Net.close(); Net.isHost = true; Net.id = 'h'; Net.code = code;
  if (LOCAL_NET) {
    const bc = Net.bc = new BroadcastChannel(NET_PREFIX + code);
    bc.onmessage = e => { const d = e.data; if (d.to !== 'h') return; if (d.m.t === 'hi' && !Net.peers.has(d.from)) { Net.peers.set(d.from, { send: m => bc.postMessage({ to: d.from, from: 'h', m }) }); Net.onJoin && Net.onJoin(d.from); } if (d.m.t === 'bye') { Net.peers.delete(d.from); Net.onLeave && Net.onLeave(d.from); return; } Net.onMsg && Net.onMsg(d.from, d.m); };
    return setTimeout(() => cb(null), 10);
  }
  let done = false; const peer = Net.peer = new Peer(NET_PREFIX + code);
  peer.on('open', () => { done = true; cb(null); });
  peer.on('error', e => { if (!done) { done = true; cb(e.type === 'unavailable-id' ? 'taken' : 'net'); } });
  peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { } });
  peer.on('connection', c => {
    c.on('open', () => { Net.peers.set(c.peer, c); Net.onJoin && Net.onJoin(c.peer); });
    c.on('data', d => Net.onMsg && Net.onMsg(c.peer, d));
    c.on('close', () => { if (Net.peers.delete(c.peer)) Net.onLeave && Net.onLeave(c.peer); });
    c.on('error', () => { if (Net.peers.delete(c.peer)) Net.onLeave && Net.onLeave(c.peer); });
  });
};
Net.join = function (code, cb) {
  Net.close(); Net.isHost = false; Net.code = code;
  if (LOCAL_NET) {
    Net.id = 'p' + Math.random().toString(36).slice(2, 8);
    const bc = Net.bc = new BroadcastChannel(NET_PREFIX + code);
    bc.onmessage = e => { const d = e.data; if (d.to !== Net.id && d.to !== '*') return; Net.onMsg && Net.onMsg('h', d.m); };
    Net.hostConn = { send: m => bc.postMessage({ to: 'h', from: Net.id, m }) };
    window.addEventListener('beforeunload', () => Net.hostConn.send({ t: 'bye' }));
    return setTimeout(() => cb(null), 10);
  }
  let done = false; const peer = Net.peer = new Peer();
  const fail = r => { if (!done) { done = true; cb(r); } };
  const tm = setTimeout(() => fail('timeout'), 12000);
  peer.on('open', id => {
    Net.id = id;
    const c = peer.connect(NET_PREFIX + code, { reliable: true, serialization: 'json' });
    c.on('open', () => { clearTimeout(tm); Net.hostConn = c; if (!done) { done = true; cb(null); } });
    c.on('data', d => Net.onMsg && Net.onMsg('h', d));
    c.on('close', () => Net.onLeave && Net.onLeave('h'));
  });
  peer.on('error', e => { clearTimeout(tm); if (done && e.type !== 'peer-unavailable') return; fail(e.type === 'peer-unavailable' ? 'noroom' : 'net'); });
};
Net.send = function (to, m) { const c = Net.peers.get(to); if (c) try { c.send(m); } catch (e) { } };
Net.all = function (m) { if (LOCAL_NET && Net.bc) { Net.bc.postMessage({ to: '*', from: 'h', m }); return; } for (const c of Net.peers.values()) try { c.send(m); } catch (e) { } };
Net.toHost = function (m) { if (Net.hostConn) try { Net.hostConn.send(m); } catch (e) { } };

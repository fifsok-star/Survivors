// Survivors build: packs js/*.js into game.pak.js - compressed and scrambled, so the shipped game
// does not show readable code, puzzle answers or hidden spots. Run after every code change:  node tools/build.js
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..');
const FILES = ['i18n', 'world', 'gfx', 'net', 'host', 'skel', 'intro', 'fp', 'game', 'ui'].map(n => `js/${n}.js`);
// private links: read from secrets.local.json (not in git) and stored scrambled inside the packed build only
let secrets = {}; try { secrets = JSON.parse(fs.readFileSync(path.join(ROOT, 'secrets.local.json'), 'utf8')); } catch (e) { console.warn('no secrets.local.json - the Discord button will be hidden'); }
const veil = t => { let k = 0x5c, o = ''; for (let i = 0; i < t.length; i++) { o += String.fromCharCode(t.charCodeAt(i) ^ k); k = (k * 31 + 7) & 255; } return Buffer.from(o, 'latin1').toString('base64'); };
let src = "'use strict';\nconst __SECRETS__ = " + JSON.stringify({ d: secrets.discord ? veil(secrets.discord) : null }) + ";\n" + FILES.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^\s*'use strict';\s*$/m, '')).join('\n;\n');
const raw = zlib.deflateRawSync(Buffer.from(src, 'utf8'), { level: 9 });
// scramble with a keystream derived from the build's own salt
const salt = (Date.now() ^ (Math.random() * 1e9)) >>> 0, out = Buffer.alloc(raw.length);
let s = salt;
for (let i = 0; i < raw.length; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; out[i] = raw[i] ^ (s >>> 24); }
const b64 = out.toString('base64');
const loader = `/* Survivors */(()=>{const d=atob(${JSON.stringify(b64)}),n=d.length,u=new Uint8Array(n);let s=${salt};for(let i=0;i<n;i++){s=(Math.imul(s,1664525)+1013904223)>>>0;u[i]=d.charCodeAt(i)^(s>>>24);}new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text().then(t=>{(0,eval)(t);});})();\n`;
fs.writeFileSync(path.join(ROOT, 'game.pak.js'), loader);
console.log('game.pak.js', (loader.length / 1024).toFixed(0) + ' kB from', (src.length / 1024).toFixed(0) + ' kB of source');

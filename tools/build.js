// Survivors build: packs js/*.js into game.pak.js - compressed and scrambled, so the shipped game
// does not show readable code, puzzle answers or hidden spots. Run after every code change:  node tools/build.js
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..');
const FILES = ['i18n', 'world', 'gfx', 'net', 'host', 'game', 'ui'].map(n => `js/${n}.js`);
let src = "'use strict';\n" + FILES.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^\s*'use strict';\s*$/m, '')).join('\n;\n');
const raw = zlib.deflateRawSync(Buffer.from(src, 'utf8'), { level: 9 });
// scramble with a keystream derived from the build's own salt
const salt = (Date.now() ^ (Math.random() * 1e9)) >>> 0, out = Buffer.alloc(raw.length);
let s = salt;
for (let i = 0; i < raw.length; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; out[i] = raw[i] ^ (s >>> 24); }
const b64 = out.toString('base64');
const loader = `/* Survivors */(()=>{const d=atob(${JSON.stringify(b64)}),n=d.length,u=new Uint8Array(n);let s=${salt};for(let i=0;i<n;i++){s=(Math.imul(s,1664525)+1013904223)>>>0;u[i]=d.charCodeAt(i)^(s>>>24);}new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text().then(t=>{(0,eval)(t);});})();\n`;
fs.writeFileSync(path.join(ROOT, 'game.pak.js'), loader);
console.log('game.pak.js', (loader.length / 1024).toFixed(0) + ' kB from', (src.length / 1024).toFixed(0) + ' kB of source');

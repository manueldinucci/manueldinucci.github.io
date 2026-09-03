const fs = require('fs');
const assert = require('assert');
const html = fs.readFileSync('index.html','utf8');
const app = fs.readFileSync('app.js','utf8');
const css = fs.readFileSync('style.css','utf8');
const sw = fs.readFileSync('service-worker.js','utf8');

assert(!html.includes('slotMapSubtitle'), 'slot map subtitle element must be removed');
assert(!app.includes('slotMapSubtitle'), 'slot map subtitle runtime reference must be removed');
assert(!app.includes('graduatoria personale residua'), 'slot map redundant subtitle copy must be removed');
assert(css.includes('.slot-map-player {') && css.includes('font-size:12px'), 'slot map player names must be increased by 0.5px');
assert(css.includes('.slot-map-player { font-size:11.5px; }'), 'narrow viewport slot map names must also be increased by 0.5px');
assert(css.includes('font-weight:650'), 'slot map player font weight must remain unchanged');
const cacheMatch = sw.match(/fantacalcio-checklist-v(\d+)\.(\d+)/);
assert(cacheMatch && (Number(cacheMatch[1]) > 31 || (Number(cacheMatch[1]) === 31 && Number(cacheMatch[2]) >= 4)), 'service worker cache must be v31.4 or newer');
console.log('v31.4 static checks OK');

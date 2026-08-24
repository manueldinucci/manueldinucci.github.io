const fs = require('fs');
const assert = require('assert');
const app = fs.readFileSync('app.js','utf8');
const css = fs.readFileSync('style.css','utf8');
const sw = fs.readFileSync('service-worker.js','utf8');

assert(app.includes("function slotMapNamesMarkup(players)"), 'slot map must use shared inline names markup');
assert(app.includes("join('&nbsp;· ')") || app.includes("join('&nbsp;· ');"), 'slot map separator must be joined inline with a non-breaking leading space');
assert(!css.includes(".slot-map-player + .slot-map-player::before"), 'legacy pseudo-element separator must be removed');
assert(css.includes('.slot-map-names { min-width:0; display:block;'), 'slot map names must use normal inline text flow');
assert(app.includes("const slots = role === 'P' ? ['S1','S2','S3','S4'] : ['S1','S2','S3','S4','S5'];"), 'goalkeepers must omit S5 while other roles include it');
assert(app.includes("state.managers.find(manager => manager?.isMe)"), 'FAB must derive from the manager marked Io');
assert(app.includes("FAB: ${model.need == null ? '—' : model.need}"), 'FAB label must be rendered');
assert(app.includes(".join(' | ')") || app.includes("join(' | ')"), 'slot counts must use pipe separators');
assert(css.includes('.demand-fab { flex:0 0 auto;'), 'FAB must stay on the right as a fixed flex item');
assert(sw.includes("fantacalcio-checklist-v31.5"), 'service worker cache must be v31.5');
console.log('v31.5 static checks OK');

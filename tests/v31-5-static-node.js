const fs = require('fs');
const assert = require('assert');
const app = fs.readFileSync('app.js','utf8');
const css = fs.readFileSync('style.css','utf8');
const sw = fs.readFileSync('service-worker.js','utf8');

assert(app.includes("function slotMapNamesMarkup(players)"), 'slot map must use shared inline names markup');
assert(app.includes("join('&nbsp;· ')") || app.includes('slot-map-separator'), 'slot map inline separator missing');
assert(!css.includes(".slot-map-player + .slot-map-player::before"), 'legacy pseudo-element separator must be removed');
assert(css.includes('.slot-map-names { min-width:0; display:block;'), 'slot map names must use normal inline text flow');
assert(app.includes("const slots = role === 'P' ? ['S1','S2','S3','S4'] : ['S1','S2','S3','S4','S5'];"), 'goalkeepers must omit S5 while other roles include it');
assert(app.includes('function getRoleNeeds(role)') || app.includes("state.managers.find(manager => manager?.isMe)"), 'FAB derivation helper must exist');
if (sw.includes('fantacalcio-checklist-v31.10') || sw.includes('fantacalcio-checklist-v32')) assert(!app.includes('FAB: ${model.needs.fab'), 'v31.10 must not render FAB');
else assert(app.includes('FAB: ${model.needs.fab == null') || app.includes("FAB: ${model.need == null ? '—' : model.need}"), 'FAB label must be rendered');
assert(app.includes(".join(' | ')") || app.includes("join(' | ')") || app.includes('demand-slot-separator'), 'slot counts must use pipe separators');
assert(css.includes('.demand-fab { flex:0 0 auto;'), 'FAB must stay on the right as a fixed flex item');
assert(/fantacalcio-checklist-v31\.(?:[5-9]|[1-9]\d+)/.test(sw) || sw.includes('fantacalcio-checklist-v32'), 'service worker cache must be v31.5 or a compatible successor');
console.log('v31.5 static checks OK');

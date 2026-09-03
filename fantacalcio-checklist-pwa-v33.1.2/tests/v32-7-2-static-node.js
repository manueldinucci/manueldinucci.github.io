const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const db = fs.readFileSync(path.join(root, 'db.js'), 'utf8');
function ok(cond,msg){ if(!cond) throw new Error(msg); }

ok(app.includes('let slotMapInlineLayoutQueue = [];'), 'semantic compact layout queue missing');
ok(app.includes('function layoutSlotMapInlineGroups(root, groups)'), 'semantic compact layout function missing');
ok(app.includes("startRow(group.label || 'n.c.'"), 'new micro-band must be able to start with external Target');
ok(app.includes('startContinuationRow('), 'same-band continuation row support missing');
ok(app.includes('slotMapInlineSeparatorMarkup(true)'), 'group-boundary separator logic missing');
ok(app.includes('slotMapInlineSeparatorMarkup(false)'), 'same-group separator logic missing');
ok(app.includes('slotMapInlineMeasureNameText'), 'deterministic width measurement markup missing');
ok(app.includes('probeNames.scrollWidth <= probeNames.clientWidth + 0.75'), 'subpixel fit test missing');
ok(app.includes('layoutSlotMapInlineQueue();'), 'compact semantic layout not invoked after render');
ok(/\.slot-map-inline-layout\s*\{[\s\S]*?padding:\s*3px var\(--map-row-pad-x\) 4px;/.test(css), 'compact outer density changed/missing');
ok(/\.slot-map-inline-first-target,\s*\n\.slot-map-inline-target,\s*\n\.slot-map-band-label\s*\{[\s\S]*?font-size:\s*9\.25px;[\s\S]*?font-weight:\s*650;[\s\S]*?line-height:\s*1\.28;[\s\S]*?color:\s*#62666b;/.test(css), 'Target typography is not shared');
ok(/\.slot-map-inline-measure-row \.slot-map-inline\s*\{[\s\S]*?white-space:\s*nowrap;/.test(css), 'measurement row must not browser-wrap');
ok(css.includes('/* v32.6.1 — hotfix: Target sulla baseline della prima riga nomi. */'), 'v32.6.1 baseline fix lost');
ok(css.includes('.slot-map-player.favorite'), 'v32.7 favorite styling lost');
ok(app.includes("return role !== 'P' && slot === 'S1';"), 'v32.7 role layout rule changed');
ok(db.includes('version: 5'), 'backup version changed');
ok(sw.includes("const CACHE_NAME = 'fantacalcio-checklist-v32.7.2';"), 'cache must be v32.7.2 exactly');
console.log('v32.7.2 static checks: OK');

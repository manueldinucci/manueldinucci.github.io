const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const db = fs.readFileSync(path.join(root, 'db.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
function ok(cond, msg){ if(!cond) throw new Error(msg); }

if (/fantacalcio-checklist-v32\.[45]/.test(sw)) {
  ok(!html.includes('slotMapSlotIndex'), 'v32.4+ must keep Slot index removed');
  ok(app.includes('data-slot-map-toggle='), 'v32.4+ must preserve collapsible Slot headers');
  ok(app.includes("if (slot === 'S1' || slot === 'S2')"), 'v32.4+ must preserve deterministic S1/S2 inline layout');
  ok(css.includes('/* v32.4 — Mappa Slot:'), 'v32.4 baseline CSS block missing');
  console.log('v32.3 static checks superseded by v32.4+ minimal map styling: OK');
  process.exit(0);
}

ok(!html.includes('slotMapSlotIndex'), 'v32.3 must remove Slot index container');
ok(!app.includes('renderSlotMapIndex'), 'v32.3 must remove Slot index renderer');
ok(!app.includes('data-slot-map-index='), 'v32.3 must remove Slot index controls');
ok(!app.includes('scrollSlotMapTo('), 'v32.3 must remove Slot index navigation');
ok(!app.includes('updateSlotMapActiveIndex'), 'v32.3 must remove active Slot sync');
ok(!app.includes('slotMapActiveSlot'), 'v32.3 must remove active Slot state');
ok(app.includes('slotMapCollapsed: {}'), 'accordion transient state must remain');
ok(app.includes('data-slot-map-toggle='), 'collapsible Slot headers must remain');
ok(app.includes('position: sticky') || css.includes('position: sticky'), 'sticky Slot headers must remain');

ok(app.includes("if (slot === 'S1' || slot === 'S2')"), 'S1/S2 deterministic inline branch missing');
ok(app.includes('slotMapInlineGroupsMarkup(grouped)'), 'S1/S2 inline renderer missing');
ok(app.includes('slot-map-inline-target'), 'inline Target prefix missing');
ok(app.includes('slot-map-band') && app.includes('slot-map-band-label'), 'S3+ analytical table missing');
ok(app.includes("const inlineClass = slot === 'S1' || slot === 'S2'"), 'inline class must depend on Slot, not remaining count');

ok(app.includes("index < players.length - 1 ? '<span class=\"slot-map-separator\" aria-hidden=\"true\"> ·</span>' : ''"), 'separator must be appended to previous player');
ok(app.includes("}).join(' ');"), 'player units need break opportunity between units');
ok(css.includes('.slot-map-player-unit') && css.includes('white-space: nowrap'), 'separator/name unit must stay together');
ok(css.includes('list-style: none'), 'list markers must be explicitly disabled');
ok(css.includes('::marker'), 'marker pseudo-element must be neutralized');

ok(css.includes('/* v32.3 — Mappa Slot:'), 'v32.3 CSS block missing');
ok(css.includes('background: #f1f2f4'), 'map grayscale background missing');
ok(css.includes('background: #e7e9ec'), 'Slot header grayscale band missing');
ok(css.includes('.slot-map-band.odd') && css.includes('.slot-map-band.even'), 'S3+ subtle row hierarchy missing');
ok(css.includes('border-right: 1px solid #d7dadf'), 'Target rail missing');
ok(!css.includes('.slot-map-index-btn'), 'superseded Slot index CSS must be removed');

ok(db.includes('version: 5'), 'backup version must remain 5');
ok(sw.includes("const CACHE_NAME = 'fantacalcio-checklist-v32.3';"), 'cache must be v32.3 exactly');
ok((html.match(/class="header-icon-btn/g) || []).length === 5, 'main toolbar must remain five controls');
console.log('v32.3 static checks: OK');

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const db = fs.readFileSync(path.join(root, 'db.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
function ok(cond, msg){ if(!cond) throw new Error(msg); }

ok(css.includes('/* v32.4 — Mappa Slot:'), 'v32.4 CSS block missing');
ok(!html.includes('slotMapSlotIndex'), 'Slot index must stay removed');
ok(!app.includes('renderSlotMapIndex') && !app.includes('data-slot-map-index='), 'Slot index logic must stay removed');
ok(app.includes("if (slot === 'S1' || slot === 'S2')"), 'S1/S2 inline branch missing');
ok(app.includes('slotMapInlineGroupsMarkup(grouped)'), 'S1/S2 inline renderer missing');
ok(app.includes('slot-map-band') && app.includes('slot-map-band-label'), 'S3+ categorized structure missing');
ok(app.includes('data-slot-map-toggle='), 'accordion headers missing');
ok(css.includes('.slot-map-slot-head') && css.includes('position: sticky'), 'sticky headers missing');

const v324 = css.slice(css.indexOf('/* v32.4 — Mappa Slot:'));
ok(v324.includes('grid-template-columns: 42px minmax(0, 1fr)'), 'compact Target column missing');
ok(v324.includes('border: 0;'), 'v32.4 must remove table borders');
ok(v324.includes('background: #f7f8f9'), 'minimal surface missing');
ok(v324.includes('.slot-map-band.odd') && v324.includes('.slot-map-band.even'), 'row override selectors missing');
ok(!v324.includes('border-right: 1px'), 'visible Target rail must not return');
ok(!v324.includes('border-bottom: 1px solid #d7dadf'), 'horizontal table lines must not return');
ok(v324.includes('min-height: 27px'), 'compact Slot header missing');
ok(v324.includes('line-height: 1.3'), 'compact names line-height missing');
ok(v324.includes('.slot-map-outside') && v324.includes('border: 0'), 'Fuori Slot minimal treatment missing');

ok(app.includes("<span class=\"slot-map-separator\" aria-hidden=\"true\"> ·</span>"), 'middle dot separator structure missing');
ok(css.includes('::marker') && css.includes('list-style: none'), 'marker defense must remain');
ok(!app.includes('one-credit-badge') || !app.slice(app.indexOf('function slotMapSectionMarkup'), app.indexOf('function renderSlotMapRoleTabs')).includes('one-credit-badge'), 'badge 1 must not appear in map renderer');
ok(db.includes('version: 5'), 'backup version must remain 5');
ok(sw.includes("const CACHE_NAME = 'fantacalcio-checklist-v32.4';"), 'cache must be v32.4 exactly');
ok((html.match(/class="header-icon-btn/g) || []).length === 5, 'toolbar must remain five controls');
console.log('v32.4 static checks: OK');

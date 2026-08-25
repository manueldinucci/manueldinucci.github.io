const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const db = fs.readFileSync(path.join(root, 'db.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
function ok(cond,msg){ if(!cond) throw new Error(msg); }

if (sw.includes("const CACHE_NAME = 'fantacalcio-checklist-v32.6';")) {
  ok(css.includes('/* v32.6 — Mappa Slot:'), 'v32.6 typographic-axis CSS missing');
  ok(app.includes('slot-map-inline-group'), 'v32.6 must preserve inline groups');
  console.log('v32.5 static checks superseded by v32.6 typographic alignment: OK');
  process.exit(0);
}

ok(css.includes('/* v32.5 — Mappa Slot:'), 'v32.5 CSS block missing');
ok(!html.includes('slotMapSlotIndex'), 'Slot index must stay removed');
ok(app.includes("if (slot === 'S1' || slot === 'S2')"), 'S1/S2 inline branch missing');
ok(app.includes('slot-map-inline-group'), 'inline Target groups missing');
ok(app.includes('slot-map-group-separator'), 'uniform group separator missing');
ok(app.includes('slot-map-outside-count'), 'Fuori Slot split count missing');
ok(app.includes('slot-map-outside-band'), 'Fuori Slot target/name grid missing');
ok(app.includes('data-slot-map-toggle='), 'accordion headers missing');
ok(css.includes('.slot-map-slot-head') && css.includes('position: sticky'), 'sticky header must remain');

const v325 = css.slice(css.indexOf('/* v32.5 — Mappa Slot:'));
ok(v325.includes('--map-target-width:'), 'Target width variable missing');
ok(v325.includes('--map-header-count-width:'), 'header count width variable missing');
ok(v325.includes('--map-chevron-width:'), 'chevron width variable missing');
ok(v325.includes('grid-template-columns: var(--map-header-count-width) var(--map-chevron-width)'), 'header meta fixed columns missing');
ok(v325.includes('grid-template-columns: var(--map-target-width) minmax(0, 1fr)'), 'Target/name invisible grid missing');
ok(v325.includes('text-align: right'), 'right Target/count alignment missing');
ok(v325.includes('.slot-map-outside summary'), 'Fuori Slot header styling missing');
ok(v325.includes('grid-template-columns: minmax(0, 1fr) var(--map-header-count-width) var(--map-chevron-width)'), 'Fuori Slot header grid missing');
ok(v325.includes('.slot-map-inline-lead') && v325.includes('display: inline-block') && v325.includes('white-space: nowrap'), 'Target + first player nowrap missing');
ok(!v325.includes('border-right: 1px'), 'vertical table divider must not return');

ok(css.includes('::marker') && css.includes('list-style: none'), 'marker defense must remain');
ok(db.includes('version: 5'), 'backup version must remain 5');
ok(sw.includes("const CACHE_NAME = 'fantacalcio-checklist-v32.5';"), 'cache must be v32.5 exactly');
ok((html.match(/class="header-icon-btn/g) || []).length === 5, 'toolbar must remain five controls');
console.log('v32.5 static checks: OK');

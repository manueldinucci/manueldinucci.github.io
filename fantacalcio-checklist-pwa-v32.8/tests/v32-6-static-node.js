const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const db = fs.readFileSync(path.join(root, 'db.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
function ok(cond,msg){ if(!cond) throw new Error(msg); }

ok(css.includes('/* v32.6 — Mappa Slot:'), 'v32.6 CSS block missing');
ok(app.includes("if (slot === 'S1' || slot === 'S2')"), 'S1/S2 inline logic changed');
ok(app.includes('slot-map-inline-group'), 'inline groups missing');
ok(app.includes('slot-map-outside-band'), 'Fuori Slot grid missing');
ok(app.includes('data-slot-map-toggle='), 'accordion missing');
ok(!html.includes('slotMapSlotIndex'), 'removed Slot index must not return');
ok(app.includes('aria-hidden="true">·</span>'), 'separator should be markup-only middle dot without leading whitespace');

const v326 = css.slice(css.indexOf('/* v32.6 — Mappa Slot:'));
ok(v326.includes('--map-target-width: 44px'), 'shared Target axis variable missing');
ok(v326.includes('--map-name-axis:'), 'shared name axis missing');
ok(v326.includes('grid-template-columns: var(--map-target-width) minmax(0, 1fr)'), 'Target/name grid missing');
ok(v326.includes('padding: 3px var(--map-header-pad-x) 4px var(--map-name-axis)'), 'S1/S2 must start at name axis');
ok(v326.includes('text-align: right'), 'right Target/count alignment missing');
ok(v326.includes('--map-header-count-width: 44px'), 'fixed count column missing');
ok(v326.includes('--map-chevron-width: 14px'), 'fixed chevron column missing');
ok(v326.includes('.slot-map-outside summary'), 'Fuori Slot aligned header missing');
ok(!v326.includes('border-right: 1px'), 'visible Target divider must not return');
ok(!v326.includes('border-bottom: 1px'), 'visible row grid must not return in v32.6 block');
ok(db.includes('version: 5'), 'backup version must remain 5');
ok(sw.includes("const CACHE_NAME = 'fantacalcio-checklist-v32.6';"), 'cache must be v32.6 exactly');
ok((html.match(/class="header-icon-btn/g) || []).length === 5, 'toolbar must remain unchanged');
console.log('v32.6 static checks: OK');

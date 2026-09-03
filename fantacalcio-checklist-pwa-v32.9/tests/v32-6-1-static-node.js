const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const db = fs.readFileSync(path.join(root, 'db.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
function ok(cond,msg){ if(!cond) throw new Error(msg); }

ok(css.includes('/* v32.6.1 — hotfix: Target sulla baseline della prima riga nomi. */'), 'v32.6.1 hotfix marker missing');
const hot = css.slice(css.indexOf('/* v32.6.1 — hotfix:'));
ok(hot.includes('align-items: baseline;'), 'Target/name grid must align on baseline');
ok(/\.slot-map-band-label\s*\{[\s\S]*?padding:\s*0;/.test(hot), 'Target top padding must be removed');
ok(hot.includes('grid-template-columns: var(--map-target-width) minmax(0, 1fr)'), 'Target/name horizontal grid changed');
ok(app.includes("if (slot === 'S1' || slot === 'S2')"), 'S1/S2 inline logic changed');
ok(app.includes('slot-map-outside-band'), 'Fuori Slot baseline target must reuse same grid');
ok(!html.includes('slotMapSlotIndex'), 'Slot index must remain absent');
ok(db.includes('version: 5'), 'backup version must remain 5');
ok(sw.includes("const CACHE_NAME = 'fantacalcio-checklist-v32.6.1';"), 'cache must be v32.6.1 exactly');
ok((html.match(/class="header-icon-btn/g) || []).length === 5, 'toolbar must remain unchanged');
console.log('v32.6.1 static checks: OK');

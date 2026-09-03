const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const db = fs.readFileSync(path.join(root, 'db.js'), 'utf8');
function ok(cond,msg){ if(!cond) throw new Error(msg); }

ok(app.includes("const semanticClass = row.target ? ' microtier-start' : ' microtier-continuation';"), 'compact semantic row classes missing');
ok(app.includes('function layoutSlotMapInlineGroups(root, groups)'), 'v32.7.2 semantic packer missing');
ok(app.includes('startContinuationRow('), 'same-microtier continuation support missing');
ok(css.includes('/* v32.8 — microfasce: ritmo verticale coerente + separatore ultra-light solo nella colonna Nomi. */'), 'v32.8 CSS block missing');
ok(css.includes('--map-microtier-divider: rgba(0, 0, 0, 0.05);'), 'ultra-light divider color changed/missing');
ok(css.includes('--map-microtier-compact-gap: calc(var(--map-row-pad-y) + var(--map-row-pad-y) + var(--map-row-gap) + 5px);'), 'compact/vertical rhythm formula missing');
ok(/\.slot-map-band \+ \.slot-map-band \.slot-map-names::before\s*\{[\s\S]*?content:\s*""\s*!important;[\s\S]*?left:\s*0;[\s\S]*?right:\s*0;[\s\S]*?height:\s*1px;[\s\S]*?background:\s*var\(--map-microtier-divider\);/.test(css), 'vertical divider must live only on names column');
ok(/\.slot-map-inline-layout \.slot-map-inline-row \+ \.slot-map-inline-row\.microtier-start\s*\{[\s\S]*?margin-top:\s*var\(--map-microtier-compact-gap\);/.test(css), 'compact new-microtier spacing missing');
ok(/\.slot-map-inline-layout \.slot-map-inline-row \+ \.slot-map-inline-row\.microtier-start \.slot-map-inline::before\s*\{[\s\S]*?content:\s*""\s*!important;[\s\S]*?left:\s*0;[\s\S]*?right:\s*0;[\s\S]*?height:\s*1px;/.test(css), 'compact divider must live only on names column');
ok(!/\.microtier-continuation[^\{]*\{[^\}]*border-top/.test(css), 'continuation rows must not receive divider');
ok(!/\.microtier-continuation[^\{]*\{[^\}]*margin-top/.test(css), 'continuation rows must not receive extra spacing');
ok(css.includes('pointer-events: none;'), 'decorative divider must not intercept pointer events');
ok(css.includes('/* v32.7.2 — hotfix semantico: microfasce compatte consapevoli delle righe fisiche. */'), 'v32.7.2 packing CSS lost');
ok(css.includes('.slot-map-player.favorite'), 'favorite styling lost');
ok(db.includes('version: 5'), 'backup version changed');
ok(sw.includes("const CACHE_NAME = 'fantacalcio-checklist-v32.8';"), 'cache must be v32.8 exactly');
console.log('v32.8 static checks: OK');

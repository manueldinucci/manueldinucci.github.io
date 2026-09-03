const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const db = fs.readFileSync(path.join(root, 'db.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
function ok(cond,msg){ if(!cond) throw new Error(msg); }

ok(app.includes("if (role === 'P') return ['S3','S4'];"), 'Portieri default S3/S4 collapsed missing');
ok(app.includes("if (role === 'C' || role === 'A') return ['S5'];"), 'Cen/Att S5 default collapsed missing');
ok(app.includes("return role !== 'P' && slot === 'S1';"), 'role-specific inline layout rule missing');
ok(app.includes('slotMapSectionMarkup(role, slot, players'), 'slot map section must receive role');
ok(!app.includes("sections.push(slotMapSectionMarkup('COPERTURE'"), 'Coperture must not render in map');
ok(app.includes("!(role === 'P' && isGoalkeeperCoverage(p))"), 'Coperture must remain excluded from Fuori Slot');
ok(app.includes("const favorite = p.preferito ? ' favorite' : '';"), 'favorite map class missing');
ok(css.includes('.slot-map-player.favorite'), 'favorite map CSS missing');
ok(/\.slot-map-player\.favorite\s*\{[\s\S]*?color:\s*var\(--favorite-star\);[\s\S]*?font-weight:\s*700;/.test(css), 'favorite must reuse gold variable + 700');
ok(css.includes('/* v32.6.1 — hotfix: Target sulla baseline della prima riga nomi. */'), 'v32.6.1 baseline fix lost');
ok(/\.slot-map-band,[\s\S]*?align-items:\s*baseline;/.test(css), 'baseline alignment lost');
ok(!html.includes('slotMapSlotIndex'), 'slot index must remain absent');
ok(db.includes('version: 5'), 'backup version must remain 5');
ok(sw.includes("const CACHE_NAME = 'fantacalcio-checklist-v32.7';"), 'cache must be v32.7 exactly');
ok((html.match(/class="header-icon-btn/g) || []).length === 5, 'toolbar must remain unchanged');
console.log('v32.7 static checks: OK');

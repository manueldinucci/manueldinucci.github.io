const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const db = fs.readFileSync(path.join(root, 'db.js'), 'utf8');
function ok(cond,msg){ if(!cond) throw new Error(msg); }

ok(app.includes('class="slot-map-inline-row"'), 'compact two-column row markup missing');
ok(app.includes('class="slot-map-inline-first-target"'), 'external first Target missing');
ok(app.includes("groupIndex > 0 && group.label"), 'only subsequent Targets must remain inline');
ok(/\.slot-map-inline-row\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*var\(--map-target-width\) minmax\(0, 1fr\);[\s\S]*?column-gap:\s*var\(--map-target-gap\);[\s\S]*?align-items:\s*baseline;/.test(css), 'compact row must reuse Target/Names grid');
ok(/\.slot-map-inline-first-target\s*\{[\s\S]*?width:\s*var\(--map-target-width\);[\s\S]*?text-align:\s*right;/.test(css), 'compact first Target geometry wrong');
ok(/\.slot-map-inline-row \.slot-map-inline\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?padding:\s*0;/.test(css), 'compact names column must own wrapping without left padding');
ok(css.includes('/* v32.6.1 — hotfix: Target sulla baseline della prima riga nomi. */'), 'v32.6.1 baseline fix lost');
ok(css.includes('.slot-map-player.favorite'), 'v32.7 favorite styling lost');
ok(app.includes("return role !== 'P' && slot === 'S1';"), 'v32.7 role layout rule changed');
ok(app.includes("if (role === 'P') return ['S3','S4'];"), 'P default accordion state changed');
ok(app.includes("if (role === 'C' || role === 'A') return ['S5'];"), 'C/A default accordion state changed');
ok(db.includes('version: 5'), 'backup version changed');
ok(sw.includes("const CACHE_NAME = 'fantacalcio-checklist-v32.7.1';"), 'cache must be v32.7.1 exactly');
console.log('v32.7.1 static checks: OK');

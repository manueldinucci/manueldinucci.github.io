const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
function ok(cond, msg){ if(!cond) throw new Error(msg); }

ok(!html.includes('id="liveRemaining"'), 'global Live remaining chip must be removed');
ok(!app.includes('freeRolePlayers'), 'global free-player count must be removed from Live');
ok(!app.includes('`${role} rimasti: ${freeRolePlayers}`'), 'global role remaining label must be removed');
ok(app.includes('const remaining = stats.roleRemaining[role];'), 'per-manager remaining count must use manager roleRemaining');
ok(app.includes('const roleText = `${role} rimasti ${remaining}`;'), 'per-manager role badge format must be role rimasti X');
ok(app.includes('class="manager-live-row"'), 'Live manager information must use one-row layout');
ok(app.includes('class="manager-role-badge"'), 'per-manager remaining value must use a badge');
ok(app.includes('class="manager-live-max"'), 'maxBid must remain in main Live row');
ok(app.includes('class="manager-live-budget"'), 'remaining budget must remain in main Live row');
ok(/\.manager-live-row\s*\{[\s\S]*?display:\s*flex;[\s\S]*?white-space:\s*nowrap;/m.test(css), 'Live manager primary information must stay on one row');
ok(/\.manager-role-badge\s*\{[\s\S]*?background:\s*var\(--surface-2\);/m.test(css), 'remaining slots must be visually badged');
ok(/\.assign-btn\s*\{[\s\S]*?width:\s*36px;[\s\S]*?height:\s*36px;/m.test(css), 'assign/unassign buttons must be 36x36 visually');
ok(/\.assign-btn::after\s*\{[^}]*inset:\s*-4px;/m.test(css), 'assign/unassign touch target must remain approximately 44px');
ok(sw.includes('fantacalcio-checklist-v15'), 'service worker cache must be v15');
console.log('v15 static tests: OK');

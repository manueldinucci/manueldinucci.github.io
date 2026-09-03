const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
function ok(cond, msg){ if(!cond) throw new Error(msg); }
const isV317 = /fantacalcio-checklist-v31\.(?:[7-9]|[1-9]\d+)/.test(sw);
if (isV317) {
  ok(!app.includes('data-view="live"'), 'v31.7 must not expose Live in navigation');
  ok(app.includes("const viewButtons = ['rose']"), 'v31.7 must expose Rose as the only dashboard tab');
  ok(!html.includes('id="managersSheet"'), 'v31.7 legacy Live sheet must be removed');
  ok(app.includes("if (view !== 'rose') return;"), 'v31.7 dashboard opener must reject Live');
  console.log('v15-static-node.js historical checks superseded by v31.7 Live removal: OK');
  process.exit(0);
}


ok(!html.includes('id="liveRemaining"'), 'global Live remaining chip must be removed');
ok(!app.includes('freeRolePlayers'), 'global free-player count must be removed from Live');
ok(!app.includes('`${role} rimasti: ${freeRolePlayers}`'), 'global role remaining label must be removed');
ok(app.includes('stats.roleRemaining[role]'), 'per-manager remaining count must use manager roleRemaining');
ok(app.includes('`${role} rimasti ${stats.roleRemaining[role]}`') || app.includes('`${role} rimasti ${remaining}`') || app.includes('`${role} - ${remaining} SLOT ${remaining === 1 ? \'RIMASTO\' : \'RIMASTI\'}`'), 'per-manager role badge must remain role-specific');
ok(app.includes('class="manager-live-row"'), 'Live manager information must use one-row layout');
ok(app.includes('class="manager-role-badge"'), 'per-manager remaining value must use a badge');
ok(app.includes('class="manager-live-max"'), 'maxBid must remain in main Live row');
ok(app.includes('class="manager-live-budget"'), 'remaining budget must remain in main Live row');
ok(/\.manager-live-row\s*\{[\s\S]*?display:\s*flex;[\s\S]*?white-space:\s*nowrap;/m.test(css), 'Live manager primary information must stay on one row');
ok(/\.manager-role-badge\s*\{[\s\S]*?background:\s*var\(--surface-2\);/m.test(css), 'remaining slots must be visually badged');
ok(/\.assign-btn\s*\{[\s\S]*?width:\s*36px;[\s\S]*?height:\s*36px;/m.test(css), 'assign/unassign buttons must be 36x36 visually');
ok(/\.assign-btn::after\s*\{[^}]*inset:\s*-4px;/m.test(css), 'assign/unassign touch target must remain approximately 44px');
const version = Number((sw.match(/fantacalcio-checklist-v(\d+)/) || [])[1] || 0);
ok(version >= 15, 'service worker cache must be at least v15');
console.log('v15 static tests: OK');

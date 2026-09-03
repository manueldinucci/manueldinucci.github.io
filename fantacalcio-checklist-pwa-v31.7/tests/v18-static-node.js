const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
function ok(cond, msg){ if(!cond) throw new Error(msg); }
const isV317 = sw.includes('fantacalcio-checklist-v31.7');
if (isV317) {
  ok(!app.includes('data-view="live"'), 'v31.7 must not expose Live in navigation');
  ok(app.includes("const viewButtons = ['rose']"), 'v31.7 must expose Rose as the only dashboard tab');
  ok(!html.includes('id="managersSheet"'), 'v31.7 legacy Live sheet must be removed');
  ok(app.includes("if (view !== 'rose') return;"), 'v31.7 dashboard opener must reject Live');
  console.log('v18-static-node.js historical checks superseded by v31.7 Live removal: OK');
  process.exit(0);
}


for (const label of ['Por','Dif','Cen','Att']) ok(app.includes(`P:'Por'`) || app.includes(label), 'short role labels must be present');
ok(app.includes('Max bid possibile'), 'Live must offer Max bid possibile ordering');
ok(app.includes('Slot rimasti'), 'Live must offer Slot rimasti ordering');
ok(app.includes("state.managerSort === 'maxBid'"), 'Live maxBid ordering logic must exist');
ok(app.includes("stats.roleRemaining?.[role]"), 'Live remaining-slots ordering must use manager roleRemaining');
ok(app.includes("remaining === 0 ? 'AL COMPLETO'"), 'zero role slots must render AL COMPLETO');
ok(app.includes("remaining===0?' role-complete':''"), 'complete managers must receive a visual state class');
ok(app.includes("SLOT ${remaining === 1 ? 'RIMASTO' : 'RIMASTI'}"), 'role badge must support singular/plural slot wording');
ok(app.includes('function twoColumnPlayers'), 'shared two-column purchase renderer must exist');
ok(app.includes('purchase-columns'), 'purchase details must use two-column wrapper');
ok(/\.purchase-columns\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,/m.test(css), 'purchase details must use two CSS columns');
ok(app.includes('<summary><b>${esc(roleSummary)}</b></summary>'), 'Rose summary must omit the Rosa label');
ok(/\.live-manager\.role-complete[\s\S]*?opacity:/m.test(css), 'AL COMPLETO rows must be visually attenuated');
const version = Number((sw.match(/fantacalcio-checklist-v(\d+)/) || [])[1] || 0);
ok(version >= 18, 'service worker cache must be v18+');
console.log('v18 static tests: OK');

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
function ok(cond, msg){ if(!cond) throw new Error(msg); }
const isV317 = (/fantacalcio-checklist-v31\.(?:[7-9]|[1-9]\d+)/.test(sw) || sw.includes('fantacalcio-checklist-v32'));
if (isV317) {
  ok(!app.includes('data-view="live"'), 'v31.7 must not expose Live in navigation');
  ok(app.includes("const viewButtons = ['rose']"), 'v31.7 must expose Rose as the only dashboard tab');
  ok(!html.includes('id="managersSheet"'), 'v31.7 legacy Live sheet must be removed');
  ok(app.includes("if (view !== 'rose') return;"), 'v31.7 dashboard opener must reject Live');
  console.log('v14-static-node.js historical checks superseded by v31.7 Live removal: OK');
  process.exit(0);
}


ok(/\.demand-summary\s*\{[\s\S]*?font-size:\s*11\.5px;[\s\S]*?line-height:\s*1\.28;/m.test(css), 'desktop/base demand line must match v11 sizing');
ok(/@media \(max-width: 430px\)[\s\S]*?\.demand-summary \{ font-size: 10\.5px; letter-spacing: -\.012em; \}/m.test(css), 'mobile demand line must match v11 sizing');
ok(html.includes('<select id="editTargetMin"'), 'Target min must be a select');
ok(html.includes('<select id="editTargetMax"'), 'Target max must be a select');
ok(!html.includes('id="editTargetMin" type="number"'), 'Target min numeric input must be removed');
ok(!html.includes('id="editTargetMax" type="number"'), 'Target max numeric input must be removed');
ok(app.includes('Array.from({length:301}, (_, i) => i)'), 'target selects must generate 0..300');
ok(app.includes("['editTargetMin','editTargetMax']"), 'both target selects must be initialized/bound');
ok(html.includes('<h2 id="managersTitle">Live</h2>'), 'Live sheet title must be Live');
const version = Number((sw.match(/fantacalcio-checklist-v(\d+)/) || [])[1] || 0);
if (version === 14) {
  ok(html.includes('id="liveRemaining"'), 'v14 Live remaining chip must exist');
  ok(app.includes("`${role} rimasti: ${freeRolePlayers}`"), 'v14 Live remaining format must use role rimasti: count');
} else {
  ok(!html.includes('id="liveRemaining"'), 'v15+ must remove the superseded global Live remaining chip');
  ok(app.includes('stats.roleRemaining[role]'), 'v15+ must retain per-manager role remaining data');
}
ok(html.includes('>Importa listone .xlsx</button>'), 'import label must be updated');
ok(html.includes('class="primary-btn import-list-btn"'), 'import button must use green class');
ok(css.includes('.import-list-btn {') && css.includes('background: #2f7d32'), 'import button must have green background');
ok(html.indexOf('id="manageManagersBtn"') > html.indexOf('id="importListBtn"'), 'manager settings must follow import');
ok(html.indexOf('id="manageManagersBtn"') < html.indexOf('id="exportBackupBtn"'), 'manager settings must be second visible tool item');
ok(html.includes('class="secondary-btn manager-settings-btn"'), 'manager settings must use dedicated gray class');
ok(css.includes('.manager-settings-btn { background: var(--surface-2); }'), 'manager settings must have light-gray/equivalent background');
ok(version >= 14, 'service worker cache version must be at least v14');
console.log('v14 static tests: OK');

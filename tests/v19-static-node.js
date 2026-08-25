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
  console.log('v19-static-node.js historical checks superseded by v31.7 Live removal: OK');
  process.exit(0);
}

ok(html.includes('id="viewSheet"') && html.includes('dashboard-sheet'), 'Live/Rose bottom sheet must exist');
ok(html.includes('id="closeViewSheetBtn"') && html.includes('sheet-handle'), 'view sheet needs handle and close button');
ok(app.includes("openDashboardSheet(btn.dataset.view)"), 'Live/Rose tabs must open the dashboard sheet');
ok(app.includes("state.overlayView = view === 'rose' ? 'rose' : 'live'"), 'temporary overlay view state must exist');
ok(app.includes('overlayScrollY'), 'underlying page scroll position must be preserved');
ok(app.includes("window.scrollTo(0, overlayScrollY)"), 'underlying scroll must be restored on close');
ok(app.includes("`Live · ${roleShort}`"), 'Live header must include current role');
ok(!app.includes('situazione in tempo reale'), 'obsolete realtime subtitle must be removed');
ok(/\.dashboard-sheet\s*\{[\s\S]*?94dvh/m.test(css), 'dashboard sheet should occupy about 94dvh');
ok(/\.dashboard-sheet \.live-chevron[\s\S]*?font-size:\s*16px/m.test(css), 'Live chevron must be more visible');
ok(!app.includes('<span>Profilo</span>'), 'Profilo text must be removed from participant UI');
ok(app.includes('manager-self-input') && app.includes('<span>Io</span>'), 'Io compact toggle must be present');
ok(/\.manager-self-input:checked \+ \.manager-self-toggle/m.test(css), 'Io toggle must have integrated selected styling');
ok(/\.manager-editor-head #addManagerRowBtn[\s\S]*?min-height:\s*34px/m.test(css), '+ Aggiungi must be more compact');
ok(/\.manager-remove-btn[\s\S]*?font-size:\s*17px/m.test(css), 'remove button must be more discreet');
const version = Number((sw.match(/fantacalcio-checklist-v(\d+)/) || [])[1] || 0);
ok(version >= 19, 'service worker cache must be v19+');
console.log('v19 static tests: OK');

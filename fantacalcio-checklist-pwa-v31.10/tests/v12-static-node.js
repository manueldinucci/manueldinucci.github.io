const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
function ok(cond, msg){ if(!cond) throw new Error(msg); }
ok(!html.includes('id="themeHeaderBtn"') || html.indexOf('id="compactHeaderBtn"') < html.indexOf('id="themeHeaderBtn"'), 'compact button must be left of theme when theme exists');
ok(!html.includes('id="compactMode"'), 'compact mode must be removed from filters');
ok(!html.includes('id="priceMaxFilter"'), 'Target max filter must be removed');
ok(html.includes('<select id="minFvmFilter"'), 'FVM minimo must be a select');
ok(app.includes('Array.from({length:100}'), 'FVM select must generate 1..100');
ok(app.includes("bindFilter('minFvmFilter','minFvm','change')"), 'FVM select must bind on change');
ok(!app.includes('state.priceMax'), 'removed price filter state must not be used');
ok(!app.includes("bindCheck('compactMode'"), 'old compact checkbox binding must be removed');
if (html.includes('id="compactHeaderBtn"')) {
  ok(app.includes("$('compactHeaderBtn').addEventListener('click', toggleCompact)"), 'compact header toggle must be bound');
  ok(app.includes("btn.setAttribute('aria-pressed', state.compact ? 'true' : 'false')"), 'compact state must be exposed');
} else {
  ok(sw.includes('fantacalcio-checklist-v31.10'), 'compact toggle may disappear only in v31.10+');
  ok(!app.includes('state.compact'), 'v31.10 must remove compact renderer branching');
}
const version = Number((sw.match(/fantacalcio-checklist-v(\d+)/) || [])[1] || 0);
if (version === 12) {
  ok(/\.demand-summary\s*\{[\s\S]*?font-size:\s*13px;/m.test(css), 'v12 demand line must be enlarged');
  ok(/\.assign-btn\s*\{[\s\S]*?width:\s*40px;\s*height:\s*40px;/m.test(css), 'v12 assign button must be 40x40');
} else {
  const match = css.match(/\.assign-btn\s*\{[\s\S]*?width:\s*(\d+)px;\s*height:\s*(\d+)px;/m);
  ok(match && Number(match[1]) <= 40 && Number(match[2]) <= 40, 'later assign button must not regress larger than v12');
}
ok(css.includes('.assign-btn::after'), 'assign button must preserve an extended touch target');
ok(version >= 12, 'service worker cache version must be at least v12');
console.log('v12 static tests: OK');

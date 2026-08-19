const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
function ok(cond, msg){ if(!cond) throw new Error(msg); }
ok(!html.includes('id="counts"'), 'counts row must be removed');
ok(!app.includes('Presi: ${taken} · Rimasti: ${available} · Totali:'), 'counts rendering must be removed');
ok(html.includes('<span>Lettera iniz.</span>'), 'letter label must be Lettera iniz.');
ok(css.includes('background: #3a3a3c'), 'light assign button must be graphite');
ok(css.includes('background: #4a4a4d'), 'dark assign button must be lighter graphite');
ok(/\.player-secondary-meta\s*\{[\s\S]*?white-space:\s*normal;[\s\S]*?overflow-wrap:\s*anywhere;/m.test(css), 'secondary metadata must wrap fully');
ok(/\.demand-summary\s*\{[\s\S]*?font-size:\s*11\.5px;/m.test(css), 'demand line must be enlarged');
const version = Number((sw.match(/fantacalcio-checklist-v(\d+)/) || [])[1] || 0);
ok(version >= 11, 'service worker cache version must be at least v11');
console.log('v11 static tests: OK');

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const db = fs.readFileSync(path.join(root, 'db.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
function ok(cond, msg){ if(!cond) throw new Error(msg); }

// UI: filter + modal editor + marker, without adding toolbar controls.
ok(html.includes('id="onlyOneCredit"'), 'Acquisto a 1 filter missing');
ok(html.includes('id="toggleOneCreditSheet"') || html.includes('id="editOneCreditBuy"'), 'Acquisto a 1 control missing');
ok((html.match(/class="header-icon-btn/g) || []).length === 5, 'v32 must not add a toolbar button');
ok(html.includes('id="onlyOneCredit"'), 'Acquisto a 1 filter label/control missing');

// State/filter behavior.
ok(app.includes('onlyOneCredit: false'), 'one-credit filter default missing');
ok(app.includes('onlyOneCredit: state.onlyOneCredit'), 'one-credit filter persistence missing');
ok(app.includes("bindCheck('onlyOneCredit','onlyOneCredit')"), 'one-credit filter binding missing');
ok(app.includes('.filter(p => !state.onlyOneCredit || p.oneCreditBuy === true)'), 'one-credit AND filter missing');
ok(app.includes('state.onlyOneCredit = false'), 'reset filter missing');
ok(app.includes('state.onlyFavorites, state.onlyOneCredit'), 'active-filter count missing one-credit filter');

// Marker and editor must be independent from Slot/Target/Favorite.
ok(app.includes('if (p.oneCreditBuy === true) parts.push(`<span class="one-credit-badge"'), 'card marker missing');
ok(app.includes("oneCreditBtn.classList.toggle('active', p.oneCreditBuy === true)") || app.includes("$('editOneCreditBuy').checked = p.oneCreditBuy === true"), 'modal one-credit state hydration missing');
ok(app.includes('toggleSelectedOneCredit') || app.includes("oneCreditBuy: $('editOneCreditBuy').checked"), 'modal one-credit save/toggle missing');
const compareStart = app.indexOf('function comparePlayers');
const compareEnd = app.indexOf('function getFilteredPlayers');
ok(compareStart >= 0 && compareEnd > compareStart, 'comparePlayers block missing');
ok(!app.slice(compareStart, compareEnd).includes('oneCreditBuy'), '(1) must not affect sorting');

// Data model / backup / legacy compatibility.
ok(db.includes('oneCreditBuy: Boolean(raw.oneCreditBuy)'), 'split personal oneCreditBuy missing');
ok(db.includes('oneCreditBuy: false'), 'legacy/default false missing');
ok(db.includes('version: 5'), 'v32 backup version should be 5');
ok(db.includes('[1,2,3,4,5].includes(data.version)'), 'legacy backup support missing');
ok(db.includes('playersPersonal: personal.map(row => ({ ...defaultPersonal(row.key), ...row, oneCreditBuy: Boolean(row.oneCreditBuy) }))'), 'new backup must explicitly emit oneCreditBuy');
ok(db.includes('oneCreditBuy: Boolean(row.oneCreditBuy)'), 'backup import normalization missing');

// Design/service worker.
ok(css.includes('/* v32 — classificazione strategica manuale Acquisto a 1 */'), 'v32 CSS marker missing');
ok(css.includes('.one-credit-badge'), 'one-credit badge styles missing');
ok(/const CACHE_NAME = 'fantacalcio-checklist-v32(?:\.[12])?';/.test(sw), 'service worker cache must be v32 or compatible successor');
ok(!sw.includes('fantacalcio-checklist-v31.10'), 'old v31.10 cache name remains');
console.log('v32 static checks: OK');

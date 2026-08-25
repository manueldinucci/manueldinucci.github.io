const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
function ok(cond, msg){ if(!cond) throw new Error(msg); }

// Navigation / Live removal
ok(app.includes("const viewButtons = ['rose'].map"), 'only Rose must remain in dashboard navigation');
ok(!app.includes('data-view="live"'), 'Live must not be exposed as a navigation target');
ok(!html.includes('id="managersSheet"'), 'legacy Live sheet must be removed');
ok(app.includes("if (view !== 'rose') return;"), 'dashboard opener must reject Live');
ok(!app.includes('function managerRolePurchases('), 'Live role renderer must be removed');
ok(!app.includes('function sortLiveRows('), 'Live sorting renderer must be removed');

// Demand rows / typography
ok(app.includes("toLocaleUpperCase('it')"), 'participant abbreviations must be uppercase');
ok(css.includes('.demand-participant-code { font-weight:400; }'), 'participant abbreviations must not be bold');
ok(css.includes('.demand-fab { flex:0 0 auto; color:var(--text); font-weight:400; }'), 'FAB must not be bold');
ok(app.includes('function participantMaxBidMarkup(rows)'), 'attack Max Bid row renderer missing');
ok(app.includes("model.role === 'A' ? participantMaxBidMarkup"), 'Max Bid row must be attack-only');
ok(app.includes('b.maxBid - a.maxBid || a.index - b.index'), 'Max Bid row must sort descending with stable original-order tie break');
ok(app.includes('maxBid: Number(stats.maxBid || 0)'), 'Max Bid row must reuse computed manager stats');
ok(app.includes("demand-participant-code${row.complete ? ' complete' : ''}"), 'complete attack participants must reuse attenuation hook');

// Rose redesign
ok(html.includes('<h2 id="viewSheetTitle">Rose</h2>'), 'Rose sheet title must be role-independent');
ok(app.includes("$('viewSheetTitle').textContent = 'Rose';"), 'Rose title must stay just Rose');
ok(app.includes('<details class="manager-card rose-manager${manager.isMe?\' self-manager\':\'\'}" open>'), 'Rose participant cards must start open');
ok(app.includes('<summary class="rose-manager-head"><strong>${esc(manager.nome)}</strong><b>${displayNum(stats.budgetRemaining)} cr</b></summary>') || ((sw.includes('fantacalcio-checklist-v31.10') || sw.includes('fantacalcio-checklist-v32')) && app.includes('rose-credit-label">CR RIM.')), 'Rose header must contain only name and remaining credits');
ok(!app.includes('const roleSummary = FantaAuction.ROLES.map'), 'aggregate P/D/C/A summary row must be removed');
ok(!app.includes('${selfBadge}${manager.squadra ?'), 'Rose header must not include self badge/team');
ok(css.includes('.rose-manager-head::-webkit-details-marker { display: none; }'), 'Rose cards must remain collapsible without native marker noise');

ok(/fantacalcio-checklist-v31\.(?:[7-9]|[1-9]\d+)/.test(sw) || sw.includes('fantacalcio-checklist-v32'), 'service worker cache must be v31.7 or a compatible successor');
console.log('v31.7 static checks: OK');

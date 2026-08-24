const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
function ok(cond, msg){ if(!cond) throw new Error(msg); }

// Navigation full width
ok(/\/\* v31\.8[\s\S]*?\.role-tabs\s*\{[\s\S]*?grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\);[\s\S]*?width:\s*100%;/m.test(css), 'v31.8 navigation must use six equal full-width columns');

// Privacy + strategic summary
ok(app.includes('if (state.showAll || state.privacyMode)'), 'Privacy must hide strategic summary');
ok(app.includes('renderCountsAndDemand();\n  }') || app.includes('renderCountsAndDemand();'), 'Privacy toggle must trigger strategic rerender');
ok(css.includes('.demand-summary {\n  color: var(--text);'), 'strategic summary must use high-contrast text');
ok(css.includes('.demand-primary,\n.demand-slots,\n.demand-fab'), 'primary strategic row color override missing');

// Participant grids
ok(app.includes('function participantGridMarkup(rows, valueGetter, extraClass = \'\')'), 'shared participant grid renderer missing');
ok(app.includes("'demand-needs-grid'"), 'needs grid class missing');
ok(app.includes("'demand-max-bid-grid'"), 'Max Bid grid class missing');
ok(css.includes('grid-template-columns: repeat(5, minmax(0, 1fr));'), 'participant grid must use five columns');
ok(css.includes('.demand-participant-cell.complete { opacity: .4; }'), 'complete participant cells must be attenuated');
ok(app.includes('<div class="demand-max-bid-label">MAX BID</div>'), 'MAX BID label missing');
ok(app.includes("model.role === 'A' ? participantMaxBidMarkup"), 'Max Bid grid must remain attack-only');
ok(app.includes('b.maxBid - a.maxBid || a.index - b.index'), 'Max Bid grid sort must be descending with stable tie-break');

// Rose ordering + compact roster
ok(app.includes('Number(b.stats.maxBid || 0) - Number(a.stats.maxBid || 0)'), 'Rose must sort by Max Bid descending');
ok(app.includes('Number(b.stats.budgetRemaining || 0) - Number(a.stats.budgetRemaining || 0)'), 'Rose tie-break must use remaining credits descending');
ok(app.includes('a.originalIndex - b.originalIndex'), 'Rose final tie-break must use original participant order');
ok(app.includes('function rosePlayerInlineMarkup(players)'), 'compact Rose inline player renderer missing');
ok(app.includes('class="rose-role-row"'), 'Rose must render P/D/C/A rows');
ok(app.includes('class="rose-role-code"'), 'Rose role code column missing');
ok(app.includes('class="rose-role-players"'), 'Rose inline player area missing');
ok(app.includes(".join('&nbsp;· ')"), 'Rose player separator / wrap-safe flow missing');
ok(css.includes('grid-template-columns: 18px minmax(0, 1fr);'), 'Rose role rows must use narrow role column + flexible names');

ok(sw.includes("fantacalcio-checklist-v31.8"), 'service worker cache must be v31.8');
console.log('v31.8 static checks: OK');

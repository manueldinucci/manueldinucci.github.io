const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const db = fs.readFileSync(path.join(root, 'db.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
function ok(cond, msg){ if(!cond) throw new Error(msg); }

// Toolbar / permanent compact layout.
const ids = ['privacyHeaderBtn','commentsHeaderBtn','participantsHeaderBtn','slotMapHeaderBtn','menuBtn'];
const positions = ids.map(id => html.indexOf(`id="${id}"`));
ok(positions.every(x => x >= 0) && positions.every((x,i) => i === 0 || x > positions[i-1]), 'five-button toolbar order is wrong');
ok(!html.includes('id="compactHeaderBtn"'), 'Comprimi must be removed');
ok(!app.includes('state.compact'), 'compact renderer state must be removed');
ok(!app.includes('toggleCompact'), 'compact toggle logic must be removed');
ok(css.includes('/* La precedente Vista compatta è ora il layout standard permanente delle card. */'), 'standard compact-layout marker missing');

// Safe icon is shield + attention, Participants remains eye.
ok(/privacyHeaderBtn[\s\S]*M12 3\.2 19 6/.test(html), 'safe mode shield icon missing');
ok(/privacyHeaderBtn[\s\S]*M12 7\.5v5\.2/.test(html), 'safe mode exclamation missing');
ok(/participantsHeaderBtn[\s\S]*M2\.5 12s3\.5-6/.test(html), 'participants eye icon missing');

// Strategic monitor.
ok(app.includes('`${displayNum(row.owned)}/${displayNum(row.quota)}`'), 'owned/quota renderer missing');
ok(app.includes('const quota = Number(config.roster?.[role] || 0);'), 'quota must be dynamic');
ok(app.includes('Math.max(0, quota - owned)'), 'missing calculation changed');
ok(app.includes('const fab = rows.reduce((sum, row) => sum + row.missing, 0);'), 'internal FAB calculation should remain available');
ok(!app.includes('FAB: ${model.needs.fab'), 'FAB must not be rendered');
ok(app.includes("participantGridMarkup(ordered, row => displayNum(Math.floor(row.maxBid))"), 'Max Bid must stay economic only');
ok(app.includes("state.privacyMode || state.showAll"), 'Privacy priority missing');

// Rose.
ok(app.includes('rose-credit-label">CR RIM.</span>'), 'CR RIM. label missing');
ok(app.includes('Number(b.stats.maxBid || 0) - Number(a.stats.maxBid || 0)'), 'Rose Max Bid ordering changed');
ok(app.includes('Number(b.stats.budgetRemaining || 0) - Number(a.stats.budgetRemaining || 0)'), 'Rose residual-credit tie-break changed');
ok(app.includes('a.originalIndex - b.originalIndex'), 'Rose original-order tie-break changed');
['#F1F2F4','#FAFAFA','#E7E9EC','#F3F4F5','#F7F7F8','#D7DADF'].forEach(v => ok(css.includes(v), `Rose gray ${v} missing`));

// Player modal.
ok(html.includes('class="player-modal player-edit-sheet hidden"'), 'player modal class missing');
ok(!/id="playerSheet"[^>]*bottom-sheet/.test(html), 'player must not be a bottom sheet');
ok(!/id="playerSheet"[\s\S]*?<div class="sheet-handle">[\s\S]*?<section id="toolsSheet"/.test(html), 'player handle must be removed');
ok(!html.includes('id="competitorsSection"'), 'competition monitor must be removed from player modal');
ok(css.includes('top: var(--visual-viewport-center, 50%);'), 'player modal must be centered in visual viewport');
ok(css.includes('width: min(92vw, 420px);'), 'player modal width contract missing');
ok(css.includes('max-height: min(75dvh'), 'player modal max-height contract missing');
ok(app.includes("$('sheetBackdrop').addEventListener('click', closeAllSheets)"), 'click outside close missing');

// Manager config single identifier + legacy migration.
ok(!html.includes('data-field="squadra"') && !app.includes('data-field="squadra"'), 'second participant identifier must be removed');
ok(app.includes('manager ? String(manager.nome || \'\').trim()'), 'full participant name must be display source');
ok(db.includes('id: String(raw.id || makeManagerId())'), 'legacy internal IDs must be preserved');
ok(db.includes('(data.managers || []).map(sanitizeManager)'), 'legacy backup manager migration missing');
ok(db.includes('managers: managers.map(sanitizeManager)'), 'new backups should use simplified participant model');

// Mobile keyboard structure.
ok(html.includes('class="sheet-scroll manager-config-scroll"'), 'single config scroller missing');
ok(app.includes('window.visualViewport'), 'Visual Viewport handling missing');
ok(app.includes('function ensureConfigFieldVisible(field)'), 'centralized active-field visibility helper missing');
ok(app.includes("configSheet?.addEventListener('focusin'"), 'centralized config focus handler missing');
ok(css.includes('.manager-config-sheet.keyboard-open'), 'mobile keyboard layout hook missing');
ok(css.includes('height: calc(var(--visual-viewport-height, 100dvh) - 8px);'), 'visual viewport height binding missing');
ok(css.includes('.manager-config-sheet .sticky-actions { position: static; }'), 'mobile config must avoid nested sticky overlay');

ok(sw.includes("fantacalcio-checklist-v31.10"), 'service worker cache must be v31.10 exactly');
console.log('v31.10 static checks: OK');

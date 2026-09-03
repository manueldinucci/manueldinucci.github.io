const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const db = fs.readFileSync(path.join(root, 'db.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
function ok(cond, msg){ if(!cond) throw new Error(msg); }

ok(html.includes('id="toggleOneCreditSheet"'), 'quick 1 button missing');
ok(!html.includes('id="editOneCreditBuy"'), 'old one-credit checkbox remains');
ok(!html.includes('id="sheetOneCreditBadge"'), 'redundant modal one-credit badge remains');
ok(html.includes('>1</button>'), 'quick control must display plain 1');
ok(app.includes('aria-label="Acquisto a 1">1</span>'), 'card badge must be plain 1');

const primaryStart = app.indexOf('function playerPrimaryMetaMarkup');
const primaryEnd = app.indexOf('function playerSecondaryMetaMarkup');
const primary = app.slice(primaryStart, primaryEnd);
ok(primary.indexOf('player-slot-badge') < primary.indexOf('one-credit-badge'), 'Slot must precede 1');
ok(primary.indexOf('one-credit-badge') < primary.indexOf('player-target-pill'), '1 must precede Target');

ok(app.includes('demand-slot-count${count === 0 ? \' exhausted\' : \'\'}'), 'exhausted demand marker missing');
ok(css.includes('.demand-slot-count.exhausted'), 'exhausted demand style missing');
ok(css.includes('color: #c62828'), 'red exhausted style missing');
ok(app.includes('const available = rolePlayers.filter(p => !p.preso);'), 'demand counts must use real market availability');

ok(!app.includes('${remaining}/${total} disponibili'), 'Mappa must omit disponibili');
ok(!app.includes('function slotMapProgress'), 'Mappa progress renderer must be removed');
ok(app.includes('data-slot-map-player-key='), 'Mappa names must be tappable');
ok(app.includes("querySelectorAll('[data-slot-map-player-key]')"), 'Mappa click binding missing');
ok(app.includes('function openPlayerFromSlotMap'), 'Mappa → player modal bridge missing');
ok(app.includes('function restoreSlotMapContext'), 'Mappa return context missing');
ok(app.includes('scrollTop: content ? content.scrollTop : 0'), 'Mappa scroll preservation missing');
ok(css.includes('position: sticky') && css.includes('.slot-map-slot-head'), 'sticky Slot header missing');
ok(css.includes('background: transparent') && css.includes('.slot-map-band'), 'compact transparent band override missing');
ok(css.includes('grid-template-columns: minmax(0,1fr) 46px 46px 46px'), '4-action modal grid missing');

ok(db.includes('version: 5'), 'backup version must remain 5');
ok(/const CACHE_NAME = 'fantacalcio-checklist-v32\.(?:1|2)';/.test(sw), 'cache must be v32.1 or compatible successor');
ok((html.match(/class="header-icon-btn/g) || []).length === 5, 'toolbar must remain five controls');
console.log('v32.1 static checks: OK');

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const auction = fs.readFileSync(path.join(root, 'auction-logic.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
function ok(cond, msg){ if(!cond) throw new Error(msg); }

ok(!html.includes('Affina la lista senza perdere la posizione'), 'filters helper sentence must be removed');
ok(html.includes('id="minQtaFilter"'), 'Qt.A minima select must exist');
ok(html.includes('>Qt.A minima<select'), 'Qt.A minima label must be exact');
ok(app.includes('Array.from({length:30}, (_, i) => i + 1)'), 'Qt.A minima must generate 1..30');
ok(app.includes("bindFilter('minQtaFilter','minQta','change')"), 'Qt.A minima must be bound');
ok(app.includes('(num(p.quotazione) ?? -Infinity) >= minQta'), 'Qt.A minima must filter current quotation');
ok(/\.filter-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,/m.test(css), 'filter grid must have four columns');

ok(app.includes("if (filter === 'S1-S2') return ['S1','S2'].includes(slot);"), 'S1-S2 cumulative filtering must include S1 and S2');
ok(app.includes("if (filter === 'S1-S3') return ['S1','S2','S3'].includes(slot);"), 'S1-S3 cumulative filtering must include S1..S3');
ok(app.includes('value="S1-S2">S1-S2'), 'S1-S2 option must exist');
ok(app.includes('value="S1-S3">S1-S3'), 'S1-S3 option must exist');

ok(app.includes('function nameFontWeight'), 'FVM-dependent font weight helper must exist');
ok(app.includes('650 + 150 * n'), 'font weight must range approximately 650..800');
ok(app.includes('font-weight:${weight}'), 'player name must receive dynamic font weight inline');
ok(css.includes('.player-name { font-weight: 680;'), 'static fallback player weight must be reduced');
ok(app.includes('parts.push(`Qt.A ${displayNum(qta)}`)'), 'player card must show current quote as Qt.A');
ok(app.includes("['FVM',displayNum(p.fvm)], ['Qt.A',displayNum(p.quotazione)]"), 'player sheet must show Qt.A instead of QI as quote reference');

ok(app.includes('class="manager-live-left"'), 'Live left identity/need block must exist');
ok(app.includes('class="manager-live-economy"'), 'Live economy block must exist');
ok(app.includes('(max bid ${displayNum(Math.floor(stats.maxBid))})'), 'Live must use max bid label and parentheses');
ok(/\.manager-live-budget\s*\{[^}]*font-weight:\s*880;/m.test(css), 'remaining credits must be visually emphasized');
ok(!app.includes('>Max ${displayNum(Math.floor(stats.maxBid))}</span><b class="manager-live-budget"'), 'old Live Max/budget ordering must be removed');

ok(html.includes('id="manageManagersBtn" class="secondary-btn manager-settings-btn">Configura asta</button>'), 'tools entry must be renamed Configura asta');
ok(html.includes('id="configBasePrice"'), 'Prezzo base select must exist');
for (const opt of ['value="1">1','value="qti">Qt.I','value="qta">Qt.A','value="fvm">FVM']) ok(html.includes(opt), `Prezzo base option missing: ${opt}`);
ok(!html.includes('id="configMinPrice"'), 'old Prezzo minimo control must be removed');
ok(app.includes('function basePriceForPlayer'), 'assignment base-price resolver must exist');
ok(app.includes("qti: num(player?.quotazione_iniziale)"), 'Qt.I base price must use initial quotation');
ok(app.includes("qta: num(player?.quotazione)"), 'Qt.A base price must use current quotation');
ok(app.includes("fvm: num(player?.fvm)"), 'FVM base price must use FVM');
ok(app.includes("basePriceMode:$('configBasePrice').value"), 'Prezzo base selection must persist in auction config');
ok(auction.includes('minPrice: 1,'), 'regulatory minimum must be fixed at 1 credit');
ok(auction.includes('basePriceMode,'), 'base price mode must be part of normalized auction config');
ok(/\.auction-config-grid\s*\{[^}]*repeat\(3,/m.test(css), 'auction general settings must use compact three-column grid');
ok(css.includes('.manager-editor-fields { display: grid; grid-template-columns: minmax(0,1.15fr) minmax(0,1fr) 82px 58px;'), 'participants must use compact uniform wide layout');
ok(app.includes('class="manager-self-toggle"'), 'Io control must use integrated toggle wrapper');

const version = Number((sw.match(/fantacalcio-checklist-v(\d+)/) || [])[1] || 0);
ok(version >= 16, 'service worker cache version must be at least v16');
console.log('v16 static tests: OK');

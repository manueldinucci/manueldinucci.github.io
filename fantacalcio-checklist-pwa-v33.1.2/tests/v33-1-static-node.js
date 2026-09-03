const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const BASE = path.resolve(ROOT, '..', 'fantacalcio-checklist-pwa-v33');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const shaFile = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

const html = read('index.html');
const app = read('app.js');
const css = read('style.css');
const sw = read('service-worker.js');

// Exact Slot menu taxonomy is defined in app.js and rendered dynamically.
for (const pair of [
  "['', 'Tutti']", "['S1-S2','S1-S2']", "['S1-S3','S1-S3']", "['S1-S4','S1-S4']",
  "['S1-S5','S1-S5']", "['S1','S1']", "['S2','S2']", "['S3','S3']", "['S4','S4']",
  "['S5','S5']", "['OUT','Fuori Slot']"
]) assert.ok(app.includes(pair), `missing slot option ${pair}`);
assert.ok(app.includes("'S1-S4':['S1','S2','S3','S4']"));
assert.ok(app.includes("'S1-S5':['S1','S2','S3','S4','S5']"));
assert.ok(app.includes("if (selected === 'OUT') return !/^S[1-5]$/.test(slot) && !(player?.ruolo === 'P' && isGoalkeeperCoverage(player));"));

// Target max.
assert.ok(html.includes('id="targetMaxFilter"'));
assert.ok(html.includes('Target max'));
assert.ok(app.includes('targetMax:'));
assert.ok(app.includes('value != null && value <= targetMax'));
assert.ok(app.includes('populateTargetMaxFilter'));

// Personal selection OR and independent only-free AND.
assert.ok(app.includes('const wantsFav = state.onlyFavorites === true;'));
assert.ok(app.includes('const wantsOne = state.onlyOneCredit === true;'));
assert.ok(app.includes('(wantsFav && p.preferito) || (wantsOne && p.oneCreditBuy === true)'));
assert.ok(app.includes('.filter(p => !state.onlyAvailable || !p.preso)'));
assert.ok(html.includes('<span>Preferiti</span>'));
assert.ok(html.includes('<span>Acq. a 1</span>'));
assert.ok(!html.includes('<span>Solo preferiti</span>'));

// Three checks share one compact row and no active-filters counter badge remains.
assert.ok(html.includes('class="filters-toggle-row"'));
assert.ok(html.includes('class="filters-personal-group"'));
assert.ok(!html.includes('filtersCountBadge'));
assert.ok(css.includes('.filters-toggle-row'));
assert.ok(css.includes('.filters-personal-group'));

// Player count X / Y is part of the demand/slot line, with no extra label.
assert.ok(app.includes('id="visiblePlayerCount"'));
assert.ok(app.includes('class="demand-visible-count"'));
assert.ok(app.includes('`${visible} / ${currentRoleTotal()}`'));
assert.ok(css.includes('.demand-visible-count'));

// Reset becomes contextually disabled.
assert.ok(app.includes("$('resetFiltersBtn').disabled = !active"));
assert.ok(css.includes('.filters-reset-btn:disabled'));

// Release/cache.
assert.ok(sw.includes("const CACHE_NAME = 'fantacalcio-checklist-v33.1';"));
assert.ok(read('README.md').includes('## v33.1 — Filtri operativi'));

// Files outside the approved scope remain byte-identical to v33.
for (const f of ['db.js','auction-logic.js','players.js','xlsx-import.js','manifest.json']) {
  assert.strictEqual(shaFile(path.join(ROOT,f)), shaFile(path.join(BASE,f)), `${f} changed unexpectedly`);
}
for (const f of ['icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png','favicon.png']) {
  assert.strictEqual(shaFile(path.join(ROOT,'icons',f)), shaFile(path.join(BASE,'icons',f)), `icon changed: ${f}`);
}

console.log('v33.1 static: OK');

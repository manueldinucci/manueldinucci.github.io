const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const BASE = path.resolve(ROOT, '..', 'fantacalcio-checklist-pwa-v33.1');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const shaFile = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

const html = read('index.html');
const app = read('app.js');
const css = read('style.css');
const sw = read('service-worker.js');
const readme = read('README.md');

assert.ok(html.includes('Target max ≥<select id="targetMaxFilter"'), 'exact Target max ≥ label missing');
assert.ok(!html.includes('Target max >=<select id="targetMaxFilter"'), 'ASCII >= leaked into UI');
assert.ok(app.includes('value != null && value >= targetMax'), 'Target max must use >=');
assert.ok(!app.includes('value != null && value <= targetMax'), 'legacy <= Target logic still present');
assert.ok(app.includes('populateTargetMaxFilter'), 'dynamic Target values must remain');

assert.ok(html.includes('<span>Solo liberi</span>'));
assert.ok(html.includes('<span>Preferiti</span>'));
assert.ok(html.includes('<span>Acq. a 1</span>'));
assert.ok(!html.includes('filters-personal-group'), 'visual personal grouping must be removed');
assert.ok(css.includes('grid-template-columns:repeat(3, minmax(0, 1fr))'), 'checkbox row must use three equal columns');
assert.ok(css.includes('justify-items:center'), 'checkboxes must be uniformly centered in equal columns');
assert.ok(!css.includes('.filters-personal-group'), 'old grouped spacing CSS must be removed');

// Existing v33.1 behavior remains.
assert.ok(app.includes("['S1-S5','S1-S5']"));
assert.ok(app.includes("['OUT','Fuori Slot']"));
assert.ok(app.includes('(wantsFav && p.preferito) || (wantsOne && p.oneCreditBuy === true)'));
assert.ok(app.includes('.filter(p => !state.onlyAvailable || !p.preso)'));
assert.ok(app.includes('`${visible} / ${currentRoleTotal()}`'));
assert.ok(app.includes("$('resetFiltersBtn').disabled = !active"));

assert.ok(sw.includes("const CACHE_NAME = 'fantacalcio-checklist-v33.1.1';"));
assert.ok(readme.includes('## v33.1.1 — Correzione filtri'));

// Files outside the approved patch scope remain byte-identical to v33.1.
for (const f of ['db.js','auction-logic.js','players.js','xlsx-import.js','manifest.json']) {
  assert.strictEqual(shaFile(path.join(ROOT,f)), shaFile(path.join(BASE,f)), `${f} changed unexpectedly`);
}
for (const f of ['icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png','favicon.png']) {
  assert.strictEqual(shaFile(path.join(ROOT,'icons',f)), shaFile(path.join(BASE,'icons',f)), `icon changed: ${f}`);
}

console.log('v33.1.1 static: OK');

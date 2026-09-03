const fs = require('fs');
const assert = require('assert');
const app = fs.readFileSync('app.js','utf8');
const html = fs.readFileSync('index.html','utf8');
const css = fs.readFileSync('style.css','utf8');
const sw = fs.readFileSync('service-worker.js','utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.json','utf8'));

assert(html.includes('id="resetFiltersBtn"') && html.includes('Reset filtri'), 'Reset filtri button missing');
assert(app.includes("$('resetFiltersBtn').addEventListener('click', resetFilters);"), 'Reset filtri handler missing');
assert(app.includes("state.team = '';"), 'Reset must clear team');
assert(app.includes("state.slot = '';"), 'Reset must clear slot');
assert(app.includes("state.minFvm = '';"), 'Reset must clear min FVM');
assert(app.includes("state.minQta = '';"), 'Reset must clear min QtA');
assert(app.includes('state.onlyAvailable = false;') && app.includes('state.onlyFavorites = false;'), 'Reset must clear checkboxes');
assert(app.includes("document.addEventListener('click', e => {") && app.includes('}, true);'), 'Click-away must use capture phase');
assert(app.includes('e.preventDefault();') && app.includes('e.stopPropagation();'), 'Outside click must be consumed');
assert(!app.includes("document.addEventListener('pointerdown', e => {\n      const inSort"), 'Legacy pointerdown click-away must be removed');
assert(css.includes('.filters-reset-btn'), 'Reset button styling missing');
assert(/fantacalcio-checklist-v(?:30(?:\.\d+)?|3[1-9]|[4-9]\d)/.test(sw), 'Service worker must use v30+ cache');
assert(manifest.icons.some(x => x.src === 'icons/icon-192.png') && manifest.icons.some(x => x.src === 'icons/icon-512.png'), 'Manifest icon references missing');
for (const f of ['icons/favicon.png','icons/apple-touch-icon.png','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png']) {
  assert(fs.existsSync(f) && fs.statSync(f).size > 1000, `${f} missing or empty`);
}
console.log('v30 static checks OK');

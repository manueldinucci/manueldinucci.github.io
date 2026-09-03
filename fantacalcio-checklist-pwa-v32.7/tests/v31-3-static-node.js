const fs = require('fs');
const assert = require('assert');
const app = fs.readFileSync('app.js','utf8');
const css = fs.readFileSync('style.css','utf8');
const sw = fs.readFileSync('service-worker.js','utf8');

assert(app.includes("label:'n.c.'"), 'Mappa Slot must label no-target bands as n.c.');
assert(!app.includes("label:'Senza target'"), 'legacy Senza target label remains in slot map');
assert(app.includes('data-slot-map-role="${role}"><span>'), 'role-tab label span missing for optical centering');
assert(css.includes('.slot-map-role-btn {') && css.includes('display:grid') && css.includes('place-items:center'), 'grid optical centering missing');
assert(css.includes('.slot-map-role-btn > span') && css.includes('translateY(1px)'), 'optical text offset missing');
assert(css.includes('.slot-map-sheet {') && css.includes('flex-direction:column') && css.includes('overflow:hidden'), 'slot map sheet flex containment missing');
assert(css.includes('.slot-map-content {') && css.includes('flex:1 1 auto') && css.includes('min-height:0') && css.includes('max-height:none !important') && css.includes('-webkit-overflow-scrolling:touch'), 'slot map body scrolling fix missing');
if (!/fantacalcio-checklist-v32\.[123456]/.test(sw)) {
  assert(app.includes('--slot-map-band-alpha:'), 'per-band grayscale variable missing');
  assert(css.includes('background:rgba(17,24,39,var(--slot-map-band-alpha,.055))'), 'full-band grayscale background missing');
} else {
  assert(css.includes('/* v32.1 — UI 1, Slot esauriti e Mappa Slot più compatta/operativa */'), 'v32.1 compact map override missing');
}
assert(/fantacalcio-checklist-v31\.(?:10|[3-9])/.test(sw) || sw.includes('fantacalcio-checklist-v32'), 'v31.3+ service worker cache missing');
console.log('v31.3 static acceptance: OK');

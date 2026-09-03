const fs = require('fs');
const assert = require('assert');
const js = fs.readFileSync('app.js','utf8');
const css = fs.readFileSync('style.css','utf8');
const sw = fs.readFileSync('service-worker.js','utf8');

assert(js.includes('function cardSlotLabel(slotValue)'), 'v23 must format slot labels only at card render level');
assert(js.includes("/^S(\\d+)$/i.exec(slot)"), 'card slot formatter must preserve internal Sx representation');
assert(js.includes('`${Number(match[1])}° slot`'), 'card slot label must use ordinal + slot');
assert(js.includes('function playerActionBarHeight()'), 'v23 must measure the player action bar');
assert(js.includes("--player-action-bar-height"), 'v23 must expose measured action bar height to CSS');
assert(js.includes('Math.min(scrollRect.bottom, actionRect.top)'), 'visibility calculation must stop above sticky action bar');
assert(js.includes("keyboardOpen ? '28px' : '18px'"), 'keyboard open state must reserve extra iOS toolbar gap');
assert(js.includes("$('editComment').addEventListener('input', () =>"), 'comment input must re-check visibility while typing');
assert(css.includes('/* v23 — Commento sempre visibile su iPhone'), 'v23 CSS override missing');
assert(css.includes('var(--player-action-bar-height, 64px)'), 'sheet scroll padding must include action bar height');
assert(css.includes('.player-edit-sheet.keyboard-open .sheet-scroll'), 'keyboard-specific scroll space missing');
assert(sw.includes('fantacalcio-checklist-v23'), 'service worker cache must be v23');
console.log('v23 static tests: OK');

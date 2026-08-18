'use strict';
const assert = require('assert');
const num = v => (v === '' || v == null || Number.isNaN(Number(v))) ? null : Number(v);
const displayNum = v => num(v) == null ? '—' : String(num(v));
function targetText(p, {includeCap=true}={}) {
  const min = num(p.target_min) ?? num(p.prezzo_ideale_min);
  const max = num(p.target_max) ?? num(p.prezzo_ideale_max);
  const cap = num(p.price_cap);
  let range='';
  if (min != null && max != null) range=`${displayNum(min)}–${displayNum(max)}`;
  else if (min != null) range=`da ${displayNum(min)}`;
  else if (max != null) range=`≤${displayNum(max)}`;
  const parts=[]; if (range) parts.push(range); if (includeCap && cap != null) parts.push(`Cap ${displayNum(cap)}`);
  return parts.length ? parts.join(' · ') : 'Range non impostato';
}
function purchaseText(p) {
  const manager=String(p.manager_acquirente||'').trim(); const price=num(p.prezzo_acquisto);
  if (manager && price != null) return `${manager} · ${displayNum(price)} cr`;
  if (manager) return manager;
  if (price != null) return `${displayNum(price)} cr`;
  return '';
}
assert.equal(targetText({target_min:45,target_max:55}), '45–55');
assert.equal(targetText({target_min:45,target_max:55,price_cap:62}), '45–55 · Cap 62');
assert.equal(targetText({prezzo_ideale_min:12,prezzo_ideale_max:24}), '12–24');
assert.equal(purchaseText({manager_acquirente:'Luca',prezzo_acquisto:58}), 'Luca · 58 cr');
assert.equal(purchaseText({manager_acquirente:'Luca'}), 'Luca');
assert.equal(purchaseText({prezzo_acquisto:7}), '7 cr');
assert.equal(purchaseText({}), '');
console.log('Pricing/card tests: OK');

'use strict';
const assert = require('assert');
const num = v => (v === '' || v == null || Number.isNaN(Number(v))) ? null : Number(v);
const displayNum = v => num(v) == null ? '—' : String(num(v));
function targetText(p) {
  const min = num(p.target_min) ?? num(p.prezzo_ideale_min);
  const max = num(p.target_max) ?? num(p.prezzo_ideale_max);
  if (min != null && max != null) return `${displayNum(min)}–${displayNum(max)}`;
  if (min != null) return `da ${displayNum(min)}`;
  if (max != null) return `≤${displayNum(max)}`;
  return '';
}
function primary(p){ const a=[]; if(String(p.slot||'').trim()) a.push(String(p.slot).trim()); const t=targetText(p); if(t)a.push(t); return a.join(' | '); }
function secondary(p){ const a=[]; if(num(p.fvm)!=null)a.push(`FVM ${displayNum(p.fvm)}`); if(num(p.quotazione_iniziale)!=null)a.push(`QI ${displayNum(p.quotazione_iniziale)}`); if(String(p.commento||'').trim())a.push(String(p.commento).trim()); return a.join(' · '); }
assert.equal(primary({slot:'S1',target_min:40,target_max:50}), 'S1 | 40–50');
assert.equal(secondary({fvm:211,quotazione_iniziale:21,commento:'Molto interessante sotto 50'}), 'FVM 211 · QI 21 · Molto interessante sotto 50');
assert.equal(primary({slot:'S2'}), 'S2');
assert.equal(primary({target_min:40,target_max:50}), '40–50');
assert.equal(secondary({fvm:86,commento:'Ottima scommessa'}), 'FVM 86 · Ottima scommessa');
assert.equal(secondary({quotazione_iniziale:19}), 'QI 19');
console.log('V9 player-card formatting: OK');

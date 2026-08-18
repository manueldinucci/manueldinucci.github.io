'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const js = fs.readFileSync(path.join(root,'app.js'),'utf8');
const css = fs.readFileSync(path.join(root,'style.css'),'utf8');
const sw = fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
function assert(cond,msg){ if(!cond) throw new Error(msg); }

assert(html.includes('<h1>Asta Live Manager</h1>'), 'Titolo v9 non aggiornato');
assert(manifest.name.includes('Asta Live Manager') && manifest.short_name === 'Asta Live', 'Manifest v9 non aggiornato');
assert(!html.includes('Panoramica'), 'Panoramica ancora presente');
assert(!html.includes('Occhi sugli avversari'), 'Vista Occhi ancora separata');
assert(!html.includes('Mostra ruolo'), 'Tendina Mostra ruolo ancora presente');
assert(!html.includes('Configura asta e partecipanti'), 'Configura asta ancora nella vista Fantallenatori');
const sortBlock = html.match(/<select id="managerSort">([\s\S]*?)<\/select>/)?.[1] || '';
const values = [...sortBlock.matchAll(/value="([^"]+)"/g)].map(m=>m[1]);
assert(JSON.stringify(values)===JSON.stringify(['budget','maxBid','slots']), 'Ordinamenti v9 errati');
assert(!html.includes('id="themeSelect"') && html.includes('id="themeToggleBtn"'), 'Tema non semplificato');
assert(js.includes('b.stats.roleRemaining[role]-a.stats.roleRemaining[role]'), 'Slot rimasti non ordinati sul ruolo corrente');
assert(js.includes('P ${stats.roleBought') || js.includes("`${r} ${stats.roleBought[r]}/${state.auctionConfig.roster[r]}`"), 'Riepilogo rosa occupati/totali assente');
assert(js.includes('playerPrimaryMeta') && js.includes('playerSecondaryMeta'), 'Nuove righe card giocatore assenti');
assert(js.includes('quotazione_iniziale'), 'QI non gestita');
assert(css.includes('.player-card.slot-s1') && css.includes('.player-card.slot-s5'), 'Scala slot assente');
assert(css.includes(':not(.taken):not(.favorite)'), 'Priorità preso/preferito non rispettata');
assert(sw.includes('fantacalcio-checklist-v9'), 'Cache Service Worker non v9');
console.log('V9 static UX checks: OK');

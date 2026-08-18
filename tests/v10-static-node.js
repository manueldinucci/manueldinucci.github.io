const fs = require('fs');
const path = require('path');
const root = path.join(__dirname,'..');
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const js = fs.readFileSync(path.join(root,'app.js'),'utf8');
const css = fs.readFileSync(path.join(root,'style.css'),'utf8');
const sw = fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
function assert(cond,msg){ if(!cond) throw new Error(msg); }

assert(html.includes('id="themeHeaderBtn"'), 'Manca pulsante tema in header');
assert(html.includes('>⚙</button>'), 'Manca ingranaggio impostazioni');
assert(html.includes('>LIVE</button>'), 'FANTA non rinominato LIVE');
assert(!html.includes('id="liveModeBtn"') && !html.includes('Modalità asta'), 'Modalità ASTA ancora presente in HTML');
assert(!html.includes('id="onlyComments"') && !html.includes('Solo con commento'), 'Filtro commento ancora presente');
assert(!html.includes('id="themeToggleBtn"'), 'Tema ancora presente negli strumenti');
assert(!html.includes('Pressione mercato') && !html.includes('id="marketPressure"'), 'Blocco pressione ancora presente');
assert(html.includes('id="demandSummary"'), 'Manca riga fabbisogno');
assert(!js.includes('state.liveMode') && !js.includes('state.onlyComments'), 'Stato ASTA/commenti ancora usato');
assert(js.includes('P • Fabbisogno: ${need} • S1 disponibili: ${main} • S2 disponibili: ${extra}'), 'Formato Portieri errato');
assert(js.includes('${role} • Fabbisogno: ${need} • S1-S3 disponibili: ${main} • S4-S5 disponibili: ${extra}'), 'Formato D/C errato');
assert(js.includes('A • Fabbisogno: ${need} • S1-S2 disponibili: ${main} • S3 disponibili: ${extra}'), 'Formato Attaccanti errato');
assert(js.includes("const warning = model.main < model.need"), 'Logica warning non trovata');
assert(js.includes('class="assign-btn ${p.preso?\'assigned\':\'\'}"'), 'Pulsante +/- non trovato nella card');
assert(css.includes('.assign-btn') && css.includes('background: #111113') && css.includes('.assign-btn.assigned'), 'Stili +/- mancanti');
assert(css.includes('.player-card.favorite:not(.taken) .player-name'), 'Nome oro preferito non implementato');
assert(css.includes('.player-card.slot-s1:not(.taken)') && !css.includes('.slot-s1:not(.taken):not(.favorite)'), 'Preferiti non mantengono scala slot');
assert(sw.includes("fantacalcio-checklist-v10"), 'Cache SW non aggiornata a v10');
console.log('V10 static UX tests: OK');

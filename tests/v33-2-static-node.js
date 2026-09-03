const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root,'app.js'),'utf8');
const css = fs.readFileSync(path.join(root,'style.css'),'utf8');
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw = fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
function ok(cond,msg){ if(!cond) throw new Error(msg); }
ok(sw.includes("const CACHE_NAME = 'fantacalcio-checklist-v33.2';"),'cache v33.2 missing');
ok(app.includes('data-rose-player-key'),'Rose player tokens missing');
ok(app.includes('openPlayerFromRose'),'Rose player opener missing');
ok(app.includes("total > 0 && /^S[1-5]$/i.test(slot)"),'0/X accordion guard missing');
ok(app.includes("${effectiveCollapsed ? ' hidden' : ''}"),'exhausted slot body still forced hidden');
ok(!html.includes('modifyAssignmentBtn'),'legacy Modifica assegnazione remains in unassign modal');
ok(css.includes('.credit-modal {') && css.includes('pointer-events: auto;'),'credit modal global layer missing');
ok(css.includes('.rose-player-entry') && css.includes('appearance: none'),'Rose interactive token style missing');
ok(css.includes('.bottom-sheet.rose-nested-sheet'),'nested Rose sheet stacking missing');
console.log('v33.2 static: OK');

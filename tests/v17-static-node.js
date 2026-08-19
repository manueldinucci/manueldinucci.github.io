const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const auction = fs.readFileSync(path.join(root, 'auction-logic.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
function ok(cond, msg){ if(!cond) throw new Error(msg); }

ok(app.includes('parts.push(`Quot ${displayNum(qta)}`)') && app.indexOf('parts.push(`Quot ${displayNum(qta)}`)') < app.indexOf('parts.push(`FVM ${displayNum(fvm)}`)'), 'Quot must precede FVM in cards');
ok(app.includes("['Quot',displayNum(p.quotazione)], ['FVM',displayNum(p.fvm)]"), 'player sheet must show Quot before FVM');
for (const id of ['configP','configD','configC','configA']) {
  const m = html.match(new RegExp(`<select id="${id}"[\\s\\S]*?<\\/select>`));
  ok(m, `${id} must be a select`);
  for(let i=1;i<=10;i++) ok(m[0].includes(`value="${i}">${i}<`), `${id} must include ${i}`);
}
ok(!app.includes('data-field="budgetInitial"'), 'per-manager optional budget UI must be removed');
ok(auction.includes('const budgetInitial = c.budgetInitial;'), 'manager stats must use global budget');
ok(app.includes("['live','rose']"), 'Live and Rose main views must exist');
ok(app.includes('data-view="${view}"'), 'Live/Rose must be rendered in main navigation');
ok(/\.role-tabs\s*\{[\s\S]*?repeat\(4,[\s\S]*?repeat\(2,/m.test(css), 'six top tabs must share one row');
ok(!html.includes('id="managersBtn"'), 'old separate LIVE button must be removed from second row');
ok(app.includes('function managerRolePurchases'), 'Live role-only purchase list must exist');
ok(app.includes('class="live-role-player"'), 'Live expanded players must use compact rows');
ok(app.includes('${esc(p.nome)}</span><b>${num(p.prezzo_acquisto)'), 'Live expanded rows must include name and acquisition price');
ok(app.includes('function managerFullRosterDetails'), 'Rose full-roster view must exist');
ok(app.includes('state.mainView === \'rose\''), 'Rose mode must be distinct');
ok(app.includes('(max bid ${displayNum(Math.floor(stats.maxBid))})'), 'Live must retain max bid format');
ok(app.includes('roleText = `${role} rimasti ${stats.roleRemaining[role]}`'), 'Live remaining badge must be manager-specific and role-specific');
const version = Number((sw.match(/fantacalcio-checklist-v(\d+)/) || [])[1] || 0);
ok(version >= 17, 'service worker cache must be v17+');
console.log('v17 static tests: OK');

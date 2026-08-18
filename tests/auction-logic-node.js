const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
global.window = global;
vm.runInThisContext(fs.readFileSync(path.join(root, 'auction-logic.js'), 'utf8'));

const config = { budgetInitial:500, minPrice:1, roster:{P:3,D:8,C:8,A:6} };
const luca = {id:'luca', nome:'Luca', budgetInitial:500};
const marco = {id:'marco', nome:'Marco', budgetInitial:500};
const mc = {key:'mct', nome:'McTominay', ruolo:'C', preso:false, prezzo_acquisto:null, manager_id:'', manager_acquirente:'', price_cap:65};
let players = [mc];

function assert(cond, msg){ if(!cond) throw new Error(msg); }
function approx(a,b){ return Math.abs(a-b) < 1e-9; }

// TEST 2: assign Luca 58
mc.preso=true; mc.prezzo_acquisto=58; mc.manager_id='luca'; mc.manager_acquirente='Luca';
let s = FantaAuction.computeManagerStats(luca, players, config);
assert(s.budgetRemaining===442, 'TEST2 budget');
assert(s.spent===58, 'TEST2 spent');
assert(s.roleBought.C===1, 'TEST2 C');
assert(s.slotsRemaining===24, 'TEST2 slots');

// TEST 3: edit price 55: recompute, no cumulative subtraction
mc.prezzo_acquisto=55;
s = FantaAuction.computeManagerStats(luca, players, config);
assert(s.budgetRemaining===445 && s.spent===55, 'TEST3 correction');

// TEST 4: change buyer to Marco
mc.manager_id='marco'; mc.manager_acquirente='Marco';
const sl = FantaAuction.computeManagerStats(luca, players, config);
const sm = FantaAuction.computeManagerStats(marco, players, config);
assert(sl.budgetRemaining===500 && sl.bought===0, 'TEST4 Luca restored');
assert(sm.budgetRemaining===445 && sm.roleBought.C===1, 'TEST4 Marco assigned');

// TEST 5: free player
mc.preso=false; mc.prezzo_acquisto=null; mc.manager_id=''; mc.manager_acquirente='';
s = FantaAuction.computeManagerStats(marco, players, config);
assert(s.budgetRemaining===500 && s.slotsRemaining===25, 'TEST5 free restore');

// TEST 6 exact maxBid 100, 5 slots => 96
const cfg5 = {budgetInitial:100,minPrice:1,roster:{P:0,D:0,C:5,A:0}};
const testM = {id:'t',nome:'T',budgetInitial:100};
s = FantaAuction.computeManagerStats(testM, [], cfg5);
assert(s.maxBid===96, `TEST6 maxBid ${s.maxBid}`);
assert(approx(s.avgPerSlot,20), 'TEST6 avg');

// TEST 7 completed C must not be competitor for a midfielder
const cfull = [];
for(let i=0;i<8;i++) cfull.push({key:'c'+i, ruolo:'C', preso:true, prezzo_acquisto:1, manager_id:'luca', manager_acquirente:'Luca'});
const target={key:'target',ruolo:'C',preso:false,price_cap:10};
const comps=FantaAuction.getCompetitors(target,[luca,marco],[...cfull,target],config);
assert(!comps.some(x=>x.manager.id==='luca'), 'TEST7 full C excluded');
assert(comps.some(x=>x.manager.id==='marco'), 'TEST7 eligible Marco present');

console.log('OK: budget, correzioni, cambio acquirente, reset, maxBid e competitori verificati.');

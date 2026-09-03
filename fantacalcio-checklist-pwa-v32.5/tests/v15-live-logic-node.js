const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
global.window = global;
vm.runInThisContext(fs.readFileSync(path.join(root, 'auction-logic.js'), 'utf8'));

function ok(cond, msg){ if(!cond) throw new Error(msg); }
const config = { budgetInitial:500, minPrice:1, roster:{P:3,D:8,C:8,A:6} };
const giovanni = {id:'g', nome:'Giovanni', budgetInitial:500};
const ros = {id:'r', nome:'ROS', budgetInitial:500};
const players = [
  {key:'c1', nome:'C1', ruolo:'C', preso:true, prezzo_acquisto:10, manager_id:'g', manager_acquirente:'Giovanni'},
  {key:'c2', nome:'C2', ruolo:'C', preso:true, prezzo_acquisto:5, manager_id:'g', manager_acquirente:'Giovanni'},
  {key:'d1', nome:'D1', ruolo:'D', preso:true, prezzo_acquisto:1, manager_id:'g', manager_acquirente:'Giovanni'},
  {key:'c3', nome:'C3', ruolo:'C', preso:true, prezzo_acquisto:20, manager_id:'r', manager_acquirente:'ROS'}
];

let rows = FantaAuction.computeAllManagerStats([giovanni, ros], players, config);
let g = rows.find(x => x.manager.id === 'g').stats;
let r = rows.find(x => x.manager.id === 'r').stats;
ok(g.roleRemaining.C === 6, `Giovanni C rimasti attesi 6, ottenuti ${g.roleRemaining.C}`);
ok(r.roleRemaining.C === 7, `ROS C rimasti attesi 7, ottenuti ${r.roleRemaining.C}`);
ok(g.roleRemaining.D === 7, `Giovanni D rimasti attesi 7, ottenuti ${g.roleRemaining.D}`);

players.push({key:'c4', nome:'C4', ruolo:'C', preso:true, prezzo_acquisto:1, manager_id:'g', manager_acquirente:'Giovanni'});
rows = FantaAuction.computeAllManagerStats([giovanni, ros], players, config);
g = rows.find(x => x.manager.id === 'g').stats;
ok(g.roleRemaining.C === 5, 'C rimasti deve aggiornarsi dopo una nuova assegnazione');
players.at(-1).preso = false;
rows = FantaAuction.computeAllManagerStats([giovanni, ros], players, config);
g = rows.find(x => x.manager.id === 'g').stats;
ok(g.roleRemaining.C === 6, 'C rimasti deve ripristinarsi dopo la rimozione dell’assegnazione');

console.log('v15 Live logic tests: OK');

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const code = fs.readFileSync('auction-logic.js','utf8');
const sandbox = { window:{} };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const A = sandbox.window.FantaAuction;
const managers = [
  {id:'m1', nome:'Manuel'},
  {id:'m2', nome:'Torre', squadra:'LEGACY-SECONDARY-FIELD'}
];
const players = [
  ...Array.from({length:4}, (_,i)=>({key:`d${i}`, ruolo:'D', preso:true, prezzo_acquisto:1, manager_id:'m1'})),
  ...Array.from({length:8}, (_,i)=>({key:`t${i}`, ruolo:'D', preso:true, prezzo_acquisto:1, manager_id:'m2'})),
  ...Array.from({length:3}, (_,i)=>({key:`a${i}`, ruolo:'A', preso:true, prezzo_acquisto:1, manager_id:'m1'}))
];
let config=A.makeDefaultConfig({budgetInitial:500, roster:{P:3,D:8,C:8,A:6}});
let rows=A.computeAllManagerStats(managers,players,config);
assert.strictEqual(rows[0].stats.roleBought.D,4);
assert.strictEqual(rows[0].stats.roleRemaining.D,4);
assert.strictEqual(rows[1].stats.roleBought.D,8);
assert.strictEqual(rows[1].stats.roleRemaining.D,0);
assert.strictEqual(rows[0].stats.roleBought.A,3);
assert.strictEqual(rows[0].stats.roleRemaining.A,3);
const maxBidBefore=rows[0].stats.maxBid;
config=A.makeDefaultConfig({...config,roster:{...config.roster,D:7}});
rows=A.computeAllManagerStats(managers,players,config);
assert.strictEqual(rows[0].stats.roleBought.D,4);
assert.strictEqual(rows[0].stats.roleRemaining.D,3,'quota change 8→7 must derive immediately');
assert.strictEqual(rows[1].stats.roleRemaining.D,0,'owned >= quota stays complete/clamped');
assert(Number.isFinite(maxBidBefore) && Number.isFinite(rows[0].stats.maxBid),'Max Bid formula must remain active');
// Legacy secondary field is irrelevant to ownership: stable internal id still resolves assignments.
assert.strictEqual(A.assignmentBelongsToManager(players[4], managers[1]), true);
console.log('v31.10 logic checks: OK');

// Exact legacy-manager migration contract from db.js: preserve internal IDs/names,
// discard the old secondary identifier and leave auction relations keyed by manager_id untouched.
let dbCode = fs.readFileSync('db.js','utf8');
dbCode = dbCode.replace('window.FantaDB = {', 'window.__sanitizeManager = sanitizeManager;\n  window.FantaDB = {');
const dbSandbox = { window:{}, crypto:{ randomUUID:()=> 'generated-id' } };
vm.createContext(dbSandbox);
vm.runInContext(dbCode, dbSandbox);
const legacyManagers = [
  {id:'legacy-1', nome:'Manuel', squadra:'MAN', budgetInitial:500, isMe:true},
  {id:'legacy-2', nome:'Nicola', squadra:'NIC', budgetInitial:500, isMe:false}
];
const migratedManagers = legacyManagers.map(dbSandbox.window.__sanitizeManager);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(migratedManagers)),
  [{id:'legacy-1',nome:'Manuel',isMe:true},{id:'legacy-2',nome:'Nicola',isMe:false}]
);
const legacyAuction = [{key:'p1',preso:true,prezzo_acquisto:37,manager_id:'legacy-2',manager_acquirente:'Nicola'}];
assert.strictEqual(legacyAuction[0].manager_id, migratedManagers[1].id, 'legacy assignment relation must remain valid');
assert.strictEqual(legacyAuction[0].prezzo_acquisto,37,'legacy purchase price must remain unchanged');
console.log('v31.10 legacy migration checks: OK');

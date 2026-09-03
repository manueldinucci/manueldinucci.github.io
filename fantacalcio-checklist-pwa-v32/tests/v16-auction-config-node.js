const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
global.window = global;
vm.runInThisContext(fs.readFileSync(path.join(root, 'auction-logic.js'), 'utf8'));
function assert(cond, msg){ if(!cond) throw new Error(msg); }

for (const mode of ['1','qti','qta','fvm']) {
  const c = FantaAuction.makeDefaultConfig({budgetInitial:100, minPrice:99, basePriceMode:mode, roster:{P:0,D:0,C:5,A:0}});
  assert(c.minPrice === 1, `real minPrice must remain 1 for mode ${mode}`);
  assert(c.basePriceMode === mode, `basePriceMode must persist: ${mode}`);
  const m = {id:'m', nome:'M', budgetInitial:100};
  const stats = FantaAuction.computeManagerStats(m, [], c);
  assert(stats.maxBid === 96, `maxBid must use 1-credit reserve, got ${stats.maxBid} for ${mode}`);
  const p = {key:'p', nome:'P', ruolo:'C', preso:false};
  const valid = FantaAuction.validateAssignment({player:p, manager:m, price:1, players:[p], config:c, excludeKey:'p'});
  assert(valid.ok, `price 1 must remain valid regardless of base mode ${mode}: ${valid.reason}`);
}

const bad = FantaAuction.makeDefaultConfig({basePriceMode:'unknown'});
assert(bad.basePriceMode === '1', 'unknown base mode must normalize to 1');
console.log('v16 auction config tests: OK');

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const shaFile = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

const app = read('app.js');
const css = read('style.css');
const sw = read('service-worker.js');
const readme = read('README.md');

assert.ok(app.includes("const slots = ['S1','S2','S3'];"), 'monitor must only show S1-S3');
assert.ok(app.includes("available.filter(p => p.preferito === true).length"), 'favorite available count missing');
assert.ok(app.includes("row.manager?.isMe === true"), 'self manager lookup missing');
assert.ok(app.includes("selfMissing > 0 && favoriteAvailable < selfMissing"), 'favorite alert condition wrong');
assert.ok(app.includes('demand-favorite-star'), 'favorite star monitor missing');
assert.ok(!app.includes("const slots = role === 'P' ? ['S1','S2','S3','S4'] : ['S1','S2','S3','S4','S5'];"), 'legacy S4/S5 monitor still present');

assert.ok(app.includes('function slotMapOneCreditMarkup(p)'), 'map one-credit helper missing');
assert.ok(app.includes("p.oneCreditBuy === true ? '<span class=\"slot-map-one-credit\""), 'map (1) marker missing');
assert.ok(app.includes('${esc(p.nome)}${slotMapOneCreditMarkup(p)}'), 'map marker not attached to name');
assert.ok(css.includes('.slot-map-one-credit'), 'map marker CSS missing');
assert.ok(css.includes('font-size: .72em'), 'map marker should remain micro-sized');
assert.ok(css.includes('.demand-favorite-count.alert'), 'favorite alert CSS missing');
assert.ok(css.includes('color: #c62828'), 'existing warning red not reused');

assert.ok(sw.includes("const CACHE_NAME = 'fantacalcio-checklist-v33.1.2';"));
assert.ok(readme.includes('## v33.1.2 — Monitor Preferiti e Mappa Slot'));

// Files outside approved patch scope remain byte-identical to v33.1.1.
const unchanged = {
  'db.js':'33ad81b7363cbcb7811da53a6fe68c83eaa854f8a72366cc57c0e03c516c0184',
  'auction-logic.js':'d41ed02c9b54993312e5e167ec843e4f41f69cc3c62e0232f4f19b20458b766c',
  'players.js':'565cdded47e3e606312c31c015575697c1cd1e1515fb80ece6a8e76708e9fbb9',
  'xlsx-import.js':'444b19db1685aee572f9a66d864bda9f8f0f42448092e0a3c7be1a9c8b31e699',
  'manifest.json':'4a15a6e30c53991ae9080a42d3d7ae35bdad7ca7e57cc58fe568c65869b36bc5',
  'index.html':'32e8608c3a8d1c20126780b8ba4f14a384ddc2615f132605f70602d0d42614a6',
  'icons/apple-touch-icon.png':'6cd4807beb328a3ab31c2c072ca5899415d432094788843f7426bc3c01690ed2',
  'icons/favicon.png':'8d2a2167b29e1fa21b13fd4f2c5fc238e0407c51075ebbd46cdd04cea8809f5d',
  'icons/icon-192.png':'13d9cb91b5191dfcdfb5a9bc5a533a15735d9449f22868dc4cdc80d4f6050d2a',
  'icons/icon-512.png':'cdf66f1396a2b075e7d6f609ac74accfedff2873edfe6aec92562535a1f5201b',
  'icons/icon-maskable-512.png':'eca66f3c72066862cd48fde78280f779df053aa8125c1ff0a8587380dcb20ec0'
};
for (const [f, expected] of Object.entries(unchanged)) {
  assert.strictEqual(shaFile(path.join(ROOT,f)), expected, `${f} changed unexpectedly`);
}


console.log('v33.1.2 static: OK');

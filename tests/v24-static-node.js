const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const app = read('app.js');
const db = read('db.js');
const html = read('index.html');
const css = read('style.css');
const sw = read('service-worker.js');
const manifest = JSON.parse(read('manifest.json'));

const must = (cond, msg) => { if (!cond) throw new Error(msg); };
must(app.includes("Novità listone"), 'manca riepilogo Novità listone');
must(app.includes("changes.added") && app.includes("changes.removed") && app.includes("changes.team"), 'manca confronto aggiunti/rimossi/cambio squadra');
must(app.includes("if (!state.players.length)"), 'il primo import deve evitare il confronto');
must(html.includes('id="listoneNewsSheet"'), 'manca bottom sheet Novità listone');
must(css.includes('.listone-change-section'), 'manca UI sezioni confronto listone');
must(db.includes("removedPlayersArchive"), 'manca archivio interno giocatori rimossi');
must(db.includes('archivedBySourceId') && db.includes('archivedByName'), 'manca matching dei giocatori archiviati');
must(sw.includes("fantacalcio-checklist-v24"), 'cache Service Worker non aggiornata a v24');
must(sw.includes('apple-touch-icon.png') && sw.includes('favicon.png'), 'asset icona nuovi non precache');
must(html.includes('apple-touch-icon.png') && html.includes('favicon.png'), 'head senza nuove icone');
must(manifest.icons.some(x => x.sizes === '192x192'), 'manifest senza 192');
must(manifest.icons.some(x => x.sizes === '512x512' && x.purpose === 'maskable'), 'manifest senza maskable 512');
for (const file of ['icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png','favicon.png']) {
  must(fs.existsSync(path.join(root,'icons',file)), `asset mancante: ${file}`);
}
console.log('v24 static checks: OK');

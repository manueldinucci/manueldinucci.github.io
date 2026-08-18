const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
global.window = global;

vm.runInThisContext(fs.readFileSync(path.join(root, 'vendor/xlsx-local-reader.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(root, 'xlsx-import.js'), 'utf8'));

(async () => {
  const buf = fs.readFileSync(path.join(root, 'samples/listone-demo.xlsx'));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const rows = await LocalXLSX.readFirstSheet(ab);
  if (rows[0][0] !== 'Calciatore' || rows[1][0] !== 'McTominay' || rows[1][5] !== 205) {
    throw new Error('Lettura XLSX fallita');
  }

  const model = FantaImport.rowsToImportModel(rows);
  const expected = { nome:0, squadra:1, ruolo:2, ruolo_mantra:3, quotazione:4, fvm:5 };
  for (const [k,v] of Object.entries(expected)) if (model.mapping[k] !== v) throw new Error(`Mapping errato: ${k}`);
  const built = FantaImport.buildPlayers(model.headers, model.rows, model.mapping);
  if (built.players.length !== 4 || built.issues.length !== 0) throw new Error('Costruzione giocatori fallita');

  const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
  const assets = [...sw.matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(Boolean);
  const missing = assets.filter(a => !fs.existsSync(path.join(root, a)));
  if (missing.length) throw new Error(`Asset cache mancanti: ${missing.join(', ')}`);

  console.log('OK: XLSX locale, mapping euristico e app-shell cache verificati.');
})().catch(err => { console.error(err); process.exit(1); });

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');

function pngSize(file) {
  const b = fs.readFileSync(file);
  assert.strictEqual(b.toString('ascii', 1, 4), 'PNG', `${file} non è un PNG valido`);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

const expected = {
  'icon-192.png': [192, 192],
  'icon-512.png': [512, 512],
  'icon-maskable-512.png': [512, 512],
  'apple-touch-icon.png': [180, 180],
  'favicon.png': [64, 64],
};

for (const [name, dims] of Object.entries(expected)) {
  const f = path.join(ROOT, 'icons', name);
  assert.ok(fs.existsSync(f), `asset mancante: ${name}`);
  const s = pngSize(f);
  assert.deepStrictEqual([s.width, s.height], dims, `dimensioni errate: ${name}`);
}

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const declared = new Map(manifest.icons.map(i => [i.src, i]));
for (const src of ['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png']) {
  assert.ok(declared.has(src), `manifest non dichiara ${src}`);
  assert.ok(fs.existsSync(path.join(ROOT, src)), `manifest punta a file mancante: ${src}`);
}
assert.strictEqual(declared.get('icons/icon-192.png').sizes, '192x192');
assert.strictEqual(declared.get('icons/icon-512.png').sizes, '512x512');
assert.strictEqual(declared.get('icons/icon-maskable-512.png').sizes, '512x512');
assert.strictEqual(declared.get('icons/icon-maskable-512.png').purpose, 'maskable');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
assert.ok(html.includes('href="icons/apple-touch-icon.png"'));
assert.ok(html.includes('href="icons/favicon.png"'));

const sw = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
assert.ok(sw.includes("const CACHE_NAME = 'fantacalcio-checklist-v32.9';"));
for (const src of [
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon.png'
]) assert.ok(sw.includes(src), `service worker non precachea ${src}`);

console.log('v32.9 static: OK');

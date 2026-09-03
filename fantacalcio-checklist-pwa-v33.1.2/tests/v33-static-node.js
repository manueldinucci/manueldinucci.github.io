const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const BASE = path.resolve(ROOT, '..', 'fantacalcio-checklist-pwa-v32.9');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');

function pngSize(file) {
  const b = fs.readFileSync(file);
  assert.strictEqual(b.toString('ascii', 1, 4), 'PNG', `${file} non è un PNG valido`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

// Brand / manifest.
const manifest = JSON.parse(read('manifest.json'));
const baseManifest = JSON.parse(fs.readFileSync(path.join(BASE, 'manifest.json'), 'utf8'));
assert.strictEqual(manifest.name, "Direttore's Aurea XI");
assert.strictEqual(manifest.short_name, 'Aurea XI');
assert.strictEqual(manifest.description, 'Aurea XI, strumento offline-first per Fantacalcio.');
for (const key of Object.keys(baseManifest)) {
  if (['name','short_name','description'].includes(key)) continue;
  assert.deepStrictEqual(manifest[key], baseManifest[key], `manifest.${key} changed unexpectedly`);
}

// Browser/iOS/header brand.
const html = read('index.html');
assert.ok(html.includes('<title>Aurea XI — Fantacalcio</title>'));
assert.ok(html.includes('<meta name="apple-mobile-web-app-title" content="Aurea XI" />'));
assert.ok(html.includes('<div class="eyebrow">Direttore\'s</div>'));
assert.ok(html.includes('<h1>Aurea XI</h1>'));
assert.ok(!html.includes('<h1>Live Asta</h1>'));
assert.ok(!html.includes('<div class="eyebrow">FANTACALCIO</div>'));
assert.ok(html.includes('href="icons/apple-touch-icon.png"'));
assert.ok(html.includes('href="icons/favicon.png"'));

// Kicker style.
const css = read('style.css');
assert.ok(/\.eyebrow\s*\{[^}]*font-style:\s*italic;[^}]*\}/s.test(css));
assert.ok(/\.eyebrow\s*\{[^}]*font-weight:\s*500;[^}]*\}/s.test(css));

// Cache / app shell.
const sw = read('service-worker.js');
assert.ok(sw.includes("const CACHE_NAME = 'fantacalcio-checklist-v33';"));
for (const src of [
  './icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png','./icons/favicon.png'
]) assert.ok(sw.includes(src), `service worker non precachea ${src}`);

// Backup schema remains unchanged.
const db = read('db.js');
assert.ok(db.includes('version: 5'), 'backup format version changed');

// Core logic files must be byte-identical to v32.9.
for (const f of ['app.js','db.js','auction-logic.js','players.js','xlsx-import.js']) {
  assert.deepStrictEqual(fs.readFileSync(path.join(ROOT,f)), fs.readFileSync(path.join(BASE,f)), `${f} changed unexpectedly`);
}

// Icons: dimensions, manifest refs, and byte identity vs v32.9.
const expected = {
  'icon-192.png': [192,192],
  'icon-512.png': [512,512],
  'icon-maskable-512.png': [512,512],
  'apple-touch-icon.png': [180,180],
  'favicon.png': [64,64],
};
for (const [f,dims] of Object.entries(expected)) {
  const current = path.join(ROOT,'icons',f);
  const base = path.join(BASE,'icons',f);
  assert.ok(fs.existsSync(current), `asset missing: ${f}`);
  assert.deepStrictEqual(pngSize(current), dims, `wrong dimensions: ${f}`);
  assert.strictEqual(sha(fs.readFileSync(current)), sha(fs.readFileSync(base)), `${f} changed vs v32.9`);
}
const declared = new Map(manifest.icons.map(i => [i.src, i]));
assert.strictEqual(declared.get('icons/icon-192.png').sizes, '192x192');
assert.strictEqual(declared.get('icons/icon-512.png').sizes, '512x512');
assert.strictEqual(declared.get('icons/icon-maskable-512.png').sizes, '512x512');
assert.strictEqual(declared.get('icons/icon-maskable-512.png').purpose, 'maskable');

console.log('v33 static: OK');

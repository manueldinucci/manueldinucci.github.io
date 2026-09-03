const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
if (/\bupdateThemeButton\s*\(/.test(app)) throw new Error('Residual updateThemeButton() call found');
if (!sw.includes('fantacalcio-checklist-v31.1')) throw new Error('v31.1 cache key missing');
console.log('v31.1 startup regression checks OK');

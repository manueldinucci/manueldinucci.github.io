const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

function ok(cond, msg) {
  if (!cond) throw new Error(msg);
}

ok(app.includes("return { key:'none', label:'n.c.', rank:-1 };"), 'n.c. band label missing');
ok(!app.includes("slot-map-band${showBandLabel ? '' : ' no-label'}"), 'legacy unlabeled band rendering still active');
ok(app.includes('function getRoleNeeds(role)'), 'shared role-needs function missing');
ok(app.includes('Math.max(0, quota - owned)'), 'role need is not clamped at zero');
ok(app.includes('const fab = rows.reduce((sum, row) => sum + row.missing, 0);'), 'FAB is not the sum of all participant needs');
ok(app.includes('rows.sort((a,b) => b.missing - a.missing || a.index - b.index);'), 'participant dynamic ordering / stable tie-break missing');
ok(app.includes('function participantAbbreviations(managers)'), 'participant abbreviation logic missing');
ok(app.includes('demand-participant-code${row.complete ? \' complete\' : \'\'}'), 'completed participant attenuation hook missing');
ok(app.includes('model.needs.fab'), 'demand summary does not use aggregate FAB');
ok(css.includes('.demand-participant-code.complete { opacity:.45; }'), 'completed participant CSS attenuation missing');
ok(css.includes('.demand-participant-item { display:inline; white-space:nowrap; }'), 'participant wrapping unit missing');
ok(/fantacalcio-checklist-v31\.(?:[6-9]|[1-9]\d+)/.test(sw), 'service worker cache must be v31.6 or a compatible successor');

console.log('v31.6 static checks: OK');

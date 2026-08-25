const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const db = fs.readFileSync(path.join(root, 'db.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
function ok(cond, msg){ if(!cond) throw new Error(msg); }

ok(html.includes('id="slotMapSlotIndex"'), 'Slot index container missing');
ok(app.includes("function slotMapSlotOrder(role)"), 'role-specific Slot order missing');
ok(app.includes("role === 'P' ? ['S1','S2','S3','S4'] : ['S1','S2','S3','S4','S5']"), 'goalkeeper Slot index must omit S5');
ok(app.includes('function renderSlotMapIndex(role, rolePlayers)'), 'Slot index renderer missing');
ok(app.includes('data-slot-map-index='), 'Slot index navigation controls missing');
ok(app.includes('function scrollSlotMapTo(slot, expand = true)'), 'Slot navigation function missing');
ok(app.includes("content.scrollTo({ top: targetTop, behavior: 'auto' })") && app.includes('function slotMapSectionTop(content, section)'), 'Slot navigation must target map scroller with robust relative offset');
ok(app.includes('slotMapCollapsed: {}'), 'transient collapsed state missing');
ok(app.includes('data-slot-map-toggle='), 'collapsible Slot headers missing');
ok(app.includes('aria-expanded='), 'collapsible accessibility state missing');
ok(app.includes('setSlotMapCollapsed(role, slot, false)'), 'index must reopen collapsed Slot');
ok(app.includes('function updateSlotMapActiveIndex()'), 'active Slot sync missing');
ok(app.includes('content.onscroll'), 'active Slot scroll tracking missing');
ok(app.includes('activeSlot: state.slotMapActiveSlot'), 'return context must remember active Slot');

ok(css.includes('/* v32.2 — Mappa Slot navigabile'), 'v32.2 CSS block missing');
ok(css.includes('.slot-map-slot-index'), 'Slot index styles missing');
ok(css.includes('grid-template-columns: repeat(var(--slot-index-count)'), 'dynamic Slot index grid missing');
ok(css.includes('.slot-map-index-btn.exhausted'), 'exhausted Slot index style missing');
ok(css.includes('.slot-map-slot-head') && css.includes('position: sticky'), 'sticky Slot header missing');
ok(css.includes('background: #f0f1f2'), 'Slot header neutral band missing');
ok(css.includes('border-right: 1px solid #d7dade'), 'Target rail missing');
ok(css.includes('font-weight: 500') && css.includes('.slot-map-player'), 'player names should use lighter weight');
ok(css.includes('.slot-map-slot-body[hidden]'), 'collapsed body rule missing');
ok(!app.includes('slot-map-progress'), 'progress bar logic must not return');

ok(db.includes('version: 5'), 'backup version must remain 5');
ok(sw.includes("const CACHE_NAME = 'fantacalcio-checklist-v32.2';"), 'cache must be v32.2 exactly');
ok((html.match(/class="header-icon-btn/g) || []).length === 5, 'main toolbar must remain five controls');
console.log('v32.2 static checks: OK');

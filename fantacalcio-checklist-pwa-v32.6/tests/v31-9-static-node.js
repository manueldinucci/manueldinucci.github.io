const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
function ok(cond, msg){ if(!cond) throw new Error(msg); }

// Toolbar position: v31.9 had Comprimi; v31.10 intentionally removes it.
const privacyPos = html.indexOf('id="privacyHeaderBtn"');
const commentsPos = html.indexOf('id="commentsHeaderBtn"');
const compactPos = html.indexOf('id="compactHeaderBtn"');
const participantsPos = html.indexOf('id="participantsHeaderBtn"');
const mapPos = html.indexOf('id="slotMapHeaderBtn"');
const menuPos = html.indexOf('id="menuBtn"');
if (sw.includes('fantacalcio-checklist-v31.10') || sw.includes('fantacalcio-checklist-v32')) {
  ok(compactPos < 0, 'v31.10 must remove Comprimi');
  ok(privacyPos >= 0 && commentsPos > privacyPos && participantsPos > commentsPos && mapPos > participantsPos && menuPos > mapPos, 'v31.10 toolbar order must be Sicura, Commenti, Partecipanti, Mappa Slot, Impostazioni');
  ok(!app.includes('state.compact'), 'v31.10 must remove compact renderer state');
} else {
  ok(compactPos >= 0 && participantsPos > compactPos && mapPos > participantsPos, 'Partecipanti must be between Comprimi and Mappa Slot');
}
ok(html.includes('class="header-icon-btn participants-toggle-btn active"'), 'participants eye button missing');
ok(app.includes("$('participantsHeaderBtn').addEventListener('click', toggleParticipants)"), 'participants toggle event missing');
ok(app.includes('participantsVisible: true'), 'participants default state must be visible');
ok(app.includes('participantsVisible: state.participantsVisible'), 'participants preference must be persisted');
ok(app.includes('state.participantsVisible = state.participantsVisible !== false'), 'participants preference must default true on migration');
ok(app.includes("state.participantsVisible ? participantNeedsMarkup"), 'needs grid must depend on participantsVisible');
ok(app.includes("state.participantsVisible && model.role === 'A' ? participantMaxBidMarkup"), 'attack Max Bid grid must depend on participantsVisible');
ok(app.includes("state.privacyMode || state.showAll"), 'Privacy must keep absolute rendering priority');
ok(app.includes("'Nascondi partecipanti' : 'Mostra partecipanti'"), 'accessible toggle labels missing');
ok(app.includes('participantsIconMarkup(state.participantsVisible)'), 'dynamic eye icon state missing');

// 5-letter abbreviations, collision extension, deterministic identical-name fallback.
ok(app.includes('const baseLength = 5;'), 'participant abbreviation base must be 5');
ok(app.includes('Math.min(baseLength, chars.length)'), 'short names must remain whole');
ok(app.includes("row.suffix = String(i + 1)"), 'identical-name deterministic fallback missing');
ok(app.includes(".toLocaleUpperCase('it')"), 'participant abbreviations must remain uppercase');
ok(css.includes('.demand-participant-code {'), 'participant code styling missing');
ok(css.includes('font-weight: 400;'), 'participant abbreviations must remain non-bold');
ok(css.includes('grid-template-columns: repeat(5, minmax(0, 1fr));'), 'participant micro-grid must remain five columns');

// Toolbar remains usable without shrinking the 42px controls.
ok(css.includes('.header-actions { gap: 2px; }'), 'mobile toolbar gap adaptation missing');
ok(css.includes('.participants-toggle-btn svg'), 'participants eye icon styling missing');

ok(/fantacalcio-checklist-v31\.(?:9|10)/.test(sw) || sw.includes('fantacalcio-checklist-v32'), 'service worker cache must be v31.9 or v31.10');
console.log('v31.9 static checks: OK');

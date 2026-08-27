# v33 — Aurea XI — Acceptance

Release di solo rebranding nominale basata sulla v32.9.

## Brand
- Header: `Direttore's` come kicker secondario, corsivo, stesso font stack dell'app.
- Titolo principale: `Aurea XI`.
- Browser title: `Aurea XI — Fantacalcio`.
- PWA name: `Direttore's Aurea XI`.
- PWA short name e Apple web-app title: `Aurea XI`.

## Compatibilità
- Nessuna migrazione dati.
- Backup invariato: `fantacalcio-checklist-backup`, versione 5.
- IndexedDB/localStorage invariati.
- Icone v32.9 byte-identiche.
- Core logic (`app.js`, `db.js`, `auction-logic.js`, `players.js`, `xlsx-import.js`) byte-identico alla v32.9.

## Cache
- Service Worker: `fantacalcio-checklist-v33`.

## Mobile
- Verifica header a 390×844 e 360×844: `Aurea XI` su una sola riga, nessun overflow o collisione.

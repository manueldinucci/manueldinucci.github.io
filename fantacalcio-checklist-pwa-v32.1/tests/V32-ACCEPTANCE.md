# v32 — Acceptance checklist

- `(1)` è una proprietà personale booleana manuale (`oneCreditBuy`), indipendente da Slot, Target, FVM, Quotazione e Preferiti.
- Marker `(1)` compatto nelle card e nella modal giocatore.
- Toggle `Acquisto a 1` nella valutazione personale; salvataggio immediato secondo il paradigma esistente.
- Filtro `Acquisto a 1` dentro Filtri, combinato in AND con ruolo, ricerca, squadra, Slot, FVM, Qt.A, liberi e preferiti.
- Nessun nuovo pulsante nella toolbar principale.
- `(1)` non modifica `comparePlayers` né l'ordinamento tecnico.
- Backup v32 formato 5; import compatibile con versioni 1-4 e default `false` per il campo assente.
- Aggiornamento listone preserva il record personale, incluso `oneCreditBuy`.
- Cache PWA `fantacalcio-checklist-v32`.
- Nessuna regressione su assegnazioni, Preferiti, Privacy/Safe mode, Partecipanti, Rose, Mappa Slot, Max Bid e UI mobile.

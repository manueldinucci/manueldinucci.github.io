# Accettazione v16

- [ ] Il nome giocatore mantiene la dimensione dinamica FVM e usa anche un peso dinamico moderato circa 650–800.
- [ ] Le card e la scheda giocatore mostrano la Quotazione attuale come `Qt.A`; Qt.I resta nei dati.
- [ ] La frase sotto il titolo Filtri è rimossa.
- [ ] Il filtro Slot include `S1-S2` e `S1-S3` con logica cumulativa corretta.
- [ ] `Qt.A minima` offre 1–30 e filtra sulla quotazione attuale.
- [ ] I quattro filtri Squadra / Slot / FVM minimo / Qt.A minima stanno sulla stessa riga su iPhone senza overflow.
- [ ] La Live usa a sinistra `Nome [X rimasti N]` e a destra `crediti cr · (max bid N)` con crediti in evidenza.
- [ ] Strumenti mostra `Configura asta`.
- [ ] Configura asta è più compatta nei parametri generali e nella sezione Partecipanti.
- [ ] `Prezzo base` offre esattamente `1`, `Qt.I`, `Qt.A`, `FVM`.
- [ ] Il Prezzo base precompila la tendina di assegnazione ma non è un vincolo: è sempre possibile assegnare a 1 credito se budget/slot lo consentono.
- [ ] maxBid conserva 1 credito per ciascuno degli altri slot residui, indipendentemente dal Prezzo base.
- [ ] Tema chiaro/scuro, modalità compatta, import XLSX, persistenza e offline non presentano regressioni.
- [ ] Il Service Worker usa la cache `fantacalcio-checklist-v16`.

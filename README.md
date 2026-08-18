# Fantacalcio — Checklist Asta

PWA mobile-first e offline-first per usare l’iPhone come unico strumento durante un’asta Fantacalcio.

## Cosa include

- checklist per P / D / C / A con card compatte;
- ordinamento alfabetico circolare da lettera scelta;
- dimensione continua del nome basata su FVM e slider di enfasi;
- preso/libero, preferiti, contatori e indicatore di scarsità;
- filtri live per nome, squadra, slot, FVM, prezzo, preferiti, liberi e commenti;
- modalità compatta;
- bottom sheet mobile per slot, Affare, Ideale min/max, Price Cap, commento, prezzo acquisto e manager;
- salvataggio automatico in IndexedDB;
- separazione tra dati listone, dati personali e stato asta;
- import `.xlsx`, `.csv`, `.json` con mapping correggibile e riconoscimento euristico intestazioni;
- modalità `SOSTITUISCI LISTONE` e `AGGIORNA LISTONE ESISTENTE`;
- backup JSON completo e ripristino;
- aggiunta/rimozione giocatori;
- reset asta e reset completo con conferma forte;
- tema chiaro/scuro/sistema;
- Service Worker, manifest e icone PWA, senza API o CDN runtime.

> Nota `.xls`: questa build gestisce direttamente `.xlsx`, `.csv` e `.json`. Il vecchio formato binario `.xls` viene rifiutato con un messaggio esplicito; basta salvarlo come `.xlsx` o `.csv` prima dell’importazione.

## Architettura dati

IndexedDB usa store separati:

- `playersBase`: nome, squadra, ruolo, ruolo Mantra, quotazione, FVM;
- `playersPersonal`: slot, Affare, Ideale min/max, Cap, commento, preferito;
- `auctionState`: preso, prezzo acquisto, manager;
- `settings`: ruolo corrente, lettera, filtri, slider, compatta, tema;
- `meta`: informazioni di seed/import.

La chiave di associazione è `nome normalizzato + squadra normalizzata`. Per questo un nuovo import può aggiornare FVM/quotazioni senza toccare i campi personali del giocatore riconosciuto.

## Importazione XLSX offline

`vendor/xlsx-local-reader.js` è un parser XLSX locale per workbook OOXML standard. Legge il primo foglio direttamente nel browser e non effettua richieste di rete.

Il mapping riconosce automaticamente varianti comuni:

- Nome / Calciatore / Giocatore;
- Squadra / Team / Club;
- R / Ruolo;
- RM / Mantra / Ruolo Mantra;
- Qt.A / Qt / Quotazione;
- FVM / FVM M.

Prima della conferma puoi correggere manualmente qualunque associazione.

## Prima apertura e pubblicazione HTTPS

Perché il Service Worker sia attivo su iPhone, pubblica la cartella come sito statico HTTPS. GitHub Pages, Netlify, Cloudflare Pages o un hosting statico equivalente vanno bene.

Non servono build, npm o backend: pubblica direttamente il contenuto della cartella.

Per una prova desktop locale puoi usare:

```bash
python3 -m http.server 8000
```

Poi apri `http://localhost:8000` sullo stesso computer. Su iPhone, per l’installazione finale, usa invece l’URL HTTPS pubblico.

## Installazione su iPhone

1. Apri l’URL HTTPS in Safari.
2. Attendi che l’app sia caricata completamente e compaia il feedback `App pronta anche offline`.
3. Tocca **Condividi**.
4. Scegli **Aggiungi alla schermata Home**.
5. Avvia l’app dalla nuova icona almeno una volta mentre sei ancora online.

A quel punto l’app usa `display: standalone` e il contenuto essenziale è nella cache del Service Worker.

## Verifica offline prima dell’asta

Esegui questa prova sullo stesso iPhone che userai all’asta:

1. apri la PWA dalla Home;
2. verifica che listone e commenti siano presenti;
3. chiudila completamente;
4. attiva modalità aereo e disattiva Wi‑Fi;
5. riapri la PWA dalla Home;
6. cerca un giocatore;
7. cambia lettera iniziale;
8. segna un giocatore come preso e uno come preferito;
9. modifica un commento e un prezzo;
10. chiudi e riapri l’app;
11. verifica che le modifiche siano rimaste;
12. prova a importare un `.xlsx` già salvato nell’app File;
13. esporta un backup JSON.

Questo test va fatto prima dell’asta reale, non il giorno stesso per la prima volta.

## Aggiornare il listone

Apri **••• → IMPORTA LISTONE XLSX**.

1. scegli il file dall’app File;
2. controlla il mapping;
3. verifica righe riconosciute e problemi;
4. scegli **Sostituisci listone** oppure **Aggiorna esistente**;
5. se stai sostituendo un listone, usa prima **Esporta backup**;
6. conferma.

I campi personali e lo stato asta restano separati dal listone e vengono riassociati quando la chiave nome+squadra coincide.

## Backup

Da **•••**:

- **Esporta backup** genera un JSON completo scaricabile/salvabile nell’app File;
- **Importa backup** ripristina listone, personalizzazioni, stato asta e impostazioni.

## Reset

- **Reset asta** azzera solo `preso`, `prezzo acquisto` e `manager`.
- **Reset completo** richiede di digitare `RESET` e ripristina i dati dimostrativi cancellando listone e personalizzazioni correnti.

## Aggiornare una versione già installata

Quando modifichi file statici, cambia `CACHE_NAME` in `service-worker.js` (es. da `v1` a `v2`) prima di pubblicare. Alla successiva apertura online il nuovo Service Worker potrà sostituire la cache precedente.

## Test inclusi

Con Node.js moderno:

```bash
node tests/smoke-node.js
```

Il test verifica:

- lettura reale del file `samples/listone-demo.xlsx`;
- mapping euristico delle colonne;
- conversione delle righe in giocatori;
- presenza di tutti gli asset dichiarati nel precache del Service Worker.

Per i test iPhone/PWA è comunque obbligatoria la verifica manuale offline descritta sopra, perché il comportamento di installazione e gestione cache dipende da Safari/iOS.

## Aggiornamenti quotidiani del listone Fantacalcio

La build v2 riconosce automaticamente righe introduttive prima della tabella. Nel file ufficiale `Quotazioni_Fantacalcio_Stagione_2026_27.xlsx`, ad esempio, il titolo è alla riga 1 e le intestazioni reali (`Id`, `R`, `RM`, `Nome`, `Squadra`, `Qt.A`, ..., `FVM`) sono alla riga 2.

L'importatore usa anche la colonna `Id` del listone come identificatore sorgente stabile. I dati sono separati in tre livelli:

- dati listone: squadra, ruolo, Mantra, quotazione, FVM, ID sorgente;
- dati personali: slot, Affare, Ideale min/max, Price cap, commento, preferito;
- stato asta: preso, prezzo acquisto, manager.

Perciò un nuovo XLSX può aggiornare quotazioni/FVM/squadra/ruolo senza sovrascrivere commenti, prezzi personali, preferiti o stato asta. Se un calciatore cambia squadra, l'ID stabile permette di riallineare i dati personali alla nuova chiave.

Modalità import:

- **Sostituisci listone**: rende l'elenco base coerente con il file appena importato, mantenendo i dati personali e d'asta dei giocatori riconosciuti. È la modalità più adatta per caricare l'ultima versione ufficiale prima dell'asta.
- **Aggiorna esistente**: aggiorna e aggiunge i giocatori presenti nel file, ma non rimuove dal listone locale quelli assenti dal nuovo file.

Prima di una sostituzione resta consigliato esportare un backup JSON.

## Novità v3

- **Confronto intelligente prima dell'import**: mostra nuovi giocatori, assenti dal nuovo file, cambi squadra/ruolo e variazioni di FVM/quotazione prima della conferma.
- **Sincronizza listone**: pensato per caricare il file Fantacalcio più recente poco prima dell'asta. Aggiorna i dati ufficiali e rimuove dal listone i giocatori non più presenti, preservando dati personali e stato per i giocatori riconosciuti tramite ID stabile (con fallback nome/squadra).
- **Modalità ASTA LIVE**: un tap sul pulsante ASTA/LIVE riduce l'ingombro dell'interfaccia e rende le card più dense mantenendo preso, preferito, nome, prezzi target e nota sintetica.
- **Undo immediato**: dopo aver segnato un giocatore preso/libero compare `Annulla` per alcuni secondi.
- **Scarsità evoluta**: visualizza `S1 rimasti/totali`, `S2 rimasti/totali`, ecc.; se gli slot non sono compilati usa fasce FVM TOP/SEMITOP con rapporto rimasti/totali.

Per distribuire questa versione su GitHub Pages, sostituisci i file della repository con il contenuto di questa cartella, esegui commit/push e apri una volta il sito con Internet attivo per consentire al Service Worker `v3` di aggiornare la cache offline.

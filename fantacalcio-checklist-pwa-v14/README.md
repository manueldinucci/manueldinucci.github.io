# Fantacalcio — Asta Live Manager

PWA mobile-first e offline-first per usare l’iPhone come unico strumento durante un’asta Fantacalcio.


## Novità v14

- riga rossa del fabbisogno riportata alle dimensioni della v11 per evitare tagli su Difensori e Centrocampisti;
- `Target min` e `Target max` nella scheda giocatore trasformati in menu a tendina da 0 a 300;
- titolo della scheda situazione rinominato da `Fantallenatori` a `Live`;
- aggiunto nella scheda Live un riquadro dinamico `P/D/C/A rimasti: X` basato sui giocatori liberi del ruolo corrente;
- `Importa listone .xlsx` rinominato e reso verde nelle Impostazioni;
- `Gestione fantallenatori` spostata al secondo posto e resa grigio chiaro;
- Service Worker aggiornato alla cache `fantacalcio-checklist-v14`.

## Novità v13

- pulsanti `+ / −` ulteriormente ridotti visivamente, con area touch estesa preservata;
- rimossa dalla scheda giocatore la casella di stato `LIBERO / PRESO`;
- `Slot`, `Target min` e `Target max` disposti sulla stessa riga;
- prezzo di assegnazione trasformato in menu a tendina con valori interi da 1 a 300;
- rimosso dalla finestra di assegnazione il riepilogo dettagliato del fantallenatore, mantenendo validazione e messaggi di errore;
- Service Worker aggiornato alla cache `fantacalcio-checklist-v13`.


## Novità v12

- riga del fabbisogno leggermente più grande e leggibile, senza aumentarne l'ingombro verticale;
- pulsanti `+ / −` visivamente più piccoli, mantenendo un'area touch estesa;
- filtro `FVM minimo` trasformato in menu a tendina da 1 a 100;
- rimosso il filtro `Target max ≤`;
- `Modalità compatta` spostata dai filtri nell'header, subito a sinistra del tema, con toggle dedicato e stato persistente;
- Service Worker aggiornato alla cache `fantacalcio-checklist-v12`.

## Novità v11

- header con pulsanti tema e impostazioni `⚙`;
- pulsante `FANTA` rinominato `LIVE`;
- rimossa completamente la vecchia modalità ASTA;
- una sola riga di fabbisogno, con `⚠` quando il bacino principale è inferiore agli slot ancora da riempire;
- assegnazione dalla card tramite `+` nero a destra e rimozione protetta tramite `−` attenuato;
- preferiti evidenziati con stella oro e nome oro, senza alterare lo sfondo S1–S5;
- rimossi i filtri “Solo con commento” e “Modalità asta”.

## Cosa include

- lista live P / D / C / A con card compatte e pulsanti `+ / −` per assegnazione/rimozione;
- ordinamento alfabetico circolare da lettera scelta;
- dimensione continua del nome basata su FVM e slider di enfasi;
- preso/libero, preferiti e contatori;
- riga fabbisogno ruolo-specifica basata su slot residui e giocatori S1–S5 ancora disponibili;
- filtri live per nome, squadra, slot, FVM, preferiti e liberi;
- modalità compatta;
- bottom sheet mobile per slot, Range Target, commento, prezzo acquisto e manager;
- salvataggio automatico in IndexedDB;
- separazione tra dati listone, dati personali e stato asta;
- import `.xlsx`, `.csv`, `.json` con mapping correggibile e riconoscimento euristico intestazioni;
- modalità `SOSTITUISCI LISTONE` e `AGGIORNA LISTONE ESISTENTE`;
- backup JSON completo e ripristino;
- aggiunta/rimozione giocatori;
- reset asta e reset completo con conferma forte;
- tema chiaro/scuro con pulsante dedicato nell’header;
- Service Worker, manifest e icone PWA, senza API o CDN runtime.

> Nota `.xls`: questa build gestisce direttamente `.xlsx`, `.csv` e `.json`. Il vecchio formato binario `.xls` viene rifiutato con un messaggio esplicito; basta salvarlo come `.xlsx` o `.csv` prima dell’importazione.

## Architettura dati

IndexedDB usa store separati:

- `playersBase`: nome, squadra, ruolo, ruolo Mantra, quotazione attuale, quotazione iniziale, FVM;
- `playersPersonal`: slot, Range Target, dati legacy dei prezzi, commento, preferito;
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
- Qt.A / Quotazione attuale;
- Qt.I / Quotazione iniziale / QI;
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

Apri **⚙ → IMPORTA LISTONE XLSX**.

1. scegli il file dall’app File;
2. controlla il mapping;
3. verifica righe riconosciute e problemi;
4. scegli **Sostituisci listone** oppure **Aggiorna esistente**;
5. se stai sostituendo un listone, usa prima **Esporta backup**;
6. conferma.

I campi personali e lo stato asta restano separati dal listone e vengono riassociati quando la chiave nome+squadra coincide.

## Backup

Da **⚙**:

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
- dati personali: slot, Range Target, campi prezzo legacy, commento, preferito;
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

## Novità v5 — Fantallenatori e budget live

La v5 aggiunge un modulo completamente offline per monitorare i partecipanti durante l'asta.

### Configurazione

Da **Strumenti → Gestione fantallenatori → Configura asta e partecipanti** puoi impostare:

- budget iniziale globale;
- prezzo minimo;
- composizione della rosa P/D/C/A;
- partecipanti, nome squadra opzionale e budget iniziale individuale opzionale.

Il numero dei partecipanti coincide con le righe configurate: usa **+ Aggiungi** o **×** per modificarlo.

### Assegnazione rapida

Quando sono presenti fantallenatori configurati, il tap sul pulsante `+` di un giocatore libero apre il foglio rapido di assegnazione:

1. scegli il fantallenatore;
2. inserisci il prezzo;
3. conferma.

La PWA valida budget, prezzo minimo, slot del ruolo, rosa completa e massima offerta teorica. È disponibile **Forza assegnazione** solo dopo un avviso esplicito.

Le statistiche non sono incrementate/decrementate in modo fragile: vengono sempre ricalcolate dalle assegnazioni presenti nel database.

### Pannello Fantallenatori

Il pulsante **LIVE** apre il riepilogo con:

- budget residuo / iniziale;
- spesa totale;
- giocatori acquistati e slot rimasti;
- slot P/D/C/A ancora disponibili;
- max offerta teorica;
- budget medio per slot.

Sono disponibili solo tre ordinamenti operativi, tutti decrescenti: slot rimasti, max offerta e budget residuo.

### Competitori

Nel dettaglio di un giocatore libero compare **Possibili competitori**. Sono mostrati solo i partecipanti che hanno ancora uno slot del ruolo e capacità economica. Se è presente `Target max`, il confronto economico usa quel valore come riferimento.

### Backup e reset

Il backup JSON v2 comprende anche configurazione asta e fantallenatori. I vecchi backup v1 restano importabili.

**Reset asta** azzera assegnazioni, prezzi di acquisto e acquirenti. Budget e slot tornano automaticamente ai valori iniziali perché sono statistiche derivate. Commenti, target, slot personali e preferiti non vengono cancellati.

## Novità v6 — Occhi sugli avversari

La v6 aggiunge una lettura strategica del ruolo corrente senza introdurre dipendenze online. Nella configurazione dei partecipanti è possibile indicare un solo profilo come **Io**; quando presente, i riepiloghi “avversari” lo escludono automaticamente.

Dopo un'assegnazione compare per circa 5,6 secondi una mini-card con fantallenatore, giocatore, prezzo, slot rimasti nel ruolo appena occupato, budget residuo, max bid e slot totali. Se il reparto viene completato compare `RUOLO COMPLETO ✓`. `ANNULLA` continua a ripristinare assegnazione, budget e slot.

Il pannello Fantallenatori dispone della vista **Occhi sugli avversari**, riferita al ruolo selezionato nell'app. Mostra domanda residua, avversari attivi, giocatori di interesse ancora disponibili, rapporto domanda/offerta, pressione del ruolo e indicatori di bisogno/minaccia. Tutti i valori vengono ricalcolati dalle assegnazioni reali e non da contatori incrementali.

## Novità v7 — Range target e prezzo reale in card

La valutazione personale è ora semplificata in `Target min` e `Target max`. I vecchi campi `prezzo_ideale_min` e `prezzo_ideale_max` vengono migrati automaticamente verso `target_min` e `target_max`; `prezzo_affare` resta conservato come dato legacy ma non viene più mostrato nella UI principale.

Per i giocatori liberi la card mostra il range target (`45–55`). Dopo l'assegnazione il range scompare dalla card e viene sostituito da acquirente e prezzo reale (`Luca · 58 cr`). Se è disponibile solo uno dei due dati viene mostrato solo quello, senza separatori o valori vuoti. Undo e Reset asta riportano automaticamente la card allo stato libero e quindi al range target.

I backup v3 includono i nuovi campi target e l'importazione continua ad accettare backup v1/v2, migrando i vecchi valori ideali senza perdita di dati.


## Novità v8 — Rifiniture UX

La v8 è una revisione chirurgica della v7. I filtri sono ora un bottom sheet indipendente dalla posizione di scroll e il pulsante mostra il numero di filtri attivi. Le card senza Range Target non mostrano più placeholder. Il Price Cap è rimosso dall'interfaccia e dalla logica operativa; eventuali vecchi valori restano solo come dati legacy compatibili con i backup precedenti.

La definizione dei giocatori di interesse usata nel rapporto domanda/offerta è configurabile: `S1–S3`, `S1–S2`, soglia FVM minima o percentile FVM. La schermata principale esplicita sempre il criterio in uso.

Il pannello Fantallenatori è stato alleggerito: niente modalità ultra compatta, niente riepilogo pressione duplicato e niente riepilogo statico della configurazione. Gli ordinamenti disponibili sono solo `Slot rimasti`, `Max offerta` e `Budget residuo`, tutti decrescenti. La vista **Occhi sugli avversari** include anche il proprio profilo con badge `TU`, ma il profilo `TU` resta escluso dai calcoli sugli avversari.

Ogni partecipante dispone inoltre di un recap rosa espandibile, raggruppato per P/D/C/A, con nome, prezzo di acquisto e spesa per reparto.

Un giocatore già assegnato non può più essere liberato con un singolo tocco accidentale: il secondo tap sulla checkbox apre una conferma esplicita. L'Undo immediato dopo una nuova assegnazione resta disponibile.

Il Service Worker usa la cache `v8` e il backup corrente è in formato v4; i backup v1–v3 restano importabili.


## Novità v9 — Asta Live Manager

La v9 rifinisce soprattutto la lettura live da iPhone.

### Fantallenatori

La sezione **LIVE** usa ora una sola vista unificata. Ogni card mostra soltanto:

- budget residuo;
- max offerta;
- slot rimasti del ruolo correntemente selezionato.

L'ordinamento `Slot rimasti` usa il ruolo corrente. La card include inoltre una tendina **Rosa** con riepilogo occupati/totali (`P 3/3 | D 4/8 | C 2/8 | A 1/6`) e, in espansione, i giocatori acquistati con prezzo.

### Card giocatore

Per i giocatori liberi la gerarchia è:

1. nome e squadra;
2. `Slot | Range Target`, ad esempio `S1 | 40–50`;
3. `FVM · QI · Nota personale`, ad esempio `FVM 211 · QI 21 · Molto interessante sotto 50`.

L'importatore riconosce separatamente `Qt.A` come quotazione attuale e `Qt.I` come **Quotazione Iniziale (QI)**.

Le card libere hanno anche una scala di grigi molto leggera basata su S1–S5. Gli stati hanno priorità: **preso > preferito > slot**.

### Tema e nome PWA

Il tema è un toggle diretto **Chiaro ↔ Scuro**. Il nome visualizzato è **Asta Live Manager** (`Asta Live` come short name PWA).

Il Service Worker usa la cache `fantacalcio-checklist-v14`. Non è necessario reinstallare la PWA né cancellare IndexedDB: dopo il deploy basta aprire una volta il sito online per ricevere la nuova app shell.

## Novità v11 — schermata principale più operativa

La v11 elimina completamente la vecchia modalità ASTA: non esistono più pulsante, filtro o stato dedicato. La schermata corrente è sempre quella operativa.

Nell'header trovi il pulsante tema e `⚙` per gli strumenti. Il pulsante `LIVE` apre la situazione Fantallenatori.

La schermata principale usa una sola riga di fabbisogno:

- P: `P • Fabbisogno: X • S1 disponibili: Y • S2 disponibili: Z`
- D: `D • Fabbisogno: X • S1-S3 disponibili: Y • S4-S5 disponibili: Z`
- C: `C • Fabbisogno: X • S1-S3 disponibili: Y • S4-S5 disponibili: Z`
- A: `A • Fabbisogno: X • S1-S2 disponibili: Y • S3 disponibili: Z`

`⚠` compare solo quando il bacino principale è inferiore al fabbisogno residuo complessivo della lega.

Sulle card, la stella è l'unico controllo a sinistra. A destra `+` assegna il giocatore; dopo l'assegnazione diventa `−` e richiede conferma prima di liberarlo. Lo sfondo resta legato allo slot S1–S5; un preferito usa stella e nome oro senza sostituire lo sfondo.

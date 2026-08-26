# Fantacalcio Checklist PWA v32.9

## v32.9 — nuova identità visiva dell’app

- Sostituita l’icona PWA con il nuovo emblema approvato: metà pallone stilizzato grigio a sinistra e metà destra di Uomo Vitruviano oro a destra, racchiusi in una circonferenza continua.
- Palette limitata a bianco/quasi bianco, grigi e oro; resa flat, senza profondità, ombre o nuovi elementi grafici.
- Aggiornati `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` e `favicon.png`; la variante maskable usa una safe area più conservativa.
- Nessuna modifica funzionale: UI v32.8, Mappa Slot, dati, backup v5, IndexedDB, import XLSX e logiche d’asta restano invariati.
- Cache aggiornata a `fantacalcio-checklist-v32.9`.

# Fantacalcio Checklist PWA v32.8

## v32.8 — microfasce più leggibili

- Uniformato il ritmo verticale tra nuove microfasce nei layout compatti e quello già consolidato nelle righe verticali.
- Aggiunto un separatore ultra-light (`1px`, `rgba(0, 0, 0, 0.05)`) limitato alla sola colonna Nomi: non attraversa mai la colonna Target.
- Il separatore compare soltanto tra microfasce differenti; il normale wrapping della stessa microfascia resta privo di linea e spacing extra.
- Packing semantico v32.7.2, Target, Preferiti, accordion, dati, backup v5 e IndexedDB restano invariati.
- Cache aggiornata a `fantacalcio-checklist-v32.8`.

# Fantacalcio Checklist PWA v32.7.2

## v32.7.2 — hotfix microfasce compatte

- I Target iniziali, inline e verticali condividono la stessa tipografia.
- Il layout compatto conserva la struttura semantica `Target + giocatori`: se una nuova microfascia apre una nuova riga fisica, il suo Target torna nella colonna Target.
- Se va a capo soltanto l’elenco dei giocatori della stessa microfascia, la continuazione resta nella colonna Nomi senza ripetere il Target.
- Nessuna modifica a dati, backup v5, IndexedDB, classificazioni o logiche d’asta.


## Hotfix Mappa Slot v32.7.1

- Le righe compatte usano ora la stessa griglia invisibile `Target | Nomi` delle righe verticali.
- Il primo Target del blocco compatto occupa la colonna Target comune; i Target successivi restano inline nel flusso dei nomi.
- Il wrapping resta confinato nella colonna Nomi: ogni riga di continuazione riparte dalla stessa ascissa del primo nome e non invade mai la colonna Target.
- Layout per ruolo, Preferiti oro + 700, accordion, stati iniziali, Coperture nascoste nei Portieri e modello dati della v32.7 restano invariati.
- Cache aggiornata a `fantacalcio-checklist-v32.7.1`; formato backup invariato.

# Fantacalcio Checklist PWA v32.7

## Mappa Slot v32.7

- Rendering differenziato per ruolo: Por S1/S2 verticali; Dif/Cen/Att S1 inline e S2 verticale.
- Stati iniziali accordion: Por S3/S4 chiusi; Cen/Att S5 chiusi.
- La categoria portieri `COPERTURE` resta nei dati ma non viene mostrata nella Mappa Slot.
- I Preferiti sono evidenziati nella Mappa con lo stesso oro della stella attiva e `font-weight: 700`, senza icone o badge aggiuntivi.
- Geometria, baseline, wrapping, conteggi, sticky header e modello dati restano quelli consolidati in v32.6.1.
- Cache aggiornata a `fantacalcio-checklist-v32.7`; formato backup invariato.

# Fantacalcio Checklist PWA v32.6.1 (storico)


## Hotfix v32.6.1

- Mappa Slot: allineamento verticale dei Target di S3/S4/S5 e `n.c.` Fuori Slot sulla baseline della prima riga dei nomi.
- Nessun cambio a struttura, assi orizzontali, wrapping, densità, modello dati o backup v5.
- Cache aggiornata a `fantacalcio-checklist-v32.6.1`.

## Novità v32.6
- Mappa Slot rifinita senza redesign: stessa densità/minimalità, ma assi tipografici più rigorosi.
- S3/S4/S5 e Fuori Slot condividono una colonna Target unica allineata a destra e una sola ascissa per i nomi/wrapping.
- S1/S2 restano inline ma partono otticamente dalla stessa colonna dei nomi; gruppi Target + primo nome protetti e spacing uniforme.
- Header Slot/Fuori Slot: colonne fisse per conteggio e chevron, stessa altezza/padding e numeri tabulari.
- Nessun cambio a dati, backup v5, logiche d’asta o import; cache `fantacalcio-checklist-v32.6`.

# Fantacalcio Checklist PWA v32.5

## Novità v32.5

- Mappa Slot rifinita su una griglia editoriale invisibile: header con colonne fisse per conteggio e chevron, Target S3+ allineati a destra e nomi sempre sulla stessa ascissa.
- S1/S2 restano inline ma con inset coerente e gruppi Target più regolari; Target + primo nome rimangono uniti quando possibile.
- Wrapping S3+/Fuori Slot allineato alla colonna nomi, senza divisori visibili o ritorno dell’effetto tabella.
- `Fuori Slot` adotta lo stesso linguaggio geometrico degli header Slot, senza aspetto da bottone separato.
- Densità, accordion, sticky header, nomi tappabili, `0/Y` rosso e backup v5 restano invariati; cache `fantacalcio-checklist-v32.5`.

# Fantacalcio Checklist PWA v32.4

## Novità v32.4

- Mappa Slot ulteriormente minimalizzata: S3/S4/S5 mantengono la categorizzazione per Target ma senza griglia, bordi orizzontali o alternanza da tabella.
- Colonna Target ridotta e resa puramente tipografica; più larghezza utile destinata ai nomi e wrapping allineato.
- S1/S2 inline ulteriormente compattati; header Slot più sottili e superfici grayscale meno invasive.
- Accordion, sticky header, nomi tappabili, ritorno alla posizione, conteggi `X/Y` e alert `0/Y` restano invariati.
- Bugfix dei separatori `·` preservato; nessun bullet/list marker.
- Modello dati e backup restano v5; cache Service Worker `fantacalcio-checklist-v32.4`.

# Fantacalcio Checklist PWA v32.3

## Novità v32.3

- Rimossa completamente la barra/indice `S1–S5` della Mappa Slot e la relativa logica di salto/stato attivo: gli header Slot richiudibili e sticky restano l’unico sistema di navigazione per fascia.
- Reintrodotta una gerarchia grayscale leggera e coerente con le Rose, senza tornare alle grandi card grigie.
- `S1` e `S2` ora usano una lista compatta inline raggruppata per Target; `S3+` mantiene la struttura analitica `Target │ Giocatori`.
- Layout deterministico per Slot, indipendente dal numero di giocatori rimasti durante l’asta.
- Corretto il wrapping dei nomi: il punto mediano `·` compare soltanto tra due giocatori e non può più presentarsi come bullet/separatore isolato a inizio riga.
- Modello dati e backup restano v5; cache Service Worker `fantacalcio-checklist-v32.3`.

# Fantacalcio Checklist PWA v32.2

## Novità v32.2

- Mappa Slot trasformata in strumento di navigazione: indice rapido `S1–S5` con conteggi residui e salto diretto alla fascia.
- Slot collassabili; il tap sull’indice riapre automaticamente uno Slot chiuso e lo porta in vista.
- Header Slot compatti e sticky, con banda neutra e contatore `X/Y`; Slot esauriti evidenziati solo in rosso/grassetto.
- Sottofasce in vera struttura editoriale `Target │ Giocatori`, con colonna Target stabile, separatori sottili e nomi a peso tipografico ridotto.
- Stato dello Slot corrente evidenziato nell’indice durante lo scroll; apertura dei giocatori e ritorno alla posizione della Mappa preservati.
- Cache Service Worker `fantacalcio-checklist-v32.2`; modello dati e backup v5 invariati.

# Fantacalcio Checklist PWA v32.1

## Novità v32.1

- Marker `1` tra Slot e Target nelle card e controllo rapido `1` nella barra della modal `Assegna giocatore | 1 | ☆ | ×`.
- `Sx:0` rosso e in grassetto solo quando la fascia è realmente esaurita, indipendentemente dai filtri di visualizzazione.
- Mappa Slot più compatta: righe testuali, contatori `X/Y`, header Slot sticky, nessuna progress bar e nomi tappabili.
- Apertura della modal dalla Mappa con ripristino di reparto e posizione di scroll alla chiusura.
- Cache Service Worker `fantacalcio-checklist-v32.1`; modello dati e backup v5 invariati.

## Novità v32

- Nuova classificazione strategica manuale `(1)` / `oneCreditBuy`: indica i giocatori che prenderemmo immediatamente se stessero per essere assegnati a 1 credito.
- Marker `(1)` compatto nelle card e nella scheda giocatore, indipendente da Slot, Target e Preferiti.
- Nuovo filtro `Acquisto a 1`, combinabile in AND con gli altri filtri senza modificare l’ordinamento tecnico.
- Persistenza IndexedDB, aggiornamento listone e backup compatibili; i backup v32 usano formato 5 e i backup precedenti migrano `oneCreditBuy` a `false`.
- Cache Service Worker aggiornata a `fantacalcio-checklist-v32`.

# Fantacalcio Checklist PWA — v31.10

Release di rifinitura, consolidamento e semplificazione dell’interfaccia, costruita sulla v31.9 stabile:
- `Rose` con gerarchia monocromatica di grigi e crediti residui nel formato `XXX CR RIM.`;
- monitor partecipanti con occupazione dinamica `owned/quota` (es. `4/8`) e rimozione del `FAB` aggregato dalla UI;
- `Configura asta` mobile resa keyboard-aware con singolo contenitore scrollabile, `100dvh` e `Visual Viewport`;
- scheda giocatore trasformata da bottom sheet a modal compatta centrata, senza monitor concorrenza;
- nuova icona lineare scudo + punto esclamativo per la Modalità sicura;
- precedente Vista compatta resa layout standard permanente e rimosso il controllo `Comprimi`;
- partecipanti configurabili tramite un solo nome, con abbreviazioni strategiche automatiche a 5 lettere e migrazione legacy che preserva gli ID interni;
- Service Worker aggiornato alla cache `fantacalcio-checklist-v31.10`.

# Fantacalcio Checklist PWA — v31.9

Release chirurgica UI:
- nuovo toggle persistente `Partecipanti` con icona occhio tra Comprimi e Mappa Slot;
- toggle globale che mostra/nasconde micro-griglia partecipanti e, in Attacco, MAX BID, lasciando visibile S1-S5/FAB;
- Privacy mantiene priorità assoluta senza alterare la preferenza Partecipanti;
- abbreviazioni partecipanti portate a 5 lettere, maiuscole, con disambiguazione deterministica;
- Service Worker aggiornato alla cache `fantacalcio-checklist-v31.9`.

# Fantacalcio Checklist PWA — v31.8

Release sperimentale e chirurgica orientata alla leggibilità durante l’asta:
- navigazione `Por | Dif | Cen | Att | Tutti | Rose` su sei colonne equivalenti a tutta larghezza;
- blocco strategico ad alto contrasto e nascosto integralmente dalla modalità Privacy;
- stato partecipanti in micro-griglia delimitata a 5 colonne, ordinata per carenza residua;
- in Attacco, seconda micro-griglia `MAX BID` ordinata per Max Bid decrescente;
- `Rose` ordinate per potere d’acquisto e compattate in righe inline `P/D/C/A`;
- Service Worker aggiornato alla cache `fantacalcio-checklist-v31.8`.

# Fantacalcio Checklist PWA — v31.3

Hotfix UI/UX della Mappa Slot:
- centratura ottica definitiva dei tab `Por / Dif / Cen / Att`;
- etichetta `n.c.` al posto di `Senza target`;
- corpo della Mappa Slot realmente scrollabile fino a `Fuori slot` e all'ultimo elemento, con safe area iPhone;
- sottofasce delimitate da campiture grigie progressive a tutta larghezza della riga.

# Fantacalcio Checklist PWA v31.1

## v31.1

- Hotfix avvio: rimosso il riferimento residuo a `updateThemeButton()` dopo la rimozione del tema scuro.
- Nessuna modifica funzionale alla Mappa Slot o alle altre funzioni v31.
- Service Worker aggiornato alla cache `fantacalcio-checklist-v31.1`.

## v31

- Nuova `Mappa Slot` per leggere rapidamente la disponibilità residua della graduatoria personale per reparto, Slot e sottofascia Target.
- Giocatori già acquistati mantenuti nella loro fascia con nome barrato e conteggi `rimasti/totali` aggiornati dallo stato reale dell’asta.
- Navigazione interna `Por | Dif | Cen | Att`, supporto specifico a Copertura portieri e Fuori Slot collassato.
- Privacy applicata alla Mappa Slot senza esporre le sottofasce economiche.
- Tema scuro e relativo pulsante rimossi; l’app usa esclusivamente il tema chiaro e neutralizza preferenze dark legacy.
- Service Worker aggiornato alla cache `fantacalcio-checklist-v31`.

## v24

- Importazione listone con confronto intelligente rispetto alla versione precedente: aggiunti, rimossi e cambi squadra.
- I dati personali dei giocatori riconosciuti restano separati e conservati; i giocatori rimossi vengono mantenuti in uno storico interno per consentire un eventuale ripristino futuro.
- Nuovo bottom sheet `Novità listone` dopo una sincronizzazione con variazioni rilevanti.
- Nuova icona PWA con pallone + martelletto d’asta, aggiornata per manifest, maskable, Apple Touch Icon e favicon.
- Service Worker aggiornato alla cache `fantacalcio-checklist-v24`.


## v23

- Correzione specifica Safari/PWA iPhone: il campo Commento viene mantenuto sopra la action bar durante l'apertura della tastiera e della toolbar accessoria iOS.
- Lo spazio scrollabile della scheda giocatore riserva dinamicamente l'altezza reale della barra `Assegna giocatore | ☆/★ | ×` più safe area e margine tastiera.
- Nelle sole card principali gli slot vengono mostrati come `1° slot`, `2° slot`, `3° slot`…; valori e nomenclatura interna restano `S1`, `S2`, `S3`… .

## v22

- Nessun giocatore demo al primo avvio; migrazione prudente dei vecchi seed, cancellazione reale dei Target con `—` e card con badge Slot + pill Target più leggibile.

## v21

- Vista Tutti, nuovo pannello Ordina per, modifica assegnazione, barra azioni scheda giocatore e Live all’80%.

## Novità v20
Tipografia dei pulsanti principali uniformata; scheda giocatore resa keyboard-aware su iPhone tramite Visual Viewport e scroll interno mirato del campo attivo.

## Novità v19

Live e Rose sono ora bottom sheet mobile-first con ripristino dello stato sottostante; Configura asta ha righe Partecipanti più pulite con toggle Io compatto.

— Asta Live Manager

PWA mobile-first e offline-first per usare l’iPhone come unico strumento durante un’asta Fantacalcio.


## Novità v18

- navigazione superiore aggiornata a `Por | Dif | Cen | Att | Live | Rose`;
- nella Live è tornato l’ordinamento per `Slot rimasti` o `Max bid possibile`, entrambi decrescenti;
- badge Live nel formato `P/D/C/A - X SLOT RIMASTI`, con singolare corretto e stato `AL COMPLETO` a zero;
- i partecipanti `AL COMPLETO` vengono attenuati visivamente senza perdere interattività;
- dettaglio espanso Live disposto in due colonne bilanciate, mantenendo nome giocatore e prezzo di acquisto;
- stessa compattazione a due colonne applicata alle rose complete;
- nel riepilogo Rose è stata rimossa la parola ridondante `Rosa`;
- Service Worker aggiornato alla cache `fantacalcio-checklist-v18`.

## Novità v17

- nelle card giocatore la Quotazione attuale è ora mostrata come `Quot` e precede l’FVM;
- in `Configura asta`, P/D/C/A sono menu a tendina 1–10 e il budget opzionale per singolo partecipante è stato rimosso;
- navigazione principale riorganizzata su `P | D | C | A | Live | Rose`, con seconda riga `Lettera iniz. | Cerca giocatore | Filtri`;
- `Live` è ora una vista minimale per il ruolo corrente: nome, slot rimasti, crediti, max bid e dettaglio espandibile dei soli acquisti di quel ruolo con relativo prezzo;
- nuova vista `Rose` dedicata alla consultazione completa delle squadre e dei riepiloghi P/D/C/A;
- il budget globale è l’unica fonte usata per tutti i fantallenatori; eventuali override legacy individuali non incidono più sui calcoli;
- Service Worker aggiornato alla cache `fantacalcio-checklist-v17`.

## Novità v16

- gerarchia dei nomi affinata: dimensione dinamica FVM confermata e peso dinamico moderato circa 650–800;
- nelle card e nella scheda giocatore la quotazione di riferimento visibile è la Quotazione attuale, abbreviata `Qt.A`;
- Filtri semplificati, con nuovi intervalli cumulativi `S1-S2` / `S1-S3` e filtro `Qt.A minima` 1–30;
- quattro filtri principali disposti sulla stessa riga;
- Live riorganizzata in due blocchi: `Nome [ruolo rimasti]` e `crediti · (max bid ...)`;
- `Gestione fantallenatori` rinominato `Configura asta`; parametri generali e Partecipanti resi più compatti;
- `Prezzo minimo` sostituito da `Prezzo base` (`1`, `Qt.I`, `Qt.A`, `FVM`), usato solo come proposta iniziale: il minimo regolamentare resta 1 credito;
- Service Worker aggiornato alla cache `fantacalcio-checklist-v17`.

## Novità v15

- rimosso dalla testata Live il conteggio globale dei giocatori liberi del ruolo;
- evidenziati dentro ogni card i soli slot ancora da riempire del fantallenatore nel ruolo corrente, con badge `P/D/C/A rimasti X`;
- nome, badge ruolo, `Max` e crediti residui compattati su un'unica riga principale;
- pulsanti `+ / −` ridotti ulteriormente a 36×36 px, mantenendo un'area touch di circa 44 px;
- Service Worker aggiornato alla cache `fantacalcio-checklist-v15`.


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
- **Reset completo** richiede di digitare `RESET` e cancella listone e personalizzazioni correnti lasciando la lista giocatori vuota.

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

Da **Strumenti → Configura asta** puoi impostare:

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
3. `FVM · Qt.A · Nota personale`, ad esempio `FVM 211 · Qt.A 21 · Molto interessante sotto 50`.

L'importatore riconosce separatamente `Qt.A` come quotazione attuale e `Qt.I` come **Quotazione Iniziale (QI)**.

Le card libere hanno anche una scala di grigi molto leggera basata su S1–S5. Gli stati hanno priorità: **preso > preferito > slot**.

### Tema e nome PWA

Il tema è un toggle diretto **Chiaro ↔ Scuro**. Il nome visualizzato è **Asta Live Manager** (`Asta Live` come short name PWA).

Il Service Worker usa la cache `fantacalcio-checklist-v18`. Non è necessario reinstallare la PWA né cancellare IndexedDB: dopo il deploy basta aprire una volta il sito online per ricevere la nuova app shell.

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


## v28
- Toggle commenti nelle card principali.
- Ordinamento Slot: Slot, Target max desc, FVM desc, nome.
- Modalità privacy rapida e titolo Live Asta.


## v29

- I filtri **Squadra** e **Slot** restano attivi passando tra Por/Dif/Cen/Att/Tutti, anche quando il nuovo reparto produce zero risultati.
- Le opzioni cumulative **S1-S2** e **S1-S3** seguono la stessa persistenza.
- **Ordina per** e **Filtri** ora si aprono come popover contestuali vicino ai rispettivi pulsanti della toolbar, senza bottom sheet o backdrop.
- I popover restano nel viewport, si chiudono al tap fuori, con Escape, secondo tap sul trigger, scroll o resize.
- Cache PWA aggiornata a `fantacalcio-checklist-v29`.


## v29.1 hotfix
Ordina e Filtri sono popover contestuali senza backdrop globale; controlli interattivi e click-away preservati.

## v30
- Aggiunto `Reset filtri` nel popover Filtri: ripristina Squadra, Slot, FVM minimo, Qt.A minima, Solo liberi e Solo preferiti senza toccare ricerca, ordinamento o ruolo.
- Corretto il click-through dei popover: il primo click fuori da Ordina/Filtri chiude soltanto il popover e non attiva card o controlli sottostanti.
- Nuova icona PWA minimale monocromatica: pallone geometrico senza martelletto, applicata a favicon, Apple Touch Icon, icone 192/512 e maskable.
- Cache PWA aggiornata a `fantacalcio-checklist-v30`.


## v31.6

- Mappa Slot: i gruppi classificati senza Target mostrano sempre `n.c.` nella stessa colonna delle altre sottofasce.
- `FAB` ora somma il fabbisogno residuo del reparto per tutti i fantallenatori configurati.
- Nuova riga compatta partecipanti: abbreviazione minima da 3 lettere, giocatori posseduti nel ruolo, ordinamento dinamico per carenza residua e attenuazione dei reparti completi.
- Service Worker aggiornato alla cache `fantacalcio-checklist-v31.6`.

## v31.5

- Mappa Slot: wrapping dei nomi convertito a flusso inline naturale; le righe successive sono allineate alla prima e il separatore `·` non apre più una nuova riga.
- Riga sintetica reparto: conteggi live `S1 | S2 | S3 | S4 | S5` (solo S1-S4 per i portieri) e `FAB` riferito alla rosa marcata come `Io`.
- Service Worker aggiornato alla cache `fantacalcio-checklist-v31.5`.


## v31.7

- Attacco: aggiunta terza riga sintetica con Max Bid dei partecipanti, ordinata per Max Bid decrescente e aggiornata dallo stesso calcolo economico già usato dall'app.
- Abbreviazioni partecipanti in maiuscolo e peso tipografico normale; `FAB` non è più in grassetto.
- Rimossa la voce Live dalla navigazione: `Por | Dif | Cen | Att | Tutti | Rose`.
- Rose: titolo senza reparto, card partecipanti aperte di default e richiudibili; header ridotto a nome + crediti residui; eliminato il riepilogo aggregato P/D/C/A.
- Service Worker aggiornato alla cache `fantacalcio-checklist-v31.7`.


## v31.8

- Navigazione `Por | Dif | Cen | Att | Tutti | Rose` distribuita su sei colonne equivalenti a tutta larghezza.
- Blocco strategico ad alto contrasto: testo nero; in Privacy viene nascosto integralmente.
- Stato partecipanti trasformato in micro-griglia a 5 colonne, ordinata per carenza residua; partecipanti completi attenuati.
- In Attacco, Max Bid mostrati in una seconda micro-griglia dedicata e ordinata per potere d’acquisto.
- Rose ordinate dinamicamente per Max Bid decrescente, poi crediti residui e ordine originale.
- Contenuto Rose compattato in quattro righe `P/D/C/A` con nomi e prezzi inline.
- Service Worker aggiornato alla cache `fantacalcio-checklist-v31.8`.
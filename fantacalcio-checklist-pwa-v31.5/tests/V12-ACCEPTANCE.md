# V12 acceptance

- Riga fabbisogno più leggibile, ancora su una sola riga con ellissi di sicurezza.
- Pulsanti `+ / −` visivamente ridotti, con area touch estesa tramite pseudo-elemento.
- `FVM minimo` è un select con opzione neutra e valori interi 1–100.
- `Target max ≤` rimosso da UI, stato persistente e logica di filtro.
- `Modalità compatta` rimossa dai filtri e spostata nell'header a sinistra del tema.
- Il toggle compatto espone stato `aria-pressed`, resta persistente e non modifica la logica delle card.
- IndexedDB, importazione, assegnazioni e logica asta invariati.
- Service Worker cache aggiornata a v12.

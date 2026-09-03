# V20 Acceptance

- Por/Dif/Cen/Att/Live/Rose/Filtri condividono la stessa scala tipografica principale (~14px, ~700).
- I conteggi dei ruoli restano secondari (~10–11px, 500–600).
- La scheda giocatore usa `visualViewport` quando disponibile e un fallback su `innerHeight`.
- La scheda giocatore adatta altezza e scroll interno alla tastiera senza affidarsi a `scrollIntoView()` globale.
- Commento, Slot e Target mantengono il focus visibile tramite scroll del solo contenitore della scheda.
- Service Worker usa cache v20.

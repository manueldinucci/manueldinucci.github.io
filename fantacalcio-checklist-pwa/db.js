(() => {
  const DB_NAME = 'fantacalcio-checklist-db';
  const DB_VERSION = 1;
  const STORES = {
    base: 'playersBase',
    personal: 'playersPersonal',
    auction: 'auctionState',
    settings: 'settings',
    meta: 'meta'
  };

  let dbPromise;

  function normalizeText(value = '') {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function makePlayerKey(nome, squadra = '') {
    return `${normalizeText(nome)}|${normalizeText(squadra)}`;
  }

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORES.base)) db.createObjectStore(STORES.base, { keyPath: 'key' });
        if (!db.objectStoreNames.contains(STORES.personal)) db.createObjectStore(STORES.personal, { keyPath: 'key' });
        if (!db.objectStoreNames.contains(STORES.auction)) db.createObjectStore(STORES.auction, { keyPath: 'key' });
        if (!db.objectStoreNames.contains(STORES.settings)) db.createObjectStore(STORES.settings, { keyPath: 'key' });
        if (!db.objectStoreNames.contains(STORES.meta)) db.createObjectStore(STORES.meta, { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function tx(storeNames, mode, fn) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeNames, mode);
      const stores = Object.fromEntries(storeNames.map(name => [name, transaction.objectStore(name)]));
      let output;
      try { output = fn(stores, transaction); } catch (err) { reject(err); return; }
      transaction.oncomplete = () => resolve(output);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Transazione annullata'));
    });
  }

  function requestToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getAll(store) {
    const db = await openDB();
    return requestToPromise(db.transaction(store, 'readonly').objectStore(store).getAll());
  }

  async function get(store, key) {
    const db = await openDB();
    return requestToPromise(db.transaction(store, 'readonly').objectStore(store).get(key));
  }

  async function put(store, value) {
    const db = await openDB();
    return requestToPromise(db.transaction(store, 'readwrite').objectStore(store).put(value));
  }

  async function del(store, key) {
    const db = await openDB();
    return requestToPromise(db.transaction(store, 'readwrite').objectStore(store).delete(key));
  }

  async function clear(store) {
    const db = await openDB();
    return requestToPromise(db.transaction(store, 'readwrite').objectStore(store).clear());
  }

  function splitPlayerRecord(raw) {
    const key = raw.key || makePlayerKey(raw.nome, raw.squadra);
    const base = {
      key,
      id: raw.id || key,
      nome: String(raw.nome || '').trim(),
      squadra: String(raw.squadra || '').trim(),
      ruolo: String(raw.ruolo || '').trim().toUpperCase(),
      ruolo_mantra: String(raw.ruolo_mantra || '').trim(),
      quotazione: raw.quotazione === '' || raw.quotazione == null ? null : Number(raw.quotazione),
      fvm: raw.fvm === '' || raw.fvm == null ? null : Number(raw.fvm)
    };
    const personal = {
      key,
      slot: String(raw.slot || '').trim(),
      prezzo_affare: numOrNull(raw.prezzo_affare),
      prezzo_ideale_min: numOrNull(raw.prezzo_ideale_min),
      prezzo_ideale_max: numOrNull(raw.prezzo_ideale_max),
      price_cap: numOrNull(raw.price_cap),
      commento: String(raw.commento || ''),
      preferito: Boolean(raw.preferito)
    };
    const auction = {
      key,
      preso: Boolean(raw.preso),
      prezzo_acquisto: numOrNull(raw.prezzo_acquisto),
      manager_acquirente: String(raw.manager_acquirente || '')
    };
    return { base, personal, auction };
  }

  function numOrNull(value) {
    if (value === '' || value == null || Number.isNaN(Number(value))) return null;
    return Number(value);
  }

  async function seedIfNeeded(seedPlayers) {
    const marker = await get(STORES.meta, 'seeded');
    const existing = await getAll(STORES.base);
    if (marker || existing.length) return false;
    await tx([STORES.base, STORES.personal, STORES.auction, STORES.meta], 'readwrite', stores => {
      for (const raw of seedPlayers) {
        const { base, personal, auction } = splitPlayerRecord(raw);
        stores[STORES.base].put(base);
        stores[STORES.personal].put(personal);
        stores[STORES.auction].put(auction);
      }
      stores[STORES.meta].put({ key: 'seeded', value: true, at: Date.now() });
    });
    return true;
  }

  async function getCombinedPlayers() {
    const [base, personal, auction] = await Promise.all([
      getAll(STORES.base), getAll(STORES.personal), getAll(STORES.auction)
    ]);
    const pMap = new Map(personal.map(x => [x.key, x]));
    const aMap = new Map(auction.map(x => [x.key, x]));
    return base.map(b => ({
      ...b,
      ...(pMap.get(b.key) || defaultPersonal(b.key)),
      ...(aMap.get(b.key) || defaultAuction(b.key))
    }));
  }

  function defaultPersonal(key) {
    return { key, slot: '', prezzo_affare: null, prezzo_ideale_min: null, prezzo_ideale_max: null, price_cap: null, commento: '', preferito: false };
  }
  function defaultAuction(key) {
    return { key, preso: false, prezzo_acquisto: null, manager_acquirente: '' };
  }

  async function updatePersonal(key, patch) {
    const current = (await get(STORES.personal, key)) || defaultPersonal(key);
    await put(STORES.personal, { ...current, ...patch, key });
  }

  async function updateAuction(key, patch) {
    const current = (await get(STORES.auction, key)) || defaultAuction(key);
    await put(STORES.auction, { ...current, ...patch, key });
  }

  async function putBase(raw) {
    const { base } = splitPlayerRecord(raw);
    await put(STORES.base, base);
    return base;
  }

  async function addFullPlayer(raw) {
    const { base, personal, auction } = splitPlayerRecord(raw);
    const existing = await get(STORES.base, base.key);
    if (existing) throw new Error('Esiste già un giocatore con lo stesso nome e squadra.');
    await tx([STORES.base, STORES.personal, STORES.auction], 'readwrite', stores => {
      stores[STORES.base].add(base);
      stores[STORES.personal].put(personal);
      stores[STORES.auction].put(auction);
    });
    return base.key;
  }

  async function removePlayer(key) {
    await tx([STORES.base, STORES.personal, STORES.auction], 'readwrite', stores => {
      stores[STORES.base].delete(key);
      stores[STORES.personal].delete(key);
      stores[STORES.auction].delete(key);
    });
  }

  async function importBasePlayers(players, mode = 'update') {
    const prepared = [];
    const seen = new Set();
    const duplicates = [];
    for (const raw of players) {
      const { base } = splitPlayerRecord(raw);
      if (!base.nome || !base.ruolo) continue;
      if (seen.has(base.key)) { duplicates.push(base.key); continue; }
      seen.add(base.key);
      prepared.push(base);
    }

    await tx([STORES.base, STORES.meta], 'readwrite', stores => {
      if (mode === 'replace') stores[STORES.base].clear();
      for (const base of prepared) stores[STORES.base].put(base);
      stores[STORES.meta].put({ key: 'lastImport', value: { at: Date.now(), mode, count: prepared.length } });
    });
    return { imported: prepared.length, duplicates };
  }

  async function getSetting(key, fallback = null) {
    const row = await get(STORES.settings, key);
    return row ? row.value : fallback;
  }

  async function setSetting(key, value) {
    await put(STORES.settings, { key, value });
  }

  async function resetAuction() {
    const base = await getAll(STORES.base);
    await tx([STORES.auction], 'readwrite', stores => {
      stores[STORES.auction].clear();
      for (const p of base) stores[STORES.auction].put(defaultAuction(p.key));
    });
  }

  async function resetAll(seedPlayers = []) {
    await tx(Object.values(STORES), 'readwrite', stores => {
      for (const name of Object.values(STORES)) stores[name].clear();
    });
    if (seedPlayers.length) await seedIfNeeded(seedPlayers);
  }

  async function exportBackupObject() {
    const [base, personal, auction, settings, meta] = await Promise.all([
      getAll(STORES.base), getAll(STORES.personal), getAll(STORES.auction), getAll(STORES.settings), getAll(STORES.meta)
    ]);
    return {
      format: 'fantacalcio-checklist-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      playersBase: base,
      playersPersonal: personal,
      auctionState: auction,
      settings,
      meta
    };
  }

  async function importBackupObject(data) {
    if (!data || data.format !== 'fantacalcio-checklist-backup' || data.version !== 1) {
      throw new Error('Backup non riconosciuto o versione non supportata.');
    }
    const groups = [
      [STORES.base, data.playersBase],
      [STORES.personal, data.playersPersonal],
      [STORES.auction, data.auctionState],
      [STORES.settings, data.settings],
      [STORES.meta, data.meta]
    ];
    await tx(Object.values(STORES), 'readwrite', stores => {
      for (const [name, rows] of groups) {
        stores[name].clear();
        for (const row of (rows || [])) stores[name].put(row);
      }
    });
  }

  window.FantaDB = {
    STORES,
    openDB,
    normalizeText,
    makePlayerKey,
    seedIfNeeded,
    getCombinedPlayers,
    updatePersonal,
    updateAuction,
    putBase,
    addFullPlayer,
    removePlayer,
    importBasePlayers,
    getSetting,
    setSetting,
    resetAuction,
    resetAll,
    exportBackupObject,
    importBackupObject,
    numOrNull
  };
})();

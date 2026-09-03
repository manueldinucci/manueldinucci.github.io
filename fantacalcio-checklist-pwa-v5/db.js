(() => {
  const DB_NAME = 'fantacalcio-checklist-db';
  const DB_VERSION = 2;
  const STORES = {
    base: 'playersBase',
    personal: 'playersPersonal',
    auction: 'auctionState',
    settings: 'settings',
    meta: 'meta',
    managers: 'managers'
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
        if (!db.objectStoreNames.contains(STORES.managers)) db.createObjectStore(STORES.managers, { keyPath: 'id' });
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
      id: raw.id || raw.source_id || key,
      source_id: raw.source_id == null ? '' : String(raw.source_id).trim(),
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
      manager_id: String(raw.manager_id || ''),
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
    return { key, preso: false, prezzo_acquisto: null, manager_id: '', manager_acquirente: '' };
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
    const existingBase = await getAll(STORES.base);
    const existingPersonal = await getAll(STORES.personal);
    const existingAuction = await getAll(STORES.auction);

    const byKey = new Map(existingBase.map(x => [x.key, x]));
    const bySourceId = new Map(existingBase.filter(x => x.source_id).map(x => [String(x.source_id), x]));
    const byName = new Map();
    for (const x of existingBase) {
      const n = normalizeText(x.nome);
      if (!byName.has(n)) byName.set(n, []);
      byName.get(n).push(x);
    }
    const personalMap = new Map(existingPersonal.map(x => [x.key, x]));
    const auctionMap = new Map(existingAuction.map(x => [x.key, x]));

    const prepared = [];
    const seen = new Set();
    const duplicates = [];
    const migrations = [];
    let matched = 0;
    let newPlayers = 0;

    for (const raw of players) {
      const { base } = splitPlayerRecord(raw);
      if (!base.nome || !base.ruolo) continue;
      if (seen.has(base.key)) { duplicates.push(base.key); continue; }
      seen.add(base.key);

      let previous = null;
      if (base.source_id && bySourceId.has(String(base.source_id))) previous = bySourceId.get(String(base.source_id));
      if (!previous && byKey.has(base.key)) previous = byKey.get(base.key);
      if (!previous) {
        const sameName = byName.get(normalizeText(base.nome)) || [];
        if (sameName.length === 1) previous = sameName[0];
      }

      if (previous) {
        matched++;
        if (!base.source_id && previous.source_id) base.source_id = previous.source_id;
        if (previous.key !== base.key) migrations.push({ oldKey: previous.key, newKey: base.key });
      } else {
        newPlayers++;
      }
      prepared.push(base);
    }

    await tx([STORES.base, STORES.personal, STORES.auction, STORES.meta], 'readwrite', stores => {
      if (mode === 'replace') stores[STORES.base].clear();

      for (const { oldKey, newKey } of migrations) {
        const personal = personalMap.get(oldKey);
        if (personal) { stores[STORES.personal].put({ ...personal, key: newKey }); stores[STORES.personal].delete(oldKey); }
        const auction = auctionMap.get(oldKey);
        if (auction) { stores[STORES.auction].put({ ...auction, key: newKey }); stores[STORES.auction].delete(oldKey); }
        if (mode !== 'replace') stores[STORES.base].delete(oldKey);
      }

      for (const base of prepared) stores[STORES.base].put(base);
      stores[STORES.meta].put({ key: 'lastImport', value: { at: Date.now(), mode, count: prepared.length, matched, newPlayers, migrated: migrations.length } });
    });
    return { imported: prepared.length, duplicates, matched, newPlayers, migrated: migrations.length };
  }

  function makeManagerId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  }

  function sanitizeManager(raw = {}) {
    const budget = raw.budgetInitial === '' || raw.budgetInitial == null || Number.isNaN(Number(raw.budgetInitial)) ? null : Math.max(0, Number(raw.budgetInitial));
    return {
      id: String(raw.id || makeManagerId()),
      nome: String(raw.nome || '').trim(),
      squadra: String(raw.squadra || '').trim(),
      budgetInitial: budget
    };
  }

  async function getManagers() {
    return getAll(STORES.managers);
  }

  async function putManager(raw) {
    const manager = sanitizeManager(raw);
    if (!manager.nome) throw new Error('Il nome del fantallenatore è obbligatorio.');
    await put(STORES.managers, manager);
    return manager;
  }

  async function deleteManager(id) {
    await del(STORES.managers, id);
  }

  async function replaceManagers(rows = []) {
    const prepared = rows.map(sanitizeManager).filter(m => m.nome);
    await tx([STORES.managers], 'readwrite', stores => {
      stores[STORES.managers].clear();
      for (const manager of prepared) stores[STORES.managers].put(manager);
    });
    return prepared;
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
    const [base, personal, auction, settings, meta, managers] = await Promise.all([
      getAll(STORES.base), getAll(STORES.personal), getAll(STORES.auction), getAll(STORES.settings), getAll(STORES.meta), getAll(STORES.managers)
    ]);
    return {
      format: 'fantacalcio-checklist-backup',
      version: 2,
      exportedAt: new Date().toISOString(),
      playersBase: base,
      playersPersonal: personal,
      auctionState: auction,
      managers,
      settings,
      meta
    };
  }

  async function importBackupObject(data) {
    if (!data || data.format !== 'fantacalcio-checklist-backup' || ![1,2].includes(data.version)) {
      throw new Error('Backup non riconosciuto o versione non supportata.');
    }
    const groups = [
      [STORES.base, data.playersBase],
      [STORES.personal, data.playersPersonal],
      [STORES.auction, data.auctionState],
      [STORES.settings, data.settings],
      [STORES.meta, data.meta],
      [STORES.managers, data.managers || []]
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
    getManagers,
    putManager,
    deleteManager,
    replaceManagers,
    getSetting,
    setSetting,
    resetAuction,
    resetAll,
    exportBackupObject,
    importBackupObject,
    numOrNull
  };
})();

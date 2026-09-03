(() => {
  const $ = id => document.getElementById(id);
  const roles = [
    ['P','PORTIERI'], ['D','DIFENSORI'], ['C','CENTROCAMPISTI'], ['A','ATTACCANTI']
  ];
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const state = {
    players: [],
    role: 'C',
    startLetter: 'M',
    search: '',
    team: '',
    slot: '',
    minFvm: '',
    priceMax: '',
    onlyAvailable: false,
    onlyFavorites: false,
    onlyComments: false,
    compact: false,
    liveMode: false,
    emphasis: 65,
    theme: 'system',
    selectedKey: null,
    importModel: null,
    importMode: 'replace'
  };

  let uiSaveTimer = null;
  let playerSaveTimer = null;
  let toastTimer = null;

  function esc(v='') {
    return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }
  function num(v) { return v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v); }
  function displayNum(v) { return v == null || v === '' || Number.isNaN(Number(v)) ? '—' : String(Number(v)); }
  function roleName(r) { return roles.find(x => x[0] === r)?.[1] || r; }

  async function init() {
    await FantaDB.openDB();
    await FantaDB.seedIfNeeded(window.SEED_PLAYERS || []);
    await loadSettings();
    bindStaticEvents();
    initLetterSelect();
    applyStateToControls();
    applyTheme();
    await refreshPlayers();
    registerServiceWorker();
    setupViewportHandling();
    setupSwipeToClose();
  }

  async function loadSettings() {
    const saved = await FantaDB.getSetting('uiState', null);
    if (saved && typeof saved === 'object') Object.assign(state, saved);
    state.theme = await FantaDB.getSetting('theme', state.theme || 'system');
  }

  function getPersistableUI() {
    return {
      role: state.role,
      startLetter: state.startLetter,
      search: state.search,
      team: state.team,
      slot: state.slot,
      minFvm: state.minFvm,
      priceMax: state.priceMax,
      onlyAvailable: state.onlyAvailable,
      onlyFavorites: state.onlyFavorites,
      onlyComments: state.onlyComments,
      compact: state.compact,
      liveMode: state.liveMode,
      emphasis: state.emphasis
    };
  }

  function scheduleUISave() {
    clearTimeout(uiSaveTimer);
    uiSaveTimer = setTimeout(() => FantaDB.setSetting('uiState', getPersistableUI()), 120);
  }

  async function refreshPlayers() {
    state.players = await FantaDB.getCombinedPlayers();
    populateDynamicFilters();
    renderAll();
  }

  function renderAll() {
    document.body.classList.toggle('auction-live', state.liveMode);
    $('liveModeBtn').classList.toggle('active', state.liveMode);
    $('liveModeBtn').setAttribute('aria-pressed', String(state.liveMode));
    $('liveModeBtn').textContent = state.liveMode ? 'LIVE' : 'ASTA';
    if ($('liveModeCheck')) $('liveModeCheck').checked = state.liveMode;
    renderRoleTabs();
    renderPlayers();
    renderCountsAndScarcity();
  }

  function renderRoleTabs() {
    const counts = Object.fromEntries(roles.map(([r]) => [r, state.players.filter(p => p.ruolo === r).length]));
    $('roleTabs').innerHTML = roles.map(([r,label]) => `
      <button class="role-tab ${state.role===r?'active':''}" data-role="${r}">${label}<span class="tab-count">${counts[r]}</span></button>
    `).join('');
    $('roleTabs').querySelectorAll('.role-tab').forEach(btn => btn.addEventListener('click', () => {
      state.role = btn.dataset.role;
      state.team = '';
      state.slot = '';
      $('teamFilter').value = '';
      $('slotFilter').value = '';
      scheduleUISave();
      populateDynamicFilters();
      renderAll();
    }));
  }

  function initLetterSelect() {
    $('startLetter').innerHTML = letters.map(l => `<option value="${l}">${l}</option>`).join('');
  }

  function populateDynamicFilters() {
    const rolePlayers = state.players.filter(p => p.ruolo === state.role);
    const teams = [...new Set(rolePlayers.map(p => p.squadra).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'it'));
    const slots = [...new Set(rolePlayers.map(p => p.slot).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'it',{numeric:true}));
    const teamValue = state.team;
    const slotValue = state.slot;
    $('teamFilter').innerHTML = '<option value="">Tutte</option>' + teams.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
    $('slotFilter').innerHTML = '<option value="">Tutti</option>' + slots.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
    if (teams.includes(teamValue)) $('teamFilter').value = teamValue; else state.team = '';
    if (slots.includes(slotValue)) $('slotFilter').value = slotValue; else state.slot = '';
  }

  function applyStateToControls() {
    $('startLetter').value = state.startLetter;
    $('searchInput').value = state.search;
    $('onlyAvailable').checked = state.onlyAvailable;
    $('onlyFavorites').checked = state.onlyFavorites;
    $('onlyComments').checked = state.onlyComments;
    $('compactMode').checked = state.compact;
    $('liveModeCheck').checked = state.liveMode;
    $('emphasisSlider').value = state.emphasis;
    $('emphasisValue').textContent = `${state.emphasis}%`;
    $('minFvmFilter').value = state.minFvm;
    $('priceMaxFilter').value = state.priceMax;
    $('themeSelect').value = state.theme;
  }

  function firstLetter(name='') {
    const n = String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
    const ch = n[0] || '#';
    return letters.includes(ch) ? ch : '#';
  }

  function circularRank(name) {
    const ch = firstLetter(name);
    if (ch === '#') return 999;
    const start = letters.indexOf(state.startLetter);
    return (letters.indexOf(ch) - start + 26) % 26;
  }

  function getFilteredPlayers() {
    const q = FantaDB.normalizeText(state.search);
    const minFvm = num(state.minFvm);
    const maxPrice = num(state.priceMax);
    return state.players
      .filter(p => p.ruolo === state.role)
      .filter(p => !q || FantaDB.normalizeText(`${p.nome} ${p.squadra}`).includes(q))
      .filter(p => !state.team || p.squadra === state.team)
      .filter(p => !state.slot || p.slot === state.slot)
      .filter(p => minFvm == null || (num(p.fvm) ?? -Infinity) >= minFvm)
      .filter(p => maxPrice == null || (num(p.price_cap) ?? num(p.prezzo_ideale_max) ?? num(p.prezzo_affare) ?? Infinity) <= maxPrice)
      .filter(p => !state.onlyAvailable || !p.preso)
      .filter(p => !state.onlyFavorites || p.preferito)
      .filter(p => !state.onlyComments || String(p.commento || '').trim())
      .sort((a,b) => circularRank(a.nome) - circularRank(b.nome) || a.nome.localeCompare(b.nome,'it',{sensitivity:'base'}));
  }

  function percentile(sorted, pct) {
    if (!sorted.length) return 0;
    const pos = (sorted.length - 1) * pct;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }

  function fvmScaleInfo() {
    const values = state.players.filter(p => p.ruolo === state.role).map(p => num(p.fvm)).filter(v => v != null && v >= 0).sort((a,b)=>a-b);
    return { low: percentile(values, .05), high: percentile(values, .95) };
  }

  function nameFontSize(fvm, scale) {
    const value = num(fvm);
    if (value == null || scale.high <= scale.low) return 16;
    const clamped = Math.min(scale.high, Math.max(scale.low, value));
    let n = (clamped - scale.low) / (scale.high - scale.low);
    n = Math.log1p(4 * n) / Math.log(5);
    return 16 + (state.emphasis / 100) * 15 * n;
  }

  function pricesText(p) {
    const a = p.prezzo_affare;
    const min = p.prezzo_ideale_min;
    const max = p.prezzo_ideale_max;
    const cap = p.price_cap;
    const parts = [];
    if (a != null) parts.push(`≤${displayNum(a)}`);
    if (min != null || max != null) parts.push(`${displayNum(min)}–${displayNum(max)}`);
    if (cap != null) parts.push(displayNum(cap));
    return parts.length ? parts.join(' · ') : 'Prezzi non impostati';
  }

  function renderPlayers() {
    const list = getFilteredPlayers();
    const scale = fvmScaleInfo();
    const container = $('playerList');
    container.classList.toggle('compact-grid', state.compact);
    const frag = document.createDocumentFragment();
    for (const p of list) {
      const card = document.createElement('article');
      card.className = `player-card${p.preso?' taken':''}${p.preferito?' favorite':''}${state.compact?' compact':''}${state.liveMode?' live':''}`;
      card.dataset.key = p.key;
      const size = nameFontSize(p.fvm, scale).toFixed(1);
      card.innerHTML = `
        <button class="take-btn" aria-label="${p.preso?'Segna libero':'Segna preso'}"><span class="take-icon">${p.preso?'✓':''}</span></button>
        <button class="fav-btn" aria-label="${p.preferito?'Rimuovi preferito':'Aggiungi preferito'}">${p.preferito?'★':'☆'}</button>
        <div class="player-main" tabindex="0" role="button" aria-label="Apri ${esc(p.nome)}">
          <div class="player-line"><span class="player-name" style="font-size:${size}px">${esc(p.nome)}</span><span class="player-team">${esc(p.squadra)}</span></div>
          <div class="player-prices">${esc(pricesText(p))}</div>
          ${(state.compact && !state.liveMode) ? '' : `<div class="player-comment">${esc(p.commento || (state.liveMode ? '' : `FVM ${displayNum(p.fvm)} · ${p.slot || 'slot —'}`))}</div>`}
        </div>`;
      card.querySelector('.take-btn').addEventListener('click', () => toggleTaken(p.key));
      card.querySelector('.fav-btn').addEventListener('click', () => toggleFavorite(p.key));
      const main = card.querySelector('.player-main');
      main.addEventListener('click', () => openPlayerSheet(p.key));
      main.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openPlayerSheet(p.key); });
      frag.appendChild(card);
    }
    container.replaceChildren(frag);
    $('emptyState').classList.toggle('hidden', list.length !== 0);
  }

  async function toggleTaken(key, { allowUndo = true } = {}) {
    const p = state.players.find(x => x.key === key); if (!p) return;
    const before = { preso: p.preso, prezzo_acquisto: p.prezzo_acquisto, manager_acquirente: p.manager_acquirente };
    p.preso = !p.preso;
    if (!p.preso) { p.prezzo_acquisto = null; p.manager_acquirente = ''; }
    await FantaDB.updateAuction(key, { preso: p.preso, prezzo_acquisto: p.prezzo_acquisto, manager_acquirente: p.manager_acquirente });
    renderPlayers(); renderCountsAndScarcity();
    if (allowUndo) {
      const action = p.preso ? 'segnato preso' : 'segnato libero';
      toast(`${p.nome} ${action}`, 'Annulla', async () => {
        Object.assign(p, before);
        await FantaDB.updateAuction(key, before);
        renderPlayers(); renderCountsAndScarcity();
        if (state.selectedKey === key && !$('playerSheet').classList.contains('hidden')) openPlayerSheet(key, true);
        toast('Modifica annullata');
      }, 4800);
    }
  }

  async function toggleFavorite(key) {
    const p = state.players.find(x => x.key === key); if (!p) return;
    p.preferito = !p.preferito;
    await FantaDB.updatePersonal(key, { preferito: p.preferito });
    renderPlayers();
    if (state.selectedKey === key && !$('playerSheet').classList.contains('hidden')) updateSheetButtons(p);
  }

  function renderCountsAndScarcity() {
    const rolePlayers = state.players.filter(p => p.ruolo === state.role);
    const taken = rolePlayers.filter(p => p.preso).length;
    const available = rolePlayers.length - taken;
    $('counts').textContent = `Presi: ${taken} · Rimasti: ${available} · Totali: ${rolePlayers.length}`;

    const scarcity = getScarcityModel(rolePlayers);
    $('slotSummary').textContent = scarcity.summary;
    $('scarcitySummary').textContent = scarcity.shortSummary;
    $('marketPressure').textContent = scarcity.pressure;
  }

  function getScarcityModel(rolePlayers) {
    const available = rolePlayers.filter(p => !p.preso);
    const slotPlayers = rolePlayers.filter(p => String(p.slot || '').trim());
    if (slotPlayers.length) {
      const labels = ['S1','S2','S3'];
      const parts = labels.map(slot => {
        const total = rolePlayers.filter(p => String(p.slot || '').toUpperCase() === slot).length;
        const left = available.filter(p => String(p.slot || '').toUpperCase() === slot).length;
        return total ? { slot, total, left } : null;
      }).filter(Boolean);
      const top = parts.filter(x => ['S1','S2'].includes(x.slot));
      const totalTop = top.reduce((a,x)=>a+x.total,0);
      const leftTop = top.reduce((a,x)=>a+x.left,0);
      const ratio = totalTop ? leftTop / totalTop : 1;
      return {
        summary: parts.length ? `${parts.map(x => `${x.slot} ${x.left}/${x.total}`).join(' · ')} · Tot ${available.length}/${rolePlayers.length}` : `Liberi ${available.length}/${rolePlayers.length}`,
        shortSummary: parts.slice(0,2).map(x => `${x.slot} ${x.left}/${x.total}`).join(' · ') || `${roleName(state.role)} ${available.length}/${rolePlayers.length}`,
        pressure: pressureFromRatio(ratio)
      };
    }

    const vals = rolePlayers.map(p => num(p.fvm)).filter(v => v != null).sort((a,b)=>a-b);
    if (!vals.length) return { summary:`Liberi ${available.length}/${rolePlayers.length}`, shortSummary:`${roleName(state.role)} ${available.length}/${rolePlayers.length}`, pressure:'NORMALE' };
    const topCut = percentile(vals, .85);
    const semiCut = percentile(vals, .65);
    const topAll = rolePlayers.filter(p => (num(p.fvm) ?? -Infinity) >= topCut);
    const semiAll = rolePlayers.filter(p => (num(p.fvm) ?? -Infinity) >= semiCut && (num(p.fvm) ?? -Infinity) < topCut);
    const topLeft = topAll.filter(p=>!p.preso).length;
    const semiLeft = semiAll.filter(p=>!p.preso).length;
    const weightedTotal = topAll.length * 2 + semiAll.length;
    const weightedLeft = topLeft * 2 + semiLeft;
    const ratio = weightedTotal ? weightedLeft / weightedTotal : 1;
    return {
      summary: `TOP ${topLeft}/${topAll.length} · SEMITOP ${semiLeft}/${semiAll.length} · Tot ${available.length}/${rolePlayers.length}`,
      shortSummary: `TOP ${topLeft}/${topAll.length} · SEMI ${semiLeft}/${semiAll.length}`,
      pressure: pressureFromRatio(ratio)
    };
  }

  function pressureFromRatio(ratio) {
    if (ratio > .72) return 'ABBONDANZA';
    if (ratio > .45) return 'NORMALE';
    if (ratio > .20) return 'SCARSITÀ';
    return 'CRITICO';
  }

  function bindStaticEvents() {
    $('startLetter').addEventListener('change', e => { state.startLetter = e.target.value; scheduleUISave(); renderPlayers(); });
    $('searchInput').addEventListener('input', e => { state.search = e.target.value; scheduleUISave(); renderPlayers(); });
    $('filtersBtn').addEventListener('click', () => $('filtersPanel').classList.toggle('hidden'));
    $('liveModeBtn').addEventListener('click', () => setLiveMode(!state.liveMode));
    bindFilter('teamFilter','team','change');
    bindFilter('slotFilter','slot','change');
    bindFilter('minFvmFilter','minFvm','input');
    bindFilter('priceMaxFilter','priceMax','input');
    bindCheck('onlyAvailable','onlyAvailable');
    bindCheck('onlyFavorites','onlyFavorites');
    bindCheck('onlyComments','onlyComments');
    bindCheck('compactMode','compact');
    $('liveModeCheck').addEventListener('change', e => setLiveMode(e.target.checked));
    $('emphasisSlider').addEventListener('input', e => {
      state.emphasis = Number(e.target.value); $('emphasisValue').textContent = `${state.emphasis}%`; scheduleUISave(); renderPlayers();
    });

    $('menuBtn').addEventListener('click', openTools);
    $('closeToolsBtn').addEventListener('click', closeAllSheets);
    $('closeSheetBtn').addEventListener('click', closeAllSheets);
    $('closeImportBtn').addEventListener('click', closeAllSheets);
    $('closeSimpleFormBtn').addEventListener('click', closeAllSheets);
    $('sheetBackdrop').addEventListener('click', closeAllSheets);

    $('importListBtn').addEventListener('click', () => $('listFileInput').click());
    $('listFileInput').addEventListener('change', handleListFile);
    $('exportBackupBtn').addEventListener('click', exportBackup);
    $('backupBeforeImportBtn').addEventListener('click', exportBackup);
    $('importBackupBtn').addEventListener('click', () => $('backupFileInput').click());
    $('backupFileInput').addEventListener('change', importBackup);
    $('addPlayerBtn').addEventListener('click', openAddPlayer);
    $('removePlayerBtn').addEventListener('click', openRemovePlayer);
    $('resetAuctionBtn').addEventListener('click', resetAuction);
    $('resetAllBtn').addEventListener('click', resetAll);
    $('themeSelect').addEventListener('change', async e => { state.theme = e.target.value; await FantaDB.setSetting('theme', state.theme); applyTheme(); });

    $('importModeSegment').querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
      state.importMode = btn.dataset.mode;
      $('importModeSegment').querySelectorAll('button').forEach(x => x.classList.toggle('active', x === btn));
      updateImportStats();
    }));
    $('confirmImportBtn').addEventListener('click', confirmImport);

    ['editDeal','editIdealMin','editIdealMax','editCap','editComment','editPurchase','editManager'].forEach(id => {
      $(id).addEventListener('input', scheduleSelectedPlayerSave);
      $(id).addEventListener('focus', () => setTimeout(() => $(id).scrollIntoView({block:'center',behavior:'smooth'}), 250));
    });
    $('editSlot').addEventListener('change', scheduleSelectedPlayerSave);
    $('editSlot').addEventListener('focus', () => setTimeout(() => $('editSlot').scrollIntoView({block:'center',behavior:'smooth'}), 250));
    $('toggleTakenSheet').addEventListener('click', async () => { if (state.selectedKey) { await toggleTaken(state.selectedKey); openPlayerSheet(state.selectedKey, true); } });
    $('toggleFavoriteSheet').addEventListener('click', async () => { if (state.selectedKey) { await toggleFavorite(state.selectedKey); openPlayerSheet(state.selectedKey, true); } });
  }

  function bindFilter(id, key, evt) {
    $(id).addEventListener(evt, e => { state[key] = e.target.value; scheduleUISave(); renderPlayers(); });
  }
  function bindCheck(id, key) {
    $(id).addEventListener('change', e => { state[key] = e.target.checked; scheduleUISave(); renderPlayers(); });
  }

  function setLiveMode(enabled) {
    state.liveMode = Boolean(enabled);
    if (state.liveMode) $('filtersPanel').classList.add('hidden');
    scheduleUISave();
    renderAll();
  }

  function showBackdrop() { $('sheetBackdrop').classList.remove('hidden'); }
  function openOnly(id) {
    ['playerSheet','toolsSheet','importSheet','simpleFormSheet'].forEach(x => $(x).classList.add('hidden'));
    $(id).classList.remove('hidden'); showBackdrop(); document.body.style.overflow = 'hidden';
  }
  function closeAllSheets() {
    ['playerSheet','toolsSheet','importSheet','simpleFormSheet'].forEach(x => $(x).classList.add('hidden'));
    $('sheetBackdrop').classList.add('hidden'); document.body.style.overflow = ''; state.selectedKey = null;
  }
  function openTools() { openOnly('toolsSheet'); }

  function openPlayerSheet(key, preserve=false) {
    const p = state.players.find(x => x.key === key); if (!p) return;
    state.selectedKey = key;
    $('sheetPlayerName').textContent = p.nome;
    $('sheetPlayerMeta').textContent = `${p.squadra || '—'} · ${p.ruolo}${p.ruolo_mantra ? ` · ${p.ruolo_mantra}` : ''}`;
    $('sheetInfoGrid').innerHTML = [
      ['FVM',displayNum(p.fvm)], ['Quotazione',displayNum(p.quotazione)], ['Stato',p.preso?'PRESO':'LIBERO']
    ].map(([a,b]) => `<div class="info-chip"><span>${esc(a)}</span><strong>${esc(b)}</strong></div>`).join('');
    const slotSelect = $('editSlot');
    slotSelect.querySelectorAll('option[data-custom]').forEach(o => o.remove());
    const currentSlot = String(p.slot || '').trim();
    if (currentSlot && ![...slotSelect.options].some(o => o.value === currentSlot)) {
      const custom = document.createElement('option');
      custom.value = currentSlot; custom.textContent = currentSlot; custom.dataset.custom = '1';
      slotSelect.appendChild(custom);
    }
    slotSelect.value = currentSlot;
    $('editDeal').value = p.prezzo_affare ?? '';
    $('editIdealMin').value = p.prezzo_ideale_min ?? '';
    $('editIdealMax').value = p.prezzo_ideale_max ?? '';
    $('editCap').value = p.price_cap ?? '';
    $('editComment').value = p.commento || '';
    $('editPurchase').value = p.prezzo_acquisto ?? '';
    $('editManager').value = p.manager_acquirente || '';
    updateSheetButtons(p);
    if (!preserve) openOnly('playerSheet');
  }

  function updateSheetButtons(p) {
    $('toggleTakenSheet').textContent = p.preso ? 'Segna libero' : 'Segna preso';
    $('toggleFavoriteSheet').textContent = p.preferito ? '★ Preferito' : '☆ Preferito';
  }

  function scheduleSelectedPlayerSave() {
    clearTimeout(playerSaveTimer);
    $('sheetSaveStatus').classList.remove('show');
    playerSaveTimer = setTimeout(saveSelectedPlayer, 180);
  }

  async function saveSelectedPlayer() {
    const p = state.players.find(x => x.key === state.selectedKey); if (!p) return;
    const personal = {
      slot: $('editSlot').value.trim(),
      prezzo_affare: num($('editDeal').value),
      prezzo_ideale_min: num($('editIdealMin').value),
      prezzo_ideale_max: num($('editIdealMax').value),
      price_cap: num($('editCap').value),
      commento: $('editComment').value,
      preferito: p.preferito
    };
    const auction = {
      preso: p.preso,
      prezzo_acquisto: num($('editPurchase').value),
      manager_acquirente: $('editManager').value.trim()
    };
    Object.assign(p, personal, auction);
    await Promise.all([FantaDB.updatePersonal(p.key, personal), FantaDB.updateAuction(p.key, auction)]);
    $('sheetSaveStatus').classList.add('show'); setTimeout(() => $('sheetSaveStatus').classList.remove('show'), 900);
    populateDynamicFilters(); renderPlayers(); renderCountsAndScarcity();
  }

  async function handleListFile(e) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    try {
      const rows = await FantaImport.readFileToRows(file);
      state.importModel = FantaImport.rowsToImportModel(rows);
      state.importModel.fileName = file.name;
      state.importModel.fileSize = file.size;
      state.importMode = 'replace';
      $('importModeSegment').querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.mode === 'replace'));
      renderImportSheet(); openOnly('importSheet');
    } catch (err) { toast(err.message || 'Errore durante la lettura del file.'); }
  }

  function renderImportSheet() {
    const m = state.importModel; if (!m) return;
    $('importFileMeta').textContent = `${m.fileName} · ${m.rows.length} righe dati · intestazioni riga ${m.headerRowIndex + 1}`;
    $('mappingGrid').innerHTML = FantaImport.APP_FIELDS.map(field => `
      <div class="mapping-row">
        <div class="app-field">${esc(field.label)}${field.required?' *':''}</div>
        <label>Colonna file
          <select data-map-field="${field.key}">
            <option value="">— Non associare —</option>
            ${m.headers.map((h,i) => `<option value="${i}" ${m.mapping[field.key]===i?'selected':''}>${esc(h)}</option>`).join('')}
          </select>
        </label>
      </div>`).join('');
    $('mappingGrid').querySelectorAll('select').forEach(sel => sel.addEventListener('change', () => {
      m.mapping[sel.dataset.mapField] = sel.value === '' ? null : Number(sel.value); updateImportStats();
    }));
    const previewRows = m.rows.slice(0, 12);
    $('importPreviewTable').querySelector('thead').innerHTML = `<tr>${m.headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr>`;
    $('importPreviewTable').querySelector('tbody').innerHTML = previewRows.map(row => `<tr>${m.headers.map((_,i)=>`<td>${esc(row[i] ?? '')}</td>`).join('')}</tr>`).join('');
    updateImportStats();
  }

  function updateImportStats() {
    const m = state.importModel; if (!m) return;
    const { players, issues } = FantaImport.buildPlayers(m.headers, m.rows, m.mapping);
    $('importStats').textContent = `Riconosciuti: ${players.length} · Problemi: ${issues.length}`;
    $('importIssues').innerHTML = issues.slice(0, 10).map(x=>`<div>${esc(x)}</div>`).join('') + (issues.length > 10 ? `<div>… altri ${issues.length-10}</div>` : '');
    renderImportChanges(compareImportedPlayers(players));
  }

  function compareImportedPlayers(players) {
    const existing = state.players;
    const bySource = new Map(existing.filter(p=>p.source_id).map(p=>[String(p.source_id),p]));
    const byKey = new Map(existing.map(p=>[p.key,p]));
    const byName = new Map();
    existing.forEach(p => { const n=FantaDB.normalizeText(p.nome); if(!byName.has(n)) byName.set(n,[]); byName.get(n).push(p); });
    const matchedKeys = new Set();
    const changes = { added:[], removed:[], team:[], role:[], fvm:[], quote:[], matched:0 };
    for (const raw of players) {
      const key = FantaDB.makePlayerKey(raw.nome, raw.squadra);
      let old = raw.source_id ? bySource.get(String(raw.source_id)) : null;
      if (!old) old = byKey.get(key);
      if (!old) { const same = byName.get(FantaDB.normalizeText(raw.nome)) || []; if (same.length === 1) old = same[0]; }
      if (!old) { changes.added.push(raw); continue; }
      matchedKeys.add(old.key); changes.matched++;
      if (String(old.squadra||'') !== String(raw.squadra||'')) changes.team.push({old,raw});
      if (String(old.ruolo||'') !== String(raw.ruolo||'') || String(old.ruolo_mantra||'') !== String(raw.ruolo_mantra||'')) changes.role.push({old,raw});
      if ((num(old.fvm) ?? null) !== (num(raw.fvm) ?? null)) changes.fvm.push({old,raw});
      if ((num(old.quotazione) ?? null) !== (num(raw.quotazione) ?? null)) changes.quote.push({old,raw});
    }
    changes.removed = existing.filter(p => !matchedKeys.has(p.key));
    return changes;
  }

  function renderImportChanges(c) {
    const removedLabel = state.importMode === 'replace' ? 'rimossi' : 'non più nel file';
    const chips = [
      ['Nuovi', c.added.length],
      [removedLabel, c.removed.length],
      ['Cambio squadra', c.team.length],
      ['Ruolo', c.role.length],
      ['FVM', c.fvm.length],
      ['Quotazione', c.quote.length]
    ];
    const details = [];
    c.team.slice(0,3).forEach(x => details.push(`${x.old.nome}: ${x.old.squadra || '—'} → ${x.raw.squadra || '—'}`));
    c.fvm.slice(0,3).forEach(x => details.push(`${x.old.nome}: FVM ${displayNum(x.old.fvm)} → ${displayNum(x.raw.fvm)}`));
    $('importChanges').innerHTML = `
      <div class="change-title">Confronto con il listone sul dispositivo</div>
      <div class="change-chips">${chips.map(([label,n])=>`<span><strong>${n}</strong>${esc(label)}</span>`).join('')}</div>
      ${details.length ? `<div class="change-details">${details.map(x=>`<div>${esc(x)}</div>`).join('')}</div>` : '<div class="change-details">Nessuna variazione significativa nei giocatori riconosciuti.</div>'}
      ${state.importMode === 'update' && c.removed.length ? '<div class="change-note">Con “Aggiorna senza rimuovere” i giocatori assenti dal nuovo file resteranno nel database.</div>' : ''}`;
  }

  async function confirmImport() {
    const m = state.importModel; if (!m) return;
    if (m.mapping.nome == null || m.mapping.ruolo == null) { toast('Associa almeno Nome e Ruolo.'); return; }
    const { players, issues } = FantaImport.buildPlayers(m.headers, m.rows, m.mapping);
    if (!players.length) { toast('Nessun giocatore valido da importare.'); return; }
    if (issues.length && !confirm(`Sono presenti ${issues.length} righe problematiche che verranno ignorate. Continuare?`)) return;
    if (state.importMode === 'replace' && state.players.length && !confirm('Sincronizzare il database con questo listone? I giocatori non più presenti verranno rimossi dal listone, mentre commenti, prezzi personali, preferiti e stato dei giocatori riconosciuti verranno conservati.')) return;
    try {
      const result = await FantaDB.importBasePlayers(players, state.importMode);
      await refreshPlayers(); closeAllSheets();
      toast(`Importati ${result.imported} · riconosciuti ${result.matched} · nuovi ${result.newPlayers}${result.migrated ? ` · appunti riallineati ${result.migrated}` : ''}${result.duplicates.length ? ` · duplicati ${result.duplicates.length}` : ''}`);
    } catch (err) { toast(err.message || 'Importazione non riuscita.'); }
  }

  async function exportBackup() {
    try {
      const data = await FantaDB.exportBackupObject();
      const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
      downloadBlob(blob, `fantacalcio-backup-${new Date().toISOString().slice(0,10)}.json`);
      toast('Backup esportato');
    } catch (err) { toast('Errore durante il backup'); }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function importBackup(e) {
    const file = e.target.files?.[0]; e.target.value=''; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!confirm('Ripristinare questo backup? Lo stato attuale verrà sostituito.')) return;
      await FantaDB.importBackupObject(data); await loadSettings(); applyStateToControls(); applyTheme(); await refreshPlayers(); closeAllSheets(); toast('Backup ripristinato');
    } catch (err) { toast(err.message || 'Backup non valido'); }
  }

  function openAddPlayer() {
    $('simpleFormTitle').textContent = 'Aggiungi giocatore';
    $('simpleFormSubtitle').textContent = 'Salvataggio permanente sul dispositivo';
    $('simpleFormBody').innerHTML = `
      <form id="addPlayerForm" class="form-grid">
        <label>Nome<input name="nome" required autocomplete="off"></label>
        <label>Squadra<input name="squadra" autocomplete="off"></label>
        <label>Ruolo<select name="ruolo" required>${roles.map(([r,l])=>`<option value="${r}">${r} — ${l}</option>`).join('')}</select></label>
        <label>Mantra<input name="ruolo_mantra"></label>
        <label>FVM<input name="fvm" type="number" inputmode="numeric"></label>
        <label>Quotazione<input name="quotazione" type="number" inputmode="numeric"></label>
        <label>Slot<input name="slot" placeholder="S1"></label>
        <label>Affare ≤<input name="prezzo_affare" type="number" inputmode="numeric"></label>
        <label>Ideale min<input name="prezzo_ideale_min" type="number" inputmode="numeric"></label>
        <label>Ideale max<input name="prezzo_ideale_max" type="number" inputmode="numeric"></label>
        <label>Price cap<input name="price_cap" type="number" inputmode="numeric"></label>
        <label class="span-2">Commento<textarea name="commento" rows="4"></textarea></label>
        <button class="primary-btn span-2" type="submit">Aggiungi</button>
      </form>`;
    $('addPlayerForm').addEventListener('submit', async e => {
      e.preventDefault(); const fd = new FormData(e.currentTarget); const raw = Object.fromEntries(fd.entries());
      ['fvm','quotazione','prezzo_affare','prezzo_ideale_min','prezzo_ideale_max','price_cap'].forEach(k => raw[k] = num(raw[k]));
      try { await FantaDB.addFullPlayer(raw); await refreshPlayers(); closeAllSheets(); toast('Giocatore aggiunto'); }
      catch (err) { toast(err.message); }
    });
    openOnly('simpleFormSheet');
  }

  function openRemovePlayer() {
    $('simpleFormTitle').textContent = 'Rimuovi giocatore';
    $('simpleFormSubtitle').textContent = 'La rimozione elimina anche personalizzazioni e stato';
    $('simpleFormBody').innerHTML = `
      <div class="search-wrap"><input id="removeSearch" type="search" placeholder="Cerca nome o squadra"></div>
      <div id="removePicker" class="player-picker"></div>`;
    const renderPicker = () => {
      const q = FantaDB.normalizeText($('removeSearch').value);
      const rows = state.players.filter(p => !q || FantaDB.normalizeText(`${p.nome} ${p.squadra}`).includes(q)).slice(0,100);
      $('removePicker').innerHTML = rows.map(p => `<div class="picker-row"><div><strong>${esc(p.nome)}</strong><div class="sheet-meta">${esc(p.squadra)} · ${esc(p.ruolo)}</div></div><button class="secondary-btn danger-soft" data-remove="${esc(p.key)}">Rimuovi</button></div>`).join('');
      $('removePicker').querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', async () => {
        const p = state.players.find(x => x.key === btn.dataset.remove); if (!p) return;
        if (!confirm(`Rimuovere definitivamente ${p.nome}?`)) return;
        await FantaDB.removePlayer(p.key); await refreshPlayers(); renderPicker(); toast('Giocatore rimosso');
      }));
    };
    $('removeSearch').addEventListener('input', renderPicker); renderPicker(); openOnly('simpleFormSheet');
  }

  async function resetAuction() {
    if (!confirm('Reset asta: azzerare giocatori presi, prezzi di acquisto e manager? Prezzi personali, commenti, slot e preferiti resteranno invariati.')) return;
    await FantaDB.resetAuction(); await refreshPlayers(); closeAllSheets(); toast('Asta resettata');
  }

  async function resetAll() {
    const typed = prompt('RESET COMPLETO: cancella listone e tutte le personalizzazioni. Scrivi RESET per confermare.');
    if (typed !== 'RESET') return;
    await FantaDB.resetAll(window.SEED_PLAYERS || []); Object.assign(state, {role:'C',startLetter:'M',search:'',team:'',slot:'',minFvm:'',priceMax:'',onlyAvailable:false,onlyFavorites:false,onlyComments:false,compact:false,liveMode:false,emphasis:65,theme:'system'});
    await FantaDB.setSetting('uiState', getPersistableUI()); await FantaDB.setSetting('theme','system'); applyStateToControls(); applyTheme(); await refreshPlayers(); closeAllSheets(); toast('Reset completo eseguito');
  }

  function applyTheme() {
    const root = document.documentElement;
    if (state.theme === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', state.theme);
    $('themeSelect').value = state.theme;
  }

  function toast(message, actionLabel = '', actionCallback = null, duration = 2300) {
    clearTimeout(toastTimer);
    const el = $('toast');
    const messageEl = $('toastMessage');
    const actionEl = $('toastAction');
    messageEl.textContent = message;
    actionEl.classList.toggle('hidden', !actionLabel || !actionCallback);
    actionEl.textContent = actionLabel || '';
    actionEl.onclick = actionCallback ? async () => {
      clearTimeout(toastTimer);
      el.classList.add('hidden');
      const cb = actionCallback; actionEl.onclick = null;
      await cb();
    } : null;
    el.classList.remove('hidden');
    toastTimer = setTimeout(() => { el.classList.add('hidden'); actionEl.onclick = null; }, duration);
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('./service-worker.js');
        await navigator.serviceWorker.ready;
        if (!sessionStorage.getItem('offlineReadyShown')) { toast('App pronta anche offline'); sessionStorage.setItem('offlineReadyShown','1'); }
        reg.update().catch(()=>{});
      } catch (err) { console.warn('Service Worker non registrato', err); }
    });
  }

  function setupViewportHandling() {
    if (!window.visualViewport) return;
    const update = () => {
      const vv = window.visualViewport;
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--keyboard-offset', `${offset}px`);
    };
    visualViewport.addEventListener('resize', update); visualViewport.addEventListener('scroll', update); update();
  }

  function setupSwipeToClose() {
    document.querySelectorAll('.bottom-sheet').forEach(sheet => {
      const handle = sheet.querySelector('.sheet-handle'); if (!handle) return;
      let startY = null;
      handle.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, {passive:true});
      handle.addEventListener('touchend', e => {
        if (startY == null) return;
        const endY = e.changedTouches[0].clientY;
        if (endY - startY > 55) closeAllSheets();
        startY = null;
      }, {passive:true});
    });
  }

  document.addEventListener('DOMContentLoaded', () => init().catch(err => {
    console.error(err); alert(`Errore di avvio: ${err.message || err}`);
  }));
})();

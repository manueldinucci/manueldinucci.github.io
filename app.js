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
    compact: false,
    emphasis: 65,
    theme: 'light',
    selectedKey: null,
    importModel: null,
    importMode: 'replace',
    managers: [],
    auctionConfig: FantaAuction.makeDefaultConfig(),
    managerSort: 'budget',
    managerView: 'unified',
    slotDisplayMode: 'remaining',
    pendingAssignmentKey: null,
    pendingUnassignKey: null,
    filtersScrollY: 0
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
  function money(v) { return Number.isFinite(Number(v)) ? Math.round(Number(v) * 10) / 10 : 0; }
  function getManagerById(id) { return state.managers.find(m => String(m.id) === String(id)); }
  function managerDisplayName(manager) { return manager ? `${manager.nome}${manager.squadra ? ` · ${manager.squadra}` : ''}` : '—'; }

  function populateManagerSelects() {
    const options = '<option value="">—</option>' + state.managers
      .slice().sort((a,b)=>a.nome.localeCompare(b.nome,'it',{sensitivity:'base'}))
      .map(m => `<option value="${esc(m.id)}">${esc(managerDisplayName(m))}</option>`).join('');
    ['editManager','assignmentManager'].forEach(id => { if ($(id)) $(id).innerHTML = options; });
  }

  function managerStats(manager, excludeKey = null) {
    const players = excludeKey ? state.players.filter(p => p.key !== excludeKey) : state.players;
    return FantaAuction.computeManagerStats(manager, players, state.auctionConfig);
  }

  async function init() {
    await FantaDB.openDB();
    await FantaDB.seedIfNeeded(window.SEED_PLAYERS || []);
    await loadSettings();
    await loadAuctionContext();
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
    if (saved && typeof saved === 'object') {
      const { liveMode: _legacyLiveMode, onlyComments: _legacyOnlyComments, ...cleanSaved } = saved;
      Object.assign(state, cleanSaved);
    }
    state.theme = await FantaDB.getSetting('theme', state.theme || 'light');
    if (state.theme === 'system') {
      state.theme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      await FantaDB.setSetting('theme', state.theme);
    }
    if (!['light','dark'].includes(state.theme)) state.theme = 'light';
  }


  async function loadAuctionContext() {
    state.managers = await FantaDB.getManagers();
    state.auctionConfig = FantaAuction.makeDefaultConfig(await FantaDB.getSetting('auctionConfig', null) || {});
    const managerUI = await FantaDB.getSetting('managerUI', null);
    if (managerUI && typeof managerUI === 'object') {
      state.managerSort = ['slots','maxBid','budget'].includes(managerUI.sort) ? managerUI.sort : state.managerSort;
    }
  }

  async function refreshAuctionContext() {
    await loadAuctionContext();
    populateManagerSelects();
    if (!$('managersSheet').classList.contains('hidden')) renderManagersPanel();
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
      compact: state.compact,
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
    populateManagerSelects();
    renderAll();
  }

  function renderAll() {
    renderFilterButton();
    renderRoleTabs();
    renderPlayers();
    renderCountsAndDemand();
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
    $('compactMode').checked = state.compact;
    $('emphasisSlider').value = state.emphasis;
    $('emphasisValue').textContent = `${state.emphasis}%`;
    $('minFvmFilter').value = state.minFvm;
    $('priceMaxFilter').value = state.priceMax;
    updateThemeButton();
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
      .filter(p => maxPrice == null || (num(p.target_max) ?? num(p.prezzo_ideale_max) ?? Infinity) <= maxPrice)
      .filter(p => !state.onlyAvailable || !p.preso)
      .filter(p => !state.onlyFavorites || p.preferito)
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

  function targetText(p) {
    const min = num(p.target_min) ?? num(p.prezzo_ideale_min);
    const max = num(p.target_max) ?? num(p.prezzo_ideale_max);
    if (min != null && max != null) return `${displayNum(min)}–${displayNum(max)}`;
    if (min != null) return `da ${displayNum(min)}`;
    if (max != null) return `≤${displayNum(max)}`;
    return '';
  }

  function purchaseText(p) {
    const manager = String(p.manager_acquirente || '').trim();
    const price = num(p.prezzo_acquisto);
    if (manager && price != null) return `${manager} · ${displayNum(price)} cr`;
    if (manager) return manager;
    if (price != null) return `${displayNum(price)} cr`;
    return '';
  }

  function playerPrimaryMeta(p) {
    const parts = [];
    if (String(p.slot || '').trim()) parts.push(String(p.slot).trim());
    const target = targetText(p);
    if (target) parts.push(target);
    return parts.join(' | ');
  }

  function playerSecondaryMeta(p) {
    const parts = [];
    const fvm = num(p.fvm);
    const qi = num(p.quotazione_iniziale);
    const note = String(p.commento || '').trim();
    if (fvm != null) parts.push(`FVM ${displayNum(fvm)}`);
    if (qi != null) parts.push(`QI ${displayNum(qi)}`);
    if (note) parts.push(note);
    return parts.join(' · ');
  }

  function slotClass(p) {
    const slot = String(p.slot || '').trim().toLowerCase();
    return /^s[1-5]$/.test(slot) ? ` slot-${slot}` : '';
  }

  function renderPlayers() {
    const list = getFilteredPlayers();
    const scale = fvmScaleInfo();
    const container = $('playerList');
    container.classList.toggle('compact-grid', state.compact);
    const frag = document.createDocumentFragment();
    for (const p of list) {
      const card = document.createElement('article');
      card.className = `player-card${p.preso?' taken':''}${p.preferito?' favorite':''}${state.compact?' compact':''}${slotClass(p)}`;
      card.dataset.key = p.key;
      const size = nameFontSize(p.fvm, scale).toFixed(1);
      card.innerHTML = `
        <button class="fav-btn" aria-label="${p.preferito?'Rimuovi preferito':'Aggiungi preferito'}">${p.preferito?'★':'☆'}</button>
        <div class="player-main" tabindex="0" role="button" aria-label="Apri ${esc(p.nome)}">
          <div class="player-line"><span class="player-name" style="font-size:${size}px">${esc(p.nome)}</span><span class="player-team">${esc(p.squadra)}</span></div>
          ${p.preso ? (purchaseText(p) ? `<div class="player-purchase">${esc(purchaseText(p))}</div>` : '') : (playerPrimaryMeta(p) ? `<div class="player-primary-meta">${esc(playerPrimaryMeta(p))}</div>` : '')}
          ${p.preso ? '' : (playerSecondaryMeta(p) ? `<div class="player-secondary-meta">${esc(playerSecondaryMeta(p))}</div>` : '')}
        </div>
        <button class="assign-btn ${p.preso?'assigned':''}" aria-label="${p.preso?'Rimuovi assegnazione':'Assegna giocatore'}">${p.preso?'−':'+'}</button>`;
      card.querySelector('.assign-btn').addEventListener('click', () => toggleTaken(p.key));
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

    if (p.preso) {
      openUnassignSheet(key);
      return;
    }

    if (!p.preso && state.managers.length) {
      openAssignmentSheet(key);
      return;
    }

    const before = {
      preso: p.preso,
      prezzo_acquisto: p.prezzo_acquisto,
      manager_id: p.manager_id || '',
      manager_acquirente: p.manager_acquirente
    };
    p.preso = true;
    await FantaDB.updateAuction(key, {
      preso: p.preso,
      prezzo_acquisto: p.prezzo_acquisto,
      manager_id: p.manager_id || '',
      manager_acquirente: p.manager_acquirente
    });
    renderPlayers(); renderCountsAndDemand();
    if (!$('managersSheet').classList.contains('hidden')) renderManagersPanel();
    if (allowUndo) {
      const action = p.preso ? 'segnato preso' : 'segnato libero';
      toast(`${p.nome} ${action}`, 'Annulla', async () => {
        Object.assign(p, before);
        await FantaDB.updateAuction(key, before);
        renderPlayers(); renderCountsAndDemand();
        if (!$('managersSheet').classList.contains('hidden')) renderManagersPanel();
        if (state.selectedKey === key && !$('playerSheet').classList.contains('hidden')) openPlayerSheet(key, true);
        toast('Modifica annullata');
      }, 4800);
    }
  }

  function openUnassignSheet(key) {
    const p = state.players.find(x => x.key === key); if (!p || !p.preso) return;
    state.pendingUnassignKey = key;
    const purchase = purchaseText(p);
    $('unassignPlayerInfo').innerHTML = `<strong>${esc(p.nome)}</strong><span>${esc([p.squadra, purchase].filter(Boolean).join(' · '))}</span>`;
    openOnly('unassignSheet');
  }

  async function confirmUnassign() {
    const p = state.players.find(x => x.key === state.pendingUnassignKey); if (!p || !p.preso) { closeAllSheets(); return; }
    const before = { preso:true, prezzo_acquisto:p.prezzo_acquisto, manager_id:p.manager_id || '', manager_acquirente:p.manager_acquirente || '' };
    const after = { preso:false, prezzo_acquisto:null, manager_id:'', manager_acquirente:'' };
    Object.assign(p, after);
    await FantaDB.updateAuction(p.key, after);
    closeAllSheets();
    renderPlayers(); renderCountsAndDemand();
    toast(`${p.nome} nuovamente libero`, 'Annulla', async () => {
      Object.assign(p, before);
      await FantaDB.updateAuction(p.key, before);
      renderPlayers(); renderCountsAndDemand();
      if (!$('managersSheet').classList.contains('hidden')) renderManagersPanel();
    }, 4800);
  }

  async function toggleFavorite(key) {
    const p = state.players.find(x => x.key === key); if (!p) return;
    p.preferito = !p.preferito;
    await FantaDB.updatePersonal(key, { preferito: p.preferito });
    renderPlayers();
    if (state.selectedKey === key && !$('playerSheet').classList.contains('hidden')) updateSheetButtons(p);
  }

  function renderCountsAndDemand() {
    const rolePlayers = state.players.filter(p => p.ruolo === state.role);
    renderDemandSummary(rolePlayers);
  }

  function slotCount(available, slots) {
    const accepted = new Set(slots.map(x => String(x).toUpperCase()));
    return available.filter(p => accepted.has(String(p.slot || '').trim().toUpperCase())).length;
  }

  function totalRoleNeed(role) {
    if (!state.managers.length) return null;
    return FantaAuction.computeAllManagerStats(state.managers, state.players, state.auctionConfig)
      .reduce((sum, {stats}) => sum + (stats.roleRemaining?.[role] || 0), 0);
  }

  function demandLineModel(rolePlayers) {
    const role = state.role;
    const available = rolePlayers.filter(p => !p.preso);
    const need = totalRoleNeed(role);
    if (need == null) return null;
    if (role === 'P') {
      const main = slotCount(available, ['S1']);
      const extra = slotCount(available, ['S2']);
      return { need, main, text:`P • Fabbisogno: ${need} • S1 disponibili: ${main} • S2 disponibili: ${extra}` };
    }
    if (role === 'D' || role === 'C') {
      const main = slotCount(available, ['S1','S2','S3']);
      const extra = slotCount(available, ['S4','S5']);
      return { need, main, text:`${role} • Fabbisogno: ${need} • S1-S3 disponibili: ${main} • S4-S5 disponibili: ${extra}` };
    }
    const main = slotCount(available, ['S1','S2']);
    const extra = slotCount(available, ['S3']);
    return { need, main, text:`A • Fabbisogno: ${need} • S1-S2 disponibili: ${main} • S3 disponibili: ${extra}` };
  }

  function renderDemandSummary(rolePlayers) {
    const el = $('demandSummary'); if (!el) return;
    const model = demandLineModel(rolePlayers);
    if (!model) { el.textContent = ''; el.classList.add('hidden'); return; }
    const warning = model.main < model.need;
    el.textContent = `${warning ? '⚠ ' : ''}${model.text}`;
    el.classList.toggle('warning', warning);
    el.classList.remove('hidden');
  }

  function bindStaticEvents() {
    $('startLetter').addEventListener('change', e => { state.startLetter = e.target.value; scheduleUISave(); renderPlayers(); });
    $('searchInput').addEventListener('input', e => { state.search = e.target.value; scheduleUISave(); renderPlayers(); });
    $('filtersBtn').addEventListener('click', openFiltersSheet);
    $('closeFiltersBtn').addEventListener('click', closeAllSheets);
    $('managersBtn').addEventListener('click', openManagersPanel);
    bindFilter('teamFilter','team','change');
    bindFilter('slotFilter','slot','change');
    bindFilter('minFvmFilter','minFvm','input');
    bindFilter('priceMaxFilter','priceMax','input');
    bindCheck('onlyAvailable','onlyAvailable');
    bindCheck('onlyFavorites','onlyFavorites');
    bindCheck('compactMode','compact');
    $('emphasisSlider').addEventListener('input', e => {
      state.emphasis = Number(e.target.value); $('emphasisValue').textContent = `${state.emphasis}%`; scheduleUISave(); renderPlayers();
    });

    $('menuBtn').addEventListener('click', openTools);
    $('closeToolsBtn').addEventListener('click', closeAllSheets);
    $('closeSheetBtn').addEventListener('click', closeAllSheets);
    $('closeImportBtn').addEventListener('click', closeAllSheets);
    $('closeSimpleFormBtn').addEventListener('click', closeAllSheets);
    $('closeAssignmentBtn').addEventListener('click', closeAllSheets);
    $('cancelAssignmentBtn').addEventListener('click', closeAllSheets);
    $('closeManagersBtn').addEventListener('click', closeAllSheets);
    $('closeManagerConfigBtn').addEventListener('click', openManagersPanel);
    $('sheetBackdrop').addEventListener('click', closeAllSheets);

    $('importListBtn').addEventListener('click', () => $('listFileInput').click());
    $('listFileInput').addEventListener('change', handleListFile);
    $('exportBackupBtn').addEventListener('click', exportBackup);
    $('backupBeforeImportBtn').addEventListener('click', exportBackup);
    $('importBackupBtn').addEventListener('click', () => $('backupFileInput').click());
    $('backupFileInput').addEventListener('change', importBackup);
    $('addPlayerBtn').addEventListener('click', openAddPlayer);
    $('removePlayerBtn').addEventListener('click', openRemovePlayer);
    $('manageManagersBtn').addEventListener('click', openManagerConfig);
    $('resetAuctionBtn').addEventListener('click', resetAuction);
    $('resetAllBtn').addEventListener('click', resetAll);
    $('themeHeaderBtn').addEventListener('click', toggleTheme);

    $('importModeSegment').querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
      state.importMode = btn.dataset.mode;
      $('importModeSegment').querySelectorAll('button').forEach(x => x.classList.toggle('active', x === btn));
      updateImportStats();
    }));
    $('confirmImportBtn').addEventListener('click', confirmImport);

    ['editTargetMin','editTargetMax','editComment'].forEach(id => {
      $(id).addEventListener('input', scheduleSelectedPlayerSave);
      $(id).addEventListener('focus', () => setTimeout(() => $(id).scrollIntoView({block:'center',behavior:'smooth'}), 250));
    });
    $('editSlot').addEventListener('change', scheduleSelectedPlayerSave);
    $('editSlot').addEventListener('focus', () => setTimeout(() => $('editSlot').scrollIntoView({block:'center',behavior:'smooth'}), 250));
    $('toggleTakenSheet').addEventListener('click', async () => {
      if (!state.selectedKey) return;
      const key = state.selectedKey;
      const p = state.players.find(x => x.key === key);
      if (p && !p.preso && state.managers.length) { openAssignmentSheet(key); return; }
      await toggleTaken(key);
      if (state.players.find(x=>x.key===key)) openPlayerSheet(key, true);
    });
    $('toggleFavoriteSheet').addEventListener('click', async () => { if (state.selectedKey) { await toggleFavorite(state.selectedKey); openPlayerSheet(state.selectedKey, true); } });
    $('savePurchaseBtn').addEventListener('click', savePurchaseAssignment);

    $('assignmentManager').addEventListener('change', updateAssignmentPreview);
    $('assignmentPrice').addEventListener('input', updateAssignmentPreview);
    $('confirmAssignmentBtn').addEventListener('click', confirmAssignment);
    $('managerSort').addEventListener('change', async e => { state.managerSort = e.target.value; await saveManagerUI(); renderManagersPanel(); });
    $('toastClose').addEventListener('click', () => { clearTimeout(toastTimer); $('toast').classList.add('hidden'); });
    $('addManagerRowBtn').addEventListener('click', () => addManagerEditorRow({}));
    $('managerConfigForm').addEventListener('submit', saveManagerConfig);
    $('closeUnassignBtn').addEventListener('click', closeAllSheets);
    $('keepAssignmentBtn').addEventListener('click', closeAllSheets);
    $('confirmUnassignBtn').addEventListener('click', confirmUnassign);
  }

  function bindFilter(id, key, evt) {
    $(id).addEventListener(evt, e => { state[key] = e.target.value; scheduleUISave(); renderPlayers(); renderFilterButton(); });
  }
  function bindCheck(id, key) {
    $(id).addEventListener('change', e => { state[key] = e.target.checked; scheduleUISave(); renderPlayers(); renderFilterButton(); });
  }

  function activeFilterCount() {
    return [state.team, state.slot, state.minFvm, state.priceMax, state.onlyAvailable, state.onlyFavorites].filter(v => v !== '' && v !== false && v != null).length;
  }

  function renderFilterButton() {
    const count = activeFilterCount();
    $('filtersBtn').textContent = count ? `Filtri · ${count}` : 'Filtri';
  }


  function showBackdrop() { $('sheetBackdrop').classList.remove('hidden'); }
  function openOnly(id) {
    ['filtersPanel','playerSheet','toolsSheet','importSheet','simpleFormSheet','assignmentSheet','managersSheet','managerConfigSheet','unassignSheet'].forEach(x => $(x).classList.add('hidden'));
    $(id).classList.remove('hidden'); showBackdrop(); document.body.style.overflow = 'hidden';
  }
  function closeAllSheets() {
    const restoreFilters = !$('filtersPanel').classList.contains('hidden');
    ['filtersPanel','playerSheet','toolsSheet','importSheet','simpleFormSheet','assignmentSheet','managersSheet','managerConfigSheet','unassignSheet'].forEach(x => $(x).classList.add('hidden'));
    $('sheetBackdrop').classList.add('hidden'); document.body.style.overflow = ''; state.selectedKey = null; state.pendingAssignmentKey = null; state.pendingUnassignKey = null;
    if (restoreFilters) requestAnimationFrame(() => window.scrollTo(0, state.filtersScrollY || 0));
  }
  function openFiltersSheet() {
    state.filtersScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    openOnly('filtersPanel');
  }
  function openTools() { openOnly('toolsSheet'); }

  function openPlayerSheet(key, preserve=false) {
    const p = state.players.find(x => x.key === key); if (!p) return;
    state.selectedKey = key;
    $('sheetPlayerName').textContent = p.nome;
    $('sheetPlayerMeta').textContent = `${p.squadra || '—'} · ${p.ruolo}${p.ruolo_mantra ? ` · ${p.ruolo_mantra}` : ''}`;
    $('sheetInfoGrid').innerHTML = [
      ['FVM',displayNum(p.fvm)], ['QI',displayNum(p.quotazione_iniziale)], ['Quotazione attuale',displayNum(p.quotazione)], ['Stato',p.preso?'PRESO':'LIBERO']
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
    $('editTargetMin').value = p.target_min ?? p.prezzo_ideale_min ?? '';
    $('editTargetMax').value = p.target_max ?? p.prezzo_ideale_max ?? '';
    $('editComment').value = p.commento || '';
    $('editPurchase').value = p.prezzo_acquisto ?? '';
    populateManagerSelects();
    $('editManager').value = p.manager_id || '';
    updateSheetButtons(p);
    renderCompetitors(p);
    if (!preserve) openOnly('playerSheet');
  }

  function updateSheetButtons(p) {
    $('toggleTakenSheet').textContent = p.preso ? 'Rimuovi assegnazione' : 'Assegna giocatore';
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
      target_min: num($('editTargetMin').value),
      target_max: num($('editTargetMax').value),
      commento: $('editComment').value,
      preferito: p.preferito
    };
    Object.assign(p, personal);
    await FantaDB.updatePersonal(p.key, personal);
    $('sheetSaveStatus').classList.add('show'); setTimeout(() => $('sheetSaveStatus').classList.remove('show'), 900);
    populateDynamicFilters(); renderPlayers(); renderCountsAndDemand();
    renderCompetitors(p);
  }


  function renderCompetitors(p) {
    const section = $('competitorsSection');
    if (!section) return;
    if (!state.managers.length || p.preso) { section.classList.add('hidden'); return; }
    const competitors = FantaAuction.getCompetitors(p, FantaAuction.opponentManagers(state.managers), state.players, state.auctionConfig);
    const pressure = FantaAuction.competitionLevel(p, competitors);
    section.classList.remove('hidden');
    const targetMax = num(p.target_max) ?? num(p.prezzo_ideale_max);
    $('competitionPressure').textContent = targetMax != null
      ? `Concorrenza ${pressure.label} · ${pressure.count} sopra Target ${displayNum(targetMax)}`
      : `Concorrenza ${pressure.label} · ${competitors.length} con slot ${p.ruolo}`;
    $('competitorsList').innerHTML = competitors.length
      ? competitors.map(({manager,stats}) => {
          const threat = FantaAuction.threatLevel(stats, p.ruolo, state.auctionConfig, targetMax);
          const targetText = targetMax == null ? '' : (stats.maxBid > targetMax ? ` · sopra Target ${displayNum(targetMax)}` : ` · sotto Target ${displayNum(targetMax)}`);
          return `<div class="competitor-row"><strong>${esc(manager.nome)}</strong><span>${displayNum(stats.budgetRemaining)} cr · Max ${displayNum(Math.floor(stats.maxBid))} · ${esc(p.ruolo)} ${stats.roleRemaining[p.ruolo]} · Minaccia ${threat.label}${targetText}</span></div>`;
        }).join('')
      : '<div class="competitor-empty">Nessun fantallenatore con slot e capacità economica disponibili.</div>';
  }

  function openAssignmentSheet(key) {
    const p = state.players.find(x => x.key === key); if (!p) return;
    if (!state.managers.length) { toast('Configura prima i fantallenatori.'); openManagersPanel(); return; }
    state.pendingAssignmentKey = key;
    populateManagerSelects();
    $('assignmentTitle').textContent = `Assegna ${p.nome}`;
    $('assignmentMeta').textContent = `${p.squadra || '—'} · ${p.ruolo} · FVM ${displayNum(p.fvm)}`;
    $('assignmentPlayerCard').innerHTML = `<strong>${esc(p.nome)}</strong><span>${esc(targetText(p))}</span>`;
    const eligible = FantaAuction.getCompetitors(p, state.managers, state.players.filter(x => x.key !== p.key), state.auctionConfig);
    const preferred = p.manager_id || eligible[0]?.manager.id || state.managers[0]?.id || '';
    $('assignmentManager').value = preferred;
    $('assignmentPrice').min = state.auctionConfig.minPrice;
    $('assignmentPrice').value = p.prezzo_acquisto ?? state.auctionConfig.minPrice;
    $('forceAssignment').checked = false;
    $('forceAssignmentWrap').classList.add('hidden');
    updateAssignmentPreview();
    openOnly('assignmentSheet');
    setTimeout(() => $('assignmentPrice').focus(), 180);
  }

  function updateAssignmentPreview() {
    const p = state.players.find(x => x.key === state.pendingAssignmentKey); if (!p) return;
    const manager = getManagerById($('assignmentManager').value);
    if (!manager) {
      $('assignmentManagerInfo').textContent = 'Seleziona un fantallenatore.';
      $('assignmentValidation').textContent = '';
      return;
    }
    const stats = managerStats(manager, p.key);
    $('assignmentManagerInfo').innerHTML = `<strong>${esc(manager.nome)}</strong> · ${displayNum(stats.budgetRemaining)} cr · ${stats.slotsRemaining} slot · Max ${displayNum(Math.floor(stats.maxBid))}<br><span>P ${stats.roleRemaining.P} · D ${stats.roleRemaining.D} · C ${stats.roleRemaining.C} · A ${stats.roleRemaining.A} · media ${displayNum(Math.round(stats.avgPerSlot * 10)/10)}/slot</span>`;
    const validation = FantaAuction.validateAssignment({ player:p, manager, price:$('assignmentPrice').value, players:state.players, config:state.auctionConfig, excludeKey:p.key });
    $('assignmentValidation').textContent = validation.ok ? 'Assegnazione valida' : validation.reason;
    $('assignmentValidation').classList.toggle('invalid', !validation.ok);
    $('forceAssignmentWrap').classList.toggle('hidden', validation.ok);
    if (validation.ok) $('forceAssignment').checked = false;
  }

  async function confirmAssignment() {
    const p = state.players.find(x => x.key === state.pendingAssignmentKey); if (!p) return;
    const manager = getManagerById($('assignmentManager').value);
    const price = num($('assignmentPrice').value);
    const validation = FantaAuction.validateAssignment({ player:p, manager, price, players:state.players, config:state.auctionConfig, excludeKey:p.key });
    if (!validation.ok && !$('forceAssignment').checked) {
      $('assignmentValidation').textContent = `${validation.reason} Attiva “Forza assegnazione” solo se la regola della lega lo richiede.`;
      $('assignmentValidation').classList.add('invalid');
      $('forceAssignmentWrap').classList.remove('hidden');
      return;
    }
    if (!validation.ok && !confirm(`${validation.reason}\n\nForzare comunque l’assegnazione?`)) return;
    if (!manager || price == null) { toast('Fantallenatore e prezzo sono obbligatori.'); return; }

    const before = {
      preso: Boolean(p.preso),
      prezzo_acquisto: p.prezzo_acquisto,
      manager_id: p.manager_id || '',
      manager_acquirente: p.manager_acquirente || ''
    };
    const after = { preso:true, prezzo_acquisto:price, manager_id:manager.id, manager_acquirente:manager.nome };
    Object.assign(p, after);
    await FantaDB.updateAuction(p.key, after);
    closeAllSheets();
    state.pendingAssignmentKey = null;
    renderPlayers(); renderCountsAndDemand();
    assignmentFeedbackToast(p, manager, price, async () => {
      Object.assign(p, before);
      await FantaDB.updateAuction(p.key, before);
      renderPlayers(); renderCountsAndDemand();
      if (!$('managersSheet').classList.contains('hidden')) renderManagersPanel();
      toast('Assegnazione annullata');
    });
  }

  async function savePurchaseAssignment() {
    const p = state.players.find(x => x.key === state.selectedKey); if (!p) return;
    const manager = getManagerById($('editManager').value);
    const price = num($('editPurchase').value);
    const validation = FantaAuction.validateAssignment({ player:p, manager, price, players:state.players, config:state.auctionConfig, excludeKey:p.key });
    if (!validation.ok) { toast(validation.reason); return; }
    const before = { preso:p.preso, prezzo_acquisto:p.prezzo_acquisto, manager_id:p.manager_id || '', manager_acquirente:p.manager_acquirente || '' };
    const after = { preso:true, prezzo_acquisto:price, manager_id:manager.id, manager_acquirente:manager.nome };
    Object.assign(p, after);
    await FantaDB.updateAuction(p.key, after);
    openPlayerSheet(p.key, true);
    renderPlayers(); renderCountsAndDemand();
    toast(`Assegnazione aggiornata`, 'Annulla', async () => {
      Object.assign(p, before); await FantaDB.updateAuction(p.key, before); openPlayerSheet(p.key, true); renderPlayers(); renderCountsAndDemand();
    }, 4800);
  }

  async function saveManagerUI() {
    await FantaDB.setSetting('managerUI', {sort:state.managerSort});
  }

  function openManagersPanel() {
    renderManagersPanel();
    openOnly('managersSheet');
  }

  function managerRosterDetails(manager, stats) {
    const roleSummary = FantaAuction.ROLES.map(r => `${r} ${stats.roleBought[r]}/${state.auctionConfig.roster[r]}`).join(' | ');
    const sections = FantaAuction.ROLES.map(role => {
      const players = state.players.filter(p => p.preso && p.ruolo === role && FantaAuction.assignmentBelongsToManager(p, manager));
      const items = players.length ? players.map(p => `<div class="roster-player"><span>${esc(p.nome)}</span><b>${num(p.prezzo_acquisto) != null ? `${displayNum(p.prezzo_acquisto)} cr` : '—'}</b></div>`).join('') : '<div class="roster-empty">Nessun acquisto</div>';
      return `<div class="roster-role"><div class="roster-role-head"><strong>${role} ${stats.roleBought[role]}/${state.auctionConfig.roster[role]}</strong></div>${items}</div>`;
    }).join('');
    return `<details class="manager-roster"><summary><span>Rosa</span><b>${esc(roleSummary)}</b></summary><div class="manager-roster-body">${sections}</div></details>`;
  }

  function renderManagersPanel() {
    if (!['slots','maxBid','budget'].includes(state.managerSort)) state.managerSort = 'budget';
    $('managerSort').value = state.managerSort;
    const c = state.auctionConfig;
    $('managersMeta').textContent = `Confronto live · ruolo ${state.role}`;
    let rows = FantaAuction.computeAllManagerStats(state.managers, state.players, c);
    const role = state.role;
    const sorters = {
      budget:(a,b)=>b.stats.budgetRemaining-a.stats.budgetRemaining,
      maxBid:(a,b)=>b.stats.maxBid-a.stats.maxBid,
      slots:(a,b)=>b.stats.roleRemaining[role]-a.stats.roleRemaining[role]
    };
    rows.sort(sorters[state.managerSort] || sorters.budget);
    $('managerCards').innerHTML = rows.length ? rows.map(({manager,stats}) => {
      const selfBadge = manager.isMe ? '<span class="self-badge">TU</span>' : '';
      const remaining = stats.roleRemaining[role];
      const roleText = `${role} rimasti ${remaining}`;
      return `<article class="manager-card v9-manager${manager.isMe?' self-manager':''}"><div class="manager-card-head"><div><strong>${esc(manager.nome)}</strong>${selfBadge}${manager.squadra?`<span>${esc(manager.squadra)}</span>`:''}</div><b>${displayNum(stats.budgetRemaining)} cr</b></div><div class="manager-focus-line"><strong>${esc(roleText)}</strong><span>Max ${displayNum(Math.floor(stats.maxBid))}</span></div>${managerRosterDetails(manager,stats)}</article>`;
    }).join('') : '<div class="manager-empty">Nessun fantallenatore configurato.</div>';
  }

  function openManagerConfig() {
    const c = state.auctionConfig;
    $('configBudget').value = c.budgetInitial;
    $('configMinPrice').value = c.minPrice;
    $('configP').value = c.roster.P;
    $('configD').value = c.roster.D;
    $('configC').value = c.roster.C;
    $('configA').value = c.roster.A;
    $('managerEditorRows').innerHTML = '';
    state.managers.slice().sort((a,b)=>a.nome.localeCompare(b.nome,'it')).forEach(m => addManagerEditorRow(m));
    openOnly('managerConfigSheet');
  }


  function addManagerEditorRow(manager = {}) {
    const row = document.createElement('div');
    row.className = 'manager-editor-row';
    row.dataset.id = manager.id || '';
    row.innerHTML = `<div class="manager-editor-fields"><label>Nome<input data-field="nome" value="${esc(manager.nome || '')}" autocomplete="off" required></label><label>Squadra <span>opz.</span><input data-field="squadra" value="${esc(manager.squadra || '')}" autocomplete="off"></label><label>Budget <span>opz.</span><input data-field="budgetInitial" type="number" inputmode="numeric" min="0" value="${manager.budgetInitial ?? ''}" placeholder="Globale"></label><label class="manager-self-field"><span>Profilo</span><span class="switch-line"><input data-field="isMe" type="checkbox" ${manager.isMe?'checked':''}><span>Io</span></span></label></div><button type="button" class="manager-remove-btn" aria-label="Rimuovi fantallenatore">×</button>`;
    row.querySelector('[data-field="isMe"]').addEventListener('change', e => { if (e.target.checked) $('managerEditorRows').querySelectorAll('[data-field="isMe"]').forEach(x => { if (x !== e.target) x.checked = false; }); });
    row.querySelector('.manager-remove-btn').addEventListener('click', () => row.remove());
    $('managerEditorRows').appendChild(row);
  }

  async function saveManagerConfig(e) {
    e.preventDefault();
    const config = FantaAuction.makeDefaultConfig({
      budgetInitial:num($('configBudget').value), minPrice:num($('configMinPrice').value),
      roster:{P:num($('configP').value),D:num($('configD').value),C:num($('configC').value),A:num($('configA').value)}
    });
    const rows = [...$('managerEditorRows').querySelectorAll('.manager-editor-row')].map(row => ({
      id:row.dataset.id || undefined,
      nome:row.querySelector('[data-field="nome"]').value.trim(),
      squadra:row.querySelector('[data-field="squadra"]').value.trim(),
      budgetInitial:num(row.querySelector('[data-field="budgetInitial"]').value),
      isMe:Boolean(row.querySelector('[data-field="isMe"]')?.checked)
    })).filter(m => m.nome);
    const normalizedNames = rows.map(m => FantaDB.normalizeText(m.nome));
    if (new Set(normalizedNames).size !== normalizedNames.length) { toast('I nomi dei fantallenatori devono essere univoci.'); return; }
    const keptIds = new Set(rows.map(m => m.id).filter(Boolean));
    const removedAssigned = state.managers.filter(m => !keptIds.has(m.id) && state.players.some(p => p.preso && String(p.manager_id || '') === String(m.id)));
    if (removedAssigned.length) { toast(`Non puoi rimuovere ${removedAssigned[0].nome}: ha giocatori assegnati.`); return; }
    state.auctionConfig = config;
    await FantaDB.setSetting('auctionConfig', config);
    state.managers = await FantaDB.replaceManagers(rows);
    const managerMap = new Map(state.managers.map(m => [String(m.id), m]));
    for (const p of state.players) {
      if (p.manager_id && managerMap.has(String(p.manager_id))) {
        const current = managerMap.get(String(p.manager_id));
        if (p.manager_acquirente !== current.nome) {
          p.manager_acquirente = current.nome;
          await FantaDB.updateAuction(p.key, { manager_acquirente:current.nome });
        }
      }
    }
    populateManagerSelects();
    renderManagersPanel();
    renderCountsAndDemand();
    openOnly('managersSheet');
    toast('Configurazione asta salvata');
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
    const changes = { added:[], removed:[], team:[], role:[], fvm:[], quote:[], qi:[], matched:0 };
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
      if ((num(old.quotazione_iniziale) ?? null) !== (num(raw.quotazione_iniziale) ?? null)) changes.qi.push({old,raw});
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
      ['Quotazione attuale', c.quote.length],
      ['QI', c.qi?.length || 0]
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
      await FantaDB.importBackupObject(data); await loadSettings(); await loadAuctionContext(); applyStateToControls(); applyTheme(); await refreshPlayers(); closeAllSheets(); toast('Backup ripristinato');
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
        <label>Quotazione attuale<input name="quotazione" type="number" inputmode="numeric"></label>
        <label>Quotazione iniziale<input name="quotazione_iniziale" type="number" inputmode="numeric"></label>
        <label>Slot<input name="slot" placeholder="S1"></label>
        <label>Target min<input name="target_min" type="number" inputmode="numeric"></label>
        <label>Target max<input name="target_max" type="number" inputmode="numeric"></label>
        <label class="span-2">Commento<textarea name="commento" rows="4"></textarea></label>
        <button class="primary-btn span-2" type="submit">Aggiungi</button>
      </form>`;
    $('addPlayerForm').addEventListener('submit', async e => {
      e.preventDefault(); const fd = new FormData(e.currentTarget); const raw = Object.fromEntries(fd.entries());
      ['fvm','quotazione','quotazione_iniziale','target_min','target_max'].forEach(k => raw[k] = num(raw[k]));
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
    await FantaDB.resetAuction(); await refreshPlayers(); closeAllSheets(); toast('Asta resettata: budget e slot sono tornati ai valori iniziali');
  }

  async function resetAll() {
    const typed = prompt('RESET COMPLETO: cancella listone e tutte le personalizzazioni. Scrivi RESET per confermare.');
    if (typed !== 'RESET') return;
    await FantaDB.resetAll(window.SEED_PLAYERS || []); Object.assign(state, {role:'C',startLetter:'M',search:'',team:'',slot:'',minFvm:'',priceMax:'',onlyAvailable:false,onlyFavorites:false,compact:false,emphasis:65,theme:'light',managers:[],auctionConfig:FantaAuction.makeDefaultConfig(),managerSort:'budget',managerView:'unified',slotDisplayMode:'remaining'});
    await FantaDB.setSetting('uiState', getPersistableUI()); await FantaDB.setSetting('theme','light'); applyStateToControls(); applyTheme(); await refreshPlayers(); closeAllSheets(); toast('Reset completo eseguito');
  }

  function updateThemeButton() {
    const btn = $('themeHeaderBtn');
    if (!btn) return;
    const dark = state.theme === 'dark';
    btn.textContent = dark ? '☀' : '☾';
    btn.setAttribute('aria-label', dark ? 'Attiva tema chiaro' : 'Attiva tema scuro');
    btn.setAttribute('title', dark ? 'Tema chiaro' : 'Tema scuro');
  }

  async function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    await FantaDB.setSetting('theme', state.theme);
    applyTheme();
  }

  function applyTheme() {
    const root = document.documentElement;
    root.setAttribute('data-theme', state.theme === 'dark' ? 'dark' : 'light');
    updateThemeButton();
  }

  function assignmentFeedbackToast(player, manager, price, undoCallback) {
    const stats = managerStats(manager);
    const role = player.ruolo;
    const remaining = stats.roleRemaining[role];
    const total = state.auctionConfig.roster[role] || 0;
    const bought = stats.roleBought[role];
    const roleText = remaining === 0 ? `${role} COMPLETO ✓` : `${role} · ${remaining} SLOT RIMASTI`; 
    const html = `<div class="assignment-toast-title"><strong>${esc(manager.nome)}</strong> · ${esc(player.nome)} · ${displayNum(price)}</div><div class="assignment-toast-role ${remaining===0?'complete':''}">${esc(roleText)}</div><div class="assignment-toast-meta">${displayNum(stats.budgetRemaining)} cr · Max ${displayNum(Math.floor(stats.maxBid))}</div>`;
    toast(html, 'ANNULLA', undoCallback, 5600, true);
  }

  function toast(message, actionLabel = '', actionCallback = null, duration = 2300, allowHTML = false) {
    clearTimeout(toastTimer);
    const el = $('toast');
    const messageEl = $('toastMessage');
    const actionEl = $('toastAction');
    el.classList.toggle('rich-toast', allowHTML);
    if (allowHTML) messageEl.innerHTML = message; else messageEl.textContent = message;
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

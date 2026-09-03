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
    sortMode: 'alpha',
    showAll: false,
    search: '',
    team: '',
    slot: '',
    minFvm: '',
    minQta: '',
    onlyAvailable: false,
    onlyFavorites: false,
    compact: false,
    commentsVisible: true,
    privacyMode: false,
    emphasis: 65,
    selectedKey: null,
    importModel: null,
    importMode: 'replace',
    managers: [],
    auctionConfig: FantaAuction.makeDefaultConfig(),
    managerSort: 'slots',
    managerView: 'unified',
    mainView: 'players',
    slotDisplayMode: 'remaining',
    pendingAssignmentKey: null,
    pendingUnassignKey: null,
    filtersScrollY: 0,
    overlayView: '',
    overlayScrollY: 0,
    lastImportChanges: null
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

  function initAssignmentPriceSelect() {
    const select = $('assignmentPrice');
    if (!select) return;
    select.innerHTML = Array.from({length:300}, (_,i) => i + 1)
      .map(value => `<option value="${value}">${value}</option>`).join('');
  }

  function initTargetSelects() {
    const options = '<option value="">—</option>' + Array.from({length:301}, (_, i) => i)
      .map(value => `<option value="${value}">${value}</option>`).join('');
    ['editTargetMin','editTargetMax'].forEach(id => { if ($(id)) $(id).innerHTML = options; });
  }

  function managerStats(manager, excludeKey = null) {
    const players = excludeKey ? state.players.filter(p => p.key !== excludeKey) : state.players;
    return FantaAuction.computeManagerStats(manager, players, state.auctionConfig);
  }

  async function init() {
    await FantaDB.openDB();
    await FantaDB.purgeLegacyDemoPlayers();
    await loadSettings();
    await loadAuctionContext();
    bindStaticEvents();
    initLetterSelect();
    updateSortControls();
    initFvmSelect();
    initQtaSelect();
    initAssignmentPriceSelect();
    initTargetSelects();
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
      const { liveMode: _legacyLiveMode, onlyComments: _legacyOnlyComments, priceMax: _removedPriceMax, ...cleanSaved } = saved;
      Object.assign(state, cleanSaved);
    }
    // v31: tema unico chiaro. Migra/neutralizza eventuali preferenze dark legacy.
    await FantaDB.setSetting('theme', 'light');
    // v19+: Live e Rose sono overlay temporanei, la vista principale resta la lista giocatori.
    state.mainView = 'players';
    if (!['alpha','slot','fvm','quot','team'].includes(state.sortMode)) state.sortMode = 'alpha';
    state.showAll = Boolean(state.showAll);
    state.commentsVisible = state.commentsVisible !== false;
    state.privacyMode = false; // modalità sicurezza volutamente non persistente tra sessioni complete
  }


  async function loadAuctionContext() {
    state.managers = await FantaDB.getManagers();
    state.auctionConfig = FantaAuction.makeDefaultConfig(await FantaDB.getSetting('auctionConfig', null) || {});
    const managerUI = await FantaDB.getSetting('managerUI', null);
    if (managerUI && typeof managerUI === 'object') {
      state.managerSort = ['slots','maxBid'].includes(managerUI.sort) ? managerUI.sort : 'slots';
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
      sortMode: state.sortMode,
      showAll: state.showAll,
      search: state.search,
      team: state.team,
      slot: state.slot,
      minFvm: state.minFvm,
      minQta: state.minQta,
      onlyAvailable: state.onlyAvailable,
      onlyFavorites: state.onlyFavorites,
      compact: state.compact,
      commentsVisible: state.commentsVisible,
      emphasis: state.emphasis,
      mainView: state.mainView
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
    renderMainView();
    renderCountsAndDemand();
  }

  function renderRoleTabs() {
    const counts = Object.fromEntries(roles.map(([r]) => [r, state.players.filter(p => p.ruolo === r).length]));
    const roleButtons = roles.map(([r]) => `
      <button class="role-tab role-short ${!state.showAll && state.role===r?'active':''}" data-role="${r}" aria-label="${roleName(r)}">${({P:'Por',D:'Dif',C:'Cen',A:'Att'})[r]}<span class="tab-count">${counts[r]}</span></button>
    `).join('');
    const allButton = `<button class="role-tab view-tab all-tab ${state.showAll?'active':''}" data-all="1">Tutti</button>`;
    const viewButtons = ['live','rose'].map(view => `
      <button class="role-tab view-tab ${state.overlayView===view?'active':''}" data-view="${view}">${view === 'live' ? 'Live' : 'Rose'}</button>
    `).join('');
    $('roleTabs').innerHTML = roleButtons + allButton + viewButtons;
    $('roleTabs').querySelectorAll('[data-role]').forEach(btn => btn.addEventListener('click', () => {
      state.role = btn.dataset.role;
      state.showAll = false;
      state.mainView = 'players';
      scheduleUISave();
      populateDynamicFilters();
      renderAll();
    }));
    $('roleTabs').querySelector('[data-all]')?.addEventListener('click', () => {
      state.showAll = true;
      state.mainView = 'players';
      scheduleUISave();
      populateDynamicFilters();
      renderAll();
    });
    $('roleTabs').querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
      openDashboardSheet(btn.dataset.view);
    }));
  }

  function renderMainView() {
    const playersMode = state.mainView === 'players';
    $('playerList').classList.toggle('hidden', !playersMode);
    $('managerDashboard').classList.toggle('hidden', playersMode);
    if (playersMode) renderPlayers();
    else renderManagerDashboard();
  }

  function initLetterSelect() {
    $('startLetter').innerHTML = letters.map(l => `<option value="${l}">${l}</option>`).join('');
  }

  function updateSortControls() {
    if ($('sortMode')) $('sortMode').value = state.sortMode;
    if ($('startLetter')) $('startLetter').value = state.startLetter;
    if ($('sortLetterWrap')) $('sortLetterWrap').classList.toggle('hidden', state.sortMode !== 'alpha');
  }

  function initFvmSelect() {
    $('minFvmFilter').innerHTML = '<option value="">—</option>' + Array.from({length:100}, (_, i) => i + 1)
      .map(v => `<option value="${v}">${v}</option>`).join('');
  }

  function initQtaSelect() {
    $('minQtaFilter').innerHTML = '<option value="">—</option>' + Array.from({length:30}, (_, i) => i + 1)
      .map(v => `<option value="${v}">${v}</option>`).join('');
  }

  function populateDynamicFilters() {
    // v29: Squadra e Slot sono filtri globali del listone, non dipendono dal reparto corrente.
    // Così il cambio Por/Dif/Cen/Att/Tutti non azzera mai una selezione valida.
    const teams = [...new Set(state.players.map(p => p.squadra).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'it'));
    const slots = [...new Set(state.players.map(p => p.slot).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'it',{numeric:true}));
    const teamValue = state.team;
    const slotValue = state.slot;
    const teamOptions = teamValue && !teams.includes(teamValue) ? [teamValue, ...teams] : teams;
    const slotOptions = slotValue && !slots.includes(slotValue) && !['S1-S2','S1-S3'].includes(slotValue) ? [slotValue, ...slots] : slots;
    $('teamFilter').innerHTML = '<option value="">Tutte</option>' + teamOptions.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
    const cumulativeSlots = '<option value="S1-S2">S1-S2</option><option value="S1-S3">S1-S3</option>';
    $('slotFilter').innerHTML = '<option value="">Tutti</option>' + cumulativeSlots + slotOptions.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
    $('teamFilter').value = teamValue || '';
    $('slotFilter').value = slotValue || '';
  }

  function applyStateToControls() {
    $('startLetter').value = state.startLetter;
    $('searchInput').value = state.search;
    setSearchExpanded(Boolean(state.search), false);
    $('onlyAvailable').checked = state.onlyAvailable;
    $('onlyFavorites').checked = state.onlyFavorites;
    $('emphasisSlider').value = state.emphasis;
    $('emphasisValue').textContent = `${state.emphasis}%`;
    const minFvm = Number(state.minFvm);
    state.minFvm = Number.isInteger(minFvm) && minFvm >= 1 && minFvm <= 100 ? String(minFvm) : '';
    $('minFvmFilter').value = state.minFvm;
    const minQta = Number(state.minQta);
    state.minQta = Number.isInteger(minQta) && minQta >= 1 && minQta <= 30 ? String(minQta) : '';
    $('minQtaFilter').value = state.minQta;
    updatePrivacyButton();
    updateCommentsButton();
    updateCompactButton();
    updateThemeButton();
    updateSortControls();
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

  function slotMatchesFilter(playerSlot, filter) {
    if (!filter) return true;
    const slot = String(playerSlot || '').trim().toUpperCase();
    if (filter === 'S1-S2') return ['S1','S2'].includes(slot);
    if (filter === 'S1-S3') return ['S1','S2','S3'].includes(slot);
    return slot === String(filter).trim().toUpperCase();
  }

  function slotSortRank(slot) {
    const m = String(slot || '').trim().toUpperCase().match(/^S(\d+)$/);
    return m ? Number(m[1]) : 999;
  }

  function comparePlayers(a, b) {
    const alpha = () => a.nome.localeCompare(b.nome,'it',{sensitivity:'base'});
    if (state.sortMode === 'slot') {
      const slotDiff = slotSortRank(a.slot) - slotSortRank(b.slot);
      if (slotDiff) return slotDiff;
      const aTarget = num(a.target_max) ?? num(a.prezzo_ideale_max);
      const bTarget = num(b.target_max) ?? num(b.prezzo_ideale_max);
      const aHasTarget = aTarget != null;
      const bHasTarget = bTarget != null;
      if (aHasTarget !== bHasTarget) return aHasTarget ? -1 : 1;
      if (aHasTarget && bHasTarget && aTarget !== bTarget) return bTarget - aTarget;
      const fvmDiff = (num(b.fvm) ?? -Infinity) - (num(a.fvm) ?? -Infinity);
      return fvmDiff || alpha();
    }
    if (state.sortMode === 'fvm') return (num(b.fvm) ?? -Infinity) - (num(a.fvm) ?? -Infinity) || alpha();
    if (state.sortMode === 'quot') return (num(b.quotazione) ?? -Infinity) - (num(a.quotazione) ?? -Infinity) || alpha();
    if (state.sortMode === 'team') return String(a.squadra || '').localeCompare(String(b.squadra || ''),'it',{sensitivity:'base'}) || alpha();
    return circularRank(a.nome) - circularRank(b.nome) || alpha();
  }

  function getFilteredPlayers() {
    const q = FantaDB.normalizeText(state.search);
    const minFvm = num(state.minFvm);
    const minQta = num(state.minQta);
    return state.players
      .filter(p => state.showAll || p.ruolo === state.role)
      .filter(p => !q || FantaDB.normalizeText(`${p.nome} ${p.squadra}`).includes(q))
      .filter(p => !state.team || p.squadra === state.team)
      .filter(p => slotMatchesFilter(p.slot, state.slot))
      .filter(p => minFvm == null || (num(p.fvm) ?? -Infinity) >= minFvm)
      .filter(p => minQta == null || (num(p.quotazione) ?? -Infinity) >= minQta)
      .filter(p => !state.onlyAvailable || !p.preso)
      .filter(p => !state.onlyFavorites || p.preferito)
      .sort(comparePlayers);
  }

  function percentile(sorted, pct) {
    if (!sorted.length) return 0;
    const pos = (sorted.length - 1) * pct;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }

  function fvmScaleInfo() {
    const values = state.players.filter(p => state.showAll || p.ruolo === state.role).map(p => num(p.fvm)).filter(v => v != null && v >= 0).sort((a,b)=>a-b);
    return { low: percentile(values, .05), high: percentile(values, .95) };
  }

  function fvmVisualRank(fvm, scale) {
    const value = num(fvm);
    if (value == null || scale.high <= scale.low) return 0.2;
    const clamped = Math.min(scale.high, Math.max(scale.low, value));
    let n = (clamped - scale.low) / (scale.high - scale.low);
    // v25: comprimiamo nettamente la fascia bassa. Lo slider aumenta la
    // gerarchia fra i nomi, non la dimensione media dell'intero listone.
    return Math.pow(n, 1.85);
  }

  function nameFontSize(fvm, scale) {
    const n = fvmVisualRank(fvm, scale);
    return 16 + (state.emphasis / 100) * 15 * n;
  }

  function nameFontWeight(fvm, scale) {
    const sizeRank = fvmVisualRank(fvm, scale);
    const n = Math.pow(sizeRank, 0.78);
    return Math.round(650 + 150 * n);
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

  function cardSlotLabel(slotValue) {
    const slot = String(slotValue || '').trim();
    const match = /^S(\d+)$/i.exec(slot);
    return match ? `${Number(match[1])}° slot` : slot;
  }

  function playerPrimaryMetaMarkup(p) {
    const parts = [];
    const slot = cardSlotLabel(p.slot);
    const target = targetText(p);
    if (slot) parts.push(`<span class="player-slot-badge">${esc(slot)}</span>`);
    if (target) parts.push(`<span class="player-target-pill">${esc(target)} cr</span>`);
    return parts.join('');
  }

  function playerSecondaryMetaMarkup(p) {
    const parts = [];
    const fvm = num(p.fvm);
    const qta = num(p.quotazione);
    const note = String(p.commento || '').trim();
    if (qta != null) parts.push(`Quot ${displayNum(qta)}`);
    if (fvm != null) parts.push(`FVM ${displayNum(fvm)}`);
    const officialHtml = parts.length ? `<span class="player-official-meta">${esc(parts.join(' · '))}</span>` : '';
    const noteHtml = note && state.commentsVisible ? `<span class="player-comment">${esc(note)}</span>` : '';
    if (officialHtml && noteHtml) return `${officialHtml}<span class="player-meta-sep"> · </span>${noteHtml}`;
    return officialHtml || noteHtml;
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
      card.className = state.privacyMode
        ? `player-card privacy-card${state.compact?' compact':''}`
        : `player-card${p.preso?' taken':''}${p.preferito?' favorite':''}${state.compact?' compact':''}${slotClass(p)}`;
      card.dataset.key = p.key;
      const size = nameFontSize(p.fvm, scale).toFixed(1);
      const weight = nameFontWeight(p.fvm, scale);
      const secondaryMeta = playerSecondaryMetaMarkup(p);
      if (state.privacyMode) {
        card.innerHTML = `<div class="player-main privacy-player-main"><div class="player-line"><span class="player-name">${esc(p.nome)}</span></div></div>`;
      } else {
        card.innerHTML = `
          <button class="fav-btn" aria-label="${p.preferito?'Rimuovi preferito':'Aggiungi preferito'}">${p.preferito?'★':'☆'}</button>
          <div class="player-main" tabindex="0" role="button" aria-label="Apri ${esc(p.nome)}">
            <div class="player-line"><span class="player-name" style="font-size:${size}px;font-weight:${weight}">${esc(p.nome)}</span><span class="player-team">${esc(p.squadra)}</span></div>
            ${p.preso ? (purchaseText(p) ? `<div class="player-purchase">${esc(purchaseText(p))}</div>` : '') : (playerPrimaryMetaMarkup(p) ? `<div class="player-primary-meta">${playerPrimaryMetaMarkup(p)}</div>` : '')}
            ${p.preso ? '' : (secondaryMeta ? `<div class="player-secondary-meta">${secondaryMeta}</div>` : '')}
          </div>
          <button class="assign-btn ${p.preso?'assigned':''}" aria-label="${p.preso?'Rimuovi assegnazione':'Assegna giocatore'}">${p.preso?'−':'+'}</button>`;
        card.querySelector('.assign-btn').addEventListener('click', () => toggleTaken(p.key));
        card.querySelector('.fav-btn').addEventListener('click', () => toggleFavorite(p.key));
        const main = card.querySelector('.player-main');
        main.addEventListener('click', () => openPlayerSheet(p.key));
        main.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openPlayerSheet(p.key); });
      }
      frag.appendChild(card);
    }
    container.replaceChildren(frag);
    const empty = $('emptyState');
    empty.textContent = state.players.length === 0
      ? 'Nessun giocatore nel listone. Importa un file .xlsx dalle Impostazioni.'
      : 'Nessun giocatore corrisponde ai filtri.';
    empty.classList.toggle('hidden', state.mainView !== 'players' || list.length !== 0);
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
    renderSlotMapIfOpen();
    const rolePlayers = state.players.filter(p => p.ruolo === state.role);
    if (state.showAll) $('demandSummary').classList.add('hidden'); else renderDemandSummary(rolePlayers);
    if (state.mainView !== 'players') {
      $('demandSummary').classList.add('hidden');
      renderManagerDashboard(state.overlayView ? 'viewSheetContent' : 'managerDashboard', state.overlayView || state.mainView);
    }
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

  function slotMapRoleLabel(role) {
    return ({P:'Por', D:'Dif', C:'Cen', A:'Att'})[role] || role;
  }

  function slotMapSlotLabel(slot) {
    const m = /^S(\d+)$/i.exec(String(slot || '').trim());
    return m ? `${Number(m[1])}° SLOT` : String(slot || '').trim();
  }

  function isGoalkeeperCoverage(p) {
    if (p.ruolo !== 'P' || String(p.slot || '').trim()) return false;
    const note = FantaDB.normalizeText(String(p.commento || ''));
    return /copertura|in coppia|secondo nelle gerarchie|non lasciare scoperta la porta/.test(note);
  }

  function slotMapPlayersForRole(role) {
    return state.players.filter(p => p.ruolo === role && (/^S[1-5]$/i.test(String(p.slot || '').trim()) || (role === 'P' && isGoalkeeperCoverage(p))));
  }

  function slotMapBandKey(p) {
    const min = num(p.target_min) ?? num(p.prezzo_ideale_min);
    const max = num(p.target_max) ?? num(p.prezzo_ideale_max);
    if (min != null && max != null) return { key:`range:${min}:${max}`, label:`${displayNum(min)}–${displayNum(max)}`, rank:max * 1000 + min };
    if (max != null) return { key:`cap:${max}`, label:`≤${displayNum(max)}`, rank:max * 1000 + 500 };
    if (min != null) return { key:`min:${min}`, label:`da ${displayNum(min)}`, rank:min * 1000 };
    return { key:'none', label:'Senza target', rank:-1 };
  }

  function slotMapNameSort(a,b) {
    // La classificazione viene prima; FVM è solo fallback tecnico dentro la stessa sottofascia.
    return (num(b.fvm) || 0) - (num(a.fvm) || 0) || a.nome.localeCompare(b.nome,'it',{sensitivity:'base'});
  }

  function slotMapNameButton(p) {
    const taken = p.preso ? ' taken' : '';
    return `<button type="button" class="slot-map-player${taken}" data-slot-map-key="${esc(p.key)}" aria-label="Apri ${esc(p.nome)}${p.preso ? ', già preso' : ''}">${esc(p.nome)}</button>`;
  }

  function slotMapProgress(remaining,total) {
    const pct = total ? Math.max(0, Math.min(100, remaining / total * 100)) : 0;
    return `<div class="slot-map-progress" aria-hidden="true"><span style="width:${pct.toFixed(1)}%"></span></div>`;
  }

  function slotMapSectionMarkup(slot, players, privacy) {
    const total = players.length;
    const remaining = players.filter(p => !p.preso).length;
    const ordered = [...players].sort(slotMapNameSort);
    let body = '';
    if (privacy) {
      body = `<div class="slot-map-names privacy-names">${ordered.map(slotMapNameButton).join('')}</div>`;
    } else {
      const bands = new Map();
      for (const p of ordered) {
        const band = slotMapBandKey(p);
        if (!bands.has(band.key)) bands.set(band.key, { ...band, players:[] });
        bands.get(band.key).players.push(p);
      }
      const grouped = [...bands.values()].sort((a,b) => b.rank - a.rank);
      const showBandLabel = grouped.length > 1 || (grouped[0] && grouped[0].key !== 'none');
      body = grouped.map(group => `<div class="slot-map-band">${showBandLabel ? `<div class="slot-map-band-label">${esc(group.label)}</div>` : ''}<div class="slot-map-names">${group.players.map(slotMapNameButton).join('')}</div></div>`).join('');
    }
    return `<section class="slot-map-slot"><div class="slot-map-slot-head"><strong>${esc(slotMapSlotLabel(slot))}</strong><span>${remaining}/${total} rimasti</span></div>${slotMapProgress(remaining,total)}${body}</section>`;
  }

  function renderSlotMapRoleTabs() {
    const box = $('slotMapRoleTabs'); if (!box) return;
    box.innerHTML = roles.map(([role]) => `<button type="button" class="slot-map-role-btn ${state.slotMapRole===role?'active':''}" data-slot-map-role="${role}">${slotMapRoleLabel(role)}</button>`).join('');
    box.querySelectorAll('[data-slot-map-role]').forEach(btn => btn.addEventListener('click', () => {
      state.slotMapRole = btn.dataset.slotMapRole;
      renderSlotMap();
    }));
  }

  function renderSlotMap() {
    const content = $('slotMapContent'); if (!content) return;
    const role = state.slotMapRole || state.role || 'C';
    state.slotMapRole = role;
    renderSlotMapRoleTabs();
    $('slotMapSubtitle').textContent = `${roleName(role)} · graduatoria personale residua`;
    const rolePlayers = slotMapPlayersForRole(role);
    if (!rolePlayers.length) {
      content.innerHTML = '<div class="slot-map-empty">Nessun giocatore classificato in questo reparto.</div>';
      return;
    }
    const slotOrder = role === 'P' ? ['S1','S2','S3','S4'] : ['S1','S2','S3','S4','S5'];
    const sections = [];
    for (const slot of slotOrder) {
      const players = rolePlayers.filter(p => String(p.slot || '').trim().toUpperCase() === slot);
      if (players.length) sections.push(slotMapSectionMarkup(slot, players, state.privacyMode));
    }
    if (role === 'P') {
      const coverage = rolePlayers.filter(isGoalkeeperCoverage);
      if (coverage.length) sections.push(slotMapSectionMarkup('COPERTURE', coverage, state.privacyMode));
    }
    const outside = state.players.filter(p => p.ruolo === role && !String(p.slot || '').trim() && !(role === 'P' && isGoalkeeperCoverage(p)));
    const outsideMarkup = outside.length ? `<details class="slot-map-outside"><summary>Fuori slot · ${outside.length}</summary><div class="slot-map-names">${outside.slice().sort(slotMapNameSort).map(slotMapNameButton).join('')}</div></details>` : '';
    content.innerHTML = `${state.privacyMode ? '<div class="slot-map-privacy-note">Privacy attiva · sottofasce economiche nascoste</div>' : ''}${sections.join('')}${outsideMarkup}`;
    content.querySelectorAll('[data-slot-map-key]').forEach(btn => btn.addEventListener('click', () => openPlayerSheet(btn.dataset.slotMapKey)));
  }

  function renderSlotMapIfOpen() {
    if ($('slotMapSheet') && !$('slotMapSheet').classList.contains('hidden')) renderSlotMap();
  }

  function openSlotMap() {
    closeContextPopovers();
    state.slotMapRole = state.role || 'C';
    openOnly('slotMapSheet');
    renderSlotMap();
  }

  function setSearchExpanded(expanded, focus = false) {
    const wrap = $('searchWrap');
    if (!wrap) return;
    const shouldExpand = expanded || Boolean(String(state.search || '').trim());
    wrap.classList.toggle('expanded', shouldExpand);
    wrap.classList.toggle('compact-search', !shouldExpand);
    $('searchToggleBtn')?.setAttribute('aria-expanded', shouldExpand ? 'true' : 'false');
    if (focus && shouldExpand) requestAnimationFrame(() => $('searchInput')?.focus({preventScroll:true}));
  }

  function bindStaticEvents() {
    $('sortBtn').addEventListener('click', () => { updateSortControls(); toggleContextPopover('sortSheet', 'sortBtn'); });
    $('closeSortBtn').addEventListener('click', () => closeContextPopovers());
    $('sortMode').addEventListener('change', e => { state.sortMode = e.target.value; updateSortControls(); scheduleUISave(); renderMainView(); });
    $('startLetter').addEventListener('change', e => { state.startLetter = e.target.value; scheduleUISave(); renderMainView(); });
    $('searchToggleBtn').addEventListener('click', () => setSearchExpanded(true, true));
    $('searchInput').addEventListener('input', e => {
      state.search = e.target.value;
      setSearchExpanded(true, false);
      scheduleUISave();
      renderMainView();
    });
    $('searchInput').addEventListener('blur', () => {
      window.setTimeout(() => { if (!String(state.search || '').trim()) setSearchExpanded(false, false); }, 80);
    });
    $('searchInput').addEventListener('keydown', e => {
      if (e.key === 'Escape' && !String(e.currentTarget.value || '').trim()) { e.currentTarget.blur(); setSearchExpanded(false, false); }
    });
    $('filtersBtn').addEventListener('click', () => toggleContextPopover('filtersPanel', 'filtersBtn'));
    $('closeFiltersBtn').addEventListener('click', () => closeContextPopovers());
    bindFilter('teamFilter','team','change');
    bindFilter('slotFilter','slot','change');
    bindFilter('minFvmFilter','minFvm','change');
    bindFilter('minQtaFilter','minQta','change');
    bindCheck('onlyAvailable','onlyAvailable');
    bindCheck('onlyFavorites','onlyFavorites');
    $('resetFiltersBtn').addEventListener('click', resetFilters);
    $('emphasisSlider').addEventListener('input', e => {
      state.emphasis = Number(e.target.value); $('emphasisValue').textContent = `${state.emphasis}%`; scheduleUISave(); renderMainView();
    });

    $('menuBtn').addEventListener('click', openTools);
    $('closeToolsBtn').addEventListener('click', closeAllSheets);
    $('closeSheetBtn').addEventListener('click', closeAllSheets);
    $('closeSheetBottomBtn').addEventListener('click', closeAllSheets);
    $('closeImportBtn').addEventListener('click', closeAllSheets);
    $('closeListoneNewsBtn').addEventListener('click', closeAllSheets);
    $('closeListoneNewsBottomBtn').addEventListener('click', closeAllSheets);
    $('closeSimpleFormBtn').addEventListener('click', closeAllSheets);
    $('closeAssignmentBtn').addEventListener('click', closeAllSheets);
    $('cancelAssignmentBtn').addEventListener('click', closeAllSheets);
    $('closeManagersBtn').addEventListener('click', closeAllSheets);
    $('closeViewSheetBtn').addEventListener('click', closeAllSheets);
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
    $('privacyHeaderBtn').addEventListener('click', togglePrivacy);
    $('commentsHeaderBtn').addEventListener('click', toggleComments);
    $('compactHeaderBtn').addEventListener('click', toggleCompact);
    $('slotMapHeaderBtn').addEventListener('click', openSlotMap);
    $('closeSlotMapBtn').addEventListener('click', closeAllSheets);

    $('importModeSegment').querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
      state.importMode = btn.dataset.mode;
      $('importModeSegment').querySelectorAll('button').forEach(x => x.classList.toggle('active', x === btn));
      updateImportStats();
    }));
    $('confirmImportBtn').addEventListener('click', confirmImport);

    ['editTargetMin','editTargetMax'].forEach(id => {
      $(id).addEventListener('change', scheduleSelectedPlayerSave);
      $(id).addEventListener('focus', () => schedulePlayerFieldVisibility($(id)));
    });
    $('editComment').addEventListener('input', () => {
      scheduleSelectedPlayerSave();
      schedulePlayerFieldVisibility($('editComment'));
    });
    $('editComment').addEventListener('focus', () => schedulePlayerFieldVisibility($('editComment')));
    $('editSlot').addEventListener('change', scheduleSelectedPlayerSave);
    $('editSlot').addEventListener('focus', () => schedulePlayerFieldVisibility($('editSlot')));
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
    $('assignmentPrice').addEventListener('change', updateAssignmentPreview);
    $('confirmAssignmentBtn').addEventListener('click', confirmAssignment);
    $('managerSort').addEventListener('change', async e => { state.managerSort = e.target.value; await saveManagerUI(); renderManagersPanel(); });
    $('toastClose').addEventListener('click', () => { clearTimeout(toastTimer); $('toast').classList.add('hidden'); });
    $('addManagerRowBtn').addEventListener('click', () => addManagerEditorRow({}));
    $('managerConfigForm').addEventListener('submit', saveManagerConfig);
    $('closeUnassignBtn').addEventListener('click', closeAllSheets);
    $('modifyAssignmentBtn').addEventListener('click', () => {
      const key = state.pendingUnassignKey;
      state.pendingUnassignKey = null;
      if (key) openAssignmentSheet(key, true);
    });
    $('confirmUnassignBtn').addEventListener('click', confirmUnassign);

    // v30: il primo click fuori da Ordina/Filtri viene consumato interamente.
    // Usiamo la capture phase: il popover si chiude prima che il click possa
    // raggiungere card, pulsanti +/− o altri controlli sottostanti.
    document.addEventListener('click', e => {
      const sortOpen = !$('sortSheet').classList.contains('hidden');
      const filtersOpen = !$('filtersPanel').classList.contains('hidden');
      if (!sortOpen && !filtersOpen) return;
      const inSort = $('sortSheet').contains(e.target);
      const inFilters = $('filtersPanel').contains(e.target);
      const onSortTrigger = $('sortBtn').contains(e.target);
      const onFiltersTrigger = $('filtersBtn').contains(e.target);
      if (inSort || inFilters || onSortTrigger || onFiltersTrigger) return;
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      closeContextPopovers();
    }, true);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeContextPopovers(); });
    window.addEventListener('scroll', () => closeContextPopovers(), {passive:true});
    window.addEventListener('resize', () => closeContextPopovers(), {passive:true});
  }

  function bindFilter(id, key, evt) {
    $(id).addEventListener(evt, e => { state[key] = e.target.value; scheduleUISave(); renderMainView(); renderFilterButton(); });
  }
  function bindCheck(id, key) {
    $(id).addEventListener('change', e => { state[key] = e.target.checked; scheduleUISave(); renderMainView(); renderFilterButton(); });
  }

  function resetFilters() {
    state.team = '';
    state.slot = '';
    state.minFvm = '';
    state.minQta = '';
    state.onlyAvailable = false;
    state.onlyFavorites = false;

    $('teamFilter').value = '';
    $('slotFilter').value = '';
    $('minFvmFilter').value = '';
    $('minQtaFilter').value = '';
    $('onlyAvailable').checked = false;
    $('onlyFavorites').checked = false;

    scheduleUISave();
    renderMainView();
    renderFilterButton();
  }

  function activeFilterCount() {
    return [state.team, state.slot, state.minFvm, state.minQta, state.onlyAvailable, state.onlyFavorites].filter(v => v !== '' && v !== false && v != null).length;
  }

  function renderFilterButton() {
    const count = activeFilterCount();
    const badge = $('filtersCountBadge');
    if (!badge) return;
    badge.textContent = count ? String(count) : '';
    badge.classList.toggle('hidden', !count);
    $('filtersBtn').setAttribute('aria-label', count ? `Filtri, ${count} attivi` : 'Filtri');
    $('filtersBtn').title = count ? `Filtri · ${count} attivi` : 'Filtri';
  }


  function showBackdrop() { $('sheetBackdrop').classList.remove('hidden'); }
  function openOnly(id) {
    closeContextPopovers();
    ['sortSheet','filtersPanel','playerSheet','toolsSheet','importSheet','listoneNewsSheet','simpleFormSheet','assignmentSheet','managersSheet','managerConfigSheet','unassignSheet','viewSheet','slotMapSheet'].forEach(x => $(x).classList.add('hidden'));
    $(id).classList.remove('hidden'); showBackdrop(); document.body.style.overflow = 'hidden';
  }
  function closeAllSheets() {
    closeContextPopovers();
    const restoreFilters = !$('filtersPanel').classList.contains('hidden');
    ['sortSheet','filtersPanel','playerSheet','toolsSheet','importSheet','listoneNewsSheet','simpleFormSheet','assignmentSheet','managersSheet','managerConfigSheet','unassignSheet','viewSheet','slotMapSheet'].forEach(x => $(x).classList.add('hidden'));
    $('sheetBackdrop').classList.add('hidden'); document.body.style.overflow = ''; state.selectedKey = null; state.pendingAssignmentKey = null; state.pendingUnassignKey = null;
    const hadOverlayView = Boolean(state.overlayView); const overlayScrollY = state.overlayScrollY || 0; state.overlayView = '';
    if (hadOverlayView) { renderRoleTabs(); requestAnimationFrame(() => window.scrollTo(0, overlayScrollY)); }
    if (restoreFilters) requestAnimationFrame(() => window.scrollTo(0, state.filtersScrollY || 0));
  }
  function contextPopoverIds() { return ['sortSheet','filtersPanel']; }
  function closeContextPopovers(exceptId = '') {
    contextPopoverIds().forEach(id => {
      if (id === exceptId) return;
      const panel = $(id); if (!panel) return;
      panel.classList.add('hidden');
      panel.removeAttribute('data-placement');
    });
    const sortOpen = !$('sortSheet').classList.contains('hidden');
    const filtersOpen = !$('filtersPanel').classList.contains('hidden');
    $('sortBtn').setAttribute('aria-expanded', String(sortOpen));
    $('filtersBtn').setAttribute('aria-expanded', String(filtersOpen));
  }

  function positionContextPopover(panelId, triggerId) {
    const panel = $(panelId), trigger = $(triggerId);
    if (!panel || !trigger || panel.classList.contains('hidden')) return;
    const margin = 8, gap = 7;
    const vw = window.visualViewport?.width || window.innerWidth;
    const vh = window.visualViewport?.height || window.innerHeight;
    const offsetTop = window.visualViewport?.offsetTop || 0;
    const triggerRect = trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    let left = triggerRect.left + triggerRect.width / 2 - panelRect.width / 2;
    left = Math.max(margin, Math.min(left, vw - panelRect.width - margin));
    const belowTop = triggerRect.bottom + gap;
    const aboveTop = triggerRect.top - panelRect.height - gap;
    const fitsBelow = belowTop + panelRect.height <= offsetTop + vh - margin;
    let top = fitsBelow ? belowTop : Math.max(offsetTop + margin, aboveTop);
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
    panel.style.bottom = 'auto';
    panel.style.transform = 'none';
    panel.dataset.placement = fitsBelow ? 'bottom' : 'top';
  }

  function toggleContextPopover(panelId, triggerId) {
    const panel = $(panelId);
    if (!panel) return;
    const isOpen = !panel.classList.contains('hidden');
    closeContextPopovers();
    // v29.1: Ordina e Filtri sono popover contestuali, non modal.
    // Qualunque backdrop legacy rimasto attivo deve essere neutralizzato qui,
    // senza alterare i backdrop usati dalle vere bottom sheet/modal dell'app.
    $('sheetBackdrop')?.classList.add('hidden');
    document.body.style.overflow = '';
    if (isOpen) return;
    panel.classList.remove('hidden');
    requestAnimationFrame(() => positionContextPopover(panelId, triggerId));
    $(triggerId).setAttribute('aria-expanded', 'true');
  }

  function openTools() { closeContextPopovers(); openOnly('toolsSheet'); }

  function openPlayerSheet(key, preserve=false) {
    const p = state.players.find(x => x.key === key); if (!p) return;
    state.selectedKey = key;
    $('sheetPlayerName').textContent = p.nome;
    $('sheetPlayerMeta').textContent = `${p.squadra || '—'} · ${p.ruolo}${p.ruolo_mantra ? ` · ${p.ruolo_mantra}` : ''}`;
    $('sheetInfoGrid').innerHTML = [
      ['Quot',displayNum(p.quotazione)], ['FVM',displayNum(p.fvm)]
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
    $('toggleTakenSheet').textContent = p.preso ? 'Gestisci assegnazione' : 'Assegna giocatore';
    $('toggleFavoriteSheet').textContent = p.preferito ? '★' : '☆';
    $('toggleFavoriteSheet').setAttribute('aria-label', p.preferito ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti');
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
      // Se il valore neutro viene scelto, azzera anche i campi legacy: altrimenti
      // la migrazione compatibilità li ripristinerebbe al successivo caricamento.
      prezzo_ideale_min: num($('editTargetMin').value),
      prezzo_ideale_max: num($('editTargetMax').value),
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

  function basePriceForPlayer(player) {
    const mode = String(state.auctionConfig.basePriceMode || '1').toLowerCase();
    const candidates = {
      '1': 1,
      qti: num(player?.quotazione_iniziale),
      qta: num(player?.quotazione),
      fvm: num(player?.fvm)
    };
    const raw = candidates[mode] ?? 1;
    return Math.min(300, Math.max(1, Math.round(Number(raw) || 1)));
  }

  function openAssignmentSheet(key, editingExisting=false) {
    const p = state.players.find(x => x.key === key); if (!p) return;
    if (!state.managers.length) { toast('Configura prima i fantallenatori.'); openManagersPanel(); return; }
    state.pendingAssignmentKey = key;
    populateManagerSelects();
    $('assignmentTitle').textContent = (editingExisting || p.preso) ? `Modifica ${p.nome}` : `Assegna ${p.nome}`;
    $('assignmentMeta').textContent = `${p.squadra || '—'} · ${p.ruolo} · FVM ${displayNum(p.fvm)}`;
    $('confirmAssignmentBtn').textContent = (editingExisting || p.preso) ? 'Salva modifica' : 'Conferma';
    $('assignmentPlayerCard').innerHTML = `<strong>${esc(p.nome)}</strong><span>${esc(targetText(p))}</span>`;
    const eligible = FantaAuction.getCompetitors(p, state.managers, state.players.filter(x => x.key !== p.key), state.auctionConfig);
    const preferred = p.manager_id || eligible[0]?.manager.id || state.managers[0]?.id || '';
    $('assignmentManager').value = preferred;
    const savedPrice = num(p.prezzo_acquisto);
    const defaultPrice = Math.min(300, Math.max(1, savedPrice ?? basePriceForPlayer(p)));
    $('assignmentPrice').value = String(defaultPrice);
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
      $('assignmentValidation').textContent = 'Seleziona un fantallenatore.';
      $('assignmentValidation').classList.add('invalid');
      $('forceAssignmentWrap').classList.add('hidden');
      return;
    }
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
    closeAllSheets();
    openDashboardSheet('live');
  }

  function openDashboardSheet(view) {
    state.overlayView = view === 'rose' ? 'rose' : 'live';
    state.overlayScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    state.mainView = 'players';
    renderManagerDashboard('viewSheetContent', state.overlayView);
    $('viewSheet').classList.toggle('live-height-80', state.overlayView === 'live');
    openOnly('viewSheet');
    // openOnly non deve azzerare lo stato temporaneo della vista.
    state.overlayView = view === 'rose' ? 'rose' : 'live';
    renderRoleTabs();
  }

  function twoColumnPlayers(players, itemClass) {
    if (!players.length) return '';
    const split = Math.ceil(players.length / 2);
    const columns = [players.slice(0, split), players.slice(split)];
    return `<div class="purchase-columns">${columns.filter(col => col.length).map(col => `<div class="purchase-column">${col.map(p => `<div class="${itemClass}"><span>${esc(p.nome)}</span><b>${num(p.prezzo_acquisto) != null ? `${displayNum(p.prezzo_acquisto)} cr` : '—'}</b></div>`).join('')}</div>`).join('')}</div>`;
  }

  function managerFullRosterDetails(manager, stats) {
    const roleSummary = FantaAuction.ROLES.map(r => `${r} ${stats.roleBought[r]}/${state.auctionConfig.roster[r]}`).join(' · ');
    const sections = FantaAuction.ROLES.map(role => {
      const players = state.players.filter(p => p.preso && p.ruolo === role && FantaAuction.assignmentBelongsToManager(p, manager));
      const items = players.length ? twoColumnPlayers(players, 'roster-player') : '<div class="roster-empty">Nessun acquisto</div>';
      return `<div class="roster-role"><div class="roster-role-head"><strong>${role} ${stats.roleBought[role]}/${state.auctionConfig.roster[role]}</strong></div>${items}</div>`;
    }).join('');
    return `<details class="manager-roster rose-roster"><summary><b>${esc(roleSummary)}</b></summary><div class="manager-roster-body">${sections}</div></details>`;
  }

  function managerRolePurchases(manager, role) {
    const players = state.players.filter(p => p.preso && p.ruolo === role && FantaAuction.assignmentBelongsToManager(p, manager));
    if (!players.length) return '<div class="live-role-empty">Nessun acquisto nel ruolo</div>';
    return twoColumnPlayers(players, 'live-role-player');
  }

  function sortLiveRows(rows, role) {
    return rows.sort((a,b) => {
      if (state.managerSort === 'maxBid') return Number(b.stats.maxBid || 0) - Number(a.stats.maxBid || 0) || String(a.manager.nome).localeCompare(String(b.manager.nome), 'it', {sensitivity:'base'});
      return Number(b.stats.roleRemaining?.[role] || 0) - Number(a.stats.roleRemaining?.[role] || 0) || String(a.manager.nome).localeCompare(String(b.manager.nome), 'it', {sensitivity:'base'});
    });
  }

  function bindLiveSort() {
    const select = $('liveManagerSort');
    if (!select) return;
    select.addEventListener('change', async e => {
      state.managerSort = e.target.value === 'maxBid' ? 'maxBid' : 'slots';
      await saveManagerUI();
      renderManagerDashboard(state.overlayView ? 'viewSheetContent' : 'managerDashboard', state.overlayView || state.mainView);
    });
  }

  function renderManagerDashboard(targetId = 'managerDashboard', view = state.mainView) {
    const dashboard = $(targetId);
    if (!dashboard) return;
    if (targetId === 'managerDashboard') {
      $('playerList').classList.add('hidden');
      $('emptyState').classList.add('hidden');
      dashboard.classList.remove('hidden');
    }
    const role = state.role;
    const roleShort = ({P:'Por',D:'Dif',C:'Cen',A:'Att'})[role];
    const inSheet = targetId === 'viewSheetContent';
    const baseRows = FantaAuction.computeAllManagerStats(state.managers, state.players, state.auctionConfig);

    if (inSheet) {
      $('viewSheetTitle').textContent = view === 'rose' ? `Rose · ${roleShort}` : `Live · ${roleShort}`;
      $('viewSheetToolbar').innerHTML = view === 'live'
        ? `<label class="live-sort-control sheet-live-sort"><span>Ordina</span><select id="liveManagerSort"><option value="slots" ${state.managerSort==='slots'?'selected':''}>Slot rimasti</option><option value="maxBid" ${state.managerSort==='maxBid'?'selected':''}>Max bid possibile</option></select></label>`
        : '';
    }

    if (view === 'rose') {
      const rows = baseRows.slice().sort((a,b) => String(a.manager.nome).localeCompare(String(b.manager.nome), 'it', {sensitivity:'base'}));
      const head = inSheet ? '' : `<div class="dashboard-head"><h2>Rose</h2><span>Situazione completa delle squadre</span></div>`;
      dashboard.innerHTML = `${head}<div class="manager-cards rose-cards">${rows.length ? rows.map(({manager,stats}) => {
        const selfBadge = manager.isMe ? '<span class="self-badge">TU</span>' : '';
        return `<article class="manager-card rose-manager${manager.isMe?' self-manager':''}"><div class="rose-manager-head"><div><strong>${esc(manager.nome)}</strong>${selfBadge}${manager.squadra ? `<span>${esc(manager.squadra)}</span>` : ''}</div><b>${displayNum(stats.budgetRemaining)} cr</b></div>${managerFullRosterDetails(manager,stats)}</article>`;
      }).join('') : '<div class="manager-empty">Nessun fantallenatore configurato.</div>'}</div>`;
      return;
    }

    const rows = sortLiveRows(baseRows.slice(), role);
    const head = inSheet ? '' : `<div class="dashboard-head live-dashboard-head"><div><h2>Live · ${roleShort}</h2></div><label class="live-sort-control"><span>Ordina</span><select id="liveManagerSort"><option value="slots" ${state.managerSort==='slots'?'selected':''}>Slot rimasti</option><option value="maxBid" ${state.managerSort==='maxBid'?'selected':''}>Max bid possibile</option></select></label></div>`;
    dashboard.innerHTML = `${head}<div class="manager-cards live-cards">${rows.length ? rows.map(({manager,stats}) => {
      const remaining = Number(stats.roleRemaining[role] || 0);
      const roleText = remaining === 0 ? 'AL COMPLETO' : `${role} - ${remaining} SLOT ${remaining === 1 ? 'RIMASTO' : 'RIMASTI'}`;
      const selfBadge = manager.isMe ? '<span class="self-badge">TU</span>' : '';
      return `<details class="manager-card live-manager${manager.isMe?' self-manager':''}${remaining===0?' role-complete':''}"><summary class="manager-live-summary"><div class="manager-live-row"><div class="manager-live-left"><strong class="manager-live-name">${esc(manager.nome)}</strong>${selfBadge}<span class="manager-role-badge">${esc(roleText)}</span></div><div class="manager-live-economy"><b class="manager-live-budget">${displayNum(stats.budgetRemaining)} cr</b><span class="manager-live-separator">·</span><span class="manager-live-max">(max bid ${displayNum(Math.floor(stats.maxBid))})</span><span class="live-chevron" aria-hidden="true">⌄</span></div></div></summary><div class="live-role-list">${managerRolePurchases(manager, role)}</div></details>`;
    }).join('') : '<div class="manager-empty">Nessun fantallenatore configurato.</div>'}</div>`;
    bindLiveSort();
  }

  function renderManagersPanel() {
    renderManagerDashboard();
  }

  function openManagerConfig() {
    const c = state.auctionConfig;
    $('configBudget').value = c.budgetInitial;
    $('configBasePrice').value = c.basePriceMode || '1';
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
    row.innerHTML = `<div class="manager-editor-fields"><label class="manager-name-field"><span class="manager-field-title">Nome</span><input data-field="nome" value="${esc(manager.nome || '')}" autocomplete="off" required></label><label class="manager-team-field"><span class="manager-field-title">Squadra</span><input data-field="squadra" value="${esc(manager.squadra || '')}" autocomplete="off"></label><label class="manager-self-field"><input class="manager-self-input" data-field="isMe" aria-label="Io" type="checkbox" ${manager.isMe?'checked':''}><span class="manager-self-toggle" aria-hidden="true"><span class="self-check">✓</span><span>Io</span></span></label></div><button type="button" class="manager-remove-btn" aria-label="Rimuovi fantallenatore">×</button>`;
    row.querySelector('[data-field="isMe"]').addEventListener('change', e => { if (e.target.checked) $('managerEditorRows').querySelectorAll('[data-field="isMe"]').forEach(x => { if (x !== e.target) x.checked = false; }); });
    row.querySelector('.manager-remove-btn').addEventListener('click', () => row.remove());
    $('managerEditorRows').appendChild(row);
  }

  async function saveManagerConfig(e) {
    e.preventDefault();
    const config = FantaAuction.makeDefaultConfig({
      budgetInitial:num($('configBudget').value),
      basePriceMode:$('configBasePrice').value,
      minPrice:1,
      roster:{P:num($('configP').value),D:num($('configD').value),C:num($('configC').value),A:num($('configA').value)}
    });
    const rows = [...$('managerEditorRows').querySelectorAll('.manager-editor-row')].map(row => ({
      id:row.dataset.id || undefined,
      nome:row.querySelector('[data-field="nome"]').value.trim(),
      squadra:row.querySelector('[data-field="squadra"]').value.trim(),
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
    state.mainView = 'players';
    closeAllSheets();
    renderAll();
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
    const changes = compareImportedPlayers(players);
    state.lastImportChanges = changes;
    renderImportChanges(changes);
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

  function changeRoleLabel(value) {
    const r = String(value || '').toUpperCase();
    return ['P','D','C','A'].includes(r) ? r : '—';
  }

  function importChangeSection(title, rows, emptyLabel) {
    const count = rows.length;
    return `
      <details class="listone-change-section" ${count && count <= 6 ? 'open' : ''}>
        <summary><span>${esc(title)}</span><strong>${count}</strong></summary>
        <div class="listone-change-list">${count ? rows.join('') : `<div class="listone-change-empty">${esc(emptyLabel)}</div>`}</div>
      </details>`;
  }

  function importChangeRows(c) {
    const added = c.added.map(p => `<div class="listone-change-row"><strong>${esc(p.nome)}</strong><span>${esc(p.squadra || '—')} · ${esc(changeRoleLabel(p.ruolo))}${p.quotazione != null ? ` · Quot ${esc(displayNum(p.quotazione))}` : ''}${p.fvm != null ? ` · FVM ${esc(displayNum(p.fvm))}` : ''}</span></div>`);
    const removed = c.removed.map(p => `<div class="listone-change-row removed"><strong>${esc(p.nome)}</strong><span>${esc(p.squadra || '—')} · ${esc(changeRoleLabel(p.ruolo))}${p.preso ? ` · Assegnato a ${esc(p.manager_acquirente || 'fantallenatore')}${p.prezzo_acquisto != null ? ` (${esc(displayNum(p.prezzo_acquisto))} cr)` : ''}` : ''}</span></div>`);
    const team = c.team.map(x => `<div class="listone-change-row team-change"><strong>${esc(x.old.nome)}</strong><span>${esc(x.old.squadra || '—')} → ${esc(x.raw.squadra || '—')}</span></div>`);
    return { added, removed, team };
  }

  function renderImportChanges(c) {
    const box = $('importChanges');
    if (!state.players.length) {
      box.classList.add('hidden');
      box.innerHTML = '';
      return;
    }
    box.classList.remove('hidden');
    const removedLabel = state.importMode === 'replace' ? 'Rimossi' : 'Non più nel file';
    const rows = importChangeRows(c);
    const relevant = c.added.length + c.removed.length + c.team.length;
    box.innerHTML = `
      <div class="change-title">Novità listone</div>
      <div class="change-summary-line"><strong>+ ${c.added.length}</strong> aggiunti · <strong>− ${c.removed.length}</strong> ${esc(removedLabel.toLowerCase())} · <strong>${c.team.length}</strong> cambi squadra</div>
      ${relevant ? '' : '<div class="change-none">Nessuna variazione rilevata nel listone.</div>'}
      ${importChangeSection('Aggiunti', rows.added, 'Nessun giocatore aggiunto')}
      ${importChangeSection(removedLabel, rows.removed, state.importMode === 'replace' ? 'Nessun giocatore rimosso' : 'Nessun giocatore assente dal nuovo file')}
      ${importChangeSection('Cambio squadra', rows.team, 'Nessun cambio squadra')}
      ${(c.role.length || c.fvm.length || c.quote.length || c.qi.length) ? `<div class="change-secondary">Aggiornamenti ufficiali: ruolo ${c.role.length} · FVM ${c.fvm.length} · Quot ${c.quote.length} · Qt.I ${c.qi.length}</div>` : ''}
      ${state.importMode === 'update' && c.removed.length ? '<div class="change-note">Con “Aggiorna senza rimuovere” i giocatori assenti dal nuovo file resteranno nel database.</div>' : ''}`;
  }

  function renderListoneNewsSheet(c) {
    const rows = importChangeRows(c);
    $('listoneNewsSummary').innerHTML = `<strong>+ ${c.added.length}</strong> aggiunti · <strong>− ${c.removed.length}</strong> rimossi · <strong>${c.team.length}</strong> cambi squadra`;
    $('listoneNewsBody').innerHTML = `
      ${importChangeSection('Aggiunti', rows.added, 'Nessun giocatore aggiunto')}
      ${importChangeSection('Rimossi', rows.removed, 'Nessun giocatore rimosso')}
      ${importChangeSection('Cambio squadra', rows.team, 'Nessun cambio squadra')}`;
  }

  async function confirmImport() {
    const m = state.importModel; if (!m) return;
    if (m.mapping.nome == null || m.mapping.ruolo == null) { toast('Associa almeno Nome e Ruolo.'); return; }
    const { players, issues } = FantaImport.buildPlayers(m.headers, m.rows, m.mapping);
    if (!players.length) { toast('Nessun giocatore valido da importare.'); return; }
    const hadPreviousList = state.players.length > 0;
    const changes = compareImportedPlayers(players);
    const relevantChanges = changes.added.length + changes.removed.length + changes.team.length;
    if (issues.length && !confirm(`Sono presenti ${issues.length} righe problematiche che verranno ignorate. Continuare?`)) return;
    if (state.importMode === 'replace' && hadPreviousList && !confirm('Sincronizzare il database con questo listone? I giocatori non più presenti verranno rimossi dal listone attivo ma conservati nello storico interno; commenti, prezzi personali, preferiti e stato dei giocatori riconosciuti verranno mantenuti.')) return;
    try {
      const result = await FantaDB.importBasePlayers(players, state.importMode);
      await refreshPlayers();
      closeAllSheets();
      if (hadPreviousList && relevantChanges) {
        renderListoneNewsSheet(changes);
        openOnly('listoneNewsSheet');
      } else if (hadPreviousList) {
        toast('Nessuna variazione rilevata nel listone.');
      } else {
        toast(`Listone importato: ${result.imported} giocatori.`);
      }
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
    await FantaDB.resetAll(); Object.assign(state, {role:'C',startLetter:'M',sortMode:'alpha',showAll:false,search:'',team:'',slot:'',minFvm:'',minQta:'',onlyAvailable:false,onlyFavorites:false,compact:false,commentsVisible:true,privacyMode:false,emphasis:65,managers:[],auctionConfig:FantaAuction.makeDefaultConfig(),managerSort:'slots',managerView:'unified',slotDisplayMode:'remaining',mainView:'players'});
    await FantaDB.setSetting('uiState', getPersistableUI()); await FantaDB.setSetting('theme','light'); applyStateToControls(); applyTheme(); await refreshPlayers(); closeAllSheets(); toast('Reset completo eseguito');
  }

  function updateCommentsButton() {
    const btn = $('commentsHeaderBtn');
    if (!btn) return;
    btn.classList.toggle('active', state.commentsVisible);
    btn.setAttribute('aria-pressed', state.commentsVisible ? 'true' : 'false');
    btn.setAttribute('aria-label', state.commentsVisible ? 'Nascondi commenti' : 'Mostra commenti');
    btn.setAttribute('title', state.commentsVisible ? 'Commenti visibili' : 'Commenti nascosti');
  }

  function toggleComments() {
    state.commentsVisible = !state.commentsVisible;
    updateCommentsButton();
    scheduleUISave();
    renderPlayers();
  }

  function updatePrivacyButton() {
    const btn = $('privacyHeaderBtn');
    if (!btn) return;
    btn.classList.toggle('active', state.privacyMode);
    btn.setAttribute('aria-pressed', state.privacyMode ? 'true' : 'false');
    btn.setAttribute('aria-label', state.privacyMode ? 'Disattiva modalità privacy' : 'Attiva modalità privacy');
    btn.setAttribute('title', state.privacyMode ? 'Privacy attiva' : 'Modalità privacy');
  }

  function togglePrivacy() {
    state.privacyMode = !state.privacyMode;
    updatePrivacyButton();
    renderPlayers();
    renderSlotMapIfOpen();
  }

  function updateCompactButton() {
    const btn = $('compactHeaderBtn');
    if (!btn) return;
    btn.classList.toggle('active', state.compact);
    btn.setAttribute('aria-pressed', state.compact ? 'true' : 'false');
    btn.setAttribute('aria-label', state.compact ? 'Disattiva modalità compatta' : 'Attiva modalità compatta');
    btn.setAttribute('title', state.compact ? 'Vista normale' : 'Modalità compatta');
  }

  function toggleCompact() {
    state.compact = !state.compact;
    updateCompactButton();
    scheduleUISave();
    renderPlayers();
  }

  function applyTheme() {
    // v31: interfaccia esclusivamente chiara; ignora qualsiasi stato dark legacy.
    document.documentElement.setAttribute('data-theme', 'light');
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

  function playerActionBarHeight() {
    const bar = $('playerSheet')?.querySelector('.player-bottom-actions');
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.round(rect.height));
  }

  function syncPlayerActionBarHeight() {
    const height = playerActionBarHeight();
    if (height > 0) document.documentElement.style.setProperty('--player-action-bar-height', `${height}px`);
  }

  function ensurePlayerFieldVisible(field) {
    const sheet = $('playerSheet');
    if (!field || !sheet || sheet.classList.contains('hidden')) return;
    const scroller = sheet.querySelector('.sheet-scroll');
    if (!scroller) return;

    syncPlayerActionBarHeight();
    const fieldRect = field.getBoundingClientRect();
    const scrollRect = scroller.getBoundingClientRect();
    const actionBar = sheet.querySelector('.player-bottom-actions');
    const actionRect = actionBar?.getBoundingClientRect();
    const topGap = 12;
    const bottomGap = sheet.classList.contains('keyboard-open') ? 14 : 10;
    // La sticky action bar occupa una parte reale della viewport del contenuto.
    // Il limite visibile inferiore è quindi il suo bordo superiore, non il fondo
    // dello scroller. Questo evita che Commento risulti "visibile" al browser
    // pur essendo coperto dai pulsanti.
    const visibleBottom = actionRect && actionRect.top > scrollRect.top
      ? Math.min(scrollRect.bottom, actionRect.top) - bottomGap
      : scrollRect.bottom - bottomGap;
    const visibleTop = scrollRect.top + topGap;

    let delta = 0;
    if (fieldRect.bottom > visibleBottom) delta = fieldRect.bottom - visibleBottom;
    else if (fieldRect.top < visibleTop) delta = fieldRect.top - visibleTop;
    if (Math.abs(delta) > 1) scroller.scrollBy({ top: delta, behavior: 'smooth' });
  }

  function schedulePlayerFieldVisibility(field) {
    // Safari/iOS modifica la Visual Viewport in più passaggi (tastiera + barra
    // accessoria). Ripetiamo il controllo durante l'animazione senza mai
    // scrollare il documento sottostante.
    requestAnimationFrame(() => ensurePlayerFieldVisible(field));
    setTimeout(() => ensurePlayerFieldVisible(field), 80);
    setTimeout(() => ensurePlayerFieldVisible(field), 220);
    setTimeout(() => ensurePlayerFieldVisible(field), 420);
  }

  function setupViewportHandling() {
    const root = document.documentElement;
    const fallback = () => {
      root.style.setProperty('--visual-viewport-height', `${window.innerHeight}px`);
      root.style.setProperty('--visual-viewport-top', '0px');
      root.style.setProperty('--keyboard-offset', '0px');
      root.style.setProperty('--keyboard-safe-gap', '18px');
      syncPlayerActionBarHeight();
    };
    if (!window.visualViewport) {
      fallback();
      window.addEventListener('resize', fallback, {passive:true});
      return;
    }
    const update = () => {
      const vv = window.visualViewport;
      const keyboardOffset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      const keyboardOpen = keyboardOffset > 80;
      root.style.setProperty('--visual-viewport-height', `${Math.max(240, vv.height)}px`);
      root.style.setProperty('--visual-viewport-top', `${Math.max(0, vv.offsetTop)}px`);
      root.style.setProperty('--keyboard-offset', `${keyboardOffset}px`);
      // Margine extra deliberato: la toolbar accessoria iOS non è sempre
      // rappresentata separatamente dalle metriche della Visual Viewport.
      root.style.setProperty('--keyboard-safe-gap', keyboardOpen ? '28px' : '18px');
      const playerSheet = $('playerSheet');
      if (playerSheet) {
        playerSheet.classList.toggle('keyboard-open', keyboardOpen);
        syncPlayerActionBarHeight();
      }
      if (keyboardOpen && playerSheet && !playerSheet.classList.contains('hidden')) {
        const active = document.activeElement;
        if (active && playerSheet.contains(active)) schedulePlayerFieldVisibility(active);
      }
    };
    window.visualViewport.addEventListener('resize', update, {passive:true});
    window.visualViewport.addEventListener('scroll', update, {passive:true});
    window.addEventListener('orientationchange', () => setTimeout(update, 120), {passive:true});
    window.addEventListener('resize', () => { syncPlayerActionBarHeight(); }, {passive:true});

    const actionBar = $('playerSheet')?.querySelector('.player-bottom-actions');
    if (actionBar && 'ResizeObserver' in window) {
      const ro = new ResizeObserver(() => syncPlayerActionBarHeight());
      ro.observe(actionBar);
    }
    update();
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

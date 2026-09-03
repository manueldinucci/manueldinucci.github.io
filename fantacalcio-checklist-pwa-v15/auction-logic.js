(() => {
  const ROLES = ['P','D','C','A'];

  function numberOr(value, fallback = 0) {
    if (value === '' || value == null) return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalizeRole(role) {
    const r = String(role || '').trim().toUpperCase();
    return ROLES.includes(r) ? r : '';
  }

  function makeDefaultConfig(config = {}) {
    const roster = config.roster || {};
    return {
      budgetInitial: Math.max(0, numberOr(config.budgetInitial, 500)),
      minPrice: Math.max(0, numberOr(config.minPrice, 1)),
      roster: {
        P: Math.max(0, Math.floor(numberOr(roster.P, 3))),
        D: Math.max(0, Math.floor(numberOr(roster.D, 8))),
        C: Math.max(0, Math.floor(numberOr(roster.C, 8))),
        A: Math.max(0, Math.floor(numberOr(roster.A, 6)))
      }
    };
  }

  function totalRosterSlots(config) {
    const c = makeDefaultConfig(config);
    return ROLES.reduce((sum, r) => sum + c.roster[r], 0);
  }

  function assignmentBelongsToManager(player, manager) {
    if (!player || !player.preso || !manager) return false;
    if (player.manager_id && manager.id) return String(player.manager_id) === String(manager.id);
    const assignedName = String(player.manager_acquirente || '').trim().toLocaleLowerCase('it');
    return Boolean(assignedName && assignedName === String(manager.nome || '').trim().toLocaleLowerCase('it'));
  }

  function computeManagerStats(manager, players, config) {
    const c = makeDefaultConfig(config);
    const budgetInitial = Math.max(0, numberOr(manager?.budgetInitial, c.budgetInitial));
    const roleBought = { P:0, D:0, C:0, A:0 };
    let spent = 0;
    let bought = 0;

    for (const p of players || []) {
      if (!assignmentBelongsToManager(p, manager)) continue;
      const role = normalizeRole(p.ruolo);
      const price = Math.max(0, numberOr(p.prezzo_acquisto, 0));
      spent += price;
      bought += 1;
      if (role) roleBought[role] += 1;
    }

    const roleRemaining = {};
    for (const role of ROLES) roleRemaining[role] = Math.max(0, c.roster[role] - roleBought[role]);
    const slotsRemaining = ROLES.reduce((sum, role) => sum + roleRemaining[role], 0);
    const budgetRemaining = Math.max(0, budgetInitial - spent);
    let maxBid = 0;
    if (slotsRemaining > 0) {
      maxBid = budgetRemaining - Math.max(0, slotsRemaining - 1) * c.minPrice;
      maxBid = Math.max(c.minPrice, maxBid);
      maxBid = Math.min(budgetRemaining, maxBid);
    }
    const avgPerSlot = slotsRemaining > 0 ? budgetRemaining / slotsRemaining : 0;

    return {
      id: manager?.id || '',
      nome: manager?.nome || '',
      squadra: manager?.squadra || '',
      budgetInitial,
      budgetRemaining,
      spent,
      bought,
      roleBought,
      roleRemaining,
      slotsRemaining,
      maxBid,
      avgPerSlot,
      rosterComplete: slotsRemaining === 0
    };
  }

  function computeAllManagerStats(managers, players, config) {
    return (managers || []).map(m => ({ manager:m, stats:computeManagerStats(m, players, config) }));
  }

  function validateAssignment({ player, manager, price, players, config, excludeKey = null }) {
    const c = makeDefaultConfig(config);
    if (!player) return { ok:false, reason:'Giocatore non trovato.' };
    if (!manager) return { ok:false, reason:'Seleziona un fantallenatore.' };
    const role = normalizeRole(player.ruolo);
    if (!role) return { ok:false, reason:'Ruolo del giocatore non valido.' };
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice)) return { ok:false, reason:'Inserisci un prezzo valido.' };
    if (numericPrice < c.minPrice) return { ok:false, reason:`Il prezzo minimo è ${c.minPrice}.` };

    const sourcePlayers = (players || []).filter(p => p.key !== excludeKey);
    const stats = computeManagerStats(manager, sourcePlayers, c);
    if (stats.rosterComplete) return { ok:false, reason:'La rosa di questo fantallenatore è già completa.' };
    if (stats.roleRemaining[role] <= 0) return { ok:false, reason:`Nessuno slot ${role} disponibile.` };
    if (numericPrice > stats.budgetRemaining) return { ok:false, reason:'Budget residuo insufficiente.' };
    if (numericPrice > stats.maxBid) return { ok:false, reason:`Offerta massima teorica: ${Math.floor(stats.maxBid)}.` };
    return { ok:true, stats, price:numericPrice };
  }

  function getCompetitors(player, managers, players, config) {
    const role = normalizeRole(player?.ruolo);
    if (!role) return [];
    const reference = Number.isFinite(Number(player?.target_max)) ? Number(player.target_max) : (Number.isFinite(Number(player?.prezzo_ideale_max)) ? Number(player.prezzo_ideale_max) : null);
    return computeAllManagerStats(managers, players, config)
      .filter(({stats}) => !stats.rosterComplete && stats.roleRemaining[role] > 0 && stats.maxBid >= (config?.minPrice ?? 1))
      .map(({manager,stats}) => ({ manager, stats, canBeatTarget: reference == null ? null : stats.maxBid > reference }))
      .sort((a,b) => b.stats.maxBid - a.stats.maxBid || b.stats.budgetRemaining - a.stats.budgetRemaining || String(a.manager.nome).localeCompare(String(b.manager.nome),'it'));
  }

  function competitionLevel(player, competitors) {
    if (!competitors?.length) return { label:'BASSA', count:0 };
    const targetMax = Number(player?.target_max ?? player?.prezzo_ideale_max);
    const relevant = Number.isFinite(targetMax) ? competitors.filter(x => x.stats.maxBid > targetMax).length : competitors.length;
    if (relevant >= 5) return { label:'ALTA', count:relevant };
    if (relevant >= 2) return { label:'MEDIA', count:relevant };
    return { label:'BASSA', count:relevant };
  }

  function roleNeedLevel(remaining, total) {
    const t = Math.max(0, numberOr(total, 0));
    const r = Math.max(0, numberOr(remaining, 0));
    if (t <= 0 || r <= 0) return { label:'FUORI', need:'COMPLETO', ratio:0 };
    const ratio = Math.min(1, r / t);
    if (ratio >= .75) return { label:'ALTA', need:'MOLTO ALTO', ratio };
    if (ratio >= .5) return { label:'ALTA', need:'ALTO', ratio };
    if (ratio >= .25) return { label:'MEDIA', need:'MEDIO', ratio };
    return { label:'BASSA', need:'BASSO', ratio };
  }

  function threatLevel(stats, role, config, targetMax = null) {
    const c = makeDefaultConfig(config);
    const total = c.roster[role] || 0;
    const remaining = stats?.roleRemaining?.[role] || 0;
    if (remaining <= 0 || stats?.rosterComplete) return { label:'FUORI', score:0 };
    const need = roleNeedLevel(remaining, total);
    const economicRatio = stats.budgetInitial > 0 ? Math.min(1, stats.maxBid / stats.budgetInitial) : 0;
    const target = Number(targetMax);
    const targetPower = Number.isFinite(target) && target > 0 ? Math.min(1.25, stats.maxBid / target) : economicRatio;
    const score = need.ratio * .55 + Math.min(1, targetPower) * .3 + economicRatio * .15;
    if (score >= .68) return { label:'ALTA', score };
    if (score >= .38) return { label:'MEDIA', score };
    return { label:'BASSA', score };
  }

  function opponentManagers(managers) {
    const list = managers || [];
    const hasSelf = list.some(m => m?.isMe);
    return hasSelf ? list.filter(m => !m?.isMe) : list;
  }

  function computeRoleDemand(managers, players, config, role) {
    const c = makeDefaultConfig(config);
    const opponents = opponentManagers(managers);
    const rows = computeAllManagerStats(opponents, players, c);
    const active = rows.filter(({stats}) => stats.roleRemaining[role] > 0 && !stats.rosterComplete);
    const demand = active.reduce((sum, {stats}) => sum + stats.roleRemaining[role], 0);
    const groups = { hungry:0, medium:0, almost:0, complete:rows.length-active.length };
    for (const {stats} of active) {
      const ratio = c.roster[role] ? stats.roleRemaining[role] / c.roster[role] : 0;
      if (ratio >= .5) groups.hungry += 1;
      else if (stats.roleRemaining[role] >= 2) groups.medium += 1;
      else groups.almost += 1;
    }
    return { opponents, rows, active, demand, groups, activeCount:active.length, totalOpponents:rows.length };
  }

  function strategicScore(stats, role, config) {
    const c = makeDefaultConfig(config);
    const needRatio = c.roster[role] ? Math.min(1, stats.roleRemaining[role] / c.roster[role]) : 0;
    const budgetRatio = stats.budgetInitial ? Math.min(1, stats.budgetRemaining / stats.budgetInitial) : 0;
    const maxRatio = stats.budgetInitial ? Math.min(1, stats.maxBid / stats.budgetInitial) : 0;
    return needRatio * .5 + budgetRatio * .25 + maxRatio * .25;
  }

  window.FantaAuction = {
    ROLES,
    makeDefaultConfig,
    totalRosterSlots,
    assignmentBelongsToManager,
    computeManagerStats,
    computeAllManagerStats,
    validateAssignment,
    getCompetitors,
    competitionLevel,
    roleNeedLevel,
    threatLevel,
    opponentManagers,
    computeRoleDemand,
    strategicScore
  };
})();

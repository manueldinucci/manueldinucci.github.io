(() => {
  const APP_FIELDS = [
    { key: 'source_id', label: 'ID listone', required: false, aliases: ['id','id giocatore','codice','codice giocatore'] },
    { key: 'nome', label: 'Nome', required: true, aliases: ['nome','calciatore','giocatore','player'] },
    { key: 'squadra', label: 'Squadra', required: false, aliases: ['squadra','team','club'] },
    { key: 'ruolo', label: 'Ruolo', required: true, aliases: ['r','ruolo','role'] },
    { key: 'ruolo_mantra', label: 'Ruolo Mantra', required: false, aliases: ['rm','mantra','ruolo mantra','ruolomantra'] },
    { key: 'quotazione', label: 'Quotazione attuale', required: false, aliases: ['qt a','qta','quotazione attuale'] },
    { key: 'quotazione_iniziale', label: 'Quotazione iniziale', required: false, aliases: ['qt i','qti','quotazione iniziale','qi'] },
    { key: 'fvm', label: 'FVM', required: false, aliases: ['fvm','fvm m','fvmm','fanta valore mercato'] }
  ];

  function normalizeHeader(value = '') {
    return String(value)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim()
      .replace(/[._-]+/g, ' ')
      .replace(/\s+/g, ' ');
  }

  function makeUniqueHeaders(rawHeaders) {
    const seen = new Map();
    return rawHeaders.map((h, idx) => {
      const base = String(h ?? '').trim() || `Colonna ${idx + 1}`;
      const count = (seen.get(base) || 0) + 1;
      seen.set(base, count);
      return count === 1 ? base : `${base} (${count})`;
    });
  }

  function inferMapping(headers) {
    const normalized = headers.map(h => normalizeHeader(h).replace(/ \(\d+\)$/,''));
    const mapping = {};
    for (const field of APP_FIELDS) {
      let best = -1;
      let bestScore = 0;
      normalized.forEach((h, idx) => {
        let score = 0;
        for (const alias of field.aliases) {
          const a = normalizeHeader(alias);
          if (h === a) score = Math.max(score, 100);
          else if (h.startsWith(a) || a.startsWith(h)) score = Math.max(score, 70);
          else if (h.includes(a)) score = Math.max(score, 50);
        }
        if (score > bestScore) { bestScore = score; best = idx; }
      });
      mapping[field.key] = bestScore >= 50 ? best : null;
    }
    return mapping;
  }

  function detectDelimiter(text) {
    const first = (text.split(/\r?\n/)[0] || '');
    const candidates = [',',';','\t','|'];
    return candidates.map(d => [d, first.split(d).length]).sort((a,b)=>b[1]-a[1])[0][0];
  }

  function parseCSV(text) {
    const delimiter = detectDelimiter(text);
    const rows = [];
    let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') quoted = false;
        else cell += ch;
      } else {
        if (ch === '"') quoted = true;
        else if (ch === delimiter) { row.push(cell); cell = ''; }
        else if (ch === '\n') { row.push(cell.replace(/\r$/,'')); rows.push(row); row = []; cell = ''; }
        else cell += ch;
      }
    }
    if (cell.length || row.length) { row.push(cell.replace(/\r$/,'')); rows.push(row); }
    return rows;
  }

  async function readFileToRows(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'json') {
      const data = JSON.parse(await file.text());
      const arr = Array.isArray(data) ? data : (Array.isArray(data.players) ? data.players : null);
      if (!arr) throw new Error('JSON non riconosciuto: atteso un array di giocatori o { players: [...] }.');
      if (!arr.length) return [];
      const headers = [...new Set(arr.flatMap(obj => Object.keys(obj || {})))];
      return [headers, ...arr.map(obj => headers.map(h => obj?.[h] ?? ''))];
    }
    if (ext === 'csv') return parseCSV(await file.text());
    if (ext === 'xlsx') {
      if (!window.LocalXLSX) throw new Error('Lettore XLSX locale non disponibile.');
      return await window.LocalXLSX.readFirstSheet(file);
    }
    if (ext === 'xls') {
      throw new Error('Il formato .xls binario non è supportato da questa build offline. Esporta il file come .xlsx o .csv.');
    }
    throw new Error('Formato non supportato. Usa .xlsx, .csv o .json.');
  }

  function headerRowScore(row) {
    if (!Array.isArray(row)) return -1;
    const cells = row.map(v => normalizeHeader(v)).filter(Boolean);
    if (!cells.length) return -1;
    let score = 0;
    const exact = new Set(cells);
    const aliases = APP_FIELDS.flatMap(f => f.aliases.map(normalizeHeader));
    for (const cell of cells) {
      if (aliases.includes(cell)) score += 3;
    }
    if (exact.has('nome') || exact.has('calciatore') || exact.has('giocatore')) score += 8;
    if (exact.has('r') || exact.has('ruolo')) score += 7;
    if (exact.has('squadra') || exact.has('team')) score += 4;
    if (exact.has('fvm') || exact.has('fvm m')) score += 4;
    if (exact.has('id')) score += 2;
    return score;
  }

  function detectHeaderRow(rows, maxScan = 25) {
    let bestIndex = 0;
    let bestScore = -1;
    const limit = Math.min(rows.length, maxScan);
    for (let i = 0; i < limit; i++) {
      const score = headerRowScore(rows[i]);
      if (score > bestScore) { bestScore = score; bestIndex = i; }
    }
    return bestScore >= 10 ? bestIndex : 0;
  }

  function rowsToImportModel(rows) {
    const original = rows.filter(r => Array.isArray(r));
    if (original.length < 2) throw new Error('Il file non contiene intestazioni e righe dati sufficienti.');
    const headerRowIndex = detectHeaderRow(original);
    const rawHeaders = original[headerRowIndex] || [];
    const lastHeaderCol = Math.max(0, rawHeaders.reduce((last, v, i) => String(v ?? '').trim() ? i : last, -1));
    const headers = makeUniqueHeaders(rawHeaders.slice(0, lastHeaderCol + 1));
    const dataRows = original.slice(headerRowIndex + 1)
      .filter(r => r.some(v => String(v ?? '').trim() !== ''))
      .map(r => headers.map((_, i) => r[i] ?? ''));
    if (!headers.length || !dataRows.length) throw new Error('Non sono state trovate intestazioni e righe dati valide.');
    return { headers, rows: dataRows, mapping: inferMapping(headers), headerRowIndex };
  }

  function cleanRole(value) {
    const v = String(value ?? '').trim().toUpperCase();
    if (['P','D','C','A'].includes(v)) return v;
    const map = { POR:'P', PORTIERE:'P', DIF:'D', DIFENSORE:'D', CENTROCAMPISTA:'C', CEN:'C', ATT:'A', ATTACCANTE:'A' };
    return map[v] || v.charAt(0);
  }

  function num(value) {
    if (value === '' || value == null) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const cleaned = String(value).trim().replace(/\s/g,'').replace(',', '.').replace(/[^0-9+\-.]/g,'');
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function buildPlayers(headers, rows, mapping) {
    const players = [];
    const issues = [];
    rows.forEach((row, idx) => {
      const get = key => {
        const col = mapping[key];
        return col == null || col === '' ? '' : row[Number(col)];
      };
      const nome = String(get('nome') ?? '').trim();
      const ruolo = cleanRole(get('ruolo'));
      if (!nome && !ruolo) return;
      if (!nome) { issues.push(`Riga ${idx + 2}: nome mancante`); return; }
      if (!['P','D','C','A'].includes(ruolo)) { issues.push(`Riga ${idx + 2}: ruolo non riconosciuto (${get('ruolo') ?? ''})`); return; }
      players.push({
        source_id: String(get('source_id') ?? '').trim(),
        nome,
        squadra: String(get('squadra') ?? '').trim(),
        ruolo,
        ruolo_mantra: String(get('ruolo_mantra') ?? '').trim(),
        quotazione: num(get('quotazione')),
        quotazione_iniziale: num(get('quotazione_iniziale')),
        fvm: num(get('fvm'))
      });
    });
    return { players, issues };
  }

  window.FantaImport = {
    APP_FIELDS,
    normalizeHeader,
    inferMapping,
    detectHeaderRow,
    readFileToRows,
    rowsToImportModel,
    buildPlayers
  };
})();

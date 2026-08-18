/* Minimal offline XLSX reader for standard OOXML workbooks. No network dependency. */
(() => {
  const td = new TextDecoder('utf-8');
  const u16 = (v,o) => v.getUint16(o,true);
  const u32 = (v,o) => v.getUint32(o,true);

  function decodeXml(s='') {
    return String(s)
      .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"')
      .replace(/&apos;/g,"'").replace(/&amp;/g,'&')
      .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
  }

  function attr(tag, name) {
    const re = new RegExp(`\\s${name.replace(':','\\:')}=["']([^"']*)["']`, 'i');
    return (tag.match(re)||[])[1] || '';
  }

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream === 'undefined') throw new Error('DecompressionStream non disponibile.');
    let ds;
    try { ds = new DecompressionStream('deflate-raw'); }
    catch (_) { throw new Error('Il browser non supporta deflate-raw; aggiorna iOS oppure usa CSV/JSON.'); }
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function unzip(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    let eocd = -1;
    const start = Math.max(0, bytes.length - 65557);
    for (let i=bytes.length-22;i>=start;i--) if (u32(view,i)===0x06054b50) { eocd=i; break; }
    if (eocd < 0) throw new Error('File XLSX/ZIP non valido.');
    const entries = u16(view,eocd+10);
    let pos = u32(view,eocd+16);
    const out = new Map();
    for (let i=0;i<entries;i++) {
      if (u32(view,pos)!==0x02014b50) throw new Error('Directory ZIP non valida.');
      const method=u16(view,pos+10), compressedSize=u32(view,pos+20);
      const fileNameLen=u16(view,pos+28), extraLen=u16(view,pos+30), commentLen=u16(view,pos+32);
      const localOffset=u32(view,pos+42);
      const name=td.decode(bytes.subarray(pos+46,pos+46+fileNameLen));
      if (!name.endsWith('/')) {
        if (u32(view,localOffset)!==0x04034b50) throw new Error(`Header ZIP non valido: ${name}`);
        const localNameLen=u16(view,localOffset+26), localExtraLen=u16(view,localOffset+28);
        const dataStart=localOffset+30+localNameLen+localExtraLen;
        const compressed=bytes.subarray(dataStart,dataStart+compressedSize);
        let raw;
        if (method===0) raw=compressed;
        else if (method===8) raw=await inflateRaw(compressed);
        else throw new Error(`Compressione ZIP ${method} non supportata.`);
        out.set(name.replace(/^\//,''),raw);
      }
      pos += 46 + fileNameLen + extraLen + commentLen;
    }
    return out;
  }

  function textEntry(entries,path,optional=false) {
    const raw=entries.get(path);
    if (!raw) { if (optional) return ''; throw new Error(`Elemento XLSX mancante: ${path}`); }
    return td.decode(raw);
  }

  function sharedStrings(entries) {
    const xml=textEntry(entries,'xl/sharedStrings.xml',true);
    if (!xml) return [];
    const out=[]; let m;
    const siRe=/<si\b[^>]*>([\s\S]*?)<\/si>/gi;
    while ((m=siRe.exec(xml))) {
      let value=''; let t;
      const tRe=/<t\b[^>]*>([\s\S]*?)<\/t>/gi;
      while ((t=tRe.exec(m[1]))) value += decodeXml(t[1]);
      out.push(value);
    }
    return out;
  }

  function resolveFirstSheet(entries) {
    const wb=textEntry(entries,'xl/workbook.xml',true);
    const sheetTag=(wb.match(/<sheet\b[^>]*>/i)||[])[0]||'';
    const relId=attr(sheetTag,'r:id');
    if (!relId) return 'xl/worksheets/sheet1.xml';
    const rels=textEntry(entries,'xl/_rels/workbook.xml.rels',true);
    const relTags=rels.match(/<Relationship\b[^>]*\/?\s*>/gi)||[];
    const rel=relTags.find(t=>attr(t,'Id')===relId);
    let target=rel ? attr(rel,'Target') : 'worksheets/sheet1.xml';
    target=target.replace(/^\//,'').replace(/^\.\//,'');
    if (!target.startsWith('xl/')) target=`xl/${target}`;
    return target;
  }

  function colIndex(ref='A1') {
    const letters=(String(ref).match(/[A-Z]+/i)||['A'])[0].toUpperCase();
    let n=0; for (const ch of letters) n=n*26+(ch.charCodeAt(0)-64);
    return n-1;
  }

  function cellValue(cellTag,body,shared) {
    const type=attr(cellTag,'t');
    if (type==='inlineStr') {
      let value=''; let m; const re=/<t\b[^>]*>([\s\S]*?)<\/t>/gi;
      while ((m=re.exec(body))) value += decodeXml(m[1]);
      return value;
    }
    const vm=body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i);
    const raw=vm ? decodeXml(vm[1]) : '';
    if (type==='s') return shared[Number(raw)] ?? '';
    if (type==='b') return raw==='1';
    if (type==='str') return raw;
    if (raw==='') return '';
    const n=Number(raw); return Number.isFinite(n)?n:raw;
  }

  function sheetRows(xml,shared) {
    const rows=[]; let maxCols=0; let rm;
    const rowRe=/<row\b[^>]*>([\s\S]*?)<\/row>/gi;
    while ((rm=rowRe.exec(xml))) {
      const row=[]; let cm;
      const cellRe=/(<c\b[^>]*>)([\s\S]*?)<\/c>/gi;
      while ((cm=cellRe.exec(rm[1]))) {
        const idx=colIndex(attr(cm[1],'r'));
        row[idx]=cellValue(cm[1],cm[2],shared);
        maxCols=Math.max(maxCols,idx+1);
      }
      rows.push(row);
    }
    for (const row of rows) for (let i=0;i<maxCols;i++) if (row[i]===undefined) row[i]='';
    return rows;
  }

  async function readFirstSheet(fileOrBuffer) {
    const buffer=fileOrBuffer instanceof ArrayBuffer ? fileOrBuffer : await fileOrBuffer.arrayBuffer();
    const entries=await unzip(buffer);
    const shared=sharedStrings(entries);
    const sheetPath=resolveFirstSheet(entries);
    return sheetRows(textEntry(entries,sheetPath),shared);
  }

  const api={readFirstSheet,_test:{unzip,sharedStrings,resolveFirstSheet,sheetRows,decodeXml}};
  if (typeof window!=='undefined') window.LocalXLSX=api;
  else if (typeof globalThis!=='undefined') globalThis.LocalXLSX=api;
})();

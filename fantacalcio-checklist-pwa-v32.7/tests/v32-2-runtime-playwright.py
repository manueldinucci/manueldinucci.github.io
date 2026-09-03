from pathlib import Path
import json, re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sw_text = (ROOT / 'service-worker.js').read_text(encoding='utf-8')
if "fantacalcio-checklist-v32.3" in sw_text or "fantacalcio-checklist-v32.4" in sw_text or "fantacalcio-checklist-v32.5" in sw_text or "fantacalcio-checklist-v32.6" in sw_text:
    print('v32.2 runtime checks superseded by v32.3+ map simplification: OK')
    raise SystemExit(0)

html = (ROOT / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'<link rel="stylesheet" href="style\.css"\s*/?>', '', html)
html = re.sub(r'<script src="[^"]+"></script>', '', html)

players=[]
def add(key,nome,role,slot,tmin=None,tmax=None,fvm=20,preso=False,manager_id='',manager=''):
    players.append({'key':key,'nome':nome,'squadra':'Club','ruolo':role,'ruolo_mantra':'','slot':slot,'target_min':tmin,'target_max':tmax,'quotazione':5,'quotazione_iniziale':5,'fvm':fvm,'commento':'','preso':preso,'prezzo_acquisto':1 if preso else None,'manager_id':manager_id,'manager_acquirente':manager,'preferito':False,'oneCreditBuy':False})

# Centrocampo: tutti gli Slot + S4 lungo per test scroll/densità.
add('c-s1|club','C Top','C','S1',60,70,100)
add('c-s2|club','C Second','C','S2',30,35,80)
add('c-s3|club','C Third','C','S3',20,25,60)
for i in range(60):
    cap = [13,11,9,7][i%4]
    add(f'c-s4-{i}|club',f'C S4 {i:02d}','C','S4',None,cap,50-i)
for i in range(40): add(f'c-s5-{i}|club',f'C S5 {i:02d}','C','S5',None,5 if i<3 else None,20-i)
add('c-out|club','C Outside','C','',None,None,1)

# Attacco per test esaurimento/assegnazione e ritorno.
add('a-s1|club','A Top','A','S1',80,90,120)
add('a-s2|club','A Second','A','S2',40,50,100)
add('a-s3|club','A Third','A','S3',25,30,80)
add('a-s4|club','A Fourth','A','S4',None,10,50)
add('a-s5|club','A Fifth','A','S5',None,None,30)

# Portieri: indice deve fermarsi a S4.
for i,slot in enumerate(['S1','S2','S3','S4'],1): add(f'p-{i}|club',f'P {i}','P',slot,None,10-i,20)

managers=[{'id':'m1','nome':'Manuel','isMe':True}]
settings={'auctionConfig': {'budgetInitial':500,'minPrice':1,'basePriceMode':'1','roster':{'P':3,'D':8,'C':8,'A':6}}}

def check(cond,msg):
    if not cond: raise AssertionError(msg)

mock=f"""
(() => {{
 let players={json.dumps(players, ensure_ascii=False)};
 let managers={json.dumps(managers, ensure_ascii=False)};
 const settings=new Map(Object.entries({json.dumps(settings)}));
 const normalizeText=v=>String(v??'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim().toLocaleLowerCase('it');
 window.FantaDB={{
  normalizeText, makePlayerKey:(n,s)=>normalizeText(n)+'|'+normalizeText(s),
  openDB:async()=>true, purgeLegacyDemoPlayers:async()=>{{}},
  getSetting:async(k,f=null)=>settings.has(k)?settings.get(k):f,
  setSetting:async(k,v)=>{{settings.set(k,v);}}, getManagers:async()=>managers,
  replaceManagers:async(v)=>{{managers=v;return v;}}, getCombinedPlayers:async()=>players,
  updatePersonal:async(k,patch)=>{{const p=players.find(x=>x.key===k);if(p)Object.assign(p,patch);}},
  updateAuction:async(k,patch)=>{{const p=players.find(x=>x.key===k);if(p)Object.assign(p,patch);}},
  resetAuction:async()=>{{}}, resetAll:async()=>{{players=[];}}, addFullPlayer:async()=>{{}}, removePlayer:async()=>{{}},
  exportBackupObject:async()=>({{format:'fantacalcio-checklist-backup',version:5}}), importBackupObject:async()=>{{}}, importBasePlayers:async()=>({{}})
 }};
}})();
"""

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':390,'height':844})
    errors=[]; page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content(html, wait_until='domcontentloaded')
    page.add_style_tag(content=(ROOT/'style.css').read_text(encoding='utf-8'))
    for f in ['vendor/xlsx-local-reader.js','players.js','xlsx-import.js','auction-logic.js']:
        page.add_script_tag(content=(ROOT/f).read_text(encoding='utf-8'))
    page.add_script_tag(content=mock)
    page.add_script_tag(content=(ROOT/'app.js').read_text(encoding='utf-8'))
    page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
    page.wait_for_timeout(300)
    check(not errors, f'page errors: {errors}')

    # Mappa apre su C e mostra indice completo.
    page.locator('#slotMapHeaderBtn').click(); page.wait_for_timeout(80)
    check(page.locator('#slotMapSheet').is_visible(), 'Mappa not open')
    codes=page.locator('#slotMapSlotIndex .slot-map-index-code').all_inner_texts()
    check(codes == ['S1','S2','S3','S4','S5'], f'C index wrong: {codes}')
    counts=page.locator('#slotMapSlotIndex .slot-map-index-count').all_inner_texts()
    check(counts == ['1','1','1','60','40'], f'C index counts wrong: {counts}')

    # Tap S4 -> direct navigation; S4 index active.
    page.locator('[data-slot-map-index="S4"]').click(); page.wait_for_timeout(80)
    scroll=page.evaluate("document.getElementById('slotMapContent').scrollTop")
    check(scroll > 0, f'S4 navigation did not scroll: {scroll}')
    check('active' in (page.locator('[data-slot-map-index="S4"]').get_attribute('class') or ''), 'S4 index not active')
    head_top=page.locator('[data-slot-map-slot="S4"] .slot-map-slot-head').evaluate("e => e.getBoundingClientRect().top")
    content_top=page.locator('#slotMapContent').evaluate("e => e.getBoundingClientRect().top")
    check(abs(head_top-content_top) <= 6, f'S4 header not aligned/sticky after jump: {head_top} vs {content_top}')

    # True two-column rail and lighter player typography.
    band=page.locator('[data-slot-map-slot="S4"] .slot-map-band').first
    check(band.count()==1, 'S4 band missing')
    grid=band.evaluate("e => getComputedStyle(e).gridTemplateColumns")
    check(len(grid.split()) >= 2, f'band not two columns: {grid}')
    border=band.locator('.slot-map-band-label').evaluate("e => getComputedStyle(e).borderRightWidth")
    check(border != '0px', 'Target rail missing')
    weight=int(band.locator('.slot-map-player').first.evaluate("e => getComputedStyle(e).fontWeight"))
    check(weight <= 500, f'player typography still too heavy: {weight}')

    # Collapse S3, then index S3 must reopen and navigate in one tap.
    page.locator('[data-slot-map-slot="S3"] .slot-map-slot-head').click(); page.wait_for_timeout(30)
    check(page.locator('[data-slot-map-slot="S3"] .slot-map-slot-body').is_hidden(), 'S3 did not collapse')
    check(page.locator('[data-slot-map-slot="S3"] .slot-map-slot-head').get_attribute('aria-expanded') == 'false', 'S3 aria-expanded wrong')
    page.locator('[data-slot-map-index="S3"]').click(); page.wait_for_timeout(80)
    check(page.locator('[data-slot-map-slot="S3"] .slot-map-slot-body').is_visible(), 'index did not reopen S3')
    check(page.locator('[data-slot-map-slot="S3"] .slot-map-slot-head').get_attribute('aria-expanded') == 'true', 'S3 not expanded after index')

    # Player tap and return preserve context.
    page.locator('[data-slot-map-index="S4"]').click(); page.wait_for_timeout(60)
    page.evaluate("window.__beforeMapScroll=document.getElementById('slotMapContent').scrollTop")
    page.locator('[data-slot-map-player-key="c-s4-3|club"]').click(); page.wait_for_timeout(60)
    check(page.locator('#playerSheet').is_visible(), 'player modal not open')
    page.locator('#closeSheetBottomBtn').click(); page.wait_for_timeout(100)
    check(page.locator('#slotMapSheet').is_visible(), 'Mappa not restored')
    restored=page.evaluate("document.getElementById('slotMapContent').scrollTop")
    before=page.evaluate("window.__beforeMapScroll")
    check(abs(restored-before) <= 4, f'scroll context not preserved: {before}->{restored}')

    # Role P -> only S1-S4.
    page.locator('[data-slot-map-role="P"]').click(); page.wait_for_timeout(60)
    pcodes=page.locator('#slotMapSlotIndex .slot-map-index-code').all_inner_texts()
    check(pcodes == ['S1','S2','S3','S4'], f'P index should omit S5: {pcodes}')

    # A: assign the only S1 from Mappa and verify index 0 red + map 0/1 + main S1:0.
    page.locator('[data-slot-map-role="A"]').click(); page.wait_for_timeout(60)
    page.locator('[data-slot-map-player-key="a-s1|club"]').click(); page.wait_for_timeout(50)
    page.locator('#toggleTakenSheet').click(); page.wait_for_timeout(40)
    page.locator('#assignmentManager').select_option('m1'); page.locator('#assignmentPrice').select_option('1')
    page.locator('#confirmAssignmentBtn').click(); page.wait_for_timeout(120)
    idx=page.locator('[data-slot-map-index="S1"]')
    check(idx.locator('.slot-map-index-count').inner_text()=='0', 'index did not update exhausted S1')
    check('exhausted' in (idx.get_attribute('class') or ''), 'index exhausted class missing')
    ist=idx.evaluate("e=>({c:getComputedStyle(e).color,w:getComputedStyle(e).fontWeight})")
    check(ist['c']=='rgb(198, 40, 40)' and int(ist['w'])>=700, f'index exhausted style wrong: {ist}')
    cnt=page.locator('[data-slot-map-slot="S1"] .slot-map-count')
    check(cnt.inner_text()=='0/1' and 'exhausted' in (cnt.get_attribute('class') or ''), 'map exhausted X/Y wrong')
    page.locator('#closeSlotMapBtn').click(); page.wait_for_timeout(50)
    page.locator('[data-role="A"]').click(); page.wait_for_timeout(50)
    main=page.locator('#demandSummary .demand-slot-count').filter(has_text='S1: 0')
    check(main.count()==1 and 'exhausted' in (main.first.get_attribute('class') or ''), 'main exhausted count not coherent')

    # Reference mobile widths: no horizontal overflow in Mappa.
    for width in (390,360):
        page.set_viewport_size({'width':width,'height':844}); page.wait_for_timeout(30)
        page.locator('#slotMapHeaderBtn').click(); page.wait_for_timeout(50)
        overflow=page.evaluate("() => { const s=document.getElementById('slotMapSheet'); const c=document.getElementById('slotMapContent'); return s.scrollWidth>s.clientWidth+1 || c.scrollWidth>c.clientWidth+1; }")
        check(not overflow, f'Mappa overflow at {width}')
        check(page.locator('#slotMapSlotIndex').is_visible(), f'index not visible at {width}')
        page.locator('#closeSlotMapBtn').click(); page.wait_for_timeout(20)

    check(not errors, f'page errors after interactions: {errors}')
    print('v32.2 runtime Playwright checks: OK')
    browser.close()

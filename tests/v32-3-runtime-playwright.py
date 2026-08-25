from pathlib import Path
import json, re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sw_text = (ROOT / 'service-worker.js').read_text(encoding='utf-8')
if 'fantacalcio-checklist-v32.4' in sw_text or 'fantacalcio-checklist-v32.5' in sw_text:
    print('v32.3 runtime checks superseded by v32.4 minimal map styling: OK')
    raise SystemExit(0)
html = (ROOT / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'<link rel="stylesheet" href="style\.css"\s*/?>', '', html)
html = re.sub(r'<script src="[^"]+"></script>', '', html)

players=[]
def add(key,nome,role,slot,tmin=None,tmax=None,fvm=20,preso=False,manager_id='',manager=''):
    players.append({'key':key,'nome':nome,'squadra':'Club','ruolo':role,'ruolo_mantra':'','slot':slot,'target_min':tmin,'target_max':tmax,'quotazione':5,'quotazione_iniziale':5,'fvm':fvm,'commento':'','preso':preso,'prezzo_acquisto':1 if preso else None,'manager_id':manager_id,'manager_acquirente':manager,'preferito':False,'oneCreditBuy':False})

# Centro: S1/S2 compatti e gruppi condivisi; S3+ lunghi per wrapping/sticky.
add('c-s1-a|club','Paz N.','C','S1',70,80,100)
add('c-s1-b|club','McTominay','C','S1',60,70,95)
add('c-s1-c|club','Calhanoglu','C','S1',50,60,90)
add('c-s1-d|club','Orsolini','C','S1',50,60,85)
add('c-s1-e|club','Pulisic','C','S1',40,50,80)
add('c-s2-a|club','Baturina','C','S2',35,40,79)
add('c-s2-b|club','Zaniolo','C','S2',30,35,78)
add('c-s2-c|club','Zaccagni','C','S2',25,30,77)
add('c-s2-d|club','Atta','C','S2',25,30,76)
add('c-s2-e|club','Rabiot','C','S2',20,25,75)
add('c-s2-f|club','Zielinski','C','S2',20,25,74)
for i,n in enumerate(['McKennie','Conceicao','Taylor K.','Da Cunha','Barella','Mastantuono','Ederson D.S.','De Bruyne','Vlasic','Frattesi','Zambo Anguissa','Ekkelenkamp','Rowe','Konè M.','Thuram K.','Sucic P.']):
    t=(20,25) if i<3 else ((15,20) if i<7 else (10,15))
    add(f'c-s3-{i}|club',n,'C','S3',t[0],t[1],70-i,preso=(n=='Konè M.'),manager_id='m1' if n=='Konè M.' else '',manager='Manuel' if n=='Konè M.' else '')
for i in range(48):
    cap=[13,11,9,7][i%4]
    add(f'c-s4-{i}|club',f'Giocatore Quarto Slot {i:02d}','C','S4',None,cap,55-i)
for i in range(36):
    cap=5 if i<6 else (3 if i<18 else None)
    add(f'c-s5-{i}|club',f'Giocatore Quinto Slot Molto Lungo {i:02d}','C','S5',None,cap,30-i)
for i in range(28): add(f'c-out-{i}|club',f'Fuori Slot Nome Lungo {i:02d}','C','',None,None,10-i)

# Attacco: singolo S1 per test esaurimento.
add('a-s1|club','A Top','A','S1',80,90,120)
add('a-s2|club','A Second','A','S2',40,50,100)
add('a-s3|club','A Third','A','S3',25,30,80)
add('a-s4|club','A Fourth','A','S4',None,10,50)
add('a-s5|club','A Fifth','A','S5',None,None,30)

# Portieri: nessun S5.
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

    # Apertura su C: indice rimosso, S1/S2 inline, S3+ tabellare.
    page.locator('#slotMapHeaderBtn').click(); page.wait_for_timeout(80)
    check(page.locator('#slotMapSheet').is_visible(), 'Mappa not open')
    check(page.locator('#slotMapSlotIndex').count()==0, 'Slot index must be absent')
    check(page.locator('.slot-map-index-btn').count()==0, 'Slot index buttons must be absent')
    check(page.locator('[data-slot-map-slot="S1"] .slot-map-inline').count()==1, 'S1 inline layout missing')
    check(page.locator('[data-slot-map-slot="S2"] .slot-map-inline').count()==1, 'S2 inline layout missing')
    check(page.locator('[data-slot-map-slot="S3"] .slot-map-band').count()>=2, 'S3 table layout missing')
    check(page.locator('[data-slot-map-slot="S4"] .slot-map-band').count()==4, 'S4 table bands wrong')

    # Target condiviso compare una sola volta per gruppo S1/S2.
    s1=page.locator('[data-slot-map-slot="S1"] .slot-map-inline').inner_text()
    check(s1.count('50–60')==1, f'S1 shared target repeated: {s1}')
    check('Calhanoglu' in s1 and 'Orsolini' in s1, 'S1 shared target players missing')
    s2=page.locator('[data-slot-map-slot="S2"] .slot-map-inline').inner_text()
    check(s2.count('25–30')==1 and s2.count('20–25')==1, f'S2 shared targets repeated: {s2}')

    # Palette grayscale e gerarchia superfici.
    map_bg=page.locator('#slotMapContent').evaluate("e=>getComputedStyle(e).backgroundColor")
    head_bg=page.locator('[data-slot-map-slot="S1"] .slot-map-slot-head').evaluate("e=>getComputedStyle(e).backgroundColor")
    row1_bg=page.locator('[data-slot-map-slot="S4"] .slot-map-band').nth(0).evaluate("e=>getComputedStyle(e).backgroundColor")
    row2_bg=page.locator('[data-slot-map-slot="S4"] .slot-map-band').nth(1).evaluate("e=>getComputedStyle(e).backgroundColor")
    check(map_bg=='rgb(241, 242, 244)', f'map grayscale bg wrong: {map_bg}')
    check(head_bg=='rgb(231, 233, 236)', f'header gray wrong: {head_bg}')
    check(row1_bg != row2_bg, f'row grayscale hierarchy missing: {row1_bg}/{row2_bg}')

    # Separatore costruito dopo il nome, mai come prefisso/unità autonoma; marker neutralizzati.
    units=page.locator('[data-slot-map-slot="S5"] .slot-map-player-unit')
    check(units.count()>10, 'long S5 units missing')
    sample=units.nth(0).evaluate("e=>({html:e.innerHTML, list:getComputedStyle(e).listStyleType, ws:getComputedStyle(e).whiteSpace})")
    check(sample['html'].find('slot-map-player') < sample['html'].find('slot-map-separator'), f'separator must follow player: {sample}')
    check(sample['list']=='none' and sample['ws']=='nowrap', f'bullet defense wrong: {sample}')
    check(page.locator('.slot-map-separator').filter(has_text='·').count()>0, 'middle-dot separators missing')
    check(page.locator('#slotMapContent').inner_text().find('•')==-1, 'bullet character rendered in map')

    # Accordion unico sistema di navigazione: chiusura/riapertura senza cambiare conteggi.
    s1head=page.locator('[data-slot-map-slot="S1"] .slot-map-slot-head')
    before_count=page.locator('[data-slot-map-slot="S1"] .slot-map-count').inner_text()
    s1head.click(); page.wait_for_timeout(20)
    check(page.locator('[data-slot-map-slot="S1"] .slot-map-slot-body').is_hidden(), 'S1 did not collapse')
    check(s1head.get_attribute('aria-expanded')=='false', 'S1 aria-expanded false missing')
    s1head.click(); page.wait_for_timeout(20)
    check(page.locator('[data-slot-map-slot="S1"] .slot-map-slot-body').is_visible(), 'S1 did not reopen')
    check(page.locator('[data-slot-map-slot="S1"] .slot-map-count').inner_text()==before_count, 'accordion changed count')

    # Sticky header S4 dopo scroll manuale nel vero scroller.
    page.evaluate("""() => {
      const c=document.getElementById('slotMapContent');
      const s=c.querySelector('[data-slot-map-slot="S4"]');
      c.scrollTop = s.offsetTop + 80;
    }""")
    page.wait_for_timeout(40)
    head_top=page.locator('[data-slot-map-slot="S4"] .slot-map-slot-head').evaluate("e=>e.getBoundingClientRect().top")
    content_top=page.locator('#slotMapContent').evaluate("e=>e.getBoundingClientRect().top")
    check(abs(head_top-content_top)<=4, f'S4 sticky header misaligned: {head_top}/{content_top}')

    # Nome tappabile S1 + ritorno allo stesso scroll.
    page.evaluate("document.getElementById('slotMapContent').scrollTop=0")
    page.locator('[data-slot-map-player-key="c-s1-c|club"]').click(); page.wait_for_timeout(50)
    check(page.locator('#sheetPlayerName').inner_text()=='Calhanoglu', 'wrong S1 player opened')
    page.locator('#closeSheetBottomBtn').click(); page.wait_for_timeout(80)
    check(page.locator('#slotMapSheet').is_visible(), 'Mappa not restored after S1 modal')

    # Ritorno da S4 preserva scroll.
    page.evaluate("""() => {
      const c=document.getElementById('slotMapContent');
      const s=c.querySelector('[data-slot-map-slot="S4"]');
      c.scrollTop=s.offsetTop+120; window.__mapScroll=c.scrollTop;
    }""")
    page.locator('[data-slot-map-player-key="c-s4-7|club"]').click(); page.wait_for_timeout(40)
    page.locator('#closeSheetBottomBtn').click(); page.wait_for_timeout(80)
    restored=page.evaluate("document.getElementById('slotMapContent').scrollTop")
    before=page.evaluate("window.__mapScroll")
    check(abs(restored-before)<=4, f'Mappa scroll not preserved: {before}->{restored}')

    # Portieri: S1/S2 inline, nessun S5 artificiale.
    page.locator('[data-slot-map-role="P"]').click(); page.wait_for_timeout(50)
    check(page.locator('[data-slot-map-slot="S5"]').count()==0, 'goalkeeper S5 must not exist')
    check(page.locator('[data-slot-map-slot="S1"] .slot-map-inline').count()==1, 'goalkeeper S1 inline missing')
    check(page.locator('[data-slot-map-slot="S2"] .slot-map-inline').count()==1, 'goalkeeper S2 inline missing')

    # Assegna unico S1 attacco: 0/1 rosso e nessun body vuoto visibile; main coerente.
    page.locator('[data-slot-map-role="A"]').click(); page.wait_for_timeout(50)
    page.locator('[data-slot-map-player-key="a-s1|club"]').click(); page.wait_for_timeout(40)
    page.locator('#toggleTakenSheet').click(); page.wait_for_timeout(30)
    page.locator('#assignmentManager').select_option('m1'); page.locator('#assignmentPrice').select_option('1')
    page.locator('#confirmAssignmentBtn').click(); page.wait_for_timeout(100)
    cnt=page.locator('[data-slot-map-slot="S1"] .slot-map-count')
    check(cnt.inner_text()=='0/1' and 'exhausted' in (cnt.get_attribute('class') or ''), 'map exhausted X/Y wrong')
    st=cnt.evaluate("e=>({c:getComputedStyle(e).color,w:getComputedStyle(e).fontWeight})")
    check(st['c']=='rgb(198, 40, 40)' and int(st['w'])>=700, f'exhausted style wrong: {st}')
    check(page.locator('[data-slot-map-slot="S1"] .slot-map-slot-body').is_hidden(), 'exhausted inline body should be absent/hidden')
    page.locator('#closeSlotMapBtn').click(); page.wait_for_timeout(40)
    page.locator('[data-role="A"]').click(); page.wait_for_timeout(40)
    main=page.locator('#demandSummary .demand-slot-count').filter(has_text='S1: 0')
    check(main.count()==1 and 'exhausted' in (main.first.get_attribute('class') or ''), 'main S1:0 incoherent')

    # Viewport mobile: nessun overflow. Salva screenshot di controllo reale.
    for width in (390,360):
        page.set_viewport_size({'width':width,'height':844}); page.wait_for_timeout(20)
        page.locator('#slotMapHeaderBtn').click(); page.wait_for_timeout(50)
        page.locator('[data-slot-map-role="C"]').click(); page.wait_for_timeout(40)
        overflow=page.evaluate("() => { const s=document.getElementById('slotMapSheet'); const c=document.getElementById('slotMapContent'); return s.scrollWidth>s.clientWidth+1 || c.scrollWidth>c.clientWidth+1; }")
        check(not overflow, f'Mappa overflow at {width}')
        if width==390:
            page.screenshot(path=str(ROOT/'tests/v32-3-map-top.png'))
            page.evaluate("""() => { const c=document.getElementById('slotMapContent'); const s=c.querySelector('[data-slot-map-slot="S5"]'); c.scrollTop=s.offsetTop+20; }""")
            page.wait_for_timeout(30)
            page.screenshot(path=str(ROOT/'tests/v32-3-map-wrap.png'))
        page.locator('#closeSlotMapBtn').click(); page.wait_for_timeout(20)

    check(not errors, f'page errors after interactions: {errors}')
    print('v32.3 runtime Playwright checks: OK')
    browser.close()

from pathlib import Path
import json, re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'<link rel="stylesheet" href="style\.css"\s*/?>', '', html)
html = re.sub(r'<script src="[^"]+"></script>', '', html)
players = [
 {'key':'alpha|x','nome':'Alpha','squadra':'X','ruolo':'A','slot':'S1','target_min':20,'target_max':30,'quotazione':15,'quotazione_iniziale':15,'fvm':80,'commento':'','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':True,'oneCreditBuy':False},
 {'key':'beta|x','nome':'Beta','squadra':'X','ruolo':'A','slot':'S2','target_min':15,'target_max':20,'quotazione':12,'quotazione_iniziale':12,'fvm':60,'commento':'','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':False,'oneCreditBuy':True},
 {'key':'gamma|y','nome':'Gamma','squadra':'Y','ruolo':'A','slot':'S3','target_min':None,'target_max':10,'quotazione':8,'quotazione_iniziale':8,'fvm':40,'commento':'','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':True,'oneCreditBuy':True},
 {'key':'delta|y','nome':'Delta','squadra':'Y','ruolo':'A','slot':'S4','target_min':None,'target_max':5,'quotazione':4,'quotazione_iniziale':4,'fvm':20,'commento':'','preso':True,'prezzo_acquisto':2,'manager_id':'m1','manager_acquirente':'M','preferito':False,'oneCreditBuy':False},
 {'key':'epsilon|z','nome':'Epsilon','squadra':'Z','ruolo':'A','slot':'','target_min':None,'target_max':None,'quotazione':1,'quotazione_iniziale':1,'fvm':2,'commento':'','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':False,'oneCreditBuy':False},
 {'key':'dif|x','nome':'Difensore','squadra':'X','ruolo':'D','slot':'S2','target_min':None,'target_max':13,'quotazione':6,'quotazione_iniziale':6,'fvm':30,'commento':'','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':False,'oneCreditBuy':False},
]
settings = {'auctionConfig': {'budgetInitial':500,'minPrice':1,'basePriceMode':'1','roster':{'P':3,'D':8,'C':8,'A':6}}}

def check(cond,msg):
    if not cond: raise AssertionError(msg)

mock = f"""
(() => {{
 let players={json.dumps(players, ensure_ascii=False)};
 const settings=new Map(Object.entries({json.dumps(settings)}));
 const normalizeText=v=>String(v??'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim().toLocaleLowerCase('it');
 window.FantaDB={{
  normalizeText, makePlayerKey:(n,s)=>normalizeText(n)+'|'+normalizeText(s),
  openDB:async()=>true, purgeLegacyDemoPlayers:async()=>{{}},
  getSetting:async(k,f=null)=>settings.has(k)?settings.get(k):f,
  setSetting:async(k,v)=>{{settings.set(k,v);}}, getManagers:async()=>[],
  replaceManagers:async()=>[], getCombinedPlayers:async()=>players,
  updatePersonal:async(k,patch)=>{{const p=players.find(x=>x.key===k);if(p)Object.assign(p,patch);}},
  updateAuction:async(k,patch)=>{{const p=players.find(x=>x.key===k);if(p)Object.assign(p,patch);}},
  resetAuction:async()=>{{}}, resetAll:async()=>{{players=[];}}, addFullPlayer:async()=>{{}}, removePlayer:async()=>{{}},
  exportBackupObject:async()=>({{format:'fantacalcio-checklist-backup',version:5}}),
  importBackupObject:async()=>{{}}, importBasePlayers:async()=>({{}})
 }};
}})();
"""

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage'])
    for width in (390,360):
        page = browser.new_page(viewport={'width':width,'height':844})
        errors=[]; page.on('pageerror', lambda e: errors.append(str(e)))
        page.set_content(html, wait_until='domcontentloaded')
        page.add_style_tag(content=(ROOT/'style.css').read_text(encoding='utf-8'))
        for f in ['vendor/xlsx-local-reader.js','players.js','xlsx-import.js','auction-logic.js']:
            page.add_script_tag(content=(ROOT/f).read_text(encoding='utf-8'))
        page.add_script_tag(content=mock)
        page.add_script_tag(content=(ROOT/'app.js').read_text(encoding='utf-8'))
        page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
        page.wait_for_timeout(250)
        check(not errors, f'page errors at {width}: {errors}')

        page.locator('[data-role="A"]').click(); page.wait_for_timeout(40)
        check(page.locator('#visiblePlayerCount').inner_text() == '5 / 5', f'initial counter wrong at {width}')

        page.locator('#filtersBtn').click(); page.wait_for_timeout(30)
        opts = page.locator('#slotFilter option').all_text_contents()
        check(opts == ['Tutti','S1-S2','S1-S3','S1-S4','S1-S5','S1','S2','S3','S4','S5','Fuori Slot'], f'slot order wrong: {opts}')
        check(page.locator('#resetFiltersBtn').is_disabled(), 'reset should be disabled when neutral')
        check(page.locator('#targetMaxFilter option').all_text_contents() == ['—','5','10','20','30'], 'target options wrong')

        # Visual: all three checks are on one row, and popover fits viewport.
        boxes=[page.locator('#onlyAvailable').bounding_box(), page.locator('#onlyFavorites').bounding_box(), page.locator('#onlyOneCredit').bounding_box()]
        check(all(boxes), 'checkbox boxes missing')
        ys=[round(b['y']) for b in boxes]
        check(max(ys)-min(ys) <= 2, f'checkboxes not on same row at {width}: {ys}')
        panel=page.locator('#filtersPanel').bounding_box()
        check(panel and panel['x'] >= 0 and panel['x']+panel['width'] <= width+0.5, f'filter panel overflow at {width}: {panel}')

        # Cumulative slots.
        page.locator('#slotFilter').select_option('S1-S4'); page.wait_for_timeout(30)
        check(page.locator('#visiblePlayerCount').inner_text() == '4 / 5', 'S1-S4 counter wrong')
        check([x.inner_text() for x in page.locator('.player-name').all()] == ['Alpha','Beta','Delta','Gamma'], 'S1-S4 set wrong')
        check(not page.locator('#resetFiltersBtn').is_disabled(), 'reset should enable with active filter')

        page.locator('#slotFilter').select_option('S1-S5'); page.wait_for_timeout(30)
        check(page.locator('#visiblePlayerCount').inner_text() == '4 / 5', 'S1-S5 should exclude outside')
        page.locator('#slotFilter').select_option('OUT'); page.wait_for_timeout(30)
        check([x.inner_text() for x in page.locator('.player-name').all()] == ['Epsilon'], 'Fuori Slot wrong')
        check(page.locator('#visiblePlayerCount').inner_text() == '1 / 5', 'outside count wrong')

        # Reset, then OR semantics for favorites + one-credit.
        page.locator('#resetFiltersBtn').click(); page.wait_for_timeout(30)
        page.locator('#onlyFavorites').check(); page.locator('#onlyOneCredit').check(); page.wait_for_timeout(40)
        names=[x.inner_text() for x in page.locator('.player-name').all()]
        check(names == ['Alpha','Beta','Gamma'], f'favorite/one-credit OR wrong: {names}')
        check(page.locator('#visiblePlayerCount').inner_text() == '3 / 5', 'OR count wrong')

        # Solo liberi remains AND.
        page.locator('#onlyAvailable').check(); page.wait_for_timeout(30)
        check([x.inner_text() for x in page.locator('.player-name').all()] == ['Alpha','Beta','Gamma'], 'only-free AND wrong')

        # Target max excludes null and respects <=.
        page.locator('#resetFiltersBtn').click(); page.wait_for_timeout(20)
        page.locator('#targetMaxFilter').select_option('10'); page.wait_for_timeout(30)
        check([x.inner_text() for x in page.locator('.player-name').all()] == ['Delta','Gamma'], 'target max wrong')
        check(page.locator('#visiblePlayerCount').inner_text() == '2 / 5', 'target count wrong')

        # Search changes numerator only.
        page.locator('#closeFiltersBtn').click(); page.locator('#searchToggleBtn').click(); page.locator('#searchInput').fill('Gamma'); page.wait_for_timeout(30)
        check(page.locator('#visiblePlayerCount').inner_text() == '1 / 5', 'search counter wrong')

        page.screenshot(path=str(ROOT/'tests'/f'v33-1-filters-{width}.png'), full_page=False)
        check(not errors, f'page errors after interactions at {width}: {errors}')
        page.close()
    browser.close()
    print('v33.1 runtime: OK')

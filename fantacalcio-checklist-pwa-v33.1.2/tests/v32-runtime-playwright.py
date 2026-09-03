from pathlib import Path
import json, re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'<link rel="stylesheet" href="style\.css"\s*/?>', '', html)
html = re.sub(r'<script src="[^"]+"></script>', '', html)
players = [
 {'key':'frigan|parma','nome':'Frigan','squadra':'Parma','ruolo':'A','ruolo_mantra':'A','slot':'S4','target_min':None,'target_max':10,'quotazione':5,'quotazione_iniziale':5,'fvm':10,'commento':'Test Frigan','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':False,'oneCreditBuy':False},
 {'key':'boga|juventus','nome':'Boga','squadra':'Juventus','ruolo':'A','ruolo_mantra':'W;A','slot':'S5','target_min':None,'target_max':None,'quotazione':6,'quotazione_iniziale':6,'fvm':26,'commento':'Test Boga','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':False,'oneCreditBuy':True},
 {'key':'adams|venezia','nome':'Adams','squadra':'Venezia','ruolo':'A','ruolo_mantra':'Pc','slot':'S4','target_min':15,'target_max':20,'quotazione':12,'quotazione_iniziale':12,'fvm':45,'commento':'No marker','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':False,'oneCreditBuy':False},
 {'key':'gila|milan','nome':'Gila','squadra':'Milan','ruolo':'D','ruolo_mantra':'Dc','slot':'S4','target_min':None,'target_max':5,'quotazione':12,'quotazione_iniziale':12,'fvm':31,'commento':'Difesa marker','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':False,'oneCreditBuy':True}
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
  exportBackupObject:async()=>({{format:'fantacalcio-checklist-backup',version:5,playersPersonal:players.map(p=>({{key:p.key,oneCreditBuy:!!p.oneCreditBuy}}))}}),
  importBackupObject:async()=>{{}}, importBasePlayers:async()=>({{}})
 }};
}})();
"""

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage'])
    page = browser.new_page(viewport={'width':390,'height':844})
    errors=[]; page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content(html, wait_until='domcontentloaded')
    page.add_style_tag(content=(ROOT/'style.css').read_text(encoding='utf-8'))
    for f in ['vendor/xlsx-local-reader.js','players.js','xlsx-import.js','auction-logic.js']:
        page.add_script_tag(content=(ROOT/f).read_text(encoding='utf-8'))
    page.add_script_tag(content=mock)
    page.add_script_tag(content=(ROOT/'app.js').read_text(encoding='utf-8'))
    page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
    page.wait_for_timeout(250)
    check(not errors, f'page errors: {errors}')

    page.locator('[data-role="A"]').click(); page.wait_for_timeout(30)
    boga = page.locator('.player-card').filter(has_text='Boga').first
    frigan = page.locator('.player-card').filter(has_text='Frigan').first
    check(boga.locator('.one-credit-badge').inner_text() in ('(1)','1'), 'existing marker not rendered')
    check(frigan.locator('.one-credit-badge').count() == 0, 'false marker rendered')

    frigan.locator('.player-main').click(); page.wait_for_timeout(20)
    if page.locator('#toggleOneCreditSheet').count():
        check(page.locator('#toggleOneCreditSheet').get_attribute('aria-pressed') == 'false', 'editor false state wrong')
        page.locator('#toggleOneCreditSheet').click(); page.wait_for_timeout(100)
        check(page.locator('#toggleOneCreditSheet').get_attribute('aria-pressed') == 'true', 'one-credit quick toggle failed')
    else:
        check(not page.locator('#editOneCreditBuy').is_checked(), 'editor false state wrong')
        page.locator('#editOneCreditBuy').check(); page.wait_for_timeout(260)
        check(page.locator('#sheetOneCreditBadge').is_visible(), 'modal marker not updated')
    page.locator('#closeSheetBottomBtn').click(); page.wait_for_timeout(20)
    frigan = page.locator('.player-card').filter(has_text='Frigan').first
    check(frigan.locator('.one-credit-badge').inner_text() in ('(1)','1'), 'card marker not persisted after edit')

    # Preferito is independent.
    frigan.locator('.fav-btn').click(); page.wait_for_timeout(40)
    check(frigan.locator('.one-credit-badge').inner_text() in ('(1)','1'), 'favorite changed one-credit state')

    # Filter only (1), combined with technical sort. S4 before S5; non-marked excluded.
    page.locator('#filtersBtn').click(); page.locator('#onlyOneCredit').check(); page.wait_for_timeout(40)
    page.locator('#closeFiltersBtn').click(); page.locator('#sortBtn').click(); page.locator('#sortMode').select_option('slot'); page.locator('#closeSortBtn').click(); page.wait_for_timeout(40)
    names = [x.inner_text() for x in page.locator('.player-card .player-name').all()]
    check(names == ['Frigan','Boga'], f'one-credit filter/sort wrong: {names}')

    # Role remains an AND condition.
    page.locator('[data-role="D"]').click(); page.wait_for_timeout(30)
    names = [x.inner_text() for x in page.locator('.player-card .player-name').all()]
    check(names == ['Gila'], f'role + one-credit filter wrong: {names}')

    # Reset removes filter; toolbar remains exactly 5 controls.
    page.locator('#filtersBtn').click(); page.locator('#resetFiltersBtn').click(); page.wait_for_timeout(30)
    check(not page.locator('#onlyOneCredit').is_checked(), 'reset did not clear one-credit filter')
    check(page.locator('.header-actions > button').count() == 5, 'toolbar changed')

    for width in (390,360):
        page.set_viewport_size({'width':width,'height':844}); page.wait_for_timeout(20)
        page.locator('[data-role="A"]').click(); page.wait_for_timeout(20)
        check(not page.evaluate("() => {const e=document.querySelector('#playerList'); return e.scrollWidth > e.clientWidth + 1}"), f'player list overflow at {width}')

    check(not errors, f'page errors after interactions: {errors}')
    print('v32 runtime Playwright checks: OK')
    browser.close()

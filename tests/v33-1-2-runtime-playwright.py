from pathlib import Path
import json, re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'<link rel="stylesheet" href="style\.css"\s*/?>', '', html)
html = re.sub(r'<script src="[^"]+"></script>', '', html)
players = [
 {'key':'alpha|x','nome':'Alpha','squadra':'X','ruolo':'A','slot':'S1','target_min':20,'target_max':30,'quotazione':15,'quotazione_iniziale':15,'fvm':80,'commento':'','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':True,'oneCreditBuy':True},
 {'key':'beta|x','nome':'Beta','squadra':'X','ruolo':'A','slot':'S2','target_min':15,'target_max':20,'quotazione':12,'quotazione_iniziale':12,'fvm':60,'commento':'','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':True,'oneCreditBuy':False},
 {'key':'gamma|y','nome':'Gamma','squadra':'Y','ruolo':'A','slot':'S3','target_min':None,'target_max':10,'quotazione':8,'quotazione_iniziale':8,'fvm':40,'commento':'','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':False,'oneCreditBuy':True},
 {'key':'delta|y','nome':'Delta','squadra':'Y','ruolo':'A','slot':'S4','target_min':None,'target_max':5,'quotazione':4,'quotazione_iniziale':4,'fvm':20,'commento':'','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':True,'oneCreditBuy':False},
 {'key':'mine1|z','nome':'Mine1','squadra':'Z','ruolo':'A','slot':'S5','target_min':None,'target_max':None,'quotazione':1,'quotazione_iniziale':1,'fvm':2,'commento':'','preso':True,'prezzo_acquisto':1,'manager_id':'me','manager_acquirente':'Io','preferito':False,'oneCreditBuy':False},
 {'key':'mine2|z','nome':'Mine2','squadra':'Z','ruolo':'A','slot':'S5','target_min':None,'target_max':None,'quotazione':1,'quotazione_iniziale':1,'fvm':2,'commento':'','preso':True,'prezzo_acquisto':1,'manager_id':'me','manager_acquirente':'Io','preferito':False,'oneCreditBuy':False},
 {'key':'takenfav|z','nome':'TakenFav','squadra':'Z','ruolo':'A','slot':'S2','target_min':None,'target_max':30,'quotazione':10,'quotazione_iniziale':10,'fvm':50,'commento':'','preso':True,'prezzo_acquisto':10,'manager_id':'opp','manager_acquirente':'Rivale','preferito':True,'oneCreditBuy':False},
]
managers = [
 {'id':'me','nome':'Io','budget':500,'isMe':True},
 {'id':'opp','nome':'Rivale','budget':500,'isMe':False},
]
settings = {'auctionConfig': {'budgetInitial':500,'minPrice':1,'basePriceMode':'1','roster':{'P':3,'D':8,'C':8,'A':6}}}

def check(cond,msg):
    if not cond: raise AssertionError(msg)

mock = f"""
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
  replaceManagers:async(v)=>{{managers=v;}}, getCombinedPlayers:async()=>players,
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
        page.wait_for_timeout(300)
        check(not errors, f'page errors at {width}: {errors}')

        page.locator('[data-role="A"]').click(); page.wait_for_timeout(60)
        monitor = page.locator('#demandSummary .demand-primary')
        text = monitor.inner_text()
        # Four free roster spots (2 of 6 ours), three free favourites => red alert.
        check('★: 3' in text, f'favorite monitor count wrong: {text!r}')
        check('S1: 1' in text and 'S2: 1' in text and 'S3: 1' in text, f'S1-S3 counts wrong: {text!r}')
        check('S4:' not in text and 'S5:' not in text, f'S4/S5 leaked into monitor: {text!r}')
        fav = page.locator('.demand-favorite-count')
        check('alert' in (fav.get_attribute('class') or ''), 'favorite monitor should alert when 3 < 4')
        check(page.evaluate("getComputedStyle(document.querySelector('.demand-favorite-count')).color") == 'rgb(198, 40, 40)', 'favorite alert red wrong')
        primary_box = monitor.bounding_box()
        check(primary_box and primary_box['height'] < 22, f'monitor row too tall at {width}: {primary_box}')

        # Filtering must not alter the market-wide favourite monitor.
        page.locator('#filtersBtn').click(); page.locator('#slotFilter').select_option('S1-S2'); page.wait_for_timeout(40)
        check('★: 3' in page.locator('#demandSummary .demand-primary').inner_text(), 'favorite monitor must ignore visual filters')
        page.locator('#closeFiltersBtn').click()
        page.screenshot(path=str(ROOT/'tests'/f'v33-1-2-monitor-{width}.png'), full_page=False)

        # Map: one-credit markers appear only where active and stay micro-sized.
        page.locator('#slotMapHeaderBtn').click(); page.wait_for_timeout(120)
        map_text = page.locator('#slotMapContent').inner_text()
        check('Alpha(1)' in map_text.replace(' ', '') or 'Alpha (1)' in map_text, f'Alpha (1) missing: {map_text!r}')
        check('Gamma(1)' in map_text.replace(' ', '') or 'Gamma (1)' in map_text, 'Gamma (1) missing')
        check('(1)' not in page.locator('[data-slot-map-player-key="beta|x"]').inner_text(), 'Beta must not show (1)')
        marker = page.locator('[data-slot-map-player-key="alpha|x"] .slot-map-one-credit')
        check(marker.count() == 1 and marker.inner_text() == '(1)', 'map marker markup wrong')
        alpha_player = page.locator('[data-slot-map-player-key="alpha|x"]')
        name_size = float(alpha_player.evaluate("el => parseFloat(getComputedStyle(el).fontSize)"))
        marker_size = float(marker.evaluate("el => parseFloat(getComputedStyle(el).fontSize)"))
        check(marker_size < name_size * .8, f'marker not sufficiently small: {marker_size} vs {name_size}')
        unit_box = page.locator('[data-slot-map-player-key="alpha|x"]').bounding_box()
        marker_box = marker.bounding_box()
        check(unit_box and marker_box and marker_box['y'] >= unit_box['y']-2 and marker_box['y']+marker_box['height'] <= unit_box['y']+unit_box['height']+2, 'marker baseline/height wrong')

        page.screenshot(path=str(ROOT/'tests'/f'v33-1-2-map-monitor-{width}.png'), full_page=False)
        check(not errors, f'page errors after interactions at {width}: {errors}')
        page.close()
    browser.close()
    print('v33.1.2 runtime: OK')

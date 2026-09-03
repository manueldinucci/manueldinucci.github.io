from pathlib import Path
import json, re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'<link rel="stylesheet" href="style\.css"\s*/?>', '', html)
html = re.sub(r'<script src="[^"]+"></script>', '', html)

players = [
 {'key':'top|x','nome':'Top','squadra':'X','ruolo':'C','slot':'S1','target_min':60,'target_max':70,'quotazione':25,'quotazione_iniziale':25,'fvm':100,'commento':'','preso':True,'prezzo_acquisto':50,'manager_id':'m1','manager_acquirente':'Camillo','preferito':False,'oneCreditBuy':False},
 {'key':'mid|x','nome':'Mid','squadra':'X','ruolo':'C','slot':'S2','target_min':20,'target_max':25,'quotazione':12,'quotazione_iniziale':12,'fvm':55,'commento':'','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':True,'oneCreditBuy':False},
 {'key':'low|y','nome':'Low','squadra':'Y','ruolo':'C','slot':'S3','target_min':None,'target_max':15,'quotazione':7,'quotazione_iniziale':7,'fvm':30,'commento':'','preso':True,'prezzo_acquisto':10,'manager_id':'m2','manager_acquirente':'Anto','preferito':False,'oneCreditBuy':True},
 {'key':'att|y','nome':'Att','squadra':'Y','ruolo':'A','slot':'S4','target_min':None,'target_max':10,'quotazione':5,'quotazione_iniziale':5,'fvm':20,'commento':'','preso':True,'prezzo_acquisto':5,'manager_id':'m1','manager_acquirente':'Camillo','preferito':False,'oneCreditBuy':False},
]
managers = [
 {'id':'m1','nome':'Camillo','teamName':'AS Paragi','budgetInitial':500,'isMe':False},
 {'id':'m2','nome':'Anto','teamName':'Hortomuso','budgetInitial':500,'isMe':False},
]
settings = {
 'auctionConfig': {'budgetInitial':500,'minPrice':1,'basePriceMode':'1','roster':{'P':3,'D':8,'C':8,'A':6}},
 'uiState': {'role':'C','startLetter':'M','sortMode':'alpha','showAll':False,'search':'','team':'','slot':'','minFvm':'','minQta':'','targetMax':'','onlyAvailable':False,'onlyFavorites':False,'onlyOneCredit':False,'commentsVisible':True,'participantsVisible':True,'emphasis':65,'mainView':'players'},
 'creditAdjustments': {}
}

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
  updateAuctionAndSetting:async(k,patch,sk,sv)=>{{const p=players.find(x=>x.key===k);if(p)Object.assign(p,patch);settings.set(sk,sv);}},
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

        # Rose + credit modal.
        page.locator('[data-view="rose"]').click(); page.wait_for_timeout(80)
        check(page.locator('#viewSheet').is_visible(), 'Rose sheet not visible')
        camillo = page.locator('.rose-manager[data-manager-id="m1"]')
        check(camillo.is_visible(), 'Camillo card missing')
        initial_credit = camillo.locator('.rose-credit-value').inner_text()
        check(initial_credit == '445', f'initial credit expected 445 got {initial_credit}')
        camillo.locator('.rose-credit-add').click(); page.wait_for_timeout(50)
        check(page.locator('#creditSheet').is_visible(), 'credit modal did not open')
        check(page.locator('#viewSheet').is_visible(), 'Rose should remain under credit modal')
        check(page.locator('#creditSheetTitle').inner_text() == 'Crediti — Camillo', 'credit modal title wrong')
        page.screenshot(path=str(ROOT/'tests'/f'v33-2-credit-{width}.png'), full_page=False)
        inp=page.locator('#creditAmountInput')
        box=inp.bounding_box(); check(box and box['width'] > 280 if width==390 else box and box['width'] > 250, f'credit input too narrow {box}')
        inp.fill('10'); page.wait_for_timeout(20)
        check(page.locator('#creditNewBalance').inner_text() == '455', 'credit preview wrong')
        page.locator('#confirmCreditBtn').click(); page.wait_for_timeout(80)
        check(page.locator('.rose-manager[data-manager-id="m1"] .rose-credit-value').inner_text() == '455', 'credit adjustment not reflected in Rose')

        # Player token opens same player sheet above Rose and closes back to Rose.
        token=page.locator('.rose-manager[data-manager-id="m1"] [data-rose-player-key="top|x"]')
        check(token.is_visible(), 'Rose player token missing')
        token.click(); page.wait_for_timeout(60)
        check(page.locator('#playerSheet').is_visible(), 'player modal did not open from Rose')
        check(page.locator('#sheetPlayerName').inner_text() == 'Top', 'wrong player opened from Rose')
        check(page.locator('#viewSheet').is_visible(), 'Rose should stay present under player modal')
        page.locator('#toggleTakenSheet').click(); page.wait_for_timeout(50)
        check(page.locator('#unassignSheet').is_visible(), 'unassign sheet did not open above Rose/player')
        page.screenshot(path=str(ROOT/'tests'/f'v33-2-unassign-{width}.png'), full_page=False)
        page.locator('#cancelUnassignBtn').click(); page.wait_for_timeout(40)
        check(page.locator('#playerSheet').is_visible(), 'cancel unassign should return to player modal')
        page.locator('#closeSheetBtn').click(); page.wait_for_timeout(60)
        check(page.locator('#viewSheet').is_visible(), 'Rose not restored after player close')
        check(not page.locator('#playerSheet').is_visible(), 'player modal still visible after close')

        # Map: S1 is 0/1 and must open/close normally.
        page.locator('#closeViewSheetBtn').click(); page.wait_for_timeout(40)
        page.locator('#slotMapHeaderBtn').click(); page.wait_for_timeout(80)
        s1=page.locator('#slotMapSlot-S1')
        count=s1.locator('.slot-map-count').inner_text()
        check(count == '0/1', f'S1 count expected 0/1 got {count}')
        head=s1.locator('[data-slot-map-toggle="S1"]')
        check(head.count()==1, '0/X slot header is not interactive')
        # Default S1 is open; verify assigned player is visible, then close/reopen.
        check(s1.locator('[data-slot-map-player-key="top|x"]').is_visible(), 'assigned player missing from exhausted slot')
        head.click(); page.wait_for_timeout(25)
        check(s1.locator('.slot-map-slot-body').is_hidden(), '0/X slot did not collapse')
        head.click(); page.wait_for_timeout(25)
        check(s1.locator('[data-slot-map-player-key="top|x"]').is_visible(), '0/X slot did not reopen')
        check(not errors, f'errors after interactions at {width}: {errors}')
        page.screenshot(path=str(ROOT/'tests'/f'v33-2-rose-map-{width}.png'), full_page=False)
        page.close()
    browser.close()
    print('v33.2 runtime: OK')

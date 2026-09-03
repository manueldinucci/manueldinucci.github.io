from pathlib import Path
import json, re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
IS_V323 = 'fantacalcio-checklist-v32.3' in (ROOT / 'service-worker.js').read_text(encoding='utf-8')
html = (ROOT / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'<link rel="stylesheet" href="style\.css"\s*/?>', '', html)
html = re.sub(r'<script src="[^"]+"></script>', '', html)

players = [
 {'key':'topone|roma','nome':'TopOne','squadra':'Roma','ruolo':'A','ruolo_mantra':'Pc','slot':'S1','target_min':80,'target_max':90,'quotazione':25,'quotazione_iniziale':25,'fvm':180,'commento':'Top','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':False,'oneCreditBuy':True},
 {'key':'secondo|milan','nome':'Secondo','squadra':'Milan','ruolo':'A','ruolo_mantra':'Pc','slot':'S2','target_min':40,'target_max':50,'quotazione':18,'quotazione_iniziale':18,'fvm':100,'commento':'S2','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':False,'oneCreditBuy':False},
 {'key':'terzo|inter','nome':'Terzo','squadra':'Inter','ruolo':'A','ruolo_mantra':'Pc','slot':'S3','target_min':25,'target_max':30,'quotazione':14,'quotazione_iniziale':14,'fvm':70,'commento':'S3','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':False,'oneCreditBuy':False},
 {'key':'frigan|parma','nome':'Frigan','squadra':'Parma','ruolo':'A','ruolo_mantra':'A','slot':'S4','target_min':None,'target_max':10,'quotazione':5,'quotazione_iniziale':5,'fvm':10,'commento':'Test Frigan','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':False,'oneCreditBuy':False},
 {'key':'s4taken|lecce','nome':'S4 Preso','squadra':'Lecce','ruolo':'A','ruolo_mantra':'Pc','slot':'S4','target_min':10,'target_max':15,'quotazione':7,'quotazione_iniziale':7,'fvm':30,'commento':'Taken','preso':True,'prezzo_acquisto':2,'manager_id':'m1','manager_acquirente':'Manuel','preferito':False,'oneCreditBuy':False},
 {'key':'boga|juventus','nome':'Boga','squadra':'Juventus','ruolo':'A','ruolo_mantra':'W;A','slot':'S5','target_min':None,'target_max':None,'quotazione':6,'quotazione_iniziale':6,'fvm':26,'commento':'Test Boga','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':False,'oneCreditBuy':True},
]
for i in range(1, 19):
    players.append({'key':f's4extra{i}|club{i}','nome':f'S4 Extra {i:02d}','squadra':f'Club{i}','ruolo':'A','ruolo_mantra':'Pc','slot':'S4','target_min':10 if i%2 else 15,'target_max':15 if i%2 else 20,'quotazione':5+i%4,'quotazione_iniziale':5+i%4,'fvm':20+i,'commento':'Extra','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':False,'oneCreditBuy':False})
players.append({'key':'outside|venezia','nome':'Outside','squadra':'Venezia','ruolo':'A','ruolo_mantra':'Pc','slot':'','target_min':None,'target_max':None,'quotazione':1,'quotazione_iniziale':1,'fvm':1,'commento':'','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':False,'oneCreditBuy':False})

managers = [{'id':'m1','nome':'Manuel','isMe':True}]
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
  replaceManagers:async(v)=>{{managers=v;return v;}}, getCombinedPlayers:async()=>players,
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
    page.wait_for_timeout(300)
    check(not errors, f'page errors: {errors}')

    # Main A view and Slot→1→Target order.
    page.locator('[data-role="A"]').click(); page.wait_for_timeout(40)
    top = page.locator('.player-card').filter(has_text='TopOne').first
    meta_classes = page.evaluate("""() => Array.from([...document.querySelectorAll('.player-card')].find(x=>x.innerText.includes('TopOne')).querySelector('.player-primary-meta').children).map(x=>x.className)""")
    check(meta_classes == ['player-slot-badge','one-credit-badge','player-target-pill'], f'badge order wrong: {meta_classes}')
    check(top.locator('.one-credit-badge').inner_text() == '1', 'plain 1 badge missing')
    check(page.locator('#editOneCreditBuy').count() == 0, 'legacy checkbox still present')

    # Demand counts reflect real market, not search filter.
    s1 = page.locator('#demandSummary .demand-slot-count').filter(has_text='S1: 1')
    check(s1.count() == 1 and 'exhausted' not in (s1.first.get_attribute('class') or ''), 'initial S1 count wrong')
    page.locator('#searchToggleBtn').click(); page.locator('#searchInput').fill('ZZZZZ'); page.wait_for_timeout(50)
    s1 = page.locator('#demandSummary .demand-slot-count').filter(has_text='S1: 1')
    check(s1.count() == 1 and 'exhausted' not in (s1.first.get_attribute('class') or ''), 'search incorrectly changed market Slot count')
    page.locator('#searchInput').fill(''); page.wait_for_timeout(50)

    # Mappa cleanup and sticky header.
    page.locator('#slotMapHeaderBtn').click(); page.wait_for_timeout(60)
    check(page.locator('#slotMapSheet').is_visible(), 'Mappa not open')
    check('disponibili' not in page.locator('#slotMapContent').inner_text(), 'word disponibili remains in Mappa')
    check(page.locator('.slot-map-progress').count() == 0, 'progress bar remains in Mappa')
    check(page.locator('.slot-map-band').count() > 0, 'compact bands missing')
    bg = page.locator('.slot-map-band').first.evaluate("e => getComputedStyle(e).backgroundColor")
    check(bg in (('rgb(243, 244, 245)','rgb(247, 247, 248)') if IS_V323 else ('rgba(0, 0, 0, 0)','transparent')), f'band surface unexpected: {bg}')
    pos = page.locator('.slot-map-slot-head').first.evaluate("e => getComputedStyle(e).position")
    check(pos == 'sticky', f'Slot header not sticky: {pos}')
    check(page.locator('.slot-map-slot-head').filter(has_text='4° SLOT').locator('.slot-map-count').inner_text() == '19/20', 'X/Y semantics wrong')
    check(page.locator('.slot-map-player').filter(has_text='Frigan').count() == 1, 'Mappa player name not rendered as tappable control')

    # Open a player from deep in Mappa, toggle 1 + favorite, return to same role/scroll.
    page.evaluate("""() => { const c=document.getElementById('slotMapContent'); c.scrollTop=Math.min(180, c.scrollHeight-c.clientHeight); window.__slotScroll=c.scrollTop; document.querySelector('[data-slot-map-player-key="frigan|parma"]').click(); }""")
    page.wait_for_timeout(80)
    check(page.locator('#playerSheet').is_visible(), 'player modal did not open from Mappa')
    action_ids = page.evaluate("() => Array.from(document.querySelector('.player-bottom-actions').children).map(x=>x.id)")
    check(action_ids == ['toggleTakenSheet','toggleOneCreditSheet','toggleFavoriteSheet','closeSheetBottomBtn'], f'action order wrong: {action_ids}')
    check(page.locator('#toggleOneCreditSheet').get_attribute('aria-pressed') == 'false', 'initial 1 state wrong')
    page.locator('#toggleOneCreditSheet').click(); page.wait_for_timeout(60)
    check(page.locator('#toggleOneCreditSheet').get_attribute('aria-pressed') == 'true', '1 quick toggle failed')
    page.locator('#toggleFavoriteSheet').click(); page.wait_for_timeout(60)
    check(page.locator('#toggleOneCreditSheet').get_attribute('aria-pressed') == 'true', 'favorite altered 1 state')
    page.locator('#closeSheetBottomBtn').click(); page.wait_for_timeout(100)
    check(page.locator('#slotMapSheet').is_visible(), 'Mappa not restored after player close')
    check(page.locator('#slotMapRoleTabs .active').inner_text() == 'Att', 'Mappa role not restored')
    restored = page.evaluate("document.getElementById('slotMapContent').scrollTop")
    original = page.evaluate("window.__slotScroll")
    check(abs(restored-original) <= 3, f'Mappa scroll not restored: {original} -> {restored}')

    # Assign the last S1 from Mappa and verify 0/1 + main S1:0 red/bold.
    page.evaluate("document.getElementById('slotMapContent').scrollTop=0")
    page.locator('[data-slot-map-player-key="topone|roma"]').click(); page.wait_for_timeout(50)
    page.locator('#toggleTakenSheet').click(); page.wait_for_timeout(50)
    check(page.locator('#assignmentSheet').is_visible(), 'assignment sheet not opened from Mappa player modal')
    page.locator('#assignmentManager').select_option('m1')
    page.locator('#assignmentPrice').select_option('1')
    page.locator('#confirmAssignmentBtn').click(); page.wait_for_timeout(120)
    check(page.locator('#slotMapSheet').is_visible(), 'Mappa not restored after assignment')
    s1map = page.locator('.slot-map-slot-head').filter(has_text='1° SLOT').locator('.slot-map-count')
    check(s1map.inner_text() == '0/1', f'Mappa exhausted count wrong: {s1map.inner_text()}')
    check('exhausted' in (s1map.get_attribute('class') or ''), 'Mappa exhausted class missing')
    map_style = s1map.evaluate("e => ({color:getComputedStyle(e).color, weight:getComputedStyle(e).fontWeight})")
    check(map_style['color'] == 'rgb(198, 40, 40)' and int(map_style['weight']) >= 700, f'Mappa exhausted style wrong: {map_style}')
    exhausted_slot = page.locator('.slot-map-slot').filter(has_text='1° SLOT')
    if IS_V323:
        check(exhausted_slot.locator('.slot-map-slot-body').is_hidden(), 'v32.3 exhausted Slot body should be hidden')
    else:
        check(exhausted_slot.locator('.slot-map-empty-slot').inner_text() == 'Nessun giocatore disponibile', 'exhausted Slot not compacted')

    page.locator('#closeSlotMapBtn').click(); page.wait_for_timeout(60)
    main_s1 = page.locator('#demandSummary .demand-slot-count').filter(has_text='S1: 0')
    check(main_s1.count() == 1 and 'exhausted' in (main_s1.first.get_attribute('class') or ''), 'main S1:0 exhausted marker missing')
    main_style = main_s1.first.evaluate("e => ({color:getComputedStyle(e).color, weight:getComputedStyle(e).fontWeight})")
    check(main_style['color'] == 'rgb(198, 40, 40)' and int(main_style['weight']) >= 700, f'main S1:0 style wrong: {main_style}')

    # Mobile action bar must not overflow at reference widths.
    for width in (390,360):
        page.set_viewport_size({'width':width,'height':844}); page.wait_for_timeout(30)
        boga = page.locator('.player-card').filter(has_text='Boga').first
        boga.locator('.player-main').click(); page.wait_for_timeout(50)
        overflow = page.evaluate("() => { const e=document.querySelector('.player-bottom-actions'); return e.scrollWidth > e.clientWidth + 1; }")
        check(not overflow, f'four-action bar overflow at {width}')
        check(page.locator('#toggleOneCreditSheet').inner_text() == '1', f'quick button text wrong at {width}')
        page.locator('#closeSheetBottomBtn').click(); page.wait_for_timeout(30)

    check(not errors, f'page errors after interactions: {errors}')
    print('v32.1 runtime Playwright checks: OK')
    browser.close()

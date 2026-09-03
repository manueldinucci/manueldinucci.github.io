from pathlib import Path
import json, re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT/'index.html').read_text(encoding='utf-8')
html = re.sub(r'<link rel="stylesheet" href="style\.css"\s*/?>','',html)
html = re.sub(r'<script src="[^"]+"></script>','',html)

players=[]
def add(key,nome,role,slot,tmin=None,tmax=None,fvm=20,preso=False):
    players.append({'key':key,'nome':nome,'squadra':'Club','ruolo':role,'ruolo_mantra':'','slot':slot,
    'target_min':tmin,'target_max':tmax,'quotazione':5,'quotazione_iniziale':5,'fvm':fvm,'commento':'',
    'preso':preso,'prezzo_acquisto':1 if preso else None,'manager_id':'m1' if preso else '',
    'manager_acquirente':'Manuel' if preso else '','preferito':False,'oneCreditBuy':False})

# S1/S2 inline, S3+ dense/wrapping.
for key,n,tmin,tmax,f in [
 ('s1a','Paz N.',70,80,100),('s1b','McTominay',60,70,95),('s1c','Calhanoglu',50,60,90),('s1d','Orsolini',50,60,85),('s1e','Pulisic',40,50,80)]: add(key+'|club',n,'C','S1',tmin,tmax,f)
for key,n,tmin,tmax,f in [
 ('s2a','Baturina',35,40,79),('s2b','Zaniolo',30,35,78),('s2c','Zaccagni',25,30,77),('s2d','Atta',25,30,76),('s2e','Rabiot',20,25,75),('s2f','Zielinski',20,25,74)]: add(key+'|club',n,'C','S2',tmin,tmax,f)
for i,n in enumerate(['McKennie','Conceicao','Taylor K.','Da Cunha','Barella','Mastantuono','Ederson D.S.','De Bruyne','Vlasic','Gudmundsson A.','Frattesi','Zambo Anguissa','Ekkelenkamp','Rowe','Konè M.','Thuram K.','Sucic P.']):
    t=(20,25) if i<3 else ((15,20) if i<7 else (10,15)); add(f's3-{i}|club',n,'C','S3',*t,70-i)
for i in range(40): add(f's4-{i}|club',f'Giocatore Quarto Slot Nome {i:02d}','C','S4',None,[13,11,9,7][i%4],55-i)
for i in range(30): add(f's5-{i}|club',f'Giocatore Quinto Slot Nome {i:02d}','C','S5',None,5 if i<5 else (3 if i<15 else None),30-i)
for i in range(18): add(f'out-{i}|club',f'Fuori Slot Nome {i:02d}','C','',None,None,10-i)
# portieri no S5
for i,s in enumerate(['S1','S2','S3','S4']): add(f'p-{i}|club',f'Portiere {i+1}','P',s,None,10-i,20)

managers=[{'id':'m1','nome':'Manuel','isMe':True}]
settings={'auctionConfig': {'budgetInitial':500,'minPrice':1,'basePriceMode':'1','roster':{'P':3,'D':8,'C':8,'A':6}}}
mock=f"""
(() => {{
 let players={json.dumps(players,ensure_ascii=False)}; let managers={json.dumps(managers,ensure_ascii=False)};
 const settings=new Map(Object.entries({json.dumps(settings)}));
 const normalizeText=v=>String(v??'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim().toLocaleLowerCase('it');
 window.FantaDB={{normalizeText,makePlayerKey:(n,s)=>normalizeText(n)+'|'+normalizeText(s),openDB:async()=>true,purgeLegacyDemoPlayers:async()=>{{}},
 getSetting:async(k,f=null)=>settings.has(k)?settings.get(k):f,setSetting:async(k,v)=>settings.set(k,v),getManagers:async()=>managers,
 replaceManagers:async(v)=>{{managers=v;return v;}},getCombinedPlayers:async()=>players,updatePersonal:async(k,p)=>{{const x=players.find(y=>y.key===k);if(x)Object.assign(x,p);}},
 updateAuction:async(k,p)=>{{const x=players.find(y=>y.key===k);if(x)Object.assign(x,p);}},resetAuction:async()=>{{}},resetAll:async()=>{{players=[];}},addFullPlayer:async()=>{{}},removePlayer:async()=>{{}},
 exportBackupObject:async()=>({{format:'fantacalcio-checklist-backup',version:5}}),importBackupObject:async()=>{{}},importBasePlayers:async()=>({{}})}};
}})();
"""

def check(c,m):
    if not c: raise AssertionError(m)

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':390,'height':844})
    errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='domcontentloaded')
    page.add_style_tag(content=(ROOT/'style.css').read_text(encoding='utf-8'))
    for f in ['vendor/xlsx-local-reader.js','players.js','xlsx-import.js','auction-logic.js']:
        page.add_script_tag(content=(ROOT/f).read_text(encoding='utf-8'))
    page.add_script_tag(content=mock); page.add_script_tag(content=(ROOT/'app.js').read_text(encoding='utf-8'))
    page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))"); page.wait_for_timeout(250)
    check(not errors,f'page errors: {errors}')
    page.locator('[data-role="C"]').click(); page.locator('#slotMapHeaderBtn').click(); page.wait_for_timeout(80)

    check(page.locator('#slotMapSlotIndex').count()==0,'Slot index returned')
    check(page.locator('[data-slot-map-slot="S1"] .slot-map-inline').count()==1,'S1 inline missing')
    check(page.locator('[data-slot-map-slot="S2"] .slot-map-inline').count()==1,'S2 inline missing')
    check(page.locator('[data-slot-map-slot="S3"] .slot-map-band').count()==3,'S3 categories wrong')
    check(page.locator('[data-slot-map-slot="S4"] .slot-map-band').count()==4,'S4 categories wrong')

    # Minimal surfaces: no horizontal grid line, no vertical rail, same neutral row surface.
    b1=page.locator('[data-slot-map-slot="S4"] .slot-map-band').nth(0)
    b2=page.locator('[data-slot-map-slot="S4"] .slot-map-band').nth(1)
    styles=b1.evaluate("e=>({bb:getComputedStyle(e).borderBottomWidth,bg:getComputedStyle(e).backgroundColor,pt:getComputedStyle(e).paddingTop,pb:getComputedStyle(e).paddingBottom})")
    label=b1.locator('.slot-map-band-label').evaluate("e=>({br:getComputedStyle(e).borderRightWidth,w:e.getBoundingClientRect().width})")
    bg2=b2.evaluate("e=>getComputedStyle(e).backgroundColor")
    check(styles['bb']=='0px',f'horizontal line remains: {styles}')
    check(label['br']=='0px',f'vertical rail remains: {label}')
    check(styles['bg']==bg2,f'row alternation remains: {styles["bg"]}/{bg2}')
    check(label['w']<=43.5,f'Target column too wide: {label["w"]}')
    check(float(styles['pt'].replace('px',''))<=2.5 and float(styles['pb'].replace('px',''))<=2.5,f'band padding too tall: {styles}')

    # Header and upper slots are compact.
    head_h=page.locator('[data-slot-map-slot="S1"] .slot-map-slot-head').evaluate('e=>e.getBoundingClientRect().height')
    s1_h=page.locator('[data-slot-map-slot="S1"]').evaluate('e=>e.getBoundingClientRect().height')
    s2_h=page.locator('[data-slot-map-slot="S2"]').evaluate('e=>e.getBoundingClientRect().height')
    check(head_h<=29,f'header too tall: {head_h}')
    check(s1_h+s2_h<155,f'S1+S2 not compact enough: {s1_h+s2_h}')

    # Shared targets and tap remain correct.
    s1=page.locator('[data-slot-map-slot="S1"] .slot-map-inline').inner_text()
    check(s1.count('50–60')==1 and 'Calhanoglu' in s1 and 'Orsolini' in s1,'shared inline Target broken')
    page.locator('[data-slot-map-player-key="s1c|club"]').click(); page.wait_for_timeout(30)
    check(page.locator('#sheetPlayerName').inner_text()=='Calhanoglu','wrong inline player opened')
    page.locator('#closeSheetBottomBtn').click(); page.wait_for_timeout(60)
    check(page.locator('#slotMapSheet').is_visible(),'Map not restored')

    # Wrapping keeps Target column and no bullets/leading isolated separators.
    s4=page.locator('[data-slot-map-slot="S4"]')
    text=s4.inner_text(); check('•' not in text,'bullet character rendered')
    units=s4.locator('.slot-map-player-unit'); check(units.count()>10,'dense units missing')
    unit_style=units.nth(0).evaluate("e=>({ls:getComputedStyle(e).listStyleType,ws:getComputedStyle(e).whiteSpace})")
    check(unit_style['ls']=='none' and unit_style['ws']=='nowrap',f'marker/wrap defense wrong: {unit_style}')

    # Accordion + sticky still work.
    s1head=page.locator('[data-slot-map-slot="S1"] .slot-map-slot-head'); s1head.click(); page.wait_for_timeout(20)
    check(page.locator('[data-slot-map-slot="S1"] .slot-map-slot-body').is_hidden(),'accordion collapse broken')
    s1head.click(); page.wait_for_timeout(20)
    page.evaluate("""() => { const c=document.getElementById('slotMapContent'); const s=c.querySelector('[data-slot-map-slot="S4"]'); c.scrollTop=s.offsetTop+70; }""")
    page.wait_for_timeout(30)
    top=page.locator('[data-slot-map-slot="S4"] .slot-map-slot-head').evaluate('e=>e.getBoundingClientRect().top')
    ctop=page.locator('#slotMapContent').evaluate('e=>e.getBoundingClientRect().top')
    check(abs(top-ctop)<=4,f'sticky broken: {top}/{ctop}')

    # Fuori slot is minimal and bullet-free.
    page.locator('.slot-map-outside summary').click(); page.wait_for_timeout(20)
    outside=page.locator('.slot-map-outside').evaluate("e=>({bw:getComputedStyle(e).borderWidth,br:getComputedStyle(e).borderRadius})")
    check(outside['bw']=='0px',f'Outside still boxed: {outside}')
    check('•' not in page.locator('.slot-map-outside').inner_text(),'Outside bullet rendered')

    # Goalkeeper S5 remains absent.
    page.locator('[data-slot-map-role="P"]').click(); page.wait_for_timeout(30)
    check(page.locator('[data-slot-map-slot="S5"]').count()==0,'goalkeeper S5 must not exist')

    for width in (390,360):
        page.set_viewport_size({'width':width,'height':844}); page.wait_for_timeout(20)
        page.locator('[data-slot-map-role="C"]').click(); page.wait_for_timeout(30)
        overflow=page.evaluate("() => { const s=document.getElementById('slotMapSheet'), c=document.getElementById('slotMapContent'); return s.scrollWidth>s.clientWidth+1 || c.scrollWidth>c.clientWidth+1; }")
        check(not overflow,f'overflow at {width}px')
        if width==390:
            page.evaluate("document.getElementById('slotMapContent').scrollTop=0")
            page.screenshot(path=str(ROOT/'tests/v32-4-map-top.png'))
            page.evaluate("""() => { const c=document.getElementById('slotMapContent'); const s=c.querySelector('[data-slot-map-slot="S4"]'); c.scrollTop=s.offsetTop+10; }""")
            page.wait_for_timeout(20); page.screenshot(path=str(ROOT/'tests/v32-4-map-s4.png'))

    check(not errors,f'page errors after interactions: {errors}')
    print('v32.4 runtime Playwright checks: OK')
    browser.close()

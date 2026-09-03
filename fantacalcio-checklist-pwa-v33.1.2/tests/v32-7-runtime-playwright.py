from pathlib import Path
import json, re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT/'index.html').read_text(encoding='utf-8')
html = re.sub(r'<link rel="stylesheet" href="style\.css"\s*/?>','',html)
html = re.sub(r'<script src="[^"]+"></script>','',html)

players=[]
def add(key,nome,role,slot,tmin=None,tmax=None,fvm=20,preferito=False,commento='',preso=False,one=False):
    players.append({'key':key,'nome':nome,'squadra':'Club','ruolo':role,'ruolo_mantra':'','slot':slot,
    'target_min':tmin,'target_max':tmax,'quotazione':5,'quotazione_iniziale':5,'fvm':fvm,'commento':commento,
    'preso':preso,'prezzo_acquisto':1 if preso else None,'manager_id':'m1' if preso else '',
    'manager_acquirente':'Manuel' if preso else '','preferito':preferito,'oneCreditBuy':one})

# Portieri: S1/S2 verticali, Copertura separata e un vero Fuori Slot.
add('p-s1a|club','Portiere Top A','P','S1',30,40,90,True)
add('p-s1b|club','Portiere Top B','P','S1',20,30,85)
add('p-s2a|club','Portiere S2 A','P','S2',15,20,70)
add('p-s2b|club','Portiere S2 B','P','S2',10,15,65)
add('p-s3|club','Portiere S3','P','S3',None,10,50)
add('p-s4|club','Portiere S4','P','S4',None,5,40)
add('p-cover|club','Portiere Copertura','P','',None,None,10,False,'Secondo nelle gerarchie: copertura da prendere in coppia con il titolare.')
add('p-out|club','Portiere Fuori Slot','P','',None,None,5)

# Difesa: S1 inline, S2 verticale.
add('d-s1a|club','Dimarco','D','S1',30,38,90,True)
add('d-s1b|club','Wesley','D','S1',18,22,85)
add('d-s1c|club','Bremer','D','S1',15,20,80)
add('d-s2a|club','Mancini','D','S2',None,15,70)
add('d-s2b|club','Bastoni','D','S2',None,13,68,True)
add('d-s2c|club','Kalulu','D','S2',None,13,65)
for i,(slot,cap) in enumerate([('S3',10),('S4',5),('S5',None)]):
    add(f'd-{slot}|club',f'Difensore {slot}','D',slot,None,cap,50-i)
add('d-out|club','Difensore Fuori','D','',None,None,5,True)

# Centrocampo: S1 inline, S2 verticale, S5 default chiuso.
for key,n,tmin,tmax,f,fav in [
 ('c-s1a','Paz N.',70,80,100,True),('c-s1b','McTominay',60,70,95,False),
 ('c-s1c','Calhanoglu',50,60,90,False),('c-s1d','Orsolini',50,60,85,False),('c-s1e','Pulisic',40,50,80,False)]:
    add(key+'|club',n,'C','S1',tmin,tmax,f,fav)
for key,n,tmin,tmax,f,fav in [
 ('c-s2a','Baturina',35,40,79,False),('c-s2b','Zaniolo',30,35,78,False),
 ('c-s2c','Zaccagni',25,30,77,False),('c-s2d','Atta',25,30,76,True),
 ('c-s2e','Rabiot',20,25,75,False),('c-s2f','Zielinski',20,25,74,False)]:
    add(key+'|club',n,'C','S2',tmin,tmax,f,fav)
for i,n in enumerate(['McKennie','Conceicao','Taylor K.','Da Cunha','Barella','Mastantuono','Ederson D.S.','De Bruyne','Vlasic','Frattesi']):
    t=(20,25) if i<3 else ((15,20) if i<7 else (10,15)); add(f'c-s3-{i}|club',n,'C','S3',*t,70-i)
for i in range(8): add(f'c-s4-{i}|club',f'Centrocampista S4 {i}','C','S4',None,[13,11,9,7][i%4],55-i)
for i in range(8): add(f'c-s5-{i}|club',f'Centrocampista S5 {i}','C','S5',None,5 if i<2 else (3 if i<4 else None),30-i, i==0)
add('c-out|club','Centrocampista Fuori','C','',None,None,5,True)

# Attacco: S1 inline, S2 verticale, S5 default chiuso.
add('a-s1a|club','Attaccante Top A','A','S1',150,170,100,True)
add('a-s1b|club','Attaccante Top B','A','S1',125,140,95)
add('a-s2a|club','Attaccante S2 Alto','A','S2',45,55,80)
add('a-s2b|club','Attaccante S2 Medio','A','S2',35,45,75,True)
add('a-s2c|club','Attaccante S2 Basso','A','S2',30,40,70)
add('a-s3|club','Attaccante S3','A','S3',25,30,60)
add('a-s4|club','Attaccante S4','A','S4',15,20,50)
add('a-s5|club','Attaccante S5','A','S5',None,None,40,True)
add('a-out|club','Attaccante Fuori','A','',None,None,5)

managers=[{'id':'m1','nome':'Manuel','isMe':True}]
settings={'auctionConfig': {'budgetInitial':500,'minPrice':1,'basePriceMode':'1','roster':{'P':3,'D':8,'C':8,'A':6}}}
mock=f"""
(() => {{
 let players={json.dumps(players,ensure_ascii=False)}; window.__mockPlayers=players; let managers={json.dumps(managers,ensure_ascii=False)};
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

def is_hidden(page, slot):
    return page.locator(f'[data-slot-map-slot="{slot}"] .slot-map-slot-body').is_hidden()

def baseline_delta(band):
    return band.evaluate("""e => {
      const label=e.querySelector('.slot-map-band-label'); const names=e.querySelector('.slot-map-names');
      const mk=()=>{const x=document.createElement('span');x.style.cssText='display:inline-block;width:0;height:0;padding:0;margin:0;border:0;vertical-align:baseline';return x;};
      const a=mk(),b=mk();label.prepend(a);names.prepend(b);const d=Math.abs(a.getBoundingClientRect().top-b.getBoundingClientRect().top);a.remove();b.remove();return d;
    }""")

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

    # CENTROCAMPO
    page.locator('[data-role="C"]').click(); page.locator('#slotMapHeaderBtn').click(); page.wait_for_timeout(80)
    check(page.locator('[data-slot-map-slot="S1"] .slot-map-inline').count()==1,'C S1 must be inline')
    check(page.locator('[data-slot-map-slot="S2"] .slot-map-inline').count()==0,'C S2 must not be inline')
    check(page.locator('[data-slot-map-slot="S2"] .slot-map-band').count()==4,'C S2 must have 4 vertical bands')
    check(is_hidden(page,'S5'),'C S5 must be closed by default')
    check(page.locator('[data-slot-map-slot="S5"] .slot-map-slot-head').get_attribute('aria-expanded')=='false','C S5 aria state wrong')

    # Favorites: gold + 700, target unchanged, no stars/badge 1 in Map.
    fav=page.locator('[data-slot-map-player-key="c-s2d|club"]')
    check('favorite' in (fav.get_attribute('class') or ''),'favorite class missing')
    fstyle=fav.evaluate("e=>({w:getComputedStyle(e).fontWeight,c:getComputedStyle(e).color})")
    gold=page.evaluate("""() => { const e=document.createElement('span');e.style.color='var(--favorite-star)';document.body.append(e);const c=getComputedStyle(e).color;e.remove();return c; }""")
    check(fstyle['w']=='700',f'favorite weight wrong: {fstyle}')
    check(fstyle['c']==gold,f'favorite must use existing gold: {fstyle["c"]}/{gold}')
    tcolor=page.locator('[data-slot-map-slot="S2"] .slot-map-band-label').nth(2).evaluate('e=>getComputedStyle(e).color')
    check(tcolor != gold,'Target must not become gold')
    map_text=page.locator('#slotMapContent').inner_text()
    check('★' not in map_text and '☆' not in map_text,'favorite star leaked into Map')

    # Baseline preserved in newly vertical S2.
    s2bands=page.locator('[data-slot-map-slot="S2"] .slot-map-band')
    check(max(baseline_delta(s2bands.nth(i)) for i in range(s2bands.count())) <= 0.75,'C S2 baseline regression')

    # Open default-closed S5, change favorite through modal, and preserve state after return.
    page.locator('[data-slot-map-slot="S5"] .slot-map-slot-head').click(); page.wait_for_timeout(20)
    check(not is_hidden(page,'S5'),'C S5 did not open')
    page.locator('[data-slot-map-player-key="c-s5-1|club"]').click(); page.wait_for_timeout(30)
    page.locator('#toggleFavoriteSheet').click(); page.wait_for_timeout(30)
    page.locator('#closeSheetBottomBtn').click(); page.wait_for_timeout(70)
    check(page.locator('#slotMapSheet').is_visible(),'Map not restored after favorite edit')
    check(not is_hidden(page,'S5'),'C S5 manual open state lost after modal')
    check('favorite' in (page.locator('[data-slot-map-player-key="c-s5-1|club"]').get_attribute('class') or ''),'favorite style not refreshed live')

    # Role switch away/back keeps session accordion state.
    page.locator('[data-slot-map-role="D"]').click(); page.wait_for_timeout(30)
    check(page.locator('[data-slot-map-slot="S1"] .slot-map-inline').count()==1,'D S1 must be inline')
    check(page.locator('[data-slot-map-slot="S2"] .slot-map-inline').count()==0,'D S2 must be vertical')
    check(page.locator('[data-slot-map-slot="S2"] .slot-map-band').count()==2,'D S2 microbands wrong')
    check(not is_hidden(page,'S5'),'D S5 should retain current default open behavior')
    page.locator('[data-slot-map-role="C"]').click(); page.wait_for_timeout(30)
    check(not is_hidden(page,'S5'),'C S5 state lost after role roundtrip')

    # ATTACCO
    page.locator('[data-slot-map-role="A"]').click(); page.wait_for_timeout(30)
    check(page.locator('[data-slot-map-slot="S1"] .slot-map-inline').count()==1,'A S1 must be inline')
    check(page.locator('[data-slot-map-slot="S2"] .slot-map-band').count()==3,'A S2 must be vertical by actual ranges')
    check(is_hidden(page,'S5'),'A S5 must be closed by default')

    # PORTIERI
    page.locator('[data-slot-map-role="P"]').click(); page.wait_for_timeout(30)
    check(page.locator('[data-slot-map-slot="S5"]').count()==0,'P S5 must not exist')
    check(page.locator('[data-slot-map-slot="S1"] .slot-map-inline').count()==0,'P S1 must be vertical')
    check(page.locator('[data-slot-map-slot="S1"] .slot-map-band').count()==2,'P S1 vertical ranges wrong')
    check(page.locator('[data-slot-map-slot="S2"] .slot-map-band').count()==2,'P S2 vertical ranges wrong')
    check(not is_hidden(page,'S1') and not is_hidden(page,'S2'),'P S1/S2 must start open')
    check(is_hidden(page,'S3') and is_hidden(page,'S4'),'P S3/S4 must start closed')
    check(page.locator('.slot-map-outside').count()==1,'P Fuori Slot missing')
    check(page.locator('.slot-map-outside').get_attribute('open') is None,'P Fuori Slot must start closed')
    ptext=page.locator('#slotMapContent').inner_text()
    check('COPERTURE' not in ptext and 'Portiere Copertura' not in ptext,'Coperture still rendered')
    check(page.locator('.slot-map-outside-count').inner_text().strip()=='1','Coverage incorrectly added to Fuori Slot count')
    still_there=page.evaluate("window.__mockPlayers.some(p=>p.key==='p-cover|club' && !p.slot)")
    check(still_there,'Coverage data was modified/removed')

    # Fuori Slot starts closed but a manual opening survives a player modal roundtrip.
    page.locator('.slot-map-outside summary').click(); page.wait_for_timeout(20)
    check(page.locator('.slot-map-outside').get_attribute('open') is not None,'P Fuori Slot did not open')
    page.locator('[data-slot-map-player-key="p-out|club"]').click(); page.wait_for_timeout(30)
    page.locator('#closeSheetBottomBtn').click(); page.wait_for_timeout(70)
    check(page.locator('.slot-map-outside').get_attribute('open') is not None,'P Fuori Slot state lost after modal')

    # Manual P S3 opening survives player modal roundtrip.
    page.locator('[data-slot-map-slot="S3"] .slot-map-slot-head').click(); page.wait_for_timeout(20)
    check(not is_hidden(page,'S3'),'P S3 did not open')
    page.locator('[data-slot-map-player-key="p-s3|club"]').click(); page.wait_for_timeout(30)
    page.locator('#closeSheetBottomBtn').click(); page.wait_for_timeout(70)
    check(not is_hidden(page,'S3'),'P S3 state lost after modal')

    # Geometry: S2 vertical uses same target/name axes and baseline as lower slots.
    page.locator('[data-slot-map-role="D"]').click(); page.wait_for_timeout(30)
    bands=[]
    for slot in ('S2','S3','S4'):
        b=page.locator(f'[data-slot-map-slot="{slot}"] .slot-map-band')
        if b.count(): bands.append(b.nth(0))
    name_x=[b.locator('.slot-map-names').evaluate('e=>e.getBoundingClientRect().left') for b in bands]
    target_right=[b.locator('.slot-map-band-label').evaluate('e=>e.getBoundingClientRect().right') for b in bands]
    check(max(name_x)-min(name_x)<=0.75,f'name axes differ: {name_x}')
    check(max(target_right)-min(target_right)<=0.75,f'target axes differ: {target_right}')
    check(max(baseline_delta(b) for b in bands)<=0.75,'baseline differs across S2+')

    # Responsive no horizontal overflow.
    for width in (390,360):
        page.set_viewport_size({'width':width,'height':844}); page.wait_for_timeout(20)
        for role in ('P','D','C','A'):
            page.locator(f'[data-slot-map-role="{role}"]').click(); page.wait_for_timeout(20)
            overflow=page.evaluate("() => { const s=document.getElementById('slotMapSheet'), c=document.getElementById('slotMapContent'); return s.scrollWidth>s.clientWidth+1 || c.scrollWidth>c.clientWidth+1; }")
            check(not overflow,f'overflow at {width}px role {role}')

    check(not errors,f'page errors after interactions: {errors}')
    print('v32.7 runtime Playwright checks: OK')
    browser.close()

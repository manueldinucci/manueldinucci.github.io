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

# C: compact S1 with one long multi-player micro-band to force same-band continuation at narrow width.
for key,n,tmin,tmax,f,fav in [
 ('c1','Paz N.',70,80,100,True),('c2','McTominay',60,70,95,True),
 ('c3','Calhanoglu',50,60,90,True),('c4','Orsolini',50,60,89,True),
 ('c5','Giocatore Molto Lungo A',50,60,88,False),('c6','Giocatore Molto Lungo B',50,60,87,False),
 ('c7','Pulisic',40,50,80,True)]:
    add(key+'|club',n,'C','S1',tmin,tmax,f,fav)
add('c21|club','Baturina','C','S2',30,35,79)
add('c31|club','Da Cunha','C','S3',15,20,70)
add('c41|club','Mora','C','S4',None,13,60)
add('c51|club','Modric','C','S5',None,5,50)

# D compact S1.
add('d1|club','Dimarco','D','S1',30,38,100,True); add('d2|club','Wesley','D','S1',18,22,90); add('d3|club','Bremer','D','S1',15,20,80)
add('d21|club','Mancini','D','S2',None,15,70); add('d31|club','Dif S3','D','S3',None,10,60); add('d41|club','Dif S4','D','S4',None,5,50); add('d51|club','Dif S5','D','S5',None,None,40)

# A mirrors the real S1 structure from the reported screenshot.
for key,n,tmin,tmax,f,fav in [
 ('a1','Martinez L.',150,170,100,True),('a2','Malen',125,140,95,True),('a3','Hojlund',100,115,90,False),
 ('a4','Thuram',90,105,85,False),('a5','Ramos G.',80,90,80,False),('a6','Kean',80,90,79,False),('a7','Kolo Muani',70,80,78,False)]:
    add(key+'|club',n,'A','S1',tmin,tmax,f,fav)
add('a21|club','Douvikas','A','S2',45,55,70); add('a22|club','Scamacca','A','S2',45,55,69)
add('a31|club','Yildiz','A','S3',25,30,60); add('a41|club','Castro S.','A','S4',15,20,50); add('a51|club','Attaccante S5','A','S5',None,None,40)

# P regression fixtures.
add('p1|club','Portiere S1','P','S1',30,40,90); add('p2|club','Portiere S2','P','S2',20,30,80); add('p3|club','Portiere S3','P','S3',None,10,60); add('p4|club','Portiere S4','P','S4',None,5,50)
add('pc|club','Portiere Copertura','P','',None,None,10,False,'Secondo nelle gerarchie: copertura da prendere in coppia con il titolare.')
add('po|club','Portiere Fuori','P','',None,None,5)

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

def open_map(page, role):
    if not page.locator('#slotMapSheet').is_visible():
        page.locator('#slotMapHeaderBtn').click(); page.wait_for_timeout(60)
    page.locator(f'[data-slot-map-role="{role}"]').click(); page.wait_for_timeout(80)

def rect(page, selector):
    return page.locator(selector).first.evaluate('e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,width:r.width,height:r.height}}')

def css(page, selector, prop):
    return page.locator(selector).first.evaluate('(e,p)=>getComputedStyle(e)[p]', prop)

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage'])
    for width in (390,360):
        page=browser.new_page(viewport={'width':width,'height':844})
        errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(html,wait_until='domcontentloaded'); page.add_style_tag(content=(ROOT/'style.css').read_text(encoding='utf-8'))
        for f in ['vendor/xlsx-local-reader.js','players.js','xlsx-import.js','auction-logic.js']:
            page.add_script_tag(content=(ROOT/f).read_text(encoding='utf-8'))
        page.add_script_tag(content=mock); page.add_script_tag(content=(ROOT/'app.js').read_text(encoding='utf-8'))
        page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))"); page.wait_for_timeout(260)
        check(not errors,f'page errors: {errors}')

        # ATT: long Target typography + semantic new-row Target.
        open_map(page,'A')
        rows=page.locator('[data-slot-map-slot="S1"] [data-slot-map-inline-physical-row]')
        check(rows.count() >= 2, f'A compact S1 should use multiple physical rows at {width}')
        first_target=page.locator('[data-slot-map-slot="S1"] .slot-map-inline-first-target').first
        check(first_target.inner_text().strip()=='150–170','first A Target wrong')
        vertical_target=page.locator('[data-slot-map-slot="S2"] .slot-map-band-label').first
        for prop in ('fontFamily','fontSize','fontWeight','lineHeight','color','fontVariantNumeric'):
            check(first_target.evaluate('(e,p)=>getComputedStyle(e)[p]',prop)==vertical_target.evaluate('(e,p)=>getComputedStyle(e)[p]',prop),f'Target typography differs for {prop} at {width}')
        # Target must fit in its own fixed column.
        fit=first_target.evaluate('e=>e.scrollWidth<=e.clientWidth+0.75')
        check(fit,f'150–170 overflows Target column at {width}')
        mart=rect(page,'[data-slot-map-player-key="a1|club"]')
        trect=rect(page,'[data-slot-map-slot="S1"] .slot-map-inline-first-target')
        check(trect['right'] <= mart['left'] + 0.75,f'150–170 overlaps Martinez at {width}: {trect} / {mart}')

        row_data=page.locator('[data-slot-map-slot="S1"] [data-slot-map-inline-physical-row]').evaluate_all("""rows=>rows.map(r=>({target:r.querySelector('.slot-map-inline-first-target')?.textContent.trim()||'', names:[...r.querySelectorAll('.slot-map-player')].map(x=>x.textContent.trim()), targetRight:r.querySelector('.slot-map-inline-first-target')?.getBoundingClientRect().right, namesLeft:r.querySelector('.slot-map-inline')?.getBoundingClientRect().left}))""")
        nonempty=[r for r in row_data if r['target']]
        check(len(nonempty)>=2,f'no later micro-band promoted to Target column at {width}: {row_data}')
        check(any(r['target'] in ('90–105','80–90','70–80','100–115','125–140') for r in nonempty[1:]),f'later A row does not start with a real micro-band Target at {width}: {row_data}')
        tr=[r['targetRight'] for r in nonempty]
        nl=[r['namesLeft'] for r in row_data]
        check(max(tr)-min(tr)<=0.75,f'A physical-row target axes differ at {width}: {tr}')
        check(max(nl)-min(nl)<=0.75,f'A physical-row name axes differ at {width}: {nl}')
        # No orphan separator at starts/ends of physical rows.
        for i in range(rows.count()):
            txt=rows.nth(i).locator('.slot-map-inline').inner_text().strip()
            check(not txt.startswith('·') and not txt.endswith('·'),f'orphan separator in A row {i} at {width}: {txt!r}')

        # C: same-micro-band continuation must have blank Target and remain on names axis.
        open_map(page,'C')
        crows=page.locator('[data-slot-map-slot="S1"] [data-slot-map-inline-physical-row]')
        cdata=crows.evaluate_all("""rows=>rows.map(r=>({target:r.querySelector('.slot-map-inline-first-target')?.textContent.trim()||'', names:[...r.querySelectorAll('.slot-map-player')].map(x=>x.textContent.trim()), namesLeft:r.querySelector('.slot-map-inline')?.getBoundingClientRect().left, firstPlayerLeft:r.querySelector('.slot-map-player')?.getBoundingClientRect().left}))""")
        blank=[r for r in cdata if not r['target']]
        check(blank,f'C fixture did not produce a same-band continuation at {width}: {cdata}')
        for r in blank:
            check(abs(r['firstPlayerLeft']-r['namesLeft'])<=0.75,f'same-band continuation escaped names axis at {width}: {r}')
        # New micro-band rows in C still use target column.
        cnon=[r for r in cdata if r['target']]
        if len(cnon)>1:
            cr=[page.locator('[data-slot-map-slot="S1"] .slot-map-inline-first-target').nth(i).evaluate('e=>e.getBoundingClientRect().right') for i in range(page.locator('[data-slot-map-slot="S1"] .slot-map-inline-first-target').count()) if page.locator('[data-slot-map-slot="S1"] .slot-map-inline-first-target').nth(i).inner_text().strip()]
            check(max(cr)-min(cr)<=0.75,f'C Target axes differ at {width}: {cr}')
        # Favorite remains only on player name.
        fav=page.locator('[data-slot-map-player-key="c1|club"]')
        gold=page.evaluate("""() => { const e=document.createElement('span');e.style.color='var(--favorite-star)';document.body.append(e);const c=getComputedStyle(e).color;e.remove();return c; }""")
        check(fav.evaluate('e=>getComputedStyle(e).fontWeight')=='700','favorite weight lost')
        check(fav.evaluate('e=>getComputedStyle(e).color')==gold,'favorite gold lost')
        check(page.locator('[data-slot-map-slot="S1"] .slot-map-inline-first-target').first.evaluate('e=>getComputedStyle(e).color')!=gold,'Target became favorite gold')

        # Modal return preserves accordion state and refreshes Favorite styling live.
        check(page.locator('[data-slot-map-slot="S5"] .slot-map-slot-body').is_hidden(),'C S5 should start collapsed')
        page.locator('[data-slot-map-slot="S5"] [data-slot-map-toggle="S5"]').click(); page.wait_for_timeout(30)
        check(not page.locator('[data-slot-map-slot="S5"] .slot-map-slot-body').is_hidden(),'C S5 did not open manually')
        page.locator('[data-slot-map-player-key="c1|club"]').click(); page.wait_for_timeout(50)
        check(page.locator('#playerSheet').is_visible(),'compact player did not open player modal')
        page.locator('#toggleFavoriteSheet').click(); page.wait_for_timeout(40)
        page.locator('#closeSheetBtn').click(); page.wait_for_timeout(90)
        check(page.locator('#slotMapSheet').is_visible(),'did not return to Slot Map after modal')
        check(not page.locator('[data-slot-map-slot="S5"] .slot-map-slot-body').is_hidden(),'C S5 accordion state was reset after modal')
        c1_after=page.locator('[data-slot-map-player-key="c1|club"]')
        check('favorite' not in (c1_after.get_attribute('class') or ''),'Favorite class did not refresh after modal toggle')

        # ResizeObserver relayout must rebind player buttons after a real width change.
        if width == 390:
            page.set_viewport_size({'width':370,'height':844}); page.wait_for_timeout(120)
            page.locator('[data-slot-map-player-key="c2|club"]').click(); page.wait_for_timeout(50)
            check(page.locator('#playerSheet').is_visible(),'player click lost after compact relayout')
            page.locator('#closeSheetBtn').click(); page.wait_for_timeout(80)
            page.set_viewport_size({'width':390,'height':844}); page.wait_for_timeout(120)

        # D remains compact and aligned with vertical Target/Names axes.
        open_map(page,'D')
        dtarget=rect(page,'[data-slot-map-slot="S1"] .slot-map-inline-first-target')
        dvt=rect(page,'[data-slot-map-slot="S2"] .slot-map-band-label')
        dname=rect(page,'[data-slot-map-slot="S1"] .slot-map-inline')
        dvn=rect(page,'[data-slot-map-slot="S2"] .slot-map-names')
        check(abs(dtarget['right']-dvt['right'])<=0.75,f'D target axes differ at {width}')
        check(abs(dname['left']-dvn['left'])<=0.75,f'D name axes differ at {width}')

        # P unchanged by hotfix.
        open_map(page,'P')
        check(page.locator('[data-slot-map-slot="S1"] [data-slot-map-inline-layout]').count()==0,'P S1 unexpectedly compact')
        check(page.locator('[data-slot-map-slot="S1"] .slot-map-band').count()==1,'P S1 vertical layout changed')
        check(page.locator('[data-slot-map-slot="S2"] .slot-map-band').count()==1,'P S2 vertical layout changed')
        check(page.locator('[data-slot-map-slot="S3"] .slot-map-slot-body').is_hidden(),'P S3 default state changed')
        check(page.locator('[data-slot-map-slot="S4"] .slot-map-slot-body').is_hidden(),'P S4 default state changed')
        check('COPERTURE' not in page.locator('#slotMapContent').inner_text(),'P coverage section returned')

        overflow=page.evaluate("() => { const s=document.getElementById('slotMapSheet'), c=document.getElementById('slotMapContent'); return s.scrollWidth>s.clientWidth+1 || c.scrollWidth>c.clientWidth+1; }")
        check(not overflow,f'overflow at {width}px')
        check(not errors,f'page errors after interactions at {width}: {errors}')
        page.close()
    print('v32.7.2 runtime Playwright checks: OK')
    browser.close()

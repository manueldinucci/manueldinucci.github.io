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

# D/C/A compact S1; enough C names to force wrapping.
for key,n,tmin,tmax,f,fav in [
 ('c1','Paz N.',70,80,100,True),('c2','McTominay',60,70,95,True),
 ('c3','Calhanoglu',50,60,90,True),('c4','Orsolini',50,60,85,True),('c5','Pulisic',40,50,80,True)]:
    add(key+'|club',n,'C','S1',tmin,tmax,f,fav)
for key,n,tmin,tmax,f in [('c21','Baturina',30,35,79),('c31','Da Cunha',15,20,70)]: add(key+'|club',n,'C','S2' if key=='c21' else 'S3',tmin,tmax,f)
add('c41|club','Mora','C','S4',None,13,60); add('c51|club','Modric','C','S5',None,5,50)

add('d1|club','Dimarco','D','S1',30,38,100,True); add('d2|club','Wesley','D','S1',18,22,90); add('d3|club','Bremer','D','S1',15,20,80)
add('d21|club','Mancini','D','S2',None,15,70); add('d31|club','Dif S3','D','S3',None,10,60); add('d41|club','Dif S4','D','S4',None,5,50); add('d51|club','Dif S5','D','S5',None,None,40)

for key,n,tmin,tmax,f in [('a1','Attaccante Top A',150,170,100),('a2','Attaccante Top B',125,140,95),('a3','Attaccante Top C',100,115,90),('a4','Attaccante Top D',90,105,85),('a5','Attaccante Top E',80,90,80)]: add(key+'|club',n,'A','S1',tmin,tmax,f,key=='a1')
add('a21|club','Attaccante S2','A','S2',45,55,70); add('a31|club','Attaccante S3','A','S3',25,30,60); add('a41|club','Attaccante S4','A','S4',15,20,50); add('a51|club','Attaccante S5','A','S5',None,None,40)

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
    if not page.locator('#slotMapSheet').is_visible(): page.locator('#slotMapHeaderBtn').click(); page.wait_for_timeout(50)
    page.locator(f'[data-slot-map-role="{role}"]').click(); page.wait_for_timeout(40)

def target_right(page, slot, compact=False):
    sel = f'[data-slot-map-slot="{slot}"] ' + ('.slot-map-inline-first-target' if compact else '.slot-map-band-label')
    return page.locator(sel).first.evaluate('e=>e.getBoundingClientRect().right')

def name_left(page, slot, compact=False):
    sel = f'[data-slot-map-slot="{slot}"] ' + ('.slot-map-inline' if compact else '.slot-map-names')
    return page.locator(sel).first.evaluate('e=>e.getBoundingClientRect().left')

def compact_baseline_delta(page, slot):
    return page.locator(f'[data-slot-map-slot="{slot}"] .slot-map-inline-row').evaluate("""e => {
      const a=e.querySelector('.slot-map-inline-first-target'), b=e.querySelector('.slot-map-inline');
      const mk=()=>{const x=document.createElement('span');x.style.cssText='display:inline-block;width:0;height:0;padding:0;margin:0;border:0;vertical-align:baseline';return x;};
      const x=mk(),y=mk();a.prepend(x);b.prepend(y);const d=Math.abs(x.getBoundingClientRect().top-y.getBoundingClientRect().top);x.remove();y.remove();return d;
    }""")

def wrap_geometry(page, slot):
    return page.locator(f'[data-slot-map-slot="{slot}"] .slot-map-inline').evaluate("""e => {
      const left=e.getBoundingClientRect().left;
      const btns=[...e.querySelectorAll('.slot-map-player')].map(x=>({left:x.getBoundingClientRect().left,top:x.getBoundingClientRect().top,name:x.textContent.trim()}));
      const tops=[...new Set(btns.map(x=>Math.round(x.top*2)/2))].sort((a,b)=>a-b);
      const second=tops.length>1 ? btns.filter(x=>Math.abs(x.top-tops[1])<1) : [];
      return {left,tops,secondLeft:second.length?Math.min(...second.map(x=>x.left)):null,btns};
    }""")

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage'])
    for width in (390,360):
        page=browser.new_page(viewport={'width':width,'height':844})
        errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(html,wait_until='domcontentloaded'); page.add_style_tag(content=(ROOT/'style.css').read_text(encoding='utf-8'))
        for f in ['vendor/xlsx-local-reader.js','players.js','xlsx-import.js','auction-logic.js']: page.add_script_tag(content=(ROOT/f).read_text(encoding='utf-8'))
        page.add_script_tag(content=mock); page.add_script_tag(content=(ROOT/'app.js').read_text(encoding='utf-8'))
        page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))"); page.wait_for_timeout(220)
        check(not errors,f'page errors: {errors}')

        open_map(page,'C')
        check(page.locator('[data-slot-map-slot="S1"] .slot-map-inline-row').count()==1,'C compact row missing')
        check(page.locator('[data-slot-map-slot="S1"] .slot-map-inline-first-target').inner_text().strip()=='70–80','first compact Target wrong')
        # Subsequent Target remains inline while first target is not duplicated in names stream.
        compact_text=page.locator('[data-slot-map-slot="S1"] .slot-map-inline').inner_text()
        check('60–70' in compact_text and '50–60' in compact_text and '40–50' in compact_text,'subsequent inline Targets lost')
        check('70–80' not in compact_text,'first Target duplicated into names column')

        rights=[target_right(page,'S1',True),target_right(page,'S2'),target_right(page,'S3'),target_right(page,'S4')]
        lefts=[name_left(page,'S1',True),name_left(page,'S2'),name_left(page,'S3'),name_left(page,'S4')]
        check(max(rights)-min(rights)<=0.75,f'C target axes differ at {width}: {rights}')
        check(max(lefts)-min(lefts)<=0.75,f'C name axes differ at {width}: {lefts}')
        check(compact_baseline_delta(page,'S1')<=0.75,f'C compact baseline wrong at {width}')

        wrap=wrap_geometry(page,'S1')
        check(len(wrap['tops'])>1,f'C compact row did not wrap at {width}: {wrap}')
        check(abs(wrap['secondLeft']-wrap['left'])<=1.0,f'C wrapped continuation escaped names column at {width}: {wrap}')

        # Favorite remains only on player name; first Target stays non-gold.
        fav=page.locator('[data-slot-map-player-key="c1|club"]')
        check(fav.evaluate('e=>getComputedStyle(e).fontWeight')=='700','favorite weight lost')
        gold=page.evaluate("""() => { const e=document.createElement('span');e.style.color='var(--favorite-star)';document.body.append(e);const c=getComputedStyle(e).color;e.remove();return c; }""")
        check(fav.evaluate('e=>getComputedStyle(e).color')==gold,'favorite gold lost')
        check(page.locator('.slot-map-inline-first-target').first.evaluate('e=>getComputedStyle(e).color')!=gold,'compact Target became gold')

        # D/A compact rows use the same axes as their vertical rows.
        for role in ('D','A'):
            open_map(page,role)
            rights=[target_right(page,'S1',True),target_right(page,'S2'),target_right(page,'S3'),target_right(page,'S4')]
            lefts=[name_left(page,'S1',True),name_left(page,'S2'),name_left(page,'S3'),name_left(page,'S4')]
            check(max(rights)-min(rights)<=0.75,f'{role} target axes differ at {width}: {rights}')
            check(max(lefts)-min(lefts)<=0.75,f'{role} name axes differ at {width}: {lefts}')

        # Portieri unchanged by hotfix.
        open_map(page,'P')
        check(page.locator('[data-slot-map-slot="S1"] .slot-map-inline-row').count()==0,'P S1 unexpectedly compact')
        check(page.locator('[data-slot-map-slot="S1"] .slot-map-band').count()==1,'P S1 vertical layout changed')
        check(page.locator('[data-slot-map-slot="S2"] .slot-map-band').count()==1,'P S2 vertical layout changed')
        check(page.locator('[data-slot-map-slot="S3"] .slot-map-slot-body').is_hidden(),'P S3 default state changed')
        check(page.locator('[data-slot-map-slot="S4"] .slot-map-slot-body').is_hidden(),'P S4 default state changed')
        check('COPERTURE' not in page.locator('#slotMapContent').inner_text(),'P coverage section returned')

        overflow=page.evaluate("() => { const s=document.getElementById('slotMapSheet'), c=document.getElementById('slotMapContent'); return s.scrollWidth>s.clientWidth+1 || c.scrollWidth>c.clientWidth+1; }")
        check(not overflow,f'overflow at {width}px')
        check(not errors,f'page errors after interactions at {width}: {errors}')
        page.close()
    print('v32.7.1 runtime Playwright checks: OK')
    browser.close()

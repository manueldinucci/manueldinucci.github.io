from pathlib import Path
import json, re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'<link rel="stylesheet" href="style\.css"\s*/?>', '', html)
html = re.sub(r'<script src="[^"]+"></script>', '', html)
NAMES = ['Manuel','Nicola','Cosimo','Antonio','Zafar','Lorenzo','Simone','Fabio','Honda','Torre']
managers = [{'id':f'm{i+1}','nome':n,'squadra':f'LEGACY-{i}','isMe':i==0} for i,n in enumerate(NAMES)]
players=[]
for i in range(4): players.append({'key':f'md{i}','nome':f'Manuel D{i}','squadra':'Club','ruolo':'D','slot':'S3','fvm':20,'preso':True,'prezzo_acquisto':(20 if i==3 else 19),'manager_id':'m1','manager_acquirente':'Manuel','preferito':False})
for i in range(8): players.append({'key':f'td{i}','nome':f'Torre D{i}','squadra':'Club','ruolo':'D','slot':'S4','fvm':8,'preso':True,'prezzo_acquisto':1,'manager_id':'m10','manager_acquirente':'Torre','preferito':False})
for i in range(3): players.append({'key':f'ma{i}','nome':f'Manuel A{i}','squadra':'Club','ruolo':'A','slot':'S3','fvm':30,'preso':True,'prezzo_acquisto':1,'manager_id':'m1','manager_acquirente':'Manuel','preferito':False})
players += [
 {'key':'hojlund|napoli','nome':'Højlund','squadra':'Napoli','ruolo':'A','ruolo_mantra':'Pc','slot':'S1','target_min':90,'target_max':105,'quotazione':24,'quotazione_iniziale':24,'fvm':181,'commento':'Profilo individuale di test con commento strategico abbastanza lungo da verificare il contenuto della modal.','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':False},
 {'key':'wesley|roma','nome':'Wesley','squadra':'Roma','ruolo':'D','ruolo_mantra':'E','slot':'S1','target_min':23,'target_max':25,'quotazione':18,'quotazione_iniziale':18,'fvm':90,'commento':'Test difesa','preso':False,'prezzo_acquisto':None,'manager_id':'','manager_acquirente':'','preferito':False}
]

def check(cond,msg):
    if not cond: raise AssertionError(msg)

mock = f"""
(() => {{
 let managers={json.dumps(managers, ensure_ascii=False)};
 let players={json.dumps(players, ensure_ascii=False)};
 const settings=new Map([['auctionConfig',{{budgetInitial:500,minPrice:1,basePriceMode:'1',roster:{{P:3,D:8,C:8,A:6}}}}]]);
 const normalizeText=v=>String(v??'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim().toLocaleLowerCase('it');
 window.FantaDB={{
  normalizeText,
  makePlayerKey:(n,s)=>normalizeText(n)+'|'+normalizeText(s),
  openDB:async()=>true, purgeLegacyDemoPlayers:async()=>{{}},
  getSetting:async(k,f=null)=>settings.has(k)?settings.get(k):f,
  setSetting:async(k,v)=>{{settings.set(k,v);}},
  getManagers:async()=>managers.map(m=>({{id:m.id,nome:m.nome,isMe:!!m.isMe}})),
  replaceManagers:async rows=>{{managers=rows.filter(r=>r.nome).map((r,i)=>({{id:String(r.id||('new'+i)),nome:String(r.nome).trim(),isMe:!!r.isMe}})); return managers;}},
  getCombinedPlayers:async()=>players,
  updatePersonal:async(k,patch)=>{{const p=players.find(x=>x.key===k); if(p) Object.assign(p,patch);}},
  updateAuction:async(k,patch)=>{{const p=players.find(x=>x.key===k); if(p) Object.assign(p,patch);}},
  resetAuction:async()=>{{players.forEach(p=>Object.assign(p,{{preso:false,prezzo_acquisto:null,manager_id:'',manager_acquirente:''}}));}},
  resetAll:async()=>{{players=[];managers=[];settings.clear();}},
  addFullPlayer:async raw=>{{players.push(raw);return raw.key;}}, removePlayer:async k=>{{players=players.filter(p=>p.key!==k);}},
  exportBackupObject:async()=>({{format:'fantacalcio-checklist-backup',version:4,playersBase:[],playersPersonal:[],auctionState:[],managers,settings:[],meta:[]}}),
  importBackupObject:async()=>{{}}, importBasePlayers:async()=>({{}})
 }};
}})();
"""

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':390,'height':844})
    errors=[]; page.on('pageerror',lambda e: errors.append(str(e)))
    page.set_content(html, wait_until='domcontentloaded')
    page.add_style_tag(content=(ROOT/'style.css').read_text(encoding='utf-8'))
    for f in ['vendor/xlsx-local-reader.js','players.js','xlsx-import.js','auction-logic.js']:
        page.add_script_tag(content=(ROOT/f).read_text(encoding='utf-8'))
    page.add_script_tag(content=mock)
    page.add_script_tag(content=(ROOT/'app.js').read_text(encoding='utf-8'))
    page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
    page.wait_for_timeout(250)
    check(not errors,f'page errors: {errors}')

    check(page.locator('.header-actions > button').count()==5,'toolbar must have five buttons')
    check(page.locator('#compactHeaderBtn').count()==0,'Comprimi still present')
    for width in (390,360):
        page.set_viewport_size({'width':width,'height':844}); page.wait_for_timeout(20)
        check(not page.evaluate("() => {const e=document.querySelector('.title-row');return e.scrollWidth>e.clientWidth+1}"),f'header overflow at {width}')
    page.set_viewport_size({'width':390,'height':844})

    page.locator('[data-role="D"]').click(); page.wait_for_timeout(30)
    def cell(code, grid='.demand-needs-grid'):
        return page.locator(f'{grid} .demand-participant-cell').filter(has_text=code).first
    check(cell('MANUE').locator('.demand-participant-value').inner_text()=='4/8','MANUE 4/8 missing')
    check(cell('TORRE').locator('.demand-participant-value').inner_text()=='8/8','TORRE 8/8 missing')
    check(float(cell('TORRE').evaluate('e=>getComputedStyle(e).opacity'))<.6,'complete cell not attenuated')
    codes=[x.inner_text() for x in page.locator('.demand-needs-grid .demand-participant-code').all()]
    for code in ['MANUE','NICOL','COSIM','ANTON','ZAFAR','LOREN','SIMON','FABIO','HONDA','TORRE']: check(code in codes,f'{code} missing')
    check('FAB:' not in page.locator('#demandSummary').inner_text(),'FAB visible')

    page.locator('#menuBtn').click(); page.locator('#manageManagersBtn').click(); page.wait_for_timeout(20)
    check(page.locator('#managerConfigSheet [data-field="nome"]').count()==10,'manager names missing')
    check(page.locator('#managerConfigSheet [data-field="squadra"]').count()==0,'secondary identifier visible')
    page.locator('#configD').select_option('7'); page.locator('#managerConfigForm').evaluate('f=>f.requestSubmit()'); page.wait_for_timeout(80)
    check(cell('MANUE').locator('.demand-participant-value').inner_text()=='4/7','quota 8->7 did not update')

    page.locator('#participantsHeaderBtn').click(); check(page.locator('.demand-participant-grid').count()==0,'participants OFF failed')
    check('S1:' in page.locator('#demandSummary').inner_text() and 'FAB:' not in page.locator('#demandSummary').inner_text(),'slot-only row failed')
    page.locator('#privacyHeaderBtn').click(); check(page.locator('#demandSummary').evaluate('e=>e.classList.contains("hidden")'),'privacy failed')
    page.locator('#privacyHeaderBtn').click(); check(not page.locator('#demandSummary').evaluate('e=>e.classList.contains("hidden")'),'privacy restore failed')
    check(page.locator('.demand-participant-grid').count()==0,'participants state not restored')
    page.locator('#participantsHeaderBtn').click()

    page.locator('[data-role="A"]').click(); page.wait_for_timeout(30)
    check(cell('MANUE').locator('.demand-participant-value').inner_text()=='3/6','attack 3/6 missing')
    check(page.locator('.demand-max-bid-label').inner_text()=='MAX BID','MAX BID label missing')
    check('/' not in page.locator('.demand-max-bid-grid .demand-participant-value').first.inner_text(),'MAX BID wrongly X/Y')

    page.locator('[data-view="rose"]').click(); page.wait_for_timeout(30)
    manuel=page.locator('.rose-manager').filter(has_text='Manuel').first
    check('420 CR RIM.' in manuel.locator('.rose-manager-head').inner_text().replace('\n',' '),'CR RIM wrong')
    check(manuel.get_attribute('open') is not None,'Rose not open by default')
    colors=page.evaluate("() => [getComputedStyle(document.querySelector('.dashboard-sheet-scroll')).backgroundColor,getComputedStyle(document.querySelector('.rose-manager')).backgroundColor,getComputedStyle(document.querySelector('.rose-manager-head')).backgroundColor,getComputedStyle(document.querySelector('.rose-role-row')).backgroundColor,getComputedStyle(document.querySelectorAll('.rose-role-row')[1]).backgroundColor]")
    check(len(set(colors))>=4,f'Rose gray hierarchy insufficient {colors}')
    page.locator('#sheetBackdrop').click(position={'x':2,'y':2}); page.wait_for_timeout(20)

    page.locator('[data-role="A"]').click(); page.wait_for_timeout(20)
    card=page.locator('.player-card').filter(has_text='Højlund').first; card.locator('.player-main').click(); page.wait_for_timeout(20)
    modal=page.locator('#playerSheet'); check(page.locator('#playerSheet .sheet-handle').count()==0,'player handle remains'); check(page.locator('#competitorsSection').count()==0,'competition remains')
    box=modal.bounding_box(); cx=box['x']+box['width']/2; cy=box['y']+box['height']/2
    check(abs(cx-195)<3 and abs(cy-422)<12,f'modal not centered {(cx,cy)}')
    page.locator('#sheetBackdrop').click(position={'x':2,'y':2}); page.wait_for_timeout(20); check(modal.evaluate('e=>e.classList.contains("hidden")'),'click outside failed')
    card.locator('.player-main').click(); page.locator('#toggleFavoriteSheet').click(); page.wait_for_timeout(30); check(page.locator('#toggleFavoriteSheet').inner_text()=='★','favorite failed')
    page.locator('#toggleTakenSheet').click(); page.wait_for_timeout(20); check(page.locator('#assignmentSheet:not(.hidden)').count()==1,'assignment sheet failed')
    page.locator('#assignmentManager').select_option('m1'); page.locator('#assignmentPrice').select_option('1'); page.locator('#confirmAssignmentBtn').click(); page.wait_for_timeout(60)
    check(page.locator('.player-card').filter(has_text='Højlund').first.locator('.assign-btn.assigned').count()==1,'assignment failed')

    page.locator('#menuBtn').click(); page.locator('#manageManagersBtn').click(); page.wait_for_timeout(20)
    config=page.locator('#managerConfigSheet'); scroller=config.locator('.manager-config-scroll')
    check(scroller.count()==1,'config one scroller missing'); check(config.evaluate('e=>getComputedStyle(e).overflowY')=='hidden','config sheet nested scrolling'); check(scroller.evaluate('e=>getComputedStyle(e).overflowY')=='auto','config scroller inactive')
    page.evaluate("() => {const r=document.documentElement;r.style.setProperty('--visual-viewport-top','20px');r.style.setProperty('--visual-viewport-height','500px');document.querySelector('#managerConfigSheet').classList.add('keyboard-open')}")
    kb=config.bounding_box(); check(kb['y']>=23 and kb['height']<=493,f'visual viewport binding failed {kb}')
    check(not errors,f'page errors after interactions: {errors}')
    print('v31.10 runtime Playwright checks: OK')
    browser.close()

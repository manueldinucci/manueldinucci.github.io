from pathlib import Path
import re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'<link rel="stylesheet" href="style\.css"\s*/?>', '', html)
html = re.sub(r'<script src="[^"]+"></script>', '', html)
css = (ROOT / 'style.css').read_text(encoding='utf-8')

def check(cond, msg):
    if not cond:
        raise AssertionError(msg)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage'])
    for width in (390, 360):
        page = browser.new_page(viewport={'width': width, 'height': 844})
        page.set_content(html, wait_until='domcontentloaded')
        page.add_style_tag(content=css)
        page.wait_for_timeout(80)

        kicker = page.locator('.eyebrow')
        title = page.locator('.title-row h1')
        row = page.locator('.title-row')
        actions = page.locator('.header-actions')

        check(kicker.inner_text() == "Direttore's", f'wrong kicker at {width}px')
        check(title.inner_text() == 'Aurea XI', f'wrong title at {width}px')
        check(kicker.evaluate("e=>getComputedStyle(e).fontStyle") == 'italic', f'kicker not italic at {width}px')
        check(int(kicker.evaluate("e=>parseInt(getComputedStyle(e).fontWeight,10)")) <= 500, f'kicker too heavy at {width}px')
        check(title.evaluate("e=>getComputedStyle(e).fontStyle") == 'normal', f'title unexpectedly italic at {width}px')
        check(title.evaluate("e=>e.scrollWidth <= e.clientWidth + 1"), f'title wraps/overflows at {width}px')
        check(title.evaluate("e=>e.getClientRects().length === 1"), f'title uses multiple lines at {width}px')
        check(row.evaluate("e=>e.scrollWidth <= e.clientWidth + 1"), f'header row overflows at {width}px')

        # Brand block and header actions must not collide.
        r_title = title.bounding_box(); r_actions = actions.bounding_box()
        check(r_title and r_actions and r_title['x'] + r_title['width'] <= r_actions['x'] - 4,
              f'brand collides with header actions at {width}px: {r_title} / {r_actions}')

        page.screenshot(path=str(ROOT / 'tests' / f'v33-header-{width}.png'), full_page=False)
        page.close()

    browser.close()
    print('v33 runtime header: OK')

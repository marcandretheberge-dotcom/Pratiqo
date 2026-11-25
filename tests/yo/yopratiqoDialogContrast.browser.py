"""Actual Italian routes + production CSS. No account, audio stub or security bypass."""
import json
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path(os.environ.get('YO_QA_DIR', '/tmp/yo-dialog-contrast'))
out.mkdir(parents=True, exist_ok=True)
base = os.environ.get('YO_BASE_URL', 'http://127.0.0.1:3134').rstrip('/')
baseline = os.environ.get('YO_EXPECT_BUG') == '1'
locales = os.environ.get('YO_LOCALES', 'fr,en,es').split(',')
engines = os.environ.get('YO_ENGINES', 'chromium,webkit').split(',')
copy = {
    'fr': ('Carnet de mots', 'Yoppo et mes outils', 'Fermer', 'Commencer ma mission'),
    'en': ('Word notebook', 'Yoppo and my tools', 'Close', 'Start my mission'),
    'es': ('Cuaderno de palabras', 'Yoppo y mis herramientas', 'Cerrar', 'Empezar mi misión'),
}
measure = """dialog => {
  const canvas = document.createElement('canvas'); canvas.width=canvas.height=1;
  const ctx=canvas.getContext('2d');
  const rgba=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return Array.from(ctx.getImageData(0,0,1,1).data)};
  const luminance=color=>rgba(color).slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const background=getComputedStyle(dialog).backgroundColor, bg=luminance(background);
  const samples=Array.from(dialog.querySelectorAll('p,h2,h3')).filter(el=>el.textContent.trim()&&getComputedStyle(el).display!=='none').map(el=>{
    const color=getComputedStyle(el).color,fg=luminance(color);
    return {text:el.textContent.trim().slice(0,100),color,contrast:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)};
  });
  return {background,colorScheme:getComputedStyle(dialog).colorScheme,body:getComputedStyle(document.body).color,samples};
}"""
report = []

def saved(page):
    return page.evaluate("Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('yo.italian.')||k.startsWith('yo.learning-profile.')).sort().map(k=>[k,localStorage.getItem(k)]))")

def notices(page):
    banner = page.get_by_test_id('cookie-consent-banner')
    if banner.count() and banner.is_visible():
        banner.get_by_role('button', name=re.compile('Necessary only|Nécessaires seulement|Nécessaires uniquement|Solo necesarias', re.I)).click()
    later = page.get_by_role('button', name=re.compile('^(Not now|Pas maintenant|Ahora no)$'))
    if later.count() and later.first.is_visible():
        later.first.click()

with sync_playwright() as pw:
    for engine in (['webkit'] if baseline else engines):
        browser = getattr(pw, engine).launch()
        for theme in (['dark'] if baseline else ['light', 'dark']):
            for locale in (['fr'] if baseline else locales):
                for unit in (['u09'] if baseline else ['u01', 'u09']):
                    name = f'{engine}-{theme}-{locale}-{unit}'
                    context = browser.new_context(viewport={'width':390,'height':844}, has_touch=True, is_mobile=True, color_scheme=theme, reduced_motion='reduce')
                    # Only a local manual starting-point preference; no fabricated progress/achievements.
                    context.add_init_script(f"""if(!localStorage.getItem('yo.learning-profile.v1.it')){{localStorage.setItem('yo.learning-profile.v1.it',JSON.stringify({{version:1,language:'it',experience:'rusty',goal:'conversation',weeklyMinutes:60,startUnitId:'{unit}',placement:'manual',reviewUnitIds:[],updatedAt:Date.now()}}));localStorage.setItem('yo.italian.guided.tour.v1','seen');}}""")
                    page = context.new_page(); page.set_default_timeout(20000)
                    errors = []; page.on('pageerror', lambda error: errors.append(str(error)))
                    notebook, tools, close, start = copy[locale]
                    try:
                        response=page.goto(f'{base}/yo/langues/italien/parcours/{unit}?lang={locale}', wait_until='domcontentloaded', timeout=60000)
                        assert response and response.status == 200
                        shell=page.locator('[data-guided-italian]'); shell.wait_for(timeout=60000)
                        notices(page)
                        if unit=='u09':
                            shell.get_by_role('button',name=start,exact=True).click()
                            shell.locator('main h1').wait_for()
                        before=saved(page)
                        for panel, label in [('notebook',notebook),('tools',tools)]:
                            trigger=shell.get_by_role('button',name=label,exact=True)
                            trigger.click(); dialog=page.get_by_role('dialog'); dialog.wait_for()
                            assert dialog.evaluate("el=>!document.querySelector('[data-guided-italian]').contains(el)"), 'Must test the actual portal'
                            if panel=='notebook': assert dialog.locator('p[lang=it]').count()>0, 'Must include actual vocabulary'
                            data=dialog.evaluate(measure)
                            assert len(data['samples'])>=3
                            worst=min(x['contrast'] for x in data['samples'])
                            if baseline:
                                assert worst < 1.5, f'Expected the reported low contrast, got {worst}'
                            else:
                                assert worst >= 4.5, json.dumps(data,ensure_ascii=False)
                                assert data['colorScheme']=='light'
                                if theme=='dark': assert data['body']=='rgb(232, 234, 230)', 'Do not disable the site dark theme'
                                for width in [320,390,1280]:
                                    page.set_viewport_size({'width':width,'height':844})
                                    bounds=dialog.bounding_box()
                                    assert bounds and bounds['x']>=0 and bounds['x']+bounds['width']<=width+1
                                    assert dialog.evaluate('el=>el.scrollWidth<=el.clientWidth+1')
                                page.set_viewport_size({'width':390,'height':844})
                                for _ in range(8):
                                    page.keyboard.press('Tab')
                                    assert dialog.evaluate('el=>el.contains(document.activeElement)')
                            dialog.evaluate('el=>{el.scrollTop=0}')
                            if locale=='fr': page.screenshot(path=str(out/f'{name}-{panel}.png'),full_page=True)
                            dialog.evaluate('el=>{el.scrollTop=el.scrollHeight}')
                            assert dialog.evaluate('el=>el.scrollHeight<=el.clientHeight||el.scrollTop>0')
                            if panel=='notebook': page.keyboard.press('Escape')
                            else: dialog.get_by_role('button',name=close,exact=True).click()
                            dialog.wait_for(state='hidden')
                            report.append({'case':name,'panel':panel,'minimumContrast':worst,'measurements':data})
                        assert saved(page)==before, 'Opening tools must preserve learning progress and preferences'
                        assert not errors, errors
                        (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
                        print(f"PASS {name}: both portals, contrast, close, scrolling, unchanged progression",flush=True)
                    except Exception:
                        page.screenshot(path=str(out/f'failure-{name}.png'),full_page=True)
                        (out/f'failure-{name}.txt').write_text(page.locator('body').inner_text())
                        (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
                        raise
                    finally: context.close()
        browser.close()
print(f'{len(report)} dialog checks completed. Physical iPhone not claimed.',flush=True)

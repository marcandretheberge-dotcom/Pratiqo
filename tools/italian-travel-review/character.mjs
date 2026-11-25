import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const {chromium}=createRequire(path.resolve(process.argv[2]))('playwright');
const browser=await chromium.launch({executablePath:process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined});
try {
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3});
  await page.goto('http://127.0.0.1:55810/?scenario=checkpoint');
  await page.getByRole('button',{name:'Passer',exact:true}).click();
  await page.getByRole('button',{name:'Voyage et équipement',exact:true}).click();
  await page.getByRole('switch',{name:'Équiper le scooter'}).click();
  await page.getByRole('button',{name:'Fermer l’équipement',exact:true}).click();
  const geometry=await page.locator('[data-yoppo-traveler]').evaluate(rig=>{
    const point=(selector,x,y)=>{const p=new DOMPoint(x,y).matrixTransform(rig.querySelector(selector).getScreenCTM());return{x:p.x,y:p.y};};
    return {front:point('.yo-map-front-arm',14,88),back:point('.yo-map-back-arm',84,85),
      grip1:point('.yo-travel-scooter',45,22),grip2:point('.yo-travel-scooter',72,22),end:point('.yo-travel-scooter',85,22),
      armTransform:getComputedStyle(rig.querySelector('.yo-map-back-arm')).transform};
  });
  const box=await page.locator('[data-yoppo-traveler]').boundingBox();
  const out=path.resolve('build/italian-travel-review/evidence');
  await fs.mkdir(out,{recursive:true});
  await page.screenshot({path:path.join(out,'yoppo-riding-closeup.png'),clip:{x:box.x-20,y:box.y-15,width:120,height:125}});
  await fs.writeFile(path.join(out,'riding-geometry.json'),JSON.stringify(geometry,null,2));
  console.log(JSON.stringify(geometry));
} finally {await browser.close();}

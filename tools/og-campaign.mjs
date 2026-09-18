// Campaign OG candidate: practice run on a sector (free cheats), titans recruited,
// wave rushed at speed, then HUD hidden + ruptures + shutter. Same env knobs as og-shot.mjs
// plus SECTOR (0..2), WAVE (0..3, set before the wave loads), TITANS, GUARDS, RUNS (recruit(1)), LANCERS (recruit(2)).
import {launch, sleep, until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const env = (k, d) => process.env[k] ?? d;
const out = process.argv[2] || 'og-image.png';
const page = await launch({port: +env('PORT', 9370), width: 1200, height: 630});
try {
  await page.goto(pathToFileURL(resolve(env('FILE', 'index.html'))).href + '#sandbox');
  await until(() => page.eval(`!!window.SendDudes && document.getElementById('boot').hidden`), {timeout: 60000, label: 'boot'});
  await page.eval(`(()=>{const SD=window.SendDudes;SD.settings.blood=true;SD.settings.shadows=true;SD.settings.reduced=false;SD.settings.shake=false;SD.settings.resolution='1';
    SD.progress.data.clears=[true,true,true];
    for(const el of document.querySelectorAll('.hud,.masthead,.veil,#boot'))el.style.visibility='hidden';document.body.style.cursor='none';})()`);
  await page.eval(`window.SendDudes.launchSector(${env('SECTOR', 2)},false,true)`);
  await until(() => page.eval(`window.SendDudes.gpu.state==='fighting'`), {timeout: 30000, label: 'sector'});
  const wave = +env('WAVE', 0);
  if (wave > 0) {
    // jump waves: mark the run as between waves and let chooseReward load the next one
    for (let w = 0; w < wave; w++) {
      await page.eval(`(async()=>{const SD=window.SendDudes;const run=SD.getRun();run.phase='salvage';run.wave=${w};await SD.chooseReward('coils');})()`);
      await sleep(800);
    }
    await page.eval(`(()=>{const SD=window.SendDudes;SD.gpu.state='fighting';SD.getRun().phase='battle';SD.pause(false);})()`);
  }
  await page.eval(`(()=>{const SD=window.SendDudes;SD.getRun().demoUnlocked=true;SD.getRun().supply=1e6;if(${env('MORTAL', 0)})SD.applyCheats({guard:false,core:true,free:true,rapid:true},false);
    for(let i=0;i<${env('TITANS', 6)};i++)SD.recruit(3,true);for(let i=0;i<${env('GUARDS', 20)};i++)SD.recruit(0,true);for(let i=0;i<${env('BRUTES', 10)};i++)SD.recruit(1,true);for(let i=0;i<${env('LANCERS', 10)};i++)SD.recruit(2,true);})()`);
  const steps = +env('STEPS', 900);
  for (let done = 0; done < steps; done += 300) await page.eval(`window.SendDudes.step(${Math.min(300, steps - done)})`);
  await page.eval(`(()=>{const v=window.SendDudes.view;v.s=${env('S', 18)};v.x=${env('X', 0)};v.y=${env('Y', 0)};})()`);
  const at = env('CASTAT', '') ? env('CASTAT').split(';').map(p => p.split(',').map(Number)) : [];
  for (const [dx, dy] of at) { await page.eval(`(()=>{const SD=window.SendDudes;SD.gpu.cooldown=0;SD.cast(SD.view.x+${dx},SD.view.y+${dy});})()`); await page.eval(`window.SendDudes.step(${env('CASTTICKS', 6)})`); }
  await page.eval(`window.SendDudes.step(${env('SETTLETICKS', 2)})`);
  await sleep(400);
  const rep = JSON.parse(await page.eval('JSON.stringify(window.SendDudes.report())'));
  console.log(out, 'state', rep.battle.state, 'alive', rep.battle.alive, 'tick', rep.battle.tick, 'mission', JSON.stringify(rep.battle.mission), 'roster', JSON.stringify(rep.battle.roster));
  await page.shot(out);
  if (page.logs.length) console.log(page.logs.slice(0, 10));
} catch (e) { console.error(out, 'FAIL', e.message, page.logs.slice(0, 10)); await page.shot(out.replace('.png', '-fail.png')).catch(() => {}); }
finally { page.kill(); }

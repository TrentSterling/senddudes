// Renders og-image.png (1200x630) from the real game on the real GPU: a 200k
// sandbox battle run fast so blood piles up, HUD hidden, camera on the
// frontline, a few ruptures fired right before the shutter.
//   node tools/og-shot.mjs [out.png]
// env: PRESET (demo-200k|elite-200k|ranged-20k), SPEED, WAIT (real seconds of
// fast sim), S (zoom), X, Y (world camera offset), CASTS, CASTGAP (ms), FILE
import {launch, sleep, until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const env = (k, d) => process.env[k] ?? d;
const out = process.argv[2] || 'og-image.png';
const file = env('FILE', 'index.html');
const page = await launch({port: +env('PORT', 9362), width: 1200, height: 630});
try {
  await page.goto(pathToFileURL(resolve(file)).href + '#' + env('PRESET', 'elite-200k'));
  await until(() => page.eval(`!!window.SendDudes && document.getElementById('boot').hidden && window.SendDudes.gpu.state==='fighting'`), {timeout: 60000, label: 'boot'});
  await page.eval(`(()=>{const SD=window.SendDudes;SD.settings.blood=true;SD.settings.shadows=true;SD.settings.reduced=false;SD.settings.shake=false;SD.settings.resolution='1';
    for(const el of document.querySelectorAll('.hud,.masthead,.veil,#boot'))el.style.visibility='hidden';
    document.body.style.cursor='none';SD.setSpeed(${env('SPEED', 8)});})()`);
  await sleep(+env('WAIT', 12) * 1000);
  await page.eval(`window.SendDudes.setSpeed(1)`);
  await sleep(300);
  await page.eval(`(()=>{const v=window.SendDudes.view;v.s=${env('S', 30)};v.x=${env('X', 0)};v.y=${env('Y', 0)};})()`);
  // CASTAT="dx,dy;dx,dy" fires ruptures at fixed offsets from the camera; else CASTS random ones within CASTR.
  const at = env('CASTAT', '') ? env('CASTAT').split(';').map(p => p.split(',').map(Number)) : Array.from({length: +env('CASTS', 3)}, () => { const a = Math.random() * 6.283, d = Math.random() * +env('CASTR', 6); return [Math.cos(a) * d, Math.sin(a) * d]; });
  for (const [dx, dy] of at) {
    await page.eval(`(()=>{const SD=window.SendDudes;const v=SD.view;SD.gpu.cooldown=0;SD.cast(v.x+${dx},v.y+${dy});})()`);
    await sleep(+env('CASTGAP', 450));
  }
  await sleep(+env('SETTLE', 250));
  const rep = JSON.parse(await page.eval('JSON.stringify(window.SendDudes.report())'));
  console.log('alive', rep.battle.alive, 'tick', rep.battle.tick, 'visible', rep.rendering.visible, 'corpses', rep.rendering.corpses);
  await page.shot(out);
  console.log('wrote', out, page.logs.length ? page.logs : '');
} finally { page.kill(); }

// Headless verify on the real GPU: boots the exact HTML (or a live URL), waits for the
// self-check, runs the 200k showcase, steps the sim, checks the campaign starts, checks
// no console errors, and writes tools/out/qa-*.png.
//   node tools/verify.mjs [index.html | https://tront.xyz/senddudes/]
import {launch, sleep, until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const target = process.argv[2] || 'index.html';
const url = /^https?:/.test(target) ? target : pathToFileURL(resolve(target)).href;
const page = await launch({port: +(process.env.PORT || 9380), width: 1280, height: 800});
const results = [];
const check = (name, ok, info = '') => { results.push([name, !!ok]); console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (info ? '  ' + info : '')); };
try {
  await page.goto(url + '#demo-200k');
  await until(() => page.eval(`!!window.SendDudes && document.getElementById('boot').hidden`), {timeout: 60000, label: 'boot'});
  check('boots with WebGPU', await page.eval('!!navigator.gpu && !!window.SendDudes'));
  await until(() => page.eval(`window.SendDudes.gpu.state==='fighting'`), {timeout: 30000, label: 'showcase'});
  await sleep(3000);
  let r = JSON.parse(await page.eval('JSON.stringify(window.SendDudes.report())'));
  check('build string', r.build.startsWith('send-dudes-0.4.3'), r.build);
  check('hardware adapter', r.environment.adapter && !r.environment.adapter.fallback, JSON.stringify(r.environment.adapter));
  check('self-check passed', r.selfCheck?.passed, r.selfCheck?.kind);
  check('200k showcase deployed', r.battle.initial[0] + r.battle.initial[1] === 200000, JSON.stringify(r.battle.initial));
  check('sim advancing', r.battle.tick > 60, 'tick ' + r.battle.tick);
  check('frame p95 under 40ms', r.performance.submittedFrameMs.p95 < 40, 'p95 ' + r.performance.submittedFrameMs.p95?.toFixed(1));
  check('dudes drawn', r.rendering.visible > 1000 && r.rendering.drawCalls > 0, 'visible ' + r.rendering.visible + ' draws ' + r.rendering.drawCalls);
  await page.shot('tools/out/qa-showcase.png');
  const before = r.battle.tick;
  await page.eval('window.SendDudes.step(120)');
  r = JSON.parse(await page.eval('JSON.stringify(window.SendDudes.report())'));
  check('manual step advances 120 ticks', r.battle.tick - before >= 120, `${before} -> ${r.battle.tick}`);
  check('casualties accumulate', r.battle.stats.guardDeaths + r.battle.stats.broodDeaths > 0, JSON.stringify([r.battle.stats.guardDeaths, r.battle.stats.broodDeaths]));
  await page.eval('window.SendDudes.launchSector(0,false,true)');
  await until(() => page.eval(`window.SendDudes.gpu.state==='fighting' && !!window.SendDudes.getRun()`), {timeout: 30000, label: 'campaign'});
  await page.eval('window.SendDudes.step(240)');
  r = JSON.parse(await page.eval('JSON.stringify(window.SendDudes.report())'));
  check('practice campaign runs', r.battle.mission && r.battle.mission.sector === 0 && r.battle.tick >= 240, JSON.stringify(r.battle.mission));
  check('recruit works', await page.eval('window.SendDudes.recruit(0,true)'));
  await page.shot('tools/out/qa-campaign.png');
  for (const id of ['helpModal', 'aboutModal', 'settingsModal', 'rosterModal']) {
    const ok = await page.eval(`(()=>{const m=document.getElementById('${id}');return !!m;})()`);
    check('modal exists: ' + id, ok);
  }
  check('about links use tront.xyz/discord/', await page.eval(`[...document.querySelectorAll('a[href*="discord"]')].every(a=>a.href.startsWith('https://tront.xyz/discord/'))`));
  check('no em dashes in page text', await page.eval(`!document.body.innerText.includes('\u2014')`));
  check('og:image points at tront.xyz/senddudes', await page.eval(`document.querySelector('meta[property="og:image"]').content.startsWith('https://tront.xyz/senddudes/og-image.png')`));
  const bad = page.logs.filter(l => /^(error|EXCEPTION)/.test(l));
  check('no console errors', bad.length === 0, bad.slice(0, 3).join(' | '));
} catch (e) {
  check('harness completed', false, e.message + ' ' + page.logs.slice(0, 5).join(' | '));
  await page.shot('tools/out/qa-fail.png').catch(() => {});
} finally { page.kill(); }
const pass = results.filter(r => r[1]).length;
console.log(`\n${pass}/${results.length} checks passed  (${target})`);
process.exit(pass === results.length ? 0 : 1);

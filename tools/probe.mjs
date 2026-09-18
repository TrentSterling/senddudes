// Boots the game headless on the real GPU and dumps adapter + report. node tools/probe.mjs [file] [hash]
import {launch, sleep, until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const file = process.argv[2] || 'index.html';
const hash = process.argv[3] || '';
const page = await launch({port: 9361, width: 1280, height: 800, headless: process.env.HEADED ? false : true});
try {
  await page.goto(pathToFileURL(resolve(file)).href + hash);
  console.log('gpu?', await page.eval('!!navigator.gpu'));
  await until(() => page.eval(`!!window.SendDudes && document.getElementById('boot').hidden`), {timeout: 60000, label: 'boot'});
  await sleep(4000);
  const r = await page.eval('JSON.stringify(window.SendDudes.report())');
  const j = JSON.parse(r);
  console.log('adapter', JSON.stringify(j.environment.adapter));
  console.log('selfCheck', JSON.stringify(j.selfCheck)?.slice(0, 300));
  console.log('battle', j.battle.state, j.battle.alive, 'tick', j.battle.tick);
  console.log('perf', JSON.stringify(j.performance.submittedFrameMs), 'speed', j.performance.achievedSpeed);
  await page.shot('tools/out/probe.png');
  console.log('logs', page.logs.slice(0, 30));
} catch (e) { console.error('FAIL', e.message, page.logs.slice(0, 30)); await page.shot('tools/out/probe-fail.png').catch(()=>{}); process.exitCode = 1; }
finally { page.kill(); }

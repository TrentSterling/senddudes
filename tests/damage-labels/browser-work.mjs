// Real normal-input battle followed by a window resize. Diagnostic timings are
// label-layout CPU work on these samples, not FPS or a GPU benchmark.
import {launch,sleep,until} from '../../tools/cdp.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:net';
const out=process.env.LABEL_WORK_OUT||'tools/out/layout-browser-work';mkdirSync(out,{recursive:true});
const before=execFileSync('git',['show','04b6d979:index.html'],{encoding:'utf8'}),after=readFileSync('index.html','utf8');
writeFileSync(`${out}/before.html`,before);
const source=html=>html.slice(html.indexOf('class DamageLabelLayout {'),html.indexOf('class DamageText {'));
async function freePort(){const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const n=s.address().port;await new Promise(r=>s.close(r));return n;}
const results=[];
for(const version of ['before','after']){
 const p=await launch({port:await freePort(),width:1600,height:900}),trace=[];
 const tap=async(code,key)=>{trace.push({code,key,at:Date.now()});await p.call('Input.dispatchKeyEvent',{type:'keyDown',code,key});await sleep(50);await p.call('Input.dispatchKeyEvent',{type:'keyUp',code,key});};
 try{
  await p.goto(pathToFileURL(resolve(version==='before'?`${out}/before.html`:'index.html')).href);
  await until(()=>p.eval('!!window.Arena&&document.querySelector("#boot").hidden'),{timeout:60000});
  const button=await p.eval('(()=>{const r=document.querySelector("#menu200").getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()');
  await p.mouse('mousePressed',button.x,button.y);await p.mouse('mouseReleased',button.x,button.y);trace.push({click:'200,000 DUDES',...button});await sleep(4000);
  for(let i=0;i<8;i++){await p.call('Input.dispatchMouseEvent',{type:'mouseWheel',x:740,y:400,deltaX:0,deltaY:-80});await sleep(70);}trace.push({wheel:-640});
  await p.eval(`window.layoutDraws=[];const d=Arena.numbers.draw;Arena.numbers.draw=function(...args){const t=performance.now();const r=d.apply(this,args);layoutDraws.push({ms:performance.now()-t,w:args[1].w,h:args[1].h,labels:this.live.length});if(layoutDraws.length>100)layoutDraws.shift();return r;}`);
  await tap('KeyE','e');await p.mouse('mousePressed',770,420);await p.mouse('mouseReleased',770,420);trace.push({click:'Rupture',x:770,y:420});await sleep(100);
  await p.call('Emulation.setDeviceMetricsOverride',{width:390,height:240,deviceScaleFactor:1,mobile:false});trace.push({resize:[390,240]});await sleep(150);
  await p.eval('Arena.manual=true');await sleep(100);
  await p.shot(`${out}/${version}-normal-resize.png`);
  await p.eval(`window.BeforeLayout=(()=>{${source(before)};return DamageLabelLayout;})();window.AfterLayout=(()=>{${source(after)};return DamageLabelLayout;})();`);
  const result=await p.eval(`(()=>{
   const live=Arena.numbers,view={...Arena.view},clock=live.clock,renderer=new live.constructor(),items=[];
   for(const original of live.live){const p={...original},age=Math.max(0,clock-p.born),t=age/p.life;
    const x=(p.x-view.x)*view.s+view.w*.5+p.drift*t,y=(p.y-view.y)*view.s*.76+view.h*view.cy-Math.min(110,Math.max(12,view.s*(p.core?3.5:p.flags&1?2.4:1.05)))-p.lift*t;
    if(x< -100||x>view.w+100||y<8-60||y>view.h-8+60)continue;
    const text=(p.core?'CORE −':p.count>1?'Σ':'')+(p.cents/100).toFixed(p.cents%100===0?0:p.cents%10===0?1:2),color=p.team===0?'#ffaaa0':p.heavy?'#ffe29a':'#f5f7e5',s=renderer.sprite(text,color),bounce=1+Math.sin(Math.min(1,age/.14)*Math.PI)*.18,scale=p.size/30*bounce,envelope=p.size/30*(age<.14?1.18:1);
    items.push({p,x:x+(s.ink.x+s.ink.w*.5-s.w*.5)*scale,y:y+(s.ink.y+s.ink.h*.5-s.h*.5)*scale,w:s.ink.w*envelope+4,h:s.ink.h*envelope+4});
   }
   const compare=(Class,fixture,width=view.w,height=view.h)=>{const input=structuredClone(fixture),layout=new Class(width,8,height-8);let cellQueries=0;const f=layout.cellsFor;layout.cellsFor=function(...args){cellQueries++;return f.apply(this,args)};const start=performance.now(),positions=layout.arrange(input);return{ms:performance.now()-start,cellQueries,candidates:layout.probes,comparisons:layout.comparisons,count:positions.length,valuesUnchanged:JSON.stringify(input.map(i=>[i.p.cents,i.p.count]))===JSON.stringify(fixture.map(i=>[i.p.cents,i.p.count]))};};
   const fixture=Array.from({length:160},()=>({p:{cents:100,count:1},x:195,y:120,w:85,h:24}));
   const reviewFixture=fixture.map(i=>({...i,y:422})),fittingFixture=reviewFixture.map(i=>({...i,w:70}));
   return {unitCount:Arena.gpu.n,speed:Arena.speed,time:Arena.gpu.time,view,liveLabels:live.live.length,eligibleLabels:items.length,area:items.reduce((a,p)=>a+p.w*p.h,0),availableArea:(view.w-4)*(view.h-20),actualBefore:compare(BeforeLayout,items),actualAfter:compare(AfterLayout,items),syntheticBefore:compare(BeforeLayout,fixture),syntheticAfter:compare(AfterLayout,fixture),reviewFixture:{dimensions:[390,844],labelSize:[85,24],before:compare(BeforeLayout,reviewFixture,390,844),after:compare(AfterLayout,reviewFixture,390,844)},fittingFixture:{dimensions:[390,844],labelSize:[70,24],before:compare(BeforeLayout,fittingFixture,390,844),after:compare(AfterLayout,fittingFixture,390,844)},nativeDrawSamples:layoutDraws.filter(d=>d.w===390),actualItems:items};
  })()`);
  results.push({version,...result,trace,errors:p.logs.filter(x=>/^(error|EXCEPTION)/.test(x))});
  console.log(JSON.stringify({version,unitCount:result.unitCount,speed:result.speed,eligibleLabels:result.eligibleLabels,overfull:result.area>result.availableArea,actualBefore:result.actualBefore,actualAfter:result.actualAfter}));
 }catch(e){results.push({version,error:String(e),logs:p.logs});console.log(version,String(e));}finally{p.kill();}
}
writeFileSync(`${out}/results.json`,JSON.stringify({method:'Normal 200,000-unit 1x play and native E/click Rupture, followed by viewport resize. Manual freeze happens only after resize. Exact layout comparison uses copies of the actual eligible labels. Separate synthetic 160-box browser fixture is labelled synthetic; no FPS inference.',results},null,2));
if(results.some(r=>r.error||r.unitCount!==200000||r.speed!==1||r.errors?.length||r.actualAfter?.count!==r.eligibleLabels||!r.actualAfter?.valuesUnchanged||r.actualAfter?.candidates>2048||r.actualAfter?.comparisons>8192||[r.syntheticAfter,r.reviewFixture?.after,r.fittingFixture?.after].some(s=>s?.cellQueries!==0||s?.count!==160||!s?.valuesUnchanged)))process.exit(1);

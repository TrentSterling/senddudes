// Native-input reproduction, then matched rendering of the same real damage
// labels over a frozen battlefield. No synthetic combat values or army edits.
import {launch,sleep,until} from '../../tools/cdp.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:net';
const out=process.env.LABEL_QA_OUT||'tools/out/damage-labels';mkdirSync(out,{recursive:true});
const baseline=readFileSync('versions/senddudes-v0.6.2.html','utf8');
const oldClass=baseline.match(/function hash32\(x\)\{[^\n]+/)[0]+'\n'+baseline.slice(baseline.indexOf('const DAMAGE_MODES'),baseline.indexOf('/* Persistent progression'));
const results=[];
function installQaRenderer(){
 const view=Arena.view,ctx=document.querySelector('#overlay').getContext('2d');
 window.qaSnapshot={labels:structuredClone(Arena.numbers.live),clock:Arena.numbers.clock,view:{...view},top:8,bottom:view.h-8,time:Arena.gpu.time,n:Arena.gpu.n,speed:Arena.speed};
 window.qaPaint=before=>{
  const r=before?new BaselineDamageText():new Arena.numbers.constructor();
  r.live=structuredClone(qaSnapshot.labels);r.clock=qaSnapshot.clock;
  const rects=[],original=ctx.drawImage,inkCache=new Map();
  // Test-only pixel bounds make this independent of the placement algorithm's
  // text metrics. Transparent sprite margins are not overlapping glyphs.
  ctx.drawImage=function(c,x,y,w,h){
   let box=inkCache.get(c);
   if(!box){
    const rgba=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let left=c.width,right=-1,top=c.height,bottom=-1;
    for(let py=0;py<c.height;py++)for(let px=0;px<c.width;px++)if(rgba[(py*c.width+px)*4+3]){left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);}
    box={x:left,y:top,w:right-left+1,h:bottom-top+1};inkCache.set(c,box);
   }
   rects.push({x:x+box.x*w/c.width,y:y+box.y*h/c.height,w:box.w*w/c.width,h:box.h*h/c.height});
   return original.call(this,c,x,y,w,h);
  };
  try{ctx.clearRect(0,0,view.w,view.h);r.draw(ctx,view,0,true,false,qaSnapshot.top,qaSnapshot.bottom);}finally{ctx.drawImage=original;}
  let overlaps=0;
  for(let i=0;i<rects.length;i++)for(let j=0;j<i;j++){const a=rects[i],b=rects[j];if(a.x+a.w>b.x&&b.x+b.w>a.x&&a.y+a.h>b.y&&b.y+b.h>a.y)overlaps++;}
  return{rects,overlaps,drawn:rects.length,labels:r.live.map(p=>({cents:p.cents,count:p.count,flags:p.flags,bin:p.bin})),n:qaSnapshot.n,speed:qaSnapshot.speed,time:qaSnapshot.time,view:qaSnapshot.view,clip:[qaSnapshot.top,qaSnapshot.bottom]};
 };
}
async function port(){const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const n=s.address().port;await new Promise(r=>s.close(r));return n;}
const allCases=[{name:'desktop',width:1600,height:900,zoom:8},{name:'wide-view',width:1600,height:900,zoom:0},{name:'close-view',width:1600,height:900,zoom:15},{name:'narrow',width:390,height:844,zoom:8}];
const cases=process.argv.includes('--quick')?allCases.slice(0,1):process.argv.includes('--narrow')?allCases.slice(-1):allCases;
for(const spec of cases){
 const p=await launch({port:await port(),width:spec.width,height:spec.height});
 const trace=[];
 const tap=async(code,key)=>{trace.push({at:Date.now(),code,key});await p.call('Input.dispatchKeyEvent',{type:'keyDown',code,key});await sleep(50);await p.call('Input.dispatchKeyEvent',{type:'keyUp',code,key});};
 const click=async(sel)=>{const r=await p.eval(`(()=>{const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);trace.push({at:Date.now(),selector:sel,...r});await p.mouse('mousePressed',r.x,r.y);await p.mouse('mouseReleased',r.x,r.y);};
 try{
  await p.goto(pathToFileURL(resolve('index.html')).href);
  await until(()=>p.eval('!!window.Arena&&document.querySelector("#boot").hidden'),{timeout:60000,label:'boot'});
  await click('#menu200');await sleep(4000);
  for(let i=0;i<spec.zoom;i++){await p.call('Input.dispatchMouseEvent',{type:'mouseWheel',x:spec.width*.46,y:spec.height*.45,deltaX:0,deltaY:-80});trace.push({at:Date.now(),wheel:-80});await sleep(70);}
  await sleep(2000);
  for(let cast=1;cast<=2;cast++){
   if(cast===2)await sleep(8200);
   await tap('KeyE','e');await p.mouse('mousePressed',spec.width*.48,spec.height*.47);await p.mouse('mouseReleased',spec.width*.48,spec.height*.47);trace.push({at:Date.now(),cast,x:spec.width*.48,y:spec.height*.47});await sleep(400);
   await p.shot(`${out}/${spec.name}-cast${cast}-live.png`);
   await p.eval('Arena.manual=true');await sleep(150);
   await p.eval(`window.BaselineDamageText=(()=>{${oldClass};return DamageText})()`);
   await p.eval(`(${installQaRenderer.toString()})()`);
   const before=await p.eval('qaPaint(true)');await p.shot(`${out}/${spec.name}-cast${cast}-before.png`);
   const after=await p.eval('qaPaint(false)');await p.shot(`${out}/${spec.name}-cast${cast}-after.png`);
   const ok=after.overlaps===0&&before.drawn===after.drawn&&JSON.stringify(before.labels)===JSON.stringify(after.labels)&&after.n===200000&&after.speed===1;
   results.push({name:spec.name,cast,ok,before,after,trace:[...trace]});console.log(JSON.stringify({name:spec.name,cast,ok,beforeOverlaps:before.overlaps,afterOverlaps:after.overlaps,drawn:after.drawn}));
   // The game resumes its ordinary loop, including the natural cooldown.
   await p.eval('Arena.manual=false');
  }
  results.push({name:spec.name,consoleErrors:p.logs.filter(x=>/^(error|EXCEPTION)/.test(x))});
 }catch(e){results.push({name:spec.name,error:String(e),logs:p.logs});console.log(spec.name,String(e));}
 finally{p.kill();}
}
writeFileSync(`${out}/results.json`,JSON.stringify({method:'Native play at 1x; matched before/after uses the same actual live damage labels, frozen GPU frame, view and simulation state. Test-only baseline renderer replay is not gameplay footage.',results},null,2));
process.exit(results.some(x=>x.error||x.ok===false||x.consoleErrors?.length)?1:0);

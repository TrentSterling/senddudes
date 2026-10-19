// Exact layout class, outside a VM and without canvas/GPU work. These synthetic
// timings are diagnostics, not game FPS or a hardware benchmark.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const base=process.argv.includes('--base');
const html=base?execFileSync('git',['show','04b6d979:index.html'],{encoding:'utf8'}):readFileSync('index.html','utf8');
const source=html.slice(html.indexOf('class DamageLabelLayout {'),html.indexOf('class DamageText {'));
const Layout=Function(source+';return DamageLabelLayout;')();
const fixtures=[
 {name:'overfull narrow',width:390,height:844,w:85,h:24},
 {name:'overfull short',width:390,height:240,w:85,h:24},
 {name:'unpackable rows',width:390,height:844,w:200,h:9},
 {name:'fitting narrow',width:390,height:844,w:70,h:24},
 {name:'clustered sparse',width:1600,height:900,w:85,h:24},
 {name:'comparison budget',width:1600,height:900,w:2,h:2,grid:true}
];
const results=[];
for(const f of fixtures){
 const times=[];let work;
 for(let run=0;run<8;run++){
  const items=Array.from({length:160},(_,i)=>({p:{cents:10000+i,count:1},x:f.grid?969+(i%16)*3:f.width/2,y:f.grid?457+Math.floor(i/16)*3:f.height/2,w:f.w,h:f.h}));
  const before=JSON.stringify(items.map(p=>({cents:p.p.cents,count:p.p.count}))),layout=new Layout(f.width,8,f.height-8);
  let cellQueries=0;const cells=layout.cellsFor;layout.cellsFor=function(...args){cellQueries++;return cells.apply(this,args);};
  const start=performance.now(),positions=layout.arrange(items);times.push(performance.now()-start);
  assert.equal(positions.length,160);assert.ok(positions.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
  assert.equal(JSON.stringify(items.map(p=>({cents:p.p.cents,count:p.p.count}))),before);
  work={cellQueries,candidates:layout.probes,comparisons:layout.comparisons};
  if(!base){assert.ok(layout.probes<=2048);assert.ok(layout.comparisons<=8192);assert.ok(cellQueries<=2048+160);if(f.name.startsWith('overfull')||f.name==='unpackable rows')assert.equal(cellQueries,0);if(f.name==='comparison budget')assert.equal(layout.comparisons,8192);if(f.name==='clustered sparse')assert.equal(layout.probes,2048);}
 }
 const warm=times.slice(1).sort((a,b)=>a-b);results.push({...f,firstMs:times[0],warmMedianMs:warm[3],warmMaxMs:warm.at(-1),...work});
}
mkdirSync('tools/out',{recursive:true});
const file=`tools/out/layout-work-${base?'before':'after'}.json`;
writeFileSync(file,JSON.stringify({method:'Synthetic 160-label fixtures; exact layout function outside VM/canvas; no FPS inference.',source:base?'04b6d979':'working index.html',results},null,2));
console.log(JSON.stringify(results,null,2));

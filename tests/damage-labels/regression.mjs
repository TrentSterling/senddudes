import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const current=readFileSync('index.html','utf8'),baseline=readFileSync('versions/senddudes-v0.6.2.html','utf8');
function renderer(html){
 const context={performance:{now:()=>0},document:{createElement:()=>{const c={};c.getContext=()=>({measureText:t=>({width:t.length*18,actualBoundingBoxLeft:t.length*9,actualBoundingBoxRight:t.length*9,actualBoundingBoxAscent:10,actualBoundingBoxDescent:12}),scale(){},strokeText(t,x,y){c.ink={x:x-t.length*9-2.5,y:y-10-2.5,w:t.length*18+5,h:27};},fillText(){}});return c;}}};
 const hash=html.match(/function hash32\(x\)\{[^\n]+/)[0];
 const source=html.slice(html.indexOf('const DAMAGE_MODES'),html.indexOf('/* Persistent progression'));
 vm.runInNewContext(hash+'\n'+source+'\nglobalThis.Renderer=DamageText;',context);
 return new context.Renderer();
}
const view={w:1280,h:800,x:0,y:0,s:12,cy:.5};
function draw(r,v=view,reduced=false){
 const rectangles=[],ctx={save(){},beginPath(){},rect(){},clip(){},restore(){},drawImage(c,x,y,w,h){const k=w/(c.width/2),q=c.ink;rectangles.push({x:x+q.x*k,y:y+q.y*k,w:q.w*k,h:q.h*k});}};
 r.draw(ctx,v,0,true,reduced,80,v.h-100);return rectangles;
}
function overlaps(rects){let n=0;for(let i=0;i<rects.length;i++)for(let j=0;j<i;j++){const a=rects[i],b=rects[j];if(a.x+a.w>b.x&&b.x+b.w>a.x&&a.y+a.h>b.y&&b.y+b.h>a.y)n++;}return n;}
const event=(i=0)=>({cents:12345+i*100,count:7,x:0,y:i*5,team:1,flags:i===0?4:0,bin:800+i});
function repeated(r){for(let i=0;i<6;i++){r.clock=i*.1;r.ingest(Array.from({length:8},(_,j)=>event(j)),view);}return r;}
const values=r=>JSON.stringify(r.live.map(({textOffset,...p})=>p));
test('successive ingests retain every admitted value and remove overlapping rectangles',()=>{
 const old=repeated(renderer(baseline)),fixed=repeated(renderer(current));assert.equal(values(old),values(fixed));
 const a=draw(old),b=draw(fixed);assert.ok(overlaps(a)>0);assert.equal(overlaps(b),0);assert.equal(a.length,b.length);assert.equal(values(old),values(fixed));
});
for(const [name,v] of [['zoomed out',{...view,s:3.4}],['close zoom',{...view,s:48}],['narrow',{...view,w:390,h:844,s:12}],['panned',{...view,x:10,y:12}]]){
 test(name+' retains values and places non-overlapping labels',()=>{const a=repeated(renderer(baseline)),b=repeated(renderer(current)),before=draw(a,v),after=draw(b,v);assert.equal(after.length,before.length);assert.equal(overlaps(after),0);assert.equal(values(a),values(b));});
}
test('frozen labels retain their chosen lanes',()=>{const r=repeated(renderer(current));assert.deepEqual(draw(r),draw(r));});
test('reduced motion preserves legibility without altering values',()=>{const r=repeated(renderer(current)),before=values(r);assert.equal(overlaps(draw(r,view,true)),0);assert.equal(values(r),before);});
test('Overkill placement is byte-for-byte unchanged',()=>{const a=renderer(baseline),b=renderer(current);a.setMode('overkill');b.setMode('overkill');repeated(a);repeated(b);assert.deepEqual(draw(a),draw(b));});
test('Off still draws no labels',()=>{const r=repeated(renderer(current));r.setMode('off');assert.deepEqual(draw(r),[]);});
test('core and grouped totals retain their original strings',()=>{const a=repeated(renderer(baseline)),b=repeated(renderer(current));draw(a);draw(b);assert.deepEqual([...a.cache.keys()],[...b.cache.keys()]);assert.ok([...b.cache.keys()].some(x=>x.includes('CORE')));});
test('dense narrow view keeps 120 full-size totals without painted intersections',()=>{
 const r=renderer(current);r.clock=1;
 r.live=Array.from({length:120},(_,i)=>({...event(i),x:(i%3)*.1,y:(i%20-10)*2,cents:(50+i)*100,born:1-(i%20)*.02,life:.82,drift:0,lift:36,size:22,heavy:true,core:i%20===0}));
 const before=values(r),rects=draw(r,{...view,w:390,h:844});assert.equal(rects.length,120);assert.equal(overlaps(rects),0);assert.equal(values(r),before);
});
test('an overfull viewport retains totals instead of silently discarding them',()=>{
 const r=renderer(current);r.clock=1;
 r.live=Array.from({length:120},(_,i)=>({...event(i),x:0,y:0,cents:123456789,born:.8,life:.82,drift:0,lift:36,size:22,heavy:true,core:true}));
 const before=values(r),rects=draw(r,{...view,w:390,h:844});assert.equal(rects.length,120);assert.equal(values(r),before);assert.ok(rects.every(p=>Object.values(p).every(Number.isFinite)));
});
test('About discovery and gameplay outside label drawing are preserved',()=>{
 let a=baseline.replaceAll('\r\n','\n').replaceAll('0.6.2','0.6.3').replace('send-dudes-0.6.3-copy','send-dudes-0.6.3-labels');
 let b=current.replaceAll('\r\n','\n');
 const strip=(html,start)=>html.slice(0,html.indexOf(start))+html.slice(html.indexOf('/* Persistent progression'));
 a=strip(a,'class DamageText {');b=strip(b,'// Screen-space occupancy');
 assert.equal(a,b);
});

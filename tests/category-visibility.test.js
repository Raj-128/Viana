import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
test('category counts follow admin session while empty categories remain navigable', async () => {
 const element=()=>({children:[],dataset:{},attributes:{},append(...items){this.children.push(...items);},setAttribute(k,v){this.attributes[k]=v;}});
 const root=element(),note=element(),handlers={}; let admin=false;
 let code=readFileSync(new URL('../src/js/shop-categories.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
 const context={document:{getElementById:()=>root,createElement:element,querySelector:()=>note},window:{addEventListener(n,f){handlers[n]=f;}},shopFormats:[{id:'max',label:'3DS MAX'},{id:'blend',label:'Blender'},{id:'fbx-obj',label:'FBX / OBJ'}],projects:[],countShopFormats:()=>({max:183,blend:0,'fbx-obj':10,fbx:6,obj:9}),isAdminSession:()=>admin,authReady:Promise.resolve()};
 for(const key of ['maxLogo','cinemaLogo','blenderLogo','unrealLogo','fbxLogo','materialsLogo','stlLogo','autocadLogo','sketchupLogo'])context[key]='logo.svg';
 vm.runInNewContext(code,context); await Promise.resolve();
 assert.equal(root.children.length,3);
 for(const card of root.children){assert.match(card.href,/work.html\?mode=3d&format=/);assert.equal(card.children[1].children[1].hidden,true);assert.doesNotMatch(card.attributes['aria-label'],/183|10|0/);}
 assert.equal(note.hidden,true);
 admin=true;handlers['studio:auth-change']();
 assert.equal(root.children[0].children[1].children[1].textContent,'183 assets');assert.equal(note.hidden,false);
 assert.match(root.children[1].href,/format=blend/);
 admin=false;handlers['studio:auth-change']();assert.equal(root.children[0].children[1].children[1].textContent,'');assert.equal(note.hidden,true);
});

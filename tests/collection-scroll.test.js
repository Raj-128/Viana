import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
test('collection drag suppresses navigation, normal clicks work, keyboard scrolls and blur releases', () => {
 const handlers={}, globals={};
 const wrapper={style:{},scrollLeft:200,clientWidth:800,scrollWidth:4000,setAttribute(){},addEventListener(n,f){handlers[n]=f;}};
 const source=readFileSync(new URL('../src/js/premium.js',import.meta.url),'utf8');
 vm.runInNewContext(source,{document:{querySelectorAll:()=>[wrapper],addEventListener(){}},window:{addEventListener(n,f){globals[n]=f;}}});
 const context={document:{querySelectorAll:()=>[wrapper]},window:{addEventListener(n,f){globals[n]=f;}}};
 vm.runInNewContext(source.slice(0,source.indexOf('function initContactForm'))+';initDragScroll();',context);
 handlers.mousedown({button:0,clientX:200}); globals.mousemove({clientX:100,preventDefault(){}});
 assert.equal(wrapper.scrollLeft,300); globals.mouseup();
 let cancelled=false; handlers.click({detail:1,preventDefault(){cancelled=true;},stopPropagation(){}}); assert.equal(cancelled,true);
 handlers.mousedown({button:0,clientX:100}); globals.mouseup(); cancelled=false;
 handlers.click({detail:1,preventDefault(){cancelled=true;}}); assert.equal(cancelled,false);
 handlers.keydown({target:wrapper,key:'ArrowRight',preventDefault(){}}); assert.equal(wrapper.scrollLeft,900);
 handlers.mousedown({button:0,clientX:100}); globals.blur(); globals.mousemove({clientX:0}); assert.equal(wrapper.scrollLeft,900);
});

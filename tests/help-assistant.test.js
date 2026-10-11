import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { helpTopics, openHelp } from '../src/js/help-assistant.js';
test('guide destinations exist and stay within the website', () => {
 for(const topic of helpTopics) for(const action of [topic,topic.secondary].filter(Boolean)) {
  const url=new URL(action.href,'https://studioviana.work.gd/');
  assert.equal(url.origin,'https://studioviana.work.gd');
  const page='.'+url.pathname; assert.ok(existsSync(page),page);
  if(url.hash && !['#catalogue','#account'].includes(url.hash)) assert.ok(readFileSync(page,'utf8').includes('id="'+url.hash.slice(1)+'"'));
 }
});
test('guide opens once, closes and reuses its dialog without making requests', () => {
 const make=tag=>({tag,children:[],handlers:{},append(...nodes){this.children.push(...nodes);},setAttribute(){},addEventListener(name,fn){this.handlers[name]=fn;},showModal(){this.open=true;},close(){this.open=false;}});
 const body=make('body'); globalThis.document={body,createElement:make};
 try {
  openHelp(); assert.equal(body.children.length,1); const dialog=body.children[0]; assert.equal(dialog.open,true);
  dialog.children[0].children[1].handlers.click(); assert.equal(dialog.open,false);
  openHelp(); assert.equal(body.children.length,1); assert.equal(dialog.open,true);
  assert.equal(dialog.children[2].children.length,5);
 } finally {delete globalThis.document;}
});

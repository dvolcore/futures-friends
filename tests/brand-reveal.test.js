const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup(rejected = false) {
  const events = {}, dialogEvents = {}, videoEvents = {}, windowEvents = {};
  const status = {}, close = {focus(){},addEventListener(type,fn){dialogEvents['button-'+type]=fn;}};
  let plays=0, pauses=0, focused=0;
  const video = {currentTime:0,play(){plays++;return rejected?Promise.reject(new Error('blocked')):Promise.resolve();},pause(){pauses++;},addEventListener(type,fn){videoEvents[type]=fn;}};
  const dialog = {open:false,setAttribute(){},querySelector(selector){return selector==='video'?video:selector==='[data-brand-close]'?close:status;},showModal(){this.open=true;},close(){this.open=false;dialogEvents.close();},addEventListener(type,fn){dialogEvents[type]=fn;}};
  const trigger={isConnected:true,focus(){focused++;}};
  const context=vm.createContext({document:{createElement(){return dialog;},body:{appendChild(){}},addEventListener(type,fn){events[type]=fn;}},window:{addEventListener(type,fn){windowEvents[type]=fn;}}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../brand-reveal.js'),'utf8'),context);
  return {dialog,video,status,events,videoEvents,windowEvents,dialogEvents,click(){events.click({target:{closest(){return trigger;}}});},stats(){return {plays,pauses,focused};}};
}
test('logo film is opt-in, uses native controls, and does not loop',()=>{
  const s=setup();
  assert.deepEqual(s.stats(),{plays:0,pauses:0,focused:0});
  assert.match(s.dialog.innerHTML,/controls playsinline preload="none"/);
  assert.doesNotMatch(s.dialog.innerHTML,/autoplay|\bloop\b/);
  assert.match(s.dialog.innerHTML,/ff-logo-reveal-poster.jpg/);
  s.click();assert.equal(s.dialog.open,true);assert.equal(s.stats().plays,1);
  s.click();assert.equal(s.stats().plays,1);
});
test('closing pauses, resets and restores focus; routing closes the film',()=>{
  const s=setup();s.click();s.video.currentTime=3;s.dialogEvents['button-click']();
  assert.equal(s.video.currentTime,0);assert.equal(s.stats().pauses,1);assert.equal(s.stats().focused,1);
  s.click();s.windowEvents.hashchange();assert.equal(s.dialog.open,false);
});
test('blocked playback and load failures leave useful fallback options',async()=>{
  const s=setup(true);s.click();await Promise.resolve();
  assert.match(s.status.textContent,/Use the video controls/);
  s.videoEvents.error();assert.match(s.status.textContent,/could not load/);
  assert.match(s.dialog.innerHTML,/Open the video file/);
});

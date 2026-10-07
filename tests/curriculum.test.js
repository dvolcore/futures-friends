const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function site(){
  const context=vm.createContext({window:{addEventListener(){}},document:{addEventListener(){}}});
  for(const file of ['data.js','plush-cast.js', 'supporting-cast.js','advisor-profiles.js','views.js','experience.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
  return context;
}
test('curriculum retains all twelve units and age controls without production claims',()=>{
  const html=vm.runInContext('V.curriculum()',site());
  assert.equal((html.match(/data-ex-month=/g)||[]).length,12);
  assert.equal((html.match(/data-ex-age=/g)||[]).length,3);
  assert.equal((html.match(/data-ex-week=/g)||[]).length,4);
  assert.match(html,/Curriculum in development/);
  assert.match(html,/Published editions and finished episodes are not available/);
  assert.doesNotMatch(html,/Professionally produced|complete curriculum binder/);
});
test('age selection changes skill and activity previews',()=>{
  const context=site();
  vm.runInContext('st.age="twos"',context);
  assert.match(context.window.FFExperience.agePanel(),/Name pictures/);
  assert.match(context.window.FFExperience.activity(),/Point to a favorite picture/);
  vm.runInContext('st.age="prek"',context);
  assert.match(context.window.FFExperience.agePanel(),/letter sounds/);
  assert.match(context.window.FFExperience.activity(),/different ending/);
});
test('family download contains selected curriculum and truthful development status',()=>{
  const text=site().window.FFExperience.planText();
  assert.match(text,/Development preview/);
  assert.match(text,/September: Welcome/);
  assert.match(text,/Monday, Wednesday, Friday/);
  assert.match(text,/Adult supervision required/);
});
test('family export dispatches a named text file from an attached link and cleans up',()=>{
  const handlers={},status={};let payload,attached=false,clicked=false,removed=false,revoked=false,filename;
  const context=vm.createContext({window:{},Blob,URL:{createObjectURL(blob){payload=blob;return 'blob:family-plan';},revokeObjectURL(url){assert.equal(url,'blob:family-plan');revoked=true;}},setTimeout(fn){fn();},document:{
    addEventListener(type,fn){handlers[type]=fn;},getElementById(){return status;},
    body:{appendChild(){attached=true;}},createElement(){return {click(){assert.equal(attached,true);clicked=true;filename=this.download;},remove(){removed=true;}}}
  }});
  for(const file of ['plush-cast.js', 'data.js','views.js','experience.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
  const button={closest(){return this;},hasAttribute(name){return name==='data-ex-download';}};
  handlers.click({target:button});
  assert.equal(filename,'futures-friends-family-plan.txt');assert.equal(payload.type,'text/plain;charset=utf-8');
  assert.equal(clicked,true);assert.equal(removed,true);assert.equal(revoked,true);assert.match(status.textContent,/download/);
});
test('unit titles and week content escape untrusted markup',()=>{
  const context=site();
  vm.runInContext('D.units[0].title="<script>bad</script>"; D.units[0].weeks[0][5]="<img onerror=bad>"',context);
  const html=context.window.FFExperience.journey();
  assert.match(html,/&lt;script&gt;/);
  assert.match(html,/&lt;img onerror=bad&gt;/);
  assert.doesNotMatch(html,/<script>|<img onerror/);
});
test('curriculum anchors stay on the page and every icon exists',()=>{
  const html=vm.runInContext('V.curriculum()',site());
  for(const anchor of ['units','ages','family-plan'])assert.match(html,new RegExp('data-anchor="'+anchor+'"'));
  assert.doesNotMatch(html,/#curriculum\//);
  const sprite=fs.readFileSync(path.join(__dirname,'../img/ui-icons.svg'),'utf8');
  for(const match of html.matchAll(/ui-icons.svg#([^"]+)/g))assert.ok(sprite.includes('id="'+match[1]+'"'),match[1]);
});

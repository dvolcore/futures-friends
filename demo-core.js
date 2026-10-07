/* Futures Hub DEMO mode: the data layer (owner 2026-10-07: "When I click on the Teacher Portal ... I need everything operational and
   working" for client demonstrations).

   The real Futures Hub (accounts, row-level security, the evening report job) is not hosted yet, so the public site cannot sign anyone
   in. Demo mode makes every portal work in the browser with FAKE data instead:
     - FFDemo.session(): who is signed in to the demo (Demo Teacher, Demo Director, Demo Family, Demo Academy staff). The demo accounts
       are fake and live only in this file; nothing is checked against a server and no password is ever sent anywhere.
     - FFDemo.db: the same small document interface portal.js already uses for the Hub (collection / where / onSnapshot / doc.set /
       doc.delete), kept in localStorage (key ff-demo-db-v1). If storage is blocked it falls back to memory for this tab.
     - FFDemo.reset(): back to the starting sample data.
   Sample data only: the school is "Futures Learning Center", the room "Demo Classroom", children are invented first names with a last
   initial, adults are invented. No curriculum is stored here (IP lockdown 2026-10-07): plans are the teacher's own free text, the
   Learning Steps tags are the public AREAS (learning-steps-summary.js), and the one sample day is the public watermarked Day 9 PDF.
   Off whenever a real Hub is configured (window.FFHub.configured): then the real sign-in is the only way in. Sends nothing. */
(function () {
'use strict';
const W = typeof window !== 'undefined' ? window : {};
const KEY_DB = 'ff-demo-db-v1', KEY_SES = 'ff-demo-session-v1', KEY_CENTERS = 'ff-demo-centers-v1', VERSION = 1;

// ---------------------------------------------------------------- storage (localStorage, or memory when it is blocked)
const mem = {};
let persistent = true;
const store = {
  get(k){ try { const v = W.localStorage.getItem(k); return v == null ? (k in mem ? mem[k] : null) : v; } catch (_) { persistent = false; return k in mem ? mem[k] : null; } },
  set(k, v){ mem[k] = v; try { W.localStorage.setItem(k, v); } catch (_) { persistent = false; } },
  del(k){ delete mem[k]; try { W.localStorage.removeItem(k); } catch (_) { persistent = false; } }
};
const readJson = k => { try { const s = store.get(k); return s ? JSON.parse(s) : null; } catch (_) { return null; } };

// ---------------------------------------------------------------- the demo world (all invented)
const TEACHER_ROOM = 'demo';
const STAFF_BASE = [
  {id:'s-dana', role:'Director', room:'', onDuty:true, bg:'Cleared', bgDue:'2027-03-01', pin:true, owner:true},
  {id:'s-alana', role:'Lead teacher', room:'demo', onDuty:true, bg:'Cleared', bgDue:'2027-01-15'},
  {id:'s-devin', role:'Assistant teacher', room:'demo', onDuty:true, bg:'Cleared', bgDue:'2026-12-01'},
  {id:'s-priya', role:'Lead teacher', room:'twos', onDuty:true, bg:'Cleared', bgDue:'2027-05-20'},
  {id:'s-grace', role:'Lead teacher', room:'prek', onDuty:true, bg:'Cleared', bgDue:'2027-02-10'},
  {id:'s-omar', role:'Assistant teacher', room:'prek', onDuty:false, bg:'Renewal due', bgDue:'2026-10-19'},
  {id:'s-carmen', role:'Cook', room:'', onDuty:true, bg:'Cleared', bgDue:'2027-04-02'}
];
const KID_IDS = ['d1','d2','d3','d4','d5','d6','d7','d8','t1','t2','t3','t4','p1','p2','p3','p4','p5'];
const KID_ROOM = id => id[0] === 'd' ? 'demo' : id[0] === 't' ? 'twos' : 'prek';
// Every demo center is a separate space (its own storage key): its own rooms, children, staff, plans and families. All invented.
const PROFILES = {
  flc: {rooms:['Twos Room','Demo Classroom','Pre-K Room'],
    kids:['Amara B','Theo W','Rosa M','Jalen D','Mia C','Noah J','Aria Q','Kai Z','Ava R','Mateo H','Zoe O','Elijah V','Ivy S','Luna G','Malik N','Nova E','Liam X'],
    staff:['Ms. Dana W.','Ms. Alana P.','Mr. Devin K.','Ms. Priya S.','Ms. Grace T.','Mr. Omar F.','Ms. Carmen L.'], family:'Sam C.'},
  sunshine: {rooms:['Busy Bees (twos)','Sunflower Room','Bright Stars Pre-K'],
    kids:['Harper L','Milo S','Sadie T','Jonah R','Lila M','Asher B','Ruby N','Ezra K','Wren A','Otis D','June P','Felix G','Iris H','Cyrus V','Daisy E','Hugo F','Nell O'],
    staff:['Ms. Renee H.','Ms. Tara J.','Mr. Jon B.','Ms. Kelly M.','Ms. Wendy A.','Mr. Raul P.','Ms. Gail S.'], family:'Jo L.'},
  grace: {rooms:['Little Lambs (twos)','Mustard Seed Room','Shepherd’s Pre-K'],
    kids:['Eliana F','Caleb W','Naomi P','Micah D','Hannah G','Silas J','Abigail R','Levi C','Esther M','Gideon T','Lydia B','Jude K','Phoebe N','Amos H','Talia S','Ezekiel V','Selah O'],
    staff:['Mrs. Joy N.','Ms. Hope K.','Mr. Eli T.','Ms. Faith O.','Ms. Dawn Y.','Mr. Cole W.','Ms. Bea L.'], family:'Pat G.'}
};
const DEFAULT_CENTERS = [
  {id:'flc', slug:'futures-learning-center', name:'Futures Learning Center — Demo Classroom', type:'child_care', state:'MO', color:'#E7A928', kind:'flc'},
  {id:'sunshine', slug:'sunshine-daycare', name:'Sunshine Daycare (demo)', type:'child_care', state:'MO', color:'#E8761E', kind:'sunshine'},
  {id:'grace', slug:'grace-church-preschool', name:'Grace Church Preschool (demo)', type:'church', state:'KS', color:'#6A4FB8', kind:'grace'}
];
const TYPE_LABEL = {child_care:'Child care center', church:'Church program'};
const COLORS = ['#2F6FC0','#2E9E57','#D9488B','#E8761E','#6A4FB8','#0E7C86'];
// demo accounts: FAKE credentials that exist only in this file, documented on the sign-in page
const ACCOUNTS = [
  {key:'teacher', email:'teacher@demo.futuresfriends', password:'demo', role:'teacher', id:'s-alana', label:'Demo Teacher', home:'portal'},
  {key:'director', email:'director@demo.futuresfriends', password:'demo', role:'director', id:'s-dana', label:'Demo Director', home:'portal'},
  {key:'family', email:'family@demo.futuresfriends', password:'demo', role:'family', id:'f-family', label:'Demo Family', home:'family-portal'},
  {key:'academy', email:'academy@demo.futuresfriends', password:'demo', role:'academy', id:'s-devin', label:'Demo Academy staff', home:'learn'}
];

// ---------------------------------------------------------------- dates
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
const todayIso = () => { const d = new Date(); const w = d.getDay(); if (w === 6) d.setDate(d.getDate() + 2); if (w === 0) d.setDate(d.getDate() + 1); return iso(d); };
function weekdayOffset(date, n){ const d = fromIso(date); let k = 0; while (k < Math.abs(n)) { d.setDate(d.getDate() + (n < 0 ? -1 : 1)); if (d.getDay() !== 0 && d.getDay() !== 6) k++; } return iso(d); }
const at = (date, h, m) => { const d = fromIso(date); d.setHours(h, m, 0, 0); return d.getTime(); };

// ---------------------------------------------------------------- seed (deterministic, relative to the demo's "today")
const MEALS = ['All', 'Most', 'Some', 'Tried it', 'All', 'Most'];
const NAPS = ['60 to 90 min', '30 to 60 min', 'Rested, did not sleep', '60 to 90 min', 'Over 90 min', '30 to 60 min'];
function plan(room, date, status, o){
  return Object.assign({room, date, status, by:'s-alana', at:at(date, 6, 40), friend:'lumi', area:'se', title:'', notes:'',
    steps:{watch:'', talk:'', do:'', move:'', explore:'', home:''}}, o);
}
const PLAN_TODAY = {title:'Kind hands at the block center', friend:'lumi', area:'se',
  steps:{watch:'Meet the four friends (the short intro clip on the carpet, under 6 minutes). Pause to wave hello to Lumi.',
    talk:'Ask: "What can kind hands do?" Take three answers and draw them on the easel.',
    do:'Build one long block road together. Each child adds a block and says one kind word to the next builder.',
    move:'Freeze dance: when the music stops, freeze in a "gentle hands" pose.',
    explore:'Calm corner open with the feelings mirror; blocks and the reading area open all morning.',
    home:'Ask at dinner: "How did you use kind hands today?"'},
  notes:'Two helpers set out the blocks before circle.'};
const PLAN_TOMORROW = {title:'Counting leaves outside', friend:'zuri', area:'cog',
  steps:{watch:'No screen today: Zuri puppet says hello at circle.', talk:'Ask: "What colors do leaves turn?"',
    do:'Collect ten leaves each in a paper bag; count them out on the mat.', move:'Leaf toss: throw the leaves up and catch one.',
    explore:'Discovery zone: magnifiers and the leaf sorting tray.', home:'Look for three different leaves on the way home.'},
  notes:'Check the weather; rain plan is the indoor leaf tray.'};
const PLAN_YESTERDAY = {title:'Our names are special', friend:'booker', area:'lang',
  steps:{watch:'Booker says hello (puppet).', talk:'Ask: "What is the first sound in your name?"', do:'Name cards with stickers on the first letter.',
    move:'Name clap: clap each part of every name.', explore:'Reading area: name puzzles.', home:'Find your first letter on a sign or a box at home.'}};

function seedDay(db, date, today){
  const isToday = date === today;
  KID_IDS.forEach((id, i) => {
    const k = db.kids[id]; if (!k) return; const room = k.room;
    const key = `${id}_${date}`; if (db.kidday[key]) return;
    const away = isToday ? (id === 'd7' || id === 'd8' || id === 'p5') : ((i + date.charCodeAt(9)) % 9 === 0);
    if (away && isToday) return;   // not here yet: the teacher can check them in during the demo
    const x = {kid:id, room, date, present:!away, meals:{}, nap:'', note:'', star:false};
    if (!away) {
      x.inAt = at(date, 7, 20 + (i * 7) % 70); x.inBy = id === 'd5' ? `${db.familyName} (family)` : 'Family'; x.inStaff = 's-alana';
      x.meals.breakfast = MEALS[i % MEALS.length];
      if (!isToday) { x.meals.lunch = MEALS[(i + 2) % MEALS.length]; x.meals.snack = MEALS[(i + 4) % MEALS.length]; x.nap = NAPS[i % NAPS.length];
        x.outAt = at(date, 16, 20 + (i * 11) % 80); x.outBy = i % 3 ? 'Family' : 'Grandparent (on the pickup list)'; x.star = i % 4 === 0; }
      if (isToday && id === 'd5') x.care = [{t:'Potty', at:at(date, 9, 30), by:'s-devin'}];
    }
    db.kidday[key] = x;
  });
}
const ROOM_BASE = {twos:{ages:'Age 2', level:1, order:1, ratio:8}, demo:{ages:'Age 3', level:1, order:2, ratio:10}, prek:{ages:'Ages 4 to 5', level:1, order:3, ratio:10}};
function seed(c){
  c = c || center();
  const today = todayIso(), y1 = weekdayOffset(today, -1), t1 = weekdayOffset(today, 1);
  const db = {v:VERSION, center:c.id, seededFor:today, rooms:{}, kids:{}, days:{}, kidday:{}, progress:{}, obs:{}, photos:{}, msgs:{},
    plans:{}, staff:{}, apps:{}, requests:{}, dues:{}, reports:{}, training:{}, invites:{}, log:[]};
  const P = PROFILES[c.kind];
  if (!P) return seedNew(c, db, today);   // a center made with "Start your center": an empty space and a Get started list
  db.familyName = P.family; db.familyKid = 'd5';
  ['twos','demo','prek'].forEach((id, i) => db.rooms[id] = Object.assign({demo:true, name:P.rooms[i]}, ROOM_BASE[id]));
  KID_IDS.forEach((id, i) => { const [first, last] = P.kids[i].split(' '); db.kids[id] = {first, last, room:KID_ROOM(id), demo:true}; });
  STAFF_BASE.forEach((s, i) => db.staff[s.id] = Object.assign({}, s, {name:P.staff[i], clockIn:s.onDuty ? at(today, s.id === 's-dana' ? 7 : 6, 50) : null}));
  const KIDS = KID_IDS.map(id => [id, db.kids[id].first, db.kids[id].last, db.kids[id].room]);
  const mia = db.kids.d5.first, omar = db.staff['s-omar'].name;
  for (let n = 4; n >= 1; n--) seedDay(db, weekdayOffset(today, -n), today);
  seedDay(db, today, today);
  // the Demo Classroom checklist: arrival and breakfast done this morning
  db.days[`demo_${today}`] = {room:'demo', date:today, checks:{arrive:{by:'s-alana', at:at(today, 7, 5)}, breakfast:{by:'s-devin', at:at(today, 8, 10)}}, lunch:{mode:'planned'}, episode:{min:5}, notes:''};
  // plans: yesterday and today approved, tomorrow waiting for the director
  db.plans[`demo_${y1}`] = plan('demo', y1, 'approved', Object.assign({review:{by:'s-dana', at:at(y1, 7, 30), note:''}}, PLAN_YESTERDAY));
  db.plans[`demo_${today}`] = plan('demo', today, 'approved', Object.assign({review:{by:'s-dana', at:at(today, 7, 15), note:'Love the block road.'}}, PLAN_TODAY));
  db.plans[`demo_${t1}`] = plan('demo', t1, 'submitted', PLAN_TOMORROW);
  db.plans[`prek_${t1}`] = plan('prek', t1, 'submitted', {by:'s-grace', title:'Bop\'s obstacle course', friend:'bop', area:'pmp',
    steps:{watch:'Bop says hello (puppet).', talk:'Ask: "How does your body move?"', do:'Build a pillow-and-hoop course together.', move:'Run the course two times, then a slow-motion lap.', explore:'Movement zone open all morning.', home:'Show your family your best slow-motion move.'}});
  // Learning Steps sets (the children's age band) and a few shared, area-tagged observations
  const AREAS = [['se','Waited for a turn with the blue truck and said "you go first."'],['lang','Told a friend the story of the bus ride, in order.'],['cog','Counted seven blocks one by one and said "seven!"'],['pmp','Hopped on one foot three times at the movement zone.'],['arts','Mixed yellow and blue and said "I made green!"'],['atl','Tried the puzzle again after it fell apart.']];
  KIDS.forEach(([id, first, , room], i) => {
    const band = room === 'twos' ? 'twos' : room === 'prek' ? 'prek' : 'threes';
    db.progress[id] = {kid:id, band, bandHistory:[{band, from:null, by:'s-alana', at:at(weekdayOffset(today, -20), 9, 0)}], steps:{}};
    if (room !== 'demo') return;
    [0, 1].forEach(j => { const a = AREAS[(i + j * 3) % AREAS.length], d = weekdayOffset(today, -(1 + j * 2 + (i % 2)));
      db.obs[`o_${id}_${j}`] = {kid:id, room, date:d, area:a[0], domain:{se:'lumi', lang:'booker', cog:'zuri', pmp:'bop', arts:'booker', atl:'zuri'}[a[0]], level:['emerging','developing','secure'][(i + j) % 3],
        text:`${first} ${a[1].charAt(0).toLowerCase()}${a[1].slice(1)}`, context:['play','small','routine'][j % 3], shared:j === 0, at:at(d, 10, 15), by:'s-alana'}; });
  });
  // messages: a short thread for every Demo Classroom family
  const T1 = ['{n} built a tall block tower and counted every block!', '{n} helped a friend find the calm corner today. So kind!', '{n} asked to read our Booker story twice.', '{n} tried green beans at lunch and gave them a thumbs up.'];
  const F1 = ['Thank you! {n} talked about it all evening.', 'Love hearing this. We practiced counting stairs at home.', 'That made our day. Thanks for sharing!'];
  KIDS.filter(k => k[3] === 'demo').forEach(([id, n], i) => {
    const f = s => s.replace(/\{n\}/g, n);
    db.msgs[`m_${id}_1`] = {kid:id, room:'demo', date:y1, from:'teacher', text:f(T1[i % T1.length]), ts:new Date(at(y1, 16, 30)).toISOString(), at:at(y1, 16, 30), by:'s-alana', read:{teacher:true, family:true}};
    db.msgs[`m_${id}_2`] = {kid:id, room:'demo', date:y1, from:'family', text:f(F1[i % F1.length]), ts:new Date(at(y1, 19, 5)).toISOString(), at:at(y1, 19, 5), by:'family', read:{teacher:true, family:true}};
    if (id === 'd5') db.msgs[`m_${id}_3`] = {kid:id, room:'demo', date:today, from:'family', text:`${mia} had a short night, so they may be a little tired today.`, ts:new Date(at(today, 7, 48)).toISOString(), at:at(today, 7, 48), by:'family', read:{teacher:false, family:true}};
  });
  // a sample photo moment (an illustrated placeholder, never a real photo)
  db.photos.ph_seed1 = {kid:'d5', room:'demo', date:y1, src:'img/demo/sample-photo-blocks.svg', caption:'Block road (sample picture)', kind:'moment', shared:true, at:at(y1, 10, 20), by:'s-alana'};
  // yesterday's evening reports went out
  KIDS.filter(k => k[3] === 'demo').forEach(([id]) => { const x = db.kidday[`${id}_${y1}`]; if (x && x.present) db.reports[`${id}_${y1}`] = {kid:id, date:y1, room:'demo', sentAt:at(y1, 17, 30), by:'s-alana'}; });
  // enrollment desk
  db.apps.a1 = {child:'Sofia R.', age:'3 years', room:'demo', start:weekdayOffset(today, 18), guardian:'Ana R. (sample parent)', stage:'application', at:at(y1, 14, 5), notes:'Full days, Monday to Friday. No allergies listed.'};
  db.apps.a2 = {child:'Ezra M.', age:'4 years', room:'prek', start:weekdayOffset(today, 25), guardian:'Leah M. (sample parent)', stage:'tour', tour:`${weekdayOffset(today, 2)} 10:00`, at:at(weekdayOffset(today, -3), 9, 40), notes:'Asked about the Pre-K reading area.'};
  db.apps.a3 = {child:'Nia T.', age:'2 years', room:'twos', start:'', guardian:'Chris T. (sample parent)', stage:'inquiry', at:at(today, 8, 2), notes:'Called about openings in the Twos Room.'};
  db.apps.a4 = {child:'Owen B.', age:'3 years', room:'demo', start:'', guardian:'Rae B. (sample parent)', stage:'waitlist', at:at(weekdayOffset(today, -9), 11, 0), notes:'Waitlisted until a Demo Classroom spot opens.'};
  // approvals besides plans
  db.requests.r1 = {type:'pickup', kid:'d5', name:`Grandpa Joe ${db.kids.d5.last}.`, relation:'Grandfather', status:'pending', from:`${P.family} (family)`, at:at(today, 7, 50)};
  db.requests.r2 = {type:'timeoff', staff:'s-omar', what:`Friday off (${weekdayOffset(today, 3)})`, cover:'Floater covers Pre-K 1 to 5 pm', status:'pending', from:omar, at:at(y1, 15, 0)};
  // director's due list
  const due = (id, title, area, d, o) => db.dues[id] = Object.assign({title, area, due:d, done:false}, o || {});
  due('q1', 'Fire extinguisher monthly check', 'Safety', weekdayOffset(today, -1));
  due('q2', 'Fire drill for this month (log it)', 'Safety', weekdayOffset(today, 3));
  due('q3', 'Submit last month\'s CACFP meal counts', 'Meals', weekdayOffset(today, 5));
  due('q4', `Background check renewal: ${omar}`, 'Staff', weekdayOffset(today, 8));
  due('q5', 'Two staff still need course F-101', 'Training', weekdayOffset(today, 15));
  due('q6', 'Playground safety walk', 'Safety', weekdayOffset(today, -3), {done:true, doneAt:at(weekdayOffset(today, -3), 8, 15), doneBy:'s-dana'});
  // Academy progress (lessons of the demo course F-101)
  db.training['s-alana'] = {courses:{'F-101':{lessons:{meet:true, loop:true, check:true}, done:at(weekdayOffset(today, -12), 15, 0), hours:1.5}}};
  db.training['s-priya'] = {courses:{'F-101':{lessons:{meet:true, loop:true, check:true}, done:at(weekdayOffset(today, -30), 13, 0), hours:1.5}}};
  db.training['s-grace'] = {courses:{'F-101':{lessons:{meet:true}}}};
  db.training['s-devin'] = {courses:{}};
  db.training['s-omar'] = {courses:{}};
  db.training['s-dana'] = {courses:{'F-101':{lessons:{meet:true, loop:true, check:true}, done:at(weekdayOffset(today, -40), 9, 0), hours:1.5}}};
  if (c.type === 'church') { db.dues.q7 = {title:'Church board: share the monthly preschool update', area:'Ministry', due:weekdayOffset(today, 6), done:false}; }
  return db;
}
function seedNew(c, db, today){
  const church = c.type === 'church';
  db.familyName = ''; db.familyKid = '';
  db.rooms.demo = Object.assign({demo:true, name:church ? 'Preschool Room' : 'Classroom 1'}, ROOM_BASE.demo);
  db.staff['s-dana'] = Object.assign({}, STAFF_BASE[0], {name:c.ownerName || 'Center owner (demo)', role:'Director (owner)', clockIn:at(today, 7, 30)});
  db.training['s-dana'] = {courses:{}};
  const due = (id, title, area, n) => db.dues[id] = {title, area, due:weekdayOffset(today, n), done:false};
  due('n1', 'Upload your state license or exemption letter', 'Licensing', 5);
  due('n2', church ? 'Share the preschool plan with your church board' : 'Set your tuition and hours', church ? 'Ministry' : 'Business', 7);
  due('n3', 'Fire drill plan for the first month', 'Safety', 10);
  return db;
}

// ---------------------------------------------------------------- the database (one JSON document, all collections)
let DB = null;
const dbKey = id => `${KEY_DB}:${id}`;
function load(){
  const c = center();
  if (DB && DB.center === c.id) return DB;
  const d = readJson(dbKey(c.id));
  DB = d && d.v === VERSION && d.rooms && d.center === c.id ? d : seed(c);
  if (d !== DB) save();
  return DB;
}
function save(){ if (DB) store.set(dbKey(DB.center), JSON.stringify(DB)); }

// ---------------------------------------------------------------- centers (self-serve, like the platform: each is its own space)
let CS = null;
function centersDoc(){
  if (CS) return CS;
  const d = readJson(KEY_CENTERS);
  CS = d && d.v === VERSION && Array.isArray(d.list) && d.list.length ? d : {v:VERSION, list:DEFAULT_CENTERS.map(x => Object.assign({}, x))};
  if (d !== CS) store.set(KEY_CENTERS, JSON.stringify(CS));
  return CS;
}
const centers = () => clone(centersDoc().list);
function center(){
  const list = centersDoc().list, sid = currentCenterId();
  return clone(list.find(x => x.id === sid) || list[0]);
}
let viewCenter = null;   // a center sign-in page (#c/<slug>) shows that center before anyone signs in
function currentCenterId(){ const s = readJson(KEY_SES); return (s && s.center) || viewCenter || 'flc'; }
const bySlug = slug => { const c = centersDoc().list.find(x => x.slug === String(slug || '').toLowerCase()); return c ? clone(c) : null; };
const slugify = n => String(n).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'center';
function createCenter(o){
  const doc = centersDoc(), name = String(o.name || '').trim().slice(0, 60); if (!name) return null;
  let slug = slugify(name), k = 2; while (doc.list.some(x => x.slug === slug)) slug = `${slugify(name)}-${k++}`;
  const c = {id:'c' + Date.now().toString(36), slug, name, type:o.type === 'church' ? 'church' : 'child_care', state:o.state === 'KS' ? 'KS' : 'MO',
    color:COLORS.includes(o.color) ? o.color : COLORS[doc.list.length % COLORS.length], kind:'new', ownerName:String(o.ownerName || '').trim().slice(0, 40) || 'Center owner (demo)', created:Date.now()};
  doc.list.push(c); store.set(KEY_CENTERS, JSON.stringify(doc));
  return clone(c);
}
function switchCenter(id){
  if (!centersDoc().list.some(x => x.id === id)) return false;
  const s = readJson(KEY_SES); if (s) { s.center = id; store.set(KEY_SES, JSON.stringify(s)); } else viewCenter = id;
  SES = null; DB = null; load(); ensureSeed(); return true;
}
function setViewCenter(id){ if (centersDoc().list.some(x => x.id === id)) { viewCenter = id; if (!readJson(KEY_SES)) DB = null; } }
// a demo left open overnight: today's attendance starts like a fresh morning
function ensureSeed(){
  const db = load(), today = todayIso(); if (db.seededFor === today) return;
  seedDay(db, today, today); db.seededFor = today; save();
}
const listeners = new Set();
let pending = new Set(), queued = false;
function notify(coll){
  pending.add(coll); if (queued) return; queued = true;
  Promise.resolve().then(() => { queued = false; const p = pending; pending = new Set();
    listeners.forEach(L => { if (p.has(L.coll) && !L.stopped) deliver(L); }); });
}
const clone = x => JSON.parse(JSON.stringify(x));
function snapshot(coll, filters){
  const rows = Object.entries(load()[coll] || {}).filter(([, v]) => filters.every(f => f.op === '>=' ? String(v[f.col] ?? '') >= String(f.val) : String(v[f.col] ?? '') === String(f.val)))
    .sort((a, b) => a[0] < b[0] ? -1 : 1).map(([id, v]) => { const data = clone(v); return {id, data:() => data}; });
  return {docs:rows, size:rows.length, empty:!rows.length, forEach:f => rows.forEach(f)};
}
function deliver(L){ try { L.cb(snapshot(L.coll, L.filters)); } catch (e) { if (L.err) try { L.err(e); } catch (_) {} } }
const COLLS = ['rooms','kids','days','kidday','progress','obs','photos','msgs','plans','staff','apps','requests','dues','reports','training','invites'];
function query(coll, filters){
  return {
    where:(col, op, val) => { if (op !== '==' && op !== '>=') throw new Error('Unsupported filter'); return query(coll, filters.concat([{col, op, val}])); },
    onSnapshot:(cb, err) => { const L = {coll, filters, cb, err, stopped:false}; listeners.add(L); deliver(L); return () => { L.stopped = true; listeners.delete(L); }; },
    get:() => Promise.resolve(snapshot(coll, filters))
  };
}
const db = {collection(coll){
  if (!COLLS.includes(coll)) throw new Error('Unknown collection: ' + coll);
  return Object.assign(query(coll, []), {doc:id => ({
    set:obj => { const d = load(); (d[coll] = d[coll] || {})[String(id)] = clone(obj); save(); notify(coll); return Promise.resolve(); },
    delete:() => { const d = load(); if (d[coll]) delete d[coll][String(id)]; save(); notify(coll); return Promise.resolve(); }
  })});
}};
// synchronous helpers for the demo screens (demo-portal.js)
const all = coll => clone(load()[coll] || {});
const get = (coll, id) => { const v = (load()[coll] || {})[id]; return v ? clone(v) : null; };
const put = (coll, id, v) => db.collection(coll).doc(id).set(v);
const del = (coll, id) => db.collection(coll).doc(id).delete();

// ---------------------------------------------------------------- the session
let SES = null;
function session(){
  if (!enabled()) return null;
  if (SES) return SES;
  const s = readJson(KEY_SES); const a = s && ACCOUNTS.find(x => x.key === s.key);
  if (!a) return (SES = null);
  const c = center(), db = load();
  const name = a.role === 'family' ? (db.familyName || 'Demo parent') : ((db.staff[a.id] || {}).name || ({teacher:'Demo teacher', academy:'Demo staff member'}[a.role] || 'Demo director'));
  const owner = a.role === 'director' && !!(db.staff[a.id] || {}).owner;
  SES = {key:a.key, role:a.role, id:a.id, name, label:a.label + (owner ? ', owner' : ''), owner, email:a.email, home:a.home, at:s.at, center:c.id};
  return SES;
}
function signIn(key, centerId){
  const a = ACCOUNTS.find(x => x.key === key); if (!a || !enabled()) return null;
  const cid = centersDoc().list.some(x => x.id === centerId) ? centerId : currentCenterId();
  store.set(KEY_SES, JSON.stringify({key:a.key, center:cid, at:Date.now()})); SES = null; DB = null; load(); ensureSeed(); return session();
}
// the email + password form: only the documented demo accounts open; the password is compared here and never stored or sent
function signInWith(email, password, centerId){
  const e = String(email || '').trim().toLowerCase(), a = ACCOUNTS.find(x => x.email === e);
  if (!a || String(password || '') !== a.password) return null;
  return signIn(a.key, centerId);
}
function signOut(){ store.del(KEY_SES); SES = null; }
// Reset: every demo center back to its sample data; centers made with "Start your center" are removed; the person stays signed in
function reset(){
  centersDoc().list.forEach(c => store.del(dbKey(c.id))); store.del(KEY_DB); store.del(KEY_CENTERS); CS = null; DB = null;
  const s = readJson(KEY_SES); if (s && !DEFAULT_CENTERS.some(c => c.id === s.center)) { s.center = 'flc'; store.set(KEY_SES, JSON.stringify(s)); }
  SES = null; listeners.forEach(L => { if (!L.stopped) deliver(L); }); load();
}
function enabled(){ return !(W.FFHub && W.FFHub.configured); }
const familyKids = () => { const db = load(); return db.familyKid && db.kids[db.familyKid] ? [db.familyKid] : []; };
// a family invitation accepted in a new center: the demo family account becomes that child's family
const familyName = () => load().familyName || '';
function setFamily(name, kid){ const db = load(); db.familyName = name; db.familyKid = kid; save(); SES = null; }
const staffNames = () => { const o = {}; Object.entries(load().staff || {}).forEach(([id, s]) => o[id] = s.name); return o; };

W.FFDemo = {VERSION, TEACHER_ROOM, TYPE_LABEL, COLORS, get CENTER(){ return center().name; }, ACCOUNTS:ACCOUNTS.map(a => ({key:a.key, email:a.email, password:a.password, role:a.role, label:a.label, home:a.home})),
  enabled, session, signIn, signInWith, signOut, reset, ensureSeed, db, all, get, put, del, familyKids, staffNames, setFamily, familyName,
  centers, center, bySlug, createCenter, switchCenter, setViewCenter,
  persistent:() => { load(); return persistent; }, todayIso, weekdayOffset, _seed:seed};
})();

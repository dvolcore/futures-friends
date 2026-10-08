/* Writes the Spanish review checklist (every English -> Spanish pair on the website: books, library data, captions, phrase tables) to
   ~/Downloads/FUTURES_FRIENDS_PROJECT/09_Training_and_Curriculum/bilingual/REVIEW_CHECKLIST_SITE_ES.md. Usage: node tools/i18n-checklist.js */
const fs=require('fs'),vm=require('vm'),path=require('path');
const R=path.join(__dirname,'..'), rd=f=>fs.readFileSync(path.join(R,f),'utf8');
const sb={console,location:{search:'',hash:''}}; sb.window=sb; sb.globalThis=sb; const c=vm.createContext(sb);
for(const f of ['i18n.js','i18n-es.js','i18n-es-2.js','i18n-es-3.js','i18n-es-4.js','family-library-data.js','family-library-es.js','family-library-es-books.js','captions.js','captions-es.js']) vm.runInContext(rd(f),c,{filename:f});
const esc=s=>String(s).replace(/\|/g,'\\|').replace(/\n+/g,' / ');
const out=[]; let n=0; const row=(id,en,es)=>{n++; out.push(`| [ ] | ${esc(id)} | ${esc(en)} | ${esc(es)} |`);};
const H=(t,src)=>{out.push('',`## ${t}`,'',`Source file: \`${src}\``,'','| OK | Where | English | Spanish (draft) |','|---|---|---|---|');};
const F=c.FFFamily, ES=c.FFFamilyES;
const walk=(id,en,es)=>{ if(typeof en==='string'){ if(typeof es==='string'&&es&&es!==en) row(id,en,es);} else if(Array.isArray(en)) en.forEach((x,i)=>walk(id+'.'+i,x,es&&es[i])); else if(en&&typeof en==='object'&&es&&typeof es==='object') for(const k of Object.keys(en)) walk(id+'.'+k,en[k],es[k]); };
H('Story Time books (5)','family-library-es-books.js'); for(const b of F.BOOKS) walk(b.id,b,ES.books[b.id]);
H('Activities, guides, printables, videos, age bands, friends','family-library-es.js');
for(const a of F.ACTS) walk('act:'+a.id,a,ES.acts[a.id]);
const byId=(arr,map,pre)=>arr.forEach((x,i)=>walk(pre+':'+(x.id||i),x,map&&(Array.isArray(map)?map[i]:map[x.id])));
byId(F.GUIDES,ES.guides,'guide'); byId(F.PRINTABLES,ES.printables,'printable'); byId(F.PRINT_KIT||[],ES.printKit,'kit'); byId(F.BANDS,ES.bands,'band');
walk('friends',F.FRIENDS,ES.friends); walk('crowd',F.CROWD,ES.crowd); walk('videos',F.VIDEOS,ES.videos);
H('Video captions and transcripts (Spanish subtitles of the English audio)','captions-es.js, video/*.es.vtt');
for(const [src,e] of Object.entries(c.FFCaptions.CAPS)){ const x=c.FFCaptionsES[src]; if(!x||!e.transcript) continue; const ep=e.transcript.split(/\n{2,}/), xp=x.transcript.split(/\n{2,}/); ep.forEach((p,i)=>row(src.replace('video/','')+' ¶'+(i+1),p,xp[i]||'')); }
for(const f of ['i18n-es.js','i18n-es-2.js','i18n-es-3.js','i18n-es-4.js']){ const s2={console,location:{search:'',hash:''}}; s2.window=s2; s2.globalThis=s2; const c2=vm.createContext(s2); vm.runInContext(rd('i18n.js'),c2); vm.runInContext(rd(f),c2);
  H('Website words and labels ('+f+')',f); for(const [k,v] of c2.FFi18n._tables.es) row('page text',k,v); for(const [re,to] of c2.FFi18n._patterns.es) row('pattern',String(re),typeof to==='function'?'(computed)':to); }
const head=`# Website Spanish review checklist (DRAFT translations)\n\nGenerated ${new Date().toLocaleDateString('en-CA')} from the website branch \`bilingual\` (\`~/ff-bilingual\`). Every line is a DRAFT for the center's Spanish teacher. Tick a line when it is right; write the correction next to it when it is not. Terms: \`GLOSSARY_ES.md\`. Regenerate after edits: \`node tools/i18n-checklist.js\` in the website repo.\n\n**${n} lines.**`;
fs.writeFileSync(require('os').homedir()+'/Downloads/FUTURES_FRIENDS_PROJECT/09_Training_and_Curriculum/bilingual/REVIEW_CHECKLIST_SITE_ES.md',head+'\n'+out.join('\n')+'\n');
console.log(n);

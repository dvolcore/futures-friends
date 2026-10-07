/* Pure learning utilities shared by the interface and regression tests. */
(function(root){
  'use strict';
  const api = {
    filter(modules, state, saved, options){
      const q = String(options.query || '').trim().toLowerCase();
      const out = modules.filter(m => {
        const done = !!state.done[m.code], opened = !!state.open[m.code];
        return (!q || (m.code + ' ' + m.title + ' ' + m.format).toLowerCase().includes(q)) &&
          (!options.track || m.code.startsWith(options.track + '-')) &&
          (!options.savedOnly || saved.includes(m.code)) &&
          (!options.status || (options.status === 'done' ? done : options.status === 'started' ? opened && !done : !opened && !done));
      });
      if(options.sort === 'short') out.sort((a,b) => +a.hours - +b.hours || a.code.localeCompare(b.code));
      if(options.sort === 'title') out.sort((a,b) => a.title.localeCompare(b.title));
      return out;
    },
    plan(modules, state, track, hours){
      const list = modules.filter(m => m.code.startsWith(track + '-') && !state.done[m.code]);
      const budget = Math.min(8, Math.max(.5, Number(hours) || 2));
      let used = 0;
      const selected = [];
      for(const m of list){ if(used + +m.hours <= budget){selected.push(m);used += +m.hours;} }
      return {modules:selected, hours:used, remainingHours:list.reduce((n,m)=>n+(+m.hours||0),0), weeks:Math.ceil(list.reduce((n,m)=>n+(+m.hours||0),0)/budget)};
    },
    csv(modules, state){
      const cell = value => '"' + String(value).replace(/"/g,'""') + '"';
      return [['Futures Friends self-recorded learning preview - not an official transcript'],['Code','Module','Catalog hours (not verified)','Self-recorded complete'],...modules.filter(m=>state.done[m.code]).map(m=>[m.code,m.title,m.hours,'Yes'])].map(row=>row.map(cell).join(',')).join('\r\n');
    }
  };
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FFPure = api;
})(typeof window !== 'undefined' ? window : globalThis);

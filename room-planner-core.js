/* Futures Friends: the Room Planner core (#room-planner), owner 2026-10-07 ("it needs to be customizable ... putting in their own
   measurements ... line it all out so when they see it they can put it together the proper way ... have my back").
   Pure model, no DOM: geometry, the licensing space rules, the fit check, auto-arrange, the three starting layouts, the bill of
   materials with the quote estimate, and the share/save encoding. room-planner.js draws it. Node tests load this file directly.
   Units: everything is stored in INCHES. x runs along the room's width (west to east), y along its length (north to south).
   Rules this file keeps:
   - Space per child (usable indoor floor), from the platform's regulation research (/Volumes/FFCRM/app/research/regulations,
     verified official text, retrieved 2026-10-04): Missouri centers 35 sq ft, the youngest children 35 or 45 by facility size
     (5 CSR 25-500.082); Missouri family homes 35 (5 CSR 25-400.085); Missouri license-exempt religious programs 35, the youngest
     children 45 (5 CSR 25-300.090); Kansas centers 28 (K.S.A. 65-539(b)); Kansas homes 25 (K.A.R. 28-4-115(c)). Kansas has no
     religious exemption, so a Kansas church program uses the center number. The planner uses the stricter number when unsure.
   - Missouri rooms for the youngest children: washable mats laundered daily, not carpet (5 CSR 25-500.082).
   - Exit paths 36 in clear; wheelchair turning space 60 in; Friend Fence 24 in high (adults see over it); heaters keep 36 in clear.
   - Prices: only owner-approved numbers. The packages published on #pricing and Zone Boundaries $1,195 home / $1,995 classroom.
     Everything else is "Quote" (or "Included" / "Coming later"). Totals are sums of approved lines only.
   - Names, friends, colours and room structure only: no curriculum lesson content.
   Public: window.FFRoomPlannerCore (and module.exports in Node). Sends nothing. */
(function (root) {
'use strict';
const FT = 12;
const EPS = 0.01;

// ---------------------------------------------------------------- zones (same colours as room-kit.js; Bop purple, owner 2026-10-07)
const ZONES = {
  circle: { name: 'Friends Circle', short: 'Circle', who: 'All four friends', felt: '#E7A928', ink: '#7A5200', tint: '#FFF3D6' },
  booker: { name: 'Booker’s Reading Area', short: 'Booker', who: 'Booker', felt: '#2F6FC0', ink: '#23589F', tint: '#DCE7F6', path: 'book prints' },
  lumi: { name: 'Lumi’s Calm Corner', short: 'Lumi', who: 'Lumi', felt: '#D9488B', ink: '#A82A65', tint: '#F8DDE9', path: 'heart petals' },
  zuri: { name: 'Zuri’s Discovery Zone', short: 'Zuri', who: 'Zuri', felt: '#2E9E57', ink: '#1B6E3E', tint: '#DDF0E3', path: 'turtle tracks' },
  bop: { name: 'Bop’s Movement Zone', short: 'Bop', who: 'Bop', felt: '#8236AE', ink: '#6B2A8E', tint: '#F3EAFB', path: 'elephant footprints' }
};
const FRIENDS = ['booker', 'lumi', 'zuri', 'bop'];

// ---------------------------------------------------------------- licensing: usable sq ft per child
const STATES = { MO: 'Missouri', KS: 'Kansas' };
const ROOM_TYPES = { home: 'Home daycare', center: 'Center classroom', church: 'Church multipurpose room (packs away)' };
const AGES = { twos: 'Twos', threes: 'Threes', prek: 'Pre-K' };   // the program serves ages 2 to 5 (younger choices removed 2026-10-07)
const IT = a => a === 'toddler';
const RULES = {
  MO: {
    home: { pre: 35, it: 35, cite: '5 CSR 25-400.085' },
    center: { pre: 35, it: 45, cite: '5 CSR 25-500.082', itNote: 'Missouri sets 35 or 45 sq ft per child for its youngest children, depending on facility size; the planner uses 45. Your license says which applies.' },
    church: { pre: 35, it: 45, cite: '5 CSR 25-300.090', itNote: 'License-exempt religious programs still need the space rule.' }
  },
  KS: {
    home: { pre: 25, it: 25, cite: 'K.A.R. 28-4-115(c)' },
    center: { pre: 28, it: 28, cite: 'K.S.A. 65-539(b)' },
    church: { pre: 28, it: 28, cite: 'K.S.A. 65-539(b)', itNote: 'Kansas has no religious exemption, so a church program uses the center rule.' }
  }
};
function minPerChild(setup) {
  const r = (RULES[setup.state] || RULES.MO)[setup.type] || RULES.MO.center;
  const ages = setup.ages && setup.ages.length ? setup.ages : ['threes'];
  return { sqft: Math.max(...ages.map(a => (IT(a) ? r.it : r.pre))), cite: r.cite, note: ages.some(IT) ? r.itNote || '' : '' };
}

// ---------------------------------------------------------------- the catalog
// g: fixed (the room's own features) | own (furniture the program owns) | kit (Learning Zones Kit) | mark (planning marker)
// cat: wall (on a wall) | solid (people walk around it) | floor (flat, walkable: rugs and mats) | low (small, low) | mark
// h: height in inches (anything above SIGHT_H blocks a seated adult's view). use: false = fixed equipment, not usable floor space.
const SIGHT_H = 30;
const TYPES = {
  door: { g: 'fixed', cat: 'wall', name: 'Door', w: 36, sizes: [[32, '32 in'], [36, '36 in'], [72, 'Double, 72 in']] },
  window: { g: 'fixed', cat: 'wall', name: 'Window', w: 48 },
  outlet: { g: 'fixed', cat: 'wall', name: 'Outlet', w: 4 },
  heater: { g: 'fixed', cat: 'solid', name: 'Heater or radiator', w: 36, l: 10, h: 30, hot: true },
  sink: { g: 'fixed', cat: 'solid', name: 'Sink and counter', w: 36, l: 24, h: 34, use: false },
  bath: { g: 'fixed', cat: 'solid', name: 'Bathroom', w: 60, l: 60, h: 96, use: false },
  builtin: { g: 'fixed', cat: 'solid', name: 'Built-in shelves', w: 48, l: 14, h: 72, use: false },
  cubbies: { g: 'fixed', cat: 'solid', name: 'Cubbies', w: 48, l: 15, h: 48, use: false },
  column: { g: 'fixed', cat: 'solid', name: 'Column', w: 12, l: 12, h: 96, use: false },
  table: { g: 'own', cat: 'solid', name: 'Table', w: 48, l: 30, h: 22 },
  lowshelf: { g: 'own', cat: 'solid', name: 'Low shelf', w: 48, l: 13, h: 28, band: true },
  tallshelf: { g: 'own', cat: 'solid', name: 'Tall shelf', w: 36, l: 15, h: 60 },
  piano: { g: 'own', cat: 'solid', name: 'Piano or stage edge', w: 60, l: 26, h: 48 },
  circle: { g: 'kit', cat: 'floor', name: 'Friends Circle rug', zone: 'circle', sizes: [['r6', '6 ft round', 72, 72, true], ['r8', '8 ft round', 96, 96, true], ['custom', 'Custom size (quote)']] },
  mat: { g: 'kit', cat: 'floor', name: 'Zone mat', friend: true, sizes: [['35', '3 x 5 ft (home)', 36, 60], ['46', '4 x 6 ft (center)', 48, 72], ['custom', 'Custom size (quote)']] },
  fence: { g: 'kit', cat: 'solid', name: 'Friend Fence panel', h: 24, sizes: [['36', '36 in panel', 36, 3], ['24', '24 in short panel', 24, 3]], friend: true },
  corner: { g: 'kit', cat: 'solid', name: 'Friend Fence corner', w: 24, l: 24, h: 24, friend: true },
  sign: { g: 'kit', cat: 'wall', name: 'Zone sign', w: 12, friend: true },
  poster: { g: 'kit', cat: 'wall', name: 'Character poster', w: 18, friend: true },
  basket: { g: 'kit', cat: 'low', name: 'Puppet basket', w: 14, l: 14, h: 10, friend: true },
  teacher: { g: 'mark', cat: 'mark', name: 'Teacher position', w: 18, l: 18 }
};
const WALLS = { N: 'north', E: 'east', S: 'south', W: 'west' };
const label = it => {
  const t = TYPES[it.t]; if (!t) return 'Item';
  const z = it.z && ZONES[it.z] ? ZONES[it.z] : null;
  if (it.t === 'mat' && z) return z.short + '’s mat';
  if (it.t === 'circle') return 'Friends Circle rug';
  if (it.t === 'door') return it.exit ? 'Exit door' : 'Door';
  if (it.t === 'lowshelf' && it.band && ZONES[it.band]) return 'Low shelf with ' + ZONES[it.band].short + '’s Shelf Band';
  if (it.t === 'teacher') return 'Teacher position';
  if (z && TYPES[it.t].friend) return z.short + '’s ' + t.name.replace(/^Friend Fence/, 'fence').replace(/^Zone sign/, 'zone sign').replace(/^Character poster/, 'poster').replace(/^Puppet basket/, 'puppet basket').replace(/^fence panel/, 'fence panel');
  return t.name;
};

// ---------------------------------------------------------------- units
const r1 = n => Math.round(n * 10) / 10;
function fmtLen(inches, units) {
  const v = Math.max(0, Math.round(inches));
  if (units === 'm') return (v * 0.0254).toFixed(2) + ' m';
  const f = Math.floor(v / FT), i = v % FT;
  return f && i ? `${f} ft ${i} in` : f ? `${f} ft` : `${i} in`;
}
const fmtArea = (sqin, units) => (units === 'm' ? r1(sqin * 0.00064516) + ' m²' : Math.round(sqin / 144) + ' sq ft');
const fromMetres = m => Math.round(Number(m) / 0.0254);

// ---------------------------------------------------------------- geometry
function sizeOf(it) {
  const t = TYPES[it.t] || {};
  return { w: +it.w || t.w || 12, l: +it.l || t.l || 12 };
}
const isRound = it => it.t === 'teacher' || (it.t === 'circle' && (it.sz === 'r6' || it.sz === 'r8' || (it.sz === 'custom' && it.round)));
// The item's bounding box in room inches. Wall items sit in the wall band (6 in deep) at `at` along their wall.
function box(it, room) {
  const t = TYPES[it.t] || {};
  if (t.cat === 'wall') {
    const w = +it.w || t.w, d = 6, at = +it.at || 0;
    if (it.wall === 'N') return { x: at, y: 0, w, h: d };
    if (it.wall === 'S') return { x: at, y: room.l - d, w, h: d };
    if (it.wall === 'W') return { x: 0, y: at, w: d, h: w };
    return { x: room.w - d, y: at, w: d, h: w };
  }
  const s = sizeOf(it), turned = (it.rot || 0) % 180 !== 0;
  return { x: +it.x || 0, y: +it.y || 0, w: turned ? s.l : s.w, h: turned ? s.w : s.l };
}
// The shapes an item occupies: rectangles {x,y,w,h} or circles {cx,cy,r}.
function shapes(it, room) {
  const b = box(it, room);
  if (isRound(it)) return [{ cx: b.x + b.w / 2, cy: b.y + b.h / 2, r: Math.min(b.w, b.h) / 2 }];
  if (it.t === 'corner') {
    const k = 3, rot = ((it.rot || 0) % 360 + 360) % 360;
    const top = { x: b.x, y: b.y, w: b.w, h: k }, bottom = { x: b.x, y: b.y + b.h - k, w: b.w, h: k };
    const left = { x: b.x, y: b.y, w: k, h: b.h }, right = { x: b.x + b.w - k, y: b.y, w: k, h: b.h };
    return rot === 0 ? [top, left] : rot === 90 ? [top, right] : rot === 180 ? [bottom, right] : [bottom, left];
  }
  return [b];
}
const isC = s => s.r != null;
function rectsOverlap(a, b) { return a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS; }
function distPtRect(px, py, r) { const dx = Math.max(r.x - px, 0, px - (r.x + r.w)), dy = Math.max(r.y - py, 0, py - (r.y + r.h)); return Math.hypot(dx, dy); }
function shapeOverlap(a, b) {
  if (!isC(a) && !isC(b)) return rectsOverlap(a, b);
  if (isC(a) && isC(b)) return Math.hypot(a.cx - b.cx, a.cy - b.cy) < a.r + b.r - EPS;
  const c = isC(a) ? a : b, r = isC(a) ? b : a;
  return distPtRect(c.cx, c.cy, r) < c.r - EPS;
}
// Edge-to-edge distance between two shapes (0 when they touch or overlap).
function shapeGap(a, b) {
  if (!isC(a) && !isC(b)) {
    const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), 0), dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h), 0);
    return Math.hypot(dx, dy);
  }
  if (isC(a) && isC(b)) return Math.max(0, Math.hypot(a.cx - b.cx, a.cy - b.cy) - a.r - b.r);
  const c = isC(a) ? a : b, r = isC(a) ? b : a;
  return Math.max(0, distPtRect(c.cx, c.cy, r) - c.r);
}
const gapItems = (a, b, room) => Math.min(...shapes(a, room).flatMap(s => shapes(b, room).map(u => shapeGap(s, u))));
const overlapItems = (a, b, room) => shapes(a, room).some(s => shapes(b, room).some(u => shapeOverlap(s, u)));
function shapeInside(s, room) {
  if (isC(s)) return s.cx - s.r >= -EPS && s.cy - s.r >= -EPS && s.cx + s.r <= room.w + EPS && s.cy + s.r <= room.l + EPS;
  return s.x >= -EPS && s.y >= -EPS && s.x + s.w <= room.w + EPS && s.y + s.h <= room.l + EPS;
}
const shapeArea = s => (isC(s) ? Math.PI * s.r * s.r : s.w * s.h);
const centre = (it, room) => { const b = box(it, room); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; };
// Does the segment p-q cross the rectangle (shrunk a little so grazing a corner does not count)?
function segHitsRect(p, q, r0) {
  const r = { x: r0.x + 0.5, y: r0.y + 0.5, w: r0.w - 1, h: r0.h - 1 };
  if (r.w <= 0 || r.h <= 0) return false;
  let t0 = 0, t1 = 1; const dx = q.x - p.x, dy = q.y - p.y;
  const P = [-dx, dx, -dy, dy], Q = [p.x - r.x, r.x + r.w - p.x, p.y - r.y, r.y + r.h - p.y];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(P[i]) < 1e-9) { if (Q[i] < 0) return false; continue; }
    const t = Q[i] / P[i];
    if (P[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return t0 <= t1;
}

// ---------------------------------------------------------------- door swings and clearances
// An inswing door sweeps a square as wide as the door, inside the room, against its wall.
function swing(it, room) {
  if (it.t !== 'door' || it.swing === 'out') return null;
  const w = +it.w || 36, at = +it.at || 0;
  if (it.wall === 'N') return { x: at, y: 0, w, h: w };
  if (it.wall === 'S') return { x: at, y: room.l - w, w, h: w };
  if (it.wall === 'W') return { x: 0, y: at, w, h: w };
  return { x: room.w - w, y: at, w, h: w };
}
// A point just inside the doorway, where a person stands to leave.
function doorInside(it, room, depth = 20) {
  const w = +it.w || 36, at = +it.at || 0;
  if (it.wall === 'N') return { x: at + w / 2, y: depth };
  if (it.wall === 'S') return { x: at + w / 2, y: room.l - depth };
  if (it.wall === 'W') return { x: depth, y: at + w / 2 };
  return { x: room.w - depth, y: at + w / 2 };
}
const cat = it => (TYPES[it.t] || {}).cat;
const FLAMMABLE = it => ['circle', 'mat', 'fence', 'corner', 'basket', 'sign', 'poster'].includes(it.t);
const isSolid = it => cat(it) === 'solid';
const blocksWalking = it => isSolid(it);                     // rugs, mats, baskets and markers never block a walking route
const blocksSight = it => isSolid(it) && ((it.hgt != null ? +it.hgt : (TYPES[it.t] || {}).h) || 0) > SIGHT_H;

// ---------------------------------------------------------------- grid reachability (clear routes)
// Free cells are those whose centre is at least `clear` inches from every walking obstacle and from the walls: a person (or a
// wheelchair) of that width fits there. A cell is the grid step; half a cell of tolerance keeps exact 36 in gaps passing.
function grid(state, clear, step = 3) {
  const { room, items } = state, nx = Math.max(1, Math.floor(room.w / step)), ny = Math.max(1, Math.floor(room.l / step));
  const obs = items.filter(blocksWalking).flatMap(it => shapes(it, room));
  const need = clear - step / 2;
  const free = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const px = (i + 0.5) * step, py = (j + 0.5) * step;
    if (px < need || py < need || room.w - px < need || room.l - py < need) continue;
    let ok = true;
    for (const s of obs) { const d = isC(s) ? Math.hypot(px - s.cx, py - s.cy) - s.r : distPtRect(px, py, s); if (d < need) { ok = false; break; } }
    if (ok) free[j * nx + i] = 1;
  }
  return { nx, ny, step, free };
}
function flood(g, starts) {
  const seen = new Uint8Array(g.nx * g.ny), q = [];
  for (const s of starts) {
    const i = Math.min(g.nx - 1, Math.max(0, Math.floor(s.x / g.step))), j = Math.min(g.ny - 1, Math.max(0, Math.floor(s.y / g.step)));
    // start from the nearest free cell within 12 in of the doorway point
    let best = -1, bd = 1e9;
    for (let dj = -4; dj <= 4; dj++) for (let di = -4; di <= 4; di++) {
      const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= g.nx || b >= g.ny) continue;
      const k = b * g.nx + a; if (g.free[k] && di * di + dj * dj < bd) { bd = di * di + dj * dj; best = k; }
    }
    if (best >= 0 && !seen[best]) { seen[best] = 1; q.push(best); }
  }
  for (let h = 0; h < q.length; h++) {
    const k = q[h], i = k % g.nx, j = (k - i) / g.nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= g.nx || b >= g.ny) continue;
      const n = b * g.nx + a; if (g.free[n] && !seen[n]) { seen[n] = 1; q.push(n); }
    }
  }
  return seen;
}
// Is any reached cell inside the item's footprint (or, for small items, within 18 in of it)?
function reaches(g, seen, it, room) {
  const sh = shapes(it, room), pad = it.t === 'teacher' ? 18 : 0;
  for (let k = 0; k < seen.length; k++) {
    if (!seen[k]) continue;
    const i = k % g.nx, j = (k - i) / g.nx, px = (i + 0.5) * g.step, py = (j + 0.5) * g.step;
    for (const s of sh) { const d = isC(s) ? Math.hypot(px - s.cx, py - s.cy) - s.r : distPtRect(px, py, s); if (d <= pad) return true; }
  }
  return false;
}

// ---------------------------------------------------------------- sightlines from the teacher positions
function zonePoints(it, room) {
  const s = shapes(it, room)[0];
  if (isC(s)) { const k = s.r * 0.7; return [[s.cx, s.cy], [s.cx - k, s.cy], [s.cx + k, s.cy], [s.cx, s.cy - k], [s.cx, s.cy + k]].map(([x, y]) => ({ x, y })); }
  const m = Math.min(6, s.w / 4, s.h / 4);
  return [[s.x + s.w / 2, s.y + s.h / 2], [s.x + m, s.y + m], [s.x + s.w - m, s.y + m], [s.x + m, s.y + s.h - m], [s.x + s.w - m, s.y + s.h - m]].map(([x, y]) => ({ x, y }));
}
function sees(eye, pt, blockers) { return !blockers.some(r => segHitsRect(eye, pt, r)); }
function sightFor(state, zoneItem) {
  const { room, items } = state;
  const eyes = items.filter(i => i.t === 'teacher').map(i => centre(i, room));
  const blockers = items.filter(blocksSight).flatMap(i => shapes(i, room)).filter(s => !isC(s));
  const pts = zonePoints(zoneItem, room);
  const seen = pts.map(p => eyes.some(e => sees(e, p, blockers)));
  return { centre: seen[0], all: seen.every(Boolean), any: seen.some(Boolean), seen, eyes: eyes.length };
}
const blockerName = (state, eye, pt) => { const it = state.items.find(i => blocksSight(i) && shapes(i, state.room).some(s => !isC(s) && segHitsRect(eye, pt, s))); return it ? label(it) : 'something tall'; };

// ---------------------------------------------------------------- space
function space(state) {
  const { room, items, setup } = state;
  const fixedIn = items.filter(i => TYPES[i.t] && TYPES[i.t].use === false).reduce((a, i) => a + shapes(i, room).reduce((b, s) => b + clippedArea(s, room), 0), 0);
  const total = room.w * room.l, usable = Math.max(0, total - fixedIn);
  const rule = minPerChild(setup), n = Math.max(0, Math.round(+setup.children || 0));
  const usableSqft = usable / 144, perChild = n ? usableSqft / n : null, capacity = Math.floor(usableSqft / rule.sqft + 1e-9);
  const kit = items.filter(i => cat(i) === 'floor').reduce((a, i) => a + shapes(i, room).reduce((b, s) => b + shapeArea(s), 0), 0);
  return { totalSqft: total / 144, usableSqft, fixedSqft: fixedIn / 144, min: rule.sqft, cite: rule.cite, note: rule.note, children: n, perChild, capacity,
    ok: !n || perChild >= rule.sqft - 1e-9, ratio: n ? perChild / rule.sqft : null, kitShare: total ? kit / total : 0 };
}
function clippedArea(s, room) {
  if (isC(s)) return Math.PI * s.r * s.r;
  const x0 = Math.max(0, s.x), y0 = Math.max(0, s.y), x1 = Math.min(room.w, s.x + s.w), y1 = Math.min(room.l, s.y + s.h);
  return Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
}

// ---------------------------------------------------------------- the fit check
// level: stop (must fix before install), warn (check with us), tip (good practice). kind groups the headings in the panel.
const KINDS = { fit: 'Doesn’t fit', exit: 'Blocks the exit', walk: 'Walkway under 36 in', sight: 'Blocks a sightline', space: 'Space per child', safety: 'Safety', calm: 'Calm and noise', access: 'Accessibility', light: 'Natural light', age: 'Ages and floors' };
function check(state) {
  const { room, items, setup } = state, out = [];
  const add = (level, kind, msg, ids) => out.push({ level, kind, msg, ids: ids || [] });
  const zonesOf = items.filter(i => i.t === 'mat' || i.t === 'circle');
  // 1. fits inside the room
  for (const it of items) {
    if (cat(it) === 'wall') {
      const len = it.wall === 'N' || it.wall === 'S' ? room.w : room.l;
      if ((+it.at || 0) < -EPS || (+it.at || 0) + (+it.w || TYPES[it.t].w) > len + EPS) add('stop', 'fit', `${label(it)} runs past the end of the ${WALLS[it.wall]} wall.`, [it.id]);
    } else if (!shapes(it, room).every(s => shapeInside(s, room))) add('stop', 'fit', `${label(it)} does not fit: it runs past a wall.`, [it.id]);
  }
  // 2. overlaps
  const floorish = items.filter(i => ['solid', 'floor', 'low', 'mark'].includes(cat(i)));
  for (let a = 0; a < floorish.length; a++) for (let b = a + 1; b < floorish.length; b++) {
    const A = floorish[a], B = floorish[b]; if (!overlapItems(A, B, room)) continue;
    const ca = cat(A), cb = cat(B), pair = [A.id, B.id];
    if (ca === 'solid' && cb === 'solid') add('stop', 'fit', `${label(A)} and ${label(B)} overlap.`, pair);
    else if (ca === 'floor' && cb === 'floor') add('warn', 'fit', `${label(A)} and ${label(B)} overlap. Lay mats side by side, never on top of each other: a doubled edge is a trip edge.`, pair);
    else if ((ca === 'solid' && cb === 'floor') || (ca === 'floor' && cb === 'solid')) {
      const s = ca === 'solid' ? A : B, f = ca === 'solid' ? B : A;
      if (s.t === 'fence' || s.t === 'corner') add('warn', 'fit', `${label(s)} stands on ${label(f)}. Stand fences beside the mat so their feet sit flat on the floor.`, pair);
      else add('warn', 'fit', `${label(f)} runs under ${label(s)}. Keep mats clear of furniture so the edge lies flat.`, pair);
    } else if (ca === 'mark' || cb === 'mark') { const o = ca === 'mark' ? B : A; if (cat(o) === 'solid') add('stop', 'fit', `The teacher position is inside ${label(o)}. Move it to open floor.`, pair); }
    else if (ca === 'low' && cb === 'solid' || ca === 'solid' && cb === 'low') add('warn', 'fit', `${label(A)} and ${label(B)} overlap.`, pair);
  }
  // 3. door swings: nothing solid inside, nothing loose underneath
  const doors = items.filter(i => i.t === 'door'), exits = doors.filter(d => d.exit);
  for (const d of doors) {
    const sw = swing(d, room); if (!sw) continue;
    for (const it of floorish) {
      if (it.t === 'teacher') continue;
      if (!shapes(it, room).some(s => shapeOverlap(s, sw))) continue;
      if (isSolid(it)) add('stop', 'exit', `${label(it)} is in the swing of the ${d.exit ? 'exit ' : ''}door on the ${WALLS[d.wall]} wall. The door must open fully.`, [it.id, d.id]);
      else add('warn', 'exit', `${label(it)} is in the swing of the door on the ${WALLS[d.wall]} wall. A rug edge under a door catches it and trips children.`, [it.id, d.id]);
    }
    for (const it of items) if ((it.t === 'sign' || it.t === 'poster') && it.wall === d.wall && overlap1(it, d)) add('warn', 'fit', `${label(it)} is over the door on the ${WALLS[d.wall]} wall. Nothing hangs on or over a door.`, [it.id, d.id]);
  }
  for (const w of items.filter(i => i.t === 'window')) for (const it of items) if ((it.t === 'sign' || it.t === 'poster') && it.wall === w.wall && overlap1(it, w)) add('warn', 'fit', `${label(it)} covers the window on the ${WALLS[w.wall]} wall.`, [it.id, w.id]);
  // 4. exits: at least one, every zone and every adult position on a 36 in clear route to one
  if (!exits.length) add('stop', 'exit', 'Mark at least one door as an exit, so the planner can check the 36 in clear path.', []);
  else {
    const g = grid(state, 18), seen = flood(g, exits.map(d => doorInside(d, room)));
    const startOk = exits.some(d => { const p = doorInside(d, room); const i = Math.floor(p.x / g.step), j = Math.floor(p.y / g.step); for (let dj = -4; dj <= 4; dj++) for (let di = -4; di <= 4; di++) { const k = (j + dj) * g.nx + (i + di); if (k >= 0 && k < seen.length && seen[k]) return true; } return false; });
    if (!startOk) add('stop', 'exit', 'Something blocks the exit door: keep 36 in clear in front of it.', exits.map(d => d.id));
    else for (const it of [...zonesOf, ...items.filter(i => i.t === 'teacher')]) if (!reaches(g, seen, it, room)) add('stop', 'exit', `No 36 in clear route from ${label(it)} to an exit. Open a gap of at least 36 in.`, [it.id]);
  }
  // 5. walkways between things people walk around
  const solids = items.filter(i => isSolid(i));
  for (let a = 0; a < solids.length; a++) for (let b = a + 1; b < solids.length; b++) {
    const A = solids[a], B = solids[b];
    if (overlapItems(A, B, room)) continue;
    const gap = gapItems(A, B, room);
    if (gap > 1 && gap < 36 - 0.5 && facing(A, B, room)) add('warn', 'walk', `Only ${Math.round(gap)} in between ${label(A)} and ${label(B)}. Leave 36 in for a clear walkway, or push them together.`, [A.id, B.id]);
  }
  // 6. heaters: 36 in clear of anything that can burn
  for (const h of items.filter(i => TYPES[i.t] && TYPES[i.t].hot)) for (const it of items.filter(FLAMMABLE)) {
    const gap = cat(it) === 'wall' ? wallGap(it, h, room) : gapItems(it, h, room);
    if (gap < 36 - 0.5) add('stop', 'safety', `${label(it)} is ${Math.round(gap)} in from the ${TYPES[h.t].name.toLowerCase()}. Keep rugs, mats, fences and paper 36 in away.`, [it.id, h.id]);
  }
  // 7. sightlines
  const teachers = items.filter(i => i.t === 'teacher');
  if (!teachers.length) add('warn', 'sight', 'Add a teacher position to check that an adult can see every zone.', []);
  else for (const z of zonesOf) {
    const s = sightFor(state, z), eye = centre(teachers[0], room), pt = zonePoints(z, room)[0];
    if (z.z === 'lumi' && !s.all) add('stop', 'sight', `${label(z)} is ${s.centre ? 'partly' : ''} hidden from the teacher positions by ${blockerName(state, eye, pt)}. Lumi’s Calm Corner must stay in full view.`.replace('  ', ' '), [z.id]);
    else if (!s.centre) add('stop', 'sight', `${label(z)} cannot be seen from a teacher position: ${blockerName(state, eye, pt)} is in the way.`, [z.id]);
    else if (!s.all) add('warn', 'sight', `Part of ${label(z)} is hidden from the teacher positions. Move the teacher spot or the tall furniture.`, [z.id]);
  }
  // 8. calm and noise; natural light for reading
  const mat = k => items.find(i => i.t === 'mat' && i.z === k);
  const lumi = mat('lumi'), bop = mat('bop'), booker = mat('booker');
  if (lumi) {
    for (const d of doors) if (gapItems(lumi, d, room) < 60) add('warn', 'calm', `Lumi’s Calm Corner is within 5 ft of a door. Calm zones work best away from doors and busy walkways.`, [lumi.id, d.id]);
    if (bop && gapItems(lumi, bop, room) < 72) add('warn', 'calm', 'Lumi’s Calm Corner is within 6 ft of Bop’s Movement Zone. Put the quiet zone and the noisy zone on opposite sides of the room.', [lumi.id, bop.id]);
  }
  if (booker) {
    const win = items.filter(i => i.t === 'window');
    if (win.length && !win.some(w => gapItems(booker, w, room) <= 48)) add('tip', 'light', 'Booker’s Reading Area is far from the windows. Natural light is best for books, if a window wall is free.', [booker.id]);
  }
  // 9. wall art cap (20% of each wall, NFPA 101 planning number; Missouri allows 30%)
  for (const w of Object.keys(WALLS)) {
    const art = items.filter(i => (i.t === 'sign' || i.t === 'poster') && i.wall === w).reduce((a, i) => a + (i.t === 'poster' ? 18 * 24 : (+i.w || 12) * (+i.w === 9 ? 12 : 18)), 0);
    const wallArea = (w === 'N' || w === 'S' ? room.w : room.l) * 96;
    if (art > 0.2 * wallArea) add('warn', 'safety', `Signs and posters cover more than 20 percent of the ${WALLS[w]} wall (the planning cap for fire code).`, []);
  }
  // 10. accessibility: one 60 in turning circle on open floor
  const g60 = grid(state, 30, 6);
  if (!g60.free.some(Boolean)) add('warn', 'access', 'No open 60 in circle on the floor: a wheelchair needs one place to turn around.', []);
  // 11. space per child
  const sp = space(state);
  if (sp.children && !sp.ok) add('stop', 'space', `${r1(sp.perChild)} sq ft per child is under the ${STATES[setup.state] || ''} minimum of ${sp.min} sq ft (${sp.cite}). This room fits ${sp.capacity} children.`, []);
  // 12. ages and floors
  const ages = setup.ages || [];
  if (setup.state === 'MO' && ages.some(IT) && items.some(i => i.t === 'mat' || i.t === 'circle')) add('warn', 'age', 'Missouri bars carpet in rooms for its youngest children and calls for washable mats laundered daily (5 CSR 25-500.082). Your quote switches every rug and mat to the washable version.', []);
  if (ages.includes('twos')) add('tip', 'age', 'Rooms with twos: zone bins ship with a no-small-parts label and a small-parts tester card.', []);
  if (items.some(i => i.t === 'outlet')) add('tip', 'safety', 'Outlets: use tamper-resistant covers, and run no cords across mats, floor paths or walkways.', items.filter(i => i.t === 'outlet').map(i => i.id));
  return out;
}
// along-wall overlap of two wall items on the same wall
function overlap1(a, b) { const a0 = +a.at || 0, a1 = a0 + (+a.w || TYPES[a.t].w), b0 = +b.at || 0, b1 = b0 + (+b.w || TYPES[b.t].w); return a0 < b1 - EPS && b0 < a1 - EPS; }
function wallGap(wallItem, other, room) { return shapes(other, room).reduce((m, s) => Math.min(m, shapeGap(box(wallItem, room), s)), 1e9); }
// Two things face each other when they overlap by at least a foot along the axis that runs between them (a real walkway).
function facing(a, b, room) {
  return shapes(a, room).some(s => shapes(b, room).some(u => {
    const S = isC(s) ? { x: s.cx - s.r, y: s.cy - s.r, w: 2 * s.r, h: 2 * s.r } : s, U = isC(u) ? { x: u.cx - u.r, y: u.cy - u.r, w: 2 * u.r, h: 2 * u.r } : u;
    const ox = Math.min(S.x + S.w, U.x + U.w) - Math.max(S.x, U.x), oy = Math.min(S.y + S.h, U.y + U.h) - Math.max(S.y, U.y);
    return ox >= 12 || oy >= 12;
  }));
}
function summary(issues) {
  const n = l => issues.filter(i => i.level === l).length;
  return { stop: n('stop'), warn: n('warn'), tip: n('tip'), ok: n('stop') === 0 };
}

// ---------------------------------------------------------------- floor paths: auto-routed from the Friends Circle to each zone
function paths(state) {
  const { room, items } = state;
  const circle = items.find(i => i.t === 'circle'); if (!circle) return [];
  const step = 6, nx = Math.floor(room.w / step), ny = Math.floor(room.l / step);
  const obs = items.filter(blocksWalking).flatMap(i => shapes(i, room));
  const avoid = items.filter(i => i.t === 'door').map(d => swing(d, room) || box(d, room));
  const hot = items.filter(i => TYPES[i.t] && TYPES[i.t].hot).flatMap(i => shapes(i, room));
  const blocked = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const px = (i + 0.5) * step, py = (j + 0.5) * step;
    if (px < 9 || py < 9 || room.w - px < 9 || room.l - py < 9) { blocked[j * nx + i] = 1; continue; }
    if (obs.some(s => (isC(s) ? Math.hypot(px - s.cx, py - s.cy) - s.r : distPtRect(px, py, s)) < 9)) blocked[j * nx + i] = 1;
    else if (avoid.some(r => distPtRect(px, py, r) < 3) || hot.some(s => distPtRect(px, py, s) < 36)) blocked[j * nx + i] = 1;
  }
  const cell = p => Math.min(ny - 1, Math.max(0, Math.floor(p.y / step))) * nx + Math.min(nx - 1, Math.max(0, Math.floor(p.x / step)));
  const inShape = (it, px, py) => shapes(it, room).some(s => (isC(s) ? Math.hypot(px - s.cx, py - s.cy) <= s.r : px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h));
  const out = [];
  for (const k of FRIENDS) {
    const mat = items.find(i => i.t === 'mat' && i.z === k); if (!mat) continue;
    // BFS from the mat's cells outwards until a circle cell is reached (8 neighbours, diagonal moves only between open cells)
    const prev = new Int32Array(nx * ny).fill(-2), q = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const px = (i + 0.5) * step, py = (j + 0.5) * step; if (inShape(mat, px, py)) { const c = j * nx + i; prev[c] = -1; q.push(c); } }
    let hit = -1;
    for (let h = 0; h < q.length && hit < 0; h++) {
      const c = q[h], i = c % nx, j = (c - i) / nx;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= ny) continue;
        const n = b * nx + a; if (prev[n] !== -2) continue;
        const px = (a + 0.5) * step, py = (b + 0.5) * step;
        if (inShape(circle, px, py)) { prev[n] = c; hit = n; break; }
        if (blocked[n]) continue;
        if (di && dj && (blocked[j * nx + a] || blocked[b * nx + i])) continue;
        prev[n] = c; q.push(n);
      }
    }
    if (hit < 0) { out.push({ z: k, ok: false, pts: [], prints: 0 }); continue; }
    const cells = []; for (let c = prev[hit]; c >= 0; c = prev[c]) cells.push(c);   // from circle edge back into the mat
    const pts = cells.map(c => { const i = c % nx; return { x: (i + 0.5) * step, y: ((c - i) / nx + 0.5) * step }; })
      .filter(p => !inShape(mat, p.x, p.y) && !inShape(circle, p.x, p.y));
    // one print every 12 in along the route
    const prints = []; let acc = 12;
    for (let i = 0; i < pts.length; i++) {
      if (i) acc += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (acc >= 12) { prints.push(pts[i]); acc = 0; }
    }
    out.push({ z: k, ok: true, pts, prints: prints.length, at: prints, mat: mat.id });
  }
  return out;
}

// ---------------------------------------------------------------- templates and auto-arrange
let seq = 0;
const nid = () => 'i' + (++seq).toString(36) + Math.random().toString(36).slice(2, 6);
function make(t, o) { const T0 = TYPES[t]; return Object.assign({ id: nid(), t, x: 0, y: 0, rot: 0 }, T0.cat === 'wall' ? { wall: 'S', at: 0, w: T0.w } : { w: T0.w, l: T0.l }, o || {}); }
function sized(t, sz, o) { const s = TYPES[t].sizes.find(x => x[0] === sz); return make(t, Object.assign({ sz, w: s[2], l: s[3] }, o)); }
const DEFAULT_SETUP = { units: 'ft', state: 'MO', type: 'center', ages: ['threes', 'prek'], children: 12, rooms: 1, pkg: 'auto', install: false };

const TEMPLATES = {
  home: {
    name: 'Home daycare, 12 x 14 ft', setup: { type: 'home', ages: ['twos', 'threes'], children: 4, rooms: 1 },
    room: { w: 14 * FT, l: 12 * FT },
    fixed: () => [make('door', { wall: 'S', at: 128, w: 32, exit: true }), make('window', { wall: 'N', at: 60, w: 48 }), make('outlet', { wall: 'E', at: 60 }),
      make('cubbies', { x: 70, y: 129 }), make('table', { x: 0, y: 66, w: 36, l: 30, rot: 90 })]
  },
  classroom: {
    name: 'Center classroom, 20 x 25 ft', setup: { type: 'center', ages: ['threes', 'prek'], children: 13, rooms: 1 },
    room: { w: 25 * FT, l: 20 * FT },
    fixed: () => [make('door', { wall: 'S', at: 30, w: 36, exit: true }), make('window', { wall: 'N', at: 66, w: 60 }), make('window', { wall: 'N', at: 174, w: 60 }),
      make('sink', { x: 252, y: 216 }), make('cubbies', { x: 90, y: 225 }), make('cubbies', { x: 138, y: 225 }), make('table', { x: 186, y: 144 }),
      make('lowshelf', { x: 108, y: 0 }), make('outlet', { wall: 'E', at: 100 }), make('outlet', { wall: 'W', at: 100 })]
  },
  church: {
    name: 'Church hall section, 28 x 22 ft, packs away', setup: { type: 'church', ages: ['threes', 'prek'], children: 15, rooms: 1 },
    room: { w: 28 * FT, l: 22 * FT },
    fixed: () => [make('door', { wall: 'W', at: 24, w: 36, exit: true }), make('door', { wall: 'E', at: 204, w: 36, exit: true }),
      make('builtin', { x: 0, y: 132, w: 48, l: 24, rot: 90, hgt: 72 }), make('piano', { x: 138, y: 238 }), make('heater', { x: 150, y: 0 }), make('outlet', { wall: 'S', at: 60 })]
  }
};
function template(k, setup) {
  const T0 = TEMPLATES[k] || TEMPLATES.classroom;
  const st = { v: 1, name: T0.name, room: Object.assign({}, T0.room), setup: Object.assign({}, DEFAULT_SETUP, setup || {}, T0.setup), items: T0.fixed() };
  return autoArrange(st);
}

// Places the kit for any room: quiet zones (Booker, Lumi) in the corners farthest from the exit, Bop near the door side, Zuri near
// the sink or tables, the Friends Circle in the middle, fences on the open sides with a 36 in doorway facing the circle, signs and
// posters on the nearest wall, a puppet basket on each mat and the teacher position that sees the most.
function autoArrange(state) {
  // try a few strategies and keep the one with the fewest problems (then the most zones placed)
  let best = null;
  for (const opt of [{ circleFirst: true }, { circleFirst: false }, { circleFirst: true, tight: true }, { circleFirst: false, tight: true }]) {
    const r = arrange(state, opt), iss = check(r), sm = summary(iss);
    const zonesPlaced = r.items.filter(i => i.t === 'mat' || i.t === 'circle').length, fences = r.items.filter(i => i.t === 'fence').length;
    const score = sm.stop * 1000 + sm.warn * 10 - zonesPlaced * 60 - fences * 2 + (r.items.some(i => i.t === 'circle') ? 0 : 3000);
    if (!best || score < best.score) best = { score, r };
  }
  return best.r;
}
function arrange(state, opt) {
  const s = { v: 1, name: state.name || '', room: Object.assign({}, state.room), setup: Object.assign({}, DEFAULT_SETUP, state.setup || {}),
    items: (state.items || []).filter(i => TYPES[i.t] && (TYPES[i.t].g === 'fixed' || TYPES[i.t].g === 'own')).map(i => Object.assign({}, i)) };
  const { room } = s, type = s.setup.type, area = room.w * room.l / 144;
  const small = area < 230;
  const matSz = type === 'center' && area >= 330 ? '46' : '35';
  const circSz = type === 'center' && area >= 330 ? 'r8' : 'r6';
  const perZone = type === 'center' && area >= 330 ? 2 : 1;
  const exits = s.items.filter(i => i.t === 'door'), door = exits.find(d => d.exit) || exits[0];
  const dp = door ? doorInside(door, room, 0) : { x: room.w / 2, y: room.l };
  const corners = [{ k: 'NW', x: 0, y: 0 }, { k: 'NE', x: room.w, y: 0 }, { k: 'SE', x: room.w, y: room.l }, { k: 'SW', x: 0, y: room.l }]
    .map(c => Object.assign(c, { d: Math.min(...(exits.length ? exits : [null]).map(e => { const p = e ? doorInside(e, room, 0) : dp; return Math.hypot(c.x - p.x, c.y - p.y); })) }))
    .sort((a, b) => b.d - a.d);
  const near = (c, t) => Math.min(1e9, ...s.items.filter(i => i.t === t).map(i => { const p = centre(i, room); return Math.hypot(c.x - p.x, c.y - p.y); }));
  // one exit door: the quiet corners are the two on the opposite wall; otherwise the two farthest from every door
  const opp = { N: ['SW', 'SE'], S: ['NW', 'NE'], W: ['NE', 'SE'], E: ['NW', 'SW'] };
  const doorWalls = [...new Set(exits.map(d => d.wall))];
  let q2 = corners.slice(0, 2);
  if (doorWalls.length === 1) q2 = corners.filter(c => opp[doorWalls[0]].includes(c.k));
  const busy = corners.filter(c => !q2.includes(c)).sort((a, b) => Math.min(near(a, 'sink'), near(a, 'table')) - Math.min(near(b, 'sink'), near(b, 'table')));
  // Lumi takes the quiet corner farthest from Bop's (the noisy zone), Booker the other; Zuri the busy corner by the sink or tables
  const bopC = small ? null : busy[1];
  const far = c => (bopC ? Math.hypot(c.x - bopC.x, c.y - bopC.y) : c.d);
  const quiet = q2.slice().sort((a, b) => far(b) - far(a));
  const plan = [['lumi', quiet[0]], ['booker', quiet[1]], ['zuri', busy[0]]];
  if (!small) plan.push(['bop', busy[1]]);
  const circ = sized('circle', circSz, {});
  const swingsAll = doorSwings(s);
  const gapF = opt.tight ? 2 : 24, gapS = opt.tight ? 18 : 30;
  const clearOf = (it, solidGap) => !s.items.some(o => (isSolid(o) || cat(o) === 'floor') && (solidGap ? gapItems(it, o, room) < (isSolid(o) ? gapS : gapF) : overlapItems(it, o, room))) && !swingsAll.some(sw => shapes(it, room).some(sh => shapeOverlap(sh, sw)));
  const placed = [];                                         // groups already placed (mat + fences, and the circle)
  let spot = null;
  const putCircle = () => {
    spot = bestSpot(s, circ, { x: room.w / 2, y: room.l / 2 }, it => clearOf(it, true)) || bestSpot(s, circ, { x: room.w / 2, y: room.l / 2 }, it => clearOf(it, false));
    if (spot) { s.items.push(spot); placed.push([spot]); }
  };
  if (opt.circleFirst) putCircle();
  for (const [k, c] of plan) {
    const g = placeZone(s, k, c, matSz, perZone, placed, gapF) || placeZone(s, k, c, matSz, Math.min(1, perZone), placed, gapF) || placeZone(s, k, c, '35', 0, placed, gapF);
    if (g) { s.items.push(...g); placed.push(g); }
  }
  if (!opt.circleFirst) putCircle();
  // shelf bands go on the program's own low shelves, nearest zone first
  const used = new Set();
  for (const sh of s.items.filter(i => i.t === 'lowshelf')) {
    const best = FRIENDS.filter(k => !used.has(k)).map(k => ({ k, m: s.items.find(i => i.t === 'mat' && i.z === k) })).filter(x => x.m).sort((a, b) => gapItems(sh, a.m, room) - gapItems(sh, b.m, room))[0];
    if (best) { sh.band = best.k; used.add(best.k); }
  }
  // signs and posters (banner stands in a church: the same spots, standing against the wall)
  for (const k of FRIENDS) {
    const m = s.items.find(i => i.t === 'mat' && i.z === k) || (k === 'bop' ? spot : null); if (!m) continue;
    for (const t of ['sign', 'poster']) { const w = wallSpot(s, m, t === 'sign' ? (type === 'home' ? 9 : 12) : 18); if (w) s.items.push(make(t, Object.assign({ z: k }, w))); }
  }
  // a puppet basket in each mat's wall corner
  for (const m of s.items.filter(i => i.t === 'mat')) {
    const b = box(m, room), bx = b.x + (b.x < room.w / 2 ? 3 : b.w - 17), by = b.y + (b.y < room.l / 2 ? 3 : b.h - 17);
    s.items.push(make('basket', { z: m.z, x: bx, y: by }));
  }
  // teacher positions: the open-floor spot that sees the most zone points; a second one in a larger room
  const zonesIt = s.items.filter(i => i.t === 'mat' || i.t === 'circle');
  const t1 = bestTeacher(s, zonesIt, []);
  if (t1) s.items.push(t1);
  if (t1 && type !== 'home' && area >= 330) { const t2 = bestTeacher(s, zonesIt, [t1]); if (t2) s.items.push(t2); }
  return s;
}
const doorSwings = s => s.items.filter(i => i.t === 'door').map(d => swing(d, s.room)).filter(Boolean);
function hotZones(s) { return s.items.filter(i => TYPES[i.t] && TYPES[i.t].hot).flatMap(i => shapes(i, s.room)); }
// Try every grid position near the target (6 in steps, nearest first); return the item at the first spot that passes `ok`.
function bestSpot(s, it, target, ok, step = 6) {
  const { room } = s, b0 = box(it, room), cands = [];
  for (let y = 0; y + b0.h <= room.l + EPS; y += step) for (let x = 0; x + b0.w <= room.w + EPS; x += step) cands.push({ x, y, d: Math.hypot(x + b0.w / 2 - target.x, y + b0.h / 2 - target.y) });
  cands.sort((a, b) => a.d - b.d);
  for (const c of cands) { const t = Object.assign({}, it, { x: c.x, y: c.y }); if (ok(t)) return t; }
  return null;
}
function placeZone(s, k, corner, matSz, perZone, placed, gapF = 24) {
  const { room } = s, base = TYPES.mat.sizes.find(x => x[0] === matSz);
  const swings = doorSwings(s), hot = hotZones(s);
  const others = s.items.filter(i => isSolid(i) || cat(i) === 'floor');
  const wallsIt = s.items.filter(i => i.t === 'door' || i.t === 'window');
  let best = null;
  for (const rot of [90, 0]) {                               // long side along the wall first
    const m0 = make('mat', { z: k, sz: matSz, w: base[2], l: base[3], rot });
    const b0 = box(m0, room), tx = corner.x ? room.w - b0.w : 0, ty = corner.y ? room.l - b0.h : 0;
    const cands = [];
    for (let y = 0; y + b0.h <= room.l + EPS; y += 6) for (let x = 0; x + b0.w <= room.w + EPS; x += 6) cands.push({ x, y, d: Math.hypot(x - tx, y - ty) });
    cands.sort((a, b) => a.d - b.d);
    for (const c of cands.slice(0, 1200)) {
      if (best && c.d >= best.d) break;
      const mat = Object.assign({}, m0, { x: Math.min(c.x + (corner.x ? -3 : 3), room.w - b0.w), y: Math.min(c.y + (corner.y ? -3 : 3), room.l - b0.h) });
      mat.x = Math.max(0, mat.x); mat.y = Math.max(0, mat.y);
      const grp = [mat, ...fencesFor(mat, room, corner, perZone, k)];
      const bad = grp.some(g => !shapes(g, room).every(sh => shapeInside(sh, room)) ||
        others.some(o => overlapItems(g, o, room) || (isSolid(g) || isSolid(o) ? (isSolid(g) && isSolid(o) ? (gapItems(g, o, room) > 1 && gapItems(g, o, room) < 36) : false) : false)) ||
        placed.some(p => p.some(o => gapItems(g, o, room) < (isSolid(g) && isSolid(o) ? 36 : gapF))) ||
        swings.some(sw => shapes(g, room).some(sh => shapeOverlap(sh, sw))) ||
        hot.some(h => shapes(g, room).some(sh => shapeGap(sh, h) < 36)) ||
        wallsIt.some(w => w.t === 'door' && gapItems(g, w, room) < 36));
      if (!bad) { best = { d: c.d, grp }; break; }
    }
  }
  return best ? best.grp : null;
}
// Fence panels on the mat's open sides (the sides that face into the room), set back 2 in, starting from the wall end so the
// opening (the zone's doorway) faces the middle of the room.
function fencesFor(mat, room, corner, perZone, k) {
  const b = box(mat, room), out = [];
  const east = corner.x === 0, south = corner.y === 0;      // which sides face the room
  const hx = east ? b.x : b.x + b.w - 36, vy = south ? b.y : b.y + b.h - 36;
  const horiz = make('fence', { sz: '36', w: 36, l: 3, rot: 0, z: k, x: Math.max(0, hx), y: south ? b.y + b.h + 2 : b.y - 5 });
  const vert = make('fence', { sz: '36', w: 36, l: 3, rot: 90, z: k, x: east ? b.x + b.w + 2 : b.x - 5, y: Math.max(0, vy) });
  // one panel: put it on the side that does not face the middle of the room, so the open side (the doorway) does
  const dx = Math.abs(room.w / 2 - (b.x + b.w / 2)) / room.w, dy = Math.abs(room.l / 2 - (b.y + b.h / 2)) / room.l;
  if (perZone >= 2) out.push(horiz, vert); else if (perZone === 1) out.push(dx >= dy ? horiz : vert);
  return out;
}
function wallSpot(s, it, w) {
  const { room } = s, b = box(it, room);
  const cands = [];
  if (b.y < room.l / 2) cands.push({ wall: 'N', at: b.x + b.w / 2 - w / 2, d: b.y }); else cands.push({ wall: 'S', at: b.x + b.w / 2 - w / 2, d: room.l - b.y - b.h });
  if (b.x < room.w / 2) cands.push({ wall: 'W', at: b.y + b.h / 2 - w / 2, d: b.x }); else cands.push({ wall: 'E', at: b.y + b.h / 2 - w / 2, d: room.w - b.x - b.w });
  cands.sort((a, c) => a.d - c.d);
  for (const c of cands) {
    const len = c.wall === 'N' || c.wall === 'S' ? room.w : room.l;
    for (let off = 0; off <= len; off += 6) for (const sg of [1, -1]) {
      const at = Math.max(0, Math.min(len - w, c.at + sg * off));
      const probe = { t: 'sign', wall: c.wall, at, w };
      const clash = s.items.some(o => o.wall === c.wall && (o.t === 'door' || o.t === 'window' || o.t === 'sign' || o.t === 'poster' || o.t === 'outlet') && overlap1(probe, o))
        || hotZones(s).some(h => shapeGap(box(probe, room), h) < 36);
      if (!clash) return { wall: c.wall, at, w };
    }
  }
  return null;
}
// Puts a new item on the nearest free spot to the middle of the room (wall items: the first free stretch of wall).
function placeNew(state, it) {
  const { room } = state;
  if (cat(it) === 'wall') {
    for (const wall of ['N', 'E', 'S', 'W']) {
      const len = wall === 'N' || wall === 'S' ? room.w : room.l, w = +it.w || TYPES[it.t].w;
      for (let at = Math.round((len - w) / 2 / 6) * 6, k = 0; k <= len; k += 6) for (const sg of [1, -1]) {
        const a = Math.max(0, Math.min(len - w, at + sg * k)), probe = Object.assign({}, it, { wall, at: a });
        if (!state.items.some(o => o.wall === wall && cat(o) === 'wall' && overlap1(probe, o))) return Object.assign(it, { wall, at: a });
      }
    }
    return Object.assign(it, { wall: 'N', at: 0 });
  }
  const c = cat(it), inside = t => shapes(t, room).every(sh => shapeInside(sh, room));
  const ok = t => inside(t) && !state.items.some(o => (isSolid(o) || (c === 'floor' && cat(o) === 'floor') || (c === 'solid' && cat(o) === 'floor')) && overlapItems(t, o, room));
  const mid = { x: room.w / 2, y: room.l / 2 };
  const r = bestSpot(state, it, mid, ok) || bestSpot(state, it, mid, inside);
  return r ? Object.assign(it, { x: r.x, y: r.y }) : Object.assign(it, { x: 0, y: 0 });
}
function bestTeacher(s, zonesIt, have) {
  const { room } = s, blockers = s.items.filter(blocksSight).flatMap(i => shapes(i, room)).filter(x => !isC(x));
  const pts = zonesIt.map(z => ({ z, p: zonePoints(z, room) }));
  let best = null;
  for (let y = 24; y <= room.l - 24; y += 12) for (let x = 24; x <= room.w - 24; x += 12) {
    const t = make('teacher', { x: x - 9, y: y - 9 });
    if (s.items.some(o => (isSolid(o) || o.t === 'mat') && overlapItems(t, o, room))) continue;
    if (have.some(h => Math.hypot(centre(h, room).x - x, centre(h, room).y - y) < 96)) continue;
    const eye = { x, y };
    let score = 0;
    for (const { z, p } of pts) p.forEach((q, i) => { if (!blockers.some(r => segHitsRect(eye, q, r))) score += (z.z === 'lumi' ? 3 : 1) * (i ? 1 : 2); });
    // prefer the circle's edge (where the adult sits), not the middle of the rug
    const c = s.items.find(i => i.t === 'circle'); let pen = 0;
    if (c) { const cc = centre(c, room), r = box(c, room).w / 2, d = Math.hypot(cc.x - x, cc.y - y); pen = Math.abs(d - r - 12) / 100; }
    if (!best || score - pen > best.score) best = { score: score - pen, t };
  }
  return best ? best.t : null;
}

// ---------------------------------------------------------------- bill of materials and the quote estimate
// Approved prices only (owner, 2026-10-07): the published packages, and Zone Boundaries $1,195 home / $1,995 classroom.
const TIERS = [
  { id: 'home', name: 'Home Daycare', startup: 1495, monthly: 89, rug: 'r6', rooms: 1 },
  { id: 'starter', name: 'Center Starter', startup: 2995, monthly: 229, rug: 'r8', rooms: 3 },
  { id: 'complete', name: 'Center Complete', startup: 5995, monthly: 349, rug: 'r8', rooms: 4 }
];
const BOUNDARIES = {
  home: { name: 'Zone Boundaries, home', price: 1195, mats: 4, mat: '35', panels: 4, bands: 2 },
  classroom: { name: 'Zone Boundaries, classroom', price: 1995, mats: 4, mat: '46', panels: 8, bands: 4 }
};
const PRINTS_PER_ZONE = 8;
const APPROVED = [1495, 89, 2995, 229, 5995, 349, 1195, 1995];
function pickTier(setup, tiers) {
  const T0 = tiers || TIERS;
  const id = setup.pkg && setup.pkg !== 'auto' ? setup.pkg : setup.type === 'home' ? 'home' : (+setup.rooms || 1) >= 4 ? 'complete' : 'starter';
  return T0.find(t => t.id === id) || T0[1];
}
function bom(state, tiers) {
  const { items, setup } = state;
  const T0 = (tiers || TIERS).map(t => Object.assign({}, TIERS.find(x => x.id === t.id) || {}, t));
  const tier = pickTier(setup, T0), lines = [];
  const L = (group, name, qty, detail, price, note, status) => lines.push({ group, name, qty, detail: detail || '', price: price == null ? null : price, note: note || '', status: status || '' });
  const count = f => items.filter(f).length;
  const rooms = Math.max(1, Math.round(+setup.rooms || 1));
  const washable = setup.state === 'MO' && (setup.ages || []).some(IT);
  // the package
  L('package', `${tier.name} package`, 1, `Startup + ${'$' + tier.monthly}/month program fee. Includes the Zones Starter`, tier.startup, '', 'now');
  lines[0].monthly = tier.monthly;
  if (rooms > tier.rooms) L('package', 'Extra room Zones Starter', rooms - tier.rooms, `For rooms beyond the ${tier.rooms} in the ${tier.name} package`, null, 'Quote', 'now');
  // Zones Starter (included)
  const signs = count(i => i.t === 'sign'), posters = count(i => i.t === 'poster'), baskets = count(i => i.t === 'basket');
  L('starter', setup.type === 'church' ? 'Zone signs on banner stands' : 'Zone signs, English and Spanish', Math.max(signs, 0), `${setup.type === 'home' ? '9 x 12' : '12 x 18'} in`, null, 'Included', 'now');
  L('starter', 'Character posters', posters, '18 x 24 in, hung at child eye level', null, 'Included', 'now');
  L('starter', 'Printed friend stick puppets, in a basket per zone', baskets, 'Plush follow after toy-safety testing', null, 'Included', 'now');
  L('starter', 'Picture + word bin labels', 12 * Math.max(1, count(i => i.t === 'mat') || 4), '12 per zone', null, 'Included', 'now');
  L('starter', 'Cue kit: hand chime, 6 friend cue cards, set-up card', 1, setup.type === 'church' ? 'Plus a Sunday reset card' : '', null, 'Included', 'now');
  const rugs = items.filter(i => i.t === 'circle');
  const std = TYPES.circle.sizes.find(x => x[0] === tier.rug);
  if (!rugs.length) L('starter', `Friends Circle rug, ${std[1]}`, 1, 'Not placed in your layout yet', null, 'Included', 'dev');
  for (const r of rugs) {
    const sz = TYPES.circle.sizes.find(x => x[0] === r.sz) || ['custom', 'custom size'];
    if (r.sz === tier.rug) L('starter', `Friends Circle rug, ${sz[1]}`, 1, washable ? 'Washable version where your state bars carpet' : 'Made to order, ships with its flammability report', washable ? null : null, washable ? 'Quote' : 'Included', 'dev');
    else L('starter', `Friends Circle rug, ${r.sz === 'custom' ? `custom ${dims(r)}` : sz[1]}`, 1, `Size change from the package’s ${std[1]} rug`, null, 'Quote', 'dev');
  }
  // Zone Boundaries
  const mats = items.filter(i => i.t === 'mat'), panels = items.filter(i => i.t === 'fence' && (i.sz || '36') === '36'), shorts = items.filter(i => i.t === 'fence' && i.sz === '24');
  const corners = items.filter(i => i.t === 'corner'), bands = items.filter(i => i.t === 'lowshelf' && i.band);
  const pr = paths(state), prints = pr.reduce((a, p) => a + p.prints, 0);
  if (mats.length || panels.length || shorts.length || corners.length || bands.length) {
    const homeSize = setup.type === 'home' || (setup.type === 'church' && mats.every(m => m.sz === '35'));
    const B = homeSize ? BOUNDARIES.home : BOUNDARIES.classroom;
    L('boundaries', B.name, 1, `${B.mats} zone mats (${B.mat === '35' ? '3 x 5' : '4 x 6'} ft), ${B.panels} Friend Fence panels, ${B.bands} Shelf Bands, floor paths (${PRINTS_PER_ZONE} prints per zone)`, B.price, '', 'dev');
    const odd = mats.filter(m => m.sz !== B.mat);
    if (odd.length) L('boundaries', 'Zone mat size changes', odd.length, odd.map(m => `${ZONES[m.z] ? ZONES[m.z].short : 'Zone'}: ${dims(m)}`).join(', '), null, 'Quote', 'dev');
    if (mats.length > B.mats) L('boundaries', 'Extra zone mats', mats.length - B.mats, '', null, 'Quote', 'dev');
    if (panels.length > B.panels) L('boundaries', 'Extra Friend Fence panels, 36 in', panels.length - B.panels, '', null, 'Quote', 'dev');
    if (shorts.length) L('boundaries', 'Short Friend Fence panels, 24 in', shorts.length, '', null, 'Quote', 'dev');
    if (corners.length) L('boundaries', 'Friend Fence corner pieces', corners.length, '', null, 'Quote', 'dev');
    if (bands.length > B.bands) L('boundaries', 'Extra Friend Shelf Bands', bands.length - B.bands, '', null, 'Quote', 'dev');
    const extra = pr.reduce((a, p) => a + Math.max(0, p.prints - PRINTS_PER_ZONE), 0);
    if (extra) L('boundaries', 'Extra floor-path prints', extra, `Your routes need ${prints} prints in all`, null, 'Quote', 'dev');
    if (washable) L('boundaries', 'Washable mats instead of carpet', mats.length, 'Missouri rule for its youngest children’s rooms (5 CSR 25-500.082)', null, 'Quote', 'dev');
  }
  if (setup.type === 'church') L('addon', 'Church Pack-Away', 1, 'Banner stands, a rolling cart, rug bags, lidded bins and a Sunday reset card', null, 'Quote', 'dev');
  L('addon', 'Friend plush, about 12 in', 0, 'Only after toy-safety testing (ASTM F963)', null, 'Coming later', 'later');
  // installation
  L('install', tier.id === 'complete' ? 'Setup visit (Kansas City area) or a live video walk' : tier.id === 'starter' ? 'Onboarding with a video room walk' : 'Room-map call fitted to your space', 1, 'Plus the printed set-up guide', null, 'Included', 'now');
  if (setup.install) L('install', 'White-glove installation', 1, 'We set up the room with you', null, 'Quote', '');
  const startup = lines.filter(l => l.price != null).reduce((a, l) => a + l.price * (l.qty || 1), 0);
  return { tier, lines, startup, monthly: tier.monthly, quoted: lines.filter(l => l.note === 'Quote').length, prints, washable };
}
function dims(it) { const s = sizeOf(it); return `${fmtLen(s.w, 'ft')} x ${fmtLen(s.l, 'ft')}`; }

// ---------------------------------------------------------------- plain-text summary (the quote message and the screen-reader view)
function describe(state, issues) {
  const { room, items, setup } = state, u = setup.units;
  const sp = space(state), b = bom(state), sm = summary(issues || check(state));
  const pos = it => {
    if (cat(it) === 'wall') return `on the ${WALLS[it.wall]} wall, ${fmtLen(+it.at || 0, u)} from its ${it.wall === 'N' || it.wall === 'S' ? 'west' : 'north'} end`;
    const bx = box(it, room);
    return `${fmtLen(bx.x, u)} from the west wall and ${fmtLen(bx.y, u)} from the north wall, ${fmtLen(bx.w, u)} by ${fmtLen(bx.h, u)}`;
  };
  const lines = [
    `Room: ${fmtLen(room.w, u)} wide by ${fmtLen(room.l, u)} long (${ROOM_TYPES[setup.type]}, ${STATES[setup.state]}).`,
    `Ages: ${(setup.ages || []).map(a => AGES[a]).join(', ') || 'not set'}. Children at once: ${setup.children || 'not set'}. Rooms to set up: ${setup.rooms || 1}.`,
    `Usable floor: ${Math.round(sp.usableSqft)} sq ft${sp.children ? `, ${r1(sp.perChild)} sq ft per child (minimum ${sp.min})` : ''}. Fits up to ${sp.capacity} children.`,
    `Fit check: ${sm.stop} to fix, ${sm.warn} to review.`,
    'Layout:'
  ];
  for (const it of items) lines.push(`- ${label(it)}${it.t === 'mat' || it.t === 'circle' ? ` (${(TYPES[it.t].sizes.find(x => x[0] === it.sz) || [0, 'custom'])[1]})` : ''}: ${pos(it)}.`);
  lines.push(`Package: ${b.tier.name}. Estimate from approved prices: $${b.startup.toLocaleString('en-US')} startup + $${b.monthly}/month${b.quoted ? `, plus ${b.quoted} quoted item${b.quoted > 1 ? 's' : ''}` : ''}.`);
  return lines.join('\n');
}

// ---------------------------------------------------------------- save, share and load (validated; nothing from a link is trusted)
const MAX_ITEMS = 160;
const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n * 10) / 10)) : d; };
function sanitize(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const room = raw.room || {};
  const setup = Object.assign({}, DEFAULT_SETUP);
  const su = raw.setup || {};
  if (su.units === 'm' || su.units === 'ft') setup.units = su.units;
  if (STATES[su.state]) setup.state = su.state;
  if (ROOM_TYPES[su.type]) setup.type = su.type;
  if (Array.isArray(su.ages)) setup.ages = Object.keys(AGES).filter(a => su.ages.includes(a));
  setup.children = num(su.children, 0, 500, DEFAULT_SETUP.children);
  setup.rooms = num(su.rooms, 1, 99, 1);
  if (['auto', 'home', 'starter', 'complete'].includes(su.pkg)) setup.pkg = su.pkg;
  setup.install = !!su.install;
  const s = { v: 1, name: String(raw.name || '').replace(/[\u0000-\u001f<>]/g, '').slice(0, 60), room: { w: num(room.w, 48, 1200, 300), l: num(room.l, 48, 1200, 240) }, setup, items: [] };
  for (const r of (Array.isArray(raw.items) ? raw.items : []).slice(0, MAX_ITEMS)) {
    if (!r || !TYPES[r.t]) continue;
    const T0 = TYPES[r.t], it = { id: /^[a-z0-9]{1,16}$/i.test(r.id || '') ? r.id : nid(), t: r.t };
    if (T0.cat === 'wall') { it.wall = WALLS[r.wall] ? r.wall : 'S'; it.at = num(r.at, -1200, 1200, 0); it.w = num(r.w, 2, 240, T0.w); }
    else { it.x = num(r.x, -1200, 1200, 0); it.y = num(r.y, -1200, 1200, 0); it.w = num(r.w, 2, 600, T0.w || 12); it.l = num(r.l, 2, 600, T0.l || 12); it.rot = [0, 90, 180, 270].includes(+r.rot) ? +r.rot : 0; }
    if (T0.sizes) it.sz = T0.sizes.some(x => x[0] === r.sz) ? r.sz : (r.t === 'door' ? undefined : 'custom');
    if (r.t === 'door') { it.exit = !!r.exit; it.swing = r.swing === 'out' ? 'out' : 'in'; it.hinge = r.hinge === 'R' ? 'R' : 'L'; delete it.sz; }
    if (r.t === 'circle' && it.sz === 'custom') it.round = !!r.round;
    if (T0.friend && FRIENDS.includes(r.z)) it.z = r.z;
    if (r.t === 'lowshelf' && FRIENDS.includes(r.band)) it.band = r.band;
    if (r.hgt != null && T0.cat === 'solid') it.hgt = num(r.hgt, 1, 120, T0.h);
    s.items.push(it);
  }
  return s;
}
// compact form: [type, x|wall, y|at, w, l, rot, z, sz, flags]
function pack(state) {
  const s = sanitize(state);
  return { v: 1, n: s.name, r: [s.room.w, s.room.l], s: [s.setup.units, s.setup.state, s.setup.type, s.setup.ages.join('.'), s.setup.children, s.setup.rooms, s.setup.pkg, s.setup.install ? 1 : 0],
    i: s.items.map(it => TYPES[it.t].cat === 'wall' ? [it.t, it.wall, it.at, it.w, 0, 0, it.z || '', '', it.t === 'door' ? (it.exit ? 'x' : '') + (it.swing === 'out' ? 'o' : '') + (it.hinge === 'R' ? 'r' : '') : '']
      : [it.t, it.x, it.y, it.w, it.l, it.rot, it.z || it.band || '', it.sz || '', (it.round ? 'c' : '') + (it.hgt != null ? 'h' + it.hgt : '')]) };
}
function unpack(p) {
  if (!p || p.v !== 1 || !Array.isArray(p.r) || !Array.isArray(p.i)) return null;
  const s = Array.isArray(p.s) ? p.s : [];
  return sanitize({ name: p.n, room: { w: p.r[0], l: p.r[1] }, setup: { units: s[0], state: s[1], type: s[2], ages: String(s[3] || '').split('.'), children: s[4], rooms: s[5], pkg: s[6], install: s[7] === 1 },
    items: p.i.filter(Array.isArray).map(a => {
      const T0 = TYPES[a[0]]; if (!T0) return null;
      if (T0.cat === 'wall') { const f = String(a[8] || ''); return { t: a[0], wall: a[1], at: a[2], w: a[3], z: a[6], exit: f.includes('x'), swing: f.includes('o') ? 'out' : 'in', hinge: f.includes('r') ? 'R' : 'L' }; }
      const f = String(a[8] || ''), h = /h([\d.]+)/.exec(f);
      return { t: a[0], x: a[1], y: a[2], w: a[3], l: a[4], rot: a[5], z: a[6], band: a[0] === 'lowshelf' ? a[6] : undefined, sz: a[7], round: f.includes('c'), hgt: h ? +h[1] : undefined };
    }).filter(Boolean) });
}
const b64e = typeof btoa === 'function' ? btoa : s => Buffer.from(s, 'binary').toString('base64');
const b64d = typeof atob === 'function' ? atob : s => Buffer.from(s, 'base64').toString('binary');
function encode(state) {
  const json = JSON.stringify(pack(state));
  const bin = unescape(encodeURIComponent(json));
  return b64e(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decode(code) {
  try {
    if (typeof code !== 'string' || code.length > 20000 || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
    const bin = b64d(code.replace(/-/g, '+').replace(/_/g, '/'));
    return unpack(JSON.parse(decodeURIComponent(escape(bin))));
  } catch (_) { return null; }
}
function fromJSON(text) { try { const j = JSON.parse(text); return j && j.i ? unpack(j) : sanitize(j); } catch (_) { return null; } }

// ---------------------------------------------------------------- the drawing (one SVG string: the screen, the PNG and the print)
// A light "felt island" in both themes: fixed colours, so the export looks the same as the screen.
const INK = '#0A2B38', PAPER = '#FFFDF8', GRID = '#ECE5D6', GRID5 = '#D9CFBA', STOP = '#B3261E', WARN = '#8A5A00';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function svg(state, o = {}) {
  const { room, items } = state, u = (state.setup || {}).units;
  const W = room.w, Lr = room.l, M = Math.max(30, Math.min(W, Lr) * 0.12), fs = Math.max(5.5, Math.min(W, Lr) / 26);
  const sel = o.selected, bad = o.issues || [], stopIds = new Set(bad.filter(i => i.level === 'stop').flatMap(i => i.ids)), warnIds = new Set(bad.filter(i => i.level === 'warn').flatMap(i => i.ids));
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" class="rp-svg" viewBox="${r1(-M)} ${r1(-M)} ${r1(W + 2 * M)} ${r1(Lr + 2 * M)}" ${o.interactive ? 'role="application" aria-roledescription="room plan"' : 'role="img"'} aria-labelledby="${o.idp || 'rp'}-svgt"${o.width ? ` width="${o.width}" height="${Math.round(o.width * (Lr + 2 * M) / (W + 2 * M))}"` : ''} font-family="Poppins, Arial, sans-serif">`);
  out.push(`<title id="${o.idp || 'rp'}-svgt">${esc(o.title || `Room plan, ${fmtLen(W, u)} by ${fmtLen(Lr, u)}`)}</title>`);
  out.push(`<rect x="${r1(-M)}" y="${r1(-M)}" width="${r1(W + 2 * M)}" height="${r1(Lr + 2 * M)}" fill="#FBF6EC"/>`);
  out.push(`<rect x="0" y="0" width="${W}" height="${Lr}" fill="${PAPER}"/>`);
  if (o.grid !== false) {
    const g = [];
    for (let x = FT; x < W; x += FT) g.push(`<line x1="${x}" y1="0" x2="${x}" y2="${Lr}" stroke="${x % 60 ? GRID : GRID5}" stroke-width="${x % 60 ? 0.4 : 0.7}"/>`);
    for (let y = FT; y < Lr; y += FT) g.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${y % 60 ? GRID : GRID5}" stroke-width="${y % 60 ? 0.4 : 0.7}"/>`);
    out.push(`<g aria-hidden="true">${g.join('')}</g>`);
  }
  // floor paths
  if (o.paths !== false) {
    const P = paths(state), pr = [];
    for (const p of P) for (const [i, q] of (p.at || []).entries()) {
      const z = ZONES[p.z], nx = p.at[i + 1] || p.at[i - 1] || q, ang = Math.atan2((p.at[i + 1] ? nx.y - q.y : q.y - nx.y), (p.at[i + 1] ? nx.x - q.x : q.x - nx.x)) * 180 / Math.PI + 90;
      pr.push(`<g transform="translate(${r1(q.x)} ${r1(q.y)}) rotate(${Math.round(ang)})" fill="${z.felt}" opacity=".85"><ellipse cx="0" cy="1.6" rx="2.6" ry="2.2"/><circle cx="-2.6" cy="-1.6" r="1"/><circle cx="-0.9" cy="-2.8" r="1"/><circle cx="0.9" cy="-2.8" r="1"/><circle cx="2.6" cy="-1.6" r="1"/></g>`);
    }
    out.push(`<g aria-hidden="true">${pr.join('')}</g>`);
  }
  // sightlines
  if (o.sight) {
    const eyes = items.filter(i => i.t === 'teacher'), bl = items.filter(blocksSight).flatMap(i => shapes(i, room)).filter(x => !isC(x)), ls = [];
    for (const e of eyes) { const ec = centre(e, room); for (const z of items.filter(i => i.t === 'mat' || i.t === 'circle')) { const p = zonePoints(z, room)[0], ok = !bl.some(r => segHitsRect(ec, p, r)); ls.push(`<line x1="${r1(ec.x)}" y1="${r1(ec.y)}" x2="${r1(p.x)}" y2="${r1(p.y)}" stroke="${ok ? '#1B6E3E' : STOP}" stroke-width="1.2" stroke-dasharray="${ok ? '4 3' : '1.5 2.5'}"/>`); } }
    out.push(`<g aria-hidden="true">${ls.join('')}</g>`);
  }
  // door swings (under everything that stands on the floor)
  for (const d of items.filter(i => i.t === 'door')) {
    const sw = swing(d, room); if (!sw) continue;
    const w = +d.w || 36, h = d.hinge === 'R', a = +d.at || 0;
    let hx, hy, ox, oy, ex, ey;
    if (d.wall === 'N') { hx = h ? a + w : a; hy = 0; ox = hx; oy = w; ex = h ? a : a + w; ey = 0; }
    else if (d.wall === 'S') { hx = h ? a : a + w; hy = Lr; ox = hx; oy = Lr - w; ex = h ? a + w : a; ey = Lr; }
    else if (d.wall === 'W') { hx = 0; hy = h ? a : a + w; ox = w; oy = hy; ex = 0; ey = h ? a + w : a; }
    else { hx = W; hy = h ? a + w : a; ox = W - w; oy = hy; ex = W; ey = h ? a : a + w; }
    const sweep = ((ox - hx) * (ey - hy) - (oy - hy) * (ex - hx)) > 0 ? 1 : 0;
    out.push(`<path d="M${hx} ${hy} L${ox} ${oy} A${w} ${w} 0 0 ${sweep} ${ex} ${ey}" fill="${d.exit ? 'rgba(179,38,30,.06)' : 'rgba(10,43,56,.04)'}" stroke="${d.exit ? STOP : INK}" stroke-width="0.8" stroke-dasharray="3 2" aria-hidden="true"/>`);
  }
  // heater clearance
  for (const h of items.filter(i => TYPES[i.t] && TYPES[i.t].hot)) { const b = box(h, room); out.push(`<rect x="${r1(b.x - 36)}" y="${r1(b.y - 36)}" width="${r1(b.w + 72)}" height="${r1(b.h + 72)}" rx="36" fill="none" stroke="${STOP}" stroke-width="0.8" stroke-dasharray="2 3" aria-hidden="true"/>`); }
  // walls
  out.push(`<rect x="0" y="0" width="${W}" height="${Lr}" fill="none" stroke="${INK}" stroke-width="4"/>`);
  // items, in drawing order: floor, low, solid, wall, marker
  const order = { floor: 0, low: 2, solid: 1, wall: 3, mark: 4 };
  const list = items.slice().sort((a, b) => (order[cat(a)] - order[cat(b)]) || 0);
  for (const it of list) out.push(itemSvg(it, state, { fs, sel: sel === it.id, stop: stopIds.has(it.id), warn: warnIds.has(it.id), interactive: o.interactive, u }));
  // dimensions and compass
  const dfs = fs * 1.05;
  out.push(`<g aria-hidden="true" fill="${INK}" font-size="${r1(dfs)}" font-weight="600" text-anchor="middle">
    <line x1="0" y1="${r1(-M * 0.45)}" x2="${W}" y2="${r1(-M * 0.45)}" stroke="${INK}" stroke-width="0.8"/><line x1="0" y1="${r1(-M * 0.6)}" x2="0" y2="${r1(-M * 0.3)}" stroke="${INK}" stroke-width="0.8"/><line x1="${W}" y1="${r1(-M * 0.6)}" x2="${W}" y2="${r1(-M * 0.3)}" stroke="${INK}" stroke-width="0.8"/>
    <text x="${r1(W / 2)}" y="${r1(-M * 0.55)}" paint-order="stroke" stroke="#FBF6EC" stroke-width="${r1(dfs * 0.5)}">${esc(fmtLen(W, u))} wide · north wall</text>
    <line x1="${r1(W + M * 0.45)}" y1="0" x2="${r1(W + M * 0.45)}" y2="${Lr}" stroke="${INK}" stroke-width="0.8"/>
    <text transform="translate(${r1(W + M * 0.75)} ${r1(Lr / 2)}) rotate(90)" paint-order="stroke" stroke="#FBF6EC" stroke-width="${r1(dfs * 0.5)}">${esc(fmtLen(Lr, u))} long</text></g>`);
  out.push('</svg>');
  return out.join('');
}
function itemSvg(it, state, o) {
  const { room } = state, T0 = TYPES[it.t], b = box(it, room), z = it.z && ZONES[it.z] ? ZONES[it.z] : it.t === 'circle' ? ZONES.circle : null, fs = o.fs;
  const ring = o.stop ? STOP : o.warn ? WARN : null, parts = [];
  const txt = (s, x, y, f, fill, weight) => `<text x="${r1(x)}" y="${r1(y)}" font-size="${r1(f)}" fill="${fill || INK}" font-weight="${weight || 600}" text-anchor="middle" dominant-baseline="middle">${esc(s)}</text>`;
  const short = { heater: 'heater', sink: 'sink', bath: 'bathroom', builtin: 'built-in', cubbies: 'cubbies', column: '', table: 'table', lowshelf: 'shelf', tallshelf: 'tall shelf', piano: 'piano' }[it.t];
  if (T0.cat === 'wall') {
    if (it.t === 'door') parts.push(`<rect x="${r1(b.x)}" y="${r1(b.y)}" width="${r1(b.w)}" height="${r1(b.h)}" fill="${it.exit ? '#FBE3E1' : PAPER}" stroke="${it.exit ? STOP : INK}" stroke-width="0.8"/>${it.exit ? txt('EXIT', b.x + b.w / 2, it.wall === 'N' ? b.y + b.h + fs * 0.9 : it.wall === 'S' ? b.y - fs * 0.9 : b.y + b.h / 2, fs * 0.8, STOP, 700) : ''}`);
    else if (it.t === 'window') parts.push(`<rect x="${r1(b.x)}" y="${r1(b.y)}" width="${r1(b.w)}" height="${r1(b.h)}" fill="#DCEFF7" stroke="#2F6FC0" stroke-width="0.8"/>`);
    else if (it.t === 'outlet') parts.push(`<rect x="${r1(b.x - 1)}" y="${r1(b.y)}" width="${r1(b.w + 2)}" height="${r1(b.h)}" rx="1" fill="#fff" stroke="${INK}" stroke-width="0.8"/>`);
    else parts.push(`<rect x="${r1(b.x)}" y="${r1(b.y)}" width="${r1(b.w)}" height="${r1(b.h)}" rx="1.2" fill="${z ? z.felt : INK}" stroke="#fff" stroke-width="0.8"/>`);
  } else if (it.t === 'mat' || it.t === 'circle') {
    const sh = shapes(it, room)[0], zz = z || ZONES.circle;
    if (isC(sh)) parts.push(`<circle cx="${r1(sh.cx)}" cy="${r1(sh.cy)}" r="${r1(sh.r)}" fill="${zz.tint}" stroke="${zz.felt}" stroke-width="2"/><circle cx="${r1(sh.cx)}" cy="${r1(sh.cy)}" r="${r1(sh.r - 3)}" fill="none" stroke="${zz.felt}" stroke-width="0.6" stroke-dasharray="2 1.5"/>`);
    else parts.push(`<rect x="${r1(b.x)}" y="${r1(b.y)}" width="${r1(b.w)}" height="${r1(b.h)}" rx="5" fill="${zz.tint}" stroke="${zz.felt}" stroke-width="2"/><rect x="${r1(b.x + 3)}" y="${r1(b.y + 3)}" width="${r1(b.w - 6)}" height="${r1(b.h - 6)}" rx="3" fill="none" stroke="${zz.felt}" stroke-width="0.6" stroke-dasharray="2 1.5"/>`);
    const nm = it.t === 'circle' ? 'Friends Circle' : zz.short;
    parts.push(txt(nm, b.x + b.w / 2, b.y + b.h / 2, Math.min(fs, b.w / (nm.length * 0.62)), zz.ink, 700));
  } else if (it.t === 'fence' || it.t === 'corner') {
    const zz = z || ZONES.circle;
    for (const s of shapes(it, room)) parts.push(`<rect x="${r1(s.x)}" y="${r1(s.y)}" width="${r1(s.w)}" height="${r1(s.h)}" rx="1.4" fill="${zz.felt}" stroke="${zz.ink}" stroke-width="0.6"/>`);
  } else if (it.t === 'basket') {
    const zz = z || ZONES.circle;
    parts.push(`<rect x="${r1(b.x)}" y="${r1(b.y)}" width="${r1(b.w)}" height="${r1(b.h)}" rx="3" fill="#fff" stroke="${zz.ink}" stroke-width="1"/><path d="M${r1(b.x + 3)} ${r1(b.y + b.h / 2)}h${r1(b.w - 6)}" stroke="${zz.felt}" stroke-width="1.4"/>`);
  } else if (it.t === 'teacher') {
    const c = centre(it, room);
    parts.push(`<circle cx="${r1(c.x)}" cy="${r1(c.y)}" r="9" fill="${INK}" stroke="#fff" stroke-width="1.4"/>${txt('A', c.x, c.y + 0.4, 10, '#fff', 700)}`);
  } else {
    const own = T0.g === 'own', hot = T0.hot;
    parts.push(`<rect x="${r1(b.x)}" y="${r1(b.y)}" width="${r1(b.w)}" height="${r1(b.h)}" rx="1.5" fill="${hot ? '#F6D5D2' : own ? '#EAD9B6' : '#D9D3C4'}" stroke="${hot ? STOP : own ? '#8A6D3B' : '#6E675B'}" stroke-width="0.9"/>`);
    if (it.t === 'lowshelf' && it.band && ZONES[it.band]) parts.push(`<rect x="${r1(b.x)}" y="${r1(b.y)}" width="${r1(b.w)}" height="${r1(b.h)}" rx="1.5" fill="none" stroke="${ZONES[it.band].felt}" stroke-width="2.4"/>`);
    if (short && Math.max(b.w, b.h) > fs * 3) parts.push(b.w >= b.h ? txt(short, b.x + b.w / 2, b.y + b.h / 2, Math.min(fs * 0.85, b.h * 0.8), INK, 500) : `<g transform="translate(${r1(b.x + b.w / 2)} ${r1(b.y + b.h / 2)}) rotate(-90)">${txt(short, 0, 0, Math.min(fs * 0.85, b.w * 0.8), INK, 500)}</g>`);
  }
  if (ring) parts.push(`<rect x="${r1(b.x - 2.5)}" y="${r1(b.y - 2.5)}" width="${r1(b.w + 5)}" height="${r1(b.h + 5)}" rx="3" fill="none" stroke="${ring}" stroke-width="1.6" stroke-dasharray="${o.stop ? '0' : '3 2'}"/>`);
  if (o.sel) parts.push(`<rect class="rp-selring" x="${r1(b.x - 4)}" y="${r1(b.y - 4)}" width="${r1(b.w + 8)}" height="${r1(b.h + 8)}" rx="4" fill="none" stroke="${INK}" stroke-width="1.6" stroke-dasharray="4 2"/>`
    + (resizable(it) ? `<rect class="rp-handle" data-handle="${it.id}" x="${r1(b.x + b.w - 3)}" y="${r1(b.y + b.h - 3)}" width="10" height="10" rx="2" fill="#E7A928" stroke="${INK}" stroke-width="1.2"/>` : ''));
  const a = o.interactive ? ` class="rp-it${o.sel ? ' is-sel' : ''}" data-id="${esc(it.id)}" tabindex="0" role="button" aria-pressed="${o.sel ? 'true' : 'false'}" aria-label="${esc(label(it))}"` : '';
  return `<g${a}>${parts.join('')}</g>`;
}
const resizable = it => ['circle', 'mat', 'table', 'lowshelf', 'tallshelf', 'piano', 'sink', 'bath', 'builtin', 'cubbies', 'column', 'heater', 'door', 'window'].includes(it.t) && !(it.t === 'circle' && it.sz !== 'custom') && !(it.t === 'mat' && it.sz !== 'custom');

const API = { FT, svg, resizable, ZONES, FRIENDS, STATES, ROOM_TYPES, AGES, RULES, TYPES, WALLS, KINDS, TEMPLATES, TIERS, BOUNDARIES, APPROVED, PRINTS_PER_ZONE, SIGHT_H, DEFAULT_SETUP,
  minPerChild, label, fmtLen, fmtArea, fromMetres, box, shapes, swing, overlapItems, gapItems, segHitsRect, sightFor, space, check, summary, paths,
  make, sized, template, autoArrange, placeNew, bestTeacher, bom, pickTier, describe, sanitize, pack, unpack, encode, decode, fromJSON, isRound, cat, blocksSight, doorInside };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (root) root.FFRoomPlannerCore = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));

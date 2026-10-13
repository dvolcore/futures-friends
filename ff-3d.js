/* Futures Friends 3D engine (owner 2026-10-12, "Meet the friends in 3D"): one rigged, finished model per friend (3D batch of
   2026-10-12, ~1 MB GLB each, meshopt + WebP, 8 motions), drawn with three.js r170 (vendored, exact version, loaded only by this
   module, and this module is only ever imported lazily, when a 3D friend is about to be shown).
   The same file ships in the website (friends-3d.js imports it) and in the Futures Hub (kids-corner-3d.js imports it): keep them
   identical (tests compare the two copies when both are mounted).

   What it does
   - mount(host, { key, base, still, tier, fur, onTap, onChange }): a canvas (aria-hidden: the page carries the words) inside host,
     the friend's model framed whole (never cropped: the frame is the union of every motion's reach, measured from the skeleton at
     load), drag to spin, a short tap calls onTap. Returns { play, setFur, turn, setFriend, attach, stats, bench, dispose, ... }.
   - Motions by name: idle (Idle_Breathe, loops), wave (Wave_Gentle), hop (Hop), jump (Happy_Jump), dance (Joyful_Dance). The paid
     Big_Wave_Hello is never played (it stretches the sleeve). A one-shot motion returns to idle.
   - still: true (reduced motion, or the site's Decorative motion switch off): no loop, nothing moves by itself. A motion request
     shows that motion's key pose as a still (no movement), the way the day machine's buttons work without motion.
   - Fur (level 2, real-time shells over the plain PBR body, per-friend fur-length map): auto by GPU tier (high 16 shells, DPR 2;
     mid = phones and tablets 8 shells, DPR 1.5; low = software rendering, data saver, <= 2 GB memory, old mobile GPUs: no fur,
     DPR 1), then frame-time sampling: if the median frame interval over 60 frames is above 22 ms the shells halve, then fur turns
     off (and finally the DPR drops to 1). setFur(true|false) is the visitor's manual switch and wins over auto.
   - Pauses itself off screen and on a hidden tab (no frames at all); renders on demand when still.
   - tierOf(env) is pure (tests); probe() reads the WebGL renderer string once and releases its context.
   Sends nothing, stores nothing; loads only the model, its fur map and these vendored files from the same site. */
import * as THREE from './vendor/three-0.170.0/three.module.min.js';
import { GLTFLoader } from './vendor/three-0.170.0/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/three-0.170.0/meshopt_decoder.module.js';
import { RoomEnvironment } from './vendor/three-0.170.0/RoomEnvironment.js';

export const VERSION = THREE.REVISION;
export const CLIPS = { idle: 'Idle_Breathe', wave: 'Wave_Gentle', hop: 'Hop', jump: 'Happy_Jump', dance: 'Joyful_Dance' };
// fur length as a share of the friend's height (web_fur settings of the 3D batch; Zuri is short minky pile only)
export const FUR_LEN = { booker: 0.011, lumi: 0.012, zuri: 0.004, bop: 0.009 };
export const SHELLS = { high: 16, mid: 8, low: 0 };
export const DPR_CAP = { high: 2, mid: 1.5, low: 1 };
const SLOW_MS = 22;          // median frame interval that counts as "not keeping up" (~45 fps)
const SAMPLE = [20, 80];     // frames skipped (warm-up), last frame of the sample

const SOFTWARE = /SwiftShader|llvmpipe|softpipe|software|Microsoft Basic Render/i;
const OLD_GPU = /Mali-4|Mali-T|Adreno \(TM\) [2-5]\d\d\b|PowerVR|Intel\(R\) HD Graphics( [2-5]\d{2,3})?\b|GMA /i;

// env: { webgl, renderer, mobile, memory, cores, saveData, ios } -> { tier: none|low|mid|high, why }
export function tierOf(env) {
  if (!env || !env.webgl) return { tier: 'none', why: 'no WebGL' };
  if (SOFTWARE.test(env.renderer || '')) return { tier: 'low', why: 'software rendering' };
  if (env.saveData) return { tier: 'low', why: 'data saver' };
  if (env.memory && env.memory <= 2) return { tier: 'low', why: 'memory <= 2 GB' };
  if (!env.ios && env.cores && env.cores <= 2) return { tier: 'low', why: 'cores <= 2' };
  if (OLD_GPU.test(env.renderer || '')) return { tier: 'low', why: 'older GPU' };
  if (env.mobile) return { tier: 'mid', why: 'phone or tablet' };
  return { tier: 'high', why: 'desktop GPU' };
}

let probed = null;
export function probe() {
  if (probed) return probed;
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const ua = nav.userAgent || '';
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (nav.maxTouchPoints || 0) > 1);
  const env = { webgl: false, webgl2: false, renderer: '', ios, mobile: ios || /Android|Mobile/.test(ua),
    memory: nav.deviceMemory || 0, cores: nav.hardwareConcurrency || 0, saveData: !!(nav.connection && nav.connection.saveData) };
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (gl) {
      env.webgl = true; env.webgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      env.renderer = String(gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    }
  } catch (_) { env.webgl = false; }
  probed = env;
  return env;
}

const median = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

function shellMaterial(map, mask, t, len) {
  const m = new THREE.MeshStandardMaterial({ map, roughness: 0.95, metalness: 0 });
  m.onBeforeCompile = s => {
    s.uniforms.uT = { value: t }; s.uniforms.uLen = { value: len }; s.uniforms.uMask = { value: mask };
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT,uLen; varying vec2 vFurUv;')
      .replace('#include <skinning_vertex>', '#include <skinning_vertex>\n vFurUv=uv; transformed+=normalize(objectNormal)*uLen*uT*(1.0/length(vec3(modelMatrix[0])));');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
uniform float uT; uniform sampler2D uMask; varying vec2 vFurUv;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float strand(vec2 uv){vec2 g=uv*vec2(900.0); vec2 c=floor(g); float d=9.0;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o=vec2(x,y); vec2 p=o+vec2(h21(c+o),h21(c+o+7.1)); d=min(d,length(g-c-p));} return d;}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
 float L=texture2D(uMask,vFurUv).r; if(L<uT+0.001) discard;
 if(strand(vFurUv) > (0.55*(1.0-uT)+0.08)) discard;
 diffuseColor.rgb*=mix(0.62,1.08,uT);`);
  };
  m.customProgramCacheKey = () => 'ff-fur';
  return m;
}

const disposeTree = root => root.traverse(o => {
  if (o.geometry && !o.userData.sharedGeometry) o.geometry.dispose();
  const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
  ms.forEach(m => { ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'sheenColorMap'].forEach(k => { if (m[k] && m[k].dispose) m[k].dispose(); }); m.dispose(); });
});

export async function mount(host, opts = {}) {
  const env = probe();
  const tierInfo = opts.tier ? { tier: opts.tier, why: 'set' } : tierOf(env);
  if (tierInfo.tier === 'none') throw new Error('no-webgl');
  const tier = tierInfo.tier;
  const base = opts.base || 'models/friends/';
  let still = !!opts.still;
  const onChange = typeof opts.onChange === 'function' ? opts.onChange : () => {};

  const renderer = new THREE.WebGLRenderer({ antialias: tier !== 'low', alpha: true, powerPreference: tier === 'high' ? 'high-performance' : 'default' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setClearColor(0x000000, 0);
  let dprCap = DPR_CAP[tier];
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('tabindex', '-1');
  canvas.className = 'ff3d-canvas';
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;
  pmrem.dispose();
  const key = new THREE.DirectionalLight(0xfff4e6, 2.2); key.position.set(-1, 2, 2); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.4); rim.position.set(1, 1.5, -2); scene.add(rim);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  const pivot = new THREE.Group(); scene.add(pivot);

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const st = { key: null, root: null, body: null, plain: null, plush: null, shells: [], mixer: null, clips: {}, cur: null, curId: null,
    fit: null, mask: null, furOn: false, furMode: opts.fur === 'on' || opts.fur === 'off' ? opts.fur : 'auto', shellN: SHELLS[tier],
    reason: tierInfo.why, frames: 0, intervals: [], cpu: [], lastT: 0, visible: true, shown: true, disposed: false, w: 0, h: 0, lost: false };

  // ---- framing: the union of every motion's reach, measured on the skeleton (cheap), applied to the mesh's rest box ---------------
  function measureFit() {
    const body = st.body, root = st.root, v = new THREE.Vector3();
    // centre the friend on the spin axis (the pivot's vertical axis), from the rest mesh
    scene.updateMatrixWorld(true);
    body.computeBoundingBox();
    const m0 = body.boundingBox.clone().applyMatrix4(body.matrixWorld), c0 = m0.getCenter(new THREE.Vector3());
    const inv = new THREE.Matrix4().copy(pivot.matrixWorld).invert(), local = c0.clone().applyMatrix4(inv);
    root.position.x -= local.x; root.position.z -= local.z;
    root.updateMatrixWorld(true);
    const mesh = body.boundingBox.clone().applyMatrix4(body.matrixWorld);
    const axis = new THREE.Vector3().setFromMatrixPosition(pivot.matrixWorld);
    const radial = p => Math.hypot(p.x - axis.x, p.z - axis.z);
    let meshR = 0;
    const n = body.geometry.attributes.position.count;
    for (let i = 0; i < n; i++) { body.getVertexPosition(i, v); v.applyMatrix4(body.matrixWorld); meshR = Math.max(meshR, radial(v)); }
    const bones = () => { let lo = Infinity, hi = -Infinity, r = 0; body.skeleton.bones.forEach(bn => { bn.getWorldPosition(v); lo = Math.min(lo, v.y); hi = Math.max(hi, v.y); r = Math.max(r, radial(v)); }); return { lo, hi, r }; };
    const rest = bones();
    let dLo = 0, dHi = 0, dR = 0;
    const mixer = new THREE.AnimationMixer(root);
    Object.keys(CLIPS).forEach(id => {
      const clip = st.clips[CLIPS[id]]; if (!clip) return;
      const a = mixer.clipAction(clip); a.reset().play();
      for (let i = 0; i <= 16; i++) {
        a.time = clip.duration * i / 16; mixer.update(0); root.updateMatrixWorld(true);
        const b = bones();
        dLo = Math.min(dLo, b.lo - rest.lo); dHi = Math.max(dHi, b.hi - rest.hi); dR = Math.max(dR, b.r - rest.r);
      }
      a.stop();
    });
    mixer.stopAllAction(); mixer.uncacheRoot(root);
    root.traverse(o => { if (o.isBone && o.userData.rest) { o.position.copy(o.userData.rest.p); o.quaternion.copy(o.userData.rest.q); o.scale.copy(o.userData.rest.s); } });
    root.updateMatrixWorld(true);
    const lo = mesh.min.y + dLo, hi = mesh.max.y + dHi;
    return { c: new THREE.Vector3(axis.x, (lo + hi) / 2, axis.z), r: meshR + dR, h: hi - lo, restH: mesh.max.y - mesh.min.y };
  }
  function frame() {
    if (!st.fit || !st.w || !st.h) return;
    const f = st.fit, asp = st.w / st.h, t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const pad = 1.06;
    const d = Math.max((f.h / 2) * pad / t, f.r * pad / (t * asp)) + f.r;
    cam.aspect = asp;
    cam.position.set(f.c.x, f.c.y + f.h * 0.06, f.c.z + d);
    cam.lookAt(f.c);
    cam.near = Math.max(0.01, d - f.r * 2); cam.far = d + f.r * 4;
    cam.updateProjectionMatrix();
  }

  // ---- fur -------------------------------------------------------------------------------------------------------------------
  async function ensureShells() {
    if (st.shells.length || !st.body) return;
    const k = st.key;
    if (!st.mask) {
      const m = await new THREE.TextureLoader().loadAsync(`${base}${k}-fur.png`);
      m.flipY = false; m.colorSpace = THREE.NoColorSpace; st.mask = m;
    }
    if (st.key !== k || st.disposed) return;
    const body = st.body, map = st.plain.map, len = st.fit.restH * (FUR_LEN[k] || 0.01), n = SHELLS.high;
    for (let i = 1; i <= n; i++) {
      const s = new THREE.SkinnedMesh(body.geometry, shellMaterial(map, st.mask, i / n, len));
      s.userData.sharedGeometry = true; s.userData.shellIndex = i;
      s.bind(body.skeleton, body.bindMatrix); s.frustumCulled = false;
      s.position.copy(body.position); s.quaternion.copy(body.quaternion); s.scale.copy(body.scale);
      body.parent.add(s); st.shells.push(s);
    }
  }
  function applyFur() {
    const on = st.furOn && st.shellN > 0;
    if (st.body) st.body.material = on ? st.plush : st.plain;
    // with 8 shells, every other one (2, 4 ... 16): the same length, half the draws
    const step = st.shellN >= SHELLS.high ? 1 : Math.round(SHELLS.high / Math.max(1, st.shellN));
    st.shells.forEach(s => { s.visible = on && s.userData.shellIndex % step === 0; });
    canvas.dataset.fur = on ? 'on' : 'off';
    canvas.dataset.shells = on ? String(st.shells.filter(s => s.visible).length) : '0';
    request();
  }
  async function setFur(on, manual = true) {
    if (manual) st.furMode = on ? 'on' : 'off';
    if (on && st.shellN === 0) st.shellN = SHELLS.mid;   // a low-tier device the visitor switched on: the lighter fur
    st.furOn = !!on;
    if (on) { try { await ensureShells(); } catch (_) { st.furOn = false; st.reason = 'fur map did not load'; } }
    applyFur();
    st.frames = 0; st.intervals = [];
    onChange(api.state());
  }

  // ---- loading a friend ----------------------------------------------------------------------------------------------------------
  async function setFriend(k) {
    const gltf = await loader.loadAsync(`${base}${k}.glb`);
    if (st.disposed) { disposeTree(gltf.scene); return; }
    if (st.root) { pivot.remove(st.root); disposeTree(st.root); if (st.mask) { st.mask.dispose(); st.mask = null; } }
    st.key = k; st.root = gltf.scene; st.shells = []; st.cur = null; st.curId = null;
    st.clips = Object.fromEntries(gltf.animations.map(c => [c.name, c]));
    st.body = null; st.root.traverse(o => { if (o.isSkinnedMesh && !st.body) st.body = o; if (o.isBone) o.userData.rest = { p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() }; });
    if (!st.body) throw new Error('no skinned mesh');
    st.body.frustumCulled = false;
    st.plain = st.body.material;
    st.plush = new THREE.MeshPhysicalMaterial({ map: st.plain.map, normalMap: st.plain.normalMap, roughness: 0.92, metalness: 0, sheen: 0.6,
      sheenRoughness: 0.6, sheenColor: new THREE.Color(0.45, 0.45, 0.45), sheenColorMap: st.plain.map });
    pivot.rotation.y = 0.35;
    pivot.add(st.root);
    st.fit = measureFit();
    st.mixer = new THREE.AnimationMixer(st.root);
    st.mixer.addEventListener('finished', e => { if (e.action === st.cur && st.curId !== 'idle') { const done = st.curId; play('idle'); onChange(Object.assign(api.state(), { finished: done })); } });
    frame();
    play('idle');
    const want = st.furMode === 'on' || (st.furMode === 'auto' && st.shellN > 0);
    await setFur(want, false);
    canvas.dataset.friend = k;
    request();
    return api;
  }

  // ---- motions -----------------------------------------------------------------------------------------------------------------
  function play(id) {
    const clip = st.clips[CLIPS[id]];
    if (!clip || !st.mixer) return false;
    if (still) {
      st.mixer.stopAllAction();
      const a = st.mixer.clipAction(clip); a.reset().play(); a.paused = true;
      a.time = id === 'idle' ? clip.duration * 0.5 : clip.duration * (id === 'wave' ? 0.4 : 0.45);
      st.mixer.update(0); st.cur = a; st.curId = id; request();
      return true;
    }
    const a = st.mixer.clipAction(clip);
    a.reset();
    if (id === 'idle') a.setLoop(THREE.LoopRepeat, Infinity); else { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
    a.enabled = true; a.setEffectiveWeight(1); a.play();
    if (st.cur && st.cur !== a) st.cur.crossFadeTo(a, 0.25, false);
    st.cur = a; st.curId = id;
    wake();
    return true;
  }
  function turn(rad) { pivot.rotation.y += rad; request(); }

  // ---- drag to spin, tap ---------------------------------------------------------------------------------------------------------
  let drag = null;
  const down = e => { if (e.button > 0) return; drag = { x: e.clientX, y: e.clientY, t: performance.now(), rot: pivot.rotation.y, moved: false, id: e.pointerId }; };
  const move = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(e.clientY - drag.y)) { drag.moved = true; try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* gone */ } }
    if (drag.moved) { pivot.rotation.y = drag.rot + dx * 0.012; request(); }
  };
  const up = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const tap = !drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8 && performance.now() - drag.t < 500;
    drag = null;
    if (tap && typeof opts.onTap === 'function') opts.onTap();
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', () => { drag = null; });

  // ---- size, frames, pausing -----------------------------------------------------------------------------------------------------
  function size() {
    const r = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (w === st.w && h === st.h) return;
    st.w = w; st.h = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(w, h, false);
    frame(); request();
  }
  let ro = typeof ResizeObserver === 'function' ? new ResizeObserver(size) : null;
  if (ro) ro.observe(host); else window.addEventListener('resize', size);
  let io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(es => es.forEach(e => { st.visible = e.isIntersecting; wake(); }), { threshold: 0 }) : null;
  if (io) io.observe(host);
  const onVis = () => { st.shown = document.visibilityState !== 'hidden'; wake(); };
  document.addEventListener('visibilitychange', onVis);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); st.lost = true; renderer.setAnimationLoop(null); onChange(Object.assign(api.state(), { lost: true })); });

  const clock = new THREE.Clock(false);
  let looping = false, pending = 0;
  function draw() {
    if (!st.root || st.lost) return;
    const t0 = performance.now();
    renderer.render(scene, cam);
    st.cpu.push(performance.now() - t0); if (st.cpu.length > 240) st.cpu.shift();
  }
  function request() {   // one frame on demand (still mode, a spin, a fur switch)
    if (looping || pending || st.disposed) return;
    pending = requestAnimationFrame(() => { pending = 0; if (!st.disposed) draw(); });
  }
  function tick(now) {
    const dt = Math.min(0.1, clock.getDelta());
    if (st.mixer) st.mixer.update(dt);
    draw();
    // frame-time sampling (auto fur only): median interval over SAMPLE frames
    if (st.lastT) { st.frames++; if (st.frames > SAMPLE[0]) st.intervals.push(now - st.lastT); }
    st.lastT = now;
    if (st.frames >= SAMPLE[1]) {
      const med = median(st.intervals); st.lastMedian = med; st.frames = 0; st.intervals = [];
      if (med > SLOW_MS && st.furMode === 'auto') {
        if (st.furOn && st.shellN > SHELLS.mid) { st.shellN = SHELLS.mid; st.reason = `slow frames (${med.toFixed(1)} ms): 8 shells`; applyFur(); onChange(api.state()); }
        else if (st.furOn) { st.furOn = false; st.reason = `slow frames (${med.toFixed(1)} ms): fur off`; applyFur(); onChange(api.state()); }
        else if (dprCap > 1) { dprCap = 1; st.w = 0; size(); st.reason = `slow frames (${med.toFixed(1)} ms): DPR 1`; onChange(api.state()); }
      }
    }
  }
  function wake() {
    const run = !still && st.visible && st.shown && !st.disposed && !st.lost && !!st.root;
    if (run && !looping) { looping = true; clock.start(); clock.getDelta(); st.lastT = 0; st.frames = 0; st.intervals = []; renderer.setAnimationLoop(tick); }
    else if (!run && looping) { looping = false; clock.stop(); renderer.setAnimationLoop(null); }
    host.classList.toggle('ff3d-paused', !run);
    if (!run) request();
  }

  // synchronous GPU benchmark: n frames, each forced to finish (readPixels), ms per frame for 0, mid and high shells
  function bench(n = 120) {
    const gl = renderer.getContext(), px = new Uint8Array(4), out = {};
    const saveOn = st.furOn, saveN = st.shellN;
    const one = () => { if (st.mixer) st.mixer.update(1 / 60); renderer.render(scene, cam); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
    [[0, false], [SHELLS.mid, true], [SHELLS.high, true]].forEach(([k, on]) => {
      if (on && !st.shells.length) return;
      st.shellN = k || saveN; st.furOn = on; applyFur();
      for (let i = 0; i < 15; i++) one();
      const t = performance.now(); for (let i = 0; i < n; i++) one();
      out['shells_' + k] = +((performance.now() - t) / n).toFixed(2);
    });
    st.furOn = saveOn; st.shellN = saveN; applyFur();
    return out;
  }

  const api = {
    canvas, renderer, tier, env,
    play, turn, setFriend, bench,
    setFur: on => setFur(on, true),
    setStill(v) { still = !!v; if (st.curId) play(still ? st.curId : 'idle'); wake(); },
    attach(next) { if (next && canvas.parentNode !== next) { if (io) io.unobserve(host); if (ro) ro.unobserve(host); host = next; next.appendChild(canvas); if (ro) ro.observe(host); if (io) io.observe(host); st.w = 0; size(); wake(); } },
    state: () => ({ key: st.key, tier, fur: st.furOn && st.shellN > 0, furMode: st.furMode, shells: st.furOn ? st.shells.filter(s => s.visible).length : 0,
      dpr: renderer.getPixelRatio(), still, running: looping, motion: st.curId, reason: st.reason, lost: st.lost }),
    stats: () => ({ cpuMs: +(st.cpu.reduce((a, b) => a + b, 0) / (st.cpu.length || 1)).toFixed(2), cpuP95: +(st.cpu.slice().sort((a, b) => a - b)[Math.floor(st.cpu.length * 0.95)] || 0).toFixed(2),
      medianInterval: st.lastMedian || median(st.intervals), renderer: env.renderer,
      fit: st.fit ? { h: +st.fit.h.toFixed(3), restH: +st.fit.restH.toFixed(3), r: +st.fit.r.toFixed(3) } : null, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }),
    dispose() {
      if (st.disposed) return; st.disposed = true;
      renderer.setAnimationLoop(null); if (pending) cancelAnimationFrame(pending);
      if (io) io.disconnect(); if (ro) ro.disconnect(); else window.removeEventListener('resize', size);
      document.removeEventListener('visibilitychange', onVis);
      if (st.root) disposeTree(st.root); if (st.mask) st.mask.dispose(); if (st.plush) st.plush.dispose();
      if (scene.environment) scene.environment.dispose();
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    }
  };
  size();
  await setFriend(opts.key || 'booker');
  wake();
  return api;
}

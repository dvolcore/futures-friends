// A tiny DOM for node --test: parses the well-formed markup our render functions produce and supports the handful of APIs the
// Home hero scripts use (class/attribute/child selectors, events with AbortSignal, classList, dataset, style, animate()).
// Not a browser: layout boxes are fixed, animate() records its arguments instead of running.
'use strict';
const VOID = new Set(['img', 'br', 'input', 'meta', 'link', 'source', 'hr']);

class Node_ {
  constructor(doc) { this.ownerDocument = doc; this.parentNode = null; this.childNodes = []; }
  get parentElement() { return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null; }
  appendChild(n) { if (n.parentNode) n.remove(); n.parentNode = this; this.childNodes.push(n); return n; }
  remove() { if (!this.parentNode) return; const c = this.parentNode.childNodes; c.splice(c.indexOf(this), 1); this.parentNode = null; }
  get textContent() { return this.childNodes.map(c => c.textContent).join(''); }
  set textContent(v) { this.childNodes.forEach(c => { c.parentNode = null; }); this.childNodes = []; if (v !== '') this.appendChild(new Text_(this.ownerDocument, String(v))); }
}
class Text_ extends Node_ { constructor(doc, t) { super(doc); this.nodeType = 3; this.data = t; } get textContent() { return this.data; } set textContent(v) { this.data = String(v); } }

const listen = target => {
  const map = new Map();
  target.addEventListener = (type, fn, opt) => {
    const sig = opt && opt.signal; if (sig && sig.aborted) return;
    const entry = { fn }; (map.get(type) || map.set(type, []).get(type)).push(entry);
    if (sig) sig.addEventListener('abort', () => { const l = map.get(type); l.splice(l.indexOf(entry), 1); });
  };
  target.removeEventListener = (type, fn) => { const l = map.get(type) || []; const i = l.findIndex(e => e.fn === fn); if (i >= 0) l.splice(i, 1); };
  target.listenerCount = type => (map.get(type) || []).length;
  target.dispatch = (type, props = {}) => {
    const ev = { type, target: target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...props };
    (map.get(type) || []).slice().forEach(e => e.fn.call(target, ev));
    return ev;
  };
};

class Element_ extends Node_ {
  constructor(doc, tag, attrs = {}) {
    super(doc); this.nodeType = 1; this.tagName = tag.toUpperCase(); this.attributes = new Map(Object.entries(attrs)); this.animations = [];
    const self = this, props = new Map();
    this.style = { setProperty(k, v) { props.set(k, String(v)); }, removeProperty(k) { props.delete(k); }, getPropertyValue(k) { return props.get(k) || ''; } };
    this.dataset = new Proxy({}, {
      get: (_, k) => self.getAttribute('data-' + String(k).replace(/[A-Z]/g, m => '-' + m.toLowerCase())) ?? undefined,
      set: (_, k, v) => { self.setAttribute('data-' + String(k).replace(/[A-Z]/g, m => '-' + m.toLowerCase()), String(v)); return true; },
      has: (_, k) => self.hasAttribute('data-' + String(k))
    });
    this.classList = {
      contains: c => self.className.split(/\s+/).includes(c),
      add: (...cs) => { const s = new Set(self.className.split(/\s+/).filter(Boolean)); cs.forEach(c => s.add(c)); self.className = [...s].join(' '); },
      remove: (...cs) => { self.className = self.className.split(/\s+/).filter(c => c && !cs.includes(c)).join(' '); },
      toggle: (c, force) => { const on = force === undefined ? !self.classList.contains(c) : !!force; on ? self.classList.add(c) : self.classList.remove(c); return on; }
    };
    listen(this);
    this.rect = { left: 0, top: 0, width: 100, height: 140, right: 100, bottom: 140 };
    this.offsetWidth = 200;
  }
  get className() { return this.getAttribute('class') || ''; }
  set className(v) { this.setAttribute('class', v); }
  get tabIndex() { return +(this.getAttribute('tabindex') ?? -1); }
  set tabIndex(v) { this.setAttribute('tabindex', String(v)); }
  getAttribute(k) { return this.attributes.has(k) ? this.attributes.get(k) : null; }
  setAttribute(k, v) { this.attributes.set(k, String(v)); }
  hasAttribute(k) { return this.attributes.has(k); }
  removeAttribute(k) { this.attributes.delete(k); }
  get children() { return this.childNodes.filter(c => c.nodeType === 1); }
  getBoundingClientRect() { return { ...this.rect }; }
  focus() { const prev = this.ownerDocument.activeElement; if (prev === this) return; if (prev && prev.blur) prev.blur(); this.ownerDocument.activeElement = this; this.dispatch('focus'); }
  blur() { if (this.ownerDocument.activeElement === this) this.ownerDocument.activeElement = null; this.dispatch('blur'); }
  click() { this.dispatch('click'); }
  animate(keyframes, options) {
    const a = { keyframes, options, target: this, playState: 'running', paused: false, onfinish: null, effect: { updateTiming(t) { Object.assign(options, t); } },
      pause() { this.playState = 'paused'; }, play() { this.playState = 'running'; }, cancel() { this.playState = 'idle'; }, finish() { this.playState = 'finished'; if (this.onfinish) this.onfinish(); } };
    this.animations.push(a); this.ownerDocument.animations.push(a); return a;
  }
  matches(sel) { return sel.split(',').some(s => matchOne(this, s.trim())); }
  closest(sel) { for (let n = this; n && n.nodeType === 1; n = n.parentNode) if (n.matches(sel)) return n; return null; }
  querySelectorAll(sel) { const out = []; const walk = n => n.children.forEach(c => { if (c.matches(sel)) out.push(c); walk(c); }); walk(this); return out; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  set innerHTML(html) { this.textContent = ''; parse(html, this); }
}

function simple(el, s) {
  const m = s.match(/^([a-z0-9]*)((?:\.[\w-]+)*)((?:\[[^\]]+\])*)$/i); if (!m) throw new Error('selector not supported: ' + s);
  if (m[1] && el.tagName !== m[1].toUpperCase()) return false;
  for (const c of (m[2].match(/\.[\w-]+/g) || [])) if (!el.classList.contains(c.slice(1))) return false;
  for (const a of (m[3].match(/\[[^\]]+\]/g) || [])) { const [k, v] = a.slice(1, -1).split('='); if (!el.hasAttribute(k)) return false; if (v !== undefined && el.getAttribute(k) !== v.replace(/["']/g, '')) return false; }
  return true;
}
function matchOne(el, sel) {
  const parts = sel.replace(/\s*>\s*/g, ' > ').split(/\s+/);
  const last = parts.pop(); if (!simple(el, last)) return false;
  if (!parts.length) return true;
  const rel = parts[parts.length - 1] === '>' ? (parts.pop(), 'child') : 'desc';
  const rest = parts.join(' ');
  if (rel === 'child') return !!el.parentElement && matchOne(el.parentElement, rest);
  for (let p = el.parentElement; p; p = p.parentElement) if (matchOne(p, rest)) return true;
  return false;
}
const ent = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
function parse(html, root) {
  const doc = root.ownerDocument; let cur = root; const re = /<!--[\s\S]*?-->|<\/([a-z0-9-]+)\s*>|<([a-z0-9-]+)((?:\s+[\w:-]+(?:="[^"]*")?)*)\s*(\/?)>|([^<]+)/gi; let m;
  while ((m = re.exec(html))) {
    if (m[1]) { cur = cur.parentNode || root; continue; }
    if (m[2]) {
      const attrs = {}; (m[3].match(/[\w:-]+(?:="[^"]*")?/g) || []).forEach(a => { const i = a.indexOf('='); attrs[i < 0 ? a : a.slice(0, i)] = i < 0 ? '' : ent(a.slice(i + 2, -1)); });
      const el = cur.appendChild(new Element_(doc, m[2], attrs));
      if (!m[4] && !VOID.has(m[2].toLowerCase())) cur = el;
      continue;
    }
    if (m[5] && m[5].trim()) cur.appendChild(new Text_(doc, ent(m[5])));
  }
}

function makeDocument() {
  const doc = { animations: [], activeElement: null, visibilityState: 'visible' };
  listen(doc);
  doc.createElement = t => new Element_(doc, t);
  doc.createTextNode = t => new Text_(doc, t);
  doc.documentElement = new Element_(doc, 'html');
  doc.body = doc.documentElement.appendChild(new Element_(doc, 'body'));
  doc.querySelector = s => doc.documentElement.querySelector(s);
  doc.querySelectorAll = s => doc.documentElement.querySelectorAll(s);
  doc.getElementById = id => doc.documentElement.querySelectorAll('[id]').find(e => e.getAttribute('id') === id) || null;
  return doc;
}

module.exports = { makeDocument, listen };

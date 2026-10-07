(() => {
  'use strict';
  let selected = 0;
  // Wave 4 calm Home: the carousel lives on #friends and the learning loop on #curriculum (both inserted by home-calm.js).
  const HOSTS = ['friends', 'curriculum'];
  let controller;
  const wrapIndex = (index, length) => ((index % length) + length) % length;
  const arrow = name => `<svg aria-hidden="true" width="22" height="22"><use href="img/ui-icons.svg#${name}"/></svg>`;
  window.FFHome = {
    wrapIndex,
    rooms: () => `<section class="ff-home-intro"><div class="wrap px-sectionheading"><div><span class="px-kicker">FOUR FRIENDS. ENDLESS POSSIBILITIES.</span><h2>A friend for every discovery.</h2></div><p>Different personalities.<br>One big-hearted learning world.</p></div></section>
      <section class="ff-home-rooms ffhr" id="ff-rooms" data-interactive data-character="${KEYS[selected]}" aria-label="Meet the Futures Friends" aria-roledescription="carousel">
        <div class="ff-home-slides">${KEYS.map((key, index) => ffhRoom(key, index, selected)).join('')}</div>
        <div class="ff-home-controls"><button type="button" class="ff-home-arrow" data-room-direction="-1" aria-label="Previous friend" title="Previous friend">${arrow('ArrowLeft')}</button>
          <div class="ff-home-selectors" role="group" aria-label="Choose a Futures Friend">${KEYS.map((key, index) => `<button type="button" data-room-select="${index}" aria-pressed="${index === selected}" aria-controls="ff-room-${key}"><img src="${ART[key]}" alt="" width="35" height="44"><span><b>${CH[key].n}</b><small>${CH[key].p}</small></span></button>`).join('')}</div>
          <button type="button" class="ff-home-arrow" data-room-direction="1" aria-label="Next friend" title="Next friend">${arrow('ArrowRight')}</button>
        </div><span class="ff-home-status sr-only" role="status" aria-live="polite" aria-atomic="true">${CH[KEYS[selected]].n}, ${selected + 1} of 4</span>
      </section>`
  };

  window.FFhooks.push((view, root) => {
    controller?.abort();
    if (!HOSTS.includes(view)) return;
    controller = new AbortController();
    const options = {signal: controller.signal};
    const rooms = root.querySelector('#ff-rooms[data-interactive]');
    const loop = root.querySelector('#ff-loop[data-interactive]');
    if (rooms) {
      const slides = Array.from(rooms.querySelectorAll('.ffhr-room'));
      const selectors = Array.from(rooms.querySelectorAll('[data-room-select]'));
      const status = rooms.querySelector('.ff-home-status');
      const select = (index, focus = false) => {
        selected = wrapIndex(index, slides.length);
        slides.forEach((slide, i) => { slide.hidden = i !== selected; });
        selectors.forEach((button, i) => button.setAttribute('aria-pressed', String(i === selected)));
        rooms.dataset.character = KEYS[selected];
        status.textContent = `${CH[KEYS[selected]].n}, ${selected + 1} of 4`;
        if (focus) selectors[selected].focus({preventScroll: true});
      };
      rooms.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.hasAttribute('data-room-select')) select(Number(button.dataset.roomSelect));
        if (button.hasAttribute('data-room-direction')) select(selected + Number(button.dataset.roomDirection));
      }, options);
      rooms.querySelector('.ff-home-selectors').addEventListener('keydown', event => {
        const moves = {ArrowLeft: selected - 1, ArrowRight: selected + 1, Home: 0, End: slides.length - 1};
        if (!(event.key in moves)) return;
        event.preventDefault();
        select(moves[event.key], true);
      }, options);
      let start;
      rooms.addEventListener('pointerdown', event => {
        if (event.pointerType === 'mouse' || event.target.closest('button,a')) return;
        start = {x: event.clientX, y: event.clientY, id: event.pointerId};
      }, options);
      rooms.addEventListener('pointerup', event => {
        if (!start || event.pointerId !== start.id) return;
        const dx = event.clientX - start.x, dy = event.clientY - start.y;
        start = null;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) select(selected + (dx < 0 ? 1 : -1));
      }, options);
      rooms.addEventListener('pointercancel', () => { start = null; }, options);
      slides.forEach(slide => {
        const stage = slide.querySelector('.ffhr-stage');
        const reset = () => { stage.style.removeProperty('--mx'); stage.style.removeProperty('--my'); stage.style.removeProperty('--rx'); stage.style.removeProperty('--ry'); };
        stage.addEventListener('pointermove', event => {
          if (document.documentElement.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(hover: hover) and (pointer: fine)').matches) return reset();
          const rect = stage.getBoundingClientRect();
          const x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
          const y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
          stage.style.setProperty('--mx', `${x * 12}px`);
          stage.style.setProperty('--my', `${y * 9}px`);
          stage.style.setProperty('--rx', `${-y * 3}deg`);
          stage.style.setProperty('--ry', `${x * 4}deg`);
        }, options);
        stage.addEventListener('pointerleave', reset, options);
      });
    }
    if (loop) {
      const steps = Array.from(loop.querySelectorAll('[data-loop-step]'));
      const nodes = Array.from(loop.querySelectorAll('.ffhl-node'));
      const labels = Array.from(loop.querySelectorAll('.ffhl-lab'));
      const center = loop.querySelector('.ffhl-center');
      const circumference = 2 * Math.PI * 170;
      let current = 0;
      const selectStep = (index, focus = false) => {
        current = wrapIndex(index, steps.length);
        steps.forEach((button, i) => button.setAttribute('aria-pressed', String(i === current)));
        nodes.forEach((node, i) => { node.classList.toggle('on', i === current); node.classList.toggle('done', i < current); });
        labels.forEach((label, i) => label.classList.toggle('on', i === current));
        center.querySelector('b').textContent = FFH_LOOP[current][0];
        center.querySelector('span').textContent = FFH_LOOP[current][1];
        center.style.setProperty('--step-color', `var(--${FFH_LOOP[current][2]})`);
        const path = loop.querySelector('.ffhl-draw');
        path.style.strokeDasharray = String(circumference);
        path.style.strokeDashoffset = String(circumference * (1 - current / 6));
        loop.querySelector('.ffhl-orbit').style.transform = `rotate(${current * 60}deg)`;
        loop.querySelector('.ffhl-upright').style.transform = `rotate(${-current * 60}deg)`;
        if (focus) steps[current].focus({preventScroll: true});
      };
      steps.forEach((button, index) => button.addEventListener('click', () => selectStep(index), options));
      loop.querySelector('.ffhl-list').addEventListener('keydown', event => {
        const moves = {ArrowUp: current - 1, ArrowDown: current + 1, Home: 0, End: steps.length - 1};
        if (!(event.key in moves)) return;
        event.preventDefault();
        selectStep(moves[event.key], true);
      }, options);
      selectStep(0);
    }
  });
})();

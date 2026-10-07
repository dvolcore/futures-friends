/* The supplied brand film is opt-in and never blocks a page visit. */
(function () {
  'use strict';
  const dialog = document.createElement('dialog');
  dialog.className = 'px-dialog ff-brand-dialog';
  dialog.setAttribute('aria-labelledby', 'ff-brand-title');
  dialog.innerHTML = `<div class="px-dialoghead"><h2 id="ff-brand-title">Futures Friends</h2><button type="button" class="px-iconbtn" data-brand-close aria-label="Close logo reveal"><svg class="px-icon" aria-hidden="true"><use href="img/ui-icons.svg#X"></use></svg></button></div><video controls playsinline preload="none" poster="img/brand/ff-logo-reveal-poster.jpg" aria-label="Futures Friends logo reveal"><source src="video/ff-logo-reveal-navy.mp4" type="video/mp4">${window.FFCaptions ? window.FFCaptions.tracks('video/ff-logo-reveal-navy.mp4') : ''}</video><p role="status" class="ex-note" id="ff-brand-status">Five seconds / Silent logo animation</p><a class="px-link" href="video/ff-logo-reveal-navy.mp4">Open the video file</a>`;
  document.body.appendChild(dialog);
  const video = dialog.querySelector('video');
  const status = dialog.querySelector('#ff-brand-status');
  let trigger;
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-brand-reveal]');
    if (!button || dialog.open) return;
    trigger = button;
    status.textContent = 'Five seconds / Silent logo animation';
    dialog.showModal();
    dialog.querySelector('[data-brand-close]').focus();
    video.play().catch(() => {
      if (dialog.open) status.textContent = 'Use the video controls to play the logo reveal.';
    });
  });
  dialog.querySelector('[data-brand-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    video.pause();
    video.currentTime = 0;
    if (trigger && trigger.isConnected) trigger.focus();
  });
  video.addEventListener('error', () => {
    status.textContent = 'The video could not load. You can try opening the video file.';
  });
  window.addEventListener('hashchange', () => { if (dialog.open) dialog.close(); });
})();

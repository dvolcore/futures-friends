(function () {
  'use strict';
  const profiles = {
    melissa: {
      name: 'Melissa Hill, M.Ed.',
      area: 'Education & curriculum',
      role: 'Education Adjunct Faculty / Curriculum & Instruction / Educator Development',
      image: 'img/advisors/melissa-hill.webp',
      heading: 'A curriculum educator\'s read.',
      excerpt: 'I\u2019m impressed by the way it combines empathy, structure, and real-world readiness in a way that educators can confidently implement.',
      statement: 'The Futures Learning Center curriculum is thoughtfully designed, developmentally appropriate, and intentionally inclusive. It provides meaningful, standards-aligned learning experiences that nurture the whole child while building essential skills for lifelong success. I\u2019m impressed by the way it combines empathy, structure, and real-world readiness in a way that educators can confidently implement.',
      focus: ['Curriculum development', 'Instructional design', 'Educator support'],
      background: ['Doctoral Studies, Educational Leadership (ABD) / Northcentral University', 'Master of Education, Elementary Education / Rockhurst University', 'Bachelor of Science, Criminal Justice / University of Phoenix', 'Associate of Applied Science, Paralegal Studies / Brown Mackie College'],
      expertise: ['Curriculum & Instruction', 'Educator Coaching & Mentoring', 'Instructional Design', 'Differentiated Instruction', 'Assessment & Standards-Based Grading', 'Educational Technology', 'Montessori Education', 'Student Interventions', 'Data-Driven Instruction', 'Adult & Professional Learning']
    },
    laurie: {
      name: 'Laurie Ouding, RN, LNC',
      area: 'Nutrition & food',
      role: 'Lifestyle Medicine Certified / Master Urban Farmer / Horticulture Therapist',
      image: 'img/advisors/laurie-ouding.webp',
      heading: 'Colorful food. Habits that grow.',
      excerpt: 'I appreciate its focus on balanced meals and introducing children to a variety of foods.',
      statement: 'This menu offers a thoughtful variety of nutritious foods to support young children\u2019s growth and development while encouraging healthy eating habits. As an RN with 40 years of experience, including pediatrics and community health, I appreciate its focus on balanced meals and introducing children to a variety of foods.',
      focus: ['Balanced meals', 'Healthy habits', 'Whole-child wellness'],
      background: ['RN', 'LNC', 'Lifestyle Medicine Certified', 'Master Urban Farmer', 'Horticulture Therapist'],
      expertise: ['Pediatric nutrition perspective', 'Community health', 'Balanced meals', 'Healthy eating habits', 'Growth and development', 'Introducing children to a variety of foods']
    }
  };
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const icon = name => `<svg aria-hidden="true" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><use href="img/ui-icons.svg#${name}"></use></svg>`;
  const get = key => Object.hasOwn(profiles, key) ? profiles[key] : null;

  function render(key, compact = false) {
    const p = get(key);
    if (!p) return '';
    return `<section class="ff-advisor ff-advisor-${key}${compact ? ' ff-advisor-compact' : ''}" aria-label="${escape(p.area)} professional profile"><div class="wrap ff-advisor-layout">
      <figure class="ff-advisor-art"><button type="button" data-advisor-profile="${key}" aria-label="View ${escape(p.name)} profile artwork" aria-haspopup="dialog"><img src="${p.image}" width="1122" height="1402" loading="lazy" decoding="async" alt="${escape(p.name)}: Futures Learning Center professional profile"><span class="ff-advisor-expand" aria-hidden="true">${icon('Search')}</span></button><figcaption>Futures Learning Center / ${escape(p.area)}</figcaption></figure>
      <div class="ff-advisor-copy"><span class="ff-advisor-kicker">${escape(p.area)}</span><h2>${escape(p.heading)}</h2><div class="ff-advisor-person"><h3>${escape(p.name)}</h3><p>${escape(p.role)}</p></div><blockquote><p>${escape(p.excerpt)}</p><cite>From ${key === 'melissa' ? 'Melissa' : 'Laurie'}'s supplied statement</cite></blockquote>
      <ul class="ff-advisor-focus" aria-label="Areas of focus">${p.focus.map(item => `<li>${escape(item)}</li>`).join('')}</ul>
      <details class="ff-advisor-background"><summary>Full statement &amp; background ${icon('ChevronDown')}</summary><div class="ff-advisor-expanded"><h4>In her own words</h4><blockquote><p>${escape(p.statement)}</p></blockquote><div class="ff-advisor-background-grid"><div><h4>${key === 'melissa' ? 'Education' : 'Professional credentials'}</h4><ul>${p.background.map(item => `<li>${escape(item)}</li>`).join('')}</ul></div><div><h4>Areas of ${key === 'melissa' ? 'expertise' : 'focus'}</h4><ul>${p.expertise.map(item => `<li>${escape(item)}</li>`).join('')}</ul></div></div><p class="ff-advisor-source">Profile and statement supplied for Futures Learning Center. ${key === 'melissa' ? 'ABD denotes doctoral studies, not an awarded doctorate. This profile does not establish Academy accreditation.' : 'The statement concerns the supplied menu; it does not establish certification of every recipe or individual dietary suitability.'}</p></div></details>
      </div></div></section>`;
  }

  let dialog;
  function open(key, trigger) {
    const p = get(key);
    if (!p) return;
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'ff-advisor-dialog';
      dialog.addEventListener('click', event => {
        if (event.target === dialog || event.target.closest('[data-advisor-close]')) dialog.close();
      });
      dialog.addEventListener('close', () => {
        if (dialog.trigger?.isConnected) dialog.trigger.focus({preventScroll:true});
        dialog.trigger = null;
      });
      document.body.appendChild(dialog);
    }
    dialog.trigger = trigger;
    dialog.setAttribute('aria-label', `${p.name} profile artwork`);
    dialog.innerHTML = `<div class="ff-advisor-dialogbar"><b>${escape(p.name)}</b><button type="button" data-advisor-close aria-label="Close profile" title="Close profile" autofocus>${icon('X')}</button></div><img src="${p.image}" width="1122" height="1402" alt="${escape(p.name)}: supplied professional profile poster"><a href="${p.image}" target="_blank" rel="noopener">Open full-size artwork ${icon('ArrowRight')}</a>`;
    dialog.showModal();
  }
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-advisor-profile]');
    if (trigger) open(trigger.dataset.advisorProfile, trigger);
  });
  // A route change must not leave a detached profile's modal over the next page.
  window.addEventListener('hashchange', () => { if (dialog?.open) dialog.close(); });
  // Read-only copy of one profile's supplied wording, for the endorsement band (endorse-band.js). Never edited, never invented.
  const profile = key => { const p = get(key); return p ? Object.freeze({...p}) : null; };
  window.FFAdvisors = {render, profile};
})();

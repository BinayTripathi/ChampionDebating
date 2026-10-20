(function () {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  setUpMenu();
  setUpNavState();
  setUpReveals();
  setUpTilt();
  setUpCounters();
  setUpMotionCard();
  setUpMotionsTrack();
  setUpEnquiryForm();

  document.querySelectorAll('[data-year]').forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  function setUpMenu() {
    const toggle = document.querySelector('.nav__toggle');
    const menu = document.getElementById('menu');
    if (!toggle || !menu) return;

    function setOpen(isOpen) {
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
      menu.classList.toggle('is-open', isOpen);
      menu.inert = !isOpen;
      document.body.classList.toggle('menu-open', isOpen);
    }

    menu.inert = true;
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  // Darken the floating nav once the hero leaves view, without a scroll listener.
  function setUpNavState() {
    const nav = document.querySelector('.nav');
    const hero = document.querySelector('.hero');
    if (!nav || !hero) return;
    new IntersectionObserver(([entry]) => {
      nav.classList.toggle('is-scrolled', !entry.isIntersecting);
    }, { rootMargin: '-80px 0px 0px 0px' }).observe(hero);
  }

  function setUpReveals() {
    const targets = document.querySelectorAll('[data-reveal]');
    if (prefersReducedMotion) {
      targets.forEach((node) => node.classList.add('is-in'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    targets.forEach((node) => observer.observe(node));
  }

  function setUpTilt() {
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!canHover || prefersReducedMotion) return;

    document.querySelectorAll('.tilt').forEach((card) => {
      const maxDegrees = Number(card.dataset.tiltMax || 6);

      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        card.classList.add('is-tracking');
        card.style.setProperty('--ry', `${(x - 0.5) * maxDegrees * 2}deg`);
        card.style.setProperty('--rx', `${(0.5 - y) * maxDegrees * 2}deg`);
        card.style.setProperty('--gx', `${x * 100}%`);
        card.style.setProperty('--gy', `${y * 100}%`);
      });

      card.addEventListener('pointerleave', () => {
        card.classList.remove('is-tracking');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  function setUpCounters() {
    const counters = document.querySelectorAll('[data-count]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        animateCount(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach((node) => observer.observe(node));
  }

  function animateCount(node) {
    const target = Number(node.dataset.count);
    const output = node.querySelector('[data-count-value]') || node;
    if (prefersReducedMotion) {
      output.textContent = target;
      return;
    }
    const duration = 2200;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(2, -10 * progress);
      output.textContent = Math.round(target * (progress === 1 ? 1 : eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function setUpMotionCard() {
    const card = document.querySelector('[data-motion]');
    if (!card) return;
    showThisWeeksMotion(card);
    const sides = card.querySelectorAll('[data-side]');
    const next = card.querySelector('.motion__next');
    const switchButton = card.querySelector('[data-switch]');

    function choose(side) {
      sides.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.side === side)));
      card.querySelectorAll('[data-argument]').forEach((argument) => {
        argument.hidden = argument.dataset.argument !== side;
      });
      next.hidden = false;
    }

    sides.forEach((button) => button.addEventListener('click', () => choose(button.dataset.side)));
    // Arguing the side you disagree with is the core debating habit, so make it one tap.
    switchButton.addEventListener('click', () => {
      const current = card.querySelector('[data-side][aria-pressed="true"]').dataset.side;
      choose(current === 'for' ? 'against' : 'for');
    });
  }

  // The HTML holds a fallback motion; when the list loads, it is replaced by this week's.
  function showThisWeeksMotion(card) {
    const motions = window.MOTIONS_OF_THE_WEEK;
    if (!Array.isArray(motions) || motions.length === 0) return;
    const motion = motions[getSydneyWeekNumber() % motions.length];

    const text = card.querySelector('.motion__text');
    text.replaceChildren(text.querySelector('span'), ` ${motion.motion}`);
    ['for', 'against'].forEach((side) => {
      const panel = card.querySelector(`[data-argument="${side}"]`);
      panel.querySelector('.motion__argument').textContent = `“${motion[side].argument}”`;
      const tip = panel.querySelector('.motion__tip');
      tip.replaceChildren(tip.querySelector('span'), motion[side].tip);
    });
  }

  // Weeks counted in Sydney time from Monday 5 January 2026, so every visitor
  // sees the same motion and it changes at the start of the Australian week.
  function getSydneyWeekNumber() {
    const parts = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney', year: 'numeric', month: 'numeric', day: 'numeric',
    }).formatToParts(new Date());
    const part = (type) => Number(parts.find((p) => p.type === type).value);
    const today = Date.UTC(part('year'), part('month') - 1, part('day'));
    const firstMonday = Date.UTC(2026, 0, 5);
    const weeks = Math.floor((today - firstMonday) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(0, weeks);
  }

  function setUpMotionsTrack() {
    const track = document.getElementById('motions-track');
    if (!track) return;
    document.querySelectorAll('[data-motions-scroll]').forEach((button) => {
      button.addEventListener('click', () => {
        const card = track.querySelector('.motions__card');
        const step = card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);
        track.scrollBy({ left: step * Number(button.dataset.motionsScroll), behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      });
    });
  }

  // No backend yet: validate in the browser and show the confirmation state.
  function setUpEnquiryForm() {
    const wrapper = document.querySelector('[data-enquiry]');
    if (!wrapper) return;
    const form = wrapper.querySelector('form');
    const status = wrapper.querySelector('[role="status"]');

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      let firstInvalid = null;

      form.querySelectorAll('[required]').forEach((field) => {
        const error = form.querySelector(`#${field.id}-error`);
        const isValid = field.checkValidity();
        field.setAttribute('aria-invalid', String(!isValid));
        if (error) error.textContent = isValid ? '' : getErrorMessage(field);
        if (!isValid && !firstInvalid) firstInvalid = field;
      });

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      wrapper.classList.add('is-sent');
      status.textContent = 'Thank you. Your enquiry has been received.';
      wrapper.querySelector('.form-success').focus();
    });
  }

  function getErrorMessage(field) {
    if (field.validity.valueMissing) return 'Please fill in this field.';
    if (field.validity.typeMismatch) return 'Please enter a valid email address.';
    return 'Please check this field.';
  }
})();

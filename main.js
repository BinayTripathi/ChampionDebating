(function () {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The Chinese pages are generated from the English HTML, so strings set from script are translated here.
  const TEXT = document.documentElement.lang.startsWith('zh') ? {
    openMenu: '打开菜单', closeMenu: '关闭菜单', sent: '谢谢！我们已收到您的咨询。',
    offline: '在线预约暂未开通，请通过 WhatsApp 联系我们。', humanCheck: '请先完成人机验证。', sendFailed: '提交失败，请重试，或通过 WhatsApp 联系我们。',
    required: '请填写此项。', email: '请输入有效的邮箱地址。', phone: '请输入有效的手机号码。', invalid: '请检查此项。',
    newFamily: '推荐链接仅限新客户使用。', mobileEnding: (digits) => `（手机尾号 ${digits}）`, copied: '已复制', shareText: (link) => `推荐您了解冠军辩论的英语辩论课程。使用这个链接预约免费体验课（仅限新客户）：${link}`,
  } : {
    openMenu: 'Open menu', closeMenu: 'Close menu', sent: 'Thank you. Your enquiry has been received.',
    offline: 'Online booking isn’t available yet. Please message us on WhatsApp.', humanCheck: 'Please complete the check that you’re not a robot.', sendFailed: 'We couldn’t send your enquiry. Please try again or message us on WhatsApp.',
    required: 'Please fill in this field.', email: 'Please enter a valid email address.', phone: 'Please enter a valid mobile number.', invalid: 'Please check this field.',
    newFamily: 'Referral links are for new customers only.', mobileEnding: (digits) => ` (mobile ending ${digits})`, copied: 'Copied', shareText: (link) => `I recommend Champion Debating. Book a free trial class with my referral link (new customers only): ${link}`,
  };

  setUpMenu();
  setUpNavState();
  setUpReveals();
  setUpTilt();
  setUpMotionCard();
  setUpEnquiryForm();
  setUpReferredBooking();
  setUpReferralLink();

  document.querySelectorAll('[data-year]').forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  function setUpMenu() {
    const toggle = document.querySelector('.nav__toggle');
    const menu = document.getElementById('menu');
    if (!toggle || !menu) return;

    function setOpen(isOpen) {
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? TEXT.closeMenu : TEXT.openMenu);
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
    // Start a quarter-screen early so sections finish arriving before they scroll into view, never showing a blank block.
    }, { rootMargin: '0px 0px 25% 0px' });
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

  // Success shows only once the API has emailed the centre, so a parent is never told a lost enquiry arrived.
  function setUpEnquiryForm() {
    const wrapper = document.querySelector('[data-enquiry]');
    if (!wrapper) return;
    const form = wrapper.querySelector('form');
    const status = wrapper.querySelector('[role="status"]');
    const submit = form.querySelector('[type="submit"]');
    const formError = form.querySelector('[data-form-error]');

    if (!window.siteApi.isConfigured()) {
      submit.disabled = true;
      formError.textContent = TEXT.offline;
      return;
    }
    const humanCheck = window.siteApi.createHumanCheck(form.querySelector('[data-human-check]'));

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      formError.textContent = '';
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
      if (!humanCheck.getToken()) {
        formError.textContent = TEXT.humanCheck;
        return;
      }

      submit.disabled = true;
      try {
        const data = new FormData(form);
        await window.siteApi.post('/enquiries', {
          ...Object.fromEntries(data), newFamily: data.has('newFamily'), turnstileToken: humanCheck.getToken(),
        });
      } catch {
        submit.disabled = false;
        humanCheck.reset();
        formError.textContent = TEXT.sendFailed;
        return;
      }

      wrapper.classList.add('is-sent');
      status.textContent = TEXT.sent;
      wrapper.querySelector('.form-success').focus();
    });
  }

  // A referral link opens the booking form with ?ref=<name>&rc=<last 4 mobile digits>. No backend yet, so the
  // "new customers only" rule is a declaration here; checking it against enrolled families needs the booking system.
  function setUpReferredBooking() {
    const panel = document.querySelector('[data-referred]');
    if (!panel) return;
    const params = new URLSearchParams(location.search);
    const referrer = getReferrerName(params.get('ref'));
    if (!referrer) return;
    const digits = /^\d{4}$/.test(params.get('rc') || '') ? params.get('rc') : '';
    panel.querySelector('[data-referrer]').textContent = digits ? referrer + TEXT.mobileEnding(digits) : referrer;
    panel.querySelector('[name="referredBy"]').value = referrer;
    panel.querySelector('[name="referrerMobileEnd"]').value = digits;
    panel.querySelector('#new-family').required = true;
    panel.hidden = false;
  }

  // Comes from the address bar or a form, so only a short run of name characters is kept.
  function getReferrerName(value) {
    const name = (value || '').trim().slice(0, 40);
    return /^[\p{L}][\p{L}\p{M} .'’-]*$/u.test(name) ? name : '';
  }

  function setUpReferralLink() {
    const form = document.querySelector('[data-referral-form]');
    if (!form) return;
    const input = form.querySelector('#referrer-name');
    const error = form.querySelector('#referrer-name-error');
    const mobile = form.querySelector('#referrer-mobile');
    const mobileError = form.querySelector('#referrer-mobile-error');
    const result = document.querySelector('[data-referral-result]');
    const output = result.querySelector('#referral-link');
    const copyLabel = result.querySelector('[data-copy-label]');
    const status = document.querySelector('[data-referral-status]');

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = getReferrerName(input.value);
      input.setAttribute('aria-invalid', String(!name));
      error.textContent = name ? '' : input.value.trim() ? TEXT.invalid : TEXT.required;
      const isMobileValid = mobile.checkValidity() && mobile.value.replace(/\D/g, '').length >= 8;
      mobile.setAttribute('aria-invalid', String(!isMobileValid));
      mobileError.textContent = isMobileValid ? '' : mobile.value.trim() ? TEXT.phone : TEXT.required;
      if (!name || !isMobileValid) {
        (name ? mobile : input).focus();
        return;
      }
      const url = new URL('contact.html', location.href);
      url.searchParams.set('ref', name);
      // Only the last 4 digits: the link is shared with other families, so the full number never goes in it.
      url.searchParams.set('rc', mobile.value.replace(/\D/g, '').slice(-4));
      url.hash = 'book';
      output.value = url.href;
      result.querySelector('[data-whatsapp-link]').href = `https://wa.me/?text=${encodeURIComponent(TEXT.shareText(url.href))}`;
      result.hidden = false;
      output.focus();
      output.select();
    });

    result.querySelector('[data-copy-link]').addEventListener('click', async () => {
      output.select();
      try {
        await navigator.clipboard.writeText(output.value);
      } catch {
        document.execCommand('copy');
      }
      copyLabel.textContent = TEXT.copied;
      status.textContent = TEXT.copied;
    });
  }

  function getErrorMessage(field) {
    if (field.id === 'new-family') return TEXT.newFamily;
    if (field.validity.valueMissing) return TEXT.required;
    if (field.validity.typeMismatch) return TEXT.email;
    if (field.validity.patternMismatch && field.type === 'tel') return TEXT.phone;
    return TEXT.invalid;
  }
})();

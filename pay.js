/*
 * Payment page, by PayTo (the default) or card. The card is the form: it grows when you start
 * filling it, tilts under the pointer, turns over for the security code and glows
 * once complete. For PayTo, a phone previews the request the family's bank will
 * show them to approve.
 *
 * Not connected yet: submitting only checks the fields. To go live with Stripe:
 * - Card: mount Stripe's split card Elements (cardNumber, cardExpiry, cardCvc) in
 *   place of the three card inputs, and drive the flip and glow from their focus
 *   and change events (`complete`, `brand`). Raw card numbers must never be sent
 *   from these inputs.
 * - PayTo: confirm a PaymentIntent with `payment_method_types: ['payto']` and the
 *   PayID or BSB and account number plus the account holder's name (refunds to a
 *   PayID fail if the name doesn't match the bank account). "Pay this once" needs no
 *   mandate options. "Pay each term" sets
 *   `payment_method_options[payto][mandate_options]` to amount_type `maximum`,
 *   amount = the most per term, payment_schedule `quarterly`, payments_per_period 1,
 *   and end_date. Banks such as ANZ, CBA and Westpac reject agreements with no maximum.
 * - Either way, create the PaymentIntent on a server and confirm the result by webhook.
 */
(function () {
  const form = document.querySelector('[data-pay]');
  if (!form) return;

  const isZh = document.documentElement.lang.startsWith('zh');
  const TEXT = isZh ? {
    required: '请填写此项。', email: '请输入有效的邮箱地址。', amount: '请输入发票上的金额。',
    card: '请检查卡片信息。', checked: '信息已核对，但尚未扣款。',
    mobile: '请输入有效的手机号码。', payId: '请输入邮箱、手机号码或 ABN。', bsb: 'BSB 为 6 位数字。', account: '账号为 5 到 9 位数字。', maximum: '请输入每学期的最高扣款金额。',
    payNow: '立即支付', toBank: '前往银行批准', once: '一次', eachTerm: '每学期', upTo: (value) => `最多 ${value}`,
  } : {
    required: 'Please fill in this field.', email: 'Please enter a valid email address.', amount: 'Enter the amount on your invoice.',
    card: 'Please check the card details.', checked: 'Details checked. Nothing was charged.',
    mobile: 'Please enter a valid mobile number.', payId: 'Enter an email, mobile number or ABN.', bsb: 'A BSB has 6 digits.', account: 'An account number has 5 to 9 digits.', maximum: 'Enter the most we can take each term.',
    payNow: 'Pay now', toBank: 'Approve in my bank', once: 'Once', eachTerm: 'Each term', upTo: (value) => `Up to ${value}`,
  };
  const money = new Intl.NumberFormat(isZh ? 'zh-CN' : 'en-AU', { style: 'currency', currency: 'AUD' });
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;

  const slot = form.querySelector('[data-card-slot]');
  const card = form.querySelector('[data-card]');
  const tilt = card.querySelector('.card__tilt');
  const glow = card.querySelector('.glow');
  const brandLabel = card.querySelector('[data-brand]');
  const cardError = form.querySelector('[data-card-error]');
  const number = form.querySelector('#cc-number');
  const name = form.querySelector('#cc-name');
  const expiry = form.querySelector('#cc-exp');
  const cvc = form.querySelector('#cc-csc');
  const amount = form.querySelector('#pay-amount');
  const email = form.querySelector('#pay-email');
  const student = form.querySelector('#pay-student');
  const mobile = form.querySelector('#pay-mobile');
  const amountField = form.querySelector('[data-amount-field]');
  const total = form.querySelector('[data-total]');
  const submitLabel = form.querySelector('[data-submit-label]');

  const payto = form.querySelector('[data-payto]');
  const phone = form.querySelector('[data-phone]');
  const phoneGlow = phone.querySelector('.glow');
  const accountName = form.querySelector('#payto-name');
  const payId = form.querySelector('#payto-payid');
  const bsb = form.querySelector('#payto-bsb');
  const accountNumber = form.querySelector('#payto-account');
  const maximum = form.querySelector('#payto-max');
  const endDate = form.querySelector('#payto-end');

  setUpOrder();
  setUpCard();
  setUpPayTo();
  setUpSubmit();

  function setUpOrder() {
    form.addEventListener('change', (event) => {
      if (['item', 'method', 'agreement', 'account'].includes(event.target.name)) update();
    });
    form.addEventListener('input', updatePhone);
    amount.addEventListener('input', update);
    update();
  }

  function update() {
    const isTerm = !getChoice('item').dataset.price;
    amountField.hidden = !isTerm;
    amount.required = isTerm;
    total.textContent = money.format(getTotal());

    const isPayTo = getChoice('method').value === 'payto';
    payto.hidden = !isPayTo;
    phone.hidden = !isPayTo;
    form.querySelector('.pay__card').hidden = isPayTo;
    submitLabel.textContent = isPayTo ? TEXT.toBank : TEXT.payNow;

    // An agreement for every term only makes sense for term fees.
    form.querySelector('[data-agreement-choice]').hidden = !isTerm;
    if (!isTerm) form.querySelector('[name="agreement"][value="once"]').checked = true;
    form.querySelector('[data-term-only]').hidden = !isEachTerm();
    const account = getChoice('account').value;
    form.querySelectorAll('[data-account]').forEach((node) => { node.hidden = node.dataset.account !== account; });
    updatePhone();
  }

  function setUpCard() {
    // The CVC is on the back, so the back is what you get.
    card.addEventListener('focusin', (event) => {
      flip(event.target === cvc);
      grow(true);
    });
    card.addEventListener('focusout', (event) => {
      if (!card.contains(event.relatedTarget)) {
        flip(false);
        grow(false);
      }
    });

    number.addEventListener('input', () => {
      // shortcut: reformatting moves the caret to the end; fine for typing, Stripe's Element replaces this.
      const digits = number.value.replace(/\D/g, '').slice(0, 19);
      number.value = (getBrand(digits) === 'Amex' ? digits.replace(/^(\d{4})(\d{0,6})(\d{0,5}).*/, '$1 $2 $3') : digits.replace(/(\d{4})(?=\d)/g, '$1 ')).trim();
      brandLabel.textContent = getBrand(digits);
      if (number.value.replace(/\D/g, '').length >= 15 && isCardNumberValid()) expiry.focus();
      updateGlow();
    });
    expiry.addEventListener('input', () => {
      const digits = expiry.value.replace(/\D/g, '').slice(0, 4);
      expiry.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
      if (digits.length === 4 && isExpiryValid()) cvc.focus();
      updateGlow();
    });
    cvc.addEventListener('input', () => {
      cvc.value = cvc.value.replace(/\D/g, '').slice(0, 4);
      updateGlow();
    });
    name.addEventListener('input', updateGlow);

    if (canHover && !prefersReducedMotion) {
      // Measured off the slot, which is never transformed: a rotated card's rect is its bounding box, not its size.
      slot.addEventListener('pointermove', (event) => {
        const rect = slot.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        tilt.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`);
        tilt.style.setProperty('--ry', `${(x * 12).toFixed(2)}deg`);
      });
      slot.addEventListener('pointerleave', () => {
        tilt.style.setProperty('--rx', '0deg');
        tilt.style.setProperty('--ry', '0deg');
      });
    }
  }

  function setUpPayTo() {
    bsb.addEventListener('input', () => {
      const digits = bsb.value.replace(/\D/g, '').slice(0, 6);
      bsb.value = digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
    });
    accountNumber.addEventListener('input', () => {
      accountNumber.value = accountNumber.value.replace(/\D/g, '').slice(0, 9);
    });
  }

  function updatePhone() {
    const max = toAmount(maximum.value);
    phone.querySelector('[data-phone-amount]').textContent = isEachTerm() ? (max ? TEXT.upTo(money.format(max)) : '—') : money.format(getTotal());
    phone.querySelector('[data-phone-often]').textContent = isEachTerm() ? TEXT.eachTerm : TEXT.once;
    phone.querySelector('[data-phone-until]').textContent = isEachTerm() ? endDate.selectedOptions[0].textContent : '—';
    const isPayId = getChoice('account').value === 'payid';
    const digits = accountNumber.value;
    phone.querySelector('[data-phone-from]').textContent = isPayId
      ? payId.value.trim() || '—'
      : bsb.value ? `${bsb.value} · ${digits ? `••${digits.slice(-3)}` : ''}` : '—';
    phoneGlow.classList.toggle('glow--ok', getPayToErrors().length === 0 && getTotal() > 0);
  }

  function flip(isBack) {
    card.classList.toggle('is-flipped', isBack);
  }

  function grow(isActive) {
    if (!isActive || prefersReducedMotion) {
      card.style.setProperty('--grow', 1);
      return;
    }
    const from = slot.getBoundingClientRect();
    const target = form.getBoundingClientRect();
    card.style.setProperty('--grow', clamp((target.width * 0.44) / from.width, 1, 1.34).toFixed(3));
  }

  function updateGlow() {
    const isComplete = isCardComplete();
    glow.classList.toggle('glow--ok', isComplete);
    if (isComplete) {
      glow.classList.remove('glow--error');
      cardError.textContent = '';
    }
  }

  function setUpSubmit() {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const errors = [
        [amount, amount.required ? (getTotal() > 0 ? '' : TEXT.amount) : ''],
        [student, student.value.trim().length > 1 ? '' : TEXT.required],
        [email, getEmailError()],
        [mobile, getMobileError()],
      ];
      const isPayTo = getChoice('method').value === 'payto';
      if (isPayTo) errors.push(...getPayToErrors(true));
      form.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.setAttribute('aria-invalid', 'false'));
      form.querySelectorAll('.payto .field__error').forEach((node) => { node.textContent = ''; });
      let firstInvalid = null;
      for (const [field, message] of errors) {
        const error = form.querySelector(`#${field.id}-error`);
        field.setAttribute('aria-invalid', String(Boolean(message)));
        if (error) error.textContent = message;
        if (message && !firstInvalid) firstInvalid = field;
      }
      if (!isPayTo && !isCardComplete()) {
        glow.classList.add('glow--error');
        cardError.textContent = TEXT.card;
        firstInvalid = firstInvalid || [number, name, expiry, cvc].find((field) => !isFieldComplete(field));
      }
      if (isPayTo) phoneGlow.classList.toggle('glow--error', Boolean(firstInvalid));
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }
      form.hidden = true;
      const done = form.parentElement.querySelector('.pay-done');
      done.hidden = false;
      done.focus();
      form.parentElement.querySelector('[data-pay-status]').textContent = TEXT.checked;
    });
  }

  // [field, message] pairs for the PayTo fields in view. With isAll false, only failing fields are returned.
  function getPayToErrors(isAll = false) {
    const isPayId = getChoice('account').value === 'payid';
    const checks = [[accountName, accountName.value.trim().length > 1 ? '' : TEXT.required]];
    if (isPayId) checks.push([payId, isPayIdValid(payId.value) ? '' : TEXT.payId]);
    else checks.push([bsb, /^\d{3}-\d{3}$/.test(bsb.value) ? '' : TEXT.bsb], [accountNumber, /^\d{5,9}$/.test(accountNumber.value) ? '' : TEXT.account]);
    if (isEachTerm()) checks.push([maximum, toAmount(maximum.value) ? '' : TEXT.maximum]);
    return isAll ? checks : checks.filter(([, message]) => message);
  }

  function isPayIdValid(value) {
    const compact = value.replace(/[\s()-]/g, '');
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim()) // email
      || /^(\+?61|0)4\d{8}$/.test(compact) // mobile
      || /^\d{11}$/.test(compact); // ABN
  }

  function getEmailError() {
    if (email.validity.valueMissing) return TEXT.required;
    if (email.validity.typeMismatch) return TEXT.email;
    return '';
  }

  function getMobileError() {
    if (mobile.validity.valueMissing) return TEXT.required;
    if (mobile.validity.patternMismatch) return TEXT.mobile;
    return '';
  }

  function getChoice(groupName) {
    return form.querySelector(`[name="${groupName}"]:checked`);
  }

  function isEachTerm() {
    return getChoice('method').value === 'payto' && getChoice('agreement').value === 'term';
  }

  function getTotal() {
    return toAmount(getChoice('item').dataset.price || amount.value);
  }

  function toAmount(text) {
    const value = Number(String(text).replace(/[^\d.]/g, ''));
    return Number.isFinite(value) && value > 0 && value < 100000 ? value : 0;
  }

  function isCardComplete() {
    return [number, name, expiry, cvc].every(isFieldComplete);
  }

  function isFieldComplete(field) {
    if (field === number) return isCardNumberValid();
    if (field === expiry) return isExpiryValid();
    if (field === cvc) return cvc.value.length === (getBrand(number.value.replace(/\D/g, '')) === 'Amex' ? 4 : 3);
    return field.value.trim().length > 1;
  }

  function isCardNumberValid() {
    const digits = number.value.replace(/\D/g, '');
    if (digits.length < 13) return false;
    // Luhn check: catches typos before the card ever leaves the page.
    let sum = 0;
    [...digits].reverse().forEach((digit, i) => {
      let value = Number(digit);
      if (i % 2) value = value * 2 > 9 ? value * 2 - 9 : value * 2;
      sum += value;
    });
    return sum % 10 === 0;
  }

  function isExpiryValid() {
    const [month, year] = expiry.value.split('/').map(Number);
    if (!month || month > 12 || !year || expiry.value.length !== 5) return false;
    const now = new Date();
    const lastDay = new Date(2000 + year, month, 0, 23, 59);
    return lastDay >= now && year < now.getFullYear() - 2000 + 20;
  }

  function getBrand(digits) {
    if (/^3[47]/.test(digits)) return 'Amex';
    if (/^4/.test(digits)) return 'Visa';
    if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
    return '';
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
})();

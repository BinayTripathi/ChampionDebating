/*
 * Payment page. This form collects what the centre needs and the API saves it, then Stripe's embedded Checkout
 * takes the card or PayTo details inside this page, in Stripe's own secure frame. Only Stripe's webhook marks a
 * payment paid, so the thank-you shown here records nothing. A payment method that must redirect comes back
 * with ?paid=1.
 */
(function () {
  const form = document.querySelector('[data-pay]');
  if (!form) return;

  const MIN_AMOUNT = 1;
  const MAX_AMOUNT = 5000;
  const isZh = document.documentElement.lang.startsWith('zh');
  const TEXT = isZh ? {
    required: '请填写此项。', email: '请输入有效的邮箱地址。', mobile: '请输入有效的手机号码。',
    amount: '请输入发票上的金额，范围为 $1 至 $5,000。', offline: '在线缴费暂未开通。',
    humanCheck: '请先完成人机验证。', failed: '无法继续付款，请重试。', paid: '谢谢！您的付款正在确认中。',
  } : {
    required: 'Please fill in this field.', email: 'Please enter a valid email address.',
    mobile: 'Please enter a valid mobile number.', amount: 'Enter the amount on your invoice, from $1 to $5,000.',
    offline: 'Online payments aren’t available yet.', humanCheck: 'Please complete the check that you’re not a robot.',
    failed: 'We couldn’t continue to payment. Please try again.', paid: 'Thank you. Your payment is being confirmed.',
  };
  const money = new Intl.NumberFormat(isZh ? 'zh-CN' : 'en-AU', { style: 'currency', currency: 'AUD' });

  const amount = form.querySelector('#pay-amount');
  const email = form.querySelector('#pay-email');
  const student = form.querySelector('#pay-student');
  const payer = form.querySelector('#pay-payer');
  const mobile = form.querySelector('#pay-mobile');
  const amountField = form.querySelector('[data-amount-field]');
  const total = form.querySelector('[data-total]');
  const submit = form.querySelector('[type="submit"]');
  const formError = form.querySelector('[data-form-error]');
  const done = form.parentElement.querySelector('.pay-done');
  const status = form.parentElement.querySelector('[data-pay-status]');
  const checkoutPanel = form.parentElement.querySelector('[data-checkout]');

  if (new URLSearchParams(location.search).has('paid')) {
    showPaid();
    return;
  }

  form.addEventListener('change', (event) => {
    if (event.target.name === 'item') update();
  });
  amount.addEventListener('input', update);
  update();

  if (!window.siteApi.isConfigured()) {
    submit.disabled = true;
    formError.textContent = TEXT.offline;
    return;
  }
  const humanCheck = window.siteApi.createHumanCheck(form.querySelector('[data-human-check]'));
  form.addEventListener('submit', handleSubmit);
  // A fresh submission makes a new Stripe session; the abandoned one expires and stays out of the CSV.
  checkoutPanel.querySelector('[data-change-details]').addEventListener('click', () => location.reload());

  function update() {
    const isFixedPrice = Boolean(getItem().dataset.price);
    amountField.hidden = isFixedPrice;
    amount.required = !isFixedPrice;
    total.textContent = money.format(getTotal());
  }

  async function handleSubmit(event) {
    event.preventDefault();
    formError.textContent = '';
    const errors = [
      [amount, amount.required && !getTotal() ? TEXT.amount : ''],
      [student, student.value.trim().length > 1 ? '' : TEXT.required],
      [payer, payer.value.trim().length > 1 ? '' : TEXT.required],
      [email, getEmailError()],
      [mobile, getMobileError()],
    ];
    errors.forEach(([field, message]) => {
      field.setAttribute('aria-invalid', String(Boolean(message)));
      form.querySelector(`#${field.id}-error`).textContent = message;
    });
    const firstInvalid = errors.find(([, message]) => message);
    if (firstInvalid) {
      firstInvalid[0].focus();
      return;
    }
    if (!humanCheck.getToken()) {
      formError.textContent = TEXT.humanCheck;
      return;
    }

    submit.disabled = true;
    try {
      const payment = await window.siteApi.post('/payments', {
        item: getItem().value,
        // The server charges its own price for a fixed item, so this figure only counts for term fees.
        amount: Math.round(getTotal() * 100),
        studentName: student.value.trim(),
        payerName: payer.value.trim(),
        payerEmail: email.value.trim(),
        payerMobile: mobile.value.trim(),
        turnstileToken: humanCheck.getToken(),
      });
      await showCheckout(payment);
    } catch {
      submit.disabled = false;
      humanCheck.reset();
      formError.textContent = TEXT.failed;
    }
  }

  async function showCheckout({ clientSecret, publishableKey, stripeAccountId }) {
    const stripe = window.Stripe(publishableKey, { stripeAccount: stripeAccountId });
    const checkout = await stripe.createEmbeddedCheckoutPage({
      fetchClientSecret: async () => clientSecret,
      onComplete: showPaid,
    });
    form.hidden = true;
    checkoutPanel.hidden = false;
    checkout.mount('#checkout');
    checkoutPanel.scrollIntoView();
  }

  function showPaid() {
    form.hidden = true;
    checkoutPanel.hidden = true;
    done.hidden = false;
    done.focus();
    status.textContent = TEXT.paid;
  }

  function getEmailError() {
    if (email.validity.valueMissing) return TEXT.required;
    return email.validity.typeMismatch ? TEXT.email : '';
  }

  function getMobileError() {
    if (mobile.validity.valueMissing) return TEXT.required;
    return mobile.validity.patternMismatch ? TEXT.mobile : '';
  }

  function getItem() {
    return form.querySelector('[name="item"]:checked');
  }

  function getTotal() {
    const value = Number(String(getItem().dataset.price || amount.value).replace(/[^\d.]/g, ''));
    return value >= MIN_AMOUNT && value <= MAX_AMOUNT ? value : 0;
  }
})();

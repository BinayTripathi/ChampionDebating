/*
 * Connects the site's forms to the AcadEasy Starter API. Set these after Starter is deployed:
 * - baseUrl: the stack's SiteUrl output, with no trailing slash. Empty keeps the forms switched off.
 * - turnstileSiteKey: Cloudflare Turnstile's public site key.
 * - centreSlug: the --slug given to add-centre.
 * All three are public, so no secret key ever belongs in this file.
 */
window.siteApi = (function () {
  //const SETTINGS = { baseUrl: '', turnstileSiteKey: '', centreSlug: 'champion-debating' };
  const SETTINGS = { baseUrl: 'https://hyjmjulmzl.execute-api.ap-southeast-2.amazonaws.com', turnstileSiteKey: '1x00000000000000000000AA', centreSlug: 'champion-debating' };
  const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

  function isConfigured() {
    return Boolean(SETTINGS.baseUrl && SETTINGS.turnstileSiteKey);
  }

  // The API refuses a public form without this token, so the widget loads only on pages that send one.
  function createHumanCheck(container) {
    let token = '';
    let widgetId = null;
    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT;
    script.async = true;
    script.onload = () => {
      widgetId = window.turnstile.render(container, {
        sitekey: SETTINGS.turnstileSiteKey,
        callback: (value) => { token = value; },
        'expired-callback': () => { token = ''; },
      });
    };
    document.head.appendChild(script);
    return {
      getToken: () => token,
      // A token works once, so a failed send needs a new one.
      reset: () => {
        token = '';
        if (widgetId !== null) window.turnstile.reset(widgetId);
      },
    };
  }

  async function post(path, body) {
    const response = await fetch(`${SETTINGS.baseUrl}/api/centres/${SETTINGS.centreSlug}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`The API refused the request (${response.status})`);
    return response.json();
  }

  return { isConfigured, createHumanCheck, post };
})();

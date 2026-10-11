(() => {
  try {
    const event = document.currentScript && document.currentScript.dataset.event;
    if (!['site_view', 'app_open'].includes(event)) return;
    const storageKey = 'kr-analytics-' + event;
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, '1');
    let source = 'direct';
    const campaign = new URLSearchParams(location.search).get('utm_source');
    if (campaign && /^[a-z0-9_-]{1,32}$/i.test(campaign)) source = campaign.toLowerCase();
    else if (document.referrer) {
      try { if (new URL(document.referrer).host !== location.host) source = 'referral'; } catch {}
    }
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, source }),
      keepalive: true
    }).catch(() => {});
  } catch {}
})();

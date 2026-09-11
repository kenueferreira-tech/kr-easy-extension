const crypto = require('node:crypto');

const CHECKOUT_API = 'https://api.checkout.infinitepay.io/links';
const HANDLE = 'kr_05';
const PRICE_CENTS = 4700;

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Método não permitido.' });
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return response.status(503).json({ error: 'O PIX está em configuração. Tente novamente em alguns minutos.' });
  }

  const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://kr-easy-extension.vercel.app').replace(/\/$/, '');
  const orderNsu = `kr-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const payload = {
    handle: HANDLE,
    order_nsu: orderNsu,
    redirect_url: `${siteUrl}/pagamento-concluido.html`,
    webhook_url: `${siteUrl}/api/infinitepay-webhook`,
    items: [{ quantity: 1, price: PRICE_CENTS, description: 'KR Easy Extension - Acesso vitalício' }]
  };

  try {
    const checkoutResponse = await fetch(CHECKOUT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000)
    });
    const result = await checkoutResponse.json().catch(() => ({}));
    if (!checkoutResponse.ok || !result.url) {
      console.error('InfinitePay checkout error', checkoutResponse.status, result);
      return response.status(502).json({ error: 'A InfinitePay não conseguiu gerar o checkout agora.' });
    }
    return response.status(200).json({ url: result.url });
  } catch (error) {
    console.error('InfinitePay checkout unavailable', error);
    return response.status(502).json({ error: 'Pagamento temporariamente indisponível. Tente novamente.' });
  }
};

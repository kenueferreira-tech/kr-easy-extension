const crypto = require('node:crypto');

const CHECKOUT_API = 'https://api.checkout.infinitepay.io/links';
const PRICE_CENTS = 4700;

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Método não permitido.' });
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON || !process.env.FIREBASE_DATABASE_URL || !process.env.INFINITEPAY_API_KEY) {
    return response.status(503).json({ error: 'O checkout está em configuração. Tente novamente mais tarde.' });
  }

  const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://kreasy.com.br').replace(/\/$/, '');
  const orderNsu = `kr-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const payload = {
    order_nsu: orderNsu,
    redirect_url: `${siteUrl}/pagamento-concluido.html`,
    webhook: { url: `${siteUrl}/api/infinitepay-webhook`, events: ['paid'] },
    items: [{ quantity: 1, price: PRICE_CENTS, description: 'KR Easy Extension - Acesso vitalício' }],
    options: { single_payment: true, valid_until: new Date(Date.now() + 7 * 86400000).toISOString() }
  };

  try {
    const checkoutResponse = await fetch(CHECKOUT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': process.env.INFINITEPAY_API_KEY },
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

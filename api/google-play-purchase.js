const { confirmPlayPurchase } = require('../server/google-play-purchase');

module.exports = async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ paid: false, error: 'Método não permitido.' });
  }

  try {
    const result = await confirmPlayPurchase(request.body || {});
    return response.status(200).json({ paid: true, ...result });
  } catch (error) {
    if (!['BILLING_SETUP', 'INVALID_PRODUCT', 'INVALID_PURCHASE_TOKEN', 'PURCHASE_NOT_CONFIRMED'].includes(error.code)) {
      console.error('Google Play purchase verification failed:', error.code || error.name || 'UNKNOWN');
    }
    return response.status(error.status || 502).json({
      paid: false,
      error: error.message || 'Não foi possível confirmar a compra.'
    });
  }
};

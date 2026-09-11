const { confirmPayment } = require('../server/payment');

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).end();
  try {
    const body = request.body || {};
    await confirmPayment({ ...body, slug: body.slug || body.invoice_slug });
    return response.status(200).json({ received: true });
  } catch (error) {
    console.error('InfinitePay webhook rejected', error);
    return response.status(400).json({ received: false });
  }
};

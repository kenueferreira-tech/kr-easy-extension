const { confirmPayment } = require('../server/payment');

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Método não permitido.' });
  }
  try {
    const result = await confirmPayment(request.body || {});
    return response.status(200).json({ paid: true, ...result });
  } catch (error) {
    return response.status(400).json({ paid: false, error: error.message || 'Pagamento não confirmado.' });
  }
};

'use strict';

const { requireAdmin } = require('../../server/admin');
const { listRefundRequests, updateRefundRequest } = require('../../server/refunds');

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (!await requireAdmin(request, response)) return;
  try {
    if (request.method === 'GET') return response.status(200).json({ requests: await listRefundRequests() });
    if (request.method === 'PATCH') {
      const body = request.body || {};
      const result = await updateRefundRequest(String(body.id || ''), String(body.status || ''));
      return response.status(200).json(result);
    }
    response.setHeader('Allow', 'GET, PATCH');
    return response.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    return response.status(400).json({ error: error.message || 'Não foi possível atualizar o pedido.' });
  }
};

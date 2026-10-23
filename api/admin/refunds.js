'use strict';

const { requireAdmin } = require('../../server/admin');
const { listRefundRequests, updateRefundRequest } = require('../../server/refunds');
const { listSupportRequests, updateSupportRequest } = require('../../server/support');

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (!await requireAdmin(request, response)) return;
  try {
    const support = request.query && request.query.type === 'support';
    if (request.method === 'GET') return response.status(200).json({ requests: await (support ? listSupportRequests() : listRefundRequests()) });
    if (request.method === 'PATCH') {
      const body = request.body || {};
      const update = support ? updateSupportRequest : updateRefundRequest;
      const result = await update(String(body.id || ''), String(body.status || ''));
      return response.status(200).json(result);
    }
    response.setHeader('Allow', 'GET, PATCH');
    return response.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    return response.status(400).json({ error: error.message || 'Não foi possível atualizar o pedido.' });
  }
};

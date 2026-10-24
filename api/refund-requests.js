'use strict';

const { createRefundRequest } = require('../server/refunds');
const { createSupportRequest } = require('../server/support');

function sameOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'https:' && parsed.host.toLowerCase() === host.toLowerCase();
  } catch { return false; }
}

module.exports = async (request, response) => {
  if (process.env.VERCEL_ENV === 'preview') return response.status(403).json({ error: 'Envio de solicitações está desativado na prévia.' });

  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Método não permitido.' });
  }
  if (!sameOrigin(request)) return response.status(403).json({ error: 'Origem da solicitação inválida.' });
  const body = request.body || {};
  if (typeof body.website === 'string' && body.website.trim()) return response.status(200).json({ ok: true });
  try {
    const result = body.requestType === 'support'
      ? await createSupportRequest(body)
      : await createRefundRequest(body);
    return response.status(201).json({ ok: true, ...result });
  } catch (error) {
    const expected = /Confira|Informe|Selecione|Conte|Não encontrei/.test(error.message || '');
    return response.status(expected ? 400 : 500).json({
      error: expected ? error.message : 'Não foi possível registrar o pedido agora. Tente novamente ou fale com o suporte.'
    });
  }
};

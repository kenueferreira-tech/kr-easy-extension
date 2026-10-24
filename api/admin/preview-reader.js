'use strict';

const crypto = require('node:crypto');
const { database, readDashboard } = require('../../server/admin');

function authorized(request) {
  const expected = Buffer.from(String(process.env.KR_PREVIEW_READ_TOKEN || ''));
  const authorization = String(request.headers.authorization || '');
  const supplied = Buffer.from(authorization.replace(/^Bearer\s+/i, ''));
  return expected.length >= 40 && supplied.length === expected.length && crypto.timingSafeEqual(expected, supplied);
}

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (process.env.VERCEL_ENV !== 'production') return response.status(404).json({ error: 'Não encontrado.' });
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Método não permitido.' });
  }
  if (!authorized(request)) return response.status(401).json({ error: 'Não autorizado.' });

  const type = String(request.query && request.query.type || '');
  try {
    if (type === 'dashboard') return response.status(200).json(await readDashboard());
    if (type === 'refunds' || type === 'support') {
      const path = type === 'support' ? 'supportRequests' : 'refundRequests';
      const limit = type === 'support' ? 200 : 100;
      const snapshot = await database().ref(path).orderByChild('createdAt').limitToLast(limit).once('value');
      const records = snapshot.val() || {};
      const requests = Object.entries(records).map(([id, item]) => ({ id, ...item })).reverse();
      return response.status(200).json({ requests });
    }
    return response.status(400).json({ error: 'Consulta inválida.' });
  } catch {
    return response.status(503).json({ error: 'Não foi possível consultar os dados.' });
  }
};

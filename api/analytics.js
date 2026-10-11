const { database } = require('../server/admin');

const allowedEvents = new Set(['site_view', 'app_open']);
const allowedSource = value => /^[a-z0-9_-]{1,32}$/.test(String(value || '')) ? String(value) : 'direct';

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') return response.status(405).json({ error: 'Método não permitido.' });
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (!origin || !host) return response.status(403).json({ error: 'Origem inválida.' });
  try {
    const parsed = new URL(origin);
    const allowedHosts = new Set([host.toLowerCase(), 'kreasy.com.br', 'www.kreasy.com.br']);
    if (parsed.protocol !== 'https:' || !allowedHosts.has(parsed.host.toLowerCase())) return response.status(403).json({ error: 'Origem inválida.' });
  } catch { return response.status(403).json({ error: 'Origem inválida.' }); }
  const body = request.body || {};
  if (!allowedEvents.has(body.event)) return response.status(400).json({ error: 'Evento inválido.' });
  const day = new Date().toISOString().slice(0, 10);
  const event = body.event;
  const source = allowedSource(body.source);
  try {
    const db = database();
    await Promise.all([
      db.ref('analytics/daily/' + day + '/' + event).transaction(value => Number(value || 0) + 1),
      event === 'site_view'
        ? db.ref('analytics/daily/' + day + '/sources/' + source).transaction(value => Number(value || 0) + 1)
        : Promise.resolve()
    ]);
    return response.status(204).end();
  } catch {
    return response.status(503).json({ error: 'Métrica indisponível.' });
  }
};

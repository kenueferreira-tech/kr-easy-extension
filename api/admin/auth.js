const { sameOrigin, safeEqual, authenticated, setSession, clearSession } = require('../../server/admin');

const attempts = new Map();
function clientKey(request) {
  return String(request.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim().slice(0, 64);
}

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Vary', 'Cookie, Origin');
  if (request.method === 'GET') return response.status(200).json({ authenticated: authenticated(request) });
  if (!sameOrigin(request)) return response.status(403).json({ ok: false, error: 'Origem da solicitação inválida.' });
  if (request.method === 'DELETE') {
    clearSession(response);
    return response.status(200).json({ ok: true });
  }
  if (request.method !== 'POST') return response.status(405).json({ error: 'Método não permitido.' });
  const key = clientKey(request);
  const now = Date.now();
  const previous = attempts.get(key) || { count: 0, resetAt: now + 60000 };
  if (now > previous.resetAt) { previous.count = 0; previous.resetAt = now + 60000; }
  previous.count++;
  attempts.set(key, previous);
  if (previous.count > 8) return response.status(429).json({ error: 'Muitas tentativas. Aguarde um minuto e tente novamente.' });
  const expected = process.env.KR_ADMIN_PASSWORD;
  const supplied = request.body && request.body.password;
  if (!expected || typeof supplied !== 'string' || !safeEqual(supplied, expected)) {
    return response.status(401).json({ error: 'Senha administrativa incorreta.' });
  }
  attempts.delete(key);
  setSession(response);
  return response.status(200).json({ ok: true });
};

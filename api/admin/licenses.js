const { requireAdmin, createOwnerLicense } = require('../../server/admin');

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') return response.status(405).json({ error: 'Método não permitido.' });
  if (!await requireAdmin(request, response)) return;
  try {
    const result = await createOwnerLicense({ kind: request.body && request.body.kind, note: request.body && request.body.note });
    return response.status(201).json({ ok: true, ...result });
  } catch (error) {
    return response.status(400).json({ ok: false, error: error.message || 'Não foi possível gerar a licença.' });
  }
};

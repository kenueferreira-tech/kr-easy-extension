const { requireAdmin, createOwnerLicense, revokeLicense } = require('../../server/admin');

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (!['POST', 'DELETE'].includes(request.method)) { response.setHeader('Allow', 'POST, DELETE'); return response.status(405).json({ error: 'Método não permitido.' }); }
  if (!await requireAdmin(request, response)) return;
  if (process.env.VERCEL_ENV === 'preview') {
    return response.status(403).json({ ok: false, error: 'A prévia está isolada e não permite criar ou revogar licenças.' });
  }
  try {
    if (request.method === 'DELETE') {
      const result = await revokeLicense(request.body && request.body.key);
      return response.status(200).json(result);
    }
    const result = await createOwnerLicense({ kind: request.body && request.body.kind, note: request.body && request.body.note });
    return response.status(201).json({ ok: true, ...result });
  } catch (error) {
    return response.status(400).json({ ok: false, error: error.message || 'Não foi possível gerar a licença.' });
  }
};

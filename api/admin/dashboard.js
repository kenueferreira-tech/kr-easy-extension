const { requireAdmin, readDashboard } = require('../../server/admin');

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') return response.status(405).json({ error: 'Método não permitido.' });
  if (!await requireAdmin(request, response)) return;
  if (process.env.VERCEL_ENV === 'preview') {
    return response.status(200).json({
      previewMode: true,
      totals: { purchases: 0, revenueCents: 0, ownerGrants: 0, visits30d: 0 },
      days: [],
      campaigns: []
    });
  }
  try {
    return response.status(200).json(await readDashboard());
  } catch (error) {
    return response.status(500).json({ error: error.message || 'Não foi possível carregar o painel.' });
  }
};

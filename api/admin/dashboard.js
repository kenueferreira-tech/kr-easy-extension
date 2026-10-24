const { requireAdmin, readDashboard } = require('../../server/admin');
const { readProductionAdmin } = require('../../server/preview-read-only');

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') return response.status(405).json({ error: 'Método não permitido.' });
  if (!await requireAdmin(request, response)) return;
  try {
    if (process.env.VERCEL_ENV === 'preview') {
      const dashboard = await readProductionAdmin('dashboard');
      return response.status(200).json({ ...dashboard, previewMode: true });
    }
    return response.status(200).json(await readDashboard());
  } catch (error) {
    return response.status(500).json({ error: error.message || 'Não foi possível carregar o painel.' });
  }
};

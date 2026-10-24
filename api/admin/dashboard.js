const { requireAdmin, readDashboard } = require('../../server/admin');

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') return response.status(405).json({ error: 'Método não permitido.' });
  if (!await requireAdmin(request, response)) return;
  try {
    const dashboard = await readDashboard();
    return response.status(200).json({ ...dashboard, previewMode: process.env.VERCEL_ENV === 'preview' });
  } catch (error) {
    return response.status(500).json({ error: error.message || 'Não foi possível carregar o painel.' });
  }
};

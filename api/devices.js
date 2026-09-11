const { registerDevice, listDevices, removeDevice, MAX_DEVICES } = require('../server/devices');

module.exports = async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Cache-Control', 'no-store');
  if (request.method === 'OPTIONS') return response.status(204).end();
  if (request.method !== 'POST') return response.status(405).json({ error: 'Método não permitido.' });
  try {
    const body = request.body || {};
    let devices;
    if (body.action === 'register') devices = await registerDevice(body);
    else if (body.action === 'remove') devices = await removeDevice(body);
    else if (body.action === 'list') devices = await listDevices(body.key);
    else return response.status(400).json({ error: 'Ação inválida.' });
    return response.status(200).json({ ok: true, maxDevices: MAX_DEVICES, devices });
  } catch (error) {
    return response.status(error.code === 'DEVICE_LIMIT' ? 409 : 400).json({ ok: false, code: error.code || 'DEVICE_ERROR', error: error.message || 'Não foi possível gerenciar os dispositivos.' });
  }
};

const crypto = require('node:crypto');
const admin = require('firebase-admin');

function getDatabase() {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
  }
  return admin.database();
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const license = String((request.body && request.body.license) || '')
      .trim().toUpperCase().replace(/\s+/g, '');
    if (license.length < 8 || license.length > 80) {
      return response.status(400).json({ error: 'Informe uma chave de licença válida.' });
    }

    const licenseHash = crypto.createHash('sha256').update(license).digest('hex');
    const snapshot = await getDatabase().ref('licenses/' + licenseHash).once('value');
    const record = snapshot.val();
    const active = record && (record.status === 'ativa' || record.active === true);
    const expiration = record && record.expiresAt ? new Date(record.expiresAt).getTime() : null;

    if (!active || (expiration && (!Number.isFinite(expiration) || Date.now() > expiration))) {
      return response.status(403).json({ error: 'Licença inválida ou inativa.' });
    }

    const encodedArchive = process.env.KR_EASY_EXTENSION_ZIP_BASE64;
    if (!encodedArchive) {
      return response.status(503).json({ error: 'O pacote de instalação está temporariamente indisponível.' });
    }

    const archive = Buffer.from(encodedArchive.replace(/\s+/g, ''), 'base64');
    if (archive.length < 4 || archive[0] !== 0x50 || archive[1] !== 0x4b) {
      return response.status(503).json({ error: 'O pacote de instalação está temporariamente indisponível.' });
    }

    response.setHeader('Content-Type', 'application/zip');
    response.setHeader('Content-Disposition', 'attachment; filename="KR-Easy-Extension.zip"');
    response.setHeader('Content-Length', String(archive.length));
    response.setHeader('Cache-Control', 'private, no-store, max-age=0');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return response.status(200).send(archive);
  } catch (error) {
    console.error('Falha ao liberar pacote KR Easy:', error.message);
    return response.status(500).json({ error: 'Não foi possível validar a licença agora.' });
  }
};
const crypto = require('node:crypto');
const admin = require('firebase-admin');

const MAX_DEVICES = 2;

function database() {
  if (!admin.apps.length) {
    const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({ credential: admin.credential.cert(credentials), databaseURL: process.env.FIREBASE_DATABASE_URL });
  }
  return admin.database();
}

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const clean = (value, max = 80) => String(value || '').replace(/[<>]/g, '').trim().slice(0, max);

async function licenseRef(key) {
  const normalized = clean(key).toUpperCase().replace(/\s+/g, '');
  if (!/^KREASY-[A-Z0-9-]{8,40}$/.test(normalized)) throw new Error('Chave de licença inválida.');
  const ref = database().ref(`licenses/${hash(normalized)}`);
  const snapshot = await ref.get();
  const license = snapshot.val();
  if (!license || (license.status !== 'ativa' && license.active !== true)) throw new Error('Licença inativa ou não encontrada.');
  if (license.expiresAt && Date.now() > new Date(license.expiresAt).getTime()) throw new Error('Esta licença expirou.');
  return ref;
}

async function registerDevice({ key, deviceId, name, type }) {
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(String(deviceId || ''))) throw new Error('Identificação do dispositivo inválida.');
  const ref = await licenseRef(key);
  let limitReached = false;
  const now = new Date().toISOString();
  await ref.transaction(current => {
    if (!current) return current;
    const devices = current.devices || {};
    if (!devices[deviceId] && Object.keys(devices).length >= MAX_DEVICES) { limitReached = true; return; }
    devices[deviceId] = { id: deviceId, name: clean(name) || 'Dispositivo', type: clean(type, 20) || 'outro', createdAt: devices[deviceId]?.createdAt || now, lastSeenAt: now };
    return { ...current, devices };
  });
  if (limitReached) { const error = new Error('Limite de 2 dispositivos atingido. Desvincule um aparelho para continuar.'); error.code = 'DEVICE_LIMIT'; throw error; }
  return listDevices(key);
}

async function listDevices(key) {
  const ref = await licenseRef(key);
  const devices = (await ref.child('devices').get()).val() || {};
  return Object.values(devices).sort((a, b) => String(b.lastSeenAt).localeCompare(String(a.lastSeenAt)));
}

async function removeDevice({ key, deviceId }) {
  const ref = await licenseRef(key);
  await ref.child(`devices/${deviceId}`).remove();
  return listDevices(key);
}

module.exports = { registerDevice, listDevices, removeDevice, MAX_DEVICES };

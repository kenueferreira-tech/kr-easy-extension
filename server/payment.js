const crypto = require('node:crypto');
const admin = require('firebase-admin');

const HANDLE = 'kr_05';
const PRICE_CENTS = 4700;
const PAYMENT_CHECK_API = 'https://api.checkout.infinitepay.io/payment_check';

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

function createLicense(transactionNsu) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const digest = crypto.createHmac('sha256', serviceAccount.private_key).update(transactionNsu).digest('hex').toUpperCase();
  return `KREASY-${digest.slice(0, 4)}-${digest.slice(4, 8)}-${digest.slice(8, 12)}`;
}

async function confirmPayment(data) {
  const fields = ['order_nsu', 'transaction_nsu', 'slug'];
  if (!fields.every(field => typeof data[field] === 'string' && data[field].length > 0)) throw new Error('Dados do pagamento incompletos.');
  if (!data.order_nsu.startsWith('kr-')) throw new Error('Pedido inválido.');

  const checkResponse = await fetch(PAYMENT_CHECK_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle: HANDLE, order_nsu: data.order_nsu, transaction_nsu: data.transaction_nsu, slug: data.slug }),
    signal: AbortSignal.timeout(12000)
  });
  const check = await checkResponse.json().catch(() => ({}));
  if (!checkResponse.ok || check.success !== true || check.paid !== true || check.amount !== PRICE_CENTS) throw new Error('Pagamento ainda não confirmado.');

  const license = createLicense(data.transaction_nsu);
  const licenseHash = crypto.createHash('sha256').update(license).digest('hex');
  const database = getDatabase();
  await database.ref(`licenses/${licenseHash}`).set({
    status: 'ativa', plan: 'vitalicio', createdAt: new Date().toISOString(),
    orderNsu: data.order_nsu, transactionNsu: data.transaction_nsu,
    captureMethod: check.capture_method || data.capture_method || 'unknown'
  });
  return { license, captureMethod: check.capture_method || data.capture_method || 'unknown' };
}

module.exports = { confirmPayment };

const crypto = require('node:crypto');
const admin = require('firebase-admin');

const PACKAGE_NAME = 'com.kenueferreira.kreasyextension';
const PRODUCT_ID = 'kr_easy_access_lifetime';
const PUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const PUBLISHER_URL = 'https://androidpublisher.googleapis.com/androidpublisher/v3';

function fail(code, status, message) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function readJsonEnv(name, fallbackName = null) {
  try {
    const value = process.env[name] || (fallbackName ? process.env[fallbackName] : null);
    if (!value) throw new Error('missing');
    return JSON.parse(value);
  } catch {
    throw fail('BILLING_SETUP', 503, 'A compra pelo Google Play ainda está sendo configurada.');
  }
}

function database() {
  if (!admin.apps.length) {
    const firebaseCredentials = readJsonEnv('FIREBASE_SERVICE_ACCOUNT_JSON');
    const databaseURL = process.env.FIREBASE_DATABASE_URL;
    if (!databaseURL) throw fail('BILLING_SETUP', 503, 'A compra pelo Google Play ainda está sendo configurada.');
    admin.initializeApp({
      credential: admin.credential.cert(firebaseCredentials),
      databaseURL
    });
  }
  return admin.database();
}

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function createLicenseKey(purchaseToken, firebaseCredentials) {
  if (!firebaseCredentials.private_key) throw fail('BILLING_SETUP', 503, 'A compra pelo Google Play ainda está sendo configurada.');
  const digest = crypto.createHmac('sha256', firebaseCredentials.private_key)
    .update(`google-play:${purchaseToken}`)
    .digest('hex')
    .toUpperCase();
  return `KREASY-${digest.slice(0, 4)}-${digest.slice(4, 8)}-${digest.slice(8, 12)}`;
}

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

async function getPublisherAccessToken() {
  const credentials = readJsonEnv('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', 'FIREBASE_SERVICE_ACCOUNT_JSON');
  if (!credentials.client_email || !credentials.private_key) {
    throw fail('BILLING_SETUP', 503, 'A compra pelo Google Play ainda está sendo configurada.');
  }
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(JSON.stringify({
    iss: credentials.client_email,
    scope: PUBLISHER_SCOPE,
    aud: TOKEN_URL,
    iat: issuedAt,
    exp: issuedAt + 3600
  }));
  const unsigned = `${header}.${claims}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), credentials.private_key).toString('base64url');
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    }),
    signal: AbortSignal.timeout(12000)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) {
    throw fail('PLAY_AUTH_FAILED', 502, 'Não foi possível validar a compra com o Google Play.');
  }
  return result.access_token;
}

async function getPurchase(accessToken, productId, purchaseToken, serviceAccountEmail) {
  const url = `${PUBLISHER_URL}/applications/${PACKAGE_NAME}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(12000)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const apiError = result && typeof result.error === 'object' ? result.error : {};
    const apiReason = Array.isArray(apiError.errors) && apiError.errors[0] && apiError.errors[0].reason
      ? String(apiError.errors[0].reason).slice(0, 120)
      : '';
    console.error('Google Play Publisher API rejected purchase lookup', {
      status: response.status,
      statusText: response.statusText,
      reason: apiReason,
      serviceAccount: serviceAccountEmail || ''
    });
    throw fail('PLAY_VERIFICATION_FAILED', 502, 'O Google Play ainda não confirmou esta compra. Tente restaurá-la em instantes.');
  }
  if (Number(result.purchaseState) !== 0) {
    throw fail('PURCHASE_NOT_CONFIRMED', 409, 'O Google Play ainda não confirmou esta compra.');
  }
  return result;
}

async function acknowledgePurchase(accessToken, productId, purchaseToken) {
  const url = `${PUBLISHER_URL}/applications/${PACKAGE_NAME}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) {
    throw fail('PLAY_ACKNOWLEDGE_FAILED', 502, 'A compra foi verificada, mas a ativação está sendo finalizada. Toque em Restaurar compra para tentar novamente.');
  }
}

async function confirmPlayPurchase({ productId, purchaseToken }) {
  if (productId !== PRODUCT_ID) throw fail('INVALID_PRODUCT', 400, 'Produto de compra inválido.');
  if (typeof purchaseToken !== 'string' || purchaseToken.length < 10 || purchaseToken.length > 4096) {
    throw fail('INVALID_PURCHASE_TOKEN', 400, 'Comprovante de compra inválido.');
  }

  const firebaseCredentials = readJsonEnv('FIREBASE_SERVICE_ACCOUNT_JSON');
  const accessToken = await getPublisherAccessToken();
  const purchase = await getPurchase(accessToken, PRODUCT_ID, purchaseToken, readJsonEnv('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', 'FIREBASE_SERVICE_ACCOUNT_JSON').client_email);
  const license = createLicenseKey(purchaseToken, firebaseCredentials);
  const licenseHash = sha256(license);
  const tokenHash = sha256(purchaseToken);
  const now = new Date().toISOString();
  const db = database();

  const purchaseRef = db.ref(`playPurchases/${tokenHash}`);
  const mappingResult = await purchaseRef.transaction(current => current || {
    productId: PRODUCT_ID,
    licenseHash,
    orderId: String(purchase.orderId || '').slice(0, 160),
    purchasedAt: purchase.purchaseTimeMillis ? new Date(Number(purchase.purchaseTimeMillis)).toISOString() : now,
    createdAt: now
  });
  const mapping = mappingResult.snapshot.val();
  if (!mapping || mapping.licenseHash !== licenseHash) {
    throw fail('PURCHASE_MAPPING_CONFLICT', 409, 'Esta compra já está vinculada a outra licença. Fale com o suporte.');
  }

  await db.ref(`licenses/${licenseHash}`).transaction(current => current || {
    status: 'ativa',
    plan: 'basico',
    access: 'vitalicio',
    deviceLimit: 2,
    createdAt: now,
    orderNsu: String(purchase.orderId || tokenHash),
    captureMethod: 'google_play',
    purchaseProvider: 'google_play',
    purchaseTokenHash: tokenHash
  });

  if (Number(purchase.acknowledgementState) !== 1) {
    await acknowledgePurchase(accessToken, PRODUCT_ID, purchaseToken);
  }
  return { license, productId: PRODUCT_ID };
}

module.exports = { confirmPlayPurchase, PRODUCT_ID };

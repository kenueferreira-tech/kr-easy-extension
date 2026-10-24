const crypto = require('node:crypto');
const admin = require('firebase-admin');

const COOKIE = '__Host-kr_admin';
const SESSION_SECONDS = 12 * 60 * 60;

function database() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON || !process.env.FIREBASE_DATABASE_URL) {
    throw new Error('Firebase não está configurado no servidor.');
  }
  if (!admin.apps.length) {
    const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({ credential: admin.credential.cert(credentials), databaseURL: process.env.FIREBASE_DATABASE_URL });
  }
  return admin.database();
}

function secret(name) {
  const value = process.env[name];
  if (!value) throw new Error('Configure as variáveis administrativas no Vercel.');
  return value;
}

function signature(expiry) {
  return crypto.createHmac('sha256', secret('KR_ADMIN_SESSION_SECRET')).update(expiry).digest('base64url');
}

function cookieValue(request) {
  const cookies = String(request.headers.cookie || '').split(';');
  const item = cookies.map(part => part.trim()).find(part => part.startsWith(COOKIE + '='));
  return item ? decodeURIComponent(item.slice(COOKIE.length + 1)) : '';
}

function authenticated(request) {
  try {
    const [expiry, supplied] = cookieValue(request).split('.');
    if (!expiry || !supplied || !/^\d{10,}$/.test(expiry) || Number(expiry) < Math.floor(Date.now() / 1000)) return false;
    const expected = Buffer.from(signature(expiry));
    const actual = Buffer.from(supplied);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch { return false; }
}

function setSession(response) {
  const expiry = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const token = expiry + '.' + signature(expiry);
  response.setHeader('Set-Cookie', COOKIE + '=' + encodeURIComponent(token) + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=' + SESSION_SECONDS);
}

function clearSession(response) {
  response.setHeader('Set-Cookie', COOKIE + '=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
}

function sameOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'https:' && parsed.host.toLowerCase() === host.toLowerCase();
  } catch { return false; }
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

async function requireAdmin(request, response) {
  if (!authenticated(request)) {
    response.status(401).json({ ok: false, error: 'Entre na área administrativa novamente.' });
    return false;
  }
  if (request.method !== 'GET' && !sameOrigin(request)) {
    response.status(403).json({ ok: false, error: 'Origem da solicitação inválida.' });
    return false;
  }
  return true;
}

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newKey() {
  const bytes = crypto.randomBytes(12);
  const chars = [...bytes].map(byte => alphabet[byte % alphabet.length]);
  return 'KREASY-' + chars.slice(0, 4).join('') + '-' + chars.slice(4, 8).join('') + '-' + chars.slice(8, 12).join('');
}

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

async function createOwnerLicense({ kind, note }) {
  if (!['owner', 'review', 'courtesy'].includes(kind)) throw new Error('Escolha o tipo de licença.');
  const db = database();
  for (let attempt = 0; attempt < 5; attempt++) {
    const key = newKey();
    const hash = sha256(key);
    const createdAt = new Date();
    const expiresAt = kind === 'review' ? new Date(createdAt.getTime() + 30 * 86400000).toISOString() : null;
    const record = {
      status: 'ativa',
      plan: kind === 'review' ? 'avaliacao' : 'vitalicio',
      access: expiresAt ? 'temporario' : 'vitalicio',
      deviceLimit: 2,
      createdAt: createdAt.toISOString(),
      expiresAt,
      grantType: kind,
      grantSource: 'owner_admin',
      note: String(note || '').trim().slice(0, 120) || null
    };
    const result = await db.ref('licenses/' + hash).transaction(current => current === null ? record : undefined);
    if (result.committed) return { key, expiresAt, grantType: kind };
  }
  throw new Error('Não consegui reservar uma chave única. Tente novamente.');
}

async function revokeLicense(key) {
  const normalizedKey = String(key || '').trim().toUpperCase().replace(/\\s+/g, '');
  if (normalizedKey.length < 8 || normalizedKey.length > 80) throw new Error('Digite a chave completa da licença.');
  const hash = sha256(normalizedKey);
  const ref = database().ref('licenses/' + hash);
  const revokedAt = new Date().toISOString();
  const result = await ref.transaction(current => {
    if (!current) return;
    if (current.status === 'inativa') return current;
    return { ...current, status: 'inativa', active: false, revokedAt, revokedBy: 'owner_admin' };
  });
  if (!result.committed || !result.snapshot.exists()) throw new Error('Não encontrei uma licença com essa chave.');
  return { ok: true, alreadyInactive: result.snapshot.val().revokedAt !== revokedAt };
}


async function readDashboard() {
  const db = database();
  const [licensesSnap, analyticsSnap] = await Promise.all([
    db.ref('licenses').get(),
    db.ref('analytics/daily').get()
  ]);
  const licenses = licensesSnap.val() || {};
  const paid = [];
  let ownerGrants = 0;
  for (const license of Object.values(licenses)) {
    if (!license || typeof license !== 'object') continue;
    if (license.transactionNsu && license.orderNsu) paid.push(license);
    else if (license.grantSource === 'owner_admin') ownerGrants++;
  }
  const raw = analyticsSnap.val() || {};
  const days = [];
  const purchasesByDay = Object.create(null);
  for (const license of paid) {
    const day = String(license.createdAt || '').slice(0, 10);
    if (day) purchasesByDay[day] = (purchasesByDay[day] || 0) + 1;
  }
  for (let offset = 13; offset >= 0; offset--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - offset);
    const key = d.toISOString().slice(0, 10);
    const data = raw[key] || {};
    days.push({
      date: key,
      visits: Number(data.site_view || 0),
      purchases: purchasesByDay[key] || 0
    });
  }
  const campaigns = Object.create(null);
  for (const [date, values] of Object.entries(raw)) {
    if (Date.now() - Date.parse(date + 'T00:00:00Z') > 30 * 86400000) continue;
    for (const [source, count] of Object.entries(values && values.sources || {})) {
      campaigns[source] = (campaigns[source] || 0) + Number(count || 0);
    }
  }
  const totalPurchases = paid.length;
  return {
    totals: {
      purchases: totalPurchases,
      revenueCents: totalPurchases * 4700,
      ownerGrants,
      visits30d: Object.entries(raw).filter(([date]) => Date.now() - Date.parse(date + 'T00:00:00Z') <= 30 * 86400000).reduce((sum, [, value]) => sum + Number(value && value.site_view || 0), 0),
    },
    days,
    campaigns: Object.entries(campaigns).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([source, count]) => ({ source, count }))
  };
}

module.exports = { database, sameOrigin, safeEqual, authenticated, setSession, clearSession, requireAdmin, createOwnerLicense, revokeLicense, readDashboard };

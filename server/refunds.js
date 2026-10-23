'use strict';

const crypto = require('node:crypto');
const admin = require('firebase-admin');

const REASONS = new Set(['compra_acidental', 'nao_funcionou', 'nao_era_o_esperado', 'outro']);
const TRANSITIONS = {
  recebido: new Set(['em_analise', 'negado']),
  em_analise: new Set(['aprovado', 'negado']),
  aprovado: new Set(['estorno_solicitado', 'negado']),
  estorno_solicitado: new Set(['reembolsado']),
  negado: new Set(['em_analise']),
  reembolsado: new Set([])
};

function database() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON || !process.env.FIREBASE_DATABASE_URL) {
    throw new Error('Firebase não está configurado no servidor.');
  }
  if (!admin.apps.length) {
    const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
  }
  return admin.database();
}

function cleanText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function requestKey(reference) {
  return crypto.createHash('sha256').update(reference).digest('hex').slice(0, 32);
}

async function findPurchase(referenceType, reference) {
  const field = referenceType === 'order' ? 'orderNsu' : 'transactionNsu';
  const snapshot = await database().ref('licenses').orderByChild(field).equalTo(reference).limitToFirst(2).once('value');
  const found = snapshot.val();
  if (!found) return null;
  const entries = Object.entries(found);
  if (entries.length !== 1) return null;
  return { licenseHash: entries[0][0], license: entries[0][1] };
}

async function createRefundRequest(input) {
  const referenceType = input.referenceType === 'transaction' ? 'transaction' : 'order';
  const reference = cleanText(input.purchaseReference, 120);
  const email = cleanText(input.email, 180).toLowerCase();
  const reason = cleanText(input.reason, 50);
  const details = cleanText(input.details, 1600);

  if (referenceType === 'order' && !/^kr-\d{13}-[a-f0-9]{12}$/i.test(reference)) {
    throw new Error('Confira o identificador do pedido. Ele começa com KR-.');
  }
  if (referenceType === 'transaction' && !/^[a-z0-9_-]{8,120}$/i.test(reference)) {
    throw new Error('Confira o identificador da transação.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Informe um e-mail válido.');
  if (!REASONS.has(reason)) throw new Error('Selecione o motivo do pedido.');
  if (details.length < 10) throw new Error('Conte um pouco mais sobre o que aconteceu (mínimo de 10 caracteres).');

  const purchase = await findPurchase(referenceType, reference);
  if (!purchase || !purchase.license || purchase.license.status === 'inativa') {
    throw new Error('Não encontrei uma compra ativa com esses dados. Confira o identificador ou fale com o suporte.');
  }

  const db = database();
  const id = requestKey(referenceType + ':' + reference);
  const ref = db.ref('refundRequests/' + id);
  const existing = await ref.once('value');
  if (existing.exists()) {
    return { ticket: 'KR-' + id.slice(0, 8).toUpperCase(), status: existing.val().status, existing: true };
  }

  const now = new Date().toISOString();
  const record = {
    email,
    referenceType,
    purchaseReference: reference,
    licenseHash: purchase.licenseHash,
    reason,
    details,
    status: 'recebido',
    createdAt: now,
    updatedAt: now
  };
  const result = await ref.transaction(current => current || record);
  return {
    ticket: 'KR-' + id.slice(0, 8).toUpperCase(),
    status: result.snapshot.val().status,
    existing: !result.committed
  };
}

async function listRefundRequests() {
  const snapshot = await database().ref('refundRequests').orderByChild('createdAt').limitToLast(100).once('value');
  const records = snapshot.val() || {};
  return Object.entries(records).map(([id, item]) => ({ id, ...item })).reverse();
}

async function updateRefundRequest(id, nextStatus) {
  if (!/^[a-f0-9]{32}$/.test(id) || !Object.prototype.hasOwnProperty.call(TRANSITIONS, nextStatus)) {
    throw new Error('Solicitação ou etapa inválida.');
  }
  const db = database();
  const ref = db.ref('refundRequests/' + id);
  const snapshot = await ref.once('value');
  const current = snapshot.val();
  if (!current) throw new Error('Solicitação não encontrada.');
  if (current.status === nextStatus) return { ok: true, status: nextStatus };
  if (!TRANSITIONS[current.status] || !TRANSITIONS[current.status].has(nextStatus)) {
    throw new Error('Essa mudança de etapa não é permitida.');
  }

  const now = new Date().toISOString();
  const historyRef = ref.child('history').push();
  const updates = {};
  updates['refundRequests/' + id + '/status'] = nextStatus;
  updates['refundRequests/' + id + '/updatedAt'] = now;
  updates['refundRequests/' + id + '/history/' + historyRef.key] = { status: nextStatus, at: now };
  if (nextStatus === 'reembolsado') {
    if (!/^[a-f0-9]{64}$/.test(current.licenseHash || '')) throw new Error('Compra sem licença vinculada; revise manualmente.');
    updates['licenses/' + current.licenseHash + '/status'] = 'inativa';
    updates['licenses/' + current.licenseHash + '/refundConfirmedAt'] = now;
  }
  await db.ref().update(updates);
  return { ok: true, status: nextStatus };
}

module.exports = { createRefundRequest, listRefundRequests, updateRefundRequest };

'use strict';

const admin = require('firebase-admin');

const CATEGORIES = new Set(['instalacao', 'licenca', 'pagamento', 'problema_tecnico', 'outro']);
const STATUSES = new Set(['recebido', 'em_atendimento', 'resolvido']);

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

function cleanText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function createSupportRequest(input) {
  const name = cleanText(input.name, 100);
  const email = cleanText(input.email, 180).toLowerCase();
  const category = cleanText(input.category, 40);
  const subject = cleanText(input.subject, 120);
  const message = cleanText(input.message, 3000);

  if (name.length < 2) throw new Error('Informe seu nome.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Informe um e-mail válido.');
  if (!CATEGORIES.has(category)) throw new Error('Selecione o assunto do contato.');
  if (subject.length < 3) throw new Error('Descreva o assunto em poucas palavras.');
  if (message.length < 15) throw new Error('Conte um pouco mais sobre o que aconteceu (mínimo de 15 caracteres).');

  const ref = database().ref('supportRequests').push();
  const now = new Date().toISOString();
  const record = { name, email, category, subject, message, status: 'recebido', createdAt: now, updatedAt: now };
  await ref.set(record);
  return { ticket: 'KR-SUP-' + ref.key.slice(-8).toUpperCase(), status: record.status };
}

async function listSupportRequests() {
  const snapshot = await database().ref('supportRequests').orderByChild('createdAt').limitToLast(200).once('value');
  const records = snapshot.val() || {};
  return Object.entries(records).map(([id, item]) => ({ id, ...item })).reverse();
}

async function updateSupportRequest(id, nextStatus) {
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(id) || !STATUSES.has(nextStatus)) {
    throw new Error('Chamado ou etapa inválida.');
  }
  const ref = database().ref('supportRequests/' + id);
  const snapshot = await ref.once('value');
  const current = snapshot.val();
  if (!current) throw new Error('Chamado não encontrado.');
  if (current.status === nextStatus) return { ok: true, status: nextStatus };
  const allowed = {
    recebido: new Set(['em_atendimento', 'resolvido']),
    em_atendimento: new Set(['resolvido', 'recebido']),
    resolvido: new Set(['em_atendimento'])
  };
  if (!allowed[current.status] || !allowed[current.status].has(nextStatus)) {
    throw new Error('Essa mudança de etapa não é permitida.');
  }
  const now = new Date().toISOString();
  const historyRef = ref.child('history').push();
  await database().ref().update({
    ['supportRequests/' + id + '/status']: nextStatus,
    ['supportRequests/' + id + '/updatedAt']: now,
    ['supportRequests/' + id + '/history/' + historyRef.key]: { status: nextStatus, at: now }
  });
  return { ok: true, status: nextStatus };
}

module.exports = { createSupportRequest, listSupportRequests, updateSupportRequest };

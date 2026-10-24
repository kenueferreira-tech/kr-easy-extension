'use strict';

const PRODUCTION_ORIGIN = 'https://kr-easy-extension.vercel.app';
const ALLOWED_TYPES = new Set(['dashboard', 'refunds', 'support']);

async function readProductionAdmin(type) {
  if (!ALLOWED_TYPES.has(type)) throw new Error('Consulta de Produção não permitida.');
  const token = process.env.KR_PREVIEW_READ_TOKEN;
  if (!token) throw new Error('Leitura da Produção não configurada.');
  const result = await fetch(PRODUCTION_ORIGIN + '/api/admin/preview-reader?type=' + encodeURIComponent(type), {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    cache: 'no-store',
    signal: AbortSignal.timeout(12000)
  });
  if (!result.ok) throw new Error('Não foi possível consultar os dados de Produção.');
  return result.json();
}

module.exports = { readProductionAdmin };

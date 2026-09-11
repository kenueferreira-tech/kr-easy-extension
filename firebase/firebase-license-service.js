(() => {
  'use strict';

  class KrEasyLicenseService {
    constructor(databaseUrl) {
      const normalizedUrl = String(databaseUrl || '').trim().replace(/\/$/, '');
      if (!/^https:\/\/[a-z0-9-]+(?:-default-rtdb)?\.(?:firebaseio\.com|firebasedatabase\.app)$/i.test(normalizedUrl)) {
        throw new TypeError('Informe uma URL válida do Firebase Realtime Database.');
      }
      this.databaseUrl = normalizedUrl;
    }

    normalizeKey(value) {
      return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
    }

    async hashKey(value) {
      const normalizedKey = this.normalizeKey(value);
      if (normalizedKey.length < 8 || normalizedKey.length > 80) {
        throw new TypeError('A chave deve ter entre 8 e 80 caracteres.');
      }
      const data = new TextEncoder().encode(normalizedKey);
      const digest = await crypto.subtle.digest('SHA-256', data);
      return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    }

    async validate(value, options = {}) {
      const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 8000;
      const hash = await this.hashKey(value);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(`${this.databaseUrl}/licenses/${hash}.json`, {
          method: 'GET',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
          signal: controller.signal
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) throw new Error('Acesso negado pelas regras do Firebase.');
          throw new Error(`Falha ao validar a licença: HTTP ${response.status}.`);
        }

        const record = await response.json();
        if (!record) return { valid: false, reason: 'not_found' };
        if (record.status !== 'ativa' && record.active !== true) return { valid: false, reason: 'inactive' };

        const expiresAt = record.expiresAt ? new Date(record.expiresAt).getTime() : null;
        if (expiresAt && (!Number.isFinite(expiresAt) || Date.now() > expiresAt)) return { valid: false, reason: 'expired' };

        return {
          valid: true,
          reason: 'active',
          license: {
            plan: typeof record.plan === 'string' ? record.plan : 'vitalicio',
            createdAt: record.createdAt || null,
            expiresAt: record.expiresAt || null
          }
        };
      } catch (error) {
        if (error && error.name === 'AbortError') throw new Error('A validação demorou mais que o esperado.');
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  globalThis.KrEasyLicenseService = KrEasyLicenseService;
})();

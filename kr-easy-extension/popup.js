(() => {
  'use strict';

  const FIREBASE_DATABASE_URL = 'https://kr-easy-extension-default-rtdb.firebaseio.com';
  const STORAGE_KEY = 'krEasyLicense';
  const form = document.getElementById('popupLicenseForm');
  const keyInput = document.getElementById('popupLicenseKey');
  const status = document.getElementById('popupStatus');
  const message = document.getElementById('popupMessage');
  const removeButton = document.getElementById('removeLicense');

  const normalizeKey = value => value.trim().toUpperCase().replace(/\s+/g, '');
  const getStored = keys => new Promise(resolve => chrome.storage.local.get(keys, resolve));
  const setStored = value => new Promise(resolve => chrome.storage.local.set(value, resolve));
  const removeStored = keys => new Promise(resolve => chrome.storage.local.remove(keys, resolve));

  async function sha256(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function validateLicense(licenseKey) {
    if (!FIREBASE_DATABASE_URL) return { ok: false, setup: true, message: 'Firebase não configurado. Cadastre a URL do Realtime Database.' };
    const base = FIREBASE_DATABASE_URL.replace(/\/$/, '');
    const licenseHash = await sha256(licenseKey);
    const response = await fetch(`${base}/licenses/${licenseHash}.json`, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Não foi possível consultar o servidor de licenças.');
    const record = await response.json();
    const active = record && (record.status === 'ativa' || record.active === true);
    if (!active) return { ok: false, message: 'Chave inválida, inativa ou não encontrada.' };
    if (record.expiresAt && Date.now() > new Date(record.expiresAt).getTime()) return { ok: false, message: 'Esta licença expirou.' };
    return { ok: true, record };
  }

  function renderActive(key) {
    status.textContent = 'Licença ativa';
    message.textContent = `Acesso liberado para a chave terminada em ${key.slice(-4)}.`;
    form.hidden = true;
    removeButton.hidden = false;
    document.body.classList.add('kr-is-active');
  }

  function renderLocked(text) {
    status.textContent = 'Ative sua licença';
    message.textContent = text;
    form.hidden = false;
    removeButton.hidden = true;
    document.body.classList.remove('kr-is-active');
  }

  async function boot() {
    const data = await getStored([STORAGE_KEY]);
    const saved = data[STORAGE_KEY];
    if (!saved || !saved.key) return renderLocked('Digite sua chave para liberar a extensão.');
    try {
      const result = await validateLicense(saved.key);
      if (result.ok) {
        await setStored({ [STORAGE_KEY]: { key: saved.key, validatedAt: Date.now() } });
        renderActive(saved.key);
      } else renderLocked(result.message);
    } catch (error) {
      const recent = saved.validatedAt && Date.now() - saved.validatedAt < 86400000;
      if (recent) renderActive(saved.key);
      else renderLocked(error.message);
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const key = normalizeKey(keyInput.value);
    if (key.length < 8) return renderLocked('Confira a chave informada e tente novamente.');
    status.textContent = 'Validando…';
    form.querySelector('button').disabled = true;
    try {
      const result = await validateLicense(key);
      if (!result.ok) return renderLocked(result.message);
      await setStored({ [STORAGE_KEY]: { key, validatedAt: Date.now() } });
      renderActive(key);
    } catch (error) {
      renderLocked(error.message);
    } finally {
      form.querySelector('button').disabled = false;
    }
  });

  removeButton.addEventListener('click', async () => {
    await removeStored([STORAGE_KEY]);
    keyInput.value = '';
    renderLocked('A licença foi removida deste navegador.');
  });
  document.getElementById('openWhatsApp').addEventListener('click', () => chrome.tabs.create({ url: 'https://web.whatsapp.com/' }));
  boot();
})();

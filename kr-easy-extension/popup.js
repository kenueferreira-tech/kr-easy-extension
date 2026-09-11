(() => {
  'use strict';

  const FIREBASE_DATABASE_URL = 'https://kr-easy-extension-default-rtdb.firebaseio.com';
  const STORAGE_KEY = 'krEasyLicense';
  const DEVICE_KEY = 'krEasyDeviceId';
  const DEVICE_API = 'https://kr-easy-extension.vercel.app/api/devices';
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

  async function deviceId() {
    const stored = await getStored([DEVICE_KEY]);
    if (stored[DEVICE_KEY]) return stored[DEVICE_KEY];
    const value = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9_-]/g, '');
    await setStored({ [DEVICE_KEY]: value }); return value;
  }

  async function deviceAction(action, key) {
    const id = await deviceId();
    const response = await fetch(DEVICE_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, key, deviceId: id, type: 'computer', name: `Chrome — ${navigator.platform || 'Computador'}` }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Não foi possível vincular este computador.');
    return data;
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
        const devices = await deviceAction('list', saved.key);
        const id = await deviceId();
        if (!devices.devices.some(device => device.id === id)) throw new Error('Este computador foi desvinculado. Ative a licença novamente.');
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
      await deviceAction('register', key);
      await setStored({ [STORAGE_KEY]: { key, validatedAt: Date.now() } });
      renderActive(key);
    } catch (error) {
      renderLocked(error.message);
    } finally {
      form.querySelector('button').disabled = false;
    }
  });

  removeButton.addEventListener('click', async () => {
    const data = await getStored([STORAGE_KEY]);
    if (data[STORAGE_KEY]?.key) await deviceAction('remove', data[STORAGE_KEY].key).catch(() => {});
    await removeStored([STORAGE_KEY]);
    keyInput.value = '';
    renderLocked('A licença foi removida deste navegador.');
  });
  document.getElementById('openWhatsApp').addEventListener('click', () => chrome.tabs.create({ url: 'https://web.whatsapp.com/' }));
  boot();
})();

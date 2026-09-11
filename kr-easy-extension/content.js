(() => {
  'use strict';

  const FIREBASE_DATABASE_URL = 'https://kr-easy-extension-default-rtdb.firebaseio.com';
  const LICENSE_STORAGE_KEY = 'krEasyLicense';
  const SCRIPTS_STORAGE_KEY = 'krEasyCustomScripts';
  const LICENSE_CACHE_MS = 86400000;
  const QUICK_SCRIPTS = {
    caro: 'Entendo você 😊 Mais importante do que olhar apenas o preço é avaliar o resultado que você busca. Posso te mostrar rapidamente o que está incluído e como esse investimento pode fazer sentido para você?',
    pensar: 'Claro, é importante decidir com segurança 😊 Para eu não deixar nenhuma dúvida pendente: o que você gostaria de avaliar melhor antes de tomar sua decisão?',
    frete: 'Sobre o frete 📦 eu confirmo o prazo e o valor certinhos para sua região antes de você finalizar. Pode me enviar seu CEP para eu verificar agora?',
    garantia: 'Você pode comprar com tranquilidade 🛡️ A garantia existe justamente para proteger sua decisão. Vou te explicar o que ela cobre e como acionar, caso seja necessário.'
  };
  const STAGE_CONTENT = {
    abertura: { title: 'Primeiro contato', build: d => `Olá, ${d.name || 'tudo bem'}? 😊 Vi que você demonstrou interesse em ${d.product || 'nossa solução'}. Posso fazer duas perguntas rápidas para entender o que você precisa e te orientar melhor?` },
    diagnostico: { title: 'Diagnóstico', build: d => `Para eu te indicar a melhor opção de ${d.product || 'produto'}, me conta: qual resultado você quer alcançar e o que mais tem dificultado isso hoje? 🎯` },
    oferta: { title: 'Apresentação da oferta', build: d => `${d.name ? `${d.name}, ` : ''}pelo que você me contou, ${d.product || 'esta solução'} faz sentido porque ${d.benefit || 'ajuda a resolver sua necessidade com mais praticidade'}. O investimento é ${d.price || 'apresentado na condição atual'} e eu posso te orientar no próximo passo agora. 😊` },
    fechamento: { title: 'Fechamento', build: d => `${d.name ? `${d.name}, ` : ''}quer aproveitar essa condição para ${d.benefit || 'começar a ter esse resultado'}? Se você confirmar, eu já te envio o passo a passo para finalizar com segurança. ✅` },
    followup: { title: 'Retomada', build: d => `Oi, ${d.name || 'tudo bem'}? 😊 Passei para saber se ficou alguma dúvida sobre ${d.product || 'a proposta'}. Se quiser, posso resumir os pontos principais e te ajudar a decidir com tranquilidade.` }
  };

  const getStorage = keys => new Promise(resolve => chrome.storage.local.get(keys, resolve));
  const setStorage = values => new Promise(resolve => chrome.storage.local.set(values, resolve));
  const normalizeKey = value => value.trim().toUpperCase().replace(/\s+/g, '');
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  let toastTimer;

  function panelTemplate() {
    return `<div class="kr-shell"><header class="kr-header"><div class="kr-brand"><span class="kr-logo">KR</span><div><strong>KR Easy Extension</strong><small>Seu assistente de vendas</small></div></div><button class="kr-icon-button" id="krClose" aria-label="Fechar painel">×</button></header><main class="kr-content">
      <section id="krLock" class="kr-lock"><div><span class="kr-logo">KR</span><h2>Ative seu acesso</h2><p>Digite sua chave de licença para liberar o painel.</p><form id="krLicenseForm"><label for="krLicenseInput">Chave de licença</label><input id="krLicenseInput" maxlength="80" autocomplete="off" spellcheck="false" placeholder="Digite sua chave" required><button class="kr-primary" type="submit">Validar licença</button><p id="krLicenseError" class="kr-error" role="alert"></p></form></div></section>
      <section id="krApp" hidden><nav class="kr-tabs" aria-label="Ferramentas"><button class="kr-tab kr-active" data-view="quick">Scripts rápidos</button><button class="kr-tab" data-view="generator">Gerador de copy</button><button class="kr-tab" data-view="mine">Meus scripts</button></nav>
        <section class="kr-view" data-panel="quick"><h2>Scripts rápidos</h2><p>Escolha uma objeção para preparar a resposta.</p><div class="kr-quick-grid"><button class="kr-script-button" data-quick="caro"><span>💰</span>Tá caro</button><button class="kr-script-button" data-quick="pensar"><span>🤔</span>Vou pensar</button><button class="kr-script-button" data-quick="frete"><span>📦</span>Frete</button><button class="kr-script-button" data-quick="garantia"><span>🛡️</span>Garantia</button></div><div class="kr-output" id="krQuickOutput" hidden><textarea id="krQuickText" aria-label="Mensagem pronta"></textarea><button class="kr-primary" data-send-from="krQuickText">Usar no WhatsApp</button><button class="kr-ghost" data-copy-from="krQuickText">Copiar mensagem</button></div></section>
        <section class="kr-view" data-panel="generator" hidden><h2>Gerador de copy</h2><p>Preencha apenas o que fizer sentido para a conversa.</p><form id="krGenerator"><label for="krStage">Etapa da venda</label><select id="krStage"><option value="abertura">Primeiro contato</option><option value="diagnostico">Diagnóstico</option><option value="oferta">Apresentação da oferta</option><option value="fechamento">Fechamento</option><option value="followup">Retomada de contato</option></select><label for="krName">Nome do cliente</label><input id="krName" maxlength="60" placeholder="Ex.: Marina"><label for="krProduct">Produto ou serviço</label><input id="krProduct" maxlength="100" placeholder="Ex.: Consultoria de vendas"><label for="krBenefit">Benefício principal</label><input id="krBenefit" maxlength="180" placeholder="Ex.: organizar o atendimento e vender melhor"><label for="krPrice">Preço ou condição</label><input id="krPrice" maxlength="100" placeholder="Ex.: R$ 47,00 à vista"><button class="kr-primary" type="submit">Gerar mensagem</button></form><div class="kr-output" id="krGeneratorOutput" hidden><textarea id="krGeneratedText" aria-label="Copy gerada"></textarea><button class="kr-primary" data-send-from="krGeneratedText">Usar no WhatsApp</button><button class="kr-ghost" data-copy-from="krGeneratedText">Copiar mensagem</button></div></section>
        <section class="kr-view" data-panel="mine" hidden><h2>Meus scripts</h2><p>Crie atalhos com as mensagens que funcionam para você.</p><form id="krScriptForm"><input id="krScriptId" type="hidden"><label for="krScriptTitle">Título</label><input id="krScriptTitle" maxlength="80" placeholder="Ex.: Cliente sem tempo" required><label for="krScriptText">Mensagem</label><textarea id="krScriptText" maxlength="2000" rows="5" placeholder="Escreva sua mensagem" required></textarea><button class="kr-primary" type="submit">Salvar script</button><button class="kr-ghost" id="krCancelEdit" type="button" hidden>Cancelar edição</button></form><div id="krScriptsList" class="kr-list"></div></section>
      </section></main><div class="kr-toast" id="krToast" role="status" aria-live="polite"></div></div>`;
  }

  function mount() {
    if (document.getElementById('kr-easy-root')) return;
    const launcher = document.createElement('button');
    launcher.id = 'kr-easy-launcher'; launcher.type = 'button'; launcher.textContent = 'KR'; launcher.title = 'Abrir KR Easy Extension';
    const root = document.createElement('aside');
    root.id = 'kr-easy-root'; root.setAttribute('aria-label', 'KR Easy Extension'); root.innerHTML = panelTemplate();
    document.body.append(launcher, root);
    launcher.addEventListener('click', () => { root.classList.toggle('kr-open'); if (root.classList.contains('kr-open')) checkAccess(); });
    document.getElementById('krClose').addEventListener('click', () => root.classList.remove('kr-open'));
    bindEvents();
  }

  async function sha256(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function validateLicense(key) {
    if (!FIREBASE_DATABASE_URL) return { ok: false, message: 'Firebase não configurado. Cadastre a URL do Realtime Database.' };
    const licenseHash = await sha256(key);
    const url = `${FIREBASE_DATABASE_URL.replace(/\/$/, '')}/licenses/${licenseHash}.json`;
    const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Não foi possível consultar as licenças agora.');
    const record = await response.json();
    if (!record || (record.status !== 'ativa' && record.active !== true)) return { ok: false, message: 'Chave inválida, inativa ou não encontrada.' };
    if (record.expiresAt && Date.now() > new Date(record.expiresAt).getTime()) return { ok: false, message: 'Esta licença expirou.' };
    return { ok: true };
  }

  async function checkAccess() {
    const data = await getStorage([LICENSE_STORAGE_KEY]);
    const saved = data[LICENSE_STORAGE_KEY];
    if (!saved || !saved.key) return showLocked('');
    try {
      const result = await validateLicense(saved.key);
      if (result.ok) { await setStorage({ [LICENSE_STORAGE_KEY]: { key: saved.key, validatedAt: Date.now() } }); return showApp(); }
      showLocked(result.message);
    } catch (error) {
      if (saved.validatedAt && Date.now() - saved.validatedAt < LICENSE_CACHE_MS) showApp();
      else showLocked(error.message);
    }
  }

  function showLocked(error) { document.getElementById('krLock').hidden = false; document.getElementById('krApp').hidden = true; document.getElementById('krLicenseError').textContent = error; }
  function showApp() { document.getElementById('krLock').hidden = true; document.getElementById('krApp').hidden = false; renderScripts(); }
  function notify(text) { const el = document.getElementById('krToast'); el.textContent = text; el.classList.add('kr-show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('kr-show'), 2800); }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); notify('Mensagem copiada.'); }
    catch { const area = document.createElement('textarea'); area.value = text; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove(); notify('Mensagem copiada.'); }
  }

  function insertIntoWhatsApp(text) {
    const selectors = ['footer div[contenteditable="true"][role="textbox"]', 'footer [contenteditable="true"]', '[data-testid="conversation-compose-box-input"]'];
    const editor = selectors.map(selector => document.querySelector(selector)).find(Boolean);
    if (!editor) { copyText(text); return notify('Conversa não localizada. A mensagem foi copiada.'); }
    editor.focus();
    const selection = window.getSelection(); const range = document.createRange();
    range.selectNodeContents(editor); range.deleteContents();
    editor.textContent = text; range.selectNodeContents(editor); range.collapse(false);
    selection.removeAllRanges(); selection.addRange(range);
    editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    notify('Mensagem inserida. Revise antes de enviar.');
  }

  function bindEvents() {
    document.getElementById('krLicenseForm').addEventListener('submit', async event => {
      event.preventDefault(); const button = event.currentTarget.querySelector('button'); const error = document.getElementById('krLicenseError');
      const key = normalizeKey(document.getElementById('krLicenseInput').value); if (key.length < 8) return error.textContent = 'Confira a chave informada.';
      button.disabled = true; button.textContent = 'Validando…'; error.textContent = '';
      try { const result = await validateLicense(key); if (!result.ok) return error.textContent = result.message; await setStorage({ [LICENSE_STORAGE_KEY]: { key, validatedAt: Date.now() } }); showApp(); }
      catch (reason) { error.textContent = reason.message; }
      finally { button.disabled = false; button.textContent = 'Validar licença'; }
    });
    document.querySelectorAll('.kr-tab').forEach(tab => tab.addEventListener('click', () => { document.querySelectorAll('.kr-tab').forEach(item => item.classList.toggle('kr-active', item === tab)); document.querySelectorAll('.kr-view').forEach(panel => panel.hidden = panel.dataset.panel !== tab.dataset.view); }));
    document.querySelectorAll('[data-quick]').forEach(button => button.addEventListener('click', () => { document.getElementById('krQuickText').value = QUICK_SCRIPTS[button.dataset.quick]; document.getElementById('krQuickOutput').hidden = false; }));
    document.getElementById('krGenerator').addEventListener('submit', event => { event.preventDefault(); const data = { name: document.getElementById('krName').value.trim(), product: document.getElementById('krProduct').value.trim(), benefit: document.getElementById('krBenefit').value.trim(), price: document.getElementById('krPrice').value.trim() }; document.getElementById('krGeneratedText').value = STAGE_CONTENT[document.getElementById('krStage').value].build(data); document.getElementById('krGeneratorOutput').hidden = false; });
    document.querySelectorAll('[data-copy-from]').forEach(button => button.addEventListener('click', () => copyText(document.getElementById(button.dataset.copyFrom).value)));
    document.querySelectorAll('[data-send-from]').forEach(button => button.addEventListener('click', () => insertIntoWhatsApp(document.getElementById(button.dataset.sendFrom).value)));
    document.getElementById('krScriptForm').addEventListener('submit', saveScript);
    document.getElementById('krCancelEdit').addEventListener('click', resetScriptForm);
    document.getElementById('krScriptsList').addEventListener('click', handleScriptAction);
  }

  async function readScripts() { const data = await getStorage([SCRIPTS_STORAGE_KEY]); return Array.isArray(data[SCRIPTS_STORAGE_KEY]) ? data[SCRIPTS_STORAGE_KEY] : []; }
  async function saveScript(event) { event.preventDefault(); const idInput = document.getElementById('krScriptId'); const title = document.getElementById('krScriptTitle').value.trim(); const text = document.getElementById('krScriptText').value.trim(); if (!title || !text) return; const scripts = await readScripts(); const id = idInput.value || crypto.randomUUID(); const record = { id, title, text, updatedAt: Date.now() }; const index = scripts.findIndex(item => item.id === id); if (index >= 0) scripts[index] = record; else scripts.unshift(record); await setStorage({ [SCRIPTS_STORAGE_KEY]: scripts }); resetScriptForm(); renderScripts(); notify('Script salvo.'); }
  function resetScriptForm() { document.getElementById('krScriptForm').reset(); document.getElementById('krScriptId').value = ''; document.getElementById('krCancelEdit').hidden = true; }
  async function renderScripts() { const target = document.getElementById('krScriptsList'); const scripts = await readScripts(); target.innerHTML = scripts.length ? scripts.map(item => `<article class="kr-saved" data-id="${escapeHtml(item.id)}"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p><div class="kr-saved-actions"><button data-action="use">Usar</button><button data-action="edit">Editar</button><button data-action="delete">Excluir</button></div></article>`).join('') : '<div class="kr-empty">Seus scripts salvos aparecerão aqui.</div>'; }
  async function handleScriptAction(event) { const button = event.target.closest('[data-action]'); if (!button) return; const card = button.closest('[data-id]'); const scripts = await readScripts(); const script = scripts.find(item => item.id === card.dataset.id); if (!script) return; if (button.dataset.action === 'use') insertIntoWhatsApp(script.text); if (button.dataset.action === 'edit') { document.getElementById('krScriptId').value = script.id; document.getElementById('krScriptTitle').value = script.title; document.getElementById('krScriptText').value = script.text; document.getElementById('krCancelEdit').hidden = false; document.getElementById('krScriptTitle').focus(); } if (button.dataset.action === 'delete' && confirm(`Excluir o script “${script.title}”?`)) { await setStorage({ [SCRIPTS_STORAGE_KEY]: scripts.filter(item => item.id !== script.id) }); renderScripts(); notify('Script excluído.'); } }

  mount();
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes[LICENSE_STORAGE_KEY]) checkAccess(); });
})();

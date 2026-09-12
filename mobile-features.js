(() => {
  'use strict';

  const REMINDERS_KEY = 'krEasyReminders';
  const $ = selector => document.querySelector(selector);
  const read = () => { try { return JSON.parse(localStorage.getItem(REMINDERS_KEY)) || []; } catch { return []; } };
  const write = items => localStorage.setItem(REMINDERS_KEY, JSON.stringify(items));
  const escape = value => String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const format = value => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

  function renderReminders() {
    const list = $('#reminderList');
    if (!list) return;
    const now = Date.now();
    const items = read().sort((a, b) => new Date(a.at) - new Date(b.at));
    list.innerHTML = items.length ? items.map(item => {
      const due = new Date(item.at).getTime() <= now;
      return `<article class="saved-card${due ? ' reminder-due' : ''}" data-reminder-id="${escape(item.id)}"><h3>${escape(item.client)}</h3><span class="reminder-meta">${due ? 'Retorno pendente' : format(item.at)}</span><p>${escape(item.note || 'Retomar o atendimento.')}</p><div class="actions"><button data-reminder-action="message">Preparar mensagem</button><button data-reminder-action="done">Concluir</button></div></article>`;
    }).join('') : '<div class="empty">Nenhum lembrete criado.</div>';
  }

  function showDueReminder() {
    const item = read().find(reminder => !reminder.notified && new Date(reminder.at).getTime() <= Date.now());
    if (!item) return;
    const items = read();
    const saved = items.find(reminder => reminder.id === item.id);
    if (saved) saved.notified = true;
    write(items);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Retornar para ${item.client}`, { body: item.note || 'Seu atendimento está aguardando retorno.', icon: '/icons/icon-192.png', tag: item.id });
    }
  }

  const reminderAt = $('#reminderAt');
  if (reminderAt) reminderAt.type = 'datetime-local';
  $('#reminderForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const client = $('#reminderClient').value.trim();
    const at = $('#reminderAt').value;
    const note = $('#reminderNote').value.trim();
    if (!client || !at) return;
    const items = read();
    items.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), client, at, note, notified: false });
    write(items);
    event.currentTarget.reset();
    renderReminders();
  });

  $('#reminderList')?.addEventListener('click', event => {
    const button = event.target.closest('[data-reminder-action]');
    if (!button) return;
    const card = button.closest('[data-reminder-id]');
    const items = read();
    const item = items.find(entry => entry.id === card.dataset.reminderId);
    if (!item) return;
    if (button.dataset.reminderAction === 'done') {
      write(items.filter(entry => entry.id !== item.id));
      renderReminders();
      return;
    }
    document.querySelector('[data-nav="generator"]')?.click();
    $('#clientName').value = item.client;
    $('#stage').value = 'followup';
    $('#benefit').value = item.note;
    $('#clientName').focus();
  });

  $('#enableNotifications')?.addEventListener('click', async event => {
    if (!('Notification' in window)) { event.currentTarget.textContent = 'Avisos não disponíveis neste aparelho'; return; }
    const permission = await Notification.requestPermission();
    event.currentTarget.textContent = permission === 'granted' ? 'Avisos ativados ✓' : 'Permissão de avisos não concedida';
  });

  const sharedText = sessionStorage.getItem('krEasySharedText');
  if (sharedText) {
    sessionStorage.removeItem('krEasySharedText');
    document.querySelector('[data-go="quick"]')?.click();
    const area = $('#quickText');
    if (area) { area.value = sharedText; $('#quickOutput').hidden = false; }
  }

  const params = new URLSearchParams(location.search);
  const requestedScreen = params.get('screen');
  if (requestedScreen === 'scripts') document.querySelector('[data-nav="scripts"]')?.click();
  if (requestedScreen === 'generator') document.querySelector('[data-nav="generator"]')?.click();

  renderReminders();
  showDueReminder();
  setInterval(() => { renderReminders(); showDueReminder(); }, 60000);
})();

(() => {
  'use strict';

  const formats = [
    { label: 'B', title: 'Negrito', marker: '*' },
    { label: 'I', title: 'Itálico', marker: '_' },
    { label: 'S̶', title: 'Riscado', marker: '~' },
    { label: '</>', title: 'Monoespaçado', marker: String.fromCharCode(96, 96, 96) }
  ];
  const targets = ['#scriptText', '#modalMessage', '#quickText', '#generatedText'];

  const style = document.createElement('style');
  style.textContent = '.format-toolbar{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 8px}.format-toolbar button{min-width:42px;min-height:36px;padding:0 10px;border:1px solid #203c2c;border-radius:10px;background:#112119;color:#f1fff6;font-size:13px;font-weight:900;cursor:pointer}.format-toolbar button:focus-visible{outline:2px solid #69ff9f;outline-offset:2px}.format-toolbar button:active{background:#162a20;transform:scale(.97)}.format-help{margin:-2px 0 10px;font-size:10px}';
  document.head.append(style);

  for (const selector of targets) {
    const textarea = document.querySelector(selector);
    if (!textarea || textarea.dataset.formatToolbar) continue;
    textarea.dataset.formatToolbar = 'true';

    const toolbar = document.createElement('div');
    toolbar.className = 'format-toolbar';
    toolbar.setAttribute('role', 'group');
    toolbar.setAttribute('aria-label', 'Formatação do WhatsApp');

    formats.forEach(format => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = format.label;
      button.title = 'Aplicar ' + format.title;
      button.setAttribute('aria-label', 'Aplicar ' + format.title + ' do WhatsApp');
      button.addEventListener('click', () => {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.slice(start, end);
        const wrapped = format.marker + selected + format.marker;
        textarea.focus();
        textarea.setRangeText(wrapped, start, end, 'select');
        if (selected) textarea.setSelectionRange(start + format.marker.length, start + format.marker.length + selected.length);
        else textarea.setSelectionRange(start + format.marker.length, start + format.marker.length);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      });
      toolbar.append(button);
    });

    const help = document.createElement('p');
    help.className = 'subtle format-help';
    help.textContent = 'Selecione um trecho e toque em um botão para formatar no WhatsApp.';
    textarea.before(toolbar, help);
  }
})();

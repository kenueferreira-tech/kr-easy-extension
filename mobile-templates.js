(() => {
  'use strict';

  const scriptsList = document.querySelector('#scriptsList');
  const modal = document.querySelector('#messageModal');
  const message = document.querySelector('#modalMessage');
  if (!scriptsList || !modal || !message) return;

  const escapeRegExp = value => [...value].map(char => '.*+?^$'.includes(char) || '{}()|[]\\'.includes(char) ? '\\' + char : char).join('');
  const variablePattern = /\{([\p{L}\p{N}_ -]{1,40})\}/gu;
  const fieldLabel = value => value.replace(/[_-]+/g, ' ').trim().replace(/\s+/g, ' ');

  function collectVariables(template) {
    const names = new Map();
    for (const match of template.matchAll(variablePattern)) {
      const key = match[1].trim();
      if (key) names.set(key.toLocaleLowerCase('pt-BR'), key);
    }
    return [...names.values()];
  }

  function prepareTemplate() {
    const template = message.value;
    const names = collectVariables(template);
    let container = document.querySelector('#templateFields');
    if (!container) {
      container = document.createElement('div');
      container.id = 'templateFields';
      container.className = 'template-fields';
      container.hidden = true;
      message.before(container);
    }
    container.replaceChildren();
    container.hidden = names.length === 0;
    if (!names.length) return;

    const intro = document.createElement('p');
    intro.className = 'subtle';
    intro.textContent = 'Personalize os campos desta mensagem. O conteúdo continua salvo como modelo.';
    container.append(intro);

    const inputs = [];
    for (const name of names) {
      const label = document.createElement('label');
      label.className = 'field template-field';
      const caption = document.createElement('span');
      caption.textContent = fieldLabel(name);
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 180;
      input.autocomplete = 'off';
      input.placeholder = 'Preencha: ' + fieldLabel(name);
      input.dataset.templateVariable = name;
      label.append(caption, input);
      container.append(label);
      inputs.push(input);
    }

    const updateMessage = () => {
      let output = template;
      for (const input of inputs) {
        const expression = new RegExp('\\{' + escapeRegExp(input.dataset.templateVariable) + '\\}', 'giu');
        output = output.replace(expression, () => input.value.trim() || '{' + input.dataset.templateVariable + '}');
      }
      message.value = output;
    };
    inputs.forEach(input => input.addEventListener('input', updateMessage));
  }

  scriptsList.addEventListener('click', event => {
    if (!event.target.closest('[data-action="use"]')) return;
    queueMicrotask(prepareTemplate);
  });

  modal.addEventListener('click', event => {
    if (event.target === modal || event.target.closest('#closeModal')) {
      const container = document.querySelector('#templateFields');
      if (container) { container.replaceChildren(); container.hidden = true; }
    }
  });
})();

# Painel administrativo da KR Easy Extension

O painel fica em \`/admin.html\`. Ele exige uma senha de servidor e não usa uma chave administrativa embutida no navegador.

## Variáveis na Vercel

Em **Project Settings → Environment Variables**, configure para Production (e Preview, se quiser testar):

- \`KR_ADMIN_PASSWORD\`: senha longa, exclusiva para o painel.
- \`KR_ADMIN_SESSION_SECRET\`: segredo aleatório com pelo menos 32 caracteres.
- \`FIREBASE_SERVICE_ACCOUNT_JSON\` e \`FIREBASE_DATABASE_URL\`: já usados pelo checkout e pelas licenças.

Depois de salvar variáveis, faça um novo deploy. Não envie essas senhas pelo chat nem as coloque em arquivos públicos.

## O que o painel mede

- Compras confirmadas e receita estimada pelos registros criados após confirmação da InfinitePay (R$ 47 por compra).
- Licenças criadas pelo proprietário, sem contá-las como venda.
- Visitas ao site, aberturas do app e dispositivos com atividade nos últimos 30 dias.
- Campanhas identificadas por \`utm_source\` nos links do site. Exemplo: \`https://www.kreasy.com.br/?utm_source=instagram\`.

Visitas e aberturas são contagens aproximadas por sessão, não pessoas únicas. Os eventos não enviam nome, chave de licença, IP no corpo da métrica ou conteúdo de mensagens. Os registros técnicos do provedor de hospedagem continuam sujeitos às práticas dele.

# Painel administrativo da KR Easy Extension

O painel fica em `/admin.html`. Ele exige uma senha definida no servidor e não usa uma chave administrativa embutida no navegador. O painel e a medição de tráfego atuam somente no site; não há rastreamento de uso dentro do app.

## Variáveis na Vercel

Em **Project Settings → Environment Variables**, configure no ambiente **Production**:

- `KR_ADMIN_PASSWORD`: senha longa e exclusiva para o painel.
- `KR_ADMIN_SESSION_SECRET`: segredo aleatório com pelo menos 32 caracteres.
- `FIREBASE_SERVICE_ACCOUNT_JSON` e `FIREBASE_DATABASE_URL`: já usados pelo checkout e pelas licenças.

Depois de salvar as variáveis, faça um novo deploy. Não coloque senhas em arquivos públicos.

## O que o painel mede

- Compras confirmadas e receita estimada pelos registros criados após confirmação da InfinitePay (R$ 47 por compra).
- Licenças criadas pelo proprietário, sem contá-las como venda.
- Visitas ao site nos últimos 30 dias.
- Campanhas identificadas por `utm_source` nos links do site. Exemplo: `https://www.kreasy.com.br/?utm_source=instagram`.

Visitas são contagens aproximadas por sessão, não pessoas únicas. Os eventos não incluem nome, chave de licença ou conteúdo de mensagens. Os registros técnicos do provedor de hospedagem continuam sujeitos às práticas dele.

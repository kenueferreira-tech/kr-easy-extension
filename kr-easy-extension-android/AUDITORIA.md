# Auditoria inicial — KR Easy Extension

Data da inspeção: 26/10/2026. Fonte inspecionada: branch padrão `main` do repositório `kenueferreira-tech/kr-easy-extension`, incluindo árvore, workflow, configuração Android, documentação e módulos de licença/API.

## O que o código confirma

| Área | Situação observada |
|---|---|
| Site e extensão | Repositório contém site estático, `mobile.html`, service worker, manifest PWA e extensão Chrome em `kr-easy-extension/`. |
| Aplicativo Android anterior | `android-app` usa Bubblewrap/TWA e abre `mobile.html` no Chrome. Não é app Android nativo independente. |
| Automação existente | `.github/workflows/build-android.yml` restaura `android-app-source.zip` e tenta gerar AAB release assinado com secrets GitHub. Esse fluxo é separado da base Flutter aqui. |
| Licença | `firebase/firebase-license-service.js` normaliza a chave, calcula SHA-256 e consulta `/licenses/{hash}.json`; valida status e expiração. |
| Regras Firebase | `firebase/database.rules.json` bloqueia leitura geral e escrita, permitindo leitura do nó de licença pelo hash. |
| Configuração Firebase | `firebase/GUIA-FIREBASE.md` instrui preencher manualmente a URL do Realtime Database nos clientes. A URL efetiva não foi confirmada nesta auditoria. |
| Administração | Há API de licenças e módulos de servidor. `api/admin/licenses.js` exige `requireAdmin` e bloqueia criar/revogar em preview. |
| Gestão de dispositivos | Há `api/devices.js` com operações register/remove/list e limite de dispositivos. Autorização e armazenamento dependem de `server/devices.js`; devem ser revisados antes de reutilizar pelo app. |
| Checkout | O repositório contém endpoints `create-checkout`, `payment-status` e webhook InfinitePay; fluxo de pagamento permanece no site e não foi ligado ao aplicativo. |
| IA / CRM / catálogo | Nenhuma API confirmada no material consultado para essas funções do aplicativo. Não tratadas como integrações existentes. |

## Recursos reaproveitados nesta base

- Nome oficial, paleta escura e verde, conceito comercial e funções de scripts.
- Estrutura comercial alinhada com licença do mesmo produto, sem criar um projeto Firebase novo.
- Link manual `wa.me`; não executa automação de WhatsApp nem lê conversas.

## Implementado no app Flutter inicial

Dashboard, assistente local por scripts, central de scripts com favoritos/pesquisa/criação, cadastro local de clientes e etapas, catálogo, calculadoras, Radar baseado em dados locais, simulação Academy, indicadores Performance, lembretes internos, cópia/backup local e navegação Android nativa.

## Parcial ou ainda sem integração

- O assistente é determinístico e local; não é IA conectada.
- CRM e catálogo são somente locais; não sincronizam com site, extensão ou banco remoto.
- Lembretes não agendam notificação do Android.
- Login, identificação de usuário e validação de licença não foram implementados no cliente sem backend autenticado/configuração confirmada.
- Administração/revogação de chave não está exposta no app. Deve passar pelo backend existente com autenticação administrativa.
- Fotos, importação, relatórios exportáveis em arquivo e sincronização entre dispositivos não estão implementados.
- APK ainda não foi compilado neste ambiente: não há Flutter/Dart/Android SDK instalado. O workflow foi preparado para gerar APK debug e artefato quando executado em runner GitHub.

## Planejados

Teste privado por APK, backend seguro para acesso de teste, login e licenças, sincronização gradual, notificação local, IA opcional via servidor e empacotamento futuro assinado para publicação comercial, sujeito a autorização específica.

## Segurança / produção

Nenhuma escrita foi feita no site, Firebase, produção, checkout, licenças, branches ou configurações remotas durante esta auditoria. Nenhum segredo foi copiado para a base Flutter. Para a próxima fase, trabalhar em branch isolada e testar contra ambiente separado.

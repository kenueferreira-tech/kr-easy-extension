# Auditoria inicial — KR Easy Extension

Data da inspeção: 26/10/2026. Fonte inspecionada: branch padrão `main` do repositório `kenueferreira-tech/kr-easy-extension`, incluindo árvore, workflow, configuração Android, documentação e módulos de licença/API.

## O que o código confirma

| Área | Situação observada |
|---|---|
| Site e extensão | Repositório contém site estático, `mobile.html`, service worker, manifest PWA e extensão Chrome em `kr-easy-extension/`. |
| Aplicativo Android anterior | `android-app` usa Bubblewrap/TWA e abre `mobile.html` no Chrome. Não é app Android nativo independente. |
| Automação existente | `.github/workflows/build-android.yml` restaura `android-app-source.zip` e tenta gerar AAB release assinado com secrets GitHub. Esse fluxo é separado da base Flutter aqui. |
| Licença | A extensão define o Realtime Database `https://kr-easy-extension-default-rtdb.firebaseio.com`; `firebase/firebase-license-service.js` normaliza a chave e valida licença por hash. O serviço de dispositivos usa Firebase Admin no servidor. |
| Regras Firebase | `firebase/database.rules.json` bloqueia leitura geral e escrita, permitindo leitura do nó de licença pelo hash. |
| Configuração Firebase | O guia documenta a configuração manual; a extensão Chrome contém uma URL efetiva. O backend depende de `FIREBASE_DATABASE_URL` e credenciais guardadas no servidor. Nenhum segredo administrativo está no app. |
| Administração | Há API de licenças e módulos de servidor. `api/admin/licenses.js` exige `requireAdmin` e bloqueia criar/revogar em preview. |
| Gestão de dispositivos | `api/devices.js` oferece register/remove/list; `server/devices.js` valida chave, status e expiração no Firebase Admin e limita a dois dispositivos. A extensão já usa esse endpoint. |
| Checkout | O repositório contém endpoints `create-checkout`, `payment-status` e webhook InfinitePay; fluxo de pagamento permanece no site e não foi ligado ao aplicativo. |
| IA / CRM / catálogo | Nenhuma API confirmada no material consultado para essas funções do aplicativo. Não tratadas como integrações existentes. |

## Recursos reaproveitados nesta base

- Nome oficial, paleta escura e verde, conceito comercial e funções de scripts.
- Ícone oficial KR Easy Extension aplicado ao launcher Android.
- Estrutura comercial alinhada com licença do mesmo produto, sem criar um projeto Firebase novo.
- Link manual `wa.me`; não executa automação de WhatsApp nem lê conversas.

## Implementado no app Flutter inicial

Dashboard, assistente local por scripts, central de scripts com favoritos/pesquisa/criação, cadastro local de clientes e etapas, catálogo, calculadoras, Radar baseado em dados locais, simulação Academy, indicadores Performance, lembretes internos, cópia/backup local e navegação Android nativa. Chave de licença e dados comerciais persistem criptografados via Android Keystore; dados legados em SharedPreferences migram para o armazenamento seguro ao abrir a atualização. O backup automático Android está desativado para evitar restauração sem a chave do aparelho.

A licença do aplicativo agora pode ser ativada, verificada e desvinculada pela API existente `/api/devices`. A ativação acontece somente após ação explícita da pessoa; ela ocupa um dos dois espaços compartilhados com a extensão Chrome. Não houve chamada de ativação durante o desenvolvimento.

## Parcial ou ainda sem integração

- O assistente é determinístico e local; não é IA conectada.
- CRM e catálogo são somente locais; não sincronizam com site, extensão ou banco remoto.
- Lembretes não agendam notificação do Android.
- Não há login por conta/e-mail. A licença é a forma de ativação; o aplicativo ainda não bloqueia todas as áreas comerciais quando não há licença, pois o modo de avaliação privado precisa ser alinhado com a política de distribuição.
- Administração/revogação de chave não está exposta no app. Deve passar pelo backend existente com autenticação administrativa.
- Fotos, importação, relatórios exportáveis em arquivo e sincronização entre dispositivos não estão implementados.
- APK debug compilado no GitHub Actions após adicionar a ativação de licença e armazenamento seguro (workflow `KR Easy Extension Android APK`, execução `40376159373`); análise do Flutter, testes unitários e build passaram.
- Instalação e validação funcional em aparelho Android ainda pendentes. O ambiente local não tem Flutter/Dart/Android SDK.

## Planejados

Teste privado por APK, geração da licença `review` (30 dias) já suportada pelo painel administrativo, definição de bloqueio por licença, sincronização gradual, notificação local, IA opcional via servidor e empacotamento futuro assinado para publicação comercial, sujeito a autorização específica.

## Segurança / produção

Nenhuma alteração foi feita no site, Firebase, produção, checkout ou licenças. O código deste app foi enviado à branch isolada `codex/android-native-flutter`; nenhum segredo foi copiado para a base Flutter. Para a próxima fase, continuar em branch isolada e testar contra ambiente separado.

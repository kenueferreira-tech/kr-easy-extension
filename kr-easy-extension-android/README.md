# KR Easy Extension — aplicativo Android nativo

Este diretório contém a primeira base Flutter do aplicativo Android. É uma aplicação Flutter com telas e código próprios; não incorpora `mobile.html`, WebView ou Trusted Web Activity.

## Compilar APK de teste

O workflow `Android APK` prepara o scaffold Android com Flutter stable, instala dependências, executa análise estática e testes, e publica um APK **debug** como artefato do GitHub Actions. O APK debug serve para instalação privada de testes. Ainda não usa uma chave de assinatura de distribuição.

Também é possível compilar localmente com Flutter instalado:

```bash
flutter create --platforms=android --org com.kenueferreira --project-name kr_easy_extension .
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
```

## O que esta versão já faz

- Dashboard com contagem derivada dos registros do aparelho.
- Copiloto local que escolhe scripts cadastrados por contexto. Não chama um modelo de IA.
- Biblioteca de scripts, pesquisa, categorias, favoritos e criação de script personalizado.
- Cadastro local de clientes, anotação, etapa comercial e valor potencial.
- Catálogo local de produtos e serviços.
- Calculadoras de lucro, margem, desconto, comissão e parcelamento simples sem juros.
- KR Radar priorizado a partir da etapa e data dos registros locais.
- KR Academy com simulação e critérios locais de avaliação.
- KR Performance com métricas calculadas dos dados registrados no app.
- Lembretes com seleção de data e marcação de conclusão. Nesta base, ficam como tarefas dentro do app; notificação do sistema ainda não está integrada.
- Abertura manual de conversa pelo link oficial `wa.me` e cópia de scripts.
- Exportação de backup JSON para a área de transferência.
- Dados comerciais persistidos localmente via `shared_preferences`.

## Proteção de dados

O aplicativo não inclui credenciais Firebase, chaves de IA, tokens administrativos ou certificados de assinatura. Os dados locais não estão criptografados por esta implementação inicial; não armazene dados pessoais sensíveis até acrescentarmos armazenamento protegido e sincronização autenticada. O backup é texto JSON e deve ser guardado com cuidado.

## Integrações ainda pendentes

O app não apresenta como concluídas integrações sem um endpoint confirmado. Antes de conectar contas e dados existentes, é preciso definir API autenticada para login, sincronização CRM/catálogo, licença privada, operações administrativas e IA. A extensão web consulta Firebase por hash de licença, mas a configuração consultada não confirmou URL de banco utilizável para o APK. A licença deve ser validada no backend e o modo de testes precisa ser isolado de licenças comerciais.

O painel administrativo permanece no site/backend atual. Não há operação privilegiada disponível no APK.

## Próxima sequência técnica

1. Obter/configurar um ambiente Flutter e executar o workflow numa branch de desenvolvimento.
2. Verificar configuração real do Firebase e do domínio oficial, sem copiar segredos para o cliente.
3. Implementar autenticação e validação server-side de licença para o ambiente privado.
4. Definir API versionada para sincronização seletiva dos dados e acesso por usuário.
5. Proteger persistência local, adicionar anexos/fotos e notificações Android.
6. Integrar modelo de IA somente por backend com limites e opção desativada por padrão.
7. Validar em aparelhos Android e preparar assinatura de APK privado; manter AAB como etapa futura.

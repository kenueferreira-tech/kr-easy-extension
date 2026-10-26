# KR Easy Extension — aplicativo Android nativo

Este diretório contém a primeira base Flutter do aplicativo Android. É uma aplicação Flutter com telas e código próprios; não incorpora `mobile.html`, WebView ou Trusted Web Activity.

## Build de teste

O workflow de APK usa o canal Flutter stable e gera uma compilação **debug** para distribuição privada. A dependência de notificações atual requer Flutter 3.38.1 ou superior, Android compile SDK 35 ou superior e Java 17; o scaffold configura compile SDK 36. O workflow executa `flutter analyze`, testes unitários e build do APK antes de publicar o artefato.

## Compilar APK de teste

O workflow `Android APK` prepara o scaffold Android com Flutter stable, instala dependências, executa análise estática e testes, e publica um APK **debug** como artefato do GitHub Actions. O APK debug serve para instalação privada de testes. Ainda não usa uma chave de assinatura de distribuição.

Também é possível compilar localmente com Flutter instalado:

```bash
mkdir -p /tmp/kr-source
cp pubspec.yaml /tmp/kr-source/pubspec.yaml
cp -R lib test /tmp/kr-source/
flutter create --platforms=android --org com.kenueferreira --project-name kr_easy_extension .
cp /tmp/kr-source/pubspec.yaml pubspec.yaml
cp -R /tmp/kr-source/lib/. lib/
python3 -c "from pathlib import Path; Path('test/widget_test.dart').unlink(missing_ok=True)"
cp -R /tmp/kr-source/test/. test/
python3 tool/prepare_android.py
flutter pub get
dart run flutter_launcher_icons
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
- Lembretes com seleção de data e horário, conclusão e notificações locais opcionais. A permissão é solicitada somente quando a pessoa ativa notificações; os avisos usam alarmes aproximados e podem atrasar conforme as políticas de bateria do Android.
- Abertura manual de conversa pelo link oficial `wa.me` e cópia de scripts.
- Exportação de backup JSON para a área de transferência.
- Dados comerciais persistidos no armazenamento seguro Android Keystore; dados antigos em `shared_preferences` são migrados ao abrir esta versão.
- Ícone oficial do KR Easy Extension nas dimensões launcher do Android.

## Proteção de dados

O aplicativo não inclui credenciais Firebase, chaves de IA, tokens administrativos ou certificados de assinatura. A chave de licença e os dados comerciais locais usam `flutter_secure_storage`, protegido pelo Android Keystore; o app desativa backup automático para evitar restaurar dados criptografados sem a chave do dispositivo. O backup exportado é texto JSON e deve ser guardado com cuidado.

O usuário pode desligar as notificações em `Mais > Lembretes`; isso cancela os avisos agendados sem apagar os lembretes salvos. Os avisos não usam alarmes exatos nem solicitam a permissão especial de alarmes exatos.

## Integrações ainda pendentes

O app não apresenta como concluídas integrações sem um endpoint confirmado. A ativação de licença reaproveita `POST /api/devices` com `register`, `list` e `remove`, que valida a chave no servidor Firebase e mantém o limite existente de dois dispositivos compartilhado com a extensão. Não há autenticação de conta por e-mail; a chave comercial é o meio de ativação. Login por usuário e sincronização CRM/catálogo continuam pendentes.

O painel administrativo permanece no site/backend atual. Não há operação privilegiada disponível no APK.

## Próxima sequência técnica

1. Obter uma chave de avaliação pelo painel administrativo; a licença de review atual expira em 30 dias e aceita até dois dispositivos.
2. Executar o workflow numa branch de desenvolvimento e testar ativação/desvinculação com essa chave.
3. Definir API versionada para sincronização seletiva do CRM/catálogo.
4. Adicionar anexos/fotos e notificações Android.
5. Integrar modelo de IA somente por backend com limites e opção desativada por padrão.
6. Validar em aparelhos Android e preparar assinatura de APK privado; manter AAB como etapa futura.

# KR Easy Extension — Configuração do Firebase em 5 minutos

Este módulo valida licenças pelo Firebase Realtime Database usando a API REST. As chaves não ficam salvas em texto puro no banco: o aplicativo consulta o hash SHA-256 da chave.

## 1. Criar o projeto

1. Acesse `https://console.firebase.google.com/` e clique em **Adicionar projeto**.
2. Use o nome **KR Easy Extension** e conclua a criação.
3. O Google Analytics é opcional para este projeto e pode ser desativado.

## 2. Criar o Realtime Database

1. No menu do projeto, abra **Criação > Realtime Database**.
2. Clique em **Criar banco de dados**.
3. Selecione a região mais próxima dos clientes.
4. Inicie no **modo bloqueado**.
5. Copie a URL exibida na parte superior da aba **Dados**. Ela terá um destes formatos:
   - `https://NOME-DO-PROJETO-default-rtdb.firebaseio.com`
   - `https://NOME-DO-PROJETO.REGIAO.firebasedatabase.app`

## 3. Aplicar as regras de segurança

1. Abra a aba **Regras** do Realtime Database.
2. Apague o conteúdo atual.
3. Cole todo o conteúdo do arquivo `database.rules.json`.
4. Clique em **Publicar**.

Essas regras bloqueiam a leitura geral do banco, bloqueiam todas as gravações feitas pelos aplicativos e permitem somente a consulta direta de um hash de licença válido. Alterações administrativas continuam sendo feitas no Console do Firebase.

## 4. Conectar a extensão e o mobile

Abra estes três arquivos:

- `kr-easy-extension/content.js`
- `kr-easy-extension/popup.js`
- `mobile.html`

Em cada arquivo, localize exatamente:

```js
const FIREBASE_DATABASE_URL = '';
```

Substitua somente as duas aspas vazias pela URL copiada no passo 2. Exemplo de formato final:

```js
const FIREBASE_DATABASE_URL = 'https://kr-easy-extension-default-rtdb.firebaseio.com';
```

Use a URL real mostrada no seu Console. O exemplo acima demonstra apenas o formato.

## 5. Gerar e cadastrar a primeira licença

1. Abra `gerador-de-licencas.html` no navegador.
2. Escolha o plano e clique em **Gerar nova licença**.
3. Guarde a **Chave para entregar ao cliente**. Ela não poderá ser recuperada pelo hash.
4. Copie o valor de `licenseHash` mostrado no JSON.
5. No Firebase, abra **Realtime Database > Dados** e crie o nó `licenses`.
6. Dentro de `licenses`, crie um nó cujo nome seja exatamente o `licenseHash`.
7. Dentro desse hash, cadastre os quatro campos mostrados em `record`:
   - `status`: `ativa`
   - `plan`: `vitalicio`
   - `createdAt`: data ISO gerada pela ferramenta
   - `expiresAt`: `null` para plano vitalício
8. Entregue ao comprador apenas a chave em texto, nunca o hash.

Estrutura final esperada:

```json
{
  "licenses": {
    "HASH_SHA256_DE_64_CARACTERES": {
      "status": "ativa",
      "plan": "vitalicio",
      "createdAt": "2026-09-10T12:00:00.000Z",
      "expiresAt": null
    }
  }
}
```

## Ativar, suspender ou cancelar

- Para ativar: defina `status` como `ativa`.
- Para suspender ou cancelar: defina `status` como `inativa`.
- Para remover definitivamente: exclua o nó do hash.
- Para uma licença com prazo: use uma data ISO futura em `expiresAt`, como `2027-09-10T23:59:59.000Z`.

## Teste final

1. Recarregue a extensão em `chrome://extensions` usando o botão **Atualizar**.
2. Abra ou atualize `https://web.whatsapp.com/`.
3. Digite a chave criada. O painel deve liberar o acesso.
4. Abra `mobile.html` em uma origem HTTPS e valide a mesma chave.
5. Altere o status para `inativa`, remova a licença local e tente novamente. O acesso deve ser recusado.

## Limites desta primeira versão

A configuração valida se uma chave existe e está ativa, mas não impede que o comprador compartilhe a chave. Vínculo por dispositivo, limite de ativações e painel administrativo exigem autenticação e lógica confiável no servidor, como Cloud Functions ou um backend próprio. Nunca coloque credenciais administrativas do Firebase dentro da extensão ou do HTML mobile.

## Arquivos do módulo

- `firebase-license-service.js`: cliente REST reutilizável e completo.
- `database.rules.json`: regras de leitura mínima e escrita bloqueada.
- `gerador-de-licencas.html`: gerador administrativo local de chave e hash.
- `GUIA-FIREBASE.md`: este guia.

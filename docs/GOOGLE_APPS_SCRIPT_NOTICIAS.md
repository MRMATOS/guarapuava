# Guia: Como Ativar a Sincronização de Notícias no Google Docs

Como o documento de notícias é mantido de forma **restrita/privada**, a sincronização automática é feita através do **Google Apps Script** que roda de forma nativa e segura dentro da sua conta do Google.

---

### Passo 1: Abrir o Editor de Scripts no Google Docs
1. Abra o documento **"Radar Guarapuava - Noticias, Atos e Eventos"** no Google Docs.
2. Na barra de menus superior, clique em **Extensões** ➔ **Apps Script**.

---

### Passo 2: Colar o Código do Sincronizador
1. No editor que abrir, apague qualquer código existente na janela.
2. Copie e cole todo o código abaixo (disponível também em [`scripts/google-apps-script-noticias.js`](file:///Users/rodrigomatos/Documents/guarapuava/scripts/google-apps-script-noticias.js)):

```javascript
function sincronizarNoticiasComServidor() {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();
  
  const numChildren = body.getNumChildren();
  const linhas = [];

  for (let i = 0; i < numChildren; i++) {
    const child = body.getChild(i);
    const type = child.getType();

    if (type === DocumentApp.ElementType.PARAGRAPH || type === DocumentApp.ElementType.LIST_ITEM) {
      const container = type === DocumentApp.ElementType.PARAGRAPH ? child.asParagraph() : child.asListItem();
      const text = container.getText().trim();
      if (!text) continue;

      let linkUrl = null;
      for (let j = 0; j < container.getNumChildren(); j++) {
        const elem = container.getChild(j);
        if (elem.getType() === DocumentApp.ElementType.TEXT) {
          const url = elem.asText().getLinkUrl();
          if (url) {
            linkUrl = url;
            break;
          }
        }
      }

      if (linkUrl && !text.includes(linkUrl)) {
        linhas.push(text + " (Link: " + linkUrl + ")");
      } else {
        linhas.push(text);
      }
    }
  }

  const conteudoCompleto = linhas.join("\n");
  const endpoint = "https://guarapuava-chi.vercel.app/api/webhooks/news-docs-sync";
  const tokenSecreto = "spk_sec_guarapuava_2026_mcp"; 

  const payload = {
    documento: doc.getName(),
    documentId: doc.getId(),
    conteudo: conteudoCompleto,
    dataAtualizacao: new Date().toISOString()
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": "Bearer " + tokenSecreto
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(endpoint, options);
    const statusCode = response.getResponseCode();
    Logger.log("Sincronização de notícias concluída. Status HTTP: " + statusCode);
    Logger.log("Resposta do servidor: " + response.getContentText());
  } catch (erro) {
    Logger.log("Erro ao enviar notícias: " + erro.toString());
  }
}
```

3. Clique no ícone de disquete (**Salvar projeto**) ou aperte `Cmd+S` / `Ctrl+S`.

---

### Passo 3: Executar o Primeiro Teste
1. No menu superior do Apps Script, verifique se a função `sincronizarNoticiasComServidor` está selecionada.
2. Clique no botão **Executar**.
3. Na primeira execução, o Google pedirá autorização para acessar o documento e fazer conexões de rede (`UrlFetchApp`). Clique em **Revisar permissões**, selecione sua conta e autorize.
4. No painel de **Registro de execução**, você verá:
   ```
   Sincronização de notícias concluída. Status HTTP: 200
   Resposta do servidor: {"status":"success", ...}
   ```

---

### Passo 4: (Opcional) Configurar Agendamento Automático (Gatilho)
Para que o documento envie automaticamente as atualizações para o portal:
1. No menu lateral esquerdo do Apps Script, clique no ícone de relógio (**Acionadores** / Triggers).
2. Clique em **+ Adicionar acionador** (canto inferior direito).
3. Preencha as configurações:
   - **Escolha a função a ser executada:** `sincronizarNoticiasComServidor`
   - **Selecione a origem do evento:** `Baseado em tempo`
   - **Selecione o tipo de acionador baseado em tempo:** `Cronômetro por minutos` (ou por horas)
   - **Selecione o intervalo de minutos:** `A cada 15 minutos` (ou `A cada 30 minutos`)
4. Clique em **Salvar**.

Pronto! Qualquer nova rodada com `DELTA FEED` ou atualização do `Card Principal do Dia` adicionada no documento será enviada instantaneamente e exibida no portal!

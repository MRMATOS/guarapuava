/**
 * =========================================================================
 * GOOGLE APPS SCRIPT: Sincronizador de Notícias de Guarapuava
 * =========================================================================
 * 
 * Como instalar no Google Docs:
 * 1. Abra o documento de notícias no Google Docs ("Radar Guarapuava").
 * 2. No menu superior, clique em "Extensões" > "Apps Script".
 * 3. Apague o código que estiver lá e cole todo este arquivo.
 * 4. Clique no ícone de disquete para salvar (ou Ctrl+S / Cmd+S).
 * 5. Clique em "Executar" para fazer o primeiro teste de sincronização.
 * 6. (Opcional para automação): Clique no ícone de relógio ("Acionadores" / Triggers)
 *    na barra lateral esquerda > "Adicionar acionador" >
 *    - Escolha a função: sincronizarNoticiasComServidor
 *    - Origem do evento: Baseado em tempo (Time-driven)
 *    - Tipo de acionador: Cronômetro por minutos (ex: a cada 15 ou 30 minutos).
 */

function sincronizarNoticiasComServidor() {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();
  
  const numChildren = body.getNumChildren();
  const linhas = [];

  for (let i = 0; i < numChildren; i++) {
    const child = body.getChild(i);
    const type = child.getType();

    // Lê tanto parágrafos quanto itens de lista
    if (type === DocumentApp.ElementType.PARAGRAPH || type === DocumentApp.ElementType.LIST_ITEM) {
      const container = type === DocumentApp.ElementType.PARAGRAPH ? child.asParagraph() : child.asListItem();
      const text = container.getText().trim();
      if (!text) continue;

      let linkUrl = null;
      for (let j = 0; j < container.getNumChildren(); j++) {
        const elem = container.getChild(j);
        if (elem.getType() === DocumentApp.ElementType.TEXT) {
          const textElem = elem.asText();
          const indices = textElem.getTextAttributeIndices();
          for (let k = 0; k < indices.length; k++) {
            const url = textElem.getLinkUrl(indices[k]);
            if (url && typeof url === 'string' && url.indexOf('http') === 0) {
              linkUrl = url;
              break;
            }
          }
          if (linkUrl) break;
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

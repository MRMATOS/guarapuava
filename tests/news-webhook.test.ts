import assert from 'node:assert/strict';

async function runWebhookTest() {
  const payload = {
    conteudo: `
Atualização em 07/10/2026 às 12:20
Seção 4: Bloco Delta Feed
DELTA FEED - [12:20]
[Saúde] Notícia nova: Teste webhook com sucesso. Fonte: Portal Webhook
Card Principal do Dia
Manchete: Teste de Webhook em Execução.
Saúde e Gestão: Teste ativo no portal.
`,
    documento: 'Radar Guarapuava Teste',
  };

  // Importa a rota dinamicamente
  const { POST } = await import('../src/app/api/webhooks/news-docs-sync/route');

  // Teste 1: Não autorizado (token errado)
  const unauthorizedReq = new Request('http://localhost:3000/api/webhooks/news-docs-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer token-invalido-xyz' },
    body: JSON.stringify(payload),
  });
  const unauthRes = await POST(unauthorizedReq);
  assert.equal(unauthRes.status, 401, 'Deve retornar 401 para token inválido');

  // Teste 2: Autorizado com token secreto válido
  const validSecret = process.env.DOCS_WEBHOOK_SECRET || 'spk_sec_guarapuava_2026_mcp';
  const authorizedReq = new Request('http://localhost:3000/api/webhooks/news-docs-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${validSecret}` },
    body: JSON.stringify(payload),
  });
  const authRes = await POST(authorizedReq);
  assert.equal(authRes.status, 200, 'Deve retornar 200 para token válido');
  const data = await authRes.json();
  assert.equal(data.status, 'success');
  assert.ok(data.totalDaysParsed >= 1);

  console.log('✅ Task 5 webhook endpoint tests passed');
}

runWebhookTest();

import assert from 'node:assert/strict';

const TEST_SECRET = 'test_mcp_secret_token_suite';
process.env.MCP_CLIENT_SECRET = TEST_SECRET;

import { GET, POST } from '../src/app/api/mcp/route';

async function runTests() {
  console.log('--- Test 1: Rejeição 401 sem autenticação (GET) ---');
  const unauthReq = new Request('http://localhost:3000/api/mcp', {
    method: 'GET',
  });
  const unauthRes = await GET(unauthReq);
  assert.equal(unauthRes.status, 401, 'Deve retornar 401 quando não autenticado');

  console.log('--- Test 2: Rejeição 401 sem autenticação (POST) ---');
  const unauthPostReq = new Request('http://localhost:3000/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });
  const unauthPostRes = await POST(unauthPostReq);
  assert.equal(unauthPostRes.status, 401, 'POST deve retornar 401 quando não autenticado');

  console.log('--- Test 3: Conexão autenticada GET /api/mcp ---');
  const authHeaders = {
    Authorization: `Bearer ${TEST_SECRET}`,
  };
  const getReq = new Request('http://localhost:3000/api/mcp', {
    method: 'GET',
    headers: authHeaders,
  });
  const getRes = await GET(getReq);
  assert.equal(getRes.status, 200, 'GET autenticado deve retornar 200');
  const contentType = getRes.headers.get('content-type') || '';
  assert.ok(contentType.includes('text/event-stream') || contentType.includes('application/json'));

  console.log('--- Test 4: POST /api/mcp tools/list autenticado ---');
  const listToolsReq = new Request('http://localhost:3000/api/mcp', {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    }),
  });
  const listToolsRes = await POST(listToolsReq);
  assert.equal(listToolsRes.status, 200);
  const listToolsBody = await listToolsRes.json();
  const toolNames = listToolsBody.result?.tools?.map((t: any) => t.name) || [];
  assert.ok(toolNames.includes('listar_vagas_ativas'));
  assert.ok(toolNames.includes('sincronizar_vagas'));

  console.log('✅ Todos os testes do endpoint MCP passaram com sucesso!');
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes do endpoint MCP:', err);
  process.exit(1);
});

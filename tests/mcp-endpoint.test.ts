import assert from 'node:assert/strict';
import { GET, POST } from '../src/app/api/mcp/route';

async function runTests() {
  console.log('--- Test 1: Rejeição 401 sem autenticação ---');
  const unauthReq = new Request('http://localhost:3000/api/mcp', {
    method: 'GET',
  });
  const unauthRes = await GET(unauthReq);
  assert.equal(unauthRes.status, 401, 'Deve retornar 401 quando não autenticado');

  console.log('--- Test 2: Conexão autenticada GET /api/mcp ---');
  const authHeaders = {
    Authorization: 'Bearer spk_sec_guarapuava_2026_mcp',
  };
  const getReq = new Request('http://localhost:3000/api/mcp', {
    method: 'GET',
    headers: authHeaders,
  });
  const getRes = await GET(getReq);
  assert.equal(getRes.status, 200, 'GET autenticado deve retornar 200');
  const contentType = getRes.headers.get('content-type') || '';
  assert.ok(contentType.includes('text/event-stream') || contentType.includes('application/json'));

  console.log('--- Test 3: POST /api/mcp tools/list ---');
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
  console.log('Ferramentas registradas:', listToolsBody.result?.tools?.map((t: any) => t.name));
  const toolNames = listToolsBody.result?.tools?.map((t: any) => t.name) || [];
  assert.ok(toolNames.includes('listar_vagas_ativas'));
  assert.ok(toolNames.includes('sincronizar_vagas'));

  console.log('--- Test 4: POST /api/mcp tools/call (listar_vagas_ativas) ---');
  const callReq = new Request('http://localhost:3000/api/mcp', {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'listar_vagas_ativas',
        arguments: {},
      },
    }),
  });
  const callRes = await POST(callReq);
  assert.equal(callRes.status, 200);
  const callBody = await callRes.json();
  assert.ok(callBody.result);
  console.log('Resultado da chamada tools/call:', callBody.result);

  console.log('✅ Todos os testes do endpoint MCP passaram com sucesso!');
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes do endpoint MCP:', err);
  process.exit(1);
});

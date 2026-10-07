import { NextRequest, NextResponse } from 'next/server';
import { registeredTools, executeMcpTool } from '@/lib/mcp/server';

const EXPECTED_SECRET = process.env.MCP_CLIENT_SECRET || 'spk_sec_guarapuava_2026_mcp';
const EXPECTED_CLIENT_ID = process.env.MCP_CLIENT_ID || 'guarapuava-spark-agent';

/**
 * Validação de segurança para requisições do Gemini Spark
 */
function isAuthorized(request: Request): boolean {
  const url = new URL(request.url);
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const queryToken = url.searchParams.get('token') || url.searchParams.get('secret') || '';
  const clientId = url.searchParams.get('clientId') || request.headers.get('x-client-id') || '';

  if (token === EXPECTED_SECRET || queryToken === EXPECTED_SECRET) {
    return true;
  }

  // Suporte a Basic Auth ou par ClientId/Secret
  if (authHeader.startsWith('Basic ')) {
    const creds = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString().split(':');
    if (creds[0] === EXPECTED_CLIENT_ID && creds[1] === EXPECTED_SECRET) {
      return true;
    }
  }

  return false;
}

/**
 * GET: Conexão SSE / Handshake do Cloud MCP
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Envia evento de endpoint MCP
      const endpointEvent = `event: endpoint\ndata: /api/mcp\n\n`;
      controller.enqueue(encoder.encode(endpointEvent));

      // Mantém heartbeat inicial
      const keepAlive = `event: ping\ndata: {}\n\n`;
      controller.enqueue(encoder.encode(keepAlive));
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

/**
 * POST: Troca de mensagens JSON-RPC 2.0 (tools/list, tools/call, etc.)
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, method, params } = body;

    // Resposta padrão JSON-RPC
    const rpcResponse = (result: any) =>
      NextResponse.json({
        jsonrpc: '2.0',
        id: id ?? null,
        result,
      });

    const rpcError = (code: number, message: string) =>
      NextResponse.json({
        jsonrpc: '2.0',
        id: id ?? null,
        error: { code, message },
      });

    switch (method) {
      case 'initialize':
        return rpcResponse({
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'guarapuava-jobs-mcp-server',
            version: '1.0.0',
          },
        });

      case 'notifications/initialized':
      case 'ping':
        return rpcResponse({});

      case 'tools/list':
        return rpcResponse({
          tools: registeredTools,
        });

      case 'tools/call': {
        const { name, arguments: toolArgs } = params || {};
        if (!name) {
          return rpcError(-32602, 'Nome da ferramenta não informado');
        }

        try {
          const result = await executeMcpTool(name, toolArgs);
          return rpcResponse(result);
        } catch (toolError: any) {
          return rpcResponse({
            content: [
              {
                type: 'text',
                text: `Erro ao executar ${name}: ${toolError?.message || String(toolError)}`,
              },
            ],
            isError: true,
          });
        }
      }

      default:
        return rpcError(-32601, `Método não encontrado: ${method}`);
    }
  } catch (err: any) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: `Erro ao processar JSON: ${err?.message}` },
      },
      { status: 400 }
    );
  }
}

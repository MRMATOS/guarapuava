import { NextRequest, NextResponse } from 'next/server';
import { registeredTools, executeMcpTool } from '@/lib/mcp/server';
import { safeTimingCompare, isValidHttpsUrl } from '@/lib/security';

function isAuthorized(request: Request): boolean {
  const expectedSecret = process.env.MCP_CLIENT_SECRET;
  const expectedClientId = process.env.MCP_CLIENT_ID || 'guarapuava-spark-agent';

  if (!expectedSecret) {
    console.error('CRITICAL: MCP_CLIENT_SECRET não configurado. Rejeitando todas as conexões MCP.');
    return false;
  }


  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // Validação Bearer Token
  if (token && safeTimingCompare(token, expectedSecret)) {
    return true;
  }

  // Validação Basic Auth
  if (authHeader.startsWith('Basic ')) {
    try {
      const creds = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString().split(':');
      const clientId = creds[0];
      const clientSecret = creds.slice(1).join(':');

      if (
        safeTimingCompare(clientId, expectedClientId) &&
        safeTimingCompare(clientSecret, expectedSecret)
      ) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * GET: Conexão SSE / Handshake do Cloud MCP (Requer Autenticação)
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const endpointEvent = `event: endpoint\ndata: /api/mcp\n\n`;
      controller.enqueue(encoder.encode(endpointEvent));

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
 * POST: Troca de mensagens JSON-RPC 2.0 (tools/list, tools/call, etc.) (Requer Autenticação)
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32000, message: 'Não autorizado. Forneça token Bearer válido.' },
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { id, method, params } = body;

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

        // Validação de segurança dos argumentos da ferramenta
        if (toolArgs?.vagas && Array.isArray(toolArgs.vagas)) {
          for (const vaga of toolArgs.vagas) {
            if (vaga.sourceUrl && !isValidHttpsUrl(vaga.sourceUrl)) {
              return rpcError(-32602, `URL inválida ou insegura para vaga: ${vaga.title}. Apenas HTTPS é permitido.`);
            }
          }
        }

        try {
          const result = await executeMcpTool(name, toolArgs);
          return rpcResponse(result);
        } catch (toolError: any) {
          console.error(`Erro ao executar ferramenta MCP ${name}:`, toolError);
          return rpcResponse({
            content: [
              {
                type: 'text',
                text: `Erro ao processar operação da ferramenta ${name}. Verifique os parâmetros informados.`,
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
        error: { code: -32700, message: 'Erro ao processar JSON da requisição.' },
      },
      { status: 400 }
    );
  }
}

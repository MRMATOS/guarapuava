import { NextResponse } from 'next/server';
import { runJobsCrawlerAgent } from '@/lib/gemini/agent';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Permite até 60 segundos de execução na Vercel

/**
 * Validação de segurança para rota de Cron
 */
function isAuthorized(request: Request): boolean {
  // Em ambiente local de desenvolvimento, permite disparo direto
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  const cronSecret = process.env.CRON_SECRET;
  const mcpSecret = process.env.MCP_CLIENT_SECRET;

  if (cronSecret && token === cronSecret) {
    return true;
  }

  if (mcpSecret && token === mcpSecret) {
    return true;
  }

  // Verifica cabeçalho especial da Vercel se configurado
  const vercelCronHeader = request.headers.get('x-vercel-cron');
  if (vercelCronHeader) {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const result = await runJobsCrawlerAgent();
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    console.error('Erro na execução do Cron de Vagas:', err);
    return NextResponse.json(
      {
        status: 'error',
        message: err?.message || 'Falha na execução do agente',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}

import { NextResponse } from 'next/server';
import { downloadAndSyncGoogleDoc } from '@/lib/docs/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Permite até 60s na Vercel

/**
 * Validação de segurança para a rota de Cron
 */
function isAuthorized(request: Request): boolean {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  const cronSecret = process.env.CRON_SECRET;
  const mcpSecret = process.env.MCP_CLIENT_SECRET;

  if (cronSecret && token === cronSecret) return true;
  if (mcpSecret && token === mcpSecret) return true;

  // Validação nativa do Vercel Cron
  if (request.headers.get('x-vercel-cron')) {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const result = await downloadAndSyncGoogleDoc();
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    console.error('Erro na sincronização do Google Docs via Cron:', err);
    return NextResponse.json(
      {
        status: 'error',
        message: err?.message || 'Falha na sincronização do documento',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}

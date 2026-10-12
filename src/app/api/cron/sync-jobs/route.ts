import { NextResponse } from 'next/server';
import { downloadAndSyncGoogleDoc } from '@/lib/docs/sync';
import { safeTimingCompare } from '@/lib/security';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Permite até 60s na Vercel

/**
 * Validação rigorosa de segurança para a rota de Cron de Vagas:
 * - A Vercel Cron envia Authorization: Bearer <CRON_SECRET> automaticamente
 * - Compara token usando algoritmo seguro de tempo constante
 */
function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ CRON_SECRET não configurado. Permitindo apenas em desenvolvimento.');
      return true;
    }
    console.error('CRITICAL: CRON_SECRET não configurado em produção. Negando disparo de cron.');
    return false;
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  return safeTimingCompare(token, cronSecret);
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
        message: 'Falha na sincronização do documento de vagas.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}

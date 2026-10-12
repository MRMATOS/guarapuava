import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { syncNewsFromText } from '@/lib/docs/news-sync';
import { safeTimingCompare } from '@/lib/security';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_PAYLOAD_CHARACTERS = 5 * 1024 * 1024; // 5 MB de texto

/**
 * Validação rigorosa de segurança para o webhook de sincronização de notícias do Google Docs
 */
function isAuthorized(request: Request): boolean {
  const validSecrets = [
    process.env.DOCS_WEBHOOK_SECRET,
    process.env.CRON_SECRET,
    process.env.MCP_CLIENT_SECRET,
  ].filter(Boolean) as string[];

  if (validSecrets.length === 0) {
    console.error('CRITICAL: Nenhum secret de webhook configurado. Negando acesso ao webhook de notícias.');
    return false;
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const customSecret = request.headers.get('x-webhook-secret')?.trim();

  for (const secret of validSecrets) {
    if (token && safeTimingCompare(token, secret)) return true;
    if (customSecret && safeTimingCompare(customSecret, secret)) return true;
  }

  return false;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { conteudo, documento, documentId } = body;

    if (!conteudo || typeof conteudo !== 'string') {
      return NextResponse.json(
        { error: 'Campo "conteudo" obrigatório em formato de texto' },
        { status: 400 }
      );
    }

    if (conteudo.length > MAX_PAYLOAD_CHARACTERS) {
      return NextResponse.json(
        { error: 'Payload excede o limite máximo permitido de 5 MB.' },
        { status: 413 }
      );
    }

    const docIdentifier = (documento || documentId || 'google-apps-script').slice(0, 100);

    const result = await syncNewsFromText(conteudo, docIdentifier);

    try {
      revalidatePath('/', 'page');
    } catch (revalErr) {
      console.warn('Aviso: Falha ao revalidar cache da home no webhook:', revalErr);
    }

    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    console.error('Erro no webhook de sincronização de notícias:', err);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Falha ao processar conteúdo do documento de notícias.',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    description: 'Endpoint de webhook para sincronização de notícias.',
    method: 'POST',
  });
}

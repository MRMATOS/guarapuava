import { NextResponse } from 'next/server';
import { syncNewsFromText } from '@/lib/docs/news-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Validação de segurança para o webhook de sincronização de notícias do Google Docs
 */
function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const customSecret = request.headers.get('x-webhook-secret')?.trim();

  const validSecrets = [
    process.env.CRON_SECRET,
    process.env.MCP_CLIENT_SECRET,
    process.env.DOCS_WEBHOOK_SECRET,
  ].filter(Boolean);

  if (token || customSecret) {
    if (token && validSecrets.includes(token)) return true;
    if (customSecret && validSecrets.includes(customSecret)) return true;
    return false;
  }

  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  if (validSecrets.length === 0) {
    console.warn('⚠️ Nenhum secret configurado para o webhook do Docs. Negando acesso em produção.');
    return false;
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

    const docIdentifier = documento || documentId || 'google-apps-script';

    const linesSample = conteudo.split(/\r?\n/).slice(0, 10).filter(Boolean);
    console.log(`📥 Webhook Notícias [${docIdentifier}]: Recebeu ${conteudo.length} caracteres. Exemplo:`, linesSample);

    const result = await syncNewsFromText(conteudo, docIdentifier);

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
        message: err?.message || 'Falha ao processar conteúdo do documento de notícias',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    description: 'Endpoint de webhook para Google Apps Script sincronizar notícias do Google Docs',
    method: 'POST',
  });
}

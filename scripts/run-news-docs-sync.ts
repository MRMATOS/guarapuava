import { downloadAndSyncGoogleDocsNews, syncNewsFromLocalDocx } from '../src/lib/docs/news-sync';

async function main() {
  console.log('=====================================================');
  console.log('📰 SINCRONIZADOR GOOGLE DOCS ➡️ SUPABASE (NOTÍCIAS)');
  console.log('=====================================================\n');

  const isLocal = process.argv.includes('--local');
  const startTime = Date.now();

  try {
    const result = isLocal
      ? await syncNewsFromLocalDocx('Radar Guarapuava - Noticias, Atos e Eventos.docx')
      : await downloadAndSyncGoogleDocsNews();

    console.log('\n---------------- RESULTADO DA SINCRONIZAÇÃO ----------------');
    console.log(`📄 Origem / ID: ${result.documentId}`);
    console.log(`🔍 Dias extraídos: ${result.totalDaysParsed}`);
    console.log(`⏱️ Lotes horários extraídos: ${result.totalBatchesParsed}`);
    console.log(`💾 Registros processados no Supabase: ${result.insertedOrUpdated}`);
    console.log(`🎉 Total de dias ativos no Supabase agora: ${result.daysInDb}`);
    console.log(`⏱️ Tempo decorrido: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log('=====================================================\n');
  } catch (err: any) {
    console.error('\n❌ Falha na sincronização de notícias:', err?.message || err);
    process.exit(1);
  }
}

main();

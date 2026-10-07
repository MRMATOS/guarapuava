import { downloadAndSyncGoogleDoc } from '../src/lib/docs/sync';

async function main() {
  console.log('=====================================================');
  console.log('📄 SINCRONIZADOR GOOGLE DOCS ➡️ SUPABASE (GUARAPUAVA)');
  console.log('=====================================================\n');

  const startTime = Date.now();

  try {
    const result = await downloadAndSyncGoogleDoc();

    console.log('\n---------------- RESULTADO DA SINCRONIZAÇÃO ----------------');
    console.log(`📄 ID do Documento: ${result.documentId}`);
    console.log(`🔍 Vagas extraídas no documento: ${result.totalParsed}`);
    console.log(`💾 Vagas processadas no Supabase: ${result.insertedOrUpdated}`);
    console.log(`🎉 Total de vagas ativas no Supabase agora: ${result.activeTotalInDb}`);
    console.log(`⏱️ Tempo decorrido: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log('=====================================================\n');
  } catch (err: any) {
    console.error('\n❌ Falha na sincronização:', err?.message || err);
    process.exit(1);
  }
}

main();

import { runJobsCrawlerAgent } from '../src/lib/gemini/agent';
import { listActiveJobs } from '../src/lib/supabase/jobs';

async function main() {
  console.log('=====================================================');
  console.log('🤖 AGENTE AUTÔNOMO GEMINI DE VAGAS - GUARAPUAVA PR');
  console.log('=====================================================\n');

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ ERRO: GEMINI_API_KEY não foi encontrada.');
    console.error('Adicione a chave no seu .env.local: GEMINI_API_KEY=sua_chave_aqui');
    process.exit(1);
  }

  const startTime = Date.now();
  console.log('Iniciando rastreamento com Google Search Grounding...\n');

  try {
    const result = await runJobsCrawlerAgent();

    console.log('\n---------------- RESULTADO DO CRAWLER ----------------');
    console.log(`🔍 Vagas encontradas pelo Gemini: ${result.totalFound}`);
    console.log(`✅ Vagas válidas no schema: ${result.totalValid}`);
    console.log(`💾 Vagas sincronizadas no Supabase: ${result.insertedOrUpdated}`);

    console.log('\n📋 Amostra de vagas processadas nesta execução:');
    result.jobs.slice(0, 5).forEach((j, i) => {
      console.log(`  ${i + 1}. [${j.company}] ${j.title}`);
      console.log(`     Link: ${j.sourceUrl}`);
      console.log(`     Data: ${j.publishedDate} | Modelo: ${j.workModel || 'Presencial'}`);
    });

    const activeTotal = await listActiveJobs(500);
    console.log(`\n🎉 Total geral de vagas ativas no Supabase agora: ${activeTotal.length}`);
    console.log(`⏱️ Tempo total de execução: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log('=====================================================');
  } catch (err: any) {
    console.error('\n❌ Falha na execução do agente:', err?.message || err);
    process.exit(1);
  }
}

main();

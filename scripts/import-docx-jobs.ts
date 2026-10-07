import fs from 'fs';
import path from 'path';
import { jobOpeningInputSchema } from '../src/lib/mcp/schema';
import { syncJobs, listActiveJobs } from '../src/lib/supabase/jobs';

async function importDocxJobs() {
  console.log('🚀 Iniciando importação das vagas do documento "Vagas de Emprego - Guarapuava PR.docx"...');

  const jsonPath = path.join(process.cwd(), 'scripts', 'extracted-jobs.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Arquivo ${jsonPath} não encontrado.`);
  }

  const rawJobs = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`📦 Total de vagas extraídas no arquivo: ${rawJobs.length}`);

  // Validar e normalizar via Zod
  const validatedJobs = [];
  for (let i = 0; i < rawJobs.length; i++) {
    try {
      const parsed = jobOpeningInputSchema.parse(rawJobs[i]);
      validatedJobs.push(parsed);
    } catch (err: any) {
      console.warn(`⚠️ Aviso na vaga #${i + 1} (${rawJobs[i]?.title}):`, err?.message);
    }
  }

  console.log(`✅ Vagas válidas após refinamento estrutural: ${validatedJobs.length}`);

  // Upsert em lotes (chunks de 50) para garantir estabilidade de rede
  const CHUNK_SIZE = 50;
  let totalProcessed = 0;

  for (let i = 0; i < validatedJobs.length; i += CHUNK_SIZE) {
    const chunk = validatedJobs.slice(i, i + CHUNK_SIZE);
    console.log(`⏳ Enviando lote ${Math.floor(i / CHUNK_SIZE) + 1} (${chunk.length} vagas)...`);

    const result = await syncJobs(chunk, false); // false para manter histórico cumulativo
    totalProcessed += chunk.length;
    console.log(`   ✓ Lote concluído: ${result.total} processadas.`);
  }

  console.log('\n🔍 Verificando total de vagas no Supabase...');
  const activeJobs = await listActiveJobs(500);
  console.log(`🎉 Total de vagas ativas atualmente no Supabase: ${activeJobs.length}`);
}

importDocxJobs().catch((err) => {
  console.error('❌ Erro na importação:', err);
  process.exit(1);
});

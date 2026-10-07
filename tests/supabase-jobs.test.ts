import assert from 'node:assert/strict';
import { listActiveJobs, syncJobs, deactivateJob } from '../src/lib/supabase/jobs';
import { JobOpeningInput } from '../src/lib/mcp/schema';

// Test against the actual live Supabase instance or mock
const testJob1: JobOpeningInput = {
  externalId: 'test-analista-sistemas-empresa-tech',
  title: 'Analista de Sistemas Pleno',
  company: 'Empresa Tech Guarapuava',
  location: 'Guarapuava - PR',
  publishedDate: '06/10/2026',
  sourceUrl: 'https://exemplo.com/vagas/analista',
  descriptionItems: ['Desenvolvimento fullstack', 'Bancos de dados'],
  requirementItems: ['TypeScript', 'Next.js'],
  benefitItems: ['VR R$ 40/dia', 'Unimed'],
  contractType: 'CLT',
  workModel: 'Híbrido',
  vacanciesCount: 1,
  isPcd: false,
  isPcdExclusive: false,
};

const testJob2: JobOpeningInput = {
  externalId: 'test-coordenador-vendas-sine',
  title: 'Coordenador(a) de Vendas',
  company: 'SINE Guarapuava',
  location: 'Guarapuava - PR',
  publishedDate: '06/10/2026',
  sourceUrl: 'https://gmaisnoticias.com/vagas-sine',
  descriptionItems: ['Coordenação de equipe'],
  requirementItems: ['Ensino superior'],
  benefitItems: [],
  contractType: 'CLT',
  workModel: 'Presencial',
  vacanciesCount: 1,
  isPcd: false,
  isPcdExclusive: false,
};

async function runTests() {
  console.log('--- Test 1: syncJobs (inserção inicial) ---');
  const result1 = await syncJobs([testJob1, testJob2], false);
  console.log('Resultado 1:', result1);
  assert.ok(result1.total >= 2);

  console.log('--- Test 2: listActiveJobs ---');
  const activeJobs = await listActiveJobs();
  console.log(`Vagas ativas encontradas: ${activeJobs.length}`);
  const found1 = activeJobs.find((j) => j.externalId === testJob1.externalId);
  assert.ok(found1, 'testJob1 deve estar presente nas vagas ativas');
  assert.equal(found1?.company, testJob1.company);
  assert.deepEqual(found1?.benefitItems, testJob1.benefitItems);

  console.log('--- Test 3: syncJobs idempotência (upsert sem duplicar) ---');
  const updatedJob1 = { ...testJob1, compensation: 'R$ 7.500,00' };
  const result2 = await syncJobs([updatedJob1], false);
  console.log('Resultado 2 (atualização):', result2);
  const activeJobsAfterUpdate = await listActiveJobs();
  const updatedFound1 = activeJobsAfterUpdate.find((j) => j.externalId === testJob1.externalId);
  assert.equal(updatedFound1?.compensation, 'R$ 7.500,00');

  console.log('--- Test 4: deactivateJob ---');
  await deactivateJob(testJob2.externalId);
  const activeJobsAfterDeactivate = await listActiveJobs();
  const deactivatedFound2 = activeJobsAfterDeactivate.find((j) => j.externalId === testJob2.externalId);
  assert.equal(deactivatedFound2, undefined, 'Vaga desativada não deve constar em listActiveJobs');

  // Limpeza: desativar testJob1 também
  await deactivateJob(testJob1.externalId);
  console.log('✅ Todos os testes de integração do Supabase passaram com sucesso!');
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes do Supabase:', err);
  process.exit(1);
});

import assert from 'node:assert/strict';
import { filterJobs } from '../src/lib/utils/search';
import { JobOpening } from '../src/types/job';

const mockJobsList: JobOpening[] = [
  {
    id: '1',
    externalId: 'vaga-1',
    title: 'Auxiliar de Cozinha',
    company: 'Restaurante A',
    location: 'Guarapuava - PR',
    publishedDate: '07/10/2026',
    descriptionItems: ['Preparo de pratos'],
    requirementItems: ['Sem experiência prévia'],
  },
  {
    id: '2',
    externalId: 'vaga-2',
    title: 'Cozinheiro Chefe',
    company: 'Restaurante B',
    location: 'Guarapuava - PR',
    publishedDate: '07/10/2026',
    descriptionItems: ['Liderança da cozinha'],
    requirementItems: ['Experiência comprovada de 2 anos'],
  },
  {
    id: '3',
    externalId: 'vaga-3',
    title: 'Atendente de Balcão',
    company: 'Café C',
    location: 'Guarapuava - PR',
    publishedDate: '07/10/2026',
    descriptionItems: ['Atendimento'],
    requirementItems: ['Não exige experiência'],
  },
  {
    id: '4',
    externalId: 'vaga-4',
    title: 'Gerente Geral',
    company: 'Hotel D',
    location: 'Guarapuava - PR',
    publishedDate: '07/10/2026',
    descriptionItems: ['Gestão geral'],
    requirementItems: ['Exige-se experiência em hotelaria'],
  },
];

function getDetailFeedJobs(
  allJobs: JobOpening[],
  filteredJobs: JobOpening[],
  selectedJob: JobOpening | null
): JobOpening[] {
  if (!selectedJob) return filteredJobs.length > 0 ? filteredJobs : allJobs;
  const existsInFiltered = filteredJobs.some(
    (j) => (j.id && j.id === selectedJob.id) || (j.externalId && j.externalId === selectedJob.externalId)
  );
  if (existsInFiltered) {
    return filteredJobs;
  }
  return [selectedJob, ...filteredJobs];
}

async function runTests() {
  console.log('--- Testando lógica do feed de vagas filtradas ---');

  // 1. Filtro sem experiência (experienceState = 2)
  const semExperiencia = filterJobs(mockJobsList, {
    query: '',
    contractState: 0,
    pcdState: 0,
    experienceState: 2,
  });

  assert.equal(semExperiencia.length, 2, 'Deve encontrar exatamente 2 vagas sem experiência');
  assert.equal(semExperiencia[0].id, '1');
  assert.equal(semExperiencia[1].id, '3');

  // 2. Feed detalhado quando usuário clica na vaga 3 (segunda vaga do filtro)
  const feedJobs = getDetailFeedJobs(mockJobsList, semExperiencia, semExperiencia[1]);
  assert.equal(feedJobs.length, 2, 'Feed de detalhes deve conter todas as vagas filtradas');
  assert.equal(feedJobs[0].id, '1', 'Primeira vaga do feed é a 1');
  assert.equal(feedJobs[1].id, '3', 'Segunda vaga do feed é a 3');

  // 3. Fallback se a vaga selecionada não estava nos filtros atuais
  const fallbackFeed = getDetailFeedJobs(mockJobsList, semExperiencia, mockJobsList[1]);
  assert.equal(fallbackFeed.length, 3, 'Deve incluir a vaga selecionada + as vagas filtradas');
  assert.equal(fallbackFeed[0].id, '2', 'A vaga selecionada deve estar presente');

  console.log('✅ Todos os testes de lógica do feed passaram com sucesso!');
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes:', err);
  process.exit(1);
});

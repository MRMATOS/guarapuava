import assert from 'node:assert/strict';
import {
  filterJobs,
  NEXT_JOB_CONTRACT_FILTER,
  JOB_CONTRACT_FILTER_LABELS,
  JobContractFilter,
} from '../src/lib/utils/search';
import { sortJobsByPublishedDate } from '../src/lib/utils/date';
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
    contractState: 'todos',
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

  // 4. Teste de ordenação por data de publicação (mais recente para mais antiga)
  const unsortedJobs: JobOpening[] = [
    {
      id: 'antiga',
      title: 'Vaga Antiga',
      company: 'Empresa 1',
      location: 'Guarapuava',
      publishedDate: '28/09/2026',
      descriptionItems: [],
      requirementItems: [],
    },
    {
      id: 'recente-tarde',
      title: 'Vaga Recente Fim da Tarde',
      company: 'Empresa 2',
      location: 'Guarapuava',
      publishedDate: '07/10/2026 às 18:00',
      descriptionItems: [],
      requirementItems: [],
    },
    {
      id: 'intermediaria',
      title: 'Vaga Intermediária',
      company: 'Empresa 3',
      location: 'Guarapuava',
      publishedDate: '02/10/2026',
      descriptionItems: [],
      requirementItems: [],
    },
    {
      id: 'recente-manha',
      title: 'Vaga Recente Manhã',
      company: 'Empresa 4',
      location: 'Guarapuava',
      publishedDate: '07/10/2026 às 09:00',
      descriptionItems: [],
      requirementItems: [],
    },
  ];

  const sorted = sortJobsByPublishedDate(unsortedJobs);
  assert.equal(sorted[0].id, 'recente-tarde', 'A vaga mais recente deve ser a primeira');
  assert.equal(sorted[1].id, 'recente-manha', 'A vaga de manhã do mesmo dia deve ser a segunda');
  assert.equal(sorted[2].id, 'intermediaria', 'A vaga intermediária deve ser a terceira');
  assert.equal(sorted[3].id, 'antiga', 'A vaga mais antiga deve ser a última');

  // 5. Teste de filtro por favoritas
  const favResult = filterJobs(mockJobsList, {
    query: '',
    contractState: 'todos',
    pcdState: 0,
    experienceState: 0,
    favoritesOnly: true,
    favoriteJobIds: ['vaga-1', 'vaga-4'],
  });
  assert.equal(favResult.length, 2, 'Deve retornar apenas as 2 vagas favoritas');
  assert.equal(favResult[0].id, '1');
  assert.equal(favResult[1].id, '4');

  // 6. Teste de filtro por tipo de contrato (semantic: 'todos', 'clt', 'pj', 'estagio')
  const contractTestJobs: JobOpening[] = [
    {
      id: 'clt-puro',
      title: 'Auxiliar Administrativo',
      company: 'Empresa A',
      location: 'Guarapuava - PR',
      descriptionItems: [],
      requirementItems: [],
      contractType: 'CLT',
      publishedDate: '07/10/2026',
    },
    {
      id: 'pj-puro',
      title: 'Desenvolvedor Frontend',
      company: 'Empresa B',
      location: 'Guarapuava - PR',
      descriptionItems: [],
      requirementItems: [],
      contractType: 'PJ/MEI',
      publishedDate: '07/10/2026',
    },
    {
      id: 'estagio-rotulado-clt',
      title: 'Estágio em Pedagogia - Sesc Guarapuava',
      company: 'Sesc',
      location: 'Guarapuava - PR',
      descriptionItems: [],
      requirementItems: [],
      contractType: 'CLT', // Registrado como CLT na base/agregador, mas é estágio!
      publishedDate: '07/10/2026',
    },
    {
      id: 'estagio-rotulado-estagio',
      title: 'Estágio Graduação - Administração',
      company: 'Prefeitura',
      location: 'Guarapuava - PR',
      descriptionItems: [],
      requirementItems: [],
      contractType: 'Estágio',
      publishedDate: '07/10/2026',
    },
    {
      id: 'estagiario-sem-acento',
      title: 'Estagiario de Suporte TI',
      company: 'Empresa C',
      location: 'Guarapuava - PR',
      descriptionItems: [],
      requirementItems: [],
      contractType: 'Outro',
      publishedDate: '07/10/2026',
    },
  ];

  // 6a. Todos (contractState = 'todos')
  const todosContratos = filterJobs(contractTestJobs, {
    query: '',
    contractState: 'todos',
    pcdState: 0,
    experienceState: 0,
  });
  assert.equal(todosContratos.length, 5, 'contractState = todos deve retornar todas as vagas');

  // 6b. CLT (contractState = 'clt') -> deve trazer apenas clt-puro e NÃO os estágios rotulados como CLT
  const cltOnly = filterJobs(contractTestJobs, {
    query: '',
    contractState: 'clt',
    pcdState: 0,
    experienceState: 0,
  });
  assert.equal(cltOnly.length, 1, 'contractState = clt deve retornar apenas CLT puro');
  assert.equal(cltOnly[0].id, 'clt-puro', 'Não deve incluir estágio mesmo se contractType="CLT"');

  // 6c. PJ (contractState = 'pj')
  const pjOnly = filterJobs(contractTestJobs, {
    query: '',
    contractState: 'pj',
    pcdState: 0,
    experienceState: 0,
  });
  assert.equal(pjOnly.length, 1, 'contractState = pj deve retornar apenas PJ');
  assert.equal(pjOnly[0].id, 'pj-puro');

  // 6d. Estágio (contractState = 'estagio') -> deve trazer todos os estágios identificados
  const estagioOnly = filterJobs(contractTestJobs, {
    query: '',
    contractState: 'estagio',
    pcdState: 0,
    experienceState: 0,
  });
  assert.equal(estagioOnly.length, 3, 'contractState = estagio deve retornar os 3 estágios');
  assert.deepEqual(
    estagioOnly.map((j) => j.id),
    ['estagio-rotulado-clt', 'estagio-rotulado-estagio', 'estagiario-sem-acento']
  );

  // 7. Teste de ciclo de transições e rótulos oficiais
  let current: JobContractFilter = 'todos';
  assert.equal(JOB_CONTRACT_FILTER_LABELS[current], 'Contrato');
  current = NEXT_JOB_CONTRACT_FILTER[current];
  assert.equal(current, 'clt');
  assert.equal(JOB_CONTRACT_FILTER_LABELS[current], 'CLT');
  current = NEXT_JOB_CONTRACT_FILTER[current];
  assert.equal(current, 'pj');
  assert.equal(JOB_CONTRACT_FILTER_LABELS[current], 'PJ');
  current = NEXT_JOB_CONTRACT_FILTER[current];
  assert.equal(current, 'estagio');
  assert.equal(JOB_CONTRACT_FILTER_LABELS[current], 'Estágio');
  current = NEXT_JOB_CONTRACT_FILTER[current];
  assert.equal(current, 'todos');

  console.log('✅ Todos os testes de lógica do feed passaram com sucesso!');
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes:', err);
  process.exit(1);
});

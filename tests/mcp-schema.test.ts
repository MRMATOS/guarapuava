import assert from 'node:assert/strict';
import { generateExternalId, jobOpeningSchema, syncJobsInputSchema } from '../src/lib/mcp/schema';

console.log('--- Test 1: generateExternalId ---');
const externalId = generateExternalId(
  'Coordenador(a) de Vendas - Equipe Comercial',
  'Comércio & Serviços / SINE',
  'https://gmaisnoticias.com/vagas-terca'
);
console.log('Generated externalId:', externalId);
assert.match(externalId, /^coordenador-a-de-vendas/);
assert.doesNotMatch(externalId, /[ÁÉÍÓÚáéíóúãõç&/()]/);

console.log('--- Test 2: syncJobsInputSchema defaults ---');
const parsedEmpty = syncJobsInputSchema.parse({
  vagas: [
    {
      title: 'Auxiliar de Cozinha',
      company: 'Restaurante Local',
      publishedDate: '06/10/2026',
      sourceUrl: 'https://exemplo.com/vaga-1',
      descriptionItems: ['Preparo de alimentos'],
      requirementItems: ['Ensino fundamental'],
    },
  ],
});
assert.equal(parsedEmpty.desativarNaoListadas, false, 'desativarNaoListadas deve ser false por padrão');
assert.equal(parsedEmpty.vagas[0].location, 'Guarapuava - PR');
assert.ok(parsedEmpty.vagas[0].externalId, 'externalId deve ser gerado se omitido');

console.log('--- Test 3: jobOpeningSchema required validation ---');
assert.throws(() => {
  jobOpeningSchema.parse({
    title: 'Vaga Sem Empresa',
    // company ausente
    publishedDate: '06/10/2026',
    sourceUrl: 'https://exemplo.com',
  });
}, /company/);

console.log('✅ Todos os testes de schema passaram com sucesso!');

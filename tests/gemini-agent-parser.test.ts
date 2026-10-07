import assert from 'node:assert/strict';
import { jobOpeningInputSchema } from '../src/lib/mcp/schema';

async function testGeminiParser() {
  console.log('--- Teste: Validação do Schema de Vagas do Agente Gemini ---');

  const sampleGeminiOutput = [
    {
      title: 'Auxiliar de Almoxarifado',
      company: 'Cooperativa Agrária Agroindustrial',
      location: 'Guarapuava - PR (Entre Rios)',
      workModel: 'Presencial',
      contractType: 'CLT',
      vacanciesCount: 2,
      isPcd: true,
      isPcdExclusive: false,
      publishedDate: '07/10/2026',
      applicationDeadline: '15/10/2026',
      compensation: 'A combinar',
      sourceUrl: 'https://agraria.gupy.io/job/98765',
      descriptionItems: [
        'Receber e conferir materiais',
        'Controle de estoque via WMS',
      ],
      requirementItems: [
        'Ensino Médio completo',
        'Residir em Guarapuava ou Entre Rios',
      ],
      benefitItems: [
        'Vale Alimentação',
        'Plano de Saúde',
        'Previdência Privada',
      ],
    },
    {
      title: 'Analista de Sistemas Jr',
      company: 'Empresa de Tecnologia de Guarapuava',
      location: 'Guarapuava - PR',
      workModel: 'Híbrido',
      contractType: 'CLT',
      vacanciesCount: 1,
      isPcd: false,
      publishedDate: '07/10/2026',
      sourceUrl: 'https://catho.com.br/vagas/12345',
      descriptionItems: ['Desenvolvimento frontend e backend'],
      requirementItems: ['Experiência com React e Node.js'],
    },
  ];

  for (const raw of sampleGeminiOutput) {
    const validated = jobOpeningInputSchema.parse(raw);
    assert.ok(validated.externalId, 'Deve gerar externalId automaticamente');
    assert.equal(validated.location, 'Guarapuava - PR' + (raw.location.includes('Entre Rios') ? ' (Entre Rios)' : ''));
    console.log(`✓ Vaga validada com sucesso: "${validated.title}" -> externalId: ${validated.externalId}`);
  }

  console.log('✅ Todos os testes do parser do Agente Gemini passaram com sucesso!');
}

testGeminiParser().catch((err) => {
  console.error('❌ Falha nos testes do parser do Agente Gemini:', err);
  process.exit(1);
});

import assert from 'node:assert/strict';
import { parseDocText, parseJobParagraphs } from '../src/lib/docs/parser';

function testJobParserWithPreCompanyRegistro() {
  const sampleDocText = `
Estágio Graduação - Secretariado Executivo - Prefeitura de Guarapuava (Link: https://www.catho.com.br/vagas/estagio-graduacao-secretariado-executivo-prefeitura-de-guarapuava-prefeitura-de-guar/38613280/)
• Registro no documento: Registrado em 16/10/2026 às 06:47
• Empresa Contratante: Prefeitura Municipal de Guarapuava (Gabinete e Secretarias)
• Modalidade e Contrato: Presencial / Estágio remunerado (Código Catho: 38613280)
• Remuneração e Benefícios: Bolsa-auxílio de R$ 1.500,00 mensais + auxílio-transporte
• Atribuições: Redação de ofícios, despachos, memorandos e circulares oficiais.

Estágio - Áreas Administrativas - Millpar (Link: https://millpar.vagas.solides.com.br/)
• Registro no documento: Registrado em 16/10/2026 às 06:47
• Empresa Contratante: Millpar (Av. Bento Munhoz da Rocha Neto, 5380 - Atalaia, Guarapuava - PR)
• Modalidade e Contrato: Presencial / Aberta também para PcD / Contrato de estágio
• Benefícios: Bolsa-auxílio de estágio, transporte fretado, alimentação na empresa.
• Atribuições: Suporte aos processos e rotinas operacionais dos setores.
`;

  const jobs = parseDocText(sampleDocText);

  assert.equal(jobs.length, 2, 'Deve extrair exatamente 2 vagas');

  const prefJob = jobs[0];
  assert.equal(
    prefJob.title,
    'Estágio Graduação - Secretariado Executivo - Prefeitura de Guarapuava',
    'O título da primeira vaga deve ser o cargo na prefeitura e NÃO o registro no documento'
  );
  assert.equal(
    prefJob.company,
    'Prefeitura Municipal de Guarapuava (Gabinete e Secretarias)'
  );
  assert.equal(
    prefJob.sourceUrl,
    'https://www.catho.com.br/vagas/estagio-graduacao-secretariado-executivo-prefeitura-de-guarapuava-prefeitura-de-guar/38613280/'
  );
  assert.equal(prefJob.registeredAt, 'Registrado em 16/10/2026 às 06:47');

  const millparJob = jobs[1];
  assert.equal(
    millparJob.title,
    'Estágio - Áreas Administrativas - Millpar',
    'O título da segunda vaga deve ser o cargo na Millpar e NÃO o registro no documento'
  );
  assert.equal(
    millparJob.company,
    'Millpar (Av. Bento Munhoz da Rocha Neto, 5380 - Atalaia, Guarapuava - PR)'
  );
  assert.equal(
    millparJob.sourceUrl,
    'https://millpar.vagas.solides.com.br/'
  );
  assert.equal(millparJob.registeredAt, 'Registrado em 16/10/2026 às 06:47');

  console.log('✅ Teste de parser com Registro no documento antes da Empresa passou com sucesso!');
}

testJobParserWithPreCompanyRegistro();

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseNewsDocText, parseNewsDocxBuffer } from '../src/lib/docs/news-parser';

const sampleNewsText = `
Atualização em 07/10/2026 às 12:20
Seção 1: Atos Oficiais
Texto aleatório de notícias antigas...
Seção 4: Bloco Delta Feed
DELTA FEED - [12:20]
(Alimentação de novidades do site - apenas fatos inéditos desta rodada)
[Saúde] Notícia nova: Unimed Guarapuava convoca assembleia para 22 de outubro. Fonte: Portal RSN
[Política] Notícia nova: Prefeitura publica Boletim Oficial 3510. Fonte: Prefeitura de Guarapuava
Card Principal do Dia
Manchete: Unimed Guarapuava convoca cooperados para criar Diretoria de Saúde.
Saúde e Gestão: Unimed propõe ampliação da Diretoria Executiva para 4 membros.
Atos Oficiais: Boletim Oficial nº 3510 detalha dispensas de servidores.
`;

function testParser() {
  const customSample = `
Atualização em 08/10/2026 às 09:00
DELTA FEED - [09:00]
[Saude] Notícia 1: Sem acento na categoria
[Saúde] Notícia 2: Com acento na categoria
[Transito] Notícia 3: Sem acento no trânsito
[Trânsito] Notícia 4: Com acento no trânsito
[Politica] Notícia 5: Sem acento na política
Card Principal do Dia
Manchete: Teste de normalização de categorias.
`;
  const normalizedDigests = parseNewsDocText(customSample);
  assert.equal(normalizedDigests.length, 1);
  const items = normalizedDigests[0].batches[0].items;
  assert.equal(items[0].category, 'Saúde');
  assert.equal(items[1].category, 'Saúde');
  assert.equal(items[2].category, 'Trânsito');
  assert.equal(items[3].category, 'Trânsito');
  assert.equal(items[4].category, 'Política');

  const digests = parseNewsDocText(sampleNewsText);
  assert.equal(digests.length, 1, 'Deve extrair 1 dia consolidado');
  const d = digests[0];
  assert.equal(d.date, '07/10/2026');
  assert.equal(d.lastUpdatedTime, '12:20');
  assert.equal(d.headline, 'Unimed Guarapuava convoca cooperados para criar Diretoria de Saúde.');
  assert.equal(d.highlights.length, 2, 'Deve extrair 2 destaques do card principal');
  assert.equal(d.batches.length, 1, 'Deve extrair 1 lote horário');
  assert.equal(d.batches[0].items.length, 2, 'Deve extrair 2 notícias do Delta Feed');
  assert.equal(d.batches[0].items[0].category, 'Saúde');
  assert.equal(d.batches[0].items[1].category, 'Política');
  console.log('✅ Task 2 parser unit test passed (including category canonicalization)');
}

async function testRealDocx() {
  const docPath = 'Radar Guarapuava - Noticias, Atos e Eventos.docx';
  if (fs.existsSync(docPath)) {
    const buf = fs.readFileSync(docPath);
    const digests = await parseNewsDocxBuffer(buf);
    assert.ok(digests.length >= 1, 'Deve extrair ao menos 1 dia do documento real');
    console.log(`✅ Extraídos ${digests.length} dias do docx real.`);
    digests.forEach((d) => {
      console.log(`   - Data: ${d.date} (${d.lastUpdatedTime}) | Manchete: "${d.headline.slice(0, 50)}..." | Batches: ${d.batches.length}`);
    });

    const day07 = digests.find((d) => d.date === '07/10/2026');
    assert.ok(day07, 'Deve conter o dia 07/10/2026');
    assert.ok(day07.batches.length > 0, 'Deve conter batches no dia 07/10/2026');
    console.log('✅ Task 2 real docx extraction test passed');
  }
}

async function runAll() {
  testParser();
  await testRealDocx();
}

runAll();

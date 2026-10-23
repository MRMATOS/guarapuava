import assert from 'node:assert/strict';
import {
  FIXED_NEWS_CATEGORIES,
  normalizeCategory,
  filterNewsHighlights,
} from '../src/lib/utils/search';
import { NewsItem } from '../src/types/news';

function testFixedCategories() {
  console.log('--- Testando lista de categorias fixas ---');
  assert.equal(FIXED_NEWS_CATEGORIES.length, 12, 'Devem existir exatamente 12 categorias fixas');
  assert.deepEqual(
    FIXED_NEWS_CATEGORIES,
    [
      'Clima',
      'Cultura',
      'Economia',
      'Educação',
      'Política',
      'Prazos',
      'Saúde',
      'Segurança',
      'Social',
      'Tecnologia',
      'Trânsito',
      'Outros',
    ],
    'A lista de categorias deve ser exatamente as 12 categorias canônicas em ordem alfabética'
  );
  console.log('✅ Lista de 12 categorias validada com sucesso');
}

function testTermsFromUserPrompt() {
  console.log('--- Testando termos citados pelo usuário ---');
  // Termos exatamente como mencionados na solicitação do usuário
  assert.equal(normalizeCategory('alimentação escolar'), 'Educação');
  assert.equal(normalizeCategory('atos e gestão pública'), 'Política');
  assert.equal(normalizeCategory('clima e serviços'), 'Clima');
  assert.equal(normalizeCategory('comunidade e empreendedorismo'), 'Social');
  assert.equal(normalizeCategory('comunidade e filantropia'), 'Social');
  assert.equal(normalizeCategory('cultura e festivais'), 'Cultura');
  assert.equal(normalizeCategory('gestão e serviços públicos'), 'Política');
  assert.equal(normalizeCategory('saúde e comunidade'), 'Saúde');
  assert.equal(normalizeCategory('saúde pública e extensão'), 'Saúde');
  assert.equal(normalizeCategory('serviços e clima'), 'Clima');
  assert.equal(normalizeCategory('trabalho e emprego'), 'Economia');
  console.log('✅ Todos os termos citados pelo usuário mapeados perfeitamente');
}

function testFiltering() {
  console.log('--- Testando filtragem de notícias ---');
  const mockItems: NewsItem[] = [
    {
      id: '1',
      category: 'Alimentação Escolar',
      title: 'Merenda Municipal',
      text: 'Cardápio reforçado nas escolas de Guarapuava.',
    },
    {
      id: '2',
      category: 'Trabalho e Emprego',
      title: 'Vagas na Agência',
      text: 'Novas contratações abertas.',
    },
    {
      id: '3',
      category: 'Qualquer Termo Desconhecido',
      title: 'Edição Especial',
      text: 'Informativo geral.',
    },
  ];

  // Filtro por Educação deve encontrar o item de Alimentação Escolar
  const educacaoItems = filterNewsHighlights(mockItems, '', 'Educação');
  assert.equal(educacaoItems.length, 1);
  assert.equal(educacaoItems[0].id, '1');

  // Filtro por Economia deve encontrar o item de Trabalho e Emprego
  const economiaItems = filterNewsHighlights(mockItems, '', 'Economia');
  assert.equal(economiaItems.length, 1);
  assert.equal(economiaItems[0].id, '2');

  // Filtro por Outros deve encontrar o item desconhecido
  const outrosItems = filterNewsHighlights(mockItems, '', 'Outros');
  assert.equal(outrosItems.length, 1);
  assert.equal(outrosItems[0].id, '3');

  console.log('✅ Filtragem por categoria canônica funcionando perfeitamente');
}

testFixedCategories();
testTermsFromUserPrompt();
testFiltering();

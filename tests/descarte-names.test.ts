import assert from 'node:assert/strict';
import { parseEndereco, withDisplayNames } from '../src/lib/descarte/names';
import type { DescarteItem } from '../src/types/descarte';

function item(id: string, empresa: string, endereco: string): DescarteItem {
  return { id, categoria: 'Cat', empresa, endereco, telefone: '(42) 0000-0000', maps_url: 'x' };
}

function names(items: DescarteItem[]): string[] {
  return withDisplayNames(items).map((i) => i.nomeExibicao || i.empresa);
}

async function runTests() {
  console.log('--- Testando desambiguação de nomes repetidos ---');

  // Extração de rua/bairro
  assert.deepEqual(parseEndereco('Rua XV de Novembro, 6793, Alto da XV'), { rua: 'XV de Novembro', numero: '6793', bairro: 'Alto da XV' });
  assert.deepEqual(parseEndereco('Av. Pref. Moacyr Júlio Silvestre, 1025, Centro'), { rua: 'Moacyr Júlio Silvestre', numero: '1025', bairro: 'Centro' });
  assert.deepEqual(parseEndereco('Av. Manoel Ribas, 3759 - Conradinho'), { rua: 'Manoel Ribas', numero: '3759', bairro: 'Conradinho' });
  assert.deepEqual(parseEndereco('Av. Sebastião Camargo Ribas, S/N, Industrial'), { rua: 'Sebastião Camargo Ribas', numero: 'S/N', bairro: 'Industrial' });

  // Caso do usuário: 4 medicamentos da Droga Raia
  const raia = [
    item('1', 'Farmácia Droga Raia', 'Rua XV de Novembro, 6793, Alto da XV'),
    item('2', 'Farmácia Droga Raia', 'Rua Saldanha Marinho, 1753, Centro'),
    item('3', 'Farmácia Droga Raia', 'Av. Pref. Moacyr Júlio Silvestre, 1025, Centro'),
    item('4', 'Farmácia Droga Raia', 'Av. Sebastião Camargo Ribas, S/N, Industrial'),
  ];
  assert.deepEqual(names(raia), [
    'Droga Raia - Alto da XV',
    'Droga Raia - Saldanha Marinho, Centro',
    'Droga Raia - Moacyr Júlio Silvestre, Centro',
    'Droga Raia - Industrial',
  ]);

  // Endereço idêntico duplicado não conta como repetição de bairro
  assert.deepEqual(
    names([
      item('1', 'Farmácia Droga Raia', 'Rua XV de Novembro, 6793, Alto da XV'),
      item('2', 'Farmácia Droga Raia', 'Rua Saldanha Marinho, 1753, Centro'),
      item('3', 'Farmácia Droga Raia', 'Rua XV de Novembro, 6793, Alto da XV'),
    ]),
    [
      'Droga Raia - Alto da XV',
      'Droga Raia - Centro',
      'Droga Raia - Alto da XV',
    ]
  );
  assert.deepEqual(
    names([
      item('1', 'Farmácia Nissei', 'Av. Manoel Ribas, 3759 - Conradinho'),
      item('2', 'Farmácia Nissei', 'Rua XV de Novembro, 7130 - Centro'),
    ]),
    ['Nissei - Conradinho', 'Nissei - Centro']
  );
  assert.deepEqual(
    names([
      item('1', 'Atacadão', 'Av. Dr. Aragão de Mattos Leão Filho, 293, Dos Estados'),
      item('2', 'Atacadão', 'Rua Conrado Kluber, 191, Conradinho'),
    ]),
    ['Atacadão - Dos Estados', 'Atacadão - Conradinho']
  );

  // Mesmo endereço repetido: não muda
  assert.deepEqual(
    names([
      item('1', 'Ecoponto', 'Rua Tamoios, 787, Vila Carli'),
      item('2', 'Ecoponto', 'Rua Tamoios, 787, Vila Carli'),
    ]),
    ['Ecoponto', 'Ecoponto']
  );

  // Nome único: não muda
  assert.deepEqual(
    names([item('1', 'Machadinho Pneus', 'Rua Grécia, 91, Industrial')]),
    ['Machadinho Pneus']
  );

  // Colisão rua+bairro: cai para número
  assert.deepEqual(
    names([
      item('1', 'Loja X', 'Rua XV de Novembro, 7575, Centro'),
      item('2', 'Loja X', 'Rua XV de Novembro, 7893, Centro'),
    ]),
    ['Loja X - XV de Novembro, 7575, Centro', 'Loja X - XV de Novembro, 7893, Centro']
  );

  console.log('✅ Nomes desambiguados OK');
}

runTests().catch((err) => {
  console.error('❌ Falha:', err);
  process.exit(1);
});

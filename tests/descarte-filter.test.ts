import assert from 'node:assert/strict';
import { filterDescarte, getCategorias, getLocais } from '../src/lib/descarte/filter';
import type { DescarteItem } from '../src/types/descarte';

const mock: DescarteItem[] = [
  { id: '1', categoria: 'Pilhas e Baterias', empresa: 'Casas Bahia', endereco: 'Rua XV de Novembro, 7575, Centro', telefone: '(42) 9 7603-0554', maps_url: 'https://maps/1' },
  { id: '2', categoria: 'Pneus inservíveis', empresa: 'Machadinho Pneus', endereco: 'Rua Grécia, 91, Industrial', telefone: '(42) 3624-8999', maps_url: 'https://maps/2' },
  { id: '3', categoria: 'Pilhas e Baterias', empresa: 'Banco SICOOB', endereco: 'Av. Manoel Ribas, 4167, Conradinho', telefone: '(42) 3622-4400', maps_url: 'https://maps/3' },
];

async function runTests() {
  console.log('--- Testando filtro de Descarte correto ---');

  const cats = getCategorias(mock);
  assert.deepEqual(cats, ['Pilhas e Baterias', 'Pneus inservíveis']);

  const locais = getLocais(mock);
  assert.deepEqual(locais, ['Banco SICOOB', 'Casas Bahia', 'Machadinho Pneus']);

  assert.equal(filterDescarte(mock, { query: '', categoria: null, local: null }).length, 3);
  assert.equal(filterDescarte(mock, { query: 'pilha', categoria: null, local: null }).length, 2);
  assert.equal(filterDescarte(mock, { query: 'machadinho', categoria: null, local: null }).length, 1);
  assert.equal(filterDescarte(mock, { query: 'grécia', categoria: null, local: null }).length, 1);
  assert.equal(filterDescarte(mock, { query: '', categoria: 'Pneus inservíveis', local: null }).length, 1);
  assert.equal(filterDescarte(mock, { query: '', categoria: null, local: 'Banco SICOOB' }).length, 1);
  assert.equal(filterDescarte(mock, { query: 'sicoob', categoria: 'Pilhas e Baterias', local: null }).length, 1);
  assert.equal(filterDescarte(mock, { query: 'sicoob', categoria: 'Pneus inservíveis', local: null }).length, 0);

  console.log('✅ Descarte filtro OK');
}

runTests().catch((err) => {
  console.error('❌ Falha:', err);
  process.exit(1);
});

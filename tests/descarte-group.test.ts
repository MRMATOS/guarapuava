import assert from 'node:assert/strict';
import { groupDescarteByCategoria } from '../src/lib/descarte/filter';
import type { DescarteItem } from '../src/types/descarte';

const mock: DescarteItem[] = [
  { id: '1', categoria: 'Pneus inservíveis', empresa: 'Machadinho Pneus', endereco: 'Rua Grécia, 91', telefone: '(42) 3624-8999', maps_url: 'https://maps/2' },
  { id: '2', categoria: 'Pilhas e Baterias', empresa: 'Casas Bahia', endereco: 'Rua XV, 7575', telefone: '(42) 9 7603-0554', maps_url: 'https://maps/1' },
  { id: '3', categoria: 'Pilhas e Baterias', empresa: 'Banco SICOOB', endereco: 'Av. Manoel Ribas, 4167', telefone: '(42) 3622-4400', maps_url: 'https://maps/3' },
];

async function runTests() {
  const groups = groupDescarteByCategoria(mock);
  assert.deepEqual(groups.map((g) => g.categoria), ['Pilhas e Baterias', 'Pneus inservíveis']);
  assert.deepEqual(groups[0].items.map((i) => i.empresa), ['Banco SICOOB', 'Casas Bahia']);
  console.log('✅ Agrupamento OK');
}

runTests().catch((err) => {
  console.error('❌ Falha:', err);
  process.exit(1);
});

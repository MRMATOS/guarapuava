import assert from 'node:assert/strict';
import { applyRenames, OBSERVACAO_COLETA_INCERTA } from '../src/lib/descarte/renames';
import { filterDescarte } from '../src/lib/descarte/filter';
import type { DescarteItem } from '../src/types/descarte';

function item(id: string, empresa: string, endereco: string): DescarteItem {
  return { id, categoria: 'Pilhas e Baterias', empresa, endereco, telefone: '(42) 0000-0000', maps_url: 'x' };
}

const mock: DescarteItem[] = [
  item('1', 'Rede Superpão - Loja 09 - Alto da XV', 'Rua XV de Novembro, 6686, Alto da XV'),
  item('2', 'Rede Superpão - Loja 03 - Saldanha', 'Rua Saldanha Marinho, 973, Santa Cruz'),
  item('3', 'Rede Superpão - Loja 14 - Centro', 'Av. Pref. Moacyr Júlio Silvestre, 901, Centro'),
  item('4', 'Rede Superpão - Loja 06 - Morro Alto', 'Rua Treze de Junho, 1028, Morro Alto'),
  item('5', 'Machadinho Pneus', 'Rua Grécia, 91, Industrial'),
];

async function runTests() {
  console.log('--- Testando renomeação Superpão/Muffato ---');

  const out = applyRenames(mock);
  assert.equal(out[0].nomeExibicao, 'Super Muffato – XV de Novembro');
  assert.equal(out[1].nomeExibicao, 'Super Muffato – Saldanha Marinho');
  assert.equal(out[2].nomeExibicao, 'Super Muffato – Centro');
  assert.equal(out[3].nomeExibicao, 'Max Atacadista – Morro Alto');
  assert.equal(out[0].nomeAntigo, 'Rede Superpão - Loja 09 - Alto da XV');
  assert.equal(out[0].coletaIncerta, true);
  assert.equal(out[4].nomeExibicao, undefined);
  assert.equal(out[4].coletaIncerta, undefined);
  assert.ok(OBSERVACAO_COLETA_INCERTA.includes('ainda não foi confirmada'));

  // Busca acha pelo nome novo e pelo antigo
  const renamed = applyRenames(mock);
  assert.deepEqual(
    filterDescarte(renamed, { query: 'muffato', categoria: null, local: null }).map((i) => i.id),
    ['1', '2', '3']
  );
  assert.deepEqual(
    filterDescarte(renamed, { query: 'max atacadista', categoria: null, local: null }).map((i) => i.id),
    ['4']
  );
  assert.deepEqual(
    filterDescarte(renamed, { query: 'superpao', categoria: null, local: null }).map((i) => i.id),
    ['1', '2', '3', '4']
  );

  console.log('✅ Renomeação OK');
}

runTests().catch((err) => {
  console.error('❌ Falha:', err);
  process.exit(1);
});

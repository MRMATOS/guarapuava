import assert from 'node:assert/strict';
import { filterDescarte } from '../src/lib/descarte/filter';
import { matchesLoose } from '../src/lib/descarte/search';
import type { DescarteItem } from '../src/types/descarte';

const mock: DescarteItem[] = [
  { id: 'c1', categoria: 'Resíduos de Construção Civil', empresa: 'Ecoponto', endereco: 'Rua Tamoios, 787, Vila Carli', telefone: '(42) 3142-1800', maps_url: 'x' },
  { id: 'v1', categoria: 'Resíduos Verdes', empresa: 'SURG', endereco: 'Rua Afonso Botelho, 63, Trianon', telefone: '(42) 3630-0500', maps_url: 'x' },
  { id: 'e1', categoria: 'Eletrônicos inservíveis (pequeno volume)', empresa: 'Casas Bahia', endereco: 'Rua XV de Novembro, 7575, Centro', telefone: '(42) 9 7603-0554', maps_url: 'x' },
  { id: 'p1', categoria: 'Pneus inservíveis', empresa: 'Machadinho Pneus', endereco: 'Rua Grécia, 91, Industrial', telefone: '(42) 3624-8999', maps_url: 'x' },
  { id: 'o1', categoria: 'Óleo Vegetal', empresa: 'GRT', endereco: 'Rua Manoel Alves, 290, Distrito Industrial', telefone: '(42) 3624-6464', maps_url: 'x' },
  { id: 'm1', categoria: 'Medicamentos vencidos ou em desuso e suas embalagens', empresa: 'Farmácia Nissei', endereco: 'Av. Manoel Ribas, 3759, Conradinho', telefone: '(41) 4004-4041', maps_url: 'x' },
];

function ids(query: string): string[] {
  return filterDescarte(mock, { query, categoria: null, local: null }).map((i) => i.id);
}

async function runTests() {
  console.log('--- Testando busca com palavras-chave e tolerância ---');

  // Palavras-chave anexadas à categoria (sem mudar o visual)
  assert.deepEqual(ids('tijolos'), ['c1'], 'tijolos deve achar construção civil');
  assert.deepEqual(ids('folhagem'), ['v1'], 'folhagem deve achar resíduos verdes');
  assert.deepEqual(ids('remedio vencido'), ['m1'], 'remedio sem acento deve achar medicamentos');

  // Sem acento
  assert.deepEqual(ids('oleo de cozinha'), ['o1'], 'sem acento deve achar óleo vegetal');

  // Erro de digitação
  assert.deepEqual(ids('tijols'), ['c1'], 'typo tijols deve achar tijolos');
  assert.deepEqual(ids('celuar'), ['e1'], 'typo celuar deve achar celular');

  // Palavras juntas
  assert.deepEqual(ids('pneuvelho'), ['p1'], 'pneuvelho junto deve achar pneu velho');

  // Sem falso positivo
  assert.deepEqual(ids('xyzqw'), [], 'lixo não deve achar nada');

  // Matcher puro
  assert.equal(matchesLoose('tijols', 'tijolos quebrados'), true);
  assert.equal(matchesLoose('xyz', 'tijolos quebrados'), false);
  assert.equal(matchesLoose('OLEO', 'óleo vegetal'), true);

  console.log('✅ Busca tolerante OK');
}

runTests().catch((err) => {
  console.error('❌ Falha:', err);
  process.exit(1);
});

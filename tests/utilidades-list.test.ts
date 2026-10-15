import assert from 'node:assert/strict';
import { getUtilidades } from '../src/lib/utilidades/list';

async function runTests() {
  const list = getUtilidades();
  assert.ok(list.length >= 2, 'Deve ter ao menos 2 utilidades');
  assert.deepEqual(list.map((u) => u.href), ['/utilidades/onibus', '/utilidades/descarte']);
  assert.ok(list.every((u) => u.titulo && u.descricao && u.id));
  console.log('✅ Utilidades list OK');
}

runTests().catch((err) => {
  console.error('❌ Falha:', err);
  process.exit(1);
});

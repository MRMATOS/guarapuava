import assert from 'node:assert/strict';

function getFilterBarDisplay(reportCount: number) {
  const hasNoReports = reportCount <= 0;
  const isSingleReport = reportCount === 1;

  if (hasNoReports) {
    return { count: null, label: 'Sem relatos' };
  }
  return {
    count: reportCount,
    label: isSingleReport ? 'relato ativo' : 'relatos ativos',
  };
}

console.log('--- Testando lógica adaptativa de relatos no FilterBar ---');

// Caso 0: sem número, apenas "Sem relatos"
const zero = getFilterBarDisplay(0);
assert.equal(zero.count, null);
assert.equal(zero.label, 'Sem relatos');

// Caso negativo (fallback de segurança)
const negative = getFilterBarDisplay(-1);
assert.equal(negative.count, null);
assert.equal(negative.label, 'Sem relatos');

// Caso 1: singular, com número 1 e "relato ativo"
const one = getFilterBarDisplay(1);
assert.equal(one.count, 1);
assert.equal(one.label, 'relato ativo');

// Caso 2+: plural, com número e "relatos ativos"
const two = getFilterBarDisplay(2);
assert.equal(two.count, 2);
assert.equal(two.label, 'relatos ativos');

const ten = getFilterBarDisplay(10);
assert.equal(ten.count, 10);
assert.equal(ten.label, 'relatos ativos');

console.log('✅ Casos zero, singular e plural validados com sucesso');

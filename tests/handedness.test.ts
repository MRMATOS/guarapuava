// tests/handedness.test.ts
import assert from 'node:assert/strict';

function toggleMode(current: 'right' | 'left'): 'right' | 'left' {
  return current === 'left' ? 'right' : 'left';
}

function getCardTitle(current: 'right' | 'left'): string {
  return current === 'left' ? 'Modo Destro' : 'Modo Canhoto';
}

function reverseDockOrder<T>(items: T[], isLeftHanded: boolean): T[] {
  return isLeftHanded ? [...items].reverse() : items;
}

console.log('--- Testando lógica de Destro e Canhoto ---');

assert.equal(toggleMode('right'), 'left');
assert.equal(toggleMode('left'), 'right');
assert.equal(getCardTitle('right'), 'Modo Canhoto');
assert.equal(getCardTitle('left'), 'Modo Destro');

const normalDock = ['mais', 'noticias', 'vagas', 'voltar'];
assert.deepEqual(reverseDockOrder(normalDock, false), ['mais', 'noticias', 'vagas', 'voltar']);
assert.deepEqual(reverseDockOrder(normalDock, true), ['voltar', 'vagas', 'noticias', 'mais']);

console.log('✅ Handedness logic tests passed');

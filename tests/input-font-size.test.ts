import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Testa se os inputs de busca dos filtros têm fonte >= 16px para evitar auto-zoom no iOS Safari
const filesToCheck = [
  'src/components/ui/FilterPanel.tsx',
  'src/components/bus/BusFilterPanel.tsx',
  'src/components/DetailedFeed.tsx',
  'src/app/globals.css',
];

console.log('--- Testando tamanhos de fonte dos inputs contra zoom no iOS ---');

for (const relPath of filesToCheck) {
  const fullPath = path.resolve(process.cwd(), relPath);
  const content = fs.readFileSync(fullPath, 'utf8');

  if (relPath.endsWith('globals.css')) {
    // globals.css deve definir font-size: 16px na classe .filter-input
    assert.match(
      content,
      /\.filter-input\s*\{[\s\S]*?font-size:\s*16px/,
      `.filter-input em ${relPath} deve declarar font-size: 16px para garantir proteção no iOS`
    );
  } else {
    // Nenhum input de busca deve conter tamanhos menores que 16px (como 14px ou 14.5px)
    assert.doesNotMatch(
      content,
      /filter-input[^"'>]*\btext-\[(1[0-5](\.\d+)?px)\]/,
      `Input em ${relPath} não deve usar font-size menor que 16px`
    );

    // Deve conter text-[16px] ou text-base
    assert.match(
      content,
      /filter-input[^"'>]*\b(text-\[16px\]|text-base)/,
      `Input em ${relPath} deve declarar text-[16px] ou text-base`
    );
  }
}

console.log('✅ Todos os inputs de busca estão configurados com fonte >= 16px contra zoom no iOS!');

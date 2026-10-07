import assert from 'node:assert/strict';
import { syncNewsDigests, listActiveNewsDigests, getNewsDigestByDate } from '../src/lib/supabase/news';
import { DailyDigest } from '../src/types/news';
import { supabaseAdmin } from '../src/lib/supabase/client';

const testDate = '31/12/2099';
const testDateIso = '2099-12-31';

const testDigest: DailyDigest = {
  date: testDate,
  dateIso: testDateIso,
  lastUpdatedTime: '23:59',
  headline: 'Manchete de Teste Integração Supabase',
  highlights: [{ id: 'h-test', category: 'Geral', title: 'Geral', text: 'Texto de teste' }],
  batches: [{
    id: 'batch-test',
    date: testDate,
    time: '23:59',
    items: [{ id: 'item-test', category: 'Geral', title: 'Item Teste', text: 'Descrição teste' }]
  }],
};

async function runRepoTests() {
  try {
    // 1. Sincroniza (upsert)
    const syncResult = await syncNewsDigests([testDigest]);
    assert.equal(syncResult.upserted, 1, 'Deve ter inserido/atualizado 1 registro');

    // 2. Consulta por data
    const found = await getNewsDigestByDate(testDate);
    assert.ok(found, 'Deve encontrar o digest inserido');
    assert.equal(found?.headline, testDigest.headline);
    assert.equal(found?.batches.length, 1);

    // 3. Consulta lista ativa
    const list = await listActiveNewsDigests(10);
    assert.ok(list.some(d => d.date === testDate), 'Lista ativa deve conter o digest de teste');

    console.log('✅ Task 3 Supabase repository integration tests passed');
  } finally {
    // Limpeza do registro de teste
    await supabaseAdmin.from('news_digests').delete().eq('date', testDate);
  }
}

runRepoTests();

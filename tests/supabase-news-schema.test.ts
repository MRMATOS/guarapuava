import assert from 'node:assert/strict';
import { DatabaseNewsDigestRow } from '../src/types/news';

function testSchemaTypes() {
  const mockRow: DatabaseNewsDigestRow = {
    id: 'test-uuid-1',
    date: '07/10/2026',
    date_iso: '2026-10-07',
    last_updated_time: '12:20',
    headline: 'Manchete de Teste',
    highlights: [{ id: 'h1', category: 'Saúde', title: 'Saúde', text: 'Descrição' }],
    batches: [{ id: 'b1', date: '07/10/2026', time: '12:20', items: [] }],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  assert.equal(mockRow.date, '07/10/2026');
  assert.equal(mockRow.date_iso, '2026-10-07');
  console.log('✅ Task 1 schema types verified');
}

testSchemaTypes();

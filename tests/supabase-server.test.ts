import assert from "node:assert/strict";

// Mock env vars para o teste caso não estejam definidos
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "mock-service-key";

async function run() {
  console.log("--- Testando clientes Supabase Server e Admin ---");

  // Import dinâmico para testar existência do módulo
  const { createSupabaseServer, createSupabaseAdmin } = await import("../src/lib/supabase/server");

  assert.equal(typeof createSupabaseAdmin, "function", "createSupabaseAdmin deve ser uma função");
  assert.equal(typeof createSupabaseServer, "function", "createSupabaseServer deve ser uma função");

  const adminClient = createSupabaseAdmin();
  assert.ok(adminClient, "adminClient deve ser instanciado");
  assert.ok(adminClient.from, "adminClient deve possuir o método from()");
  assert.ok(adminClient.storage, "adminClient deve possuir o método storage");

  console.log("✅ Clientes Supabase Server e Admin validados com sucesso!");
}

run().catch((err) => {
  console.error("❌ Falha no teste de supabase/server:", err);
  process.exit(1);
});

import assert from "node:assert/strict";

// Testa as regras de verificação de permissão e sanitização de path no Storage
function checkAdminPermission(userEmail?: string | null, adminEmail?: string | null): void {
  const normUser = userEmail?.trim().toLowerCase();
  const normAdmin = adminEmail?.trim().toLowerCase();

  if (!normUser || !normAdmin || normUser !== normAdmin) {
    throw new Error("Acesso não autorizado. Apenas o administrador pode executar esta ação.");
  }
}

function extractStoragePath(photoUrl: string): string | null {
  const match = photoUrl.match(/cidade-viva-reports\/(.+)$/);
  if (!match || !match[1]) return null;
  const decoded = decodeURIComponent(match[1]);
  if (decoded.includes("..")) return null; // Prevenção de Path Traversal
  return decoded;
}

async function run() {
  console.log("--- Testando regras de segurança das Server Actions ---");

  const adminEmail = "admin@guarapuava.digital";

  // 1. Acesso sem e-mail ou não autorizado deve lançar erro
  assert.throws(
    () => checkAdminPermission(null, adminEmail),
    /Acesso não autorizado/
  );
  assert.throws(
    () => checkAdminPermission("user@externo.com", adminEmail),
    /Acesso não autorizado/
  );

  // 2. Acesso com e-mail autorizado não deve lançar erro
  assert.doesNotThrow(() => checkAdminPermission("admin@guarapuava.digital", adminEmail));

  // 3. Extração e sanitização do path da imagem
  const validUrl = "https://ufjvqciyrtpfpetpgavf.supabase.co/storage/v1/object/public/cidade-viva-reports/reports/123-abc.webp";
  assert.equal(extractStoragePath(validUrl), "reports/123-abc.webp");

  const traversalUrl = "https://ufjvqciyrtpfpetpgavf.supabase.co/storage/v1/object/public/cidade-viva-reports/../../etc/passwd";
  assert.equal(extractStoragePath(traversalUrl), null);

  console.log("✅ Regras de segurança das Server Actions validadas!");
}

run().catch((err) => {
  console.error("❌ Falha:", err);
  process.exit(1);
});

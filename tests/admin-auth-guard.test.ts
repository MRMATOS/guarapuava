import assert from "node:assert/strict";

// Testa a lógica de autorização e proteção das rotas de admin
function isAuthorizedAdmin(email?: string | null, adminEmail?: string | null): boolean {
  if (!email || !adminEmail) return false;
  return email.trim().toLowerCase() === adminEmail.trim().toLowerCase();
}

function resolveAuthCallbackRedirect(
  origin: string,
  userEmail?: string | null,
  adminEmail?: string | null
): { redirectUrl: string; authorized: boolean } {
  if (isAuthorizedAdmin(userEmail, adminEmail)) {
    return {
      redirectUrl: `${origin}/admin/cidade-viva`,
      authorized: true,
    };
  }
  return {
    redirectUrl: `${origin}/admin/login?error=unauthorized`,
    authorized: false,
  };
}

async function run() {
  console.log("--- Testando regras do guardião de autenticação de admin ---");

  const validAdmin = "admin@guarapuava.digital";

  // 1. E-mail correto deve autorizar
  assert.equal(isAuthorizedAdmin("admin@guarapuava.digital", validAdmin), true);
  assert.equal(isAuthorizedAdmin("ADMIN@guarapuava.digital", validAdmin), true);

  // 2. E-mail incorreto deve rejeitar
  assert.equal(isAuthorizedAdmin("outro@usuario.com", validAdmin), false);
  assert.equal(isAuthorizedAdmin(null, validAdmin), false);
  assert.equal(isAuthorizedAdmin("", validAdmin), false);

  // 3. Resolução de redirecionamento no callback
  const authRes = resolveAuthCallbackRedirect("https://guarapuava.digital", validAdmin, validAdmin);
  assert.equal(authRes.authorized, true);
  assert.equal(authRes.redirectUrl, "https://guarapuava.digital/admin/cidade-viva");

  const unauthRes = resolveAuthCallbackRedirect("https://guarapuava.digital", "invasor@teste.com", validAdmin);
  assert.equal(unauthRes.authorized, false);
  assert.equal(unauthRes.redirectUrl, "https://guarapuava.digital/admin/login?error=unauthorized");

  console.log("✅ Lógica de proteção do guardião validada!");
}

run().catch((err) => {
  console.error("❌ Falha:", err);
  process.exit(1);
});

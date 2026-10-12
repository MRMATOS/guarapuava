import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

function getCleanOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (host && !host.startsWith("localhost") && !host.startsWith("127.0.0.1") ? "https" : "http");

  if (host) {
    const cleanHost = host.replace("0.0.0.0", "localhost");
    return `${proto}://${cleanHost}`;
  }

  const { origin } = new URL(request.url);
  return origin.replace("0.0.0.0", "localhost");
}

export async function GET(request: NextRequest) {
  const origin = getCleanOrigin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[AUTH CALLBACK] Erro na troca de código:", error.message);
      return NextResponse.redirect(`${origin}/admin/login?error=auth`);
    }

    const authorizedEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const userEmail = data?.user?.email?.trim().toLowerCase();

    console.log("[AUTH CALLBACK] Validação de acesso:", {
      userEmail,
      authorizedEmail,
      authorized: Boolean(userEmail && authorizedEmail && userEmail === authorizedEmail),
    });

    if (userEmail && authorizedEmail && userEmail === authorizedEmail) {
      return NextResponse.redirect(`${origin}/admin/cidade-viva`);
    }

    // Se o usuário não for o admin autorizado, encerra a sessão imediatamente
    if (data?.user) {
      await supabase.auth.signOut();
    }
    return NextResponse.redirect(`${origin}/admin/login?error=unauthorized`);
  }

  return NextResponse.redirect(`${origin}/admin/login?error=auth`);
}

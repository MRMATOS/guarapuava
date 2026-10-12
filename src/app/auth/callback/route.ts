import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

function getSafeOrigin(request: NextRequest): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  const host = request.headers.get("host") || "";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = isLocal ? "http" : "https";
  const cleanHost = host.replace("0.0.0.0", "localhost");

  if (cleanHost) {
    return `${proto}://${cleanHost}`;
  }

  const { origin } = new URL(request.url);
  return origin.replace("0.0.0.0", "localhost");
}

export async function GET(request: NextRequest) {
  const origin = getSafeOrigin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[AUTH CALLBACK] Erro na troca de código OAuth.");
      return NextResponse.redirect(`${origin}/admin/login?error=auth`);
    }

    const authorizedEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const userEmail = data?.user?.email?.trim().toLowerCase();

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

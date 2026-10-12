import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    const authorizedEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const userEmail = data?.user?.email?.trim().toLowerCase();

    if (!error && userEmail && authorizedEmail && userEmail === authorizedEmail) {
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

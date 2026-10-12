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

/**
 * Logout seguro via POST (previne CSRF via tags <img> ou links GET maliciosos)
 */
export async function POST(request: NextRequest) {
  const origin = getSafeOrigin(request);
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/`);
}

/**
 * Rejeita chamadas GET para logout por segurança contra CSRF.
 */
export async function GET() {
  return NextResponse.json(
    { error: "Método não permitido. Logout deve ser executado exclusivamente via POST." },
    { status: 405 }
  );
}

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

export async function POST(request: NextRequest) {
  const origin = getCleanOrigin(request);
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/`);
}

export async function GET(request: NextRequest) {
  const origin = getCleanOrigin(request);
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/`);
}

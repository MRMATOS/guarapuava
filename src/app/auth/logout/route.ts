import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/`);
}

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/`);
}

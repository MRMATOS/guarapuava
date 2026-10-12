// src/app/admin/(dashboard)/cidade-viva/page.tsx
export const dynamic = "force-dynamic";

import React from "react";
import type { Metadata } from "next";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { Report, Category } from "@/app/cidade-viva/_lib/types";
import { AdminCidadeVivaView } from "@/app/admin/cidade-viva/_components/AdminCidadeVivaView";

export const metadata: Metadata = {
  title: "Cidade Viva — Gestão e Moderação | Guarapuava Digital",
  description: "Painel administrativo para moderação de ocorrências urbanas.",
};

export default async function AdminCidadeVivaPage() {
  const admin = createSupabaseAdmin();
  const [{ data: reportsData }, { data: categoriesData }] = await Promise.all([
    admin
      .from("cidade_viva_reports")
      .select("*")
      .order("created_at", { ascending: false }),
    admin
      .from("cidade_viva_categories")
      .select("*")
      .order("sort_order", { ascending: true }),
  ]);

  const allReports = (reportsData || []) as Report[];
  const categories = (categoriesData || []) as Category[];

  return (
    <AdminCidadeVivaView
      initialReports={allReports}
      categories={categories}
    />
  );
}

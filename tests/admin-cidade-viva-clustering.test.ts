import assert from "node:assert/strict";
import { clusterReportsByCategory, getReportPinColor } from "../src/app/cidade-viva/_lib/clustering";
import type { Report, Category } from "../src/app/cidade-viva/_lib/types";

async function run() {
  console.log("--- Testando agrupamento e cálculo de risco para Admin Cidade Viva ---");

  // 1. Cores de pinos por gravidade / contagem de relatos
  assert.equal(getReportPinColor(1), "#71717A", "1 relato deve ser cinza/inicial");
  assert.equal(getReportPinColor(2), "#71717A", "2 relatos devem ser cinza/inicial");
  assert.equal(getReportPinColor(3), "#FACC15", "3 relatos devem ser amarelo/baixa");
  assert.equal(getReportPinColor(6), "#F97316", "6 relatos devem ser laranja/media");
  assert.equal(getReportPinColor(10), "#EF4444", "10 relatos devem ser vermelho/alta");

  // 2. Agrupamento geoespacial
  const mockCategory: Category = {
    id: "cat-buraco",
    name: "Buraco no Asfalto",
    icon: "AlertTriangle",
    color: "#EF4444",
    severity: "alto",
    sort_order: 1,
    is_active: true,
  };

  const categoryMap = new Map<string, Category>([["cat-buraco", mockCategory]]);

  const mockReports: Report[] = [
    {
      id: "r1",
      category_id: "cat-buraco",
      latitude: -25.3907,
      longitude: -51.4642,
      description: "Buraco na rua",
      photo_url: "https://mock.supabase.co/photo1.webp",
      address: "Rua XV de Novembro",
      city: "Guarapuava",
      state: "PR",
      status: "sugestivo",
      created_at: new Date().toISOString(),
    },
    {
      id: "r2",
      category_id: "cat-buraco",
      latitude: -25.39075,
      longitude: -51.46425,
      description: "Outro buraco próximo",
      photo_url: "https://mock.supabase.co/photo2.webp",
      address: "Rua XV de Novembro",
      city: "Guarapuava",
      state: "PR",
      status: "sugestivo",
      created_at: new Date().toISOString(),
    },
  ];

  const clusters = clusterReportsByCategory(mockReports, categoryMap, 100);
  assert.equal(clusters.length, 1, "Relatos a menos de 100m da mesma categoria devem se agrupar");
  assert.equal(clusters[0].report_count, 2, "Cluster deve conter 2 relatos");

  console.log("✅ Agrupamento e cálculo de risco validados com sucesso!");
}

run().catch((err) => {
  console.error("❌ Falha:", err);
  process.exit(1);
});

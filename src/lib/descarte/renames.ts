import renomeacoes from "@/data/descarte-renomeacoes.json";
import type { DescarteItem } from "@/types/descarte";

export const OBSERVACAO_COLETA_INCERTA =
  "Com a mudança das unidades, ainda não foi confirmada a coleta de resíduos.";

/**
 * Aplica renomeações de unidades (ex.: Superpão comprado pelo Muffato).
 * O nome antigo é preservado para exibição entre parênteses e para a busca.
 */
export function applyRenames(items: DescarteItem[]): DescarteItem[] {
  const map = renomeacoes as Record<string, { novo_nome: string }>;
  return items.map((it) => {
    const entry = map[it.empresa];
    if (!entry) return it;
    return {
      ...it,
      nomeExibicao: entry.novo_nome,
      nomeAntigo: it.empresa,
      coletaIncerta: true,
    };
  });
}

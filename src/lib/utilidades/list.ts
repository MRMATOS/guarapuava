export interface UtilidadeEntry {
  id: string;
  titulo: string;
  descricao: string;
  href: string;
}

export function getUtilidades(): UtilidadeEntry[] {
  return [
    {
      id: "onibus",
      titulo: "Horários de Ônibus",
      descricao:
        "Consulte linhas urbanas e interbairros, horários de saída e pontos de passagem em cada bairro de Guarapuava.",
      href: "/utilidades/onibus",
    },
    {
      id: "descarte",
      titulo: "Descarte correto",
      descricao:
        "Encontre onde levar pilhas, pneus, remédios vencidos e outros resíduos em Guarapuava.",
      href: "/utilidades/descarte",
    },
  ];
}

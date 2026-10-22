export interface UtilidadeEntry {
  id: string;
  titulo: string;
  descricao: string;
  href: string;
}

export function getUtilidades(): UtilidadeEntry[] {
  return [
    {
      id: "cidade-viva",
      titulo: "Cidade Viva",
      descricao:
        "Mapeamento colaborativo para acompanhar e registrar ocorrências de zeladoria urbana, asfalto, iluminação e saneamento em tempo real.",
      href: "/cidade-viva/mapa",
    },
    {
      id: "descarte",
      titulo: "Descarte correto",
      descricao:
        "Encontre onde levar pilhas, pneus, remédios vencidos e outros resíduos em Guarapuava.",
      href: "/utilidades/descarte",
    },
    {
      id: "onibus",
      titulo: "Horários de Ônibus",
      descricao:
        "Consulte linhas urbanas e interbairros, horários de saída e pontos de passagem em cada bairro de Guarapuava.",
      href: "/utilidades/onibus",
    },
  ];
}

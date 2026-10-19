export interface PontoItinerario {
  id: string;              // ex: "campo-do-batel"
  nome: string;            // ex: "Campo do Batel"
  ordem: number;           // 1, 2, 3...
  rua?: string;            // ex: "Avenida Manoel Ribas"
  numero?: string;         // ex: "4112"
  referencia?: string;     // ex: "Posto Baitala"
  bairro?: string;         // ex: "Conradinho" ou "Boqueirão"
  cep?: string;            // ex: "85010-190"
  latitude?: number;       // ex: -25.392566
  longitude?: number;      // ex: -51.468079
  maps_url?: string;       // ex: "https://www.google.com/maps/search/?api=1&query=..."
  horariosUteis: string[]; // ["06:52", "07:22", "07:52", ...]
  horariosSabado: string[];// ["07:52", "08:52", "09:52", ...]
  horariosDomingo: string[]; // [...]
}

export interface LinhaBairro {
  id: string;              // ex: "linha-02"
  codigo: string;          // ex: "02"
  bairro: string;          // ex: "Cascavel"
  nomeExibicao: string;    // ex: "Linha 02 - Cascavel"
  tipo: "regular" | "interbairros";
  pontos: PontoItinerario[];
  observacoes?: string[];
}

export interface DadosHorariosOnibus {
  dataExtracao: string;
  totalLinhas: number;
  linhas: LinhaBairro[];
}

// Compatibilidade legada
export interface ViagemOnibus {
  saida: string;
  chegada?: string | null;
  paradas: string[];
  observacao?: string | null;
}

export interface CategoriaHorarioOnibus {
  categoria: 'dias_uteis' | 'sabados' | 'domingos_feriados' | string;
  tituloCategoria: string;
  pdfUrl: string;
  revisao?: string | null;
  dataRevisao?: string | null;
  responsavel?: string | null;
  pontosItinerario: string[];
  todasSaidas: string[];
  viagens: ViagemOnibus[];
  observacoes: string[];
  textoCompleto: string;
}

export interface LinhaOnibus extends LinhaBairro {
  nome: string;
  categoriasDisponiveis: ('dias_uteis' | 'sabados' | 'domingos_feriados' | string)[];
  bairrosEPontosChave: string[];
  diasUteis?: CategoriaHorarioOnibus | null;
  sabados?: CategoriaHorarioOnibus | null;
  domingosFeriados?: CategoriaHorarioOnibus | null;
}

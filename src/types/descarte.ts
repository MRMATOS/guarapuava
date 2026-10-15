export interface DescarteItem {
  id: string;
  categoria: string;
  empresa: string;
  /** Nome desambiguado ("Droga Raia - Alto da XV"); ausente = empresa. */
  nomeExibicao?: string;
  /** Nome anterior à renomeação, exibido entre parênteses. */
  nomeAntigo?: string;
  /** Coleta ainda não confirmada (ex.: troca de bandeira da unidade). */
  coletaIncerta?: boolean;
  endereco: string;
  telefone: string | null;
  maps_url: string;
}

export interface RawDescarteEntry {
  residuo: string;
  empresa: string;
  endereco: string;
  cidade: string;
  estado: string;
  telefone: string | null;
  maps_url: string;
  fonte?: string;
}

export interface JobOpening {
  id?: string;
  externalId?: string;
  title: string;
  company: string;
  intermediary?: string;
  location: string;
  workModel?: 'Presencial' | 'Híbrido' | 'Remoto' | 'Externo/Campo';
  contractType?: 'CLT' | 'PJ/MEI' | 'Estágio' | 'Jovem Aprendiz' | 'Temporário' | 'Intermitente' | 'Autônomo' | 'Teste Seletivo' | string;
  vacanciesCount?: number;
  isPcd?: boolean;
  isPcdExclusive?: boolean;
  publishedDate: string;
  registeredAt?: string;
  applicationDeadline?: string;
  compensation?: string;
  schedule?: string;
  sourceUrl?: string;
  applicationInstructions?: string;
  descriptionItems: string[];
  requirementItems: string[];
  benefitItems?: string[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;

  // Compatibilidade com mockJobs anterior
  link?: string;
  registeredDate?: string;
  additionalInfo?: { label: string; text: string }[];
}

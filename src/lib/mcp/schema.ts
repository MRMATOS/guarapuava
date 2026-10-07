import { z } from 'zod';

/**
 * Normaliza e gera um externalId consistente no formato slug a partir de title, company e sourceUrl.
 */
export function generateExternalId(title: string, company: string, sourceUrl: string): string {
  const normalize = (str: string) =>
    str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // substitui caracteres especiais por hífen
      .replace(/^-+|-+$/g, ''); // remove hífens nas pontas

  const cleanTitle = normalize(title);
  const cleanCompany = normalize(company);
  const cleanUrl = normalize(sourceUrl.replace(/^https?:\/\//, ''));

  return `${cleanTitle}-${cleanCompany}-${cleanUrl}`.slice(0, 150);
}

export const jobOpeningInputSchema = z.object({
  externalId: z.string().optional(),
  title: z.string().min(1, 'Título é obrigatório'),
  company: z.string().min(1, 'Empresa é obrigatória'),
  intermediary: z.string().optional(),
  location: z.string().default('Guarapuava - PR'),
  workModel: z.enum(['Presencial', 'Híbrido', 'Remoto', 'Externo/Campo']).optional(),
  contractType: z.string().optional(),
  vacanciesCount: z.number().int().positive().optional().default(1),
  isPcd: z.boolean().optional().default(false),
  isPcdExclusive: z.boolean().optional().default(false),
  publishedDate: z.string().min(1, 'Data de publicação é obrigatória'),
  registeredAt: z.string().optional(),
  applicationDeadline: z.string().optional(),
  compensation: z.string().optional(),
  schedule: z.string().optional(),
  sourceUrl: z.string().url('URL de origem inválida'),
  applicationInstructions: z.string().optional(),
  descriptionItems: z.array(z.string()).default([]),
  requirementItems: z.array(z.string()).default([]),
  benefitItems: z.array(z.string()).optional().default([]),
}).transform((data) => ({
  ...data,
  externalId: data.externalId || generateExternalId(data.title, data.company, data.sourceUrl),
}));

export const jobOpeningSchema = jobOpeningInputSchema;

export const syncJobsInputSchema = z.object({
  vagas: z.array(jobOpeningInputSchema).min(1, 'Pelo menos uma vaga deve ser enviada'),
  desativarNaoListadas: z.boolean().default(false),
});

export type JobOpeningInput = z.infer<typeof jobOpeningInputSchema>;
export type SyncJobsInput = z.infer<typeof syncJobsInputSchema>;

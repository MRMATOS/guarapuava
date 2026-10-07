import { listActiveJobs, syncJobs, deactivateJob } from '../supabase/jobs';
import { syncJobsInputSchema } from './schema';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const registeredTools: McpToolDefinition[] = [
  {
    name: 'listar_vagas_ativas',
    description: 'Retorna a lista de vagas que estão ativas e publicadas atualmente no portal de Guarapuava.',
    inputSchema: {
      type: 'object',
      properties: {
        limite: { type: 'number', description: 'Número máximo de vagas a retornar (padrão 100)' },
      },
    },
  },
  {
    name: 'sincronizar_vagas',
    description:
      'Salva ou atualiza a listagem de vagas de Guarapuava no banco de dados. Faz upsert de vagas novas pelo externalId composto e preserva o histórico cumulativo (desativarNaoListadas é false por padrão).',
    inputSchema: {
      type: 'object',
      required: ['vagas'],
      properties: {
        vagas: {
          type: 'array',
          description: 'Lista de vagas extraídas pelo agente',
          items: {
            type: 'object',
            required: ['title', 'company', 'publishedDate', 'sourceUrl', 'descriptionItems', 'requirementItems'],
            properties: {
              externalId: { type: 'string', description: 'Identificador composto único (slug)' },
              title: { type: 'string', description: 'Título da vaga' },
              company: { type: 'string', description: 'Nome da empresa' },
              intermediary: { type: 'string', description: 'Intermediário (ex: SINE, VEHLOR)' },
              location: { type: 'string', description: 'Localização (padrão: Guarapuava - PR)' },
              workModel: { type: 'string', enum: ['Presencial', 'Híbrido', 'Remoto', 'Externo/Campo'] },
              contractType: { type: 'string', description: 'Tipo de contrato (CLT, Estágio, etc.)' },
              vacanciesCount: { type: 'number', description: 'Número de vagas abertas' },
              isPcd: { type: 'boolean', description: 'Aberta para PcD' },
              isPcdExclusive: { type: 'boolean', description: 'Exclusiva para PcD' },
              publishedDate: { type: 'string', description: 'Data de publicação' },
              registeredAt: { type: 'string', description: 'Data/hora de registro' },
              applicationDeadline: { type: 'string', description: 'Prazo limite de inscrição' },
              compensation: { type: 'string', description: 'Faixa salarial ou bolsa' },
              schedule: { type: 'string', description: 'Jornada ou escala' },
              sourceUrl: { type: 'string', description: 'URL de origem' },
              applicationInstructions: { type: 'string', description: 'Instruções de candidatura' },
              descriptionItems: { type: 'array', items: { type: 'string' } },
              requirementItems: { type: 'array', items: { type: 'string' } },
              benefitItems: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        desativarNaoListadas: {
          type: 'boolean',
          description: 'Se true, inativa vagas não presentes no lote. Padrão: false.',
        },
      },
    },
  },
  {
    name: 'desativar_vaga',
    description: 'Desativa uma vaga pontual do portal caso tenha sido preenchida ou encerrada.',
    inputSchema: {
      type: 'object',
      required: ['externalIdOrUrl'],
      properties: {
        externalIdOrUrl: { type: 'string', description: 'externalId ou URL de origem da vaga a desativar' },
      },
    },
  },
];

/**
 * Executa uma ferramenta MCP pelo nome
 */
export async function executeMcpTool(name: string, args: any): Promise<any> {
  switch (name) {
    case 'listar_vagas_ativas': {
      const limit = typeof args?.limite === 'number' ? args.limite : 100;
      const jobs = await listActiveJobs(limit);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(jobs, null, 2),
          },
        ],
        vagasCount: jobs.length,
      };
    }

    case 'sincronizar_vagas': {
      const parsed = syncJobsInputSchema.parse(args);
      const result = await syncJobs(parsed.vagas, parsed.desativarNaoListadas);
      return {
        content: [
          {
            type: 'text',
            text: `Sincronização concluída com sucesso: ${result.inserted} vagas processadas (upsert), ${result.deactivated} desativadas. Total ativo: ${result.total}.`,
          },
        ],
        resultado: result,
      };
    }

    case 'desativar_vaga': {
      const idOrUrl = args?.externalIdOrUrl || args?.externalId || args?.sourceUrl;
      if (!idOrUrl) {
        throw new Error('externalIdOrUrl é obrigatório');
      }
      const success = await deactivateJob(idOrUrl);
      return {
        content: [
          {
            type: 'text',
            text: success ? `Vaga ${idOrUrl} desativada com sucesso.` : `Falha ao desativar vaga ${idOrUrl}.`,
          },
        ],
        sucesso: success,
      };
    }

    default:
      throw new Error(`Ferramenta desconhecida: ${name}`);
  }
}

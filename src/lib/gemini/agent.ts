import { GoogleGenAI } from '@google/genai';
import { jobOpeningInputSchema, JobOpeningInput } from '@/lib/mcp/schema';
import { syncJobs } from '@/lib/supabase/jobs';

export interface CrawlerResult {
  success: boolean;
  totalFound: number;
  totalValid: number;
  insertedOrUpdated: number;
  jobs: JobOpeningInput[];
  searchQueriesUsed: string[];
  error?: string;
}

/**
 * Agente autônomo baseado no Gemini API com Google Search Grounding.
 * Executa as buscas direcionadas de vagas em Guarapuava - PR,
 * extrai informações ricas e persiste diretamente no Supabase via upsert.
 */
export async function runJobsCrawlerAgent(customApiKey?: string): Promise<CrawlerResult> {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY não configurada. Defina a variável no ambiente ou em .env.local'
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const targetDate = new Date().toLocaleDateString('pt-BR');
  const queries = [
    'vagas de emprego Guarapuava PR recentes',
    'vagas abertas Guarapuava site:gupy.io OR site:catho.com.br OR site:infojobs.com.br OR site:bne.com.br',
    'Agencia do Trabalhador Guarapuava vagas Sine site:gmaisnoticias.com OR site:redesuldenoticias.com.br',
    'concursos e processos seletivos abertos Guarapuava PR',
  ];

  const prompt = `
Você é o Agente Oficial de Oportunidades e Empregos de Guarapuava - PR.
Data de referência atual: ${targetDate}.

Sua missão:
1. Realize buscas detalhadas na web pelas vagas de emprego mais recentes e abertas na região de Guarapuava, Paraná.
2. Foque em fontes oficiais e confiáveis:
   - Agência do Trabalhador de Guarapuava (SINE)
   - Portais de empresas locais e cooperativas (Agrária, Sicredi, Muffato, Santa Maria, Repinho, MacPonta, etc.)
   - Plataformas de recrutamento com vagas ativas (Gupy, Catho, InfoJobs, BNE, Vagas.com, LinkedIn)
   - Editais públicos recentes (Prefeitura de Guarapuava, Unicentro)

Regras de Extração e Estruturação:
- Extraia cada oportunidade individualmente.
- O campo "sourceUrl" DEVE ser o link oficial direto da vaga ou da matéria da notícia onde a vaga foi publicada.
- Não use travessões (em-dash ou en-dash), prefira hífen normal (-).
- Para cada vaga, capture:
  * title: Cargo/título claro da vaga
  * company: Empresa contratante real (se via SINE, indique ex: "Empresa Comercial via SINE Guarapuava")
  * intermediary: Nome do intermediário se houver (ex: "Agência do Trabalhador (SINE)", "Gupy", "Catho")
  * location: Localidade (ex: "Guarapuava - PR" ou "Guarapuava - PR (Entre Rios)")
  * workModel: "Presencial" | "Híbrido" | "Remoto" | "Externo/Campo"
  * contractType: "CLT" | "Estágio" | "Jovem Aprendiz" | "Temporário" | "Teste Seletivo" | "PJ/MEI"
  * vacanciesCount: Número inteiro de vagas (padrão 1 se não especificado)
  * isPcd: true se aberta ou inclusiva para PcD, false caso contrário
  * isPcdExclusive: true se exclusiva para PcD
  * publishedDate: Data no formato DD/MM/AAAA (ex: "${targetDate}")
  * applicationDeadline: Data limite se houver no formato DD/MM/AAAA
  * compensation: Faixa salarial, remuneração ou bolsa informada (se houver)
  * schedule: Jornada/horário/carga horária (se houver)
  * sourceUrl: Link completo da vaga iniciando com http:// ou https://
  * applicationInstructions: Como se candidatar (endereço presencial do SINE, e-mail ou link)
  * descriptionItems: Lista de responsabilidades/descrição da vaga (array de strings)
  * requirementItems: Lista de requisitos e qualificações necessárias (array de strings)
  * benefitItems: Lista de benefícios oferecidos (ex: Vale Alimentação, PPR, Plano de Saúde) (array de strings)

Formato de Saída Obrigatório:
Retorne EXCLUSIVAMENTE um array JSON contendo as vagas encontradas.
Exemplo:
[
  {
    "title": "Assistente Administrativo",
    "company": "Sicredi",
    "location": "Guarapuava - PR",
    "workModel": "Presencial",
    "contractType": "CLT",
    "vacanciesCount": 1,
    "isPcd": false,
    "isPcdExclusive": false,
    "publishedDate": "${targetDate}",
    "sourceUrl": "https://sicredi.gupy.io/job/12345",
    "descriptionItems": ["Apoio às rotinas administrativas"],
    "requirementItems": ["Ensino superior em andamento"],
    "benefitItems": ["Vale Alimentação", "Plano de Saúde"]
  }
]
`;

  console.log('🤖 Disparando Gemini API com Google Search Grounding...');

  let responseText = '';
  // Modelos vigentes da geração Gemini 3 (com suporte a Search Grounding)
  const candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const modelName of candidateModels) {
    try {
      console.log(`Tentando modelo: ${modelName}...`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      responseText = response.text || '';
      if (responseText) {
        break;
      }
    } catch (err: any) {
      console.warn(`Aviso com modelo ${modelName}:`, err?.message || err);
      lastError = err;
    }
  }

  if (!responseText) {
    throw new Error(
      `Falha ao obter resposta do Gemini: ${lastError?.message || 'Resposta vazia'}`
    );
  }

  // Extrai o bloco JSON da resposta
  let jsonString = responseText.trim();
  const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonString = jsonMatch[1].trim();
  } else {
    // Tenta encontrar o array caso venha cercado de texto explicativo
    const arrayMatch = jsonString.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      jsonString = arrayMatch[0].trim();
    }
  }

  let parsedRaw: any[] = [];
  try {
    parsedRaw = JSON.parse(jsonString);
    if (!Array.isArray(parsedRaw)) {
      parsedRaw = [parsedRaw];
    }
  } catch (err: any) {
    console.error('Erro ao analisar JSON retornado pelo Gemini:', err);
    console.error('Conteúdo bruto retornado:', responseText.slice(0, 500));
    throw new Error(`Resposta do Gemini não pôde ser convertida em JSON: ${err?.message}`);
  }

  console.log(`📦 Vagas brutas extraídas pelo Gemini: ${parsedRaw.length}`);

  // Validação e normalização estrutural via Zod
  const validatedJobs: JobOpeningInput[] = [];
  for (const raw of parsedRaw) {
    try {
      const valid = jobOpeningInputSchema.parse(raw);
      validatedJobs.push(valid);
    } catch (validationErr: any) {
      console.warn(`Aviso: Vaga "${raw?.title}" ignorada por validação:`, validationErr?.message);
    }
  }

  console.log(`✅ Vagas validadas pelo schema: ${validatedJobs.length}`);

  let insertedOrUpdated = 0;
  if (validatedJobs.length > 0) {
    const syncResult = await syncJobs(validatedJobs, false); // false = não desativa histórico
    insertedOrUpdated = syncResult.total;
    console.log(`💾 Vagas sincronizadas com sucesso no Supabase: ${insertedOrUpdated}`);
  }

  return {
    success: true,
    totalFound: parsedRaw.length,
    totalValid: validatedJobs.length,
    insertedOrUpdated,
    jobs: validatedJobs,
    searchQueriesUsed: queries,
  };
}

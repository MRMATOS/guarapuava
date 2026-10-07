import { POST } from '../src/app/api/mcp/route';

async function simulateGeminiSpark() {
  console.log('🤖 Simulando Gemini Spark enviando vagas reais via Cloud MCP...');

  // Extraído de Vagas de Emprego - Guarapuava PR.docx
  const sparkPayload = {
    jsonrpc: '2.0',
    id: 'spark-req-001',
    method: 'tools/call',
    params: {
      name: 'sincronizar_vagas',
      arguments: {
        vagas: [
          {
            title: 'Assistente de Desenvolvimento de Negócios - Área de Associados',
            company: 'Sicredi',
            location: 'Guarapuava - PR',
            workModel: 'Presencial',
            contractType: 'CLT',
            publishedDate: '25/09/2026',
            applicationDeadline: '04/10/2026',
            sourceUrl: 'https://sicredi.gupy.io/job/12345',
            descriptionItems: [
              'Apoiar o acompanhamento e gestão da carteira/base de associados',
              'Levantamento, controle e atualização periódica de dados e relatórios',
              'Acompanhamento de indicadores de desempenho comercial',
              'Apoio às rotinas operacionais e administrativas da agência',
            ],
            requirementItems: [
              'Ensino superior completo ou em andamento em Administração, Economia ou Ciências Contábeis',
              'Domínio intermediário de Excel e PowerPoint',
              'Desejável vivência em instituições financeiras e conhecimento de produtos bancários',
              'Certificação ANBIMA (CPA) será considerada um diferencial',
            ],
            benefitItems: [
              'Participação nos Resultados (PPR de até 3 salários)',
              'Vale Alimentação e Refeição (Alelo Tudo)',
              'Plano de Saúde Unimed e Odontológico DentalUni',
              'Wellhub e Apoio Emocional',
              'Previdência Privada Icatu',
            ],
            isPcd: true,
          },
          {
            title: 'Professor Colaborador - Teste Seletivo Docente (138 Vagas)',
            company: 'Universidade Estadual do Centro-Oeste (Unicentro)',
            location: 'Guarapuava - PR (Câmpus Santa Cruz e Cedeteg)',
            workModel: 'Presencial',
            contractType: 'Teste Seletivo',
            vacanciesCount: 138,
            compensation: 'Até R$ 11.221,63',
            schedule: '12h a 40h semanais',
            publishedDate: '27/09/2026',
            applicationDeadline: '02/10/2026',
            sourceUrl: 'https://unicentro.br/concursos/edital-docente',
            applicationInstructions: 'Inscrições online pelo portal da Unicentro. Taxa de R$ 190. Mais infos: (42) 3621-1084',
            descriptionItems: [
              'Docência no ensino superior em cursos de graduação da Unicentro',
              'Áreas de Ciências Agrárias, Exatas, Humanas, Saúde e Sociais Aplicadas',
            ],
            requirementItems: [
              'Graduação e pós-graduação na área do certame',
              'Prova Didática e Prova de Títulos',
            ],
            benefitItems: [],
          },
        ],
        desativarNaoListadas: false, // Inserção incremental segura
      },
    },
  };

  const req = new Request('http://localhost:3000/api/mcp', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MCP_CLIENT_SECRET || 'spk_sec_guarapuava_2026_mcp'}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sparkPayload),
  });

  const res = await POST(req);
  const data = await res.json();
  console.log('Resposta do MCP para o Spark:', JSON.stringify(data, null, 2));

  if (res.status !== 200 || data.error) {
    throw new Error('Falha na sincronização via MCP');
  }

  console.log('✅ Vagas sincronizadas com sucesso pelo Gemini Spark no Supabase!');
}

simulateGeminiSpark().catch((err) => {
  console.error('❌ Erro na simulação:', err);
  process.exit(1);
});

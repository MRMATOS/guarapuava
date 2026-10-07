import { DailyDigest } from "@/types/news";

export const initialDigest: DailyDigest = {
  date: "06/10/2026",
  lastUpdatedTime: "10:15",
  headline:
    "Guarapuava consolida três cadeiras na ALEP; Carreta da Saúde inicia exames e Simepar alerta para gangorra térmica",
  highlights: [
    {
      id: "h1",
      category: "Política",
      title: "Política",
      text: "Artagão Júnior, Dr. Antenor e Cesar Silvestri Filho são confirmados na ALEP; TSE define guia do 2º turno presidencial.",
    },
    {
      id: "h2",
      category: "Saúde",
      title: "Saúde",
      text: "Carreta da Saúde da Mulher inicia coletas gratuitas de mamografia e preventivo na Praça 9 de Dezembro.",
    },
    {
      id: "h3",
      category: "Prazos",
      title: "Prazos",
      text: "Encerra-se hoje a entrega de documentos para estagiários convocados pela Prefeitura (Edital 24/2026).",
    },
    {
      id: "h4",
      category: "Clima",
      title: "Clima",
      text: "Terça-feira chuvosa (14°C a 20°C) antecede salto térmico de até 30°C antes de nova frente fria na sexta.",
    },
    {
      id: "h5",
      category: "Cultura",
      title: "Lazer & Cultura",
      text: "Anunciados o Festival de Primavera no Parque do Lago e a programação da Festa da Padroeira no Bonsucesso (12/10).",
    },
  ],
  batches: [
    {
      id: "batch-1015",
      date: "06/10/2026",
      time: "10:15",
      items: [
        {
          id: "item-1",
          category: "Política",
          title: "Bancada regional na ALEP",
          text: "Assembleia Legislativa do Paraná confirma taxa de renovação de 42,5% (23 novos deputados). Guarapuava mantém representatividade consolidada com as reeleições de Artagão Júnior e Dr. Antenor, além do retorno do ex-prefeito Cesar Silvestri Filho.",
        },
        {
          id: "item-2",
          category: "Cultura",
          title: "Festa da Padroeira no Bonsucesso",
          text: "Santuário divulga programação completa para 12 de outubro, incluindo missas solenes a partir das 06h, almoço festivo e chegada das romarias (Moto Romaria às 12h e Tropeira às 16h). Novena diária segue às 19h30 até sábado.",
        },
      ],
    },
    {
      id: "batch-0845",
      date: "06/10/2026",
      time: "08:45",
      items: [
        {
          id: "item-3",
          category: "Saúde",
          title: "Saúde em andamento",
          text: "Carreta da Saúde da Mulher iniciou pontualmente às 08h os atendimentos na Praça 9 de Dezembro (exames gratuitos de mamografia e preventivo do colo do útero).",
        },
        {
          id: "item-4",
          category: "Educação",
          title: "Pesquisa regional na Unicentro",
          text: "Defesa pública de dissertação hoje, às 15h (online), analisa as transformações territoriais e socioeconômicas dos municípios do Centro-Sul paranaense.",
        },
      ],
    },
    {
      id: "batch-0605",
      date: "06/10/2026",
      time: "06:05",
      items: [
        {
          id: "item-5",
          category: "Prazos",
          title: "Prazo final na Prefeitura",
          text: "Encerra-se hoje o prazo de envio de documentos dos estagiários convocados pelo Edital 24/2026 da administração municipal.",
        },
        {
          id: "item-6",
          category: "Clima",
          title: "Clima do dia",
          text: "Terça-feira com pancadas de chuva (14°C a 20°C) antecede salto térmico de até 30°C nos próximos dias segundo o Simepar.",
        },
      ],
    },
  ],
};

export const availableTags = [
  "Cultura",
  "Clima",
  "Prazos",
  "Saúde",
  "Política",
  "Educação",
];

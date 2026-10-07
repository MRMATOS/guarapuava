# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, Supabase, Vercel

## Users

Trabalhadores e candidatos a emprego na cidade de Guarapuava (PR). A grande maioria acessa pelo celular (muitas vezes em conexões 3G/4G) e descobre/compartilha vagas por grupos de WhatsApp e redes sociais.

## Product Purpose

Portal de vagas de emprego local para Guarapuava. Publicar vagas reais e atualizadas da cidade com máxima clareza e facilidade de acesso, sem exigir cadastros longos ou formulários cansativos, conectando o trabalhador diretamente ao canal de contato da empresa (WhatsApp, e-mail ou link da vaga).

## Positioning

Hiperlocal, direto ao ponto e sem atrito. Conteúdo sempre fresco alimentado automaticamente por agente de monitoramento, com interface humana, ágil e livre de clichês visuais de IA.

## Operating Context

- **Origem dos dados:** Agente Gemini Spark monitora e salva vagas em documento do Google Drive.
- **Ingestão:** Pipeline extrai o texto do Google Docs, formata em dados estruturados e grava no banco Supabase (PostgreSQL).
- **Consumo:** Portal Next.js na Vercel com SSR/SSG para garantir que ao compartilhar links no WhatsApp apareça o card perfeito (título, bairro e empresa).

## Capabilities and Constraints

- Busca instantânea e filtros simples (por cargo, bairro ou categoria).
- Botão de ação rápida (1 clique para abrir conversa de candidatura no WhatsApp com mensagem pré-formatada).
- Design responsivo mobile-first de alto padrão, sem cartões aninhados repetitivos e sem fontes genéricas de sistema.

## Product Principles

1. **Fricção zero para o trabalhador:** Ver a vaga, entender os requisitos e poder entrar em contato em segundos.
2. **Mobile-first de verdade:** Desempenho excelente em redes móveis e telas de qualquer tamanho.
3. **Design autoral e humano:** Transmitir confiança, calor e utilidade real para a comunidade local, rejeitando templates genéricos.

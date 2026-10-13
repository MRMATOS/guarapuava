<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Diretrizes de Design e Consistência Visual

1. **Nunca inventar elementos visuais quando já existir um padrão estabelecido:**
   - Respeite rigorosamente os componentes, layouts e hierarquias definidos no `DESIGN.md`.
   - Não adicione blocos extras, sub-cards aninhados, callouts de destaque ou ícones decorativos (ex.: relógios, badges redundantes) que não foram expressamente solicitados.
2. **Equivalência e Coesão entre Cards (Ex.: Embarque e Desembarque em Rotas):**
   - Cards que representam pontos de um mesmo percurso (origem/embarque e destino/desembarque) devem ser estruturalmente equivalentes: mesmo espaçamento, mesma hierarquia de tipografia, mesmo tamanho de pílulas de horário e mesmo alinhamento.
   - Não coloque horários soltos na mesma linha de títulos de seção (ex.: nunca colocar horário na linha de "Previsão de Chegada" ou "Dias Úteis").
   - A tabela/cartela de horários oficial do ponto é a única fonte da verdade: nela deve ser destacado de forma suave o horário correspondente (saída mais próxima para embarque, ou horário previsto de passagem no ponto para desembarque), sem criar horários sintéticos conflitantes com a grade.

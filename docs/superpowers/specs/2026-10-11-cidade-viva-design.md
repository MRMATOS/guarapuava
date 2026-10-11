# Especificação Técnica: Integração do Cidade Viva no Guarapuava Digital

- **Data:** 11 de outubro de 2026
- **Status:** Aprovado
- **Escopo:** Incorporação da plataforma colaborativa de zeladoria urbana Cidade Viva no aplicativo Guarapuava Digital, atualização da navegação ("Mais" e "Cidade Viva"), termos de privacidade e infraestrutura Supabase/Vercel.

---

## 1. Visão Geral e Propósito do Produto

O **Cidade Viva** é uma ferramenta geoespacial e colaborativa de zeladoria urbana em tempo real, permitindo aos moradores de Guarapuava visualizar, reportar e acompanhar ocorrências na cidade (como buracos no asfalto, iluminação pública apagada, vazamentos de água/esgoto, semáforos defeituosos, mato alto e focos de dengue).

Originalmente prototipada no site pessoal (`rodrigo-wtf`), a ferramenta agora passa a integrar organicamente o ecossistema do **Guarapuava Digital**, unindo-se aos serviços de **Vagas de Emprego** e **Notícias Locais**.

---

## 2. Decisões de Navegação & Acesso

### 2.1 Renomeação no Dock Mobile (`MainNav.tsx`)
- O botão inferior anteriormente rotulado como **"Opções"** passa a ser rotulado como **"Mais"**.
- Mantém o mesmo comportamento tátil de abrir o painel flutuante de utilitários (`OptionsPanel`).

### 2.2 Substituição no Painel Flutuante (`OptionsPanel.tsx`)
- A primeira tecla tátil (anteriormente reservada como **"Teste"**) passa a ser rotulada como **"Cidade Viva"**.
- Ao ser acionada, direciona para o ambiente do mapa colaborativo (`/cidade-viva`).

### 2.3 Modo Desktop (`DesktopStage.tsx`)
- No cabeçalho superior do desktop (coluna da direita), a tecla **"Teste"** é substituída por **"Cidade Viva"**, permitindo acesso direto tanto em telas móveis quanto em computadores.

### 2.4 Rota e Deep Linking
- Rota dedicada: `/cidade-viva`.
- Suporte a compartilhamento via WhatsApp com parâmetro de busca: `/cidade-viva?id=[report_id]`.
- Ao abrir o link com ID, o mapa centraliza no relato e abre a gaveta (`Drawer`) com a foto e detalhes da ocorrência.

---

## 3. Infraestrutura, Dependências e Variáveis de Ambiente

### 3.1 Biblioteca e Tiles do Mapa
- **MapLibre GL**: `maplibre-gl` (^6.9.0).
- **Tiles Vetoriais**: OpenFreeMap (open-source e gratuito):
  - Claro: `https://tiles.openfreemap.org/styles/positron`
  - Escuro: `https://tiles.openfreemap.org/styles/dark`
  - **Secrets do Mapa:** **Nenhum**. OpenFreeMap não requer chaves, tokens nem cadastro.
- **Geocodificação Reversa**: OpenStreetMap Nominatim gratuito via Server Action (timeout 1.5s). Sem segredos.
- **Worker Script**: Worker do MapLibre copiado para `public/maplibre/maplibre-gl-worker.mjs` no `postinstall` e no build do Next.js.

### 3.2 Variáveis de Ambiente (Vercel & `.env.local`)
1. `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase de Guarapuava (`https://ufjvqciyrtpfpetpgavf.supabase.co`). *(Já existente)*
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Chave anônima para leituras públicas. *(Já existente)*
3. `SUPABASE_SERVICE_ROLE_KEY`: Chave com privilégios para inserção com RPC e storage. *(Configurar na Vercel caso ainda não esteja)*
4. `HASH_SALT`: String secreta (mínimo 32 caracteres aleatórios) utilizada para gerar o hash criptográfico SHA-256 do IP dos relatos para combate a spam e conformidade com a LGPD. *(Novo secret para a Vercel)*
5. `ADMIN_EMAIL`: E-mail autorizado para moderação de relatos (aprovar, alterar status e excluir). *(Novo secret para a Vercel)*

---

## 4. Backend Supabase & Storage

Migration em `supabase/migrations/20261011_create_cidade_viva_tables.sql`:
1. **Tabela `cidade_viva_categories`**:
   - `id` (text PK), `name` (text), `slug` (text), `icon` (text), `color` (text), `severity` (text: 'baixo', 'medio', 'alto', 'assistencial'), `sort_order` (int), `is_active` (boolean), `created_at` (timestamptz).
   - Categorias padrão voltadas para Guarapuava (Asfalto/Buracos, Iluminação Pública, Água/Esgoto Sanepar, Lixo/Entulho, Vegetação/Mato Alto, Semáforo/Trânsito, Calçada Irregular, Foco de Dengue).
2. **Tabela `cidade_viva_reports`**:
   - `id` (uuid PK), `category_id` (FK), `latitude` (numeric), `longitude` (numeric), `description` (text, max 500 chars), `photo_url` (text), `address` (text), `city` (text), `state` (text), `ip_hash` (text), `status` (text: 'sugestivo', 'confirmado_comunidade', 'verificado_in_loco', 'resolvido'), `created_at`, `updated_at`.
   - Índices em `(latitude, longitude)`, `(ip_hash, created_at)` e `(status, created_at)`.
3. **View `cidade_viva_reports_public`**:
   - Expõe apenas relatos com `status <> 'resolvido'`.
   - Omite a coluna sensível `ip_hash`.
4. **Função RPC `check_rate_limit`**:
   - Limita envios para 1 relato a cada 5 minutos por hash de IP para usuários não-administradores.
5. **Supabase Storage Bucket**:
   - Bucket `cidade-viva-reports`.
   - Público para leitura (`public: true`), limite de 2MB por arquivo, tipos MIME permitidos: `image/webp`, `image/jpeg`, `image/png`.

---

## 5. Design System & Adaptação Visual

- **Harmonização Tátil**: Substituir o visual neobrutalista original por componentes alinhados ao *Painel de Rádio* de Guarapuava.
  - Teclas táteis com relevo e sombra macia (`surface-card`, `key-button`).
  - Chips de filtro de severidade e categoria estilizados de acordo com as cores semânticas da cidade.
  - Drawer de detalhes responsivo e suave com suporte a gestos de arrasto e fechamento.
- **Centro Padrão do Mapa**: Coordenadas de Guarapuava (`-51.4642, -25.3907`) com nível de zoom inicial 13.
- **Tema Claro / Escuro**: Responde em tempo real ao `ThemeContext` do app, alternando instantaneamente o estilo de mapa do OpenFreeMap.

---

## 6. Atualização de Termos e Privacidade (`InfoFeed.tsx`)

Adicionar nova seção dedicada em `src/components/InfoFeed.tsx`:
1. **Geolocalização Estritamente Opcional**:
   - Deixar explícito que a geolocalização do dispositivo só é requisitada caso o usuário acesse a ferramenta Cidade Viva e opte por ver sua posição ou registrar um problema próximo.
   - Vagas e notícias permanecem funcionando 100% sem qualquer pedido de permissão de GPS.
2. **Anonimização e Não Armazenamento de Dados Pessoais**:
   - Nenhum dado pessoal (nome, e-mail, telefone) é exigido para fazer relatos.
   - O endereço IP é transformado em um código criptográfico irreversível (hash com salt) unicamente para proteção antispam e nunca é exibido publicamente nem compartilhado com terceiros.
3. **Responsabilidade e Finalidade Pública**:
   - As informações e fotos enviadas destinam-se ao monitoramento colaborativo e interesse público da comunidade de Guarapuava.

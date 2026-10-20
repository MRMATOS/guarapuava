"use client";

import React, { useState, useRef } from "react";
import { Key } from "@/components/ui/Key";
import { MainNav } from "@/components/ui/MainNav";

interface InfoFeedProps {
  onSelectNoticias: () => void;
  onSelectVagas: () => void;
  onSelectInfo?: () => void;
  hideNav?: boolean;
}

export const InfoFeed: React.FC<InfoFeedProps> = ({
  onSelectNoticias,
  onSelectVagas,
  onSelectInfo,
  hideNav = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const card2Ref = useRef<HTMLElement>(null);
  return (
    <div className="page-shell">
      {/* Cabeçalho do Feed de Informações */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h1 className="font-semibold text-ink text-[15px] tracking-tight">
          Informações
        </h1>
        <span className="badge-inset">
          Diretrizes & Termos
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {/* Card 1: Resumo do Portal e Autoria */}
        <article
          aria-label="Sobre o Guarapuava Digital e autoria"
          className="surface-card w-full pt-5 px-5 pb-6 sm:pt-6 sm:px-6 sm:pb-7 flex flex-col gap-4"
        >
          <div>
            <h2 className="text-[20px] font-bold leading-[1.3] text-ink tracking-[-0.02em] mb-2.5">
              Guarapuava Digital
            </h2>
            <div className="space-y-3 text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body">
              <p>
                Guarapuava Digital é desenvolvido e mantido por <strong>Rodrigo Matos</strong>. O
                objetivo principal é apresentar uma experiência de uso fora do comum para sites
                tradicionais com notícias ou vagas de emprego.
              </p>
              <p>
                Com foco em Guarapuava, várias ferramentas e utilidades serão implementadas para
                facilitar o acesso, informação e a outros recursos para toda a população.
              </p>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-start">
            <a
              href="http://rodrigo.wtf/"
              target="_blank"
              rel="noopener noreferrer"
              className="key w-full sm:w-auto inline-flex items-center justify-center px-6 text-[13.5px] sm:text-[14px] font-semibold"
              title="Acessar o site de Rodrigo Matos"
            >
              Rodrigo Matos
            </a>
          </div>
        </article>

        {/* Card 2: Diretrizes, Transparência e Termos com Expandir / Recolher */}
        <article
          ref={card2Ref}
          aria-label="Diretrizes, transparência e termos do portal"
          className="surface-card w-full pt-5 px-5 pb-6 sm:pt-6 sm:px-6 sm:pb-7"
        >
          {/* Título Principal */}
          <h2 className="text-[20px] font-bold leading-[1.3] text-ink tracking-[-0.02em] mb-3">
            Transparência, privacidade e compromisso com Guarapuava
          </h2>

          {!isExpanded ? (
            <div className="space-y-4">
              <p className="text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body">
                O <strong>Guarapuava Digital</strong> é um agregador independente e
                gratuito, criado para facilitar o dia a dia de quem procura emprego
                e quer acompanhar o que acontece na nossa cidade e região, sem
                precisar navegar por dezenas de páginas diferentes.
              </p>
              <div className="pt-1 flex items-center justify-start">
                <Key
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="w-full sm:w-auto justify-center text-center font-semibold text-[13.5px] sm:text-[14px]"
                  title="Expandir termos e informações completas"
                >
                  Expandir
                </Key>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Bloco 1: Propósito e Recursos do Portal */}
              <section aria-labelledby="heading-funcionamento" className="space-y-3">
                <p className="text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body">
                  O <strong>Guarapuava Digital</strong> é uma iniciativa cívica, independente e
                  gratuita, desenvolvida para conectar a população aos serviços e acontecimentos de
                  Guarapuava em um só lugar, reunindo notícias locais, oportunidades de trabalho,
                  mapeamento comunitário e ferramentas de utilidade pública para o cotidiano da nossa cidade.
                </p>

                <h3
                  id="heading-noticias-vagas"
                  className="font-bold text-ink text-[15px] pt-1"
                >
                  Notícias e Vagas de Emprego
                </h3>

                <ul className="space-y-2 text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body">
                  <li className="flex items-start gap-2">
                    <span
                      className="text-coral font-bold select-none shrink-0"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>
                      <strong>Agregação de notícias locais:</strong> Monitoramos e indexamos manchetes
                      de portais jornalísticos e veículos de imprensa aberta da região, com crédito integral
                      e encaminhamento direto aos artigos originais de cada fonte.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span
                      className="text-coral font-bold select-none shrink-0"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>
                      <strong>Como encontramos as vagas:</strong> Reunimos informações publicadas abertamente
                      por empresas locais, agências oficiais (como a Agência do Trabalhador), murais
                      de contratação e canais institucionais de Guarapuava.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span
                      className="text-coral font-bold select-none shrink-0"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>
                      <strong>Isenção de responsabilidade sobre contratações:</strong> Não somos agência
                      de empregos e não intermediamos contratações nem participamos dos processos seletivos.
                      As oportunidades pertencem exclusivamente às empresas contratantes, que podem preencher,
                      alterar ou encerrar os processos a qualquer momento.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span
                      className="text-coral font-bold select-none shrink-0"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>
                      <strong>Aviso essencial de segurança:</strong> Nunca pague nenhum valor, taxa
                      de cadastro, exame ou material para participar de entrevistas de emprego. Empresas
                      sérias e idôneas jamais cobram candidatos.
                    </span>
                  </li>
                </ul>
              </section>

              {/* Divisória Tátil Pontilhada */}
              <div
                className="my-5 sm:my-6 border-b border-dotted border-rule/90"
                aria-hidden="true"
              />

              {/* Bloco 2: Utilidades Públicas (Ônibus, Itinerários e Descarte Correto) */}
              <section aria-labelledby="heading-utilidades" className="space-y-3">
                <h3
                  id="heading-utilidades"
                  className="font-bold text-ink text-[15px]"
                >
                  Utilidades Públicas: Transporte Coletivo e Descarte Correto
                </h3>

                <p className="text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body">
                  As ferramentas de utilidade urbana foram criadas de forma voluntária para prestar um
                  auxílio comunitário à população de Guarapuava, facilitando a consulta de horários
                  de ônibus e o descarte sustentável de resíduos:
                </p>

                <ul className="space-y-2 text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body">
                  <li className="flex items-start gap-2">
                    <span
                      className="text-coral font-bold select-none shrink-0"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>
                      <strong>Origem das informações e dados públicos:</strong> Os horários de saída,
                      linhas urbanas e interbairros, trajetos, itinerários e endereços dos pontos de ônibus
                      disponibilizados no portal foram compilados unicamente com base em dados públicos
                      acessíveis abertamente na internet e em canais informativos gerais.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span
                      className="text-coral font-bold select-none shrink-0"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>
                      <strong>Ausência de vínculo com a Pérola do Oeste:</strong> O portal Guarapuava
                      Digital é um projeto autônomo e <strong>não possui nenhum vínculo, afiliação, parceria,
                      convênio oficial nem representação com a empresa concessionária Pérola do Oeste</strong>,
                      assim como não tem ligação institucional com a Prefeitura Municipal de Guarapuava ou órgãos
                      municipais de trânsito e transporte. As informações não constituem canal oficial da concessionária.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span
                      className="text-coral font-bold select-none shrink-0"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>
                      <strong>Isenção de responsabilidade sobre horários e pontos:</strong> A definição de
                      frotas, frequências, itinerários, desvios operacionais, tarifas, atrasos e locais físicos
                      de paradas é de competência e gestão exclusiva da empresa concessionária. Os horários e
                      endereços dos pontos de ônibus apresentados podem estar sujeitos a alterações sem prévio
                      aviso, atrasos decorrentes do trânsito ou inconsistências cadastrais em relação à operação
                      real. <strong>O Guarapuava Digital e seus desenvolvedores não têm qualquer culpa, obrigação
                      ou responsabilidade por perdas de compromissos, atrasos em viagens, divergências de horários,
                      itinerários alterados ou incorreções nos endereços dos pontos.</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span
                      className="text-coral font-bold select-none shrink-0"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>
                      <strong>Recomendação de confirmação oficial:</strong> Este serviço possui finalidade
                      puramente consultiva e orientativa. Para itinerários críticos, emergências ou validações
                      em tempo real, recomendamos sempre a confirmação direta nos canais, terminais e guichês
                      oficiais de atendimento da Pérola do Oeste.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span
                      className="text-coral font-bold select-none shrink-0"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>
                      <strong>Guia de Descarte Correto:</strong> As orientações e locais de coleta para
                      descarte ecológico (pilhas, baterias, lâmpadas, remédios vencidos, pneus e eletrônicos)
                      são reunidos a partir de informações públicas de logística reversa. O portal não administra
                      os pontos de entrega e não garante horários de funcionamento ou capacidade receptiva
                      dos estabelecimentos indicados.
                    </span>
                  </li>
                </ul>
              </section>

              {/* Divisória Tátil Pontilhada */}
              <div
                className="my-5 sm:my-6 border-b border-dotted border-rule/90"
                aria-hidden="true"
              />

              {/* Bloco 3: Cidade Viva — Zeladoria Comunitária e Localização */}
              <section aria-labelledby="heading-cidade-viva" className="space-y-3">
                <h3
                  id="heading-cidade-viva"
                  className="font-bold text-ink text-[15px]"
                >
                  Cidade Viva: Mapeamento colaborativo e geolocalização sob demanda
                </h3>

                <p className="text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body">
                  A ferramenta <strong>Cidade Viva</strong> permite aos moradores de
                  Guarapuava acompanhar e relatar ocorrências de zeladoria urbana
                  (asfalto danificado, iluminação apagada, vazamentos de água, semáforos,
                  mato alto e focos de dengue) de forma pública e comunitária:
                </p>

                <ul className="space-y-2 text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body">
                  <li className="flex items-start gap-2">
                    <span
                      className="text-coral font-bold select-none shrink-0"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>
                      <strong>Localização estritamente sob demanda:</strong> O acesso ao
                      GPS do aparelho só é solicitado caso você decida abrir o mapa do
                      Cidade Viva para centralizar na sua área ou enviar um relato.
                      Não há nenhum rastreamento em segundo plano e você pode utilizar as
                      notícias, vagas e utilidades normalmente sem nunca conceder acesso à sua
                      localização.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span
                      className="text-coral font-bold select-none shrink-0"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>
                      <strong>Anonimização e conformidade com a LGPD:</strong> Não pedimos
                      nome, e-mail, telefone nem cadastro para submissão de relatos. O
                      endereço IP do dispositivo é transformado em um código criptográfico
                      unidirecional com salt secreto, utilizado unicamente para proteção
                      antispam, nunca sendo exposto
                      publicamente nem compartilhado.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span
                      className="text-coral font-bold select-none shrink-0"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>
                      <strong>Interesse público e validação comunitária:</strong> Fotos e
                      descrições registradas passam a integrar o mapa coletivo de interesse
                      público para ajudar toda a população e os serviços municipais a
                      identificar demandas prioritárias em Guarapuava.
                    </span>
                  </li>
                </ul>
              </section>

              {/* Divisória Tátil Pontilhada */}
              <div
                className="my-5 sm:my-6 border-b border-dotted border-rule/90"
                aria-hidden="true"
              />

              {/* Bloco 4: Privacidade e Dados Locais */}
              <section aria-labelledby="heading-privacidade" className="space-y-3">
                <h3
                  id="heading-privacidade"
                  className="font-bold text-ink text-[15px]"
                >
                  Privacidade e respeito ao seu aparelho
                </h3>

                <p className="text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body">
                  O portal foi desenhado para ser leve, rápido e sem intromissões na
                  sua vida digital:
                </p>

                <ul className="space-y-2 text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body">
                  <li className="flex items-start gap-2">
                    <span
                      className="text-coral font-bold select-none shrink-0"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>
                      <strong>Sem cadastro ou formulários:</strong> Não pedimos seu
                      nome, telefone, e-mail nem vínculos com redes sociais para ler as
                      notícias, consultar vagas ou verificar horários de transporte.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span
                      className="text-coral font-bold select-none shrink-0"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>
                      <strong>Suas escolhas ficam com você:</strong> Vagas favoritas,
                      rotas salvas, histórico visualizado e a escolha de tema (modo claro ou escuro)
                      ficam salvos apenas no seu próprio navegador, sem envio para
                      servidores externos.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span
                      className="text-coral font-bold select-none shrink-0"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>
                      <strong>Zero rastreadores invasivos:</strong> Não vendemos
                      dados nem utilizamos scripts comerciais de perfilamento de
                      usuários.
                    </span>
                  </li>
                </ul>
              </section>

              {/* Divisória Tátil Pontilhada */}
              <div
                className="my-5 sm:my-6 border-b border-dotted border-rule/90"
                aria-hidden="true"
              />

              {/* Bloco 5: Termos de Uso e Contato Direto */}
              <section aria-labelledby="heading-termos" className="space-y-3">
                <h3
                  id="heading-termos"
                  className="font-bold text-ink text-[15px]"
                >
                  Termos de uso do serviço
                </h3>

                <ul className="space-y-2 text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body">
                  <li className="flex items-start gap-2">
                    <span
                      className="text-coral font-bold select-none shrink-0"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>
                      <strong>Consulta livre e comunitária:</strong> Todo o conteúdo
                      aqui reunido é disponibilizado de forma aberta para benefício da
                      população de Guarapuava, dos trabalhadores locais e dos usuários do transporte público.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span
                      className="text-coral font-bold select-none shrink-0"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>
                      <strong>Candidatura e serviços em canais oficiais:</strong> Ao tocar em
                      &ldquo;Abrir site da vaga&rdquo; ou em links externos, você é encaminhado
                      diretamente aos canais indicados pelos anunciantes e operadoras (como
                      WhatsApp comercial, portais de RH ou sites oficiais), sujeitos
                      às diretrizes de cada entidade.
                    </span>
                  </li>
                </ul>

                <p className="pt-2 text-[12.5px] leading-relaxed text-ink-muted">
                  Dúvidas, sugestões, notificações sobre alterações em linhas de ônibus ou vagas
                  podem ser verificadas e reportadas diretamente junto aos canais informados por cada
                  empresa, entidade oficial ou concessionária responsável.
                </p>
              </section>

              {/* Botão Recolher */}
              <div className="pt-4 border-t border-dotted border-rule/90 flex items-center justify-start">
                <Key
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    card2Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="w-full sm:w-auto justify-center text-center font-semibold text-[13.5px] sm:text-[14px]"
                  title="Recolher informações detalhadas"
                >
                  Recolher
                </Key>
              </div>
            </div>
          )}
        </article>
      </div>

      {/* Rodapé padrão com os 4 botões para retorno imediato a Notícias ou Vagas */}
      {!hideNav && (
        <MainNav
          active="info"
          onNoticias={onSelectNoticias}
          onVagas={onSelectVagas}
          onSelectInfo={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            onSelectInfo?.();
          }}
        />
      )}
    </div>
  );
};

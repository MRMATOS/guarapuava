"use client";

import React from "react";
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

      {/* Cartão Único Tátil de Alabastro */}
      <article
        aria-label="Diretrizes, transparência e termos do portal"
        className="surface-card w-full pt-5 px-5 pb-6 sm:pt-6 sm:px-6 sm:pb-7"
      >
        {/* Título Principal */}
        <h2 className="text-[20px] font-bold leading-[1.3] text-ink tracking-[-0.02em] mb-3">
          Transparência, privacidade e compromisso com Guarapuava
        </h2>

        {/* Bloco 1: Como funciona e Isenção de Vagas */}
        <section aria-labelledby="heading-funcionamento" className="space-y-3">
          <p className="text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body">
            O <strong>Guarapuava Digital</strong> é um agregador independente e
            gratuito, criado para facilitar o dia a dia de quem procura emprego
            e quer acompanhar o que acontece na nossa cidade e região, sem
            precisar navegar por dezenas de páginas diferentes.
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
                <strong>Como encontramos as vagas:</strong> Reunimos informações
                publicadas abertamente por empresas locais, agências oficiais,
                murais de contratação e canais institucionais de Guarapuava.
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
                <strong>Isenção de responsabilidade:</strong> Não somos agência
                de empregos e não participamos dos processos seletivos. As
                oportunidades pertencem integralmente às empresas contratantes,
                que podem preencher ou encerrar os processos a qualquer momento.
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
                <strong>Aviso essencial de segurança:</strong> Nunca pague
                nenhum valor, taxa de cadastro ou custo de material para
                participar de entrevistas de emprego. Empresas sérias e idôneas
                jamais cobram candidatos.
              </span>
            </li>
          </ul>
        </section>

        {/* Divisória Tátil Pontilhada */}
        <div
          className="my-5 sm:my-6 border-b border-dotted border-rule/90"
          aria-hidden="true"
        />

        {/* Bloco 2: Privacidade e Dados Locais */}
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
                notícias ou consultar vagas.
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
                histórico visualizado e a escolha de tema (modo claro ou escuro)
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

        {/* Bloco 3: Termos de Uso e Contato Direto */}
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
                população de Guarapuava e dos trabalhadores locais.
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
                <strong>Candidatura em canais oficiais:</strong> Ao tocar em
                "Abrir site da vaga" ou em links externos, você é encaminhado
                diretamente aos canais indicados pelos contratantes (como
                WhatsApp comercial, portais de RH ou sites oficiais), sujeitos
                às diretrizes de cada empresa.
              </span>
            </li>
          </ul>

          <p className="pt-2 text-[12.5px] leading-relaxed text-ink-muted">
            Dúvidas, sugestões ou notificações sobre vagas encerradas podem ser
            verificadas diretamente junto aos canais informados por cada
            empresa contratante.
          </p>
        </section>
      </article>

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

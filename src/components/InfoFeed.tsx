"use client";

import React from "react";
import { MainNav } from "@/components/ui/MainNav";
import { ShieldAlert, Lock, FileText, CheckCircle2 } from "lucide-react";

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
        <h1 className="font-semibold text-ink text-[15px] sm:text-[16px] tracking-tight">
          Informações
        </h1>
        <span className="badge-inset">
          <span
            className="w-1.5 h-1.5 rounded-full bg-coral"
            aria-hidden="true"
          />
          Diretrizes & Termos
        </span>
      </div>

      <div className="space-y-4">
        {/* Bloco 1: Informações e Obrigações / Isenção de Vagas */}
        <section
          aria-labelledby="info-obligations-heading"
          className="surface-card w-full pt-4 px-5 pb-6 sm:pt-5 sm:px-6 sm:pb-7"
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className="p-1.5 rounded-full bg-coral/10 text-coral"
              aria-hidden="true"
            >
              <ShieldAlert className="w-4 h-4" strokeWidth={2.4} />
            </span>
            <span className="badge-inset text-[12px]">
              Transparência & Isenção
            </span>
          </div>

          <h2
            id="info-obligations-heading"
            className="text-[18px] sm:text-[19px] font-bold leading-[1.3] text-ink tracking-[-0.02em] mb-3"
          >
            Como as vagas são encontradas e obrigações do site
          </h2>

          <div className="space-y-3 text-[14px] sm:text-[14.5px] leading-[1.55] text-ink-body">
            <p>
              O <strong>Guarapuava Hoje</strong> é um agregador informativo
              independente. Nosso objetivo é facilitar o acesso às oportunidades
              de trabalho e notícias para quem vive ou busca colocação em nossa
              cidade e região.
            </p>

            <div className="p-3.5 rounded-xl bg-canvas border border-coral/25 shadow-inset-sm space-y-2">
              <div className="flex items-start gap-2 text-ink text-[13.5px] font-semibold">
                <CheckCircle2
                  className="w-4 h-4 text-coral shrink-0 mt-0.5"
                  strokeWidth={2.2}
                />
                <span>Coleta 100% automatizada</span>
              </div>
              <p className="text-[13px] text-ink-muted leading-relaxed">
                As oportunidades listadas são identificadas e organizadas por
                robôs e algoritmos que consultam canais públicos abertos,
                páginas de contratação e murais institucionais locais.
              </p>
            </div>

            <p>
              <strong>Isenção expressa de responsabilidade:</strong> Não somos
              uma agência de empregos nem participamos de nenhuma etapa da
              seleção. Não temos qualquer vínculo com as empresas contratantes
              e não nos responsabilizamos pela veracidade das informações,
              preenchimento prévio das vagas, condições de trabalho ou valores
              salariais descritos.
            </p>

            <p className="text-[13px] text-ink-muted italic border-l-2 border-coral/50 pl-3 py-0.5">
              Importante: Jamais pague qualquer quantia ou taxa para participar
              de entrevistas. Processos seletivos sérios nunca cobram do
              candidato.
            </p>
          </div>
        </section>

        {/* Bloco 2: Privacidade */}
        <section
          aria-labelledby="info-privacy-heading"
          className="surface-card w-full pt-4 px-5 pb-6 sm:pt-5 sm:px-6 sm:pb-7"
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className="p-1.5 rounded-full bg-coral/10 text-coral"
              aria-hidden="true"
            >
              <Lock className="w-4 h-4" strokeWidth={2.4} />
            </span>
            <span className="badge-inset text-[12px]">
              Privacidade & Controle
            </span>
          </div>

          <h2
            id="info-privacy-heading"
            className="text-[18px] sm:text-[19px] font-bold leading-[1.3] text-ink tracking-[-0.02em] mb-3"
          >
            Política de Privacidade
          </h2>

          <div className="space-y-3 text-[14px] sm:text-[14.5px] leading-[1.55] text-ink-body">
            <p>
              Acreditamos em uma internet leve e respeitosa. Por isso, a
              experiência neste site foi desenhada sem fricção e sem coleta
              desnecessária de dados:
            </p>

            <ul className="space-y-2.5 text-[13.5px]">
              <li className="flex items-start gap-2">
                <span
                  className="text-coral font-bold select-none shrink-0"
                  aria-hidden="true"
                >
                  •
                </span>
                <span>
                  <strong>Nenhum cadastro necessário:</strong> Você não precisa
                  criar conta, digitar e-mails ou vincular redes sociais para ler
                  notícias ou ver vagas.
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
                  <strong>Dados salvos apenas no seu aparelho:</strong> As vagas
                  que você salva como favoritas, as vagas marcadas como
                  visualizadas e o tema escolhido (modo claro ou escuro) ficam
                  gravados exclusivamente no seu próprio navegador
                  (armazenamento local).
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
                  <strong>Sem venda de dados:</strong> Suas escolhas pertencem
                  apenas a você. Não comercializamos dados de navegação nem
                  utilizamos rastreadores invasivos para terceiros.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Bloco 3: Termos de Uso */}
        <section
          aria-labelledby="info-terms-heading"
          className="surface-card w-full pt-4 px-5 pb-6 sm:pt-5 sm:px-6 sm:pb-7"
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className="p-1.5 rounded-full bg-coral/10 text-coral"
              aria-hidden="true"
            >
              <FileText className="w-4 h-4" strokeWidth={2.4} />
            </span>
            <span className="badge-inset text-[12px]">
              Termos de Uso
            </span>
          </div>

          <h2
            id="info-terms-heading"
            className="text-[18px] sm:text-[19px] font-bold leading-[1.3] text-ink tracking-[-0.02em] mb-3"
          >
            Termos de Uso do Serviço
          </h2>

          <div className="space-y-3 text-[14px] sm:text-[14.5px] leading-[1.55] text-ink-body">
            <p>
              Ao utilizar este agregador, você concorda com as seguintes
              condições de uso:
            </p>

            <ul className="space-y-2.5 text-[13.5px]">
              <li className="flex items-start gap-2">
                <span
                  className="text-coral font-bold select-none shrink-0"
                  aria-hidden="true"
                >
                  •
                </span>
                <span>
                  <strong>Finalidade estritamente informativa:</strong> Os
                  resumos jornalísticos e as oportunidades aqui reunidas são
                  fornecidos para consulta pública livre e gratuita.
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
                  <strong>Destinos externos:</strong> Ao clicar no botão de
                  candidatura ou em links externos, você é direcionado aos
                  canais oficiais das contratantes (como WhatsApp, portais de
                  RH ou sites de notícias parceiros), os quais possuem suas
                  próprias políticas e termos.
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
                  <strong>Atualização contínua:</strong> Vagas e notícias podem
                  ser alteradas, suspensas ou encerradas a qualquer momento pelas
                  empresas sem necessidade de aviso prévio.
                </span>
              </li>
            </ul>
          </div>
        </section>
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

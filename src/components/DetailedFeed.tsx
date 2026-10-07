"use client";

import React, { useState } from "react";
import { DailyDigest, NewsBatch } from "@/types/news";
import { ArrowLeft, X } from "lucide-react";
import { Dock } from "@/components/ui/Dock";
import { Key } from "@/components/ui/Key";
import { formatRelativeUpdateText } from "@/lib/utils/date";

interface DetailedFeedProps {
  digest: DailyDigest;
  tags: string[];
  onBack: () => void;
}

export const DetailedFeed: React.FC<DetailedFeedProps> = ({
  digest,
  tags,
  onBack,
}) => {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Toggle do filtro: clicar na mesma tag limpa o filtro
  const handleTagClick = (tag: string) => {
    setActiveTag((prev) => (prev === tag ? null : tag));
  };

  // Filtragem flexível por categoria
  const filteredBatches: NewsBatch[] = digest.batches
    .map((batch) => {
      if (!activeTag) return batch;
      const filteredItems = batch.items.filter((item) => {
        return (
          item.category.toLowerCase().includes(activeTag.toLowerCase()) ||
          activeTag.toLowerCase().includes(item.category.toLowerCase())
        );
      });
      return {
        ...batch,
        items: filteredItems,
      };
    })
    .filter((batch) => batch.items.length > 0);

  const filterIndicator = activeTag ? (
    <div className="badge-inset self-start border border-coral/40 rounded-xl px-3.5 py-1.5 text-[12px] text-coral">
      <span>
        Filtrando por: <strong className="text-ink font-bold">{activeTag}</strong>
      </span>
      <button
        type="button"
        onClick={() => setActiveTag(null)}
        className="text-coral hover:text-coral-deep font-bold cursor-pointer underline underline-offset-2 ml-1 touch-manipulation"
      >
        Limpar
      </button>
    </div>
  ) : null;

  return (
    <div className="page-shell">
      {/* Cartão do feed de atualizações */}
      <main className="surface-card w-full p-6 sm:p-7">
        {filteredBatches.length > 0 ? (
          filteredBatches.map((batch, batchIndex) => (
            <section key={batch.id} aria-label={`Atualização das ${batch.time}`}>
              {/* Metadados do bloco */}
              <div className="flex items-center justify-between mb-4 tracking-tight tabular-time">
                <span className="font-semibold text-ink text-[15px]">
                  {batch.date}
                </span>
                <span className="badge-inset">
                  {formatRelativeUpdateText({ date: batch.date, time: batch.time })}
                </span>
              </div>

              {/* Lista de notícias do bloco */}
              <ul className="space-y-4 text-[14.5px] sm:text-[15px] leading-[1.48] text-ink-body">
                {batch.items.map((item) => (
                  <li key={item.id} className="flex items-start">
                    <span
                      className="mr-2 text-coral font-black text-[17px] leading-[1.1] select-none shrink-0"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <p className="flex-1">
                      <strong className="font-bold text-ink">{item.title}:</strong>{" "}
                      <span>{item.text}</span>
                    </p>
                  </li>
                ))}
              </ul>

              {/* Separador pontilhado entre blocos */}
              {batchIndex < filteredBatches.length - 1 && (
                <div
                  className="my-6 border-b border-dotted border-rule/90"
                  aria-hidden="true"
                />
              )}
            </section>
          ))
        ) : (
          <div className="py-14 text-center text-ink-muted text-[15px]">
            <p>
              Nenhuma notícia recente na categoria{" "}
              <strong className="text-ink">&ldquo;{activeTag}&rdquo;</strong>.
            </p>
            <Key onClick={() => setActiveTag(null)} className="mt-4 gap-1.5">
              <X className="w-4 h-4" strokeWidth={2.2} />
              Remover filtro
            </Key>
          </div>
        )}
      </main>

      <Dock above={filterIndicator} align="between" aria-label="Filtros e navegação">
        {/* Carrossel de tags (4ª tag propositalmente cortada) */}
        <div
          role="toolbar"
          aria-label="Filtro de categorias"
          className="flex-1 min-w-0 self-stretch overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-2.5 py-2 px-1.5 -my-2 -mx-1.5"
        >
          {tags.map((tag) => (
            <Key
              key={tag}
              pressed={activeTag === tag}
              onClick={() => handleTagClick(tag)}
              title={activeTag === tag ? `Remover filtro ${tag}` : `Filtrar apenas por ${tag}`}
            >
              {tag}
            </Key>
          ))}
        </div>

        <Key variant="icon" onClick={onBack} aria-label="Voltar para a página inicial">
          <ArrowLeft className="w-5 h-5" strokeWidth={2.2} />
        </Key>
      </Dock>
    </div>
  );
};

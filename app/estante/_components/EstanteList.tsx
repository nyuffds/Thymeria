"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { openUnopenedBoosterAction, type OpenedCard } from "@/lib/actions";
import { CardPreview } from "@/app/components/CardPreview";
import { RARITIES } from "@/lib/constants";

interface Group {
  booster: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
  };
  ids: string[];
}

export function EstanteList({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState<{ name: string; cards: OpenedCard[] } | null>(null);
  const [revealedIdx, setRevealedIdx] = useState(0);

  function openOne(group: Group) {
    setError(null);
    const unopenedId = group.ids[0];
    startTransition(async () => {
      try {
        const cards = await openUnopenedBoosterAction(unopenedId);
        setOpened({ name: group.booster.name, cards });
        setRevealedIdx(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao abrir.");
      }
    });
  }

  function nextCard() {
    if (!opened) return;
    if (revealedIdx < opened.cards.length - 1) {
      setRevealedIdx(revealedIdx + 1);
    } else {
      setOpened(null);
      router.refresh();
    }
  }

  function skipToEnd() {
    if (!opened) return;
    setRevealedIdx(opened.cards.length - 1);
  }

  const currentCard = opened ? opened.cards[revealedIdx] : null;
  const currentRarity = currentCard ? RARITIES.find((r) => r.key === currentCard.rarity) : null;

  return (
    <>
      {error && (
        <p className="mb-4 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((g) => (
          <div
            key={g.booster.id}
            className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden flex flex-col"
          >
            <div
              className="aspect-[4/3] bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center relative"
              style={g.booster.imageUrl ? {
                backgroundImage: "url(" + g.booster.imageUrl + ")",
                backgroundSize: "cover",
                backgroundPosition: "center",
              } : {}}
            >
              {!g.booster.imageUrl && <span className="text-6xl text-zinc-700">📦</span>}
              {g.ids.length > 1 && (
                <span className="absolute top-2 right-2 bg-amber-600 text-zinc-950 font-bold text-sm px-2.5 py-0.5 rounded-full">
                  x{g.ids.length}
                </span>
              )}
            </div>

            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-heading font-bold text-amber-200">{g.booster.name}</h3>
              {g.booster.description && (
                <p className="font-lore italic text-sm text-zinc-400 mt-1 flex-1">
                  {g.booster.description}
                </p>
              )}
              <button
                onClick={() => openOne(g)}
                disabled={isPending}
                className="mt-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-zinc-950 font-semibold py-2 rounded-lg transition"
              >
                {isPending ? "Abrindo..." : "Abrir 1 booster"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {opened && currentCard && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <p className="text-xs uppercase text-amber-400 tracking-widest mb-2">
              {opened.name}
            </p>
            <p className="text-sm text-zinc-500 mb-6">
              Carta {revealedIdx + 1} de {opened.cards.length}
            </p>

            <div
              key={revealedIdx}
              className="reveal-animation mx-auto bg-gradient-to-br from-zinc-900 to-zinc-950 border-4 rounded-2xl p-8 shadow-2xl"
              style={{ borderColor: currentRarity ? currentRarity.color : "#aaa" }}
            >
                <div className="flex justify-center mb-6">
                  <CardPreview card={currentCard} />
                </div>
                <p
                className="font-heading text-3xl font-bold uppercase tracking-wider mb-2"
                style={{ color: currentCard.faction.color }}
              >
                {currentCard.name}
              </p>
              <p className="text-sm text-zinc-400 font-lore italic">
                {currentCard.faction.name}
              </p>
              <p
                className="mt-4 text-xs uppercase tracking-wider font-bold"
                style={{ color: currentRarity ? currentRarity.color : "#aaa" }}
              >
                {currentRarity ? currentRarity.label : currentCard.rarity}
              </p>
              <p className="mt-4">
                {currentCard.wasNew ? (
                  <span className="text-emerald-400 font-bold animate-pulse">
                    ✓ NOVA!
                  </span>
                ) : (
                  <span className="text-zinc-500 text-sm italic">
                    Você já tinha esta carta
                  </span>
                )}
              </p>
            </div>

            <div className="mt-8 flex justify-center gap-2">
              <button
                onClick={skipToEnd}
                disabled={revealedIdx === opened.cards.length - 1}
                className="px-4 py-2 text-zinc-400 hover:text-amber-200 text-sm disabled:opacity-30"
              >
                Pular animação
              </button>
              <button
                onClick={nextCard}
                className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold px-6 py-2 rounded-lg transition"
              >
                {revealedIdx < opened.cards.length - 1 ? "Próxima" : "Fechar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
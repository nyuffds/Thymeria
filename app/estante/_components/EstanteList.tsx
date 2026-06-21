"use client";

import { useState } from "react";
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
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState<{ name: string; cards: OpenedCard[] } | null>(null);
  const [revealedIdx, setRevealedIdx] = useState(0);
  const [isOpening, setIsOpening] = useState(false);

  async function openOne(group: Group) {
    if (isOpening) return;
    setIsOpening(true);
    setError(null);
    const unopenedId = group.ids[0];
    try {
      const cards = await openUnopenedBoosterAction(unopenedId);
      setOpened({ name: group.booster.name, cards });
      setRevealedIdx(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao abrir.");
    } finally {
      setIsOpening(false);
    }
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

  function prevCard() {
    if (!opened) return;
    if (revealedIdx > 0) setRevealedIdx(revealedIdx - 1);
  }

  function closeModal() {
    setOpened(null);
    router.refresh();
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

      {groups.length === 0 && !opened && (
        <div style={{ background: "rgba(20,12,4,0.5)", border: "1px solid #3d3022", borderRadius: 6, padding: "48px 20px", textAlign: "center" }}>
          <p style={{ margin: "0 0 8px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 14, color: "#8b6f3a", letterSpacing: "0.1em" }}>
            Estante vazia
          </p>
          <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#5f5340" }}>
            Compre boosters no <a href="/loja" style={{ color: "#c9a961" }}>Mercado do Eitri</a> pra comecar.
          </p>
        </div>
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
                disabled={isOpening}
                className="mt-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-zinc-950 font-semibold py-2 rounded-lg transition"
              >
                {isOpening ? "Abrindo..." : "Abrir 1 booster"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {opened && currentCard && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur z-50 flex items-center justify-center p-4">
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 text-zinc-400 hover:text-amber-200 text-3xl leading-none w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-900/80 transition"
            title="Fechar"
          >
            &times;
          </button>

          <div className="flex items-center gap-4 md:gap-8 max-w-6xl w-full">
            <button
              onClick={prevCard}
              disabled={revealedIdx === 0}
              className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-full bg-zinc-900/80 hover:bg-amber-700/80 disabled:opacity-20 disabled:hover:bg-zinc-900/80 text-amber-200 text-3xl md:text-4xl flex items-center justify-center transition border border-zinc-700 hover:border-amber-500"
              title="Carta anterior"
            >
              &#x2039;
            </button>

            <div className="flex-1 max-w-md mx-auto text-center">
              <p className="text-xs uppercase text-amber-400 tracking-widest mb-1">{opened.name}</p>
              <p className="text-sm text-zinc-500 mb-3">
                Carta {revealedIdx + 1} de {opened.cards.length}
              </p>

              <div className="flex justify-center gap-1.5 mb-4">
                {opened.cards.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setRevealedIdx(i)}
                    className={`w-2 h-2 rounded-full transition ${i === revealedIdx ? "bg-amber-400 w-6" : i < revealedIdx ? "bg-zinc-500" : "bg-zinc-700"}`}
                    title={`Carta ${i + 1}`}
                  />
                ))}
              </div>

              <div
                key={revealedIdx}
                className="reveal-animation mx-auto bg-gradient-to-br from-zinc-900 to-zinc-950 border-4 rounded-2xl p-5 shadow-2xl"
                style={{ borderColor: currentRarity ? currentRarity.color : "#aaa" }}
              >
                <div className="flex justify-center mb-4">
                  <CardPreview card={currentCard} size="large" />
                </div>
                <p
                  className="font-heading text-2xl font-bold uppercase tracking-wider mb-1"
                  style={{ color: currentCard.faction.color }}
                >
                  {currentCard.name}
                </p>
                <p className="text-sm text-zinc-400 font-lore italic">{currentCard.faction.name}</p>
                <p
                  className="mt-2 text-xs uppercase tracking-wider font-bold"
                  style={{ color: currentRarity ? currentRarity.color : "#aaa" }}
                >
                  {currentRarity ? currentRarity.label : currentCard.rarity}
                </p>
                <div className="mt-2 flex justify-center gap-3 text-xs">
                  <span className="text-zinc-500">
                    <span className="text-zinc-300 font-bold">{currentCard.cardType}</span>
                  </span>
                  {currentCard.cardType === "UNIT" && (
                    <>
                      <span className="text-zinc-500">
                        Poder: <span className="text-amber-300 font-bold">{currentCard.power}</span>
                      </span>
                      {currentCard.rows && (
                        <span className="text-zinc-500">
                          Fileiras: <span className="text-zinc-300">{currentCard.rows.split(",").join(", ")}</span>
                        </span>
                      )}
                    </>
                  )}
                </div>
                {currentCard.ability && (
                  <div className="mt-3 bg-zinc-900/80 border border-amber-700/40 rounded-lg p-3 text-left">
                    <p className="text-xs uppercase tracking-wider text-amber-400 font-bold mb-1">
                      {currentCard.ability.name}
                    </p>
                    <p className="text-sm text-zinc-300 leading-snug">{currentCard.ability.description}</p>
                  </div>
                )}
                {currentCard.loreText && (
                  <p className="mt-3 text-xs text-zinc-500 italic font-lore">&ldquo;{currentCard.loreText}&rdquo;</p>
                )}
                <p className="mt-3">
                  {currentCard.wasNew ? (
                    <span className="text-emerald-400 font-bold animate-pulse">&#10003; NOVA!</span>
                  ) : (
                    <span className="text-zinc-500 text-sm italic">Voce ja tinha esta carta</span>
                  )}
                </p>
              </div>

              <div className="mt-4 flex justify-center">
                {revealedIdx === opened.cards.length - 1 ? (
                  <button
                    onClick={closeModal}
                    className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold px-8 py-2 rounded-lg transition"
                  >
                    Fechar
                  </button>
                ) : (
                  <button
                    onClick={skipToEnd}
                    className="px-4 py-2 text-zinc-500 hover:text-amber-200 text-xs uppercase tracking-wider transition"
                  >
                    Ir para a ultima
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={nextCard}
              disabled={revealedIdx >= opened.cards.length - 1}
              className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-full bg-zinc-900/80 hover:bg-amber-700/80 disabled:opacity-20 disabled:hover:bg-zinc-900/80 text-amber-200 text-3xl md:text-4xl flex items-center justify-center transition border border-zinc-700 hover:border-amber-500"
              title="Proxima carta"
            >
              &#x203A;
            </button>
          </div>
        </div>
      )}
    </>
  );
}

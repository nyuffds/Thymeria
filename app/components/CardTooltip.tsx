"use client";

import { useState, useRef, useEffect } from "react";

interface CardData {
  name: string;
  power: number;
  rarity: string;
  cardType: string;
  imageUrl?: string | null;
  frameUrl?: string | null;
  faction: { name: string; color: string };
  ability: { name: string; description: string } | null;
  basePower?: number;
  shielded?: boolean;
  isToken?: boolean;
}

interface Props {
  card: CardData;
  children: React.ReactNode;
  fillContainer?: boolean;
}

const RARITY_LABEL: Record<string, string> = {
  COMMON: "Comum",
  UNCOMMON: "Incomum",
  RARE: "Rara",
  EPIC: "Épica",
  LEGENDARY: "Lendária",
};
const RARITY_COLOR: Record<string, string> = {
  COMMON: "#9ca3af",
  UNCOMMON: "#34d399",
  RARE: "#60a5fa",
  EPIC: "#a78bfa",
  LEGENDARY: "#fbbf24",
};
const TYPE_LABEL: Record<string, string> = {
  UNIT: "Unidade",
  SPECIAL: "Especial",
  WEATHER: "Clima",
  LEADER: "Líder",
};

export function CardTooltip({ card, children, fillContainer }: Props) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!show || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    // Posiciona acima do elemento por padrão; se não couber, joga abaixo
    const tooltipHeight = (card.frameUrl || card.imageUrl) ? 560 : 220; // com imagem fica maior
    const top = rect.top - tooltipHeight - 8;
    const left = rect.left + rect.width / 2;
    setPosition({
      top: top < 10 ? rect.bottom + 8 : top,
      left,
    });
  }, [show]);

  const rarityColor = RARITY_COLOR[card.rarity] ?? "#9ca3af";
  const powerBoosted = card.basePower !== undefined && card.basePower !== card.power;

  return (
    <span
      ref={wrapperRef}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      className={fillContainer ? "relative block w-full h-full" : "relative inline-block"}
    >
      {children}
      {show && position && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{
            top: position.top,
            left: position.left,
            transform: "translateX(-50%)",
          }}
        >
          <div
            className="bg-zinc-900 border-2 rounded-lg shadow-2xl p-3 w-96 text-left"
            style={{ borderColor: rarityColor }}
          >
            {/* Miniatura da carta */}
            {(card.frameUrl || card.imageUrl) && (
              <div
                className="w-full aspect-[3/4] rounded mb-2 overflow-hidden border"
                style={{
                  borderColor: rarityColor + "66",
                  backgroundImage: "url(" + (card.frameUrl ?? card.imageUrl) + ")",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            )}
          
            {/* Cabeçalho: nome + raridade */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-heading text-amber-200 text-sm leading-tight">
                {card.name}
              </h3>
              <span
                className="text-[10px] uppercase tracking-wider font-semibold flex-shrink-0"
                style={{ color: rarityColor }}
              >
                {RARITY_LABEL[card.rarity] ?? card.rarity}
              </span>
            </div>

            {/* Linha de stats */}
            <div className="flex items-center gap-3 text-xs text-zinc-400 mb-2 pb-2 border-b border-zinc-800">
              <span>
                <span className="text-amber-300 font-mono font-bold text-base">
                  {card.power}
                </span>
                {powerBoosted && (
                  <span className="text-zinc-500 ml-1">
                    (base {card.basePower})
                  </span>
                )}
              </span>
              <span className="text-zinc-600">·</span>
              <span>{TYPE_LABEL[card.cardType] ?? card.cardType}</span>
              <span className="text-zinc-600">·</span>
              <span style={{ color: card.faction.color }}>
                {card.faction.name}
              </span>
            </div>

            {/* Habilidade */}
            {card.ability ? (
              <div>
                <p className="text-xs font-semibold text-purple-300 mb-0.5">
                  ✦ {card.ability.name}
                </p>
                <p className="text-xs text-zinc-300 leading-snug">
                  {card.ability.description}
                </p>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">Sem habilidade.</p>
            )}

            {/* Estados do tabuleiro */}
            {(card.shielded || card.isToken) && (
              <div className="mt-2 pt-2 border-t border-zinc-800 flex gap-2 text-[10px]">
                {card.shielded && (
                  <span className="text-blue-400">◆ Com escudo</span>
                )}
                {card.isToken && (
                  <span className="text-zinc-500">• Token invocado</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
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
  const [isCompactView, setIsCompactView] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show || !wrapperRef.current) return;
    const isCompact = window.innerHeight < 720;
    setIsCompactView(isCompact);
    // Reset position pra forcar re-medicao
    setPosition({ top: -9999, left: -9999 });
  }, [show, card.name]);

  useEffect(() => {
    if (!show || !wrapperRef.current || !tooltipRef.current) return;
    if (!position || position.top !== -9999) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const tipRect = tooltipRef.current.getBoundingClientRect();
    const tooltipWidth = tipRect.width;
    const tooltipHeight = tipRect.height;
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = rect.top - tooltipHeight - margin;
    let left = rect.left + rect.width / 2;
    if (top < margin) top = rect.bottom + margin;
    const halfW = tooltipWidth / 2;
    if (left - halfW < margin) left = halfW + margin;
    if (left + halfW > vw - margin) left = vw - halfW - margin;
    if (top + tooltipHeight > vh - margin) top = Math.max(margin, vh - tooltipHeight - margin);
    setPosition({ top, left });
  }, [position, show]);
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
            ref={tooltipRef}
            className={(isCompactView ? "w-[280px] p-2" : "w-80 p-3") + " bg-zinc-900 border-2 rounded-lg shadow-2xl text-left"}
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
// app/components/CardPreview.tsx
// Visual ornamentado de uma carta — estética de relíquia medieval.
// Reutilizável em catálogo, deck builder, partida etc.

import { RARITIES, ROWS } from "@/lib/constants";

export interface CardPreviewData {
  name: string;
  power: number;
  rows: string;           // CSV "MELEE,RANGED"
  rarity: string;
  cardType: string;
  loreText?: string | null;
  imageUrl?: string | null;
  faction: { name: string; color: string };
  ability?: { name: string; description: string } | null;
}

const ROW_ICON: Record<string, string> = {
  MELEE:  "⚔",
  RANGED: "🏹",
  SIEGE:  "🏰",
};

export function CardPreview({ card }: { card: CardPreviewData }) {
  const rarity = RARITIES.find((r) => r.key === card.rarity);
  const rowList = card.rows.split(",").filter(Boolean);

  return (
    <div className="relative w-64" style={{ aspectRatio: "5 / 7" }}>
      {/* Moldura externa dourada */}
      <div className="frame-gold absolute inset-0 rounded-lg p-[3px] shadow-2xl">
        {/* Faixa azul-noite interna (anel entre moldura e conteúdo) */}
        <div
          className="w-full h-full rounded-md p-[2px]"
          style={{ backgroundColor: card.faction.color }}
        >
          {/* Pergaminho interno */}
          <div className="corner-ornament relative w-full h-full bg-parchment rounded-sm overflow-hidden flex flex-col">

            {/* Cabeçalho: poder + fileiras */}
            <div
              className="flex items-center justify-between px-2 py-1.5 border-b-2"
              style={{
                borderColor: card.faction.color,
                background: `linear-gradient(180deg, ${card.faction.color}66 0%, transparent 100%)`,
              }}
            >
              <div className="relative">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-heading font-black text-lg shadow-md"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, #f4d97a, #d4af37 60%, #8b6914)`,
                    color: "var(--ink)",
                    border: "2px solid var(--bronze)",
                  }}
                >
                  {card.power}
                </div>
              </div>
              <div className="flex gap-1 text-base">
                {rowList.map((r) => (
                  <span
                    key={r}
                    title={ROWS.find((x) => x.key === r)?.label}
                    style={{ filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.4))" }}
                  >
                    {ROW_ICON[r] ?? "?"}
                  </span>
                ))}
              </div>
            </div>

            {/* Janela da arte */}
            <div
              className="relative mx-2 mt-2 flex-1 min-h-0 rounded-sm overflow-hidden border-2"
              style={{ borderColor: "var(--bronze)" }}
            >
              {card.imageUrl ? (
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: `url(${card.imageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                  <span className="text-5xl text-zinc-700">✦</span>
                </div>
              )}
            </div>

            {/* Faixa do nome */}
            <div
              className="mx-2 mt-2 px-2 py-1 text-center border-y"
              style={{
                borderColor: "var(--bronze)",
                background: "linear-gradient(180deg, var(--parchment) 0%, var(--parchment-dark) 100%)",
              }}
            >
              <h3 className="font-heading font-bold text-[var(--ink)] leading-tight text-sm uppercase tracking-wider">
                {card.name}
              </h3>
              <p
                className="font-lore italic text-[10px] mt-0.5"
                style={{ color: card.faction.color === "#95a5a6" ? "var(--ink)" : "var(--night-blue)" }}
              >
                {card.faction.name}
                {rarity && <span className="text-[var(--bronze)]"> · {rarity.label}</span>}
              </p>
            </div>

            {/* Habilidade */}
            {card.ability && (
              <div className="mx-2 mt-1 px-2 py-1">
                <p className="font-heading text-[10px] font-bold uppercase tracking-wide text-[var(--gold-deep)]">
                  ⚡ {card.ability.name}
                </p>
                <p className="font-lore text-xs text-[var(--ink)] leading-tight">
                  {card.ability.description}
                </p>
              </div>
            )}

            {/* Rodapé: lore + gema */}
            <div className="mt-auto px-2 pb-2 pt-1 flex items-end gap-2">
              <div
                className="gem w-5 h-5 rounded-full flex-shrink-0 border"
                style={{
                  ["--gem-color" as string]: card.faction.color,
                  borderColor: "var(--bronze)",
                }}
              />
              {card.loreText && (
                <p className="font-lore italic text-[10px] text-[var(--ink)] leading-tight flex-1 text-right">
                  &ldquo;{card.loreText}&rdquo;
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
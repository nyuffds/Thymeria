// app/components/CardPreview.tsx
// Visual ornamentado de uma carta.
// Comportamento do frameUrl:
//   - frameUrl + imageUrl: arte dentro da moldura padrao + frame customizado sobreposto
//   - frameUrl SEM imageUrl: frame customizado preenche tudo (visao "carta completa")
//   - imageUrl SEM frameUrl: moldura padrao com arte dentro
//   - sem nenhum: moldura padrao com simbolo placeholder

import { RARITIES, ROWS } from "@/lib/constants";

export interface CardPreviewData {
  name: string;
  power: number;
  rows: string;
  rarity: string;
  cardType: string;
  loreText?: string | null;
  imageUrl?: string | null;
  frameUrl?: string | null;
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

  // Se tem frameUrl mas nao tem imageUrl: renderiza so o frame ocupando tudo
  const frameOnly = !!card.frameUrl;

  return (
    <div
      className={"relative w-80 " + (card.rarity === "MYTHIC" ? "rarity-mythic" : "")}
      style={{ aspectRatio: "5 / 7" }}
    >
      {frameOnly ? (
        // Modo "carta completa" - so o PNG do frame
        <div
          className="absolute inset-0 rounded-lg shadow-2xl"
          style={{
            backgroundImage: "url(" + card.frameUrl + ")",
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      ) : (
        // Modo padrao - moldura gerada + arte dentro
        <>
          <div className="frame-gold absolute inset-0 rounded-lg p-[3px] shadow-2xl">
            <div
              className="w-full h-full rounded-md p-[2px]"
              style={{ backgroundColor: card.faction.color }}
            >
              <div className="corner-ornament relative w-full h-full bg-parchment rounded-sm overflow-hidden flex flex-col">

                {/* Cabecalho: poder + fileiras */}
                <div
                  className="relative z-20 flex items-center justify-between px-2 py-1.5 border-b-2"
                  style={{
                    borderColor: card.faction.color,
                    background: "linear-gradient(180deg, " + card.faction.color + "66 0%, transparent 100%)",
                  }}
                >
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
                  <div className="relative">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-heading font-black text-lg shadow-md"
                      style={{
                        background: "radial-gradient(circle at 35% 30%, #f4d97a, #d4af37 60%, #8b6914)",
                        color: "var(--ink)",
                        border: "2px solid var(--bronze)",
                      }}
                    >
                      {card.power}
                    </div>
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
                        backgroundImage: "url(" + card.imageUrl + ")",
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
                  className="relative z-20 mx-2 mt-2 px-2 py-1 text-center border-y"
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

                {/* Lore */}
                {card.loreText && (
                  <div className="mx-2 mb-2 mt-auto pt-1 border-t" style={{ borderColor: "var(--bronze)" }}>
                    <p className="font-lore italic text-[10px] text-[var(--ink-soft)] leading-snug">
                      &ldquo;{card.loreText}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Frame customizado opcional (PNG transparente sobre a moldura padrao) */}
          {card.frameUrl && (
            <div
              className="absolute inset-0 pointer-events-none rounded-lg z-10"
              style={{
                backgroundImage: "url(" + card.frameUrl + ")",
                backgroundSize: "100% 100%",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
"use client";

// app/_components/CardFrame.tsx
// Componente de carta estilizada (estilo ilustracao de carta de Tarot/Gwent epica).
// Compoe: moldura dourada, arte, estandarte vertical com poder/brasao/tipo, cartouche de nome, gema de raridade.
// Reutilizavel em todas as telas onde uma carta eh exibida.

import { getFactionSymbol, getRarityVisual, getTypeIcon } from "@/lib/cards/card-config";

interface Props {
  name: string;
  power: number;
  rarity: string;
  cardType: string;
  imageUrl?: string | null;
  factionName: string;
  factionColor: string;
  // Estados opcionais para o tabuleiro
  basePower?: number;
  shielded?: boolean;
  isToken?: boolean;
  // Dimensoes - "lg" (catalogo/preview), "md" (mao/colecao), "sm" (tabuleiro compacto)
  size?: "sm" | "md" | "lg";
  // Click handler opcional
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
}

const SIZES = {
  sm: { width: 100, height: 150, nameSize: 10, powerSize: 16, bannerWidth: 22 },
  md: { width: 180, height: 270, nameSize: 14, powerSize: 22, bannerWidth: 36 },
  lg: { width: 320, height: 480, nameSize: 22, powerSize: 36, bannerWidth: 60 },
};

export function CardFrame({
  name, power, rarity, cardType, imageUrl,
  factionName, factionColor,
  basePower, shielded, isToken,
  size = "md", onClick, selected, disabled, className,
}: Props) {
  const dims = SIZES[size];
  const factionSymbol = getFactionSymbol(factionName);
  const rarityVis = getRarityVisual(rarity);
  const typeIcon = getTypeIcon(cardType);

  const powerBoosted = basePower !== undefined && basePower !== power;
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      disabled={disabled}
      className={"relative flex-shrink-0 transition " + (onClick ? "cursor-pointer hover:scale-105 hover:z-10 " : "") + (selected ? "ring-2 ring-amber-400 " : "") + (className ?? "")}
      style={{
        width: dims.width + "px",
        height: dims.height + "px",
        padding: 0,
        background: "transparent",
        border: "none",
      }}
    >
      {/* Moldura dourada (gradiente) */}
      <div
        className="absolute inset-0 rounded-md"
        style={{
          background:
            "linear-gradient(135deg, #6b4423 0%, #d4a04a 25%, #8b6019 50%, #d4a04a 75%, #3d2817 100%)",
          padding: "3px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255, 220, 130, 0.4)",
        }}
      >
        <div
          className="relative w-full h-full rounded overflow-hidden"
          style={{
            background: imageUrl ? "#000" : "#1f1814",
          }}
        >
          {/* Arte de fundo */}
          {imageUrl && (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "url(" + imageUrl + ")",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          )}
          {!imageUrl && (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-700 text-4xl">
              ✦
            </div>
          )}

          {/* Vinheta escura nas bordas */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: "inset 0 0 40px rgba(0,0,0,0.6)",
            }}
          />

          {/* Selo do sol no topo central (decorativo) */}
          {size !== "sm" && (
            <div
              className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center font-bold"
              style={{
                top: size === "lg" ? "6px" : "3px",
                width: size === "lg" ? "40px" : "22px",
                height: size === "lg" ? "40px" : "22px",
                borderRadius: "50%",
                background: "radial-gradient(circle, #f3c969 0%, #8b6019 100%)",
                border: "1.5px solid #3d2817",
                boxShadow: "0 0 8px rgba(243, 201, 105, 0.6)",
                color: "#1a0f06",
                fontSize: size === "lg" ? "20px" : "12px",
              }}
            >
              ☀
            </div>
          )}

          {/* Estandarte vertical à direita */}
          <div
            className="absolute top-0 bottom-0 flex flex-col items-center justify-between pt-1 pb-2"
            style={{
              right: "4px",
              width: dims.bannerWidth + "px",
              background: "linear-gradient(180deg, " + factionColor + "ee 0%, " + factionColor + "cc 100%)",
              borderLeft: "1.5px solid #d4a04a",
              borderRight: "1.5px solid #d4a04a",
              boxShadow: "inset 0 0 8px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.5)",
              clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 8px), 50% 100%, 0 calc(100% - 8px))",
            }}
          >
            {/* Poder no topo */}
            <div
              className="flex items-center justify-center font-bold w-full"
              style={{
                color: "#fff",
                fontSize: dims.powerSize + "px",
                textShadow: "0 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(243, 201, 105, 0.4)",
                fontFamily: "Georgia, serif",
              }}
            >
              {power}
              {powerBoosted && size !== "sm" && (
                <span className="text-[8px] text-emerald-300 ml-0.5">↑</span>
              )}
            </div>

            {/* Brasao da faccao (centro) */}
            {size !== "sm" && (
              <div
                className="flex items-center justify-center"
                style={{
                  fontSize: (dims.bannerWidth * 0.7) + "px",
                  filter: "drop-shadow(0 0 4px rgba(243, 201, 105, 0.6))",
                }}
              >
                {factionSymbol}
              </div>
            )}

            {/* Icone do tipo no rodape */}
            {size !== "sm" && (
              <div
                className="flex items-center justify-center rounded-full border-2"
                style={{
                  width: (dims.bannerWidth * 0.65) + "px",
                  height: (dims.bannerWidth * 0.65) + "px",
                  background: typeIcon.background,
                  borderColor: "#d4a04a",
                  fontSize: (dims.bannerWidth * 0.4) + "px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
                }}
              >
                {typeIcon.icon}
              </div>
            )}
          </div>

          {/* Estados no canto superior esquerdo (escudo/token) */}
          {(shielded || isToken) && (
            <div className="absolute top-1 left-1 flex flex-col gap-0.5">
              {shielded && (
                <span className="w-5 h-5 rounded-full bg-blue-900/90 border border-blue-400 flex items-center justify-center text-blue-200 text-xs shadow">
                  ◆
                </span>
              )}
              {isToken && (
                <span className="w-5 h-5 rounded-full bg-zinc-800/90 border border-zinc-500 flex items-center justify-center text-zinc-300 text-[10px] shadow">
                  •
                </span>
              )}
            </div>
          )}

          {/* Cartouche de nome no rodape */}
          <div
            className="absolute left-0 bottom-0 px-2 py-1.5"
            style={{
              right: (dims.bannerWidth + 8) + "px",
              background:
                "linear-gradient(180deg, rgba(245, 232, 200, 0.95) 0%, rgba(220, 200, 160, 0.95) 100%)",
              borderTop: "2px solid #8b6019",
              borderRight: "2px solid #8b6019",
              borderTopRightRadius: "4px",
              boxShadow: "0 -2px 6px rgba(0,0,0,0.5)",
            }}
          >
            <p
              className="text-center font-bold leading-tight"
              style={{
                fontSize: dims.nameSize + "px",
                color: "#3d2817",
                fontFamily: "Georgia, serif",
                textShadow: "0 1px 0 rgba(255,255,255,0.4)",
                letterSpacing: size === "lg" ? "0.05em" : "0",
              }}
            >
              {name}
            </p>
            {size !== "sm" && (
              <p
                className="text-center"
                style={{
                  fontSize: Math.max(8, dims.nameSize - 4) + "px",
                  color: factionColor,
                  fontFamily: "Georgia, serif",
                  marginTop: "-2px",
                }}
              >
                {factionName}
              </p>
            )}
          </div>

          {/* Gema de raridade no canto inferior esquerdo */}
          {size !== "sm" && (
            <div
              className="absolute rounded-full border-2 flex items-center justify-center"
              style={{
                bottom: size === "lg" ? "8px" : "4px",
                left: size === "lg" ? "8px" : "4px",
                width: size === "lg" ? "28px" : "16px",
                height: size === "lg" ? "28px" : "16px",
                background: "radial-gradient(circle at 30% 30%, " + rarityVis.gemColor + " 0%, " + rarityVis.gemSecondary + " 100%)",
                borderColor: "#d4a04a",
                boxShadow: "0 0 8px " + rarityVis.color + "88, inset 0 0 4px rgba(255,255,255,0.4)",
              }}
              title={rarityVis.label}
            />
          )}
        </div>
      </div>
    </Wrapper>
  );
}
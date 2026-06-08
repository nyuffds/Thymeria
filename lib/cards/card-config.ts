// lib/cards/card-config.ts
// Configuracao visual das cartas: simbolos das faccoes, gemas de raridade, icones de tipo.
// Edite aqui pra customizar visuais sem mexer no componente CardFrame.

export interface FactionSymbol {
  name: string;
  symbol: string;        // emoji ou caractere
  // futuramente: svgPath, imageUrl
}

export interface RaritySymbol {
  key: string;
  label: string;
  color: string;
  gemColor: string;      // cor da gema no canto inferior esquerdo
  gemSecondary: string;  // cor secundaria do gradiente
}

export interface TypeIcon {
  key: string;
  label: string;
  icon: string;          // emoji
  background: string;    // cor de fundo do circulo no estandarte
}

// ─────────────────────────────────────────────
// Simbolos das faccoes (mostrados no estandarte vertical)
// ─────────────────────────────────────────────

export const FACTION_SYMBOLS: Record<string, FactionSymbol> = {
  Valtres:   { name: "Valtres",   symbol: "🦅" },  // grifo
  Kaldaey:   { name: "Kaldaey",   symbol: "❄"  },  // floco/gelo
  "A'Ralith": { name: "A'Ralith", symbol: "🌳" },  // arvore antiga
  "Lómerel": { name: "Lómerel",   symbol: "📜" },  // pergaminho
  Lomerel:   { name: "Lomerel",   symbol: "📜" },  // fallback sem acento
  Solkaran:  { name: "Solkaran",  symbol: "⚓" },  // ancora
  Qadesh:    { name: "Qadesh",    symbol: "🗡" },  // adaga
  Velquar:   { name: "Velquar",   symbol: "🜍" },  // simbolo alquimico
  Neutro:    { name: "Neutro",    symbol: "✦"  },  // estrela 4 pontas
};

export function getFactionSymbol(factionName: string): string {
  return FACTION_SYMBOLS[factionName]?.symbol ?? "✦";
}

// ─────────────────────────────────────────────
// Raridades (gema no canto inferior esquerdo)
// ─────────────────────────────────────────────

export const RARITY_SYMBOLS: Record<string, RaritySymbol> = {
  COMMON: {
    key: "COMMON",
    label: "Comum",
    color: "#9ca3af",
    gemColor: "#e5e7eb",
    gemSecondary: "#6b7280",
  },
  UNCOMMON: {
    key: "UNCOMMON",
    label: "Incomum",
    color: "#34d399",
    gemColor: "#6ee7b7",
    gemSecondary: "#047857",
  },
  RARE: {
    key: "RARE",
    label: "Rara",
    color: "#60a5fa",
    gemColor: "#93c5fd",
    gemSecondary: "#1e40af",
  },
  EPIC: {
    key: "EPIC",
    label: "Epica",
    color: "#a78bfa",
    gemColor: "#c4b5fd",
    gemSecondary: "#6d28d9",
  },
  LEGENDARY: {
    key: "LEGENDARY",
    label: "Lendaria",
    color: "#fbbf24",
    gemColor: "#fde68a",
    gemSecondary: "#b45309",
  }, 
    MYTHIC: {
    key: "MYTHIC",
    label: "Mitica",
    color: "#dc2626",
    gemColor: "#fecaca",
    gemSecondary: "#7f1d1d",
  },
};

export function getRarityVisual(rarity: string): RaritySymbol {
  return RARITY_SYMBOLS[rarity] ?? RARITY_SYMBOLS.COMMON;
}

// ─────────────────────────────────────────────
// Tipos de carta (icone no rodape do estandarte)
// ─────────────────────────────────────────────

export const TYPE_ICONS: Record<string, TypeIcon> = {
  UNIT:    { key: "UNIT",    label: "Unidade",  icon: "🗡", background: "#d97706" },
  SPECIAL: { key: "SPECIAL", label: "Especial", icon: "✨", background: "#7c3aed" },
  WEATHER: { key: "WEATHER", label: "Clima",    icon: "🌩", background: "#2563eb" },
  LEADER:  { key: "LEADER",  label: "Lider",    icon: "👑", background: "#b45309" },
};

export function getTypeIcon(cardType: string): TypeIcon {
  return TYPE_ICONS[cardType] ?? TYPE_ICONS.UNIT;
}
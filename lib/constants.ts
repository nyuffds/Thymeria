// lib/constants.ts
// Constantes compartilhadas entre o admin, o catálogo e o motor de partida.

export const ENGINE_KEYS = [
  { key: "BOOST",  label: "Reforço",          desc: "Soma poder a uma carta aliada" },
  { key: "DAMAGE", label: "Dano",             desc: "Reduz poder de uma carta inimiga" },
  { key: "SPAWN",  label: "Invocar",          desc: "Invoca uma cópia/token" },
  { key: "BOND",   label: "Vínculo",          desc: "Bonifica cópias na mesma fileira" },
  { key: "SPY",    label: "Espião",           desc: "Joga no lado inimigo + compra cartas" },
  { key: "DRAW",   label: "Comprar",          desc: "Compra cartas do baralho" },
  { key: "HEAL",   label: "Curar",            desc: "Restaura poder perdido" },
  { key: "SHIELD", label: "Escudo",           desc: "Imune ao próximo dano" },
] as const;

export type EngineKey = typeof ENGINE_KEYS[number]["key"];

export const ROWS = [
  { key: "MELEE",  label: "Corpo-a-corpo" },
  { key: "RANGED", label: "Distância" },
  { key: "SIEGE",  label: "Cerco" },
] as const;

export const RARITIES = [
  { key: "COMMON",    label: "Comum",    color: "#95a5a6" },
  { key: "RARE",      label: "Rara",     color: "#3498db" },
  { key: "EPIC",      label: "Épica",    color: "#9b59b6" },
  { key: "LEGENDARY", label: "Lendária", color: "#f39c12" },
] as const;

export const CARD_TYPES = [
  { key: "UNIT",    label: "Unidade" },
  { key: "SPECIAL", label: "Especial" },
  { key: "LEADER",  label: "Líder" },
] as const;
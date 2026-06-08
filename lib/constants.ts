// lib/constants.ts
// Constantes globais do projeto.

export const RARITIES = [
  { key: "COMMON",    label: "Comum",     color: "#95a5a6" },
  { key: "RARE",      label: "Rara",      color: "#3498db" },
  { key: "EPIC",      label: "Épica",     color: "#9b59b6" },
  { key: "LEGENDARY", label: "Lendária",  color: "#f39c12" },
  { key: "MYTHIC",    label: "Mítica",    color: "#dc2626" },
] as const;

export const ROWS = [
  { key: "MELEE",  label: "Corpo-a-corpo" },
  { key: "RANGED", label: "Distância" },
  { key: "SIEGE",  label: "Cerco" },
] as const;

export const CARD_TYPES = [
  { key: "UNIT",    label: "Unidade" },
  { key: "SPECIAL", label: "Especial" },
  { key: "WEATHER", label: "Clima" },
  { key: "LEADER",  label: "Líder" },
] as const;

export const LEADER_MODES = [
  { key: "PASSIVE", label: "Passivo" },
  { key: "ACTIVE",  label: "Ativo" },
] as const;

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


export const ENGINE_KEYS = [
  { key: "BOOST",   label: "Reforço",          desc: "Aumenta o poder de uma carta aliada." },
  { key: "DAMAGE",  label: "Investida",        desc: "Causa dano a uma carta inimiga." },
  { key: "SPAWN",   label: "Convocar aliado",  desc: "Invoca uma copia de menor poder ao ser jogada." },
  { key: "HEAL",    label: "Cura",             desc: "Restaura poder de uma carta aliada." },
  { key: "SHIELD",  label: "Escudo",           desc: "Protege uma carta de dano por uma rodada." },
  { key: "WEATHER", label: "Clima",            desc: "Afeta uma fileira inteira do tabuleiro." },
] as const;
export const LEADER_MODES = [
  { key: "PASSIVE", label: "Passivo", desc: "Habilidade do lider aplicada automaticamente ao longo da partida." },
  { key: "ACTIVE",  label: "Ativo",   desc: "Habilidade do lider ativada manualmente pelo jogador uma vez por partida." },
] as const;

export type EngineKey = typeof ENGINE_KEYS[number]["key"];

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
  { key: "BOOST",         label: "Reforço",            desc: "Aumenta o poder de uma carta aliada." },
  { key: "DAMAGE",        label: "Investida",          desc: "Causa dano a uma carta inimiga." },
  { key: "SPAWN",         label: "Convocar aliado",    desc: "Invoca uma copia de menor poder ao ser jogada." },
  { key: "HEAL",          label: "Cura",               desc: "Restaura poder de uma carta aliada." },
  { key: "SHIELD",        label: "Escudo",             desc: "Protege uma carta de dano por uma rodada." },
  { key: "BOND",          label: "Vinculo",            desc: "Cartas iguais na mesma fileira somam-se entre si." },
  { key: "DRAW",          label: "Saque",              desc: "Compra cartas adicionais do baralho." },
  { key: "SPY",           label: "Espião",             desc: "Joga no campo inimigo e permite saque adicional." },
  { key: "WEATHER_FROST", label: "Clima: Geada",       desc: "Reduz poder de unidades corpo-a-corpo." },
  { key: "WEATHER_FOG",   label: "Clima: Névoa",       desc: "Reduz poder de unidades a distância." },
  { key: "WEATHER_RAIN",  label: "Clima: Chuva",       desc: "Reduz poder de unidades de cerco." },
  { key: "WEATHER_STORM", label: "Clima: Tempestade",  desc: "Reduz poder de varias fileiras simultaneamente." },
  { key: "CLEAR_WEATHER", label: "Limpar clima",       desc: "Remove todos os efeitos climaticos do tabuleiro." },
  { key: "PULL_BY_NAME",  label: "Convocacao",         desc: "Puxa cartas especificas da mao para o campo ao ser jogada." },
] as const;
export const LEADER_MODES = [
  { key: "PASSIVE", label: "Passivo", desc: "Habilidade do lider aplicada automaticamente ao longo da partida." },
  { key: "ACTIVE",  label: "Ativo",   desc: "Habilidade do lider ativada manualmente pelo jogador uma vez por partida." },
] as const;

export type EngineKey = typeof ENGINE_KEYS[number]["key"];

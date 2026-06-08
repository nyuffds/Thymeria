// lib/constants.ts
// Constantes compartilhadas entre admin, catÃ¡logo, deck builder e motor de partida.

export const ENGINE_KEYS = [
  // Efeitos em cartas
  { key: "BOOST",  label: "ReforÃ§o",   desc: "Soma poder a uma carta aliada" },
  { key: "DAMAGE", label: "Dano",      desc: "Reduz poder de uma carta inimiga" },
  { key: "SPAWN",  label: "Invocar",   desc: "Invoca uma cÃ³pia/token" },
  { key: "BOND",   label: "VÃ­nculo",   desc: "Bonifica cÃ³pias na mesma fileira" },
  { key: "SPY",    label: "EspiÃ£o",    desc: "Joga no lado inimigo + compra cartas" },
  { key: "DRAW",   label: "Comprar",   desc: "Compra cartas do baralho" },
  { key: "HEAL",   label: "Curar",     desc: "Restaura poder perdido" },
  { key: "SHIELD", label: "Escudo",    desc: "Imune ao prÃ³ximo dano" },

  // Efeitos de clima (afetam fileira inteira)
  { key: "WEATHER_RAIN",   label: "Chuva",       desc: "Fileira-alvo: cartas com poder fixo = 1" },
  { key: "WEATHER_FROST",  label: "Geada",       desc: "Corpo-a-corpo: poder fixo = 1" },
  { key: "WEATHER_FOG",    label: "Neblina",     desc: "DistÃ¢ncia: poder fixo = 1" },
  { key: "WEATHER_STORM",  label: "Tempestade",  desc: "Cerco: poder fixo = 1" },
  { key: "CLEAR_WEATHER",  label: "Sol Claro",   desc: "Remove todos os climas ativos" },
] as const;

export type EngineKey = typeof ENGINE_KEYS[number]["key"];

export const ROWS = [
  { key: "MELEE",  label: "Corpo-a-corpo" },
  { key: "RANGED", label: "DistÃ¢ncia" },
  { key: "SIEGE",  label: "Cerco" },
] as const;

export const RARITIES = [
  { key: "COMMON",    label: "Comum",    color: "#95a5a6" },
  { key: "RARE",      label: "Rara",     color: "#3498db" },
  { key: "EPIC",      label: "Ã‰pica",    color: "#9b59b6" },
  { key: "LEGENDARY", label: "LendÃ¡ria", color: "#f39c12" },
  { key: "MYTHIC",    label: "Mitica",   color: "#dc2626" },
] as const;

export const CARD_TYPES = [
  { key: "UNIT",    label: "Unidade" },
  { key: "SPECIAL", label: "Especial" },
  { key: "LEADER",  label: "LÃ­der" },
  { key: "WEATHER", label: "Clima" },
] as const;

export const LEADER_MODES = [
  { key: "ACTIVE",     label: "Ativo",      desc: "Habilidade pode ser ativada 1 vez por partida" },
  { key: "PERSISTENT", label: "Permanente", desc: "Fica em campo do inÃ­cio ao fim da partida" },
  { key: "PASSIVE",    label: "Passivo",    desc: "Sem efeito mecÃ¢nico, apenas define a facÃ§Ã£o" },
] as const;
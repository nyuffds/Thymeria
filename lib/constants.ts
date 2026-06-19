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
  { key: "PULL_BY_NAME",     label: "Convocacao",            desc: "Puxa cartas especificas da mao para o campo ao ser jogada." },

  // Novas habilidades
  { key: "BOOST_ROW",        label: "Inspiracao",            desc: "Aumenta o poder de todas as cartas aliadas da fileira." },
  { key: "BOOST_MANY",       label: "Nutrir",                desc: "Aumenta o poder de varias cartas aliadas escolhidas." },
  { key: "DAMAGE_IF",        label: "Expurgo",               desc: "Destroi carta inimiga se o poder dela for menor ou igual a X." },
  { key: "MULTIPLY_ROW",     label: "Dadiva",                desc: "Dobra o poder de todas as unidades aliadas da fileira." },
  { key: "DESTROY_ROW",      label: "Peste",                 desc: "Destroi todas as cartas de uma fileira inimiga." },
  { key: "DESTROY_AND_DRAW", label: "Ciclo da Vida",         desc: "Destroi criatura inimiga e voce compra 1 carta." },
  { key: "TUTOR_BY_TYPE",    label: "Caos",                  desc: "Pega cartas do seu deck filtradas por tipo (ex: clima)." },
  { key: "REVIVE_RANDOM",    label: "Ritual Profano",        desc: "Puxa cartas aleatorias do cemiterio para o campo." },
  { key: "REVIVE_TO_HAND",   label: "Reforja",               desc: "Recupera uma carta nao-criatura do cemiterio para a mao." },
  { key: "SHUFFLE_AND_DRAW", label: "Ganancia",              desc: "Embaralha X cartas da mao no deck, compre X+1." },
  { key: "PROPHECY",         label: "Profecia",              desc: "Veja 5 cartas do topo do deck e reorganiza." },
  { key: "EVOLVE_FACTION",   label: "Evolucao",              desc: "Destroi um aliado e invoca outro da mesma faccao do deck." },
  { key: "IMMUNE_ROW",       label: "Bloqueio Temporal",     desc: "Cartas na fileira nao podem ser destruidas ou reduzidas." },
  { key: "ON_DEATH_SPAWN",   label: "Imperdoavel",           desc: "Ao morrer, gera uma carta especifica na sua mao." },
  { key: "PERMANENCE",       label: "Permanencia",           desc: "Uma carta aliada nao pode ser destruida e sobrevive a passagem de rondas." },
  { key: "PUNISHMENT",       label: "Punicao",               desc: "Destroi todas as cartas com o maior poder base do campo." },
  { key: "BLOOD_MOON",       label: "Lua de Sangue",         desc: "Suas cartas em todas as fileiras ganham +X de poder." },
  { key: "RETURN_TO_HAND",   label: "Efigie",                desc: "Escolha uma carta do campo; ela volta para a mao do dono." },
  { key: "RESURRECT_FROM_DISCARD", label: "Ressurreicao",   desc: "Volta X cartas do seu cemiterio para o campo (apenas UNIT)." },
  { key: "SUMMON_FROM_DECK", label: "Convocacao Ritual",     desc: "Puxa X cartas aleatorias do seu deck para o campo (apenas UNIT)." },
  { key: "REVENGE",          label: "Vinganca",              desc: "Ao ser destruida, causa X de dano a uma carta inimiga escolhida." },
  { key: "CONSUME_ALLY",     label: "Consumir",              desc: "Ao entrar em campo, destroi uma aliada escolhida e absorve seu poder." },
  { key: "SUMMON_TO_HAND_BY_NAME", label: "Recuperacao",     desc: "Ao entrar em campo, puxa uma carta especifica do universo para sua mao." },
  { key: "SUMMON_TO_BOARD_BY_NAME", label: "Invocacao Direta", desc: "Ao entrar em campo, invoca uma carta especifica do universo direto no seu campo." },
] as const;
export const LEADER_MODES = [
  { key: "PASSIVE", label: "Passivo", desc: "Habilidade do lider aplicada automaticamente ao longo da partida." },
  { key: "ACTIVE",  label: "Ativo",   desc: "Habilidade do lider ativada manualmente pelo jogador uma vez por partida." },
] as const;

export type EngineKey = typeof ENGINE_KEYS[number]["key"];

// lib/landing/landing-config.ts
// Configuração da landing page (home logada).
// Edite aqui pra customizar textos, cores, ordem dos links e divindades.

export type LinkRole = "ALL" | "ADMIN" | "PLAYER";

export interface LandingLink {
  href: string;
  label: string;
  icon: string;       // emoji ou símbolo
  description: string;
  lore: string;       // frase lírica que aparece no hover
  color: string;      // cor de destaque do card (border + glow)
  showFor: LinkRole;
}

export interface Deity {
  name: string;
  domain: string;     // domínio/aspecto da divindade
  symbol: string;     // emoji ou caractere representativo
  alignment: "ORDER" | "CHAOS" | "NEUTRAL";
}

// ─────────────────────────────────────────────
// Links principais (rotas do reino)
// ─────────────────────────────────────────────

export const LANDING_LINKS: LandingLink[] = [
  {
    href: "/lobby",
    label: "Salão de Duelos",
    icon: "⚔",
    description: "Desafie outros jogadores em tempo real",
    lore: "Onde lâminas encontram lâminas e a glória é forjada.",
    color: "#d4a04a",
    showFor: "ALL",
  },
  {
    href: "/partidas",
    label: "Partidas Locais",
    icon: "🎴",
    description: "Jogue hot-seat na mesma máquina",
    lore: "Dois oponentes, um único tabuleiro, infinitas possibilidades.",
    color: "#c79a4b",
    showFor: "ALL",
  },
  {
    href: "/decks",
    label: "Forja de Estratégias",
    icon: "📜",
    description: "Construa e edite seus baralhos",
    lore: "Cada carta escolhida é uma promessa de vitória.",
    color: "#8e44ad",
    showFor: "ALL",
  },
  {
    href: "/colecao",
    label: "Tesouraria",
    icon: "💎",
    description: "Veja todas as cartas que possui",
    lore: "Relíquias colecionadas em campanhas de glória.",
    color: "#5dade2",
    showFor: "ALL",
  },
  {
    href: "/cartas",
    label: "Bestiário de Thymeria",
    icon: "📖",
    description: "Catálogo público de cartas",
    lore: "Conheça os heróis, vilões e maravilhas deste mundo.",
    color: "#27ae60",
    showFor: "ALL",
  },
  {
    href: "/loja",
    label: "Mercado do Eitri",
    icon: "🏪",
    description: "Compre boosters com moedas de campanha",
    lore: "Anões do norte forjam pacotes raros pra aventureiros corajosos.",
    color: "#e67e22",
    showFor: "ALL",
  },
  {
    href: "/estante",
    label: "Estante de Boosters",
    icon: "📦",
    description: "Abra seus boosters não-revelados",
    lore: "Cada pacote selado guarda destinos não escritos.",
    color: "#b76e5f",
    showFor: "ALL",
  },
  {
    href: "/conta",
    label: "Minha Crônica",
    icon: "🪬",
    description: "Configurações e perfil",
    lore: "Sua jornada começa onde você decide.",
    color: "#95a5a6",
    showFor: "ALL",
  },
  {
    href: "/admin",
    label: "Sala do Conselho",
    icon: "👑",
    description: "Painel administrativo (somente admin)",
    lore: "Onde as leis do reino são escritas e reescritas.",
    color: "#c0392b",
    showFor: "ADMIN",
  },
];

// ─────────────────────────────────────────────
// Divindades de Thymeria (pantheon completo)
// ─────────────────────────────────────────────

export const DEITIES: Deity[] = [
  { name: "Morrígan", domain: "Guerra e Profecia",        symbol: "🜃", alignment: "NEUTRAL" },
  { name: "Skanda",   domain: "Ordem e Lança Divina",     symbol: "🜂", alignment: "ORDER"   },
  { name: "Lugh",     domain: "Sol, Artesanato e Luz",    symbol: "☀",  alignment: "ORDER"   },
  { name: "Eitri",    domain: "Forja e Tesouros",         symbol: "⚒",  alignment: "ORDER"   },
  { name: "Aine",     domain: "Verão e Amor",             symbol: "🌸", alignment: "ORDER"   },
  { name: "Diana",    domain: "Caça e Lua",               symbol: "🌙", alignment: "NEUTRAL" },
  { name: "Kali",     domain: "Tempo e Destruição",       symbol: "🗡",  alignment: "NEUTRAL" },
  { name: "Éris",     domain: "Discórdia e Caos",         symbol: "🜄", alignment: "CHAOS"   },
  { name: "Typhon",   domain: "Tempestades e Abismos",    symbol: "🜁", alignment: "CHAOS"   },
  { name: "Nergal",   domain: "Pragas e Sombras",         symbol: "☠",  alignment: "CHAOS"   },
  { name: "Azmedan",  domain: "Pactos e Dívidas",         symbol: "❦",  alignment: "CHAOS"   },
];

// ─────────────────────────────────────────────
// Lore de boas-vindas (frases aleatórias no hero)
// ─────────────────────────────────────────────

export const WELCOME_PHRASES: string[] = [
  "Um século passou desde a Guerra do Fim. As lâminas voltam a sussurrar.",
  "Os deuses observam. Cada carta jogada ecoa nos salões do destino.",
  "Em Thymeria, vitórias não se compram — se forjam carta a carta.",
  "Que Lugh ilumine sua estratégia e Kali silencie seus inimigos.",
  "Os pactos antigos ainda repousam sob as Três Irmãs. Tome cuidado.",
  "Valtres prepara seus cavaleiros. Lómerel afia seus feitiços. E você?",
];

export function randomWelcomePhrase(): string {
  return WELCOME_PHRASES[Math.floor(Math.random() * WELCOME_PHRASES.length)];
}
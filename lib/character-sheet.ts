// Parser de fichas dnd5e exportadas do Foundry.
// Extrai apenas os campos necessarios pra exibir na ficha do jogador.

export interface ParsedCharacterSheet {
  name: string;
  img: string | null;
  level: number;
  race: string | null;
  background: string | null;
  classes: Array<{ name: string; level: number; subclass?: string }>;
  alignment: string | null;
  details: {
    biography: string;
    ideal: string;
    bond: string;
    flaw: string;
    appearance: string;
    age: string;
    height: string;
    weight: string;
    eyes: string;
    hair: string;
    skin: string;
    gender: string;
    faith: string;
    trait: string;
  };
  abilities: Record<string, { value: number; mod: number; saveProf: boolean }>;
  hp: { value: number; max: number | null; temp: number };
  ac: number | null;
  initiative: number;
  speed: string;
  proficiencyBonus: number;
  skills: Array<{ key: string; label: string; ability: string; value: number; proficient: boolean }>;
  senses: { darkvision: number | null; blindsight: number | null; tremorsense: number | null; truesight: number | null };
  languages: string[];
  resistances: string[];
  immunities: string[];
  vulnerabilities: string[];
  conditionImmunities: string[];
  feats: Array<{ name: string; description: string }>;
  weapons: Array<{ name: string; equipped: boolean; damage: string; description: string }>;
  armor: Array<{ name: string; equipped: boolean; ac: number | null }>;
  spells: Array<{ name: string; level: number; description: string; school: string }>;
  items: Array<{ name: string; type: string; description: string; quantity: number }>;
  currency: { pp: number; gp: number; ep: number; sp: number; cp: number };
}

const ABILITY_LABELS: Record<string, string> = {
  str: "Forca", dex: "Destreza", con: "Constituicao",
  int: "Inteligencia", wis: "Sabedoria", cha: "Carisma",
};

const SKILL_LABELS: Record<string, { label: string; ability: string }> = {
  acr: { label: "Acrobacia", ability: "dex" },
  ani: { label: "Lidar com Animais", ability: "wis" },
  arc: { label: "Arcanismo", ability: "int" },
  ath: { label: "Atletismo", ability: "str" },
  dec: { label: "Enganacao", ability: "cha" },
  his: { label: "Historia", ability: "int" },
  ins: { label: "Intuicao", ability: "wis" },
  itm: { label: "Intimidacao", ability: "cha" },
  inv: { label: "Investigacao", ability: "int" },
  med: { label: "Medicina", ability: "wis" },
  nat: { label: "Natureza", ability: "int" },
  prc: { label: "Percepcao", ability: "wis" },
  prf: { label: "Atuacao", ability: "cha" },
  per: { label: "Persuasao", ability: "cha" },
  rel: { label: "Religiao", ability: "wis" },
  slt: { label: "Prestidigitacao", ability: "dex" },
  ste: { label: "Furtividade", ability: "dex" },
  sur: { label: "Sobrevivencia", ability: "wis" },
};

function modOf(score: number): number {
  return Math.floor((score - 10) / 2);
}

function profBonusFromLevel(level: number): number {
  return 2 + Math.floor((level - 1) / 4);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim();
}

export function parseFoundryCharacter(jsonStr: string): ParsedCharacterSheet | null {
  let raw: any;
  try {
    raw = typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr;
  } catch {
    return null;
  }
  if (!raw || raw.type !== "character") return null;

  const sys = raw.system ?? {};
  const items: any[] = raw.items ?? [];

  // Classes e level total
  const classes: Array<{ name: string; level: number; subclass?: string }> = [];
  for (const it of items) {
    if (it.type === "class") {
      const lvl = it.system?.levels ?? 1;
      classes.push({ name: it.name, level: lvl });
    }
  }
  // Subclasses
  for (const it of items) {
    if (it.type === "subclass") {
      const parent = classes.find((c) => c.name.toLowerCase().includes((it.system?.classIdentifier ?? "").toLowerCase()));
      if (parent) parent.subclass = it.name;
    }
  }
  const totalLevel = classes.reduce((s, c) => s + c.level, 0) || 1;
  const profBonus = profBonusFromLevel(totalLevel);

  // Race / background
  const race = items.find((i) => i.type === "race")?.name ?? null;
  const background = items.find((i) => i.type === "background")?.name ?? null;

  // Abilities
  const abilities: Record<string, { value: number; mod: number; saveProf: boolean }> = {};
  for (const k of ["str", "dex", "con", "int", "wis", "cha"]) {
    const a = sys.abilities?.[k] ?? { value: 10, proficient: 0 };
    abilities[k] = {
      value: a.value ?? 10,
      mod: modOf(a.value ?? 10),
      saveProf: !!a.proficient,
    };
  }

  // Skills
  const skills = Object.entries(SKILL_LABELS).map(([key, def]) => {
    const sk = sys.skills?.[key];
    const proficient = !!(sk && sk.value > 0);
    const abilityMod = abilities[def.ability]?.mod ?? 0;
    let bonus = abilityMod;
    if (proficient) bonus += profBonus;
    if (sk && sk.value === 2) bonus += profBonus; // expertise
    return { key, label: def.label, ability: def.ability, value: bonus, proficient };
  });

  // HP
  const hpRaw = sys.attributes?.hp ?? {};
  const hp = {
    value: hpRaw.value ?? 0,
    max: hpRaw.max ?? null,
    temp: hpRaw.temp ?? 0,
  };

  // AC
  const acRaw = sys.attributes?.ac;
  const ac = acRaw?.value ?? acRaw?.flat ?? null;

  // Iniciativa
  const initBonus = abilities.dex.mod + (parseInt(sys.attributes?.init?.bonus ?? "0", 10) || 0);

  // Velocidade (vem nas raw movement ou no race item)
  const movementUnit = sys.attributes?.movement?.units ?? "ft";
  let walkSpeed = 30;
  for (const it of items) {
    if (it.type === "race") {
      const w = it.system?.movement?.walk;
      if (typeof w === "number") walkSpeed = w;
    }
  }

  // Senses
  const sensesRaw = sys.attributes?.senses?.ranges ?? {};
  const senses = {
    darkvision: sensesRaw.darkvision ?? null,
    blindsight: sensesRaw.blindsight ?? null,
    tremorsense: sensesRaw.tremorsense ?? null,
    truesight: sensesRaw.truesight ?? null,
  };

  // Idiomas/resistencias
  const languages: string[] = sys.traits?.languages?.value ?? [];
  const resistances: string[] = sys.traits?.dr?.value ?? [];
  const immunities: string[] = sys.traits?.di?.value ?? [];
  const vulnerabilities: string[] = sys.traits?.dv?.value ?? [];
  const conditionImmunities: string[] = sys.traits?.ci?.value ?? [];

  // Feats
  const feats = items
    .filter((i) => i.type === "feat")
    .map((i) => ({
      name: i.name,
      description: stripHtml(i.system?.description?.value ?? ""),
    }));

  // Weapons
  const weapons = items
    .filter((i) => i.type === "weapon")
    .map((i) => {
      const dmg = i.system?.damage?.base ?? {};
      const damageStr = dmg.number && dmg.denomination
        ? `${dmg.number}d${dmg.denomination}${dmg.bonus ? "+" + dmg.bonus : ""} ${(dmg.types ?? []).join(",")}`
        : "";
      return {
        name: i.name,
        equipped: !!i.system?.equipped,
        damage: damageStr,
        description: stripHtml(i.system?.description?.value ?? ""),
      };
    });

  // Armor (equipment com armor)
  const armor = items
    .filter((i) => i.type === "equipment" && i.system?.armor)
    .map((i) => ({
      name: i.name,
      equipped: !!i.system?.equipped,
      ac: i.system?.armor?.value ?? null,
    }));

  // Spells
  const spells = items
    .filter((i) => i.type === "spell")
    .map((i) => ({
      name: i.name,
      level: i.system?.level ?? 0,
      description: stripHtml(i.system?.description?.value ?? ""),
      school: i.system?.school ?? "",
    }));

  // Outros itens (loot, consumable, container, tool)
  const otherItems = items
    .filter((i) => ["loot", "consumable", "container", "tool"].includes(i.type))
    .map((i) => ({
      name: i.name,
      type: i.type,
      description: stripHtml(i.system?.description?.value ?? ""),
      quantity: i.system?.quantity ?? 1,
    }));

  return {
    name: raw.name ?? "Personagem",
    img: raw.img ?? null,
    level: totalLevel,
    race,
    background,
    classes,
    alignment: sys.details?.alignment ?? null,
    details: {
      biography: stripHtml(sys.details?.biography?.value ?? ""),
      ideal: sys.details?.ideal ?? "",
      bond: sys.details?.bond ?? "",
      flaw: sys.details?.flaw ?? "",
      appearance: sys.details?.appearance ?? "",
      age: String(sys.details?.age ?? ""),
      height: String(sys.details?.height ?? ""),
      weight: String(sys.details?.weight ?? ""),
      eyes: sys.details?.eyes ?? "",
      hair: sys.details?.hair ?? "",
      skin: sys.details?.skin ?? "",
      gender: sys.details?.gender ?? "",
      faith: sys.details?.faith ?? "",
      trait: sys.details?.trait ?? "",
    },
    abilities,
    hp,
    ac,
    initiative: initBonus,
    speed: `${walkSpeed} ${movementUnit}`,
    proficiencyBonus: profBonus,
    skills,
    senses,
    languages,
    resistances,
    immunities,
    vulnerabilities,
    conditionImmunities,
    feats,
    weapons,
    armor,
    spells,
    items: otherItems,
    currency: sys.currency ?? { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
  };
}

export { ABILITY_LABELS };
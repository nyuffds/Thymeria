// app/regras/efeitos/page.tsx
// Catalogo completo dos efeitos (engine keys) disponiveis no jogo.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ENGINE_KEYS } from "@/lib/constants";
import { RegrasLayout } from "../_components/RegrasLayout";

export const dynamic = "force-dynamic";

// Agrupamento por categoria conceitual
const CATEGORIES: Array<{ label: string; motto: string; color: string; keys: string[] }> = [
  {
    label: "Poder & Cura",
    motto: "Reforcar aliados, restaurar vidas, multiplicar forcas.",
    color: "#34d399",
    keys: ["BOOST", "BOOST_MANY", "BOOST_ROW", "MULTIPLY_ROW", "HEAL", "HEAL_ROW", "BLOOD_MOON", "BOND"],
  },
  {
    label: "Ataque & Destruicao",
    motto: "Dano direto, expurgo, vinganca.",
    color: "#c0392b",
    keys: ["DAMAGE", "DAMAGE_IF", "DAMAGE_BY_ENEMY_ROW", "DESTROY_ROW", "DESTROY_AND_DRAW", "PUNISHMENT", "REVENGE", "STEAL_BUFF", "DELAYED_DAMAGE"],
  },
  {
    label: "Convocacao & Tokens",
    motto: "Invocar aliados, tokens e copias.",
    color: "#8e44ad",
    keys: ["SPAWN", "PULL_BY_NAME", "EVOLVE_FACTION", "SUMMON_FROM_DECK", "REVIVE_RANDOM", "RESURRECT_FROM_DISCARD", "SUMMON_TO_HAND_BY_NAME", "SUMMON_TO_BOARD_BY_NAME", "SUMMON_COPY", "ON_DEATH_SPAWN"],
  },
  {
    label: "Compra & Cemiterio",
    motto: "Manipulacao de baralho e mao.",
    color: "#5dade2",
    keys: ["DRAW", "SPY", "TUTOR_BY_TYPE", "REVIVE_TO_HAND", "SHUFFLE_AND_DRAW", "PROPHECY", "DRAW_DISCARD_OPP", "SACRIFICE_DRAW"],
  },
  {
    label: "Defesa & Permanencia",
    motto: "Escudos, imunidades, intercepcao.",
    color: "#fcd34d",
    keys: ["SHIELD", "IMMUNE_ROW", "PERMANENCE", "PASS_WITHOUT_TRACE", "HEROISM", "RETURN_TO_HAND", "CONSUME_ALLY"],
  },
  {
    label: "Reativos & Pactos",
    motto: "Habilidades que se ativam por gatilhos.",
    color: "#b76e5f",
    keys: ["MARK", "CHAIN_REACTION", "OATHBOUND", "REFLECT", "TIME_LOOP"],
  },
  {
    label: "Climas",
    motto: "Forcas da natureza assolando o campo.",
    color: "#6ab1ff",
    keys: ["WEATHER_FROST", "WEATHER_FOG", "WEATHER_RAIN", "WEATHER_STORM", "CLEAR_WEATHER"],
  },
  {
    label: "Controle & Manipulacao",
    motto: "Mecanicas avancadas que mudam o jogo.",
    color: "#e67e22",
    keys: ["ROW_SWAP", "TRANSFORM", "POLYMORPH", "CHARGE", "VOID_ZONE", "COUNTERSPELL", "MIRROR_PLAY", "SEAL_ARCANE"],
  },
];

export default async function RegrasEfeitosPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  // Mapa rapido: key -> label/desc
  const byKey = new Map<string, { label: string; desc: string }>();
  for (const k of ENGINE_KEYS) {
    byKey.set(k.key, { label: k.label, desc: k.desc });
  }

  return (
    <RegrasLayout
      title="Catalogo de Efeitos"
      subtitle="Todas as habilidades que cartas e lideres podem ter. Refencia tecnica para construtores de deck."
      maxWidth={1000}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {CATEGORIES.map((cat) => (
          <section key={cat.label}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
              <span style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${cat.color}88)` }} />
              <span style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 12, color: cat.color, textTransform: "uppercase", letterSpacing: "0.4em", whiteSpace: "nowrap" }}>
                {cat.label}
              </span>
              <span style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${cat.color}88)` }} />
            </div>
            <p style={{ textAlign: "center", margin: "0 0 16px", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#5f5340" }}>
              {cat.motto}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
              {cat.keys.map((key) => {
                const entry = byKey.get(key);
                if (!entry) return null;
                return (
                  <article
                    key={key}
                    style={{
                      padding: 14,
                      background: "rgba(20,12,4,0.6)",
                      border: "1px solid #3d3022",
                      borderLeft: `3px solid ${cat.color}`,
                      borderRadius: 4,
                    }}
                  >
                    <p style={{ margin: 0, fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 13, color: "#fef3c7", letterSpacing: "0.08em" }}>
                      {entry.label}
                    </p>
                    <p style={{ margin: "3px 0 0", fontFamily: "monospace", fontSize: 9, color: "#5f5340", letterSpacing: "0.05em" }}>
                      {key}
                    </p>
                    <p style={{ margin: "8px 0 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 13, color: "#d3c89a", lineHeight: 1.5 }}>
                      {entry.desc}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div style={{ marginTop: 36, padding: 18, background: "rgba(20,12,4,0.5)", border: "1px dashed #5a3f1a", borderRadius: 4 }}>
        <p style={{ margin: 0, fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 10, color: "#c9a961", letterSpacing: "0.3em", textTransform: "uppercase" }}>
          Nota do Conselho
        </p>
        <p style={{ margin: "8px 0 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#8b6f3a", lineHeight: 1.6 }}>
          Esta lista mostra <strong style={{ color: "#fef3c7", fontStyle: "normal" }}>todos os efeitos que o motor de jogo entende</strong>.
          Cada efeito pode estar atrelado a uma ou mais cartas. Para ver quais cartas da sua colecao usam um determinado efeito, consulte <strong style={{ color: "#fef3c7", fontStyle: "normal" }}>Habilidades</strong> no Manual.
        </p>
      </div>
    </RegrasLayout>
  );
}

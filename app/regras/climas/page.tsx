export const dynamic = "force-dynamic";

// app/regras/climas/page.tsx

import { RegrasLayout } from "../_components/RegrasLayout";

const CLIMAS = [
  { key: "FROST", nome: "Geada (Frost)",       icon: "❄", color: "#93c5fd", afeta: "Vanguarda (corpo-a-corpo)",      desc: "Reduz o poder de todas as cartas nao-Elite na fileira de Vanguarda para 1." },
  { key: "FOG",   nome: "Neblina (Fog)",       icon: "🌫", color: "#cbd5e1", afeta: "Distancia",                      desc: "Reduz o poder de todas as cartas nao-Elite na fileira de Distancia para 1." },
  { key: "RAIN",  nome: "Chuva (Rain)",        icon: "🌧", color: "#7dd3fc", afeta: "Cerco",                          desc: "Reduz o poder de todas as cartas nao-Elite na fileira de Cerco para 1." },
  { key: "STORM", nome: "Tempestade (Storm)",  icon: "⛈", color: "#a78bfa", afeta: "Cerco + Distancia",              desc: "Reduz o poder das cartas nao-Elite nas fileiras de Cerco E Distancia para 1." },
  { key: "CLEAR", nome: "Tempo Limpo (Clear)", icon: "☀", color: "#fcd34d", afeta: "Todas as fileiras",              desc: "Remove todos os climas ativos no tabuleiro, restaurando o poder das cartas afetadas." },
];

export default async function RegrasClimasPage() {
  return (
    <RegrasLayout title="Climas" subtitle="Quando o ceu se volta contra o aventureiro, so os mais resilientes resistem." maxWidth={900}>
      <p style={{ margin: "0 0 24px", textAlign: "center", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 14, color: "#8b6f3a" }}>
        Climas afetam fileiras inteiras do tabuleiro, reduzindo o poder das cartas a 1. Cartas <strong style={{ color: "#fbbf24" }}>Elite</strong> sao imunes.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {CLIMAS.map((c) => (
          <article
            key={c.key}
            style={{
              padding: 20,
              background: "rgba(20,12,4,0.6)",
              border: `1px solid ${c.color}55`,
              borderLeft: `3px solid ${c.color}`,
              borderRadius: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 28, color: c.color, filter: `drop-shadow(0 0 8px ${c.color}66)` }}>{c.icon}</span>
              <h2 style={{ margin: 0, fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 15, color: c.color, letterSpacing: "0.08em" }}>{c.nome}</h2>
            </div>
            <p style={{ margin: "0 0 8px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 10, color: "#8b6f3a", letterSpacing: "0.25em", textTransform: "uppercase" }}>
              Afeta: <span style={{ color: "#d3c89a", letterSpacing: 0, textTransform: "none", fontStyle: "italic", fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 13 }}>{c.afeta}</span>
            </p>
            <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 14, color: "#d3c89a", lineHeight: 1.6 }}>
              {c.desc}
            </p>
          </article>
        ))}
      </div>

      <p style={{ margin: "32px 0 0", textAlign: "center", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#5f5340", lineHeight: 1.6 }}>
        Climas se sobrepoem (um por fileira) e duram ate Tempo Limpo ser jogado ou ate o fim da ronda.
      </p>
    </RegrasLayout>
  );
}

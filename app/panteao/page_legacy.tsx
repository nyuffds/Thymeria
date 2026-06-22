export const dynamic = "force-dynamic";

// app/panteao/page.tsx
// Pagina dedicada ao panteao de Thymeria.

import { DEITIES } from "@/lib/landing/landing-config";

const ALIGNMENT_META = {
  ORDER: {
    label: "Ordem",
    motto: "que a luz nao se quebre",
    color: "#5dade2",
    bgGrad: "linear-gradient(180deg, rgba(93,173,226,0.12) 0%, rgba(93,173,226,0.03) 50%, rgba(10,8,5,0.8) 100%)",
    border: "#2a5070",
  },
  NEUTRAL: {
    label: "Neutro",
    motto: "a balanca observa",
    color: "#a89070",
    bgGrad: "linear-gradient(180deg, rgba(168,144,112,0.12) 0%, rgba(168,144,112,0.03) 50%, rgba(10,8,5,0.8) 100%)",
    border: "#5a4838",
  },
  CHAOS: {
    label: "Caos",
    motto: "que tudo se rompa",
    color: "#c0392b",
    bgGrad: "linear-gradient(180deg, rgba(192,57,43,0.14) 0%, rgba(192,57,43,0.03) 50%, rgba(10,8,5,0.8) 100%)",
    border: "#6b1818",
  },
} as const;

export default async function PanteaoPage() {
  const ordem = DEITIES.filter((d) => d.alignment === "ORDER");
  const neutro = DEITIES.filter((d) => d.alignment === "NEUTRAL");
  const caos = DEITIES.filter((d) => d.alignment === "CHAOS");

  return (
    <main
      style={{
        flex: 1,
        padding: "40px 32px 60px",
        color: "#e9d9b6",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
        minHeight: "100vh",
      }}
    >
      {/* Glow superior */}
      <div
        style={{
          position: "absolute",
          top: -200,
          left: "50%",
          transform: "translateX(-50%)",
          width: 900,
          height: 500,
          background: "radial-gradient(ellipse at top, rgba(201,169,97,0.15), transparent 60%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p
            style={{
              margin: "0 0 14px",
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontSize: 10,
              color: "#8b6f3a",
              textTransform: "uppercase",
              letterSpacing: "0.5em",
            }}
          >
            &mdash; Cronica I &middot; Idade do Pacto &mdash;
          </p>
          <h1
            style={{
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontSize: 64,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "0.2em",
              textIndent: "0.2em",
              lineHeight: 1,
              background: "linear-gradient(180deg, #fef3c7 0%, #c9a961 50%, #6a4a20 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 4px 20px rgba(201,169,97,0.4))",
            }}
          >
            O PANTEAO
          </h1>
          <p
            style={{
              margin: "18px auto 0",
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontStyle: "italic",
              color: "#d3c89a",
              fontSize: 17,
              maxWidth: 620,
              lineHeight: 1.6,
            }}
          >
            Onze divindades velam Thymeria. Tres faces, tres dominios: a Ordem que sustenta, o Caos que dissolve, e o Neutro que pesa.
          </p>
        </div>

        {/* 3 colunas */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
            marginBottom: 40,
          }}
        >
          <Coluna deities={ordem} meta={ALIGNMENT_META.ORDER} />
          <Coluna deities={neutro} meta={ALIGNMENT_META.NEUTRAL} />
          <Coluna deities={caos} meta={ALIGNMENT_META.CHAOS} />
        </div>

        {/* Rodape */}
        <div style={{ textAlign: "center", marginTop: 60 }}>
          <span style={{ color: "#5a4838", fontSize: 18 }}>✦</span>
          <p
            style={{
              margin: "12px auto 0",
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontStyle: "italic",
              fontSize: 13,
              color: "#5f5340",
              maxWidth: 540,
              lineHeight: 1.6,
            }}
          >
            Os deuses observam. Cada carta jogada ecoa nos saloes do destino.
          </p>
        </div>
      </div>
    </main>
  );
}

function Coluna({
  deities,
  meta,
}: {
  deities: { name: string; domain: string; symbol: string }[];
  meta: typeof ALIGNMENT_META[keyof typeof ALIGNMENT_META];
}) {
  return (
    <div
      style={{
        background: meta.bgGrad,
        border: `1px solid ${meta.border}`,
        borderRadius: 6,
        padding: 24,
      }}
    >
      <p
        style={{
          textAlign: "center",
          fontFamily: "var(--font-cinzel), Georgia, serif",
          fontSize: 13,
          color: meta.color,
          letterSpacing: "0.4em",
          textTransform: "uppercase",
          margin: "0 0 4px",
        }}
      >
        {meta.label}
      </p>
      <p
        style={{
          textAlign: "center",
          fontFamily: "var(--font-cormorant), Georgia, serif",
          fontStyle: "italic",
          fontSize: 13,
          color: meta.color,
          opacity: 0.6,
          margin: "0 0 24px",
        }}
      >
        &ldquo;{meta.motto}&rdquo;
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {deities.map((d, idx) => (
          <div
            key={d.name}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              paddingBottom: idx < deities.length - 1 ? 16 : 0,
              borderBottom: idx < deities.length - 1 ? `1px dashed ${meta.border}` : "none",
            }}
          >
            <span
              style={{
                fontSize: 30,
                color: meta.color,
                minWidth: 30,
                textAlign: "center",
                filter: `drop-shadow(0 0 8px ${meta.color}66)`,
                lineHeight: 1,
              }}
            >
              {d.symbol}
            </span>
            <div>
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-cinzel), Georgia, serif",
                  fontSize: 16,
                  color: "#fef3c7",
                  letterSpacing: "0.08em",
                }}
              >
                {d.name}
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontFamily: "var(--font-cormorant), Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 13,
                  color: "#8b6f3a",
                }}
              >
                {d.domain}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

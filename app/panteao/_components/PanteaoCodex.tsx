"use client";

// app/panteao/_components/PanteaoCodex.tsx
// Layout codex: A-Z lateral + lista deuses + painel detalhe.

import { useMemo, useState } from "react";

interface Deity {
  id: string;
  slug: string;
  name: string;
  alignment: string;
  domain: string;
  symbol: string;
  color: string;
  quote: string | null;
  quoteSource: string | null;
  loreText: string | null;
  imageUrl: string | null;
  famousDevotees: string | null;
}

const ALIGNMENT_LABEL: Record<string, string> = {
  ORDER: "Ordem",
  NEUTRAL: "Neutro",
  CHAOS: "Caos",
};
const ALIGNMENT_COLOR: Record<string, string> = {
  ORDER: "#5dade2",
  NEUTRAL: "#a89070",
  CHAOS: "#c0392b",
};

export function PanteaoCodex({ deities }: { deities: Deity[] }) {
  const sorted = useMemo(() => [...deities].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [deities]);
  const [selectedId, setSelectedId] = useState<string>(sorted[0]?.id ?? "");

  const selected = sorted.find((d) => d.id === selectedId) ?? sorted[0];

  const lettersWithDeity = useMemo(() => {
    const set = new Set<string>();
    for (const d of sorted) set.add(d.name.charAt(0).toUpperCase());
    return set;
  }, [sorted]);
  const allLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  function jumpToLetter(letter: string) {
    const first = sorted.find((d) => d.name.toUpperCase().startsWith(letter));
    if (first) setSelectedId(first.id);
  }

  if (!selected) return null;

  const devoteesList = (selected.famousDevotees ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const alignColor = ALIGNMENT_COLOR[selected.alignment] ?? "#c9a961";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "40px 220px 1fr", gap: 18, alignItems: "start" }}>

      {/* A-Z lateral */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 1, paddingTop: 8 }}>
        {allLetters.map((l) => {
          const has = lettersWithDeity.has(l);
          const isActive = selected.name.toUpperCase().startsWith(l);
          return (
            <button
              key={l}
              onClick={() => has && jumpToLetter(l)}
              disabled={!has}
              style={{
                appearance: "none",
                background: isActive ? "rgba(252,211,77,0.12)" : "transparent",
                border: 0,
                color: isActive ? "#fcd34d" : has ? "#5f5340" : "#2c241a",
                padding: "4px 0",
                fontSize: 11,
                letterSpacing: "0.1em",
                cursor: has ? "pointer" : "default",
                borderRadius: 2,
                fontFamily: "var(--font-cinzel), Georgia, serif",
              }}
            >
              {l}
            </button>
          );
        })}
      </nav>

      {/* Lista de deuses */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sorted.map((d) => {
          const on = d.id === selectedId;
          return (
            <button
              key={d.id}
              onClick={() => setSelectedId(d.id)}
              style={{
                appearance: "none",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: on ? "11px 13px 11px 11px" : "11px 13px",
                background: on ? "rgba(201,169,97,0.12)" : "rgba(20,12,4,0.6)",
                border: on ? "1px solid #c9a961" : "1px solid #3d3022",
                borderLeft: on ? "3px solid #c9a961" : "1px solid #3d3022",
                borderRadius: 3,
                color: "inherit",
              }}
            >
              <span style={{
                fontSize: 18,
                width: 30,
                height: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `${d.color}11`,
                border: `1px solid ${d.color}55`,
                borderRadius: 3,
                flexShrink: 0,
              }}>
                {d.symbol}
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{
                  display: "block",
                  fontSize: 12,
                  letterSpacing: "0.12em",
                  color: on ? "#fcd34d" : "#fef3c7",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  fontFamily: "var(--font-cinzel), Georgia, serif",
                }}>{d.name}</span>
                <span style={{
                  display: "block",
                  fontSize: 10,
                  color: "#8b6f3a",
                  marginTop: 3,
                  fontStyle: "italic",
                  fontFamily: "var(--font-cormorant), Georgia, serif",
                  letterSpacing: "0.05em",
                }}>{d.domain}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Painel de detalhe */}
      <article style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        gap: 22,
        background: "rgba(20,12,4,0.5)",
        border: "1px solid #3d3022",
        borderRadius: 4,
        padding: 22,
      }}>
        {/* Coluna esquerda - portrait */}
        <div>
          <div style={{
            width: "100%",
            aspectRatio: "1023/1537",
            background: selected.imageUrl
              ? `url(${selected.imageUrl}) center/cover no-repeat, radial-gradient(ellipse at center, #382820, #0a0805)`
              : "radial-gradient(ellipse at center, #382820, #0a0805)",
            border: `1px solid ${selected.color}55`,
            borderRadius: 3,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            {!selected.imageUrl && (
              <span style={{
                fontSize: 88,
                color: `${selected.color}44`,
                filter: `drop-shadow(0 0 24px ${selected.color}55)`,
              }}>{selected.symbol}</span>
            )}
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, transparent 60%, rgba(10,8,5,0.85) 100%)",
              borderRadius: 3,
              pointerEvents: "none",
            }} />
          </div>
          <div style={{ marginTop: 12, textAlign: "center" }}>
            <p style={{
              margin: 0,
              fontSize: 20,
              letterSpacing: "0.18em",
              color: "#fcd34d",
              textTransform: "uppercase",
              fontWeight: 700,
              fontFamily: "var(--font-cinzel), Georgia, serif",
            }}>{selected.name}</p>
            <p style={{
              margin: "5px 0 0",
              fontSize: 11,
              color: selected.color,
              fontStyle: "italic",
              letterSpacing: "0.08em",
              fontFamily: "var(--font-cormorant), Georgia, serif",
            }}>{selected.domain}</p>
            <span style={{
              display: "inline-block",
              marginTop: 14,
              padding: "3px 14px",
              fontSize: 9,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: alignColor,
              border: `1px solid ${alignColor}55`,
              background: `${alignColor}11`,
              borderRadius: 2,
              fontFamily: "var(--font-cinzel), Georgia, serif",
            }}>
              · {ALIGNMENT_LABEL[selected.alignment] ?? selected.alignment} ·
            </span>
          </div>
        </div>

        {/* Coluna direita - quote + lore + devotos */}
        <div>
          {selected.quote && (
            <div style={{
              padding: "16px 18px",
              background: "linear-gradient(180deg, rgba(40,25,10,0.7), rgba(20,12,4,0.7))",
              border: "1px solid #5a3f1a",
              borderLeft: `3px solid ${selected.color}`,
              borderRadius: 2,
              marginBottom: 18,
            }}>
              <p style={{
                margin: 0,
                fontStyle: "italic",
                fontSize: 14,
                color: "#d3c89a",
                lineHeight: 1.7,
                fontFamily: "var(--font-cormorant), Georgia, serif",
              }}>
                &ldquo;{selected.quote}&rdquo;
              </p>
              {selected.quoteSource && (
                <p style={{
                  margin: "10px 0 0",
                  fontSize: 10,
                  color: "#8b6f3a",
                  textAlign: "right",
                  letterSpacing: "0.05em",
                  fontFamily: "var(--font-cinzel), Georgia, serif",
                }}>— {selected.quoteSource}</p>
              )}
            </div>
          )}

          {selected.loreText ? (
            <div style={{
              fontSize: 13,
              color: "#e9d9b6",
              lineHeight: 1.8,
              fontFamily: "var(--font-cormorant), Georgia, serif",
              whiteSpace: "pre-wrap",
            }}>
              {selected.loreText}
            </div>
          ) : (
            <p style={{
              margin: 0,
              fontStyle: "italic",
              color: "#5f5340",
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontSize: 13,
            }}>Os escribas ainda nao registraram a historia desta divindade.</p>
          )}

          {devoteesList.length > 0 && (
            <div style={{ paddingTop: 14, borderTop: "1px dashed #3d3022", marginTop: 18 }}>
              <p style={{
                margin: "0 0 8px",
                fontSize: 9,
                color: "#8b6f3a",
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                fontFamily: "var(--font-cinzel), Georgia, serif",
              }}>Devotos famosos</p>
              <div>
                {devoteesList.map((d, i) => (
                  <span key={i} style={{
                    display: "inline-block",
                    padding: "4px 10px",
                    fontSize: 11,
                    color: "#fef3c7",
                    background: "rgba(201,169,97,0.1)",
                    border: "1px solid #5a3f1a",
                    borderRadius: 2,
                    margin: "0 4px 4px 0",
                    letterSpacing: "0.06em",
                    fontFamily: "var(--font-cinzel), Georgia, serif",
                  }}>{d}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>

    </div>
  );
}

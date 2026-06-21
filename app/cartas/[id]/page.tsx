export const dynamic = "force-dynamic";

// app/cartas/[id]/page.tsx
// Detalhe de uma carta no Bestiario: arte ampliada + lore expandida.

import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { CardPreview } from "@/app/components/CardPreview";
import { RARITIES, CARD_TYPES, ROWS } from "@/lib/constants";

const prisma = new PrismaClient();

export default async function CartaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const card = await prisma.card.findUnique({
    where: { id },
    include: { faction: true, ability: true },
  });

  if (!card || !card.isReleased) notFound();

  const settings = await prisma.gameSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const rarity = RARITIES.find((r) => r.key === card.rarity);
  const cardType = CARD_TYPES.find((t) => t.key === card.cardType);
  const rowList = card.rows.split(",").filter(Boolean)
    .map((r) => ROWS.find((x) => x.key === r)?.label ?? r);

  return (
    <main
      style={{
        flex: 1,
        position: "relative",
        minHeight: "100vh",
        color: "#e9d9b6",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {settings.landingBackgroundUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundImage: `url(${settings.landingBackgroundUrl})`,
            backgroundSize: "contain",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
            backgroundColor: "#0a0805",
            backgroundAttachment: "fixed",
            opacity: 0.5,
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "linear-gradient(180deg, rgba(10,8,5,0.45) 0%, rgba(10,8,5,0.75) 70%, rgba(10,8,5,0.9) 100%)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "40px 32px 60px", width: "100%" }}>

        <Link
          href="/cartas"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-cinzel), Georgia, serif",
            fontSize: 11,
            color: "#8b6f3a",
            textDecoration: "none",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          &larr; Bestiario
        </Link>

        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 48, alignItems: "start" }}>

          {/* Carta */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ transform: "scale(1.4)", transformOrigin: "top center" }}>
              <CardPreview card={card} />
            </div>
          </div>

          {/* Info */}
          <div style={{ marginTop: 48, paddingLeft: 16 }}>
            <h1 style={{
              margin: 0,
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: "0.05em",
              background: "linear-gradient(180deg, #fef3c7 0%, #c9a961 50%, #6a4a20 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 2px 8px rgba(201,169,97,0.3))",
            }}>
              {card.name}
            </h1>
            <p style={{
              margin: "8px 0 0",
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontStyle: "italic",
              fontSize: 18,
              color: card.faction.color,
            }}>
              {card.faction.name}
            </p>

            {/* Stats */}
            <div style={{
              marginTop: 24,
              padding: 16,
              background: "rgba(20,12,4,0.6)",
              border: "1px solid #3d3022",
              borderRadius: 6,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}>
              <StatLine label="Poder"    value={String(card.power)}                  color="#fcd34d" mono />
              <StatLine label="Tipo"     value={cardType?.label ?? card.cardType}    color="#fef3c7" />
              <StatLine label="Raridade" value={rarity?.label ?? card.rarity}        color={rarity?.color ?? "#fef3c7"} />
              <StatLine label="Fileiras" value={rowList.join(", ") || "—"}           color="#fef3c7" />
            </div>

            {card.ability && (
              <div style={{
                marginTop: 16,
                padding: 16,
                background: "rgba(20,12,4,0.6)",
                border: "1px solid #5a3f1a",
                borderLeft: "3px solid #c9a961",
                borderRadius: 6,
              }}>
                <p style={{ margin: "0 0 6px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 11, color: "#c9a961", letterSpacing: "0.3em", textTransform: "uppercase" }}>
                  ✦ {card.ability.name}
                </p>
                <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 15, color: "#d3c89a", lineHeight: 1.6 }}>
                  {card.ability.description}
                </p>
              </div>
            )}

            {card.loreText && (
              <div style={{
                marginTop: 16,
                padding: 20,
                background: "linear-gradient(180deg, rgba(40,25,10,0.7), rgba(20,12,4,0.7))",
                border: "1px solid #5a3f1a",
                borderRadius: 6,
                textAlign: "center",
              }}>
                <p style={{
                  margin: 0,
                  fontFamily: "var(--font-cormorant), Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 17,
                  color: "#d3c89a",
                  lineHeight: 1.7,
                }}>
                  &ldquo;{card.loreText}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}

function StatLine({ label, value, color, mono }: { label: string; value: string; color: string; mono?: boolean }) {
  return (
    <div>
      <p style={{ margin: 0, fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 9, color: "#8b6f3a", letterSpacing: "0.3em", textTransform: "uppercase" }}>
        {label}
      </p>
      <p style={{
        margin: "4px 0 0",
        fontFamily: mono ? "monospace" : "var(--font-cinzel), Georgia, serif",
        fontSize: mono ? 22 : 15,
        color,
        fontWeight: mono ? 700 : 400,
        letterSpacing: mono ? 0 : "0.05em",
      }}>
        {value}
      </p>
    </div>
  );
}

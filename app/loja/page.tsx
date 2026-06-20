export const dynamic = "force-dynamic";

// app/loja/page.tsx
// Mercado do Eitri: lista boosters ativos com botao de compra.

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { BoosterCard } from "./_components/BoosterCard";
import { RARITIES } from "@/lib/constants";

const prisma = new PrismaClient();

export default async function LojaPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const [user, boosters, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { username: session.user.name },
      select: { id: true, coins: true },
    }),
    prisma.booster.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
      include: {
        rules: { include: { card: { select: { name: true } } } },
        _count: { select: { unopened: true } },
      },
    }),
    prisma.gameSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    }),
  ]);

  if (!user) redirect("/login");

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

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "40px 32px 60px", width: "100%" }}>

        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <p style={{ margin: "0 0 10px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 10, color: "#8b6f3a", textTransform: "uppercase", letterSpacing: "0.5em" }}>
            &mdash; Cronica I &middot; Idade do Pacto &mdash;
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontSize: 52,
              fontWeight: 700,
              letterSpacing: "0.15em",
              textIndent: "0.15em",
              lineHeight: 1,
              background: "linear-gradient(180deg, #fef3c7 0%, #c9a961 50%, #6a4a20 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 4px 16px rgba(201,169,97,0.4))",
            }}
          >
            MERCADO DO EITRI
          </h1>
          <p style={{ margin: "16px auto 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", color: "#d3c89a", fontSize: 16, maxWidth: 600, lineHeight: 1.5, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
            &ldquo;Anoes do norte forjam pacotes raros pra aventureiros corajosos.&rdquo;
          </p>
        </div>

        {/* Saldo + atalho estante */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, padding: "14px 20px", background: "rgba(20,12,4,0.6)", border: "1px solid #5a3f1a", borderRadius: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 10, color: "#8b6f3a", textTransform: "uppercase", letterSpacing: "0.3em" }}>
              Patrimonio
            </span>
            <p style={{ margin: 0, fontFamily: "monospace", fontSize: 24, color: "#fcd34d", fontWeight: 700, lineHeight: 1, textShadow: "0 0 12px rgba(252,211,77,0.4)" }}>
              ✨ {user.coins.toLocaleString("pt-BR")}
            </p>
          </div>
          <Link
            href="/estante"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              border: "1px solid #5a3f1a",
              borderRadius: 4,
              color: "#b76e5f",
              textDecoration: "none",
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            Ver Estante &rarr;
          </Link>
        </div>

        {boosters.length === 0 ? (
          <div style={{ background: "rgba(20,12,4,0.5)", border: "1px solid #3d3022", borderRadius: 6, padding: "48px 20px", textAlign: "center" }}>
            <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#5f5340" }}>
              Os anoes ainda nao trouxeram novos pacotes ao mercado.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {boosters.map((b) => (
              <BoosterCard
                key={b.id}
                booster={{
                  id: b.id,
                  name: b.name,
                  description: b.description,
                  price: b.price,
                  imageUrl: b.imageUrl,
                  totalCards: b.rules.reduce((s, r) => s + r.quantity, 0),
                  ruleSummary: b.rules.map((r) =>
                    r.mode === "FIXED_POOL"
                      ? `${r.quantity}x ${r.card?.name ?? "?"}`
                      : `${r.quantity}x ${RARITIES.find((x) => x.key === r.rarity)?.label ?? r.rarity}`
                  ),
                }}
                userCoins={user.coins}
              />
            ))}
          </div>
        )}

      </div>
    </main>
  );
}

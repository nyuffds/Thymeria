export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { LeiloesList } from "./_components/LeiloesList";

const prisma = new PrismaClient();

export default async function LeiloesPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true, role: true, coins: true },
  });
  if (!me) redirect("/login");

  const isAdmin = me.role === "ADMIN";

  const settings = await prisma.gameSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const auctions = await prisma.auction.findMany({
    where: { status: "ACTIVE" },
    orderBy: { endsAt: "asc" },
    include: {
      card: { include: { faction: true } },
      bids: { select: { id: true, bidderUserId: true } },
    },
  });

  const myBids = await prisma.auctionBid.findMany({
    where: { bidderUserId: me.id, auction: { status: "ACTIVE" } },
    select: { auctionId: true, amount: true },
  });
  const myBidsMap = new Map(myBids.map((b) => [b.auctionId, b.amount]));

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
            OS LEILOES
          </h1>
          <p style={{ margin: "16px auto 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", color: "#d3c89a", fontSize: 16, maxWidth: 620, lineHeight: 1.5, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
            &ldquo;Lances secretos. O maior leva. Quando o tempo se esgota, nao ha apelacao.&rdquo;
          </p>
        </div>

        {/* Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, padding: "14px 20px", background: "rgba(20,12,4,0.6)", border: "1px solid #5a3f1a", borderRadius: 4, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 10, color: "#8b6f3a", textTransform: "uppercase", letterSpacing: "0.3em" }}>
              Patrimonio
            </span>
            <p style={{ margin: 0, fontFamily: "monospace", fontSize: 22, color: "#fcd34d", fontWeight: 700, lineHeight: 1, textShadow: "0 0 12px rgba(252,211,77,0.4)" }}>
              ✨ {me.coins.toLocaleString("pt-BR")}
            </p>
          </div>
          {isAdmin && (
            <div style={{ display: "flex", gap: 8 }}>
              <SecondaryLink href="/admin/leiloes" label="Gerenciar" />
              <Link
                href="/admin/leiloes/novo"
                style={{
                  display: "inline-block",
                  padding: "8px 18px",
                  background: "linear-gradient(180deg, #c9a961, #8b6f3a)",
                  color: "#1a0f05",
                  fontFamily: "var(--font-cinzel), Georgia, serif",
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: "0.2em",
                  textDecoration: "none",
                  borderRadius: 4,
                  boxShadow: "0 4px 16px rgba(201,169,97,0.4)",
                }}
              >
                + CRIAR LEILAO
              </Link>
            </div>
          )}
        </div>

        {auctions.length === 0 ? (
          <div style={{ background: "rgba(20,12,4,0.5)", border: "1px solid #3d3022", borderRadius: 6, padding: "48px 20px", textAlign: "center" }}>
            <p style={{ margin: "0 0 8px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 14, color: "#8b6f3a", letterSpacing: "0.1em" }}>
              Salao silencioso
            </p>
            <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#5f5340" }}>
              Nenhum leilao ativo no momento. Volte mais tarde.
            </p>
          </div>
        ) : (
          <LeiloesList
            auctions={auctions.map((a) => ({
              id: a.id,
              cardName: a.card.name,
              cardImageUrl: a.card.imageUrl,
              factionName: a.card.faction.name,
              factionColor: a.card.faction.color,
              rarity: a.card.rarity,
              quantity: a.quantity,
              minBid: a.minBid,
              durationSeconds: a.durationSeconds,
              endsAt: a.endsAt.toISOString(),
              bidCount: a.bids.length,
              myBid: myBidsMap.get(a.id) ?? null,
            }))}
            factions={Array.from(new Set(auctions.map((a) => a.card.faction.name))).sort()}
            myCoins={me.coins}
            isAdmin={isAdmin}
          />
        )}

      </div>
    </main>
  );
}

function SecondaryLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "8px 14px",
        border: "1px solid #5a3f1a",
        borderRadius: 4,
        color: "#c9a961",
        textDecoration: "none",
        fontFamily: "var(--font-cinzel), Georgia, serif",
        fontSize: 11,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </Link>
  );
}

export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { CancelTradeButton } from "../_components/CancelTradeButton";

const prisma = new PrismaClient();

const RARITY_COLOR: Record<string, string> = {
  COMMON: "#9ca3af", UNCOMMON: "#34d399", RARE: "#60a5fa", EPIC: "#a78bfa", LEGENDARY: "#fbbf24",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente", ACCEPTED: "Aceita", REJECTED: "Recusada", CANCELLED: "Cancelada",
};
const STATUS_COLOR: Record<string, string> = {
  PENDING: "#fcd34d", ACCEPTED: "#34d399", REJECTED: "#f87171", CANCELLED: "#71717a",
};

export default async function MinhasOfertasPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!me) redirect("/login");

  const settings = await prisma.gameSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const offers = await prisma.tradeOffer.findMany({
    where: { creatorUserId: me.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      target:   { select: { username: true } },
      acceptor: { select: { username: true } },
      offered:  { include: { card: { include: { faction: true } } } },
      demanded: { include: { card: { include: { faction: true } } } },
    },
  });

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
          href="/mercado/trocas"
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
          &larr; Trocas
        </Link>

        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <p style={{ margin: "0 0 10px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 10, color: "#8b6f3a", textTransform: "uppercase", letterSpacing: "0.5em" }}>
            &mdash; A Bolsa &mdash;
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontSize: 44,
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
            MINHAS OFERTAS
          </h1>
          <p style={{ margin: "16px auto 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", color: "#d3c89a", fontSize: 16, maxWidth: 580, lineHeight: 1.5, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
            &ldquo;Acompanhe e cancele suas ofertas de troca.&rdquo;
          </p>
        </div>

        {offers.length === 0 ? (
          <div style={{ background: "rgba(20,12,4,0.5)", border: "1px solid #3d3022", borderRadius: 6, padding: "40px 24px", textAlign: "center" }}>
            <p style={{ margin: "0 0 8px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 14, color: "#8b6f3a", letterSpacing: "0.1em" }}>
              Sem ofertas
            </p>
            <p style={{ margin: "0 0 20px", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#5f5340" }}>
              Voce ainda nao criou ofertas de troca.
            </p>
            <Link
              href="/mercado/trocas/nova"
              style={{
                display: "inline-block",
                padding: "10px 22px",
                background: "linear-gradient(180deg, #c9a961, #8b6f3a)",
                color: "#1a0f05",
                fontFamily: "var(--font-cinzel), Georgia, serif",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.2em",
                textDecoration: "none",
                borderRadius: 4,
                boxShadow: "0 4px 16px rgba(201,169,97,0.4)",
              }}
            >
              CRIAR PRIMEIRA OFERTA
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {offers.map((o) => {
              const statusColor = STATUS_COLOR[o.status] ?? "#71717a";
              return (
                <article
                  key={o.id}
                  style={{
                    padding: 18,
                    background: "rgba(20,12,4,0.6)",
                    border: "1px solid #3d3022",
                    borderLeft: `3px solid ${statusColor}`,
                    borderRadius: 4,
                  }}
                >
                  {/* Status linha */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span
                        style={{
                          padding: "3px 10px",
                          fontSize: 10,
                          fontFamily: "var(--font-cinzel), Georgia, serif",
                          fontWeight: 700,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          borderRadius: 3,
                          background: statusColor + "22",
                          color: statusColor,
                          border: `1px solid ${statusColor}55`,
                        }}
                      >
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                      {o.targetUserId && o.target && (
                        <span style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 12, color: "#8b6f3a" }}>
                          Direcionada a <strong style={{ color: "#fef3c7", fontStyle: "normal" }}>{o.target.username}</strong>
                        </span>
                      )}
                      {!o.targetUserId && (
                        <span style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 12, color: "#5f5340" }}>
                          Publica
                        </span>
                      )}
                      {o.acceptor && (
                        <span style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 12, color: "#34d399" }}>
                          → Aceita por <strong style={{ color: "#fef3c7", fontStyle: "normal" }}>{o.acceptor.username}</strong>
                        </span>
                      )}
                    </div>
                    <span style={{ fontFamily: "monospace", fontSize: 10, color: "#5f5340" }}>
                      {new Date(o.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>

                  {/* Troca */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center", marginBottom: 10 }}>
                    <div style={{ padding: 12, background: "rgba(52,211,153,0.08)", border: "1px solid #1e5a3a", borderRadius: 4 }}>
                      <p style={{ margin: "0 0 8px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 10, color: "#34d399", letterSpacing: "0.25em", textTransform: "uppercase" }}>
                        Voce oferece
                      </p>
                      <CardListView entries={o.offered} />
                      {o.coinsOffered > 0 && (
                        <p style={{ margin: "8px 0 0", fontFamily: "monospace", fontSize: 13, color: "#fcd34d", fontWeight: 700 }}>
                          + ✨ {o.coinsOffered} moedas
                        </p>
                      )}
                    </div>
                    <div style={{ fontSize: 24, color: "#5f5340" }}>↔</div>
                    <div style={{ padding: 12, background: "rgba(248,113,113,0.08)", border: "1px solid #5a1818", borderRadius: 4 }}>
                      <p style={{ margin: "0 0 8px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 10, color: "#f87171", letterSpacing: "0.25em", textTransform: "uppercase" }}>
                        Voce pede
                      </p>
                      <CardListView entries={o.demanded} />
                      {o.coinsDemanded > 0 && (
                        <p style={{ margin: "8px 0 0", fontFamily: "monospace", fontSize: 13, color: "#fcd34d", fontWeight: 700 }}>
                          + ✨ {o.coinsDemanded} moedas
                        </p>
                      )}
                    </div>
                  </div>

                  {o.note && (
                    <p style={{
                      margin: "8px 0 0",
                      padding: "6px 12px",
                      background: "rgba(10,8,5,0.6)",
                      borderLeft: "2px solid #5a3f1a",
                      fontFamily: "var(--font-cormorant), Georgia, serif",
                      fontStyle: "italic",
                      fontSize: 12,
                      color: "#d3c89a",
                    }}>
                      &ldquo;{o.note}&rdquo;
                    </p>
                  )}

                  {o.status === "PENDING" && (
                    <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                      <CancelTradeButton offerId={o.id} />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}

interface Entry {
  quantity: number;
  card: {
    name: string;
    rarity: string;
    imageUrl: string | null;
    faction: { name: string; color: string };
  };
}

function CardListView({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 12, color: "#5f5340" }}>Apenas moedas</p>;
  }
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
      {entries.map((e, i) => (
        <li key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {e.card.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.card.imageUrl} alt={e.card.name} style={{ width: 32, height: 44, borderRadius: 3, objectFit: "cover", flexShrink: 0, border: `1px solid ${e.card.faction.color}55` }} />
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <span style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 12, color: RARITY_COLOR[e.card.rarity] ?? "#e5e7eb" }}>{e.card.name}</span>
              <span style={{ marginLeft: 4, fontFamily: "monospace", fontSize: 11, color: "#5f5340" }}>x{e.quantity}</span>
            </p>
            <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 11, color: e.card.faction.color }}>
              {e.card.faction.name}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

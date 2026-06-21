export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { CancelButton } from "../_components/CancelButton";

const prisma = new PrismaClient();

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativa",
  SOLD: "Vendida",
  CANCELLED: "Cancelada",
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#fcd34d",
  SOLD: "#34d399",
  CANCELLED: "#71717a",
};

export default async function MinhasListagensPage() {
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

  const listings = await prisma.marketListing.findMany({
    where: { sellerUserId: me.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      card: { include: { faction: true } },
      buyer: { select: { username: true } },
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

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1000, margin: "0 auto", padding: "40px 32px 60px", width: "100%" }}>

        <Link
          href="/mercado"
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
          &larr; Bolsa
        </Link>

        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <p style={{ margin: "0 0 10px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 10, color: "#8b6f3a", textTransform: "uppercase", letterSpacing: "0.5em" }}>
            &mdash; A Bolsa &mdash;
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontSize: 48,
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
            MINHAS LISTAGENS
          </h1>
          <p style={{ margin: "16px auto 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", color: "#d3c89a", fontSize: 16, maxWidth: 580, lineHeight: 1.5, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
            &ldquo;Acompanhe suas vendas e cancele listagens ativas.&rdquo;
          </p>
        </div>

        {listings.length === 0 ? (
          <div style={{ background: "rgba(20,12,4,0.5)", border: "1px solid #3d3022", borderRadius: 6, padding: "40px 24px", textAlign: "center" }}>
            <p style={{ margin: "0 0 8px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 14, color: "#8b6f3a", letterSpacing: "0.1em" }}>
              Sem listagens
            </p>
            <p style={{ margin: "0 0 20px", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#5f5340" }}>
              Voce ainda nao listou nenhuma carta na Bolsa.
            </p>
            <Link
              href="/mercado/nova"
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
              LISTAR PRIMEIRA CARTA
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {listings.map((l) => {
              const totalPrice = l.pricePerUnit * l.quantity;
              const statusColor = STATUS_COLOR[l.status] ?? "#71717a";
              return (
                <article
                  key={l.id}
                  style={{
                    padding: 14,
                    background: "rgba(20,12,4,0.6)",
                    border: "1px solid #3d3022",
                    borderLeft: `3px solid ${statusColor}`,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  {l.card.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.card.imageUrl}
                      alt={l.card.name}
                      style={{
                        width: 48,
                        height: 72,
                        borderRadius: 3,
                        objectFit: "cover",
                        flexShrink: 0,
                        border: `1px solid ${l.card.faction.color}88`,
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <p style={{ margin: 0, fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 14, color: "#fef3c7", letterSpacing: "0.05em" }}>
                        {l.card.name}
                      </p>
                      <span
                        style={{
                          padding: "2px 8px",
                          fontSize: 10,
                          fontFamily: "var(--font-cinzel), Georgia, serif",
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                          borderRadius: 3,
                          background: statusColor + "22",
                          color: statusColor,
                          border: `1px solid ${statusColor}55`,
                        }}
                      >
                        {STATUS_LABEL[l.status] ?? l.status}
                      </span>
                    </div>
                    <p style={{ margin: "0 0 4px", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 11, color: l.card.faction.color }}>
                      {l.card.faction.name}
                    </p>
                    <p style={{ margin: 0, fontFamily: "monospace", fontSize: 12, color: "#d3c89a" }}>
                      Qtd: <span style={{ color: "#fcd34d" }}>{l.quantity}</span>
                      <span style={{ color: "#3d3022", margin: "0 6px" }}>·</span>
                      <span style={{ color: "#fcd34d" }}>✨ {l.pricePerUnit}</span>
                      <span style={{ color: "#8b6f3a", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", marginLeft: 4 }}>cada</span>
                      {l.quantity > 1 && (
                        <span style={{ color: "#5f5340", marginLeft: 8 }}>(total ✨{totalPrice})</span>
                      )}
                    </p>
                    {l.status === "SOLD" && l.buyer && (
                      <p style={{ margin: "4px 0 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 12, color: "#34d399" }}>
                        Vendida para <strong style={{ color: "#fef3c7", fontStyle: "normal" }}>{l.buyer.username}</strong>
                      </p>
                    )}
                  </div>
                  {l.status === "ACTIVE" && <CancelButton listingId={l.id} />}
                </article>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}

// app/regras/cartas/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { RegrasLayout } from "../_components/RegrasLayout";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

const RARITY_LABEL: Record<string, string> = {
  COMMON: "Comum", UNCOMMON: "Incomum", RARE: "Rara", EPIC: "Epica", LEGENDARY: "Lendaria",
};
const RARITY_COLOR: Record<string, string> = {
  COMMON: "#9ca3af", UNCOMMON: "#34d399", RARE: "#60a5fa", EPIC: "#a78bfa", LEGENDARY: "#fbbf24",
};
const TYPE_LABEL: Record<string, string> = {
  UNIT: "Unidade", SPECIAL: "Especial", WEATHER: "Clima", LEADER: "Lider",
};

export default async function RegrasCartasPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true, role: true },
  });
  if (!user) redirect("/login");

  const isAdmin = user.role === "ADMIN";

  const cards = isAdmin
    ? await prisma.card.findMany({ include: { faction: true, ability: true }, orderBy: [{ rarity: "asc" }, { name: "asc" }] })
    : await prisma.card.findMany({
        where: { collectedBy: { some: { userId: user.id, quantity: { gt: 0 } } } },
        include: { faction: true, ability: true },
        orderBy: [{ rarity: "asc" }, { name: "asc" }],
      });

  return (
    <RegrasLayout
      title={isAdmin ? "Todas as Cartas" : "Suas Cartas"}
      subtitle={isAdmin
        ? "Visao do Conselho: todas as cartas ativas do sistema."
        : "Cartas que voce possui na sua colecao. Adquira novas no Mercado do Eitri."}
      maxWidth={1100}
    >
      {cards.length === 0 ? (
        <div style={{ padding: "48px 20px", background: "rgba(20,12,4,0.5)", border: "1px solid #3d3022", borderRadius: 6, textAlign: "center" }}>
          <p style={{ margin: "0 0 16px", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 14, color: "#5f5340" }}>
            Sua colecao esta vazia.
          </p>
          <Link
            href="/loja"
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
            }}
          >
            VISITAR O MERCADO
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {cards.map((c) => (
            <article
              key={c.id}
              style={{
                padding: 12,
                display: "flex",
                gap: 10,
                background: "rgba(20,12,4,0.6)",
                border: `1px solid ${c.faction.color}55`,
                borderRadius: 4,
              }}
            >
              {c.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.imageUrl}
                  alt={c.name}
                  style={{
                    width: 56,
                    height: 84,
                    borderRadius: 3,
                    objectFit: "cover",
                    flexShrink: 0,
                    border: `1px solid ${c.faction.color}88`,
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 13, color: "#fef3c7", letterSpacing: "0.05em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.name}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: c.faction.color, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic" }}>
                  {c.faction.name}
                </p>
                <p style={{ margin: "4px 0 0", display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                  <span style={{ color: RARITY_COLOR[c.rarity] ?? "#9ca3af", fontFamily: "var(--font-cinzel), Georgia, serif", letterSpacing: "0.05em" }}>
                    {RARITY_LABEL[c.rarity] ?? c.rarity}
                  </span>
                  <span style={{ color: "#3d3022" }}>·</span>
                  <span style={{ color: "#8b6f3a" }}>{TYPE_LABEL[c.cardType] ?? c.cardType}</span>
                  {c.cardType !== "LEADER" && c.cardType !== "WEATHER" && (
                    <>
                      <span style={{ color: "#3d3022" }}>·</span>
                      <span style={{ fontFamily: "monospace", color: "#fcd34d", fontWeight: 700 }}>{c.power}</span>
                    </>
                  )}
                </p>
                {c.isElite && (
                  <p style={{ margin: "4px 0 0", fontSize: 10, color: "#fbbf24", fontFamily: "var(--font-cinzel), Georgia, serif", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                    ⚜ Elite
                  </p>
                )}
                {c.ability && (
                  <p style={{ margin: "6px 0 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 12, color: "#d3c89a", lineHeight: 1.4 }}>
                    <strong style={{ color: "#c9a961", fontStyle: "normal" }}>{c.ability.name}:</strong> {c.ability.description}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </RegrasLayout>
  );
}

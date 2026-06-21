// app/regras/habilidades/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { RegrasLayout } from "../_components/RegrasLayout";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export default async function RegrasHabilidadesPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true, role: true },
  });
  if (!user) redirect("/login");

  const isAdmin = user.role === "ADMIN";

  const cards = isAdmin
    ? await prisma.card.findMany({ where: { abilityId: { not: null } }, include: { ability: true, faction: true } })
    : await prisma.card.findMany({
        where: { abilityId: { not: null }, collectedBy: { some: { userId: user.id, quantity: { gt: 0 } } } },
        include: { ability: true, faction: true },
      });

  type AbilityWithCards = { id: string; name: string; description: string; cards: typeof cards };
  const byAbility = new Map<string, AbilityWithCards>();
  for (const c of cards) {
    if (!c.ability) continue;
    if (!byAbility.has(c.ability.id)) {
      byAbility.set(c.ability.id, { id: c.ability.id, name: c.ability.name, description: c.ability.description, cards: [] });
    }
    byAbility.get(c.ability.id)!.cards.push(c);
  }
  const abilities = Array.from(byAbility.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <RegrasLayout
      title={isAdmin ? "Todas as Habilidades" : "Suas Habilidades"}
      subtitle={isAdmin
        ? "Visao do Conselho: todas as habilidades cadastradas."
        : "Habilidades das cartas da sua colecao."}
      maxWidth={900}
    >
      {abilities.length === 0 ? (
        <div style={{ padding: "48px 20px", background: "rgba(20,12,4,0.5)", border: "1px solid #3d3022", borderRadius: 6, textAlign: "center" }}>
          <p style={{ margin: "0 0 16px", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 14, color: "#5f5340" }}>
            Voce ainda nao tem cartas com habilidades.
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {abilities.map((a) => (
            <article
              key={a.id}
              style={{ padding: 20, background: "rgba(20,12,4,0.6)", border: "1px solid #5a3f1a", borderLeft: "3px solid #c9a961", borderRadius: 4 }}
            >
              <h2 style={{ margin: 0, fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 16, color: "#fef3c7", letterSpacing: "0.08em" }}>
                {a.name}
              </h2>
              <p style={{ margin: "8px 0 12px", fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 14, color: "#d3c89a", lineHeight: 1.6 }}>
                {a.description}
              </p>
              <div style={{ paddingTop: 12, borderTop: "1px solid #3d3022" }}>
                <p style={{ margin: "0 0 8px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 10, color: "#8b6f3a", letterSpacing: "0.25em", textTransform: "uppercase" }}>
                  {a.cards.length === 1 ? "1 carta com esta habilidade" : `${a.cards.length} cartas com esta habilidade`}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {a.cards.map((c) => (
                    <span
                      key={c.id}
                      style={{
                        padding: "3px 8px",
                        fontSize: 11,
                        borderRadius: 3,
                        background: c.faction.color + "15",
                        border: `1px solid ${c.faction.color}55`,
                        color: c.faction.color,
                        fontFamily: "var(--font-cinzel), Georgia, serif",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </RegrasLayout>
  );
}

// app/admin/panteao/page.tsx
// Lista admin do panteao.

export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { seedDeitiesAction } from "@/lib/panteao-actions";

const prisma = new PrismaClient();

export default async function AdminPanteaoPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { role: true },
  });
  if (!me || me.role !== "ADMIN") redirect("/");

  const deities = await prisma.pantheonDeity.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });

  return (
    <main style={{ flex: 1, padding: "40px 32px", color: "#e9d9b6", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Link href="/admin" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontFamily: "var(--font-cinzel), Georgia, serif",
          fontSize: 11, color: "#8b6f3a", textDecoration: "none",
          letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 24,
        }}>&larr; Sala do Conselho</Link>

        <h1 style={{
          margin: 0,
          fontFamily: "var(--font-cinzel), Georgia, serif",
          fontSize: 36, fontWeight: 700, letterSpacing: "0.1em",
          color: "#fcd34d",
        }}>Panteao</h1>
        <p style={{
          margin: "8px 0 24px",
          fontFamily: "var(--font-cormorant), Georgia, serif",
          fontStyle: "italic", fontSize: 14, color: "#8b6f3a",
        }}>Gerencie as divindades, imagens e lore exibidas em /panteao.</p>

        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <Link href="/admin/panteao/novo" style={{
            display: "inline-block",
            padding: "10px 22px",
            background: "linear-gradient(180deg, #c9a961, #8b6f3a)",
            color: "#1a0f05",
            fontFamily: "var(--font-cinzel), Georgia, serif",
            fontWeight: 700, fontSize: 12, letterSpacing: "0.2em",
            textDecoration: "none", borderRadius: 4,
            boxShadow: "0 4px 16px rgba(201,169,97,0.4)",
          }}>+ NOVA DIVINDADE</Link>

          {deities.length === 0 && (
            <form action={seedDeitiesAction}>
              <button type="submit" style={{
                padding: "10px 22px",
                background: "rgba(94,173,226,0.12)",
                color: "#5dade2",
                border: "1px solid #5dade255",
                fontFamily: "var(--font-cinzel), Georgia, serif",
                fontWeight: 600, fontSize: 12, letterSpacing: "0.2em",
                cursor: "pointer", borderRadius: 4,
              }}>POPULAR COM 11 DEUSES PADRAO</button>
            </form>
          )}
        </div>

        {deities.length === 0 ? (
          <div style={{
            background: "rgba(20,12,4,0.5)",
            border: "1px solid #3d3022",
            borderRadius: 6,
            padding: 40,
            textAlign: "center",
          }}>
            <p style={{
              margin: 0,
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontStyle: "italic", fontSize: 14, color: "#5f5340",
            }}>O Panteao esta vazio. Clique em &quot;Popular&quot; para semear os 11 deuses padrao, ou em &quot;Nova divindade&quot; para criar do zero.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {deities.map((d) => (
              <Link key={d.id} href={`/admin/panteao/${d.id}`} style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: 14,
                background: "rgba(20,12,4,0.5)",
                border: "1px solid #3d3022",
                borderLeft: `3px solid ${d.color}`,
                borderRadius: 4,
                textDecoration: "none",
                color: "inherit",
              }}>
                <span style={{
                  fontSize: 22,
                  width: 38, height: 38,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: `${d.color}11`,
                  border: `1px solid ${d.color}55`,
                  borderRadius: 3,
                }}>{d.symbol}</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0,
                    fontFamily: "var(--font-cinzel), Georgia, serif",
                    fontSize: 14, color: "#fef3c7",
                    letterSpacing: "0.08em",
                  }}>{d.name}
                    {!d.isPublished && (
                      <span style={{
                        marginLeft: 10, fontSize: 9, color: "#c0392b",
                        border: "1px solid #c0392b55", padding: "2px 8px",
                        borderRadius: 2, letterSpacing: "0.2em",
                      }}>RASCUNHO</span>
                    )}
                  </p>
                  <p style={{
                    margin: "3px 0 0",
                    fontFamily: "var(--font-cormorant), Georgia, serif",
                    fontStyle: "italic", fontSize: 12, color: "#8b6f3a",
                  }}>{d.domain} &middot; {d.alignment} &middot; ordem #{d.displayOrder}</p>
                </div>

                <span style={{ color: "#5f5340" }}>→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

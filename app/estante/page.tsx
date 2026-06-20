export const dynamic = "force-dynamic";

// app/estante/page.tsx
// Mostra os boosters fechados do jogador, agrupados por tipo.

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { EstanteList } from "./_components/EstanteList";

const prisma = new PrismaClient();

interface BoosterInfo {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
}

interface Group {
  booster: BoosterInfo;
  ids: string[];
}

export default async function EstantePage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) redirect("/login");

  const settings = await prisma.gameSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const unopened = await prisma.unopenedBooster.findMany({
    where: { userId: user.id },
    orderBy: { acquiredAt: "asc" },
    include: {
      booster: {
        select: { id: true, name: true, description: true, imageUrl: true },
      },
    },
  });

  const groups = new Map<string, Group>();
  for (const u of unopened) {
    const existing = groups.get(u.booster.id);
    if (existing) {
      existing.ids.push(u.id);
    } else {
      groups.set(u.booster.id, { booster: u.booster, ids: [u.id] });
    }
  }

  const groupList: Group[] = Array.from(groups.values());
  const totalBoosters = unopened.length;

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
            ESTANTE DE BOOSTERS
          </h1>
          <p style={{ margin: "16px auto 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", color: "#d3c89a", fontSize: 16, maxWidth: 600, lineHeight: 1.5, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
            &ldquo;Cada pacote selado guarda destinos nao escritos.&rdquo;
          </p>

          {totalBoosters > 0 && (
            <p style={{ margin: "14px 0 0", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 11, color: "#b76e5f", letterSpacing: "0.3em", textTransform: "uppercase" }}>
              {totalBoosters} pacote{totalBoosters > 1 ? "s" : ""} aguardando
            </p>
          )}
        </div>

        {/* CTA loja */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <Link
            href="/loja"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
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
            Ir ao Mercado &rarr;
          </Link>
        </div>

        {totalBoosters === 0 ? (
          <div style={{ background: "rgba(20,12,4,0.5)", border: "1px solid #3d3022", borderRadius: 6, padding: "48px 20px", textAlign: "center" }}>
            <p style={{ margin: "0 0 8px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 14, color: "#8b6f3a", letterSpacing: "0.1em" }}>
              Estante vazia
            </p>
            <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#5f5340" }}>
              Compre boosters no <Link href="/loja" style={{ color: "#c9a961" }}>Mercado do Eitri</Link> pra comecar.
            </p>
          </div>
        ) : (
          <EstanteList groups={groupList} />
        )}

      </div>
    </main>
  );
}

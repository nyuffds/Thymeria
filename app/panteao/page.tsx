// app/panteao/page.tsx
// Codex publico do Panteao - layout estilo Gwent codex.

export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { PanteaoCodex } from "./_components/PanteaoCodex";

const prisma = new PrismaClient();

export default async function PanteaoPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const settings = await prisma.gameSettings.upsert({
    where: { id: "singleton" }, update: {}, create: { id: "singleton" },
  });

  const deities = await prisma.pantheonDeity.findMany({
    where: { isPublished: true },
    orderBy: [{ name: "asc" }],
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

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", padding: "40px 32px 60px", width: "100%" }}>

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
            O PANTEAO
          </h1>
          <p style={{ margin: "16px auto 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", color: "#d3c89a", fontSize: 16, maxWidth: 600, lineHeight: 1.5, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
            &ldquo;Onze divindades velam Thymeria. Tres faces, tres dominios: a Ordem que sustenta, o Caos que desafia, a Neutralidade que observa.&rdquo;
          </p>
        </div>

        {deities.length === 0 ? (
          <div style={{ background: "rgba(20,12,4,0.5)", border: "1px solid #3d3022", borderRadius: 6, padding: "48px 20px", textAlign: "center" }}>
            <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 14, color: "#5f5340" }}>
              Nenhuma divindade catalogada. O Conselho precisa popular o Panteao.
            </p>
          </div>
        ) : (
          <PanteaoCodex
            deities={deities.map((d) => ({
              id: d.id,
              slug: d.slug,
              name: d.name,
              alignment: d.alignment,
              domain: d.domain,
              symbol: d.symbol,
              color: d.color,
              quote: d.quote,
              quoteSource: d.quoteSource,
              loreText: d.loreText,
              imageUrl: d.imageUrl,
              famousDevotees: d.famousDevotees,
            }))}
          />
        )}
      </div>
    </main>
  );
}

// app/regras/faccoes/page.tsx

import { PrismaClient } from "@prisma/client";
import { RegrasLayout } from "../_components/RegrasLayout";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export default async function RegrasFaccoesPage() {
  const faccoes = await prisma.faction.findMany({ orderBy: { name: "asc" } });

  return (
    <RegrasLayout title="Faccoes" subtitle="Cada faccao tem seu proprio estilo de jogo e tematica." maxWidth={900}>
      {faccoes.length === 0 ? (
        <p style={{ textAlign: "center", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", color: "#5f5340" }}>
          Nenhuma faccao cadastrada.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {faccoes.map((f) => (
            <article
              key={f.id}
              style={{
                padding: 20,
                background: "rgba(20,12,4,0.6)",
                border: `1px solid ${f.color}55`,
                borderLeft: `3px solid ${f.color}`,
                borderRadius: 4,
              }}
            >
              <h2 style={{ margin: "0 0 10px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 18, color: f.color, letterSpacing: "0.08em" }}>
                {f.name}
              </h2>
              {f.description && (
                <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 14, color: "#d3c89a", lineHeight: 1.6 }}>
                  {f.description}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </RegrasLayout>
  );
}

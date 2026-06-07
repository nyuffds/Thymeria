// app/cartas/[id]/page.tsx
// Página de detalhe de uma carta: arte ampliada + lore expandida.

import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { CardPreview } from "@/app/components/CardPreview";
import { RARITIES, CARD_TYPES, ROWS } from "@/lib/constants";

const prisma = new PrismaClient();

export default async function CartaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const card = await prisma.card.findUnique({
    where: { id },
    include: { faction: true, ability: true },
  });

  if (!card || !card.isReleased) notFound();

  const rarity = RARITIES.find((r) => r.key === card.rarity);
  const cardType = CARD_TYPES.find((t) => t.key === card.cardType);
  const rowList = card.rows.split(",").filter(Boolean)
    .map((r) => ROWS.find((x) => x.key === r)?.label ?? r);

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
      <Link href="/cartas" className="text-sm text-zinc-500 hover:text-amber-200">
        ← Catálogo
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 mt-4 items-start">
        {/* Carta grande */}
        <div className="flex justify-center">
          <div style={{ transform: "scale(1.4)", transformOrigin: "top center" }}>
            <CardPreview card={card} />
          </div>
        </div>

        {/* Informações expandidas */}
        <div className="space-y-6 md:mt-12 md:pl-16">
          <div>
            <h1 className="font-heading text-4xl font-bold text-amber-200">{card.name}</h1>
            <p className="font-lore italic text-lg mt-1" style={{ color: card.faction.color }}>
              {card.faction.name}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase text-zinc-500">Poder</p>
              <p className="text-zinc-100 font-mono text-xl">{card.power}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-zinc-500">Tipo</p>
              <p className="text-zinc-100">{cardType?.label ?? card.cardType}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-zinc-500">Raridade</p>
              <p style={{ color: rarity?.color ?? "#fff" }}>{rarity?.label ?? card.rarity}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-zinc-500">Fileiras</p>
              <p className="text-zinc-100">{rowList.join(", ")}</p>
            </div>
          </div>

          {card.ability && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs uppercase text-amber-400 mb-1">⚡ {card.ability.name}</p>
              <p className="text-zinc-200">{card.ability.description}</p>
            </div>
          )}

          {card.loreText && (
            <div className="bg-parchment p-6 rounded-xl border-2" style={{ borderColor: "var(--bronze)" }}>
              <p className="font-lore italic text-lg text-[var(--ink)] leading-relaxed text-center">
                &ldquo;{card.loreText}&rdquo;
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
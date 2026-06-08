export const dynamic = "force-dynamic";

// app/admin/cartas/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { CardForm } from "../_components/CardForm";

const prisma = new PrismaClient();

export default async function EditarCartaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [card, factions, abilities] = await Promise.all([
    prisma.card.findUnique({ where: { id } }),
    prisma.faction.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.ability.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!card) notFound();

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <Link href="/admin/cartas" className="text-sm text-zinc-500 hover:text-amber-200">
        ← Cartas
      </Link>
      <h1 className="text-3xl font-bold text-amber-200 mt-1 mb-6">
        Editar: <span className="text-zinc-100">{card.name}</span>
      </h1>
      <CardForm
        mode="edit"
        id={card.id}
        factions={factions}
        abilities={abilities}
        initial={{
          name: card.name,
          factionId: card.factionId,
          power: card.power,
          rows: card.rows.split(",").filter(Boolean),
          rarity: card.rarity,
          cardType: card.cardType,
          leaderMode: card.leaderMode,
          abilityId: card.abilityId,
          loreText: card.loreText ?? "",
          imageUrl: card.imageUrl ?? "",
          frameUrl: card.frameUrl ?? "",
          isReleased: card.isReleased,
        }}
      />
    </main>
  );
}
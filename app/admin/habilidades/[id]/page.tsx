export const dynamic = "force-dynamic";

// app/admin/habilidades/[id]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { AbilityForm } from "../_components/AbilityForm";

const prisma = new PrismaClient();

export default async function EditarHabilidadePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [ability, allCards] = await Promise.all([
    prisma.ability.findUnique({ where: { id } }),
    prisma.card.findMany({
      orderBy: [{ rarity: "asc" }, { name: "asc" }],
      select: { id: true, name: true, rarity: true },
    }),
  ]);

  if (!ability) notFound();

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <Link href="/admin/habilidades" className="text-sm text-zinc-500 hover:text-amber-200">
        ← Habilidades
      </Link>
      <h1 className="text-3xl font-bold text-amber-200 mt-1 mb-6">
        Editar: <span className="text-zinc-100">{ability.name}</span>
      </h1>
      <AbilityForm
        mode="edit"
        id={ability.id}
        allCards={allCards}
        initial={{
          name: ability.name,
          description: ability.description,
          engineKey: ability.engineKey ?? "",
          engineValue: ability.engineValue,
          isActive: ability.isActive,
          targetCardIdsCsv: ability.targetCardIdsCsv,
          targetCardType: ability.targetCardType,
          triggerMode: ability.triggerMode,
        }}
      />
    </main>
  );
}
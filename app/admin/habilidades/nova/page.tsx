export const dynamic = "force-dynamic";

// app/admin/habilidades/nova/page.tsx

import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { AbilityForm } from "../_components/AbilityForm";

const prisma = new PrismaClient();

export default async function NovaHabilidadePage() {
  const allCards = await prisma.card.findMany({
    orderBy: [{ rarity: "asc" }, { name: "asc" }],
    select: { id: true, name: true, rarity: true },
  });

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <Link href="/admin/habilidades" className="text-sm text-zinc-500 hover:text-amber-200">
        ← Habilidades
      </Link>
      <h1 className="text-3xl font-bold text-amber-200 mt-1 mb-6">Nova Habilidade</h1>
      <AbilityForm mode="create" allCards={allCards} />
    </main>
  );
}
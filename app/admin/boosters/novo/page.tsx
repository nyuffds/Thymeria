// app/admin/boosters/novo/page.tsx
import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { BoosterForm } from "../_components/BoosterForm";

const prisma = new PrismaClient();

export default async function NovoBoosterPage() {
  const cards = await prisma.card.findMany({
    where: { isReleased: true },
    orderBy: [{ rarity: "asc" }, { name: "asc" }],
    select: { id: true, name: true, rarity: true },
  });

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <Link href="/admin/boosters" className="text-sm text-zinc-500 hover:text-amber-200">
        ← Boosters
      </Link>
      <h1 className="text-3xl font-bold text-amber-200 mt-1 mb-6 font-heading">Novo Booster</h1>
      <BoosterForm mode="create" cards={cards} />
    </main>
  );
}
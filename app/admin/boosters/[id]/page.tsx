// app/admin/boosters/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { BoosterForm } from "../_components/BoosterForm";
import type { BoosterRuleInput } from "@/lib/actions";

const prisma = new PrismaClient();

export default async function EditarBoosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [booster, cards] = await Promise.all([
    prisma.booster.findUnique({
      where: { id },
      include: { rules: true },
    }),
    prisma.card.findMany({
      where: { isReleased: true },
      orderBy: [{ rarity: "asc" }, { name: "asc" }],
      select: { id: true, name: true, rarity: true },
    }),
  ]);

  if (!booster) notFound();

  const rules: BoosterRuleInput[] = booster.rules.map((r) => ({
    mode: r.mode as "FIXED_POOL" | "BY_RARITY",
    rarity: r.rarity,
    cardId: r.cardId,
    quantity: r.quantity,
  }));

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <Link href="/admin/boosters" className="text-sm text-zinc-500 hover:text-amber-200">
        ← Boosters
      </Link>
      <h1 className="text-3xl font-bold text-amber-200 mt-1 mb-6 font-heading">
        Editar: <span className="text-zinc-100">{booster.name}</span>
      </h1>
      <BoosterForm
        mode="edit"
        id={booster.id}
        cards={cards}
        initial={{
          name: booster.name,
          description: booster.description ?? "",
          price: booster.price,
          imageUrl: booster.imageUrl ?? "",
          isActive: booster.isActive,
          rules,
        }}
      />
    </main>
  );
}
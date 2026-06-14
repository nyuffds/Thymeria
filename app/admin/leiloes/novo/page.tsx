export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { CreateAuctionForm } from "../_components/CreateAuctionForm";

const prisma = new PrismaClient();

export default async function NovoLeilaoPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { role: true },
  });
  if (!me || me.role !== "ADMIN") redirect("/");

  const cards = await prisma.card.findMany({
    where: { isReleased: true },
    include: { faction: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
      <nav className="mb-4 text-sm">
        <Link href="/admin/leiloes" className="text-zinc-500 hover:text-amber-200 transition">{"\u2190 Leiloes"}</Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-3xl font-bold text-amber-200 font-heading">Criar leilao</h1>
        <p className="text-sm text-zinc-400 mt-1 font-lore italic">
          Carta sai do estoque do sistema. Vencedor paga e a moeda some.
        </p>
      </header>

      <CreateAuctionForm
        cards={cards.map((c) => ({
          cardId: c.id,
          name: c.name,
          rarity: c.rarity,
          factionName: c.faction.name,
          factionColor: c.faction.color,
          imageUrl: c.imageUrl,
        }))}
      />
    </main>
  );
}
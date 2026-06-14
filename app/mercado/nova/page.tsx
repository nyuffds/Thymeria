export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { ListingForm } from "../_components/ListingForm";

const prisma = new PrismaClient();

export default async function NovaListagemPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!me) redirect("/login");

  // Cartas da colecao que ainda tem quantidade > 0 e sao marketEligible
  const myCards = await prisma.userCollection.findMany({
    where: {
      userId: me.id,
      quantity: { gt: 0 },
      card: { marketEligible: true },
    },
    include: {
      card: { include: { faction: true } },
    },
    orderBy: { card: { name: "asc" } },
  });

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
      <nav className="mb-6">
        <Link href="/mercado" className="text-sm text-zinc-500 hover:text-amber-200 transition">
          {"\u2190 Mercado"}
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-3xl font-bold text-amber-200 font-heading">Vender carta</h1>
        <p className="text-sm text-zinc-400 mt-1 font-lore italic">
          Escolha uma carta da sua colecao para listar no mercado.
        </p>
      </header>

      {myCards.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
          <p className="mb-1">Voce nao tem cartas elegiveis para venda.</p>
          <p className="text-xs">Algumas cartas podem nao estar habilitadas para o mercado.</p>
        </div>
      ) : (
        <ListingForm
          cards={myCards.map((c) => ({
            cardId: c.cardId,
            name: c.card.name,
            quantity: c.quantity,
            rarity: c.card.rarity,
            factionName: c.card.faction.name,
            factionColor: c.card.faction.color,
            imageUrl: c.card.imageUrl,
          }))}
        />
      )}
    </main>
  );
}
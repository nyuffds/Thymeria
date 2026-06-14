export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { NewDeckForm } from "./_components/NewDeckForm";

const prisma = new PrismaClient();

export default async function NovoDeckPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true, role: true },
  });
  if (!user) redirect("/login");

  // Busca os líderes que o jogador possui (cartas LEADER com quantity >= 1)
  const ownedLeaders = user.role === "ADMIN"
    ? (await prisma.card.findMany({
        where: { cardType: "LEADER", isReleased: true },
        include: { faction: true },
        orderBy: { name: "asc" },
      })).map((c) => ({ card: c, quantity: 999 }))
    : await prisma.userCollection.findMany({
        where: {
          userId: user.id,
          quantity: { gt: 0 },
          card: { cardType: "LEADER", isReleased: true },
        },
        include: {
          card: { include: { faction: true } },
        },
        orderBy: { card: { name: "asc" } },
      });

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
      <Link href="/decks" className="text-sm text-zinc-500 hover:text-amber-200">
        ← Meus decks
      </Link>
      <h1 className="text-3xl font-bold text-amber-200 mt-1 mb-2 font-heading">Novo deck</h1>
      <p className="text-zinc-400 mb-6 text-sm">
        Escolha um líder. A facção do líder define a facção do deck.
      </p>

      {ownedLeaders.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-8 text-center">
          <p className="text-zinc-400 mb-2">Você não possui nenhum líder na sua coleção.</p>
          <p className="text-xs text-zinc-500 mb-4">
            Líderes são cartas do tipo &ldquo;Líder&rdquo;. Compre boosters que os contenham ou peça ao GM.
          </p>
          <Link href="/loja" className="text-amber-300 hover:text-amber-200 underline text-sm">
            Ir à loja →
          </Link>
        </div>
      ) : (
        <NewDeckForm
          leaders={ownedLeaders.map((l) => ({
            id: l.card.id,
            name: l.card.name,
            imageUrl: l.card.imageUrl,
            faction: { name: l.card.faction.name, color: l.card.faction.color },
          }))}
        />
      )}
    </main>
  );
}
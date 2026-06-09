export const dynamic = "force-dynamic";

// app/admin/cartas/page.tsx
// Grade visual de todas as cartas com botão de "Nova".

import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { CardPreview } from "@/app/components/CardPreview";

const prisma = new PrismaClient();

export default async function CartasListPage() {
  const cards = await prisma.card.findMany({
    orderBy: { name: "asc" },
    include: { faction: true, ability: true },
  });

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin" className="text-sm text-zinc-500 hover:text-amber-200">
            ← Painel
          </Link>
          <h1 className="text-3xl font-bold text-amber-200 mt-1">Cartas</h1>
        </div>
        <Link
          href="/admin/cartas/nova"
          className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition"
        >
          + Nova Carta
        </Link>
      </div>

      {cards.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
          <p className="mb-4">Nenhuma carta cadastrada ainda.</p>
          <Link
            href="/admin/cartas/nova"
            className="text-amber-300 hover:text-amber-200 underline"
          >
            Criar a primeira →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 justify-items-center">
          {cards.map((c) => (
            <Link
              key={c.id}
              href={`/admin/cartas/${c.id}`}
              className="group relative transition hover:scale-[1.03]"
            >
              <CardPreview card={c} />
              {!c.isReleased && (
                <div className="absolute top-2 right-2 bg-zinc-950/80 text-amber-300 text-xs px-2 py-1 rounded border border-amber-700">
                  rascunho
                </div>
              )}
              <p className="text-center text-xs text-zinc-500 mt-2 opacity-0 group-hover:opacity-100 transition">
                Clique para editar
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
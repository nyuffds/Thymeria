import Link from "next/link";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export default async function RegrasFaccoesPage() {
  const faccoes = await prisma.faction.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
      <nav className="mb-6">
        <Link href="/regras" className="text-sm text-zinc-500 hover:text-amber-200 transition">
          {"\u2190 Manual"}
        </Link>
      </nav>

      <header className="mb-8">
        <p className="text-xs text-amber-500 uppercase tracking-[0.3em] mb-2">Manual</p>
        <h1 className="text-3xl font-bold font-heading text-amber-200">Faccoes</h1>
        <p className="text-sm text-zinc-400 mt-2">
          Cada faccao tem seu proprio estilo de jogo e tematica.
        </p>
      </header>

      {faccoes.length === 0 ? (
        <p className="text-zinc-500 italic">Nenhuma faccao cadastrada.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {faccoes.map((f) => (
            <article
              key={f.id}
              className="rounded-lg border-2 bg-zinc-900/50 p-5"
              style={{ borderColor: f.color + "55" }}
            >
              <h2 className="text-lg font-bold font-heading mb-2" style={{ color: f.color }}>
                {f.name}
              </h2>
              {f.description && (
                <p className="text-sm text-zinc-400">{f.description}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
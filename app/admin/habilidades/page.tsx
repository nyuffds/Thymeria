export const dynamic = "force-dynamic";

// app/admin/habilidades/page.tsx
import Link from "next/link";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function HabilidadesListPage() {
  const abilities = await prisma.ability.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { cards: true } } },
  });

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin" className="text-sm text-zinc-500 hover:text-amber-200">
            ← Painel
          </Link>
          <h1 className="text-3xl font-bold text-amber-200 mt-1">Habilidades</h1>
        </div>
        <Link
          href="/admin/habilidades/nova"
          className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition"
        >
          + Nova Habilidade
        </Link>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-zinc-900 border-b border-zinc-800">
            <tr className="text-xs uppercase text-zinc-400">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Motor</th>
              <th className="px-4 py-3 text-center">Cartas</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {abilities.map((a) => (
              <tr key={a.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30">
                <td className="px-4 py-3 font-semibold text-zinc-100">{a.name}</td>
                <td className="px-4 py-3 text-sm text-zinc-400 max-w-md">
                  {a.description}
                </td>
                <td className="px-4 py-3">
                  {a.engineKey ? (
                    <span className="font-mono text-xs bg-purple-950/40 border border-purple-900 text-purple-300 px-2 py-0.5 rounded">
                      {a.engineKey}
                      {a.engineValue !== null && ` (${a.engineValue})`}
                    </span>
                  ) : (
                    <span className="italic text-zinc-600 text-xs">narrativa</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-zinc-300">{a._count.cards}</td>
                <td className="px-4 py-3 text-center">
                  {a.isActive ? (
                    <span className="text-emerald-400 text-xs">● ativa</span>
                  ) : (
                    <span className="text-zinc-500 text-xs">○ inativa</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/habilidades/${a.id}`}
                    className="text-amber-300 hover:text-amber-200 text-sm"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {abilities.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                  Nenhuma habilidade cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
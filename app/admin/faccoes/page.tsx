// app/admin/faccoes/page.tsx
// Lista todas as facções com link de edição e botão "Nova".

import Link from "next/link";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function FaccoesListPage() {
  const factions = await prisma.faction.findMany({
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
          <h1 className="text-3xl font-bold text-amber-200 mt-1">Facções</h1>
        </div>
        <Link
          href="/admin/faccoes/nova"
          className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition"
        >
          + Nova Facção
        </Link>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-zinc-900 border-b border-zinc-800">
            <tr className="text-xs uppercase text-zinc-400">
              <th className="px-4 py-3 w-12"></th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3 text-center">Cartas</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {factions.map((f) => (
              <tr key={f.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30">
                <td className="px-4 py-3">
                  <span
                    className="block w-6 h-6 rounded-full border border-zinc-700"
                    style={{ backgroundColor: f.color }}
                  />
                </td>
                <td className="px-4 py-3 font-semibold text-zinc-100">{f.name}</td>
                <td className="px-4 py-3 text-sm text-zinc-400 max-w-md">
                  {f.description || <span className="italic text-zinc-600">sem descrição</span>}
                </td>
                <td className="px-4 py-3 text-center text-zinc-300">{f._count.cards}</td>
                <td className="px-4 py-3 text-center">
                  {f.isActive ? (
                    <span className="text-emerald-400 text-xs">● ativa</span>
                  ) : (
                    <span className="text-zinc-500 text-xs">○ inativa</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/faccoes/${f.id}`}
                    className="text-amber-300 hover:text-amber-200 text-sm"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {factions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                  Nenhuma facção cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
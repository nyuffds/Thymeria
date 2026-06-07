// app/admin/page.tsx
// Hub do painel admin. Mostra 3 cards com links para os CRUDs.

import Link from "next/link";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function getCounts() {
  const [factions, abilities, cards] = await Promise.all([
    prisma.faction.count(),
    prisma.ability.count(),
    prisma.card.count(),
  ]);
  return { factions, abilities, cards };
}

export default async function AdminHomePage() {
  const counts = await getCounts();

  const sections = [
    {
      href: "/admin/faccoes",
      title: "Facções",
      count: counts.factions,
      desc: "Reinos, cidades e povos de Thymeria.",
      color: "border-amber-700/40 hover:border-amber-500",
    },
    {
      href: "/admin/habilidades",
      title: "Habilidades",
      count: counts.abilities,
      desc: "Efeitos que cartas podem ter (automáticos ou narrativos).",
      color: "border-purple-700/40 hover:border-purple-500",
    },
    {
      href: "/admin/cartas",
      title: "Cartas",
      count: counts.cards,
      desc: "Catálogo mestre de todas as cartas do jogo.",
      color: "border-emerald-700/40 hover:border-emerald-500",
    },
  ];

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <h1 className="text-3xl font-bold text-amber-200 mb-2">Painel Admin</h1>
      <p className="text-zinc-400 mb-8">Gerencie o conteúdo do jogo.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className={`block bg-zinc-900/60 border ${s.color} rounded-xl p-6 transition`}
          >
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-xl font-bold text-zinc-100">{s.title}</h2>
              <span className="text-3xl font-mono text-amber-300">{s.count}</span>
            </div>
            <p className="text-sm text-zinc-400">{s.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
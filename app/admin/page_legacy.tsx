export const dynamic = "force-dynamic";

// app/admin/page.tsx
// Hub do painel admin.

import Link from "next/link";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function getCounts() {
  const [factions, abilities, cards, boosters] = await Promise.all([
    prisma.faction.count(),
    prisma.ability.count(),
    prisma.card.count(),
    prisma.booster.count(),
  ]);
  return { factions, abilities, cards, boosters };
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
    {
      href: "/admin/boosters",
      title: "Boosters",
      count: counts.boosters,
      desc: "Pacotes de cartas que os jogadores podem comprar.",
      color: "border-purple-700/40 hover:border-purple-500",
    },
    {
      href: "/admin/configuracoes",
      title: "Configurações",
      count: 0,
      desc: "Regras globais: preços, limites, políticas.",
      color: "border-zinc-700/40 hover:border-zinc-500",
    },
    {
      href: "/admin/economia",
      title: "Economia",
      count: 0,
      desc: "Distribuir moedas e ver histórico de transações.",
      color: "border-yellow-700/40 hover:border-yellow-500",
    },
    {
      href: "/admin/fichas",
      title: "Fichas RPG",
      count: 0,
      desc: "Sobe e atribui fichas de personagem do Foundry aos jogadores.",
      color: "border-red-700/40 hover:border-red-500",
    },
    {
      href: "/admin/usuarios",
      title: "Usuarios",
      count: 0,
      desc: "Criar contas, resetar senhas e gerenciar permissoes.",
      color: "border-blue-700/40 hover:border-blue-500",
    },
  ];

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <h1 className="text-3xl font-bold text-amber-200 mb-2 font-heading">Painel Admin</h1>
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
              <span className="text-3xl font-mono text-amber-300">
                {s.href === "/admin/configuracoes" ? "⚙" :
                 s.href === "/admin/economia"      ? "✨" :
                 s.count}
              </span>
            </div>
            <p className="text-sm text-zinc-400">{s.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
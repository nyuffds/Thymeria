export const dynamic = "force-dynamic";

// app/admin/cartas/nova/page.tsx
import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { CardForm } from "../_components/CardForm";

const prisma = new PrismaClient();

export default async function NovaCartaPage() {
  const [factions, abilities] = await Promise.all([
    prisma.faction.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.ability.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <Link href="/admin/cartas" className="text-sm text-zinc-500 hover:text-amber-200">
        ← Cartas
      </Link>
      <h1 className="text-3xl font-bold text-amber-200 mt-1 mb-6">Nova Carta</h1>
      <CardForm mode="create" factions={factions} abilities={abilities} />
    </main>
  );
}
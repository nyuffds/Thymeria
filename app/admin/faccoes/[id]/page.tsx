export const dynamic = "force-dynamic";

// app/admin/faccoes/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { FactionForm } from "../_components/FactionForm";

const prisma = new PrismaClient();

export default async function EditarFaccaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const faction = await prisma.faction.findUnique({ where: { id } });
  if (!faction) notFound();

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <Link href="/admin/faccoes" className="text-sm text-zinc-500 hover:text-amber-200">
        ← Facções
      </Link>
      <h1 className="text-3xl font-bold text-amber-200 mt-1 mb-6">
        Editar: <span className="text-zinc-100">{faction.name}</span>
      </h1>
      <FactionForm
        mode="edit"
        id={faction.id}
        initial={{
          name: faction.name,
          color: faction.color,
          description: faction.description ?? "",
          isActive: faction.isActive,
        }}
      />
    </main>
  );
}
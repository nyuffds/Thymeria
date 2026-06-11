export const dynamic = "force-dynamic";

// app/estante/page.tsx
// Mostra os boosters fechados do jogador, agrupados por tipo.

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { EstanteList } from "./_components/EstanteList";

const prisma = new PrismaClient();

interface BoosterInfo {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
}

interface Group {
  booster: BoosterInfo;
  ids: string[];
}

export default async function EstantePage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) redirect("/login");

  const unopened = await prisma.unopenedBooster.findMany({
    where: { userId: user.id },
    orderBy: { acquiredAt: "asc" },
    include: {
      booster: {
        select: { id: true, name: true, description: true, imageUrl: true },
      },
    },
  });

  // Agrupa por booster
  const groups = new Map<string, Group>();
  for (const u of unopened) {
    const existing = groups.get(u.booster.id);
    if (existing) {
      existing.ids.push(u.id);
    } else {
      groups.set(u.booster.id, { booster: u.booster, ids: [u.id] });
    }
  }

  const groupList: Group[] = Array.from(groups.values());

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-amber-200 font-heading">Minha estante</h1>
          <p className="text-sm text-zinc-400 mt-1 font-lore italic">
            Boosters aguardando para serem abertos.
          </p>
        </div>
        <Link href="/loja" className="text-sm text-amber-300 hover:text-amber-200">
          → Ir à loja
        </Link>
      </div>

      <EstanteList groups={groupList} />
    </main>
  );
}
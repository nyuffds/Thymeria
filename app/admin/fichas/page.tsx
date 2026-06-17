import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { FichasManager } from "./_components/FichasManager";

const prisma = new PrismaClient();

export default async function AdminFichasPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const me = await prisma.user.findUnique({ where: { username: session.user.name } });
  if (!me || me.role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({
    where: { role: "PLAYER" },
    include: { characterSheet: true },
    orderBy: { username: "asc" },
  });

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <Link href="/admin" className="text-sm text-zinc-500 hover:text-amber-200">
        &larr; Painel
      </Link>
      <h1 className="text-3xl font-bold text-amber-200 mt-1 mb-2 font-heading">Fichas de Personagem</h1>
      <p className="text-zinc-400 mb-6">Sobe e atribui fichas exportadas do Foundry (dnd5e) aos jogadores.</p>

      <FichasManager users={users.map((u) => ({
        id: u.id,
        username: u.username,
        hasSheet: !!u.characterSheet,
        characterName: u.characterSheet ? parseCharacterName(u.characterSheet.data) : null,
      }))} />
    </main>
  );
}

function parseCharacterName(json: string): string | null {
  try {
    return JSON.parse(json)?.name ?? null;
  } catch {
    return null;
  }
}